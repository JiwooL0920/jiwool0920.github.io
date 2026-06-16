---
catalog_sha: e8611a61080e81c8
flux_infra_commit: 8c38bcd
generated_at: 2026-06-16
---

# Node Image GC

Node image garbage collection is the practice of proactively reclaiming disk space on Kubernetes worker nodes by removing unused container images, stopped containers, and stale pod sandboxes. While kubelet provides built-in image GC via `imageGCHighThresholdPercent` / `imageGCLowThresholdPercent`, that mechanism is purely reactive — it only fires when disk pressure is already detected — and it does not touch stopped containers or orphaned sandboxes that accumulate over time.

This service implements a scheduled, multi-step cleanup directly against the node's CRI runtime (containerd via `crictl` and `ctr`). It uses `nsenter` from a privileged pod to enter the host's PID and mount namespaces, giving it full access to the node's container runtime without requiring a DaemonSet or a custom node agent. The approach is lightweight (a single Alpine shell script), deterministic (same steps every run), and observable (structured stdout logging of before/after disk state).

## Overview

| Property | Value |
|---|---|
| **Namespace** | `node-maintenance` |
| **Type** | CronJob |
| **Layer** | Node maintenance |
| **Status** | Enabled |
| **Source** | [`apps/base/node-image-gc/`](https://github.com/JiwooL0920/flux-infra/tree/develop/apps/base/node-image-gc/) |

## Dependencies

### Upstream — required before Node Image GC starts

_No upstream Flux dependencies — starts immediately._

### Downstream — services that depend on Node Image GC

_No known downstream Flux dependencies._

## Purpose

Node Image GC prevents disk pressure evictions in this cluster by proactively reclaiming space every 6 hours. In a homelab environment with limited node disk (typically 50–100 GB), frequent deployments and Helm chart upgrades leave behind a long tail of unused images and dead containers that kubelet's reactive GC may not clean aggressively enough. This CronJob ensures nodes stay well below the eviction threshold without requiring manual intervention or node restarts.

**Why a CronJob over a DaemonSet or kubelet tuning:** A DaemonSet would keep a pod running permanently on every node for a task that takes seconds every few hours — wasteful for a resource-constrained homelab. Tuning kubelet's GC thresholds only addresses images and is reactive; it cannot remove stopped containers or stale sandboxes. A CronJob with `hostPID` + `nsenter` provides the same node-level access as a DaemonSet but only consumes resources during the brief cleanup window.

**Why not `kube-image-keeper` (kuik) or `eraser`:** Both are more complex (custom controllers, CRDs, webhook admission) and optimized for large multi-tenant clusters. For a single-owner homelab, a shell script run via CronJob achieves the same outcome with zero operational overhead and no additional failure surfaces.


## Features

| Feature | Detail |
|---|---|
| **Four-phase cleanup pipeline** | Executes sequentially: stopped container removal (`crictl rm`), stale sandbox eviction with 10-minute age threshold (`crictl rmp`), unused image pruning (`crictl rmi --prune`), and containerd content store pruning (`ctr content prune references`). Each phase is independent and failure-tolerant. |
| **Host namespace access via nsenter** | Uses `hostPID: true` and `privileged: true` to run `nsenter -t 1 -m -u -i -n -p` against PID 1, entering all host namespaces. This gives direct access to the node's crictl and ctr binaries without mounting the container runtime socket. |
| **Stale sandbox age filtering** | Pod sandboxes in `NotReady` state are only removed if their `createdAt` timestamp is older than 10 minutes (600 seconds), preventing removal of sandboxes that are still being set up or torn down by kubelet. |
| **Universal node scheduling** | Tolerates all taints (`operator: Exists`) and requires only `kubernetes.io/os: linux`, ensuring cleanup runs on every Linux node in the cluster including control-plane nodes that often accumulate the most stale images. |
| **Non-overlapping execution** | `concurrencyPolicy: Forbid` ensures a new Job is never created if a previous run is still active, preventing resource contention on nodes where cleanup might run long due to large image stores. |
| **Automatic job cleanup** | `ttlSecondsAfterFinished: 3600` removes completed Job objects after one hour, preventing accumulation of finished Job resources in the API server while preserving enough history for debugging recent runs. |

## Architecture

### Node-level execution topology

```mermaid
graph TD
    subgraph flux-system["flux-system namespace"]
        KS[Kustomization: node-image-gc]
    end

    subgraph node-maintenance["node-maintenance namespace"]
        CJ[CronJob: node-image-gc]
        SA[ServiceAccount: node-image-gc]
        CJ -->|runs as| SA
    end

    subgraph host["Host Node (via nsenter -t 1)"]
        CRICTL[crictl]
        CTR[ctr -n k8s.io]
        CRICTL -->|rm, rmp, rmi --prune| CRI_RUNTIME[containerd CRI]
        CTR -->|content prune references| CONTENT_STORE[containerd content store]
    end

    KS -->|deploys| CJ
    CJ -->|hostPID: true\nprivileged: true| host
```


## Configuration

All values sourced from [`base/services/environment.env`](https://github.com/JiwooL0920/flux-infra/blob/develop/base/services/environment.env)
(base); per-environment overrides in [`clusters/stages/dev/.../environment.env`](https://github.com/JiwooL0920/flux-infra/blob/develop/clusters/stages/dev/clusters/services-amer/environment.env).

_No environment-specific configuration variables for this service._


## Operations

### Job pods failing with nsenter permission denied

**Symptoms:** Job pods show `Completed` with exit code 1. Pod logs contain `nsenter: failed to execute /bin/sh: Permission denied` or `operation not permitted`. The CronJob's `failedJobsHistoryLimit` fills up with failed runs.

```bash
kubectl -n node-maintenance get jobs --sort-by=.status.startTime | tail -5
kubectl -n node-maintenance logs job/$(kubectl -n node-maintenance get jobs --sort-by=.status.startTime -o jsonpath='{.items[-1].metadata.name}')
kubectl -n node-maintenance get cronjob node-image-gc -o jsonpath='{.spec.jobTemplate.spec.template.spec.containers[0].securityContext}'
kubectl get nodes -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.metadata.labels.kubernetes\.io/os}{"\n"}{end}'
# Verify PodSecurityAdmission is not blocking privileged pods in node-maintenance namespace:
kubectl get ns node-maintenance -o jsonpath='{.metadata.labels}' | grep -i pod-security
```

---

### CronJob not scheduling new jobs

**Symptoms:** `kubectl -n node-maintenance get cronjob node-image-gc` shows LAST SCHEDULE increasingly stale. No new Job objects created. Disk usage on nodes climbing without intervention.

```bash
kubectl -n node-maintenance get cronjob node-image-gc -o yaml | grep -A2 'suspend\|concurrencyPolicy\|lastScheduleTime'
# Check if a previous job is still running (Forbid policy blocks new runs):
kubectl -n node-maintenance get jobs -l job-name --field-selector status.successful=0,status.failed=0
# Check for stuck pods from previous runs:
kubectl -n node-maintenance get pods --field-selector=status.phase!=Succeeded,status.phase!=Failed
# If a job is stuck, delete it to unblock scheduling:
kubectl -n node-maintenance delete job $(kubectl -n node-maintenance get jobs --field-selector status.successful=0,status.failed=0 -o jsonpath='{.items[0].metadata.name}')
```

---

### Cleanup runs but disk space not reclaimed

**Symptoms:** Job completes successfully (exit 0), logs show "Cleanup Complete" but "Disk before" and "Disk after" values are nearly identical. Node disk pressure alerts continue firing.

```bash
kubectl -n node-maintenance logs job/$(kubectl -n node-maintenance get jobs --sort-by=.status.startTime -o jsonpath='{.items[-1].metadata.name}') | grep -E 'Disk|Images remaining|Removing'
# SSH or exec into a debug pod to check what's consuming space:
kubectl debug node/$(kubectl get nodes -o jsonpath='{.items[0].metadata.name}') -it --image=alpine:3.19 -- df -h /
# Check if large images are still referenced by running pods:
kubectl debug node/$(kubectl get nodes -o jsonpath='{.items[0].metadata.name}') -it --image=alpine:3.19 -- nsenter -t 1 -m -u -i -n -p -- crictl images --sort-by size | head -20
# Disk pressure may be from logs or emptyDir volumes, not images:
kubectl debug node/$(kubectl get nodes -o jsonpath='{.items[0].metadata.name}') -it --image=alpine:3.19 -- nsenter -t 1 -m -u -i -n -p -- du -sh /var/log/pods/* | sort -rh | head -10
```

---

### crictl commands failing with runtime not found

**Symptoms:** Pod logs show `crictl: command not found` or `FATA[0000] connect: connect endpoint ... context deadline exceeded`. The alpine container cannot reach the host's container runtime.

```bash
kubectl -n node-maintenance logs job/$(kubectl -n node-maintenance get jobs --sort-by=.status.startTime -o jsonpath='{.items[-1].metadata.name}')
# Verify hostPID is enabled on the pod spec:
kubectl -n node-maintenance get cronjob node-image-gc -o jsonpath='{.spec.jobTemplate.spec.template.spec.hostPID}'
# Check if the node uses a non-standard runtime socket path:
kubectl get nodes -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.status.nodeInfo.containerRuntimeVersion}{"\n"}{end}'
# Test nsenter manually from a debug pod on the affected node:
kubectl debug node/$(kubectl get nodes -o jsonpath='{.items[0].metadata.name}') -it --image=alpine:3.19 -- nsenter -t 1 -m -u -i -n -p -- which crictl
```

---

### Job pods pending due to resource constraints or scheduling

**Symptoms:** Job pods stuck in `Pending` state. `kubectl describe pod` shows `Insufficient cpu`, `Insufficient memory`, or node affinity mismatch events. Jobs accumulate without completion.

```bash
kubectl -n node-maintenance get pods --field-selector=status.phase=Pending
kubectl -n node-maintenance describe pod $(kubectl -n node-maintenance get pods --field-selector=status.phase=Pending -o jsonpath='{.items[0].metadata.name}') | grep -A5 Events
# Check if nodes have linux OS label (required by affinity rule):
kubectl get nodes -l kubernetes.io/os=linux
# Check available resources on nodes:
kubectl top nodes
# Verify the ServiceAccount exists:
kubectl -n node-maintenance get serviceaccount node-image-gc
```

---


## Related


- [`apps/base/node-image-gc/`](https://github.com/JiwooL0920/flux-infra/tree/develop/apps/base/node-image-gc/) — Kubernetes manifests
- [`base/services/node-image-gc.yaml`](https://github.com/JiwooL0920/flux-infra/blob/develop/base/services/node-image-gc.yaml) — Flux Kustomization
- [`base/services/environment.env`](https://github.com/JiwooL0920/flux-infra/blob/develop/base/services/environment.env) — environment variables

---
*Generated from [service-catalog.json](https://github.com/JiwooL0920/flux-infra/blob/develop/service-catalog.json) at commit `8c38bcd` · catalog sha `e8611a61080e81c8`*