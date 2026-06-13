---
catalog_sha: 4d088b0b3a67b4c4
fleet_infra_commit: fbaac15
generated_at: 2026-06-13
---

# Ollama

[Ollama](https://ollama.com) ([GitHub](https://github.com/ollama/ollama)) is a local LLM inference runtime that packages model weights, quantization configs, and a serving layer into a single deployable unit. Unlike cloud-hosted inference APIs (OpenAI, Anthropic, Google), Ollama runs entirely within the cluster — no data leaves the network boundary, latency is bounded by local compute rather than internet round-trips, and there are no per-token costs after initial deployment.

What distinguishes Ollama from other self-hosted inference runtimes (vLLM, llama.cpp server, TGI): it provides an OpenAI-compatible API out of the box, handles model lifecycle (pull, cache, swap) automatically, supports quantized model formats (GGUF) for running large models on constrained hardware, and exposes a simple REST interface on a single port. The trade-off is less fine-grained control over batching, scheduling, and GPU memory management compared to production-grade serving frameworks — acceptable for a platform where inference volume is moderate and operational simplicity is valued over throughput optimization.

## Overview

| Property | Value |
|---|---|
| **Namespace** | `ollama` |
| **Type** | HelmRelease (chart: `ollama` v1.53.0) |
| **Layer** | AI agent platform |
| **Chart** | [`ollama`](https://helm.otwld.com/) v1.53.0 |
| **Status** | Enabled |
| **Source** | [`apps/base/ollama/`](https://github.com/JiwooL0920/flux-infra/tree/develop/apps/base/ollama/) |

## Dependencies

### Upstream — required before Ollama starts

_No upstream Flux dependencies — starts immediately._

### Downstream — services that depend on Ollama

| Service | Dependency type | Reason |
|---|---|---|
| `kagent` | Flux `dependsOn` | Requires Ollama |

## Purpose

Ollama is the platform's local LLM inference backend, serving as the model execution layer for the kagent multi-agent system. The coordinator-agent and its seven specialized subagents (k8s-agent, observability-agent, gitops-agent, flux-agent, helm-agent, security-agent, finops-agent) route all inference requests through Ollama to run planning, tool-use, and response generation workloads against locally-hosted models.

Traffic from kagent reaches Ollama through the Agent Gateway proxy rather than direct service-to-service calls, allowing centralized request routing, observability, and potential model-level traffic shaping without modifying individual agent configurations.

**Why local Ollama over cloud inference APIs:** The kagent orchestrator-worker architecture generates high volumes of inter-agent inference calls — the coordinator decomposes tasks and spawns multiple subagents in parallel, each making its own LLM calls. At cloud API pricing, this multi-hop pattern would produce unpredictable and potentially significant per-query costs. Running inference locally caps cost at fixed compute resources regardless of call volume. Additionally, the platform manages Kubernetes clusters containing potentially sensitive workload metadata — keeping all inference data within the cluster boundary eliminates data exfiltration concerns entirely.

**Why Ollama over vLLM or TGI:** This platform runs on CPU-only nodes without GPU acceleration. Ollama's GGUF quantization support and single-binary deployment model make it the simplest path to running large models (72B parameter) on CPU hardware with acceptable latency for an operations-focused agent system where response time tolerances are seconds, not milliseconds.


## Features

| Feature | Detail |
|---|---|
| **Automatic model pull at startup** | Container entrypoint pulls the configured model on first boot, ensuring the pod is ready to serve inference immediately after scheduling without manual operator intervention or init containers. |
| **Persistent model storage** | A PersistentVolumeClaim retains downloaded model weights across pod restarts and rescheduling, avoiding multi-gigabyte re-downloads that would otherwise block readiness for several minutes on each pod lifecycle event. |
| **ClusterIP-only exposure** | The inference endpoint is accessible only within the cluster via ClusterIP on port 11434 — no ingress, no external exposure — limiting the attack surface to intra-cluster traffic routed through the agent gateway. |
| **Install and upgrade remediation** | HelmRelease configures 3 retries for both install and upgrade operations with extended timeouts, accommodating the slow startup inherent in pulling and loading multi-gigabyte model weights into memory. |

## Architecture

### Ollama Deployment Topology

```mermaid
graph TD
    subgraph ollama-ns["Namespace: ollama"]
        OPod["ollama pod<br/>(LLM inference runtime)"]
        PVC["PersistentVolumeClaim<br/>(model weight storage)"]
        SVC["Service: ollama<br/>ClusterIP :11434"]
    end

    subgraph agentgateway-system["Namespace: agentgateway-system"]
        AGW["agentgateway-proxy<br/>:9080"]
    end

    subgraph flux-system["Namespace: flux-system"]
        HR["HelmRelease: ollama"]
        REPO["HelmRepository<br/>helm.otwld.com"]
        CM["ConfigMap: cluster-vars"]
    end

    OPod -->|"mounts"| PVC
    SVC -->|"routes to :11434"| OPod
    AGW -->|":11434"| SVC
    HR -->|"deploys"| OPod
    HR -->|"pulls chart"| REPO
    CM -->|"substitutes env vars"| HR
```

### Inference Request Flow

```mermaid
sequenceDiagram
    participant KAgent as kagent agents
    participant AGW as agentgateway-proxy :9080
    participant Ollama as ollama :11434
    participant PVC as Model Storage (PVC)

    Note over Ollama,PVC: Startup: model pull
    Ollama->>PVC: Load model weights into memory

    KAgent->>AGW: POST /api/generate (inference request)
    AGW->>Ollama: Forward to :11434
    Ollama->>Ollama: Run inference (CPU)
    Ollama-->>AGW: Streaming response
    AGW-->>KAgent: Forward tokens
```


## Configuration

All values sourced from [`base/services/environment.env`](https://github.com/JiwooL0920/flux-infra/blob/develop/base/services/environment.env)
(base); per-environment overrides in [`clusters/stages/dev/.../environment.env`](https://github.com/JiwooL0920/flux-infra/blob/develop/clusters/stages/dev/clusters/services-amer/environment.env).

| Parameter | Dev | Prod |
|---|---|---|
| `OLLAMA_CHART_VERSION` | `1.53.0` | `1.53.0` |
| `OLLAMA_CPU_LIMIT` | `1000m` | `2000m` |
| `OLLAMA_CPU_REQUEST` | `500m` | `500m` |
| `OLLAMA_HOST` | `http://agentgateway-proxy.agentgateway-system.svc.cluster.local:9080` | `http://agentgateway-proxy.agentgateway-system.svc.cluster.local:9080` |
| `OLLAMA_MEMORY_LIMIT` | `3Gi` | `4Gi` |
| `OLLAMA_MEMORY_REQUEST` | `2Gi` | `2Gi` |
| `OLLAMA_MODEL` | `qwen2.5:72b` | `qwen2.5:72b` |
| `OLLAMA_STORAGE_SIZE` | `5Gi` | `10Gi` |


## Operations

### Model pull stalls during pod startup

**Symptoms:** Pod stays in `Init` or `Running` but never becomes Ready. Container logs show repeated `pulling manifest` or `downloading` lines with no progress. HelmRelease shows install timeout after 10 minutes, retries exhausting.

```bash
kubectl logs -n ollama deploy/ollama --follow | grep -i "pull\|download\|error"
kubectl describe pod -n ollama -l app.kubernetes.io/name=ollama | grep -A5 "Events"
kubectl exec -n ollama deploy/ollama -- wget -q --spider https://registry.ollama.ai && echo "Registry reachable" || echo "Registry blocked"
kubectl get events -n ollama --sort-by='.lastTimestamp' | tail -20
kubectl get pvc -n ollama -o wide
kubectl describe helmrelease ollama -n flux-system | grep -A10 "Status"
```

---

### OOMKilled during model loading

**Symptoms:** Pod restarts with `OOMKilled` reason. `kubectl describe pod` shows last termination reason as OOMKilled. Model partially loads then process is killed by the kernel OOM killer. Repeated CrashLoopBackOff with increasing backoff intervals.

```bash
kubectl get pod -n ollama -l app.kubernetes.io/name=ollama -o jsonpath='{.items[0].status.containerStatuses[0].lastState.terminated.reason}'
kubectl top pod -n ollama
kubectl describe pod -n ollama -l app.kubernetes.io/name=ollama | grep -A3 "Last State"
kubectl logs -n ollama deploy/ollama --previous | tail -50
kubectl get configmap cluster-vars -n flux-system -o yaml | grep -i "OLLAMA_MEMORY"
```

---

### PersistentVolumeClaim stuck in Pending

**Symptoms:** Pod cannot schedule — stuck in `Pending` state. Events show `waiting for a volume to be created` or `no persistent volumes available`. New deployment or cluster rebuild triggers this when the storage provisioner is not yet ready.

```bash
kubectl get pvc -n ollama
kubectl describe pvc -n ollama
kubectl get storageclass
kubectl get events -n ollama --field-selector reason=ProvisioningFailed
kubectl get pod -n ollama -o wide
```

---

### Inference requests timing out through Agent Gateway

**Symptoms:** kagent agents report timeout errors or empty responses. Direct curl to ollama service succeeds but requests through `agentgateway-proxy.agentgateway-system.svc.cluster.local:9080` fail. Agent Gateway logs show upstream timeout or connection refused.

```bash
kubectl exec -n ollama deploy/ollama -- curl -s http://localhost:11434/api/tags
kubectl run curl-test --rm -i --restart=Never --image=curlimages/curl -- curl -s -m 10 http://ollama.ollama.svc.cluster.local:11434/api/tags
kubectl run curl-test2 --rm -i --restart=Never --image=curlimages/curl -- curl -s -m 10 http://agentgateway-proxy.agentgateway-system.svc.cluster.local:9080/api/tags
kubectl logs -n agentgateway-system deploy/agentgateway-proxy --tail=50 | grep -i "ollama\|timeout\|error"
kubectl get endpoints ollama -n ollama
```

---

### Model not available after pod reschedule

**Symptoms:** Pod restarts successfully but inference requests return `model not found` errors. The model pull did not trigger on restart, or the PVC data is corrupted/empty. Ollama API returns empty model list from `/api/tags`.

```bash
kubectl exec -n ollama deploy/ollama -- curl -s http://localhost:11434/api/tags
kubectl exec -n ollama deploy/ollama -- ls -la /root/.ollama/models/
kubectl get pvc -n ollama -o jsonpath='{.items[0].status.phase}'
kubectl logs -n ollama deploy/ollama | grep -i "pull\|model\|error"
kubectl rollout restart deployment/ollama -n ollama
```

---


## Related


- [`apps/base/ollama/`](https://github.com/JiwooL0920/flux-infra/tree/develop/apps/base/ollama/) — Kubernetes manifests
- [`base/services/ollama.yaml`](https://github.com/JiwooL0920/flux-infra/blob/develop/base/services/ollama.yaml) — Flux Kustomization
- [`base/services/environment.env`](https://github.com/JiwooL0920/flux-infra/blob/develop/base/services/environment.env) — environment variables

---
*Generated from [service-catalog.json](https://github.com/JiwooL0920/flux-infra/blob/develop/service-catalog.json) at commit `fbaac15` · catalog sha `4d088b0b3a67b4c4`*