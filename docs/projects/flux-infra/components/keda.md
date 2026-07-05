---
catalog_sha: 9be0573fcf582c2a
flux_infra_commit: 0685274
generated_at: 2026-07-05
---

# KEDA

[KEDA](https://keda.sh) ([GitHub](https://github.com/kedacore/keda)) is a Kubernetes-native event-driven autoscaler that extends the Horizontal Pod Autoscaler (HPA) with external signal awareness. Unlike vanilla HPA — which is limited to CPU and memory metrics from metrics-server — KEDA registers itself as a Kubernetes custom metrics API server and translates signals from 60+ external sources (message queues, databases, Prometheus, cron schedules) into HPA-compatible metrics. This lets workloads scale based on business-relevant signals rather than proxy indicators.

What distinguishes KEDA from writing custom metrics adapters or deploying Knative: it is purely an autoscaling control plane with no data-plane overhead. It installs two lightweight components — an operator that reconciles `ScaledObject`/`ScaledJob` CRDs into managed HPA resources, and a metrics server that serves the aggregated custom metrics API. Workloads remain standard Deployments or Jobs; KEDA simply adjusts their replica count. This makes it fully GitOps-compatible — scaling policy is declared as YAML alongside the workload it governs.

KEDA is a CNCF Graduated project with broad production adoption. Its "scale to zero" capability — unique among Kubernetes autoscalers — allows idle workloads to consume no resources until an event arrives, making it particularly valuable in development environments and for bursty batch workloads.

## Overview

| Property | Value |
|---|---|
| **Namespace** | `keda` |
| **Type** | HelmRelease (chart: `keda` v2.16.1) |
| **Layer** | Event-driven autoscaling |
| **Status** | Enabled |
| **Source** | [`apps/base/keda/`](https://github.com/JiwooL0920/flux-infra/tree/develop/apps/base/keda/) |

## Dependencies

### Upstream — required before KEDA starts

_No upstream Flux dependencies — starts immediately._

### Downstream — services that depend on KEDA

_No known downstream Flux dependencies._

## Purpose

KEDA is the platform's event-driven scaling layer, enabling workloads to autoscale based on external signals that standard HPA cannot observe. Its primary consumers are queue-driven workers that must scale proportionally to backlog depth rather than CPU utilization.

The concrete use cases in this cluster: scaling Temporal task-queue workers based on pending activity count, scaling n8n workflow executors based on queued executions, and scaling kagent's stream-dispatcher pods based on Redis Sentinel stream pending entry count (using the `redis-sentinel-streams` scaler against the Sentinel endpoint on port 26379). Without KEDA, these workloads would either run at fixed replica counts (wasting resources when idle, starving when busy) or require bespoke controller code per scaling signal.

**Why KEDA over custom metrics adapters or Knative:** A custom metrics adapter requires per-source development and ongoing maintenance — each new scaling signal means new adapter code. KEDA provides pre-built, community-maintained scalers for every signal source this platform uses (Prometheus, Redis Streams via Sentinel, cron, PostgreSQL). Knative was rejected because it imposes a full serverless runtime (Knative Serving, networking layer) when the requirement is simply "scale existing Deployments based on external metrics." KEDA adds two pods and a CRD set; Knative adds an entire request-routing and revision-management stack. The operational complexity delta is not justified when workloads are long-running services, not request-scoped functions.


## Features

| Feature | Detail |
|---|---|
| **Dual-component architecture** | Separate operator (CRD reconciliation, HPA lifecycle management) and metrics server (aggregated custom metrics API) deployed as independent pods for fault isolation. |
| **Install and upgrade remediation** | Both install and upgrade phases configured with 3 automatic retries, preventing transient Helm failures from leaving the release in a degraded state. |
| **Resource-bounded operator** | Operator pod runs with explicit CPU and memory requests/limits, preventing unbounded resource consumption during high ScaledObject churn. |
| **Namespace isolation** | KEDA components deploy into a dedicated namespace while the HelmRelease is managed from flux-system, separating workload-facing CRDs from GitOps control plane resources. |
| **Scale-to-zero capable** | Operator supports scaling target deployments to zero replicas when no events are pending, eliminating idle resource consumption for bursty workloads in development. |

## Architecture

### KEDA Deployment Topology

```mermaid
graph TD
    subgraph flux-system["flux-system namespace"]
        HR[HelmRelease: keda]
        REPO[HelmRepository: kedacore]
    end

    subgraph keda-ns["keda namespace"]
        OP[keda-operator]
        MS[keda-metrics-server]
    end

    subgraph workload-ns["workload namespaces"]
        SO[ScaledObject CRDs]
        HPA[Managed HPA]
        DEPLOY[Target Deployments]
    end

    REPO -->|"charts from kedacore.github.io/charts"| HR
    HR -->|"deploys to keda namespace"| OP
    HR -->|"deploys to keda namespace"| MS
    OP -->|"watches"| SO
    OP -->|"creates/manages"| HPA
    HPA -->|"scales"| DEPLOY
    MS -->|"registers as custom.metrics.k8s.io"| APISERVER[Kubernetes API Server]
    APISERVER -->|"queries metrics"| MS
```

### Event-Driven Scaling Flow

```mermaid
sequenceDiagram
    participant ES as External Source<br/>(Redis Sentinel :26379)
    participant MS as keda-metrics-server
    participant OP as keda-operator
    participant HPA as Managed HPA
    participant D as Target Deployment

    OP->>OP: Reconcile ScaledObject
    OP->>HPA: Create/Update HPA with external metric
    loop Every polling interval
        MS->>ES: Query metric value (pending entries)
        ES-->>MS: Current metric value
        HPA->>MS: Get custom metric
        MS-->>HPA: Scaled metric value
        HPA->>D: Adjust replicas
    end
```


## Configuration

All values sourced from [`base/services/environment.env`](https://github.com/JiwooL0920/flux-infra/blob/develop/base/services/environment.env)
(base); per-environment overrides in [`clusters/stages/dev/.../environment.env`](https://github.com/JiwooL0920/flux-infra/blob/develop/clusters/stages/dev/clusters/services-amer/environment.env).

| Parameter | Dev | Prod |
|---|---|---|
| `KEDA_CHART_VERSION` | `2.16.1` | `2.16.1` |


## Operations

### Metrics server not registering with API aggregation

**Symptoms:** `kubectl get --raw /apis/custom.metrics.k8s.io/v1beta1` returns 404 or connection refused. HPA events show `unable to fetch metrics from custom metrics API`. ScaledObjects report `READY: False` with message `MSI registration failed`.

```bash
kubectl get apiservice v1beta1.custom.metrics.k8s.io -o yaml
kubectl get pods -n keda -l app=keda-metrics-apiserver -o wide
kubectl logs -n keda -l app=keda-metrics-apiserver --tail=100
kubectl get endpoints -n keda keda-metrics-apiserver
kubectl describe apiservice v1beta1.external.metrics.k8s.io | grep -A5 Conditions
kubectl rollout restart deployment -n keda keda-metrics-apiserver
```

---

### Operator CrashLoopBackOff after upgrade

**Symptoms:** `kubectl get pods -n keda` shows operator pod in CrashLoopBackOff. Logs contain `failed to initialize manager` or `conversion webhook` errors. Flux HelmRelease shows `upgrade retries exhausted`.

```bash
kubectl logs -n keda -l app=keda-operator --previous --tail=200
kubectl get crd scaledobjects.keda.sh -o jsonpath='{.status.conditions}' | jq .
kubectl get validatingwebhookconfigurations | grep keda
kubectl get secret -n keda | grep keda-admission
kubectl delete validatingwebhookconfiguration keda-admission 2>/dev/null; kubectl delete mutatingwebhookconfiguration keda-admission 2>/dev/null
flux reconcile helmrelease keda -n flux-system --force
```

---

### ScaledObject stuck at minReplicaCount despite trigger threshold exceeded

**Symptoms:** `kubectl get scaledobject -A` shows ACTIVE=True but replica count unchanged. `kubectl get hpa -A` shows the managed HPA with current metric value exceeding target but REPLICAS stuck at minimum.

```bash
kubectl describe hpa -n <workload-namespace> keda-hpa-<scaledobject-name>
kubectl get scaledobject <name> -n <workload-namespace> -o yaml | grep -A20 status
kubectl logs -n keda -l app=keda-operator --tail=200 | grep <scaledobject-name>
kubectl get deployment <target-deployment> -n <workload-namespace> -o jsonpath='{.spec.replicas}'
kubectl get events -n <workload-namespace> --sort-by=.lastTimestamp | grep -i scale
```

---

### KEDA and existing metrics-server conflict on custom metrics API

**Symptoms:** After KEDA deployment, `kubectl top pods` fails or returns stale data. API service `v1beta1.metrics.k8s.io` shows condition `Available: False`. Multiple apiservices claiming the same group/version.

```bash
kubectl get apiservice | grep metrics
kubectl get apiservice v1beta1.metrics.k8s.io -o yaml
kubectl get apiservice v1beta1.custom.metrics.k8s.io -o yaml
kubectl get apiservice v1beta1.external.metrics.k8s.io -o yaml
kubectl logs -n keda -l app=keda-metrics-apiserver --tail=100 | grep -i conflict
kubectl get pods -n kube-system -l k8s-app=metrics-server
```
**See also:** docs/adr/011-keda-autoscaling.md

---

### Flux Kustomization fails to reconcile KEDA CRDs

**Symptoms:** `flux get kustomization keda` shows `False` with health check timeout. Events show `Health check failed after 10m0s` or `CRD install timed out`. New ScaledObject manifests rejected with `no matches for kind "ScaledObject"`.

```bash
flux get kustomization keda -n flux-system
kubectl get crd | grep keda
flux reconcile source git flux-system
kubectl get helmrelease keda -n flux-system -o yaml | grep -A10 status
flux suspend helmrelease keda -n flux-system && flux resume helmrelease keda -n flux-system
kubectl get events -n flux-system --sort-by=.lastTimestamp | grep keda
```

---


## Related


- [`apps/base/keda/`](https://github.com/JiwooL0920/flux-infra/tree/develop/apps/base/keda/) — Kubernetes manifests
- [`base/services/keda.yaml`](https://github.com/JiwooL0920/flux-infra/blob/develop/base/services/keda.yaml) — Flux Kustomization
- [`base/services/environment.env`](https://github.com/JiwooL0920/flux-infra/blob/develop/base/services/environment.env) — environment variables

---
*Generated from [service-catalog.json](https://github.com/JiwooL0920/flux-infra/blob/develop/service-catalog.json) at commit `0685274` · catalog sha `9be0573fcf582c2a`*