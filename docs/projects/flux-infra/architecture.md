# Architecture

## High-Level Overview

The fleet-infra platform uses a layered architecture with fine-grained service dependencies for optimal parallel deployment.

```mermaid
flowchart TB
    subgraph "GitOps Control Plane"
        GH[GitHub Repository]
        FLUX[Flux CD Controllers]
        GH -->|Source Sync| FLUX
    end

    subgraph "Foundation Layer"
        direction LR
        TRF[Traefik]
        LS[LocalStack]
        CNPG_OP[CNPG Operator]
        ESO[External Secrets]
        MS[Metrics Server]
        SCYLLA_OP[Scylla Operator]
    end

    subgraph "Data Layer"
        direction LR
        PG[PostgreSQL Cluster]
        REDIS[Redis Sentinel]
        SCYLLA[ScyllaDB]
    end

    subgraph "Observability Layer"
        direction LR
        PROM[Prometheus]
        GRAF[Grafana]
        LOKI[Loki]
        JAEGER[Jaeger]
        OTEL[OpenTelemetry]
    end

    subgraph "Application Layer"
        direction LR
        N8N[N8N]
        TEMP[Temporal]
        PGADMIN[pgAdmin4]
        RINSIGHT[RedisInsight]
    end

    FLUX -->|Deploy| TRF & LS & CNPG_OP & ESO & MS & SCYLLA_OP
    CNPG_OP -->|Manages| PG
    SCYLLA_OP -->|Manages| SCYLLA
    ESO -->|Syncs Secrets| LS
    PG -->|Backend| N8N & TEMP
    REDIS -->|Cache| N8N
    TRF -->|Ingress| GRAF & N8N & TEMP & PGADMIN
```

## Multi-Environment Strategy

```mermaid
flowchart LR
    subgraph "Git Branches"
        DEV_BR[develop branch]
        MAIN_BR[main branch]
    end

    subgraph "Flux Instances"
        DEV_FLUX[Dev Flux]
        PROD_FLUX[Prod Flux]
    end

    subgraph "Clusters"
        DEV_K8S[Dev Cluster<br/>Kind + Colima]
        PROD_K8S[Prod Cluster]
    end

    DEV_BR -->|Sync 1m| DEV_FLUX -->|Deploy| DEV_K8S
    MAIN_BR -->|Sync 10m| PROD_FLUX -->|Deploy| PROD_K8S
```

| Environment | Branch | Sync Interval | Path |
|-------------|--------|---------------|------|
| Development | `develop` | 1 minute | `clusters/stages/dev/clusters/services-amer` |
| Production | `main` | 10 minutes | `clusters/stages/prod/clusters/services-amer` |

## Service Dependency Graph

Fine-grained dependencies enable maximum parallelism. Services in the same layer deploy concurrently.

```mermaid
flowchart TD
    subgraph "Layer 0: Foundation (No Dependencies)"
        T[Traefik]
        L[LocalStack]
        C[CNPG Operator]
        E[ESO Operator]
        EC[ESO Config]
        TC[Traefik Config]
        M[Metrics Server]
        SO[Scylla Operator]
    end

    subgraph "Layer 1: Monitoring"
        KPS[Kube-Prometheus-Stack]
        WG[Weave GitOps]
    end

    subgraph "Layer 2: Logging & Tracing"
        LK[Loki]
        PT[Promtail]
        J[Jaeger]
        OT[OpenTelemetry]
    end

    subgraph "Layer 3: Database Management"
        SM[Scylla Manager]
    end

    subgraph "Layer 4: Databases"
        PG[PostgreSQL Cluster]
        RS[Redis Sentinel]
        SC[ScyllaDB Cluster]
    end

    subgraph "Layer 5: Applications"
        N8N[N8N]
        TMP[Temporal]
    end

    subgraph "Layer 6: DB UIs"
        PA[pgAdmin4]
        RI[RedisInsight]
    end

    T & L & C & E & EC & TC & M & SO --> KPS & WG
    KPS --> LK & PT & J & OT
    SO --> SM --> SC
    C --> PG
    E --> RS
    PG --> N8N & TMP
    RS --> N8N
    PG --> PA
    RS --> RI
```

## Directory Structure

```
fleet-infra/
├── apps/base/                    # Service Kubernetes manifests
│   ├── traefik/                  # HelmRelease, namespace, config
│   ├── cloudnative-pg/           # PostgreSQL cluster CRDs
│   ├── kube-prometheus-stack/    # Monitoring stack
│   ├── n8n/                      # Workflow automation
│   └── ...                       # 30 service directories
│
├── base/services/                # Fine-grained kustomizations
│   ├── kustomization.yaml        # Master resource list
│   ├── traefik.yaml              # Kustomization with dependsOn
│   ├── postgresql-cluster.yaml   # Database with operator dependency
│   └── ...                       # 32 service definitions
│
├── clusters/stages/
│   ├── dev/clusters/services-amer/
│   │   ├── flux-system/          # Flux controllers
│   │   ├── cluster-vars-patch.yaml  # Dev overrides
│   │   └── kustomization.yaml    # References base/services
│   └── prod/                     # Production (similar structure)
│
└── scripts/
    ├── setup-local-dns.sh        # Configure .local domains
    ├── port-forward.sh           # Traditional port forwarding
    └── validate-kustomize.sh     # CI validation
```

## Flux CD Architecture

```mermaid
flowchart LR
    subgraph "Flux Controllers"
        SC[Source Controller]
        KC[Kustomize Controller]
        HC[Helm Controller]
    end

    subgraph "Resources"
        GR[GitRepository]
        KS[Kustomizations]
        HR[HelmReleases]
    end

    SC -->|Manages| GR
    KC -->|Applies| KS
    HC -->|Deploys| HR
    GR -->|Source for| KS & HR
```

| Controller | Responsibility |
|------------|----------------|
| Source Controller | Git repository synchronization |
| Kustomize Controller | Apply Kubernetes manifests with Kustomize |
| Helm Controller | Manage Helm chart releases |

## Design Decisions

!!! success "Fine-Grained Dependencies vs Wave-Based"
    Traditional GitOps uses wave-based deployment (Wave 1 → Wave 2 → Wave 3), causing unnecessary waiting. Fine-grained `dependsOn` relationships enable:
    
    - **8-12 minute deployments** (vs 30-45 minutes)
    - **10+ services deploying in parallel**
    - **Precise failure isolation**

!!! info "Why Flux CD over ArgoCD?"
    - Native Kustomize support without CRD conversion
    - Lighter resource footprint (~200MB vs ~1GB)
    - Better multi-tenancy via Kustomization CRDs
    - Git-native reconciliation model

!!! tip "Local DNS vs Port Forwarding"
    Using Traefik with `.local` domains provides:
    
    - Memorable URLs (`grafana.local` vs `localhost:3030`)
    - No need to remember port numbers
    - Closer to production experience
    - Single Traefik entry point

## Environment Differences

| Resource | Development | Production |
|----------|-------------|------------|
| PostgreSQL Instances | 1 | 3 (HA) |
| PostgreSQL Storage | 10Gi | 20Gi |
| Redis Replicas | 1 | 2+ |
| Prometheus Retention | 7 days | 30 days |
| Prometheus Storage | 20Gi | 50Gi |
| Traefik Replicas | 1 | 3 |
| Backup Retention | 7 days | 30 days |
