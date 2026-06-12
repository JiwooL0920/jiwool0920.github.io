---
catalog_sha: 4d088b0b3a67b4c4
fleet_infra_commit: 2d36e22
generated_at: 2026-06-12
---

# Scylla Operator

[ScyllaDB Operator](https://github.com/scylladb/scylla-operator) is a Kubernetes operator that automates the deployment, scaling, and lifecycle management of ScyllaDB clusters. It extends the Kubernetes API with Custom Resource Definitions (ScyllaCluster, ScyllaDBMonitoring, etc.) and continuously reconciles desired state against actual cluster topology — handling node join/decommission, rolling upgrades, and rack-aware placement without manual intervention.

What distinguishes the Scylla Operator from generic Helm-based database deployments: it encodes ScyllaDB's operational semantics directly into the controller logic. It understands shard-per-core architecture, DPDK networking requirements, and the specific ordering constraints of ScyllaDB topology changes (e.g., never decommissioning two nodes from the same rack simultaneously). This domain knowledge eliminates entire classes of operator error that would otherwise require deep ScyllaDB expertise to avoid.

The operator also manages admission webhooks that validate ScyllaCluster specifications before they reach the API server, preventing invalid configurations (undersized instances, impossible rack topologies, incompatible version transitions) from ever being persisted to etcd.

## Overview

| Property | Value |
|---|---|
| **Namespace** | `scylla-operator` |
| **Type** | HelmRelease (chart: `scylla-operator` v1.12.0) |
| **Layer** | Foundation services |
| **Chart** | [`scylla-operator`](https://scylla-operator-charts.storage.googleapis.com/stable) v1.12.0 |
| **Status** | Enabled |
| **Source** | [`apps/base/scylla-operator/`](https://github.com/JiwooL0920/fleet-infra/tree/develop/apps/base/scylla-operator/) |

## Dependencies

### Upstream — required before Scylla Operator starts

_No upstream Flux dependencies — starts immediately._

### Downstream — services that depend on Scylla Operator

| Service | Dependency type | Reason |
|---|---|---|
| `scylla-cluster` | Flux `dependsOn` | Requires Scylla Operator |
| `scylla-manager` | Flux `dependsOn` | Requires Scylla Operator |

## Purpose

Scylla Operator is the foundation-layer controller that enables all ScyllaDB workloads in this platform. It installs the CRDs, webhook validators, and reconciliation controllers that downstream services (`scylla-cluster`, `scylla-manager`) depend on. Without this operator running and healthy, no ScyllaDB cluster can be provisioned or managed.

It sits at the base of the Scylla dependency chain with no upstream dependencies of its own — Flux deploys it immediately on reconciliation, and downstream Kustomizations wait for its health check (the operator Deployment reaching Ready) before attempting to create ScyllaCluster resources.


## Features

| Feature | Detail |
|---|---|
| **Admission webhooks with self-signed certificates** | Webhook validation is enabled with operator-managed self-signed TLS certificates, rejecting invalid ScyllaCluster specs before persistence without requiring an external cert-manager dependency. |
| **Leader election** | Multi-replica leader election is enabled, allowing the operator to run with redundancy while ensuring only one instance actively reconciles at a time. |
| **Install remediation with retries** | Both install and upgrade paths are configured with 3 retry attempts and a 10-minute timeout, accommodating CRD registration latency and webhook readiness races. |
| **Health-gated downstream rollout** | The Flux Kustomization declares a healthCheck on the operator Deployment, blocking all downstream ScyllaDB services until the controller is fully available. |
| **Variable-substituted resource limits** | CPU and memory requests/limits are injected via postBuild substitution from cluster-vars ConfigMap, enabling per-environment tuning without manifest duplication. |

## Architecture

### Scylla Operator Deployment Topology

```mermaid
graph TD
    subgraph flux-system["flux-system namespace"]
        HR[HelmRelease: scylla-operator]
        REPO[HelmRepository: scylla]
        KS[Kustomization: scylla-operator]
        CM[ConfigMap: cluster-vars]
    end
    subgraph scylla-operator-ns["scylla-operator namespace"]
        DEP[Deployment: scylla-operator]
        WH[Admission Webhook]
        SA[ServiceAccount]
        CRD[CRDs: ScyllaCluster, etc.]
    end
    subgraph downstream["Downstream Services"]
        SC[scylla-cluster]
        SM[scylla-manager]
    end
    REPO -->|"chart source"| HR
    KS -->|"deploys"| HR
    CM -->|"postBuild substituteFrom"| KS
    HR -->|"installs into"| DEP
    HR -->|"registers"| CRD
    DEP -->|"serves"| WH
    KS -->|"healthCheck: Ready"| DEP
    SC -->|"dependsOn"| KS
    SM -->|"dependsOn"| KS
    CRD -->|"enables"| SC
```


## Configuration

All values sourced from [`base/services/environment.env`](https://github.com/JiwooL0920/fleet-infra/blob/develop/base/services/environment.env)
(base); per-environment overrides in [`clusters/stages/dev/.../environment.env`](https://github.com/JiwooL0920/fleet-infra/blob/develop/clusters/stages/dev/clusters/services-amer/environment.env).

| Parameter | Dev | Prod |
|---|---|---|
| `SCYLLA_OPERATOR_CHART_VERSION` | `1.12.0` | `1.12.0` |
| `SCYLLA_OPERATOR_CPU_LIMIT` | `500m` | `500m` |
| `SCYLLA_OPERATOR_CPU_REQUEST` | `100m` | `100m` |
| `SCYLLA_OPERATOR_MEMORY_LIMIT` | `512Mi` | `512Mi` |
| `SCYLLA_OPERATOR_MEMORY_REQUEST` | `256Mi` | `256Mi` |


## Operations

<!-- TODO: Add operations in service-insights/scylla-operator.yaml → operations field -->

## Related


- [`apps/base/scylla-operator/`](https://github.com/JiwooL0920/fleet-infra/tree/develop/apps/base/scylla-operator/) — Kubernetes manifests
- [`base/services/scylla-operator.yaml`](https://github.com/JiwooL0920/fleet-infra/blob/develop/base/services/scylla-operator.yaml) — Flux Kustomization
- [`base/services/environment.env`](https://github.com/JiwooL0920/fleet-infra/blob/develop/base/services/environment.env) — environment variables

---
*Generated from [service-catalog.json](https://github.com/JiwooL0920/fleet-infra/blob/develop/service-catalog.json) at commit `2d36e22` · catalog sha `4d088b0b3a67b4c4`*