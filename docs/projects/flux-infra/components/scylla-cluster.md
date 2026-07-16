---
catalog_sha: afcf27119728b917
flux_infra_commit: 2c9dabd
generated_at: 2026-07-16
---

# ScyllaDB Cluster

[ScyllaDB](https://www.scylladb.com/) ([GitHub](https://github.com/scylladb/scylladb)) is a high-performance NoSQL database written in C++ as a drop-in replacement for Apache Cassandra. It achieves significantly lower tail latencies by implementing a shard-per-core architecture atop the Seastar framework — each CPU core owns its memory, network connections, and disk I/O independently, eliminating cross-core coordination and garbage collection pauses that plague JVM-based databases.

What distinguishes ScyllaDB from other wide-column stores (Cassandra, HBase, DynamoDB): it provides wire-compatible APIs for both CQL (Cassandra Query Language) and **Alternator** (Amazon DynamoDB), allowing applications to use battle-tested client SDKs without vendor lock-in. The shard-per-core design delivers predictable P99 latencies under load — a property that JVM-based alternatives struggle with due to stop-the-world GC events.

The ScyllaDB Operator manages the full lifecycle of ScyllaCluster custom resources on Kubernetes — handling rack-aware placement, rolling upgrades, scaling, and repair scheduling — while the Manager Agent sidecar on each node coordinates backup and repair operations.

## Overview

| Property | Value |
|---|---|
| **Namespace** | `scylla` |
| **Type** | HelmRelease (chart: `scylla` v1.12.0) |
| **Layer** | Database services |
| **Status** | Enabled |
| **Source** | [`apps/base/scylla/`](https://github.com/JiwooL0920/flux-infra/tree/develop/apps/base/scylla/) |

## Dependencies

### Upstream — required before ScyllaDB Cluster starts

| Service | Reason | Status |
|---|---|---|
| `scylla-operator` | Flux `dependsOn` | Active |
| `traefik-config` | Flux `dependsOn` | Active |

### Downstream — services that depend on ScyllaDB Cluster

_No known downstream Flux dependencies._

## Purpose

ScyllaDB serves as the platform's persistent storage layer for chat history and conversational state, exposed exclusively through its Alternator (DynamoDB-compatible) API on port 8000. Applications interact with it using standard AWS DynamoDB SDKs pointed at the in-cluster endpoint, gaining DynamoDB's data model (partition keys, sort keys, conditional writes) without external cloud dependency or per-request billing.

The cluster runs in developer mode with relaxed resource requirements suitable for a Kind-based homelab, trading production-grade performance guarantees for reduced memory and CPU footprint.

**Why ScyllaDB Alternator over actual DynamoDB or a simpler KV store:** The workload requires DynamoDB's table model (partition + sort key access patterns, conditional expressions) for chat history queries — but running against AWS DynamoDB from a local cluster adds latency, cost, and external dependency. ScyllaDB's Alternator provides the same wire protocol locally. Compared to running Cassandra for CQL access, ScyllaDB delivers lower tail latencies with less memory overhead — relevant even in a single-node dev topology where resource budgets are tight.

**Why not PostgreSQL (already in-cluster):** Chat message streams are append-heavy, partition-scoped reads with no cross-partition joins — a textbook wide-column workload. Modeling this in PostgreSQL would require explicit partitioning and sacrifice the natural time-series ordering that sort keys provide for free.


## Features

| Feature | Detail |
|---|---|
| **Alternator (DynamoDB-compatible API)** | Enabled with `only_rmw_uses_lwt` write isolation — read-modify-write operations use Paxos lightweight transactions while simple writes bypass consensus for throughput |
| **Developer mode** | Relaxes production safeguards (memory locking, CPU pinning, I/O scheduler requirements) to run on non-dedicated Kind nodes without XFS or dedicated disks |
| **Manager Agent sidecar** | Co-located agent container on each ScyllaDB node enables centralized repair scheduling and backup coordination through the Scylla Manager control plane |
| **Traefik ingress routing** | IngressRoute exposes Alternator API externally at `scylla.local` on the web entrypoint, routing to the `scylla-client` headless service on port 8000 |
| **Flux health gating** | Kustomization declares a healthCheck on the `scylla-client` Service — downstream dependents will not reconcile until the ScyllaDB client endpoint is serving |

## Architecture

### ScyllaDB Cluster Deployment Topology

```mermaid
graph TD
    subgraph flux-system["flux-system namespace"]
        KS[Kustomization: scylla-cluster]
        HR[HelmRelease: scylla]
        REPO[HelmRepository: scylla]
    end

    subgraph scylla-ns["scylla namespace"]
        SC[ScyllaCluster CR]
        subgraph rack1["rack1"]
            POD[ScyllaDB Pod]
            AGENT[Manager Agent Sidecar]
        end
        SVC[Service: scylla-client]
        IR[IngressRoute: scylla-alternator]
        NS[Namespace: scylla]
    end

    subgraph deps["Dependencies"]
        OP[scylla-operator]
        TC[traefik-config]
    end

    KS -->|dependsOn| OP
    KS -->|dependsOn| TC
    KS -->|deploys| HR
    HR -->|chart ref| REPO
    HR -->|creates| SC
    SC -->|manages| POD
    POD --- AGENT
    POD -->|serves :8000| SVC
    IR -->|routes scylla.local| SVC
    KS -->|healthCheck| SVC
```

### Alternator Request Flow

```mermaid
sequenceDiagram
    participant Client as DynamoDB SDK Client
    participant Traefik as Traefik Proxy
    participant IR as IngressRoute
    participant SVC as scylla-client:8000
    participant Scylla as ScyllaDB Alternator

    Client->>Traefik: HTTP request to scylla.local
    Traefik->>IR: Match Host(`scylla.local`)
    IR->>SVC: Forward to port 8000
    SVC->>Scylla: Route to ScyllaDB pod
    Scylla-->>Client: DynamoDB-compatible response
```


## Configuration

All values sourced from [`base/services/environment.env`](https://github.com/JiwooL0920/flux-infra/blob/develop/base/services/environment.env)
(base); per-environment overrides in [`clusters/stages/dev/.../environment.env`](https://github.com/JiwooL0920/flux-infra/blob/develop/clusters/stages/dev/clusters/services-amer/environment.env).

| Parameter | Dev | Prod |
|---|---|---|
| `SCYLLA_AGENT_TAG` | `3.2.6` | `3.2.6` |
| `SCYLLA_CHART_VERSION` | `1.12.0` | `1.12.0` |
| `SCYLLA_CPU_LIMIT` | `1000m` | `1000m` |
| `SCYLLA_CPU_REQUEST` | `500m` | `500m` |
| `SCYLLA_DEVELOPER_MODE` | `true` | `true` |
| `SCYLLA_IMAGE_TAG` | `5.4.0` | `5.4.0` |
| `SCYLLA_MANAGER_CHART_VERSION` | `1.12.0` | `1.12.0` |
| `SCYLLA_MANAGER_CPU_LIMIT` | `500m` | `500m` |
| `SCYLLA_MANAGER_CPU_REQUEST` | `100m` | `100m` |
| `SCYLLA_MANAGER_MEMORY_LIMIT` | `512Mi` | `512Mi` |
| `SCYLLA_MANAGER_MEMORY_REQUEST` | `256Mi` | `256Mi` |
| `SCYLLA_MEMORY_LIMIT` | `2Gi` | `2Gi` |
| `SCYLLA_MEMORY_REQUEST` | `1Gi` | `1Gi` |
| `SCYLLA_OPERATOR_CHART_VERSION` | `1.12.0` | `1.12.0` |
| `SCYLLA_OPERATOR_CPU_LIMIT` | `500m` | `500m` |
| `SCYLLA_OPERATOR_CPU_REQUEST` | `100m` | `100m` |
| `SCYLLA_OPERATOR_MEMORY_LIMIT` | `512Mi` | `512Mi` |
| `SCYLLA_OPERATOR_MEMORY_REQUEST` | `256Mi` | `256Mi` |
| `SCYLLA_RACK_MEMBERS` | `1` | `1` |
| `SCYLLA_STORAGE_SIZE` | `10Gi` | `10Gi` |


## Operations

### ScyllaCluster pods stuck in Pending — PVC not binding

**Symptoms:** Pod remains in `Pending` state. `kubectl describe pod` shows `unbound immediate PersistentVolumeClaims`. Flux Kustomization `scylla-cluster` reports `health check failed` on `Service/scylla-client`.

```bash
kubectl get pvc -n scylla
kubectl describe pvc -n scylla -l app.kubernetes.io/name=scylla
kubectl get storageclass
kubectl get pv | grep scylla
# On Kind clusters, verify local-path-provisioner is running:
kubectl get pods -n local-path-storage
# If provisioner is healthy but PVC stuck, delete the PVC and let operator recreate:
kubectl delete pvc -n scylla -l app.kubernetes.io/name=scylla
```

---

### ScyllaCluster CRD not found — operator dependency race

**Symptoms:** HelmRelease `scylla` shows `install retries exhausted`. Flux logs contain `no matches for kind "ScyllaCluster" in version "scylla.scylladb.com/v1"`. The `scylla-operator` Kustomization may have failed silently.

```bash
kubectl get kustomization scylla-operator -n flux-system
kubectl get crd scyllaclusters.scylla.scylladb.com
# If CRD missing, force reconcile the operator first:
flux reconcile kustomization scylla-operator --with-source
# Wait for CRD registration, then retry cluster:
kubectl wait --for=condition=Established crd/scyllaclusters.scylla.scylladb.com --timeout=120s
flux reconcile kustomization scylla-cluster
```
**See also:** docs/adr/001-fine-grained-service-dependencies.md

---

### Alternator not responding on port 8000

**Symptoms:** Applications receive connection refused or timeout when calling `scylla.local:8000`. `curl -v http://scylla.local/` through Traefik returns 502 or 504. IngressRoute exists but service has no ready endpoints.

```bash
kubectl get endpoints scylla-client -n scylla
kubectl get pods -n scylla -l app.kubernetes.io/name=scylla -o wide
# Verify Alternator is listening inside the pod:
kubectl exec -n scylla -it $(kubectl get pod -n scylla -l app.kubernetes.io/name=scylla -o jsonpath='{.items[0].metadata.name}') -- nodetool status
kubectl exec -n scylla -it $(kubectl get pod -n scylla -l app.kubernetes.io/name=scylla -o jsonpath='{.items[0].metadata.name}') -- curl -s http://localhost:8000/
# Check IngressRoute is correctly targeting the service:
kubectl get ingressroute scylla-alternator -n scylla -o yaml
# Verify Traefik sees the route:
kubectl logs -n traefik -l app.kubernetes.io/name=traefik --tail=50 | grep scylla
```

---

### Pod OOMKilled during startup or under load

**Symptoms:** Pod restarts with `reason: OOMKilled` in `kubectl describe pod`. Events show container `scylla` exceeded memory limit. Node `kubectl top node` may show memory pressure.

```bash
kubectl get pods -n scylla -o wide
kubectl describe pod -n scylla -l app.kubernetes.io/name=scylla | grep -A5 'Last State'
kubectl top pod -n scylla
# Check if developer mode is active (reduces memory requirements):
kubectl get helmrelease scylla -n flux-system -o jsonpath='{.spec.values.developerMode}'
# Inspect cluster-vars for memory settings:
kubectl get configmap cluster-vars -n flux-system -o jsonpath='{.data.SCYLLA_MEMORY_LIMIT}'
# If OOM persists in developer mode, check node available memory:
kubectl describe node | grep -A5 'Allocated resources'
```

---

### Flux health check timeout — scylla-client service never becomes ready

**Symptoms:** `flux get kustomization scylla-cluster` shows `Health check failed after 15m0s timeout`. The `scylla-client` service exists but has zero ready endpoints. ScyllaDB pods may be running but not joining the cluster ring.

```bash
flux get kustomization scylla-cluster
kubectl get svc scylla-client -n scylla
kubectl get endpoints scylla-client -n scylla
kubectl get scyllacluster -n scylla -o yaml
# Check operator logs for reconciliation errors:
kubectl logs -n scylla-operator -l app.kubernetes.io/name=scylla-operator --tail=100
# Check if ScyllaDB node has joined the ring:
kubectl exec -n scylla -it $(kubectl get pod -n scylla -l app.kubernetes.io/name=scylla -o jsonpath='{.items[0].metadata.name}') -- nodetool status
# If node shows DN (Down/Normal), check scylla logs:
kubectl logs -n scylla $(kubectl get pod -n scylla -l app.kubernetes.io/name=scylla -o jsonpath='{.items[0].metadata.name}') -c scylla --tail=200
```

---


## Related


- [`apps/base/scylla/`](https://github.com/JiwooL0920/flux-infra/tree/develop/apps/base/scylla/) — Kubernetes manifests
- [`base/services/scylla-cluster.yaml`](https://github.com/JiwooL0920/flux-infra/blob/develop/base/services/scylla-cluster.yaml) — Flux Kustomization
- [`base/services/environment.env`](https://github.com/JiwooL0920/flux-infra/blob/develop/base/services/environment.env) — environment variables

---
*Generated from [service-catalog.json](https://github.com/JiwooL0920/flux-infra/blob/develop/service-catalog.json) at commit `2c9dabd` · catalog sha `afcf27119728b917`*