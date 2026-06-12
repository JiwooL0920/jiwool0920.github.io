---
catalog_sha: 4d088b0b3a67b4c4
fleet_infra_commit: 09eeed6
generated_at: 2026-06-12
---

# Temporal

[Temporal](https://temporal.io) ([GitHub](https://github.com/temporalio/temporal)) is a durable execution platform that guarantees workflow completion regardless of infrastructure failures. Unlike traditional job queues or state machines that lose progress on crash, Temporal persists every workflow state transition to a database — enabling automatic retry, resumption from the exact point of failure, and indefinite workflow lifetimes (minutes to months). What distinguishes it from alternatives like Airflow, Step Functions, or Celery: Temporal workflows are written in general-purpose code (Go, Java, TypeScript, Python) rather than DAGs or JSON state machines, with the runtime transparently handling retries, timeouts, compensation, and distributed transactions.

The architecture separates concerns across four server roles: **Frontend** (API gateway, rate limiting, routing), **History** (workflow state machine execution, event sourcing), **Matching** (task queue dispatch, worker polling), and **Worker** (internal system workflows — archival, replication, batch operations). Each role scales independently and communicates via gRPC. Persistence is pluggable — Cassandra, MySQL, or PostgreSQL for the execution store, with a separate visibility store enabling complex workflow queries.

Temporal's durability model is built on event sourcing: every workflow decision and activity result is appended to an immutable history log in the persistence layer. On recovery, the server replays this history to reconstruct exact workflow state without re-executing side effects. This makes Temporal suitable for orchestrating multi-service sagas, long-running human-in-the-loop processes, and scheduled batch pipelines where partial progress must never be lost.

## Overview

| Property | Value |
|---|---|
| **Namespace** | `temporal` |
| **Type** | HelmRelease (chart: `temporal` v0.51.0) |
| **Layer** | Application services |
| **Chart** | [`temporal`](https://go.temporal.io/helm-charts) v0.51.0 |
| **Status** | Enabled |
| **Source** | [`apps/base/temporal/`](https://github.com/JiwooL0920/fleet-infra/tree/develop/apps/base/temporal/) |

## Dependencies

### Upstream — required before Temporal starts

| Service | Reason | Status |
|---|---|---|
| `external-secrets-config` | Flux `dependsOn` | Active |
| `postgresql-cluster` | Flux `dependsOn` | Active |

### Downstream — services that depend on Temporal

_No known downstream Flux dependencies._

## Purpose

Temporal serves as the platform's durable workflow orchestration engine — the coordination layer that manages multi-step, failure-prone processes across other services. Rather than building ad-hoc retry logic, state tracking, and failure recovery into each application, services delegate complex orchestration to Temporal and implement only the business logic as stateless activity handlers.

Concrete workloads include: multi-service data pipelines that must complete atomically, scheduled batch processing with checkpoint/resume semantics, and long-running automation workflows that survive pod restarts and node failures. Temporal replaces what would otherwise be fragile cron jobs with state scattered across Redis keys and database flags.

**Why Temporal over simpler alternatives:** Celery/BullMQ handle task queues well but lack workflow-level state, compensation logic, and cross-service saga support. Airflow is DAG-oriented and Python-only, poorly suited to general-purpose orchestration with dynamic branching. AWS Step Functions are vendor-locked and JSON-defined. Temporal uniquely combines: code-native workflow definitions, automatic retry with exponential backoff at both activity and workflow level, built-in versioning for zero-downtime workflow evolution, and a visibility layer for operational querying of running workflows.

**Why self-hosted over Temporal Cloud:** Local-first development on Colima/Kind requires the full server stack accessible without internet. Self-hosting also enables tight integration with the shared PostgreSQL cluster (ADR-004) and future KEDA-based worker autoscaling (ADR-011) using task queue depth as the scaling signal.


## Features

| Feature | Detail |
|---|---|
| **PostgreSQL-backed dual-store persistence** | Both the execution store (`temporal` database) and visibility store (`temporal_visibility` database) use the `postgres12_pgx` driver against the shared CNPG cluster, with Cassandra and Elasticsearch explicitly disabled. |
| **Four-role server topology** | Frontend, History, Matching, and Worker roles each run as separate replica sets within the same HelmRelease, enabling independent scaling per role. |
| **Automatic schema migration** | Schema `setupDatabase` and `updateDatabase` are enabled while `createDatabase` is disabled — Temporal auto-migrates its schema on upgrade but expects databases to be pre-provisioned by CNPG. |
| **ExternalSecret credential injection** | PostgreSQL credentials are pulled from LocalStack via ClusterSecretStore into a Kubernetes Secret with `cnpg.io/reload` label, enabling automatic credential rotation propagation. |
| **Web UI with Traefik ingress** | Temporal Web UI is exposed at `temporal.local` via Traefik IngressRoute on port 8080, providing workflow visibility, namespace management, and execution inspection. |
| **Blob retention policy** | Server runs with `--blobsRetentionDays=7`, limiting internal blob storage growth for completed workflow data. |
| **Default namespace with 3-day retention** | A `default` Temporal namespace is auto-created with 3-day closed workflow retention, balancing query visibility against storage growth. |
| **Monitoring stack disabled** | All bundled Prometheus, Grafana, and ServiceMonitor resources are disabled in favor of the platform-wide kube-prometheus-stack deployment. |

## Architecture

### Temporal Deployment Topology

```mermaid
graph TD
    subgraph flux-system["flux-system namespace"]
        HR[HelmRelease: temporal-server]
        REPO[HelmRepository: temporal]
        KS[Kustomization: temporal]
    end

    subgraph temporal-ns["temporal namespace"]
        FE[Frontend x2]
        HI[History x2]
        MA[Matching x2]
        WK[Worker x2]
        WEB[temporal-server-web]
        ES[ExternalSecret: postgresql-cluster-app]
        SEC[Secret: postgresql-cluster-app]
    end

    subgraph cnpg["cnpg-system namespace"]
        PG[postgresql-cluster-rw]
        DB1[(temporal)]
        DB2[(temporal_visibility)]
    end

    subgraph infra["Infrastructure"]
        LS[LocalStack SecretStore]
        TR[Traefik]
    end

    KS -->|"dependsOn"| ESC[external-secrets-config]
    KS -->|"dependsOn"| PGC[postgresql-cluster]
    HR -->|"sourceRef"| REPO

    ES -->|"ClusterSecretStore"| LS
    ES -->|"creates"| SEC

    FE -->|"sql :5432"| PG
    HI -->|"sql :5432"| PG
    MA -->|"sql :5432"| PG
    WK -->|"sql :5432"| PG
    PG --- DB1
    PG --- DB2

    FE -.->|"credentials"| SEC
    HI -.->|"credentials"| SEC
    MA -.->|"credentials"| SEC
    WK -.->|"credentials"| SEC

    TR -->|"Host: temporal.local :8080"| WEB
```

### Temporal Request Flow

```mermaid
sequenceDiagram
    participant Client as Temporal Client
    participant FE as Frontend Service
    participant MA as Matching Service
    participant HI as History Service
    participant WK as External Worker
    participant PG as PostgreSQL

    Client->>FE: StartWorkflowExecution (gRPC)
    FE->>HI: Create workflow state
    HI->>PG: Persist workflow event (temporal db)
    HI->>MA: Schedule decision task
    MA->>WK: Dispatch task (long poll)
    WK->>FE: RespondDecisionTaskCompleted
    FE->>HI: Record decision
    HI->>PG: Append history events
    HI->>PG: Update visibility (temporal_visibility db)
```


## Configuration

All values sourced from [`base/services/environment.env`](https://github.com/JiwooL0920/fleet-infra/blob/develop/base/services/environment.env)
(base); per-environment overrides in [`clusters/stages/dev/.../environment.env`](https://github.com/JiwooL0920/fleet-infra/blob/develop/clusters/stages/dev/clusters/services-amer/environment.env).

| Parameter | Dev | Prod |
|---|---|---|
| `TEMPORAL_CHART_VERSION` | `0.51.0` | `0.51.0` |
| `TEMPORAL_DB_NAME` | `temporal` | `temporal` |
| `TEMPORAL_SERVER_CPU_LIMIT` | `1000m` | `4000m` |
| `TEMPORAL_SERVER_CPU_REQUEST` | `1000m` | `1000m` |
| `TEMPORAL_SERVER_MEMORY_LIMIT` | `1Gi` | `4Gi` |
| `TEMPORAL_SERVER_MEMORY_REQUEST` | `1Gi` | `2Gi` |
| `TEMPORAL_STORAGE_SIZE` | `5Gi` | `20Gi` |
| `TEMPORAL_VISIBILITY_DB_NAME` | `temporal_visibility` | `temporal_visibility` |
| `TEMPORAL_WEB_CPU_LIMIT` | `250m` | `1000m` |
| `TEMPORAL_WEB_CPU_REQUEST` | `250m` | `200m` |
| `TEMPORAL_WEB_MEMORY_LIMIT` | `256Mi` | `1Gi` |
| `TEMPORAL_WEB_MEMORY_REQUEST` | `256Mi` | `512Mi` |


## Operations

<!-- TODO: Add operations in service-insights/temporal.yaml → operations field -->

## Related


- [`apps/base/temporal/`](https://github.com/JiwooL0920/fleet-infra/tree/develop/apps/base/temporal/) — Kubernetes manifests
- [`base/services/temporal.yaml`](https://github.com/JiwooL0920/fleet-infra/blob/develop/base/services/temporal.yaml) — Flux Kustomization
- [`base/services/environment.env`](https://github.com/JiwooL0920/fleet-infra/blob/develop/base/services/environment.env) — environment variables

---
*Generated from [service-catalog.json](https://github.com/JiwooL0920/fleet-infra/blob/develop/service-catalog.json) at commit `09eeed6` · catalog sha `4d088b0b3a67b4c4`*