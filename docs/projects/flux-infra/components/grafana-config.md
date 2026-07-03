---
catalog_sha: d34fd29d8c92c579
flux_infra_commit: 72f0a19
generated_at: 2026-07-03
---

# Grafana Config

The [Grafana Operator](https://grafana.github.io/grafana-operator/) ([GitHub](https://github.com/grafana/grafana-operator)) is a Kubernetes operator that manages Grafana instances and their associated resources (dashboards, datasources, folders) declaratively via Custom Resources. Unlike directly configuring Grafana through its HTTP API or provisioning files, the operator reconciles desired state continuously — if a dashboard is deleted manually in the UI, the operator restores it on the next reconciliation cycle.

The `Grafana` CRD is the operator's entry point: it registers a Grafana instance (either operator-managed or externally deployed) so that other CRDs (`GrafanaDashboard`, `GrafanaDatasource`) can target it. The operator supports two modes — **deployment mode** (it deploys and manages the Grafana pod lifecycle) and **external mode** (it connects to a pre-existing Grafana instance). This service uses external mode, pointing the operator at a Grafana already deployed by kube-prometheus-stack.

## Overview

| Property | Value |
|---|---|
| **Namespace** | `grafana-config` |
| **Type** | Kustomization |
| **Layer** | Grafana Operator |
| **Status** | Enabled |
| **Source** | [`apps/base/grafana-config/`](https://github.com/JiwooL0920/flux-infra/tree/develop/apps/base/grafana-config/) |

## Dependencies

### Upstream — required before Grafana Config starts

| Service | Reason | Status |
|---|---|---|
| `grafana-operator` | Flux `dependsOn` | Active |

### Downstream — services that depend on Grafana Config

| Service | Dependency type | Reason |
|---|---|---|
| `grafana-dashboards` | Flux `dependsOn` | Requires Grafana Config |

## Purpose

`grafana-config` registers the platform's existing kube-prometheus-stack Grafana instance with the Grafana Operator. This creates the bridge that allows downstream `GrafanaDashboard` custom resources to be reconciled into the running Grafana without touching its Helm values or provisioning ConfigMaps.

Without this CR, the operator has no target instance — dashboard CRDs would have nothing to reconcile against. This service sits between `grafana-operator` (which provides the controller) and `grafana-dashboards` (which provides the dashboard definitions), acting as the instance discovery layer.

**Why external mode over operator-managed deployment:** kube-prometheus-stack already deploys a fully configured Grafana with authentication, persistence, and datasource wiring baked into its Helm chart. Re-deploying Grafana through the operator would duplicate that work and lose the tight integration with Prometheus/Alertmanager that the stack provides. External mode gives the operator dashboard management capabilities while leaving instance lifecycle to the Helm chart that already handles it well.


## Features

| Feature | Detail |
|---|---|
| **External instance registration** | Uses `spec.external.url` to connect to the kube-prometheus-stack Grafana service at `monitoring-kube-prometheus-stack-grafana.monitoring.svc:80`, avoiding a duplicate Grafana deployment. |
| **Instance selector label** | The `dashboards: grafana` label on the CR acts as a target selector — downstream `GrafanaDashboard` resources use `instanceSelector.matchLabels` to bind to this specific instance. |
| **Secret-based admin authentication** | Admin credentials are sourced from the `grafana-admin-credentials` Secret via `spec.external.adminPassword` and `spec.external.adminUser`, keeping credentials out of the CR spec. |
| **PostBuild variable substitution** | The Flux Kustomization injects variables from the `cluster-vars` ConfigMap at deploy time, enabling environment-specific overrides without duplicating manifests per cluster. |

## Architecture

### Grafana Operator Instance Registration Topology

```mermaid
graph TD
    subgraph flux-system
        FK[Flux Kustomization<br>grafana-config]
        CV[ConfigMap<br>cluster-vars]
    end
    subgraph monitoring
        GR[Grafana CR<br>labels: dashboards=grafana]
        GS[Service<br>monitoring-kube-prometheus-stack-grafana]
        SEC[Secret<br>grafana-admin-credentials]
    end
    subgraph grafana-operator-ns[operator namespace]
        GO[Grafana Operator]
    end
    subgraph downstream
        GD[GrafanaDashboard CRs]
    end

    FK -->|postBuild substitute| CV
    FK -->|deploys| GR
    GO -->|watches/reconciles| GR
    GR -->|external.url :80| GS
    GR -->|adminPassword, adminUser| SEC
    GD -->|instanceSelector<br>dashboards: grafana| GR
```


## Configuration

All values sourced from [`base/services/environment.env`](https://github.com/JiwooL0920/flux-infra/blob/develop/base/services/environment.env)
(base); per-environment overrides in [`clusters/stages/dev/.../environment.env`](https://github.com/JiwooL0920/flux-infra/blob/develop/clusters/stages/dev/clusters/services-amer/environment.env).

_No environment-specific configuration variables for this service._


## Operations

### Grafana CR stuck in failing state — operator cannot reach external instance

**Symptoms:** `kubectl get grafana grafana -n monitoring` shows status with error message like `Could not connect to Grafana instance` or `401 Unauthorized`. Operator logs show repeated reconciliation failures.

```bash
kubectl get grafana grafana -n monitoring -o yaml | grep -A 20 status
kubectl logs -n grafana-operator -l app.kubernetes.io/name=grafana-operator --tail=50
kubectl get svc monitoring-kube-prometheus-stack-grafana -n monitoring
kubectl run curl-test --rm -it --image=curlimages/curl --restart=Never -- curl -s -o /dev/null -w '%{http_code}' http://monitoring-kube-prometheus-stack-grafana.monitoring.svc:80/api/health
kubectl get secret grafana-admin-credentials -n monitoring -o jsonpath='{.data.admin-user}' | base64 -d
kubectl get secret grafana-admin-credentials -n monitoring -o jsonpath='{.data.admin-password}' | base64 -d
```

---

### Admin credentials secret missing or malformed

**Symptoms:** Grafana Operator logs report `secret "grafana-admin-credentials" not found` or `key "admin-password" not found in secret`. GrafanaDashboard CRs downstream remain in pending state.

```bash
kubectl get secret grafana-admin-credentials -n monitoring
kubectl get secret grafana-admin-credentials -n monitoring -o jsonpath='{.data}' | jq 'keys'
kubectl get externalsecrets -n monitoring -l app=grafana-config
kubectl logs -n external-secrets -l app.kubernetes.io/name=external-secrets --tail=30 | grep grafana
```

---

### Flux Kustomization not reconciling after git push

**Symptoms:** `flux get kustomization grafana-config` shows `Applied revision` stuck at an old commit hash, or status shows `dependency 'flux-system/grafana-operator' is not ready`.

```bash
flux get kustomization grafana-config
flux get kustomization grafana-operator
kubectl get kustomization grafana-config -n flux-system -o jsonpath='{.status.conditions[*].message}'
flux reconcile kustomization grafana-config --with-source
```

---

### Downstream dashboards not provisioning despite healthy Grafana CR

**Symptoms:** `kubectl get grafanadashboards -n monitoring` shows dashboards with `No matching instances found` or empty `instanceSelector` resolution. The Grafana UI shows no new dashboards appearing.

```bash
kubectl get grafana grafana -n monitoring -o jsonpath='{.metadata.labels}'
kubectl get grafanadashboards -n monitoring -o yaml | grep -A 3 instanceSelector
kubectl logs -n grafana-operator -l app.kubernetes.io/name=grafana-operator --tail=50 | grep -i "instance"
kubectl get grafana -n monitoring --show-labels
```

---


## Related


- [`apps/base/grafana-config/`](https://github.com/JiwooL0920/flux-infra/tree/develop/apps/base/grafana-config/) — Kubernetes manifests
- [`base/services/grafana-config.yaml`](https://github.com/JiwooL0920/flux-infra/blob/develop/base/services/grafana-config.yaml) — Flux Kustomization
- [`base/services/environment.env`](https://github.com/JiwooL0920/flux-infra/blob/develop/base/services/environment.env) — environment variables

---
*Generated from [service-catalog.json](https://github.com/JiwooL0920/flux-infra/blob/develop/service-catalog.json) at commit `72f0a19` · catalog sha `d34fd29d8c92c579`*