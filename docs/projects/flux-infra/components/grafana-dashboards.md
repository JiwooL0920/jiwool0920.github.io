---
catalog_sha: 4d088b0b3a67b4c4
flux_infra_commit: fbaac15
generated_at: 2026-06-12
---

# Grafana Dashboards

[Grafana Operator](https://grafana.github.io/grafana-operator/) manages Grafana resources (dashboards, datasources, folders) declaratively via Kubernetes CRDs. Rather than provisioning dashboards through ConfigMaps, API calls, or sidecar-based file watchers, the operator continuously reconciles `GrafanaDashboard` custom resources into a target Grafana instance — providing drift correction, lifecycle management, and native GitOps integration.

This service is the **content layer** of the dashboard-as-code pipeline. While `grafana-operator` provides the controller and `grafana-config` registers the target instance, `grafana-dashboards` supplies the actual dashboard and folder definitions from a dedicated external Git repository. Flux polls this repository independently, meaning dashboard authors can iterate on visualizations without touching the main infrastructure repo or triggering unrelated reconciliation across the platform.

## Overview

| Property | Value |
|---|---|
| **Namespace** | `grafana-dashboards` |
| **Type** | Kustomization |
| **Layer** | Grafana Operator |
| **Status** | Enabled |
| **Source** | [`infra/`](https://github.com/JiwooL0920/flux-infra/tree/develop/infra/) |

## Dependencies

### Upstream — required before Grafana Dashboards starts

| Service | Reason | Status |
|---|---|---|
| `grafana-config` | Flux `dependsOn` | Active |

### Downstream — services that depend on Grafana Dashboards

_No known downstream Flux dependencies._

## Purpose

`grafana-dashboards` decouples dashboard content from infrastructure lifecycle. It pulls `GrafanaDashboard` and `GrafanaFolder` CRDs from a separate Git repository (`JiwooL0920/grafana-dashboards`) at a 5-minute polling interval, deploying them into the cluster where the Grafana Operator reconciles them into the running Grafana instance.

This separation means dashboard changes (new panels, updated queries, folder reorganization) flow through their own Git history, PR review, and deployment cycle — independent of Helm chart bumps, operator upgrades, or dependency chain changes in the main flux-infra repo. The result is faster iteration for observability content without risk to platform stability.

**Why a separate Git repository over inline manifests in flux-infra:** Dashboard JSON is verbose (hundreds to thousands of lines per dashboard) and changes frequently as monitoring needs evolve. Embedding them in the infrastructure repo would pollute its Git history with large diffs unrelated to infrastructure changes, trigger unnecessary Flux reconciliation of the entire services tree, and force dashboard authors to understand the flux-infra dependency model just to update a Prometheus query. A dedicated repo with its own `GitRepository` source isolates the blast radius and enables a tighter feedback loop — push a dashboard change, see it in Grafana within 5 minutes.


## Features

| Feature | Detail |
|---|---|
| **Dedicated GitRepository source** | Declares its own `GitRepository` CR pointing to `ssh://git@github.com/JiwooL0920/grafana-dashboards` rather than sharing the `flux-system` source used by all other services. This gives dashboards an independent polling interval and revision tracking. |
| **High-frequency polling** | Configured with a 5-minute `spec.interval` on both the GitRepository and Kustomization — significantly shorter than the 1-hour interval used by the operator and config layers. Dashboard updates propagate to Grafana within minutes of merge. |
| **Path-scoped Kustomization** | The Flux Kustomization targets only `./infra` within the external repository, allowing the dashboard repo to contain other content (documentation, Grafonnet source, CI configs) without affecting what gets applied to the cluster. |
| **Prune-enabled lifecycle management** | `spec.prune: true` ensures that deleting a dashboard manifest from the Git repository removes the corresponding `GrafanaDashboard` CR from the cluster, which the operator then removes from Grafana. No orphaned dashboards accumulate over time. |
| **SSH authentication via shared secret** | Uses the `flux-system` Secret (the same deploy key bootstrapped during Flux installation) for Git authentication, avoiding additional credential management for the external repository. |
| **Dependency-gated deployment** | `dependsOn: grafana-config` ensures the Grafana instance CR (with its `dashboards: grafana` selector label) exists before dashboard CRDs are applied. Without this gate, dashboards would fail to reconcile as the operator would have no target instance. |

## Architecture

### Dashboard-as-Code Deployment Pipeline

```mermaid
graph TD
    subgraph external["External Git (JiwooL0920/grafana-dashboards)"]
        REPO["main branch<br/>path: ./infra"]
    end
    subgraph flux-system
        GR[GitRepository<br/>grafana-dashboards]
        FK[Flux Kustomization<br/>grafana-dashboards]
        SEC[Secret<br/>flux-system]
    end
    subgraph monitoring
        GI[Grafana CR<br/>labels: dashboards=grafana]
        GRAF[Grafana Instance<br/>kube-prometheus-stack]
    end
    subgraph grafana-operator-ns["grafana-operator namespace"]
        GO[Grafana Operator]
    end
    subgraph target-ns["target namespace(s)"]
        CRDs["GrafanaDashboard CRs<br/>GrafanaFolder CRs"]
    end

    GR -->|"SSH auth"| SEC
    GR -->|"poll every 5m"| REPO
    FK -->|"sourceRef"| GR
    FK -->|"applies ./infra"| CRDs
    CRDs -->|"instanceSelector<br/>dashboards: grafana"| GI
    GO -->|"watches all namespaces"| CRDs
    GO -->|"reconciles into"| GRAF
    GI -->|"external.url :80"| GRAF
```


## Configuration

All values sourced from [`base/services/environment.env`](https://github.com/JiwooL0920/flux-infra/blob/develop/base/services/environment.env)
(base); per-environment overrides in [`clusters/stages/dev/.../environment.env`](https://github.com/JiwooL0920/flux-infra/blob/develop/clusters/stages/dev/clusters/services-amer/environment.env).

_No environment-specific configuration variables for this service._


## Operations

### GitRepository fetch failure — SSH authentication rejected

**Symptoms:** `flux get source git grafana-dashboards` shows `False` ready status with message `ssh: handshake failed` or `authentication required`. The Kustomization remains at a stale revision while the source fails to pull.

```bash
flux get source git grafana-dashboards -n flux-system
kubectl get gitrepository grafana-dashboards -n flux-system -o yaml | grep -A 10 'status:'
kubectl get secret flux-system -n flux-system -o jsonpath='{.data.identity}' | base64 -d | head -2
kubectl get events -n flux-system --field-selector involvedObject.name=grafana-dashboards --sort-by=.lastTimestamp
ssh -T -i /dev/stdin git@github.com <<< "$(kubectl get secret flux-system -n flux-system -o jsonpath='{.data.identity}' | base64 -d)" 2>&1 | head -5
flux reconcile source git grafana-dashboards -n flux-system
```

---

### Kustomization reconciliation timeout — invalid manifests in dashboards repo

**Symptoms:** `flux get kustomization grafana-dashboards` shows `reconciliation failed` with timeout or validation errors like `failed to decode YAML` or `unknown field`. Source revision advances but Kustomization stays at the previous applied revision.

```bash
flux get kustomization grafana-dashboards -n flux-system
kubectl get kustomization grafana-dashboards -n flux-system -o jsonpath='{.status.conditions[*].message}'
flux get source git grafana-dashboards -n flux-system
kubectl get events -n flux-system --field-selector involvedObject.name=grafana-dashboards,involvedObject.kind=Kustomization --sort-by=.lastTimestamp
flux reconcile kustomization grafana-dashboards --with-source
```

---

### Dashboards not appearing in Grafana despite healthy Kustomization

**Symptoms:** `flux get kustomization grafana-dashboards` shows `Applied revision` at latest commit, but Grafana UI shows no new dashboards. `kubectl get grafanadashboards` shows resources present but operator logs indicate `No matching instances found`.

```bash
kubectl get grafanadashboards --all-namespaces
kubectl get grafanadashboards --all-namespaces -o yaml | grep -A 3 instanceSelector
kubectl get grafana grafana -n monitoring -o jsonpath='{.metadata.labels}'
kubectl logs -n grafana-operator -l app.kubernetes.io/name=grafana-operator --tail=50 | grep -iE "instance|dashboard|no matching"
kubectl get grafana grafana -n monitoring -o yaml | grep -A 5 'status:'
```
**See also:** docs/adr/012-grafana-operator-dashboard-as-code.md

---

### Dependency gate blocking — grafana-config not ready

**Symptoms:** `flux get kustomization grafana-dashboards` shows `dependency 'flux-system/grafana-config' is not ready` and reconciliation is suspended. Dashboard source may be fetched successfully but nothing is applied.

```bash
flux get kustomization grafana-dashboards -n flux-system
flux get kustomization grafana-config -n flux-system
flux get kustomization grafana-operator -n flux-system
kubectl get grafana grafana -n monitoring
kubectl logs -n grafana-operator -l app.kubernetes.io/name=grafana-operator --tail=30 | grep -i "instance"
flux reconcile kustomization grafana-config --with-source
```

---

### Stale dashboards after repo push — source revision not advancing

**Symptoms:** A commit has been merged to main in the grafana-dashboards repo but `flux get source git grafana-dashboards` still shows the old revision after multiple polling intervals (>10 minutes). Kustomization shows no activity.

```bash
flux get source git grafana-dashboards -n flux-system
kubectl get gitrepository grafana-dashboards -n flux-system -o jsonpath='{.status.artifact.revision}'
kubectl get gitrepository grafana-dashboards -n flux-system -o jsonpath='{.status.conditions[*].message}'
kubectl get events -n flux-system --field-selector involvedObject.name=grafana-dashboards,involvedObject.kind=GitRepository --sort-by=.lastTimestamp
flux reconcile source git grafana-dashboards -n flux-system
flux get source git grafana-dashboards -n flux-system
```

---

### Pruned dashboards not removed from Grafana

**Symptoms:** A `GrafanaDashboard` manifest was deleted from the dashboards repo and the Kustomization shows it has been pruned from the cluster, but the dashboard still appears in the Grafana UI. Operator may be failing to delete from the Grafana API.

```bash
kubectl get grafanadashboards --all-namespaces
flux get kustomization grafana-dashboards -n flux-system
kubectl logs -n grafana-operator -l app.kubernetes.io/name=grafana-operator --tail=50 | grep -iE "delete|remove|prune"
kubectl run curl-test --rm -it --image=curlimages/curl --restart=Never -- curl -s -o /dev/null -w '%{http_code}' http://monitoring-kube-prometheus-stack-grafana.monitoring.svc:80/api/health
kubectl get grafana grafana -n monitoring -o yaml | grep -A 5 'status:'
```
**See also:** docs/adr/012-grafana-operator-dashboard-as-code.md

---


## Related


- [`infra/`](https://github.com/JiwooL0920/flux-infra/tree/develop/infra/) — Kubernetes manifests
- [`base/services/grafana-dashboards.yaml`](https://github.com/JiwooL0920/flux-infra/blob/develop/base/services/grafana-dashboards.yaml) — Flux Kustomization
- [`base/services/environment.env`](https://github.com/JiwooL0920/flux-infra/blob/develop/base/services/environment.env) — environment variables

---
*Generated from [service-catalog.json](https://github.com/JiwooL0920/flux-infra/blob/develop/service-catalog.json) at commit `fbaac15` · catalog sha `4d088b0b3a67b4c4`*