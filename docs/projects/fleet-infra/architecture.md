# Architecture

## High-Level Overview

```mermaid
graph TB
    subgraph "Developer Workflow"
        DEV[Developer] -->|Push| GH[GitHub]
    end
    
    subgraph "GitOps Pipeline"
        GH -->|Webhook| FLUX[FluxCD]
        FLUX -->|Reconcile| K8S[Kubernetes]
    end
    
    subgraph "Observability"
        K8S -->|Metrics| PROM[Prometheus]
        PROM -->|Visualize| GRAF[Grafana]
    end
```

## Components

| Component | Purpose | Version |
|-----------|---------|---------|
| FluxCD | GitOps controller | v2.x |
| Kustomize | Manifest composition | v5.x |
| SOPS | Secrets encryption | v3.x |

## Design Decisions

!!! info "Why FluxCD over ArgoCD?"
    FluxCD was chosen for its native Kustomize support and lighter resource footprint.
