---
catalog_sha: d34fd29d8c92c579
flux_infra_commit: f30dc7e
generated_at: 2026-07-03
---

# Cilium

[Cilium](https://cilium.io) ([GitHub](https://github.com/cilium/cilium)) is an eBPF-based networking, observability, and security platform for Kubernetes. Unlike traditional CNI plugins that rely on iptables or userspace proxies for packet processing, Cilium attaches eBPF programs directly to the Linux kernel's networking data path — bypassing the entire netfilter/iptables stack for service routing, load balancing, and network policy enforcement. This yields lower latency, higher throughput, and O(1) rule evaluation regardless of the number of services or policies.

What distinguishes Cilium from other eBPF-capable CNIs (Calico eBPF mode, Antrea) is its integrated observability layer — Hubble — which provides real-time L3/L4/L7 flow visibility without injecting sidecars or running tcpdump. Hubble observes packets at the eBPF hook points already in the data path, meaning observability comes at near-zero marginal cost. Combined with identity-based security (pods are identified by labels, not IPs), Cilium provides a unified networking + security + observability stack in a single DaemonSet.

Cilium is a CNCF Graduated project, widely adopted in production clusters at scale (Google GKE Dataplane V2, AWS EKS Anywhere, Azure AKS).

## Overview

| Property | Value |
|---|---|
| **Namespace** | `kube-system` |
| **Type** | HelmRelease (chart: `cilium` v1.17.2) |
| **Layer** | Foundation services |
| **Status** | Enabled |
| **Source** | [`apps/base/cilium/`](https://github.com/JiwooL0920/flux-infra/tree/develop/apps/base/cilium/) |

## Dependencies

### Upstream — required before Cilium starts

_No upstream Flux dependencies — starts immediately._

### Downstream — services that depend on Cilium

_No known downstream Flux dependencies._

## Purpose

Cilium replaces both the default Kind CNI (kindnet) and kube-proxy in this platform, serving as the sole networking data path for all pod-to-pod, pod-to-service, and external traffic. It provides three concrete capabilities the platform depends on:

1. **eBPF kube-proxy replacement** — All ClusterIP, NodePort, and LoadBalancer service routing is handled by eBPF maps rather than iptables chains, eliminating the O(n) iptables rule scaling that degrades performance as service count grows.
2. **Hubble network observability** — Real-time flow logs and a topology UI for debugging connectivity issues between platform services (kagent workers, Loki, Grafana, Traefik ingress paths) without deploying additional monitoring infrastructure.
3. **Network policy enforcement** — L3/L4/L7 policy engine available for future segmentation of multi-tenant workloads and security-agent analysis of inter-service communication patterns.

**Why Cilium over kindnet + kube-proxy (the Kind default):** kindnet provides flat L3 connectivity with no policy enforcement, no observability, and relies entirely on kube-proxy's iptables rules for service routing. As this platform runs 25+ services with complex dependency chains, iptables rule count becomes a debugging and performance concern. Cilium consolidates CNI + kube-proxy + network observability into a single component with a single operational surface.

**Why Cilium over Calico:** Calico's eBPF dataplane is a separate opt-in mode that requires additional configuration and lacks an integrated observability UI equivalent to Hubble. For a platform that prioritizes network visibility alongside security scanning (Kubescape), Cilium's integrated Hubble stack reduces operational complexity.


## Features

| Feature | Detail |
|---|---|
| **kube-proxy replacement** | eBPF programs handle all service load balancing and NAT directly in the kernel, configured via `kubeProxyReplacement: true`; the cluster runs with kube-proxy disabled entirely. |
| **Hubble relay** | A centralized gRPC aggregator (`hubble.relay.enabled: true`) that collects per-node flow events from Cilium agents and exposes them via a unified API for CLI queries and the UI. |
| **Hubble UI** | A web-based service dependency map (`hubble.ui.enabled: true`) showing real-time traffic flows between namespaces and services, accessible in-cluster for debugging connectivity. |
| **Kubernetes-native IPAM** | Pod IP allocation delegated to the Kubernetes node CIDR allocator (`ipam.mode: kubernetes`) rather than Cilium's own allocator, ensuring compatibility with Kind's pre-allocated PodCIDRs. |
| **Kind-specific cgroup configuration** | Disables automatic cgroup filesystem mounting (`cgroup.autoMount.enabled: false`) and explicitly sets the host cgroup root to `/sys/fs/cgroup`, required because Kind nodes run as containers with pre-mounted cgroup v2 hierarchies. |
| **Explicit API server endpoint** | Configured with `k8sServiceHost` pointing to the Kind control plane container name and port 6443, bypassing the ClusterIP service for API server connectivity — necessary because Cilium itself provides the service routing that would otherwise resolve the kubernetes service. |

## Architecture

### Cilium Deployment Topology

```mermaid
graph TD
    subgraph kube-system
        agent["Cilium Agent<br/>(DaemonSet)"]
        operator["Cilium Operator<br/>(1 replica)"]
        relay["Hubble Relay<br/>(Deployment)"]
        ui["Hubble UI<br/>(Deployment)"]
    end

    subgraph control-plane["Kind Control Plane"]
        apiserver["kube-apiserver"]
    end

    operator -->|"watches CiliumNode CRDs"| apiserver
    agent -->|":6443 direct"| apiserver
    agent -->|"eBPF datapath"| agent
    relay -->|"gRPC :4244"| agent
    ui -->|"gRPC :4245"| relay
```

### Packet Flow — kube-proxy Replacement

```mermaid
sequenceDiagram
    participant Pod as Source Pod
    participant BPF as eBPF (tc/XDP)
    participant SVC as Service VIP
    participant BE as Backend Pod

    Pod->>BPF: packet to ClusterIP:port
    BPF->>BPF: BPF map lookup (service → backends)
    BPF->>BE: DNAT + forward (no iptables)
    BE-->>BPF: reply packet
    BPF-->>Pod: reverse NAT
```


## Configuration

All values sourced from [`base/services/environment.env`](https://github.com/JiwooL0920/flux-infra/blob/develop/base/services/environment.env)
(base); per-environment overrides in [`clusters/stages/dev/.../environment.env`](https://github.com/JiwooL0920/flux-infra/blob/develop/clusters/stages/dev/clusters/services-amer/environment.env).

| Parameter | Dev | Prod |
|---|---|---|
| `CILIUM_CHART_VERSION` | `1.17.2` | `1.17.2` |


## Operations

### Cilium agent CrashLoopBackOff due to cgroup mount failure

**Symptoms:** Cilium agent pods in kube-system show CrashLoopBackOff. Logs contain: `level=fatal msg="failed to mount cgroup2 filesystem"` or `level=fatal msg="Unable to attach BPF program to cgroup"`. All pod networking is broken — new pods stay in ContainerCreating.

```bash
kubectl -n kube-system logs -l app.kubernetes.io/name=cilium --tail=50 | grep -i cgroup
kubectl -n kube-system get ds cilium -o jsonpath='{.spec.template.spec.containers[0].args}' | grep cgroup
docker exec dev-services-amer-control-plane ls -la /sys/fs/cgroup
docker exec dev-services-amer-control-plane mount | grep cgroup
kubectl -n flux-system get helmrelease cilium -o jsonpath='{.spec.values.cgroup}'
```
**See also:** docs/adr/008-cilium-cni.md

---

### kube-proxy replacement fails — services unreachable

**Symptoms:** Pods are running but cannot reach ClusterIP services. `curl <service-ip>:<port>` times out. Cilium agent logs show `level=warning msg="Unable to reach kube-apiserver"` or `level=error msg="k8s service handler failed"`. CoreDNS pods may also be unreachable.

```bash
kubectl -n kube-system logs -l app.kubernetes.io/name=cilium --tail=100 | grep -i "apiserver\|k8sService"
kubectl -n kube-system exec ds/cilium -- cilium status --brief
kubectl -n kube-system exec ds/cilium -- cilium service list
docker exec dev-services-amer-control-plane ss -tlnp | grep 6443
kubectl -n flux-system get helmrelease cilium -o jsonpath='{.spec.values.k8sServiceHost}'
```
**See also:** docs/adr/008-cilium-cni.md

---

### Hubble relay unable to connect to agents

**Symptoms:** `hubble observe` returns `Failed to connect to Hubble relay` or shows zero flows. Hubble UI loads but displays empty service map. Relay pod logs show `level=warning msg="Failed to create peer client"` with connection refused errors.

```bash
kubectl -n kube-system get pods -l app.kubernetes.io/name=hubble-relay
kubectl -n kube-system logs -l app.kubernetes.io/name=hubble-relay --tail=50
kubectl -n kube-system exec ds/cilium -- cilium status | grep Hubble
kubectl -n kube-system exec ds/cilium -- hubble observe --last 5
kubectl -n kube-system get svc hubble-relay -o jsonpath='{.spec.ports}'
```

---

### Cilium operator not reconciling — CiliumIdentity or CiliumEndpoint stale

**Symptoms:** `kubectl get ciliumidentities` shows stale entries for deleted pods. Cilium operator logs show `level=error msg="Failed to update CiliumIdentity"` or the operator pod is in CrashLoopBackOff. Network policies may not apply to new pods.

```bash
kubectl -n kube-system get pods -l app.kubernetes.io/name=cilium-operator
kubectl -n kube-system logs -l app.kubernetes.io/name=cilium-operator --tail=100
kubectl get ciliumidentities --no-headers | wc -l
kubectl get ciliumendpoints -A --no-headers | wc -l
kubectl -n kube-system exec ds/cilium -- cilium endpoint list | grep -c "ready"
```

---

### HelmRelease stuck in upgrade — Cilium DaemonSet rollout blocked

**Symptoms:** `kubectl -n flux-system get helmrelease cilium` shows `upgrade retries exhausted` or `Helm upgrade failed: timed out waiting for condition`. DaemonSet shows unavailable pods. Flux reconciliation is blocked for all services depending on networking.

```bash
kubectl -n flux-system describe helmrelease cilium | tail -30
kubectl -n kube-system rollout status ds/cilium --timeout=10s
kubectl -n kube-system get pods -l app.kubernetes.io/name=cilium -o wide | grep -v Running
kubectl -n kube-system describe pod $(kubectl -n kube-system get pods -l app.kubernetes.io/name=cilium --field-selector=status.phase!=Running -o name | head -1)
flux suspend helmrelease -n flux-system cilium && flux resume helmrelease -n flux-system cilium
```

---


## Related


- [`apps/base/cilium/`](https://github.com/JiwooL0920/flux-infra/tree/develop/apps/base/cilium/) — Kubernetes manifests
- [`base/services/cilium.yaml`](https://github.com/JiwooL0920/flux-infra/blob/develop/base/services/cilium.yaml) — Flux Kustomization
- [`base/services/environment.env`](https://github.com/JiwooL0920/flux-infra/blob/develop/base/services/environment.env) — environment variables

---
*Generated from [service-catalog.json](https://github.com/JiwooL0920/flux-infra/blob/develop/service-catalog.json) at commit `f30dc7e` · catalog sha `d34fd29d8c92c579`*