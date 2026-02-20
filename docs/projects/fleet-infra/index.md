# Fleet Infrastructure

GitOps infrastructure platform managing **23 services** across multi-environment Kubernetes clusters with automated deployment, monitoring, and high availability.

## Overview

Fleet Infrastructure is a personal Kubernetes platform designed for hosting projects on a local machine and rapid POC development. It leverages **Flux CD** for GitOps-based continuous deployment with fine-grained service dependencies enabling **8-12 minute deployments** (down from 30-45 minutes with traditional wave-based approaches).

### Key Features

| Feature | Description |
|---------|-------------|
| **Fine-Grained Dependencies** | Service-level `dependsOn` relationships enable maximum parallel deployment |
| **Multi-Environment** | Complete isolation between dev (`develop` branch) and prod (`main` branch) |
| **Local DNS** | Access services via `.local` domains (e.g., `grafana.local`) instead of port forwarding |
| **Auto-Secrets** | LocalStack automatically initializes secrets on startup |
| **HA Databases** | PostgreSQL (CNPG), Redis Sentinel, ScyllaDB with automated backups |

### Technology Stack

| Category | Technologies |
|----------|--------------|
| **GitOps** | Flux CD, Kustomize |
| **Ingress** | Traefik |
| **Databases** | PostgreSQL 16 (CloudNative PG), Redis Sentinel, ScyllaDB |
| **Monitoring** | Prometheus, Grafana, AlertManager, Loki |
| **Tracing** | Jaeger, OpenTelemetry Collector |
| **Secrets** | External Secrets Operator, LocalStack (AWS Secrets Manager emulation) |
| **Workflow** | Temporal, N8N |
| **Local Dev** | Kind, Colima |

## Quick Links

- [Architecture](architecture.md) - System design, dependency layers, and deployment flow
- [Components](components.md) - Detailed documentation for all 23 services
- [Runbooks](runbooks.md) - Setup, operations, and troubleshooting guides

## Repository Structure

```
fleet-infra/
├── apps/base/              # Service Kubernetes manifests (30 services)
│   ├── traefik/            # Ingress controller
│   ├── cloudnative-pg/     # PostgreSQL cluster definitions
│   ├── kube-prometheus-stack/  # Monitoring stack
│   └── ...
├── base/services/          # Fine-grained kustomizations with dependencies
│   ├── kustomization.yaml  # Master list of enabled services
│   ├── traefik.yaml        # Service with dependsOn declarations
│   └── ...
├── clusters/stages/        # Environment-specific configurations
│   ├── dev/                # Development (tracks develop branch)
│   └── prod/               # Production (tracks main branch)
└── scripts/                # Automation utilities
    ├── setup-local-dns.sh  # Configure .local domains
    └── port-forward.sh     # Traditional port forwarding
```

## Service Summary

| Category | Active Services | Examples |
|----------|-----------------|----------|
| **Foundation** | 8 | Traefik, LocalStack, CNPG Operator, Metrics Server |
| **Monitoring** | 2 | Kube-Prometheus-Stack, Weave GitOps |
| **Logging/Tracing** | 4 | Loki, Promtail, Jaeger, OpenTelemetry |
| **Databases** | 3 | PostgreSQL Cluster, Redis Sentinel, ScyllaDB |
| **Applications** | 2 | N8N, Temporal |
| **DB Management** | 2 | pgAdmin4, RedisInsight |
| **Disabled** | 4 | Crossplane suite, Scylla Manager |

## Accessing Services

=== "Local DNS (Recommended)"

    ```bash
    # One-time setup
    make setup-dns
    
    # Access services
    http://grafana.local
    http://prometheus.local
    http://n8n.local
    http://temporal.local
    ```

=== "Port Forwarding"

    ```bash
    make port-forward
    
    # Access via localhost
    http://localhost:3030  # Grafana
    http://localhost:9090  # Prometheus
    ```

## Source Code

[:octicons-mark-github-16: View on GitHub](https://github.com/JiwooL0920/fleet-infra){ .md-button }
