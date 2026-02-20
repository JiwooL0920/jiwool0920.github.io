# Components

This page documents all 23 services deployed in the fleet-infra platform, organized by their dependency layer.

## Foundation Services (Layer 0)

These services have no dependencies and deploy immediately in parallel.

### Traefik

| Property | Value |
|----------|-------|
| **Namespace** | `traefik` |
| **Type** | HelmRelease |
| **Purpose** | Ingress controller and load balancer |
| **Access** | `http://traefik.local` (dashboard) |

Traefik handles all ingress routing with IngressRoute CRDs, providing:

- Automatic HTTPS (when configured)
- Middleware for auth, rate limiting, headers
- Dashboard for route visualization

### LocalStack

| Property | Value |
|----------|-------|
| **Namespace** | `localstack` |
| **Type** | HelmRelease |
| **Purpose** | AWS services emulation for local development |
| **Access** | `http://localstack.local` |

Emulates AWS services including:

- **Secrets Manager** - Stores credentials for Redis, pgAdmin, Grafana, Traefik
- **S3** - PostgreSQL backup storage
- **Auto-initialization** - Secrets created via startup hooks

### CNPG Operator

| Property | Value |
|----------|-------|
| **Namespace** | `cnpg-system` |
| **Type** | HelmRelease |
| **Purpose** | CloudNative PostgreSQL operator |

Manages PostgreSQL clusters with:

- Automated failover
- Point-in-time recovery
- Backup scheduling to S3

### External Secrets Operator

| Property | Value |
|----------|-------|
| **Namespace** | `external-secrets` |
| **Type** | HelmRelease |
| **Purpose** | Sync secrets from external providers to Kubernetes |

Syncs secrets from LocalStack Secrets Manager to Kubernetes secrets automatically.

### External Secrets Config

| Property | Value |
|----------|-------|
| **Namespace** | `external-secrets` |
| **Type** | ClusterSecretStore |
| **Depends On** | External Secrets Operator, LocalStack |

Configures the ClusterSecretStore to connect to LocalStack.

### Traefik Config

| Property | Value |
|----------|-------|
| **Namespace** | `traefik` |
| **Type** | Middleware, IngressRoutes |
| **Depends On** | Traefik |

Defines middleware and ingress routes for all services.

### Metrics Server

| Property | Value |
|----------|-------|
| **Namespace** | `kube-system` |
| **Type** | HelmRelease |
| **Purpose** | Cluster resource metrics for HPA |

### Scylla Operator

| Property | Value |
|----------|-------|
| **Namespace** | `scylla-operator` |
| **Type** | HelmRelease |
| **Purpose** | ScyllaDB Kubernetes operator |

---

## Monitoring & Observability (Layer 1)

### Kube-Prometheus-Stack

| Property | Value |
|----------|-------|
| **Namespace** | `monitoring` |
| **Type** | HelmRelease |
| **Access** | `http://grafana.local`, `http://prometheus.local`, `http://alertmanager.local` |
| **Depends On** | Foundation services |

Complete monitoring stack including:

- **Prometheus** - Metrics collection and alerting
- **Grafana** - Visualization dashboards
- **AlertManager** - Alert routing and silencing
- **Node Exporter** - Host metrics

### Weave GitOps

| Property | Value |
|----------|-------|
| **Namespace** | `flux-system` |
| **Type** | HelmRelease |
| **Access** | `http://weave.local` |
| **Depends On** | Foundation services |

GitOps dashboard for visualizing Flux resources.

---

## Logging & Tracing (Layer 2)

### Loki

| Property | Value |
|----------|-------|
| **Namespace** | `loki` |
| **Type** | HelmRelease |
| **Purpose** | Log aggregation system |
| **Depends On** | Kube-Prometheus-Stack |

Grafana Loki for log storage and querying via LogQL.

### Promtail

| Property | Value |
|----------|-------|
| **Namespace** | `loki` |
| **Type** | DaemonSet |
| **Purpose** | Log shipping agent |
| **Depends On** | Loki |

Collects logs from all pods and ships to Loki.

### Jaeger

| Property | Value |
|----------|-------|
| **Namespace** | `jaeger` |
| **Type** | HelmRelease |
| **Access** | `http://jaeger.local` |
| **Purpose** | Distributed tracing backend |
| **Depends On** | Foundation services |

### OpenTelemetry Collector

| Property | Value |
|----------|-------|
| **Namespace** | `opentelemetry` |
| **Type** | HelmRelease |
| **Purpose** | Unified telemetry collection (traces, metrics, logs) |
| **Depends On** | Jaeger |

---

## Database Services (Layer 4)

### PostgreSQL Cluster

| Property | Value |
|----------|-------|
| **Namespace** | `cnpg-system` |
| **Type** | Cluster CRD |
| **Access** | Port 5432 |
| **Depends On** | CNPG Operator |

PostgreSQL 16 cluster with:

| Feature | Dev | Prod |
|---------|-----|------|
| Instances | 1 | 3 (HA) |
| Storage | 10Gi | 20Gi |
| Backup Retention | 7 days | 30 days |

Pre-configured databases:

- `appdb` - General application database
- `n8n` - N8N workflow data
- `temporal` - Temporal workflow state
- `temporal_visibility` - Temporal search

### Redis Sentinel

| Property | Value |
|----------|-------|
| **Namespace** | `redis-sentinel` |
| **Type** | HelmRelease |
| **Access** | Port 6379, `http://redis.local` (RedisInsight) |
| **Depends On** | External Secrets Config |

Redis with Sentinel for high availability:

- Master-replica configuration
- Automatic failover
- Authentication via External Secrets

### ScyllaDB Cluster

| Property | Value |
|----------|-------|
| **Namespace** | `scylla` |
| **Type** | ScyllaCluster CRD |
| **Access** | `http://scylla.local` (Alternator API) |
| **Depends On** | Scylla Operator |

NoSQL database with DynamoDB-compatible API (Alternator):

- Discord-proven at trillion+ message scale
- Native TTL support for automatic data retention
- Ideal for chat history and session storage

---

## Application Services (Layer 5)

### N8N

| Property | Value |
|----------|-------|
| **Namespace** | `n8n` |
| **Type** | HelmRelease |
| **Access** | `http://n8n.local` |
| **Depends On** | PostgreSQL Cluster, Redis Sentinel |

Workflow automation platform:

- Visual workflow builder
- 400+ integrations
- Webhook triggers
- PostgreSQL backend for persistence

### Temporal

| Property | Value |
|----------|-------|
| **Namespace** | `temporal` |
| **Type** | HelmRelease |
| **Access** | `http://temporal.local` |
| **Depends On** | PostgreSQL Cluster |

Workflow orchestration platform:

- Durable execution
- Automatic retries
- Long-running workflows
- PostgreSQL for state persistence

---

## Database Management UIs (Layer 6)

### pgAdmin4

| Property | Value |
|----------|-------|
| **Namespace** | `pgadmin` |
| **Type** | HelmRelease |
| **Access** | `http://pgadmin.local` |
| **Depends On** | PostgreSQL Cluster |

Web-based PostgreSQL administration interface.

### RedisInsight

| Property | Value |
|----------|-------|
| **Namespace** | `redis-sentinel` |
| **Type** | HelmRelease |
| **Access** | `http://redis.local` |
| **Depends On** | Redis Sentinel |

Redis management and visualization interface.

---

## Disabled Services

These services are available but not deployed by default. Enable by uncommenting in `base/services/kustomization.yaml`.

### Crossplane Suite

- **Crossplane** - Infrastructure as Code platform
- **Crossplane Providers** - AWS/GCP/Azure providers
- **Crossplane Config** - Composition definitions

### Scylla Manager

- **Scylla Manager** - Backup and repair automation for ScyllaDB

---

## Service Access Summary

### Local DNS (Recommended)

| Service | URL |
|---------|-----|
| Traefik Dashboard | `http://traefik.local` |
| Grafana | `http://grafana.local` |
| Prometheus | `http://prometheus.local` |
| AlertManager | `http://alertmanager.local` |
| N8N | `http://n8n.local` |
| Temporal UI | `http://temporal.local` |
| pgAdmin4 | `http://pgadmin.local` |
| RedisInsight | `http://redis.local` |
| Weave GitOps | `http://weave.local` |
| LocalStack | `http://localstack.local` |
| ScyllaDB | `http://scylla.local` |
| Jaeger | `http://jaeger.local` |

### Port Forwarding (Alternative)

| Service | Port |
|---------|------|
| Grafana | 3030 |
| Prometheus | 9090 |
| AlertManager | 9093 |
| N8N | 5678 |
| Temporal UI | 8090 |
| pgAdmin4 | 8080 |
| RedisInsight | 8001 |
| PostgreSQL | 5432 |
| Redis | 6379 |
| LocalStack | 4566 |
| Weave GitOps | 9001 |
