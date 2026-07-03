---
catalog_sha: bbff61e079f91214
flux_infra_commit: 30fcc2e
generated_at: 2026-07-03
---

# Argo CD

<!-- TODO: Write a 1-2 paragraph intro explaining what Argo CD is and why it exists in this platform. -->

## Overview

| Property | Value |
|---|---|
| **Namespace** | `argocd` |
| **Type** | HelmRelease (chart: `argo-cd` v7.7.16) |
| **Layer** | Foundation services |
| **Chart** | [`argo-cd`](https://argoproj.github.io/argo-helm) v7.7.16 |
| **Status** | Enabled |
| **Source** | [`apps/base/argocd/`](https://github.com/JiwooL0920/flux-infra/tree/develop/apps/base/argocd/) |

## Dependencies

### Upstream — required before Argo CD starts

| Service | Reason | Status |
|---|---|---|
| `traefik-config` | Flux `dependsOn` | Active |
| `external-secrets-config` | Flux `dependsOn` | Active |
| `redis-sentinel` | Flux `dependsOn` | Active |

### Downstream — services that depend on Argo CD

_No known downstream Flux dependencies._

## Purpose

<!-- TODO: Explain what Argo CD does for the platform and why it was chosen over alternatives. -->


## Features

<!-- TODO: Add features in service-insights/argocd.yaml → features field -->


## Configuration

All values sourced from [`base/services/environment.env`](https://github.com/JiwooL0920/flux-infra/blob/develop/base/services/environment.env)
(base); per-environment overrides in [`clusters/stages/dev/.../environment.env`](https://github.com/JiwooL0920/flux-infra/blob/develop/clusters/stages/dev/clusters/services-amer/environment.env).

| Parameter | Dev | Prod |
|---|---|---|
| `ARGOCD_CHART_VERSION` | `7.7.16` | `7.7.16` |
| `ARGOCD_CONTROLLER_CPU_LIMIT` | `500m` | `500m` |
| `ARGOCD_CONTROLLER_CPU_REQUEST` | `100m` | `100m` |
| `ARGOCD_CONTROLLER_MEMORY_LIMIT` | `512Mi` | `512Mi` |
| `ARGOCD_CONTROLLER_MEMORY_REQUEST` | `256Mi` | `256Mi` |
| `ARGOCD_REPOSERVER_CPU_LIMIT` | `500m` | `500m` |
| `ARGOCD_REPOSERVER_CPU_REQUEST` | `100m` | `100m` |
| `ARGOCD_REPOSERVER_MEMORY_LIMIT` | `512Mi` | `512Mi` |
| `ARGOCD_REPOSERVER_MEMORY_REQUEST` | `256Mi` | `256Mi` |
| `ARGOCD_SERVER_CPU_LIMIT` | `500m` | `500m` |
| `ARGOCD_SERVER_CPU_REQUEST` | `100m` | `100m` |
| `ARGOCD_SERVER_MEMORY_LIMIT` | `512Mi` | `512Mi` |
| `ARGOCD_SERVER_MEMORY_REQUEST` | `256Mi` | `256Mi` |


## Operations

<!-- TODO: Add operations in service-insights/argocd.yaml → operations field -->

## Related


- [`apps/base/argocd/`](https://github.com/JiwooL0920/flux-infra/tree/develop/apps/base/argocd/) — Kubernetes manifests
- [`base/services/argocd.yaml`](https://github.com/JiwooL0920/flux-infra/blob/develop/base/services/argocd.yaml) — Flux Kustomization
- [`base/services/environment.env`](https://github.com/JiwooL0920/flux-infra/blob/develop/base/services/environment.env) — environment variables

---
*Generated from [service-catalog.json](https://github.com/JiwooL0920/flux-infra/blob/develop/service-catalog.json) at commit `30fcc2e` · catalog sha `bbff61e079f91214`*