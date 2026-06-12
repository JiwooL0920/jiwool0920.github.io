---
catalog_sha: 4d088b0b3a67b4c4
fleet_infra_commit: 2d36e22
generated_at: 2026-06-12
---

# CNPG Operator

[CloudNative-PG](https://cloudnative-pg.io) ([GitHub](https://github.com/cloudnative-pg/cloudnative-pg)) is a Kubernetes operator purpose-built for managing the full lifecycle of PostgreSQL clusters. Unlike generic database operators (KubeDB, Zalando Postgres Operator, CrunchyData PGO), CNPG was designed from scratch for Kubernetes-native PostgreSQL — no legacy abstractions from pre-container eras. It handles provisioning, high availability via streaming replication, automated failover, continuous backup to object storage, and rolling upgrades without external tooling like Patroni or Stolon.

What distinguishes CNPG from alternatives: it implements the PostgreSQL instance manager as a single binary injected into the database pod (no sidecar orchestrator), supports declarative database/role provisioning via Kubernetes CRDs, and integrates natively with the Kubernetes scheduler for pod disruption budgets, topology spread, and node affinity. The operator itself is stateless — all cluster state lives in the managed PostgreSQL pods and their PVCs.

CNPG follows the Kubernetes operator pattern: a controller loop watches `Cluster`, `Backup`, `ScheduledBackup`, and `Pooler` custom resources, reconciling desired state against actual state. This makes it fully GitOps-compatible — cluster topology changes are just YAML diffs that Flux applies like any other resource.

## Overview

| Property | Value |
|---|---|
| **Namespace** | `cnpg-system` |
| **Type** | HelmRelease (chart: `cloudnative-pg` v0.24.0) |
| **Layer** | Foundation services |
| **Chart** | [`cloudnative-pg`](https://cloudnative-pg.github.io/charts) v0.24.0 |
| **Status** | Enabled |
| **Source** | [`apps/base/cnpg-operator/`](https://github.com/JiwooL0920/fleet-infra/tree/develop/apps/base/cnpg-operator/) |

## Dependencies

### Upstream — required before CNPG Operator starts

_No upstream Flux dependencies — starts immediately._

### Downstream — services that depend on CNPG Operator

| Service | Dependency type | Reason |
|---|---|---|
| `postgresql-cluster` | Flux `dependsOn` | Requires CNPG Operator |
| `kagent` | Flux `dependsOn` | Requires CNPG Operator |

## Purpose

CNPG Operator is the foundation-layer controller that manages the platform's shared PostgreSQL cluster. It watches for `Cluster` CRDs (deployed by the downstream `postgresql-cluster` service) and reconciles the actual database instances — handling pod scheduling, replication topology, automated failover, and backup orchestration.

In this platform, it underpins every stateful workload that needs relational storage: n8n workflows, Temporal execution history and visibility, Grafana dashboards, kagent state, and application databases. The operator runs as a single deployment in `cnpg-system` and is intentionally dependency-free (no `dependsOn`) so it starts immediately on cluster bootstrap, ready to reconcile database clusters as soon as they're applied.


## Features

| Feature | Detail |
|---|---|
| **In-place instance manager updates** | Enabled via `ENABLE_INSTANCE_MANAGER_INPLACE_UPDATES` — allows the operator to hot-patch the instance manager binary inside running PostgreSQL pods without requiring a full pod restart, reducing update disruption for minor operator upgrades. |
| **Label and annotation inheritance** | Configured to propagate `environment`, `workload`, and `app` labels plus `categories` annotations from Cluster CRDs down to managed pods, enabling consistent observability grouping and cost attribution across all database instances. |
| **PodMonitor metrics exposure** | Operator metrics are scraped via a Prometheus PodMonitor, exposing reconciliation latency, queue depth, and managed cluster health without requiring a separate ServiceMonitor or manual scrape config. |
| **Install and upgrade remediation** | HelmRelease configured with 3 retries and 10-minute timeouts for both install and upgrade operations, preventing transient failures (CRD registration races, webhook cert provisioning) from leaving the operator in a degraded state. |
| **Flux health gating** | Kustomization includes a healthCheck on the operator Deployment — downstream services (postgresql-cluster, kagent) will not begin reconciliation until the operator pods are fully ready, preventing CRD-not-found errors during initial bootstrap. |

## Architecture

### Operator Deployment Topology & Downstream Relationship

```mermaid
graph TD
    subgraph flux-system["flux-system namespace"]
        KS[Kustomization<br/>cnpg-operator]
        HR[HelmRelease<br/>cnpg-operator]
        REPO[HelmRepository<br/>cloudnative-pg]
    end

    subgraph cnpg-system["cnpg-system namespace"]
        DEP[Deployment<br/>cnpg-operator-cloudnative-pg]
        CM[ConfigMap<br/>cnpg-controller-manager-config]
        SA[ServiceAccount<br/>cnpg-manager]
        PM[PodMonitor]
    end

    subgraph downstream["Downstream Services"]
        PGC[postgresql-cluster<br/>Kustomization]
        KAG[kagent<br/>Kustomization]
    end

    EXTCHART[("charts.cloudnative-pg.github.io")]

    KS -->|"path: ./apps/base/cnpg-operator"| HR
    HR -->|"sourceRef"| REPO
    REPO -->|"interval: 5m"| EXTCHART
    HR -->|"targetNamespace"| DEP
    DEP -->|"mounts"| CM
    DEP -->|"uses"| SA
    PM -->|"scrapes /metrics"| DEP
    KS -.->|"healthCheck: ready"| DEP
    PGC -.->|"dependsOn"| KS
    KAG -.->|"dependsOn"| KS
```


## Configuration

All values sourced from [`base/services/environment.env`](https://github.com/JiwooL0920/fleet-infra/blob/develop/base/services/environment.env)
(base); per-environment overrides in [`clusters/stages/dev/.../environment.env`](https://github.com/JiwooL0920/fleet-infra/blob/develop/clusters/stages/dev/clusters/services-amer/environment.env).

| Parameter | Dev | Prod |
|---|---|---|
| `CNPG_OPERATOR_CHART_VERSION` | `0.24.0` | `0.24.0` |
| `CNPG_OPERATOR_CPU_LIMIT` | `200m` | `1000m` |
| `CNPG_OPERATOR_CPU_REQUEST` | `200m` | `200m` |
| `CNPG_OPERATOR_MEMORY_LIMIT` | `128Mi` | `512Mi` |
| `CNPG_OPERATOR_MEMORY_REQUEST` | `128Mi` | `256Mi` |


## Operations

<!-- TODO: Add operations in service-insights/cnpg-operator.yaml → operations field -->

## Related


- [`apps/base/cnpg-operator/`](https://github.com/JiwooL0920/fleet-infra/tree/develop/apps/base/cnpg-operator/) — Kubernetes manifests
- [`base/services/cnpg-operator.yaml`](https://github.com/JiwooL0920/fleet-infra/blob/develop/base/services/cnpg-operator.yaml) — Flux Kustomization
- [`base/services/environment.env`](https://github.com/JiwooL0920/fleet-infra/blob/develop/base/services/environment.env) — environment variables

---
*Generated from [service-catalog.json](https://github.com/JiwooL0920/fleet-infra/blob/develop/service-catalog.json) at commit `2d36e22` · catalog sha `4d088b0b3a67b4c4`*