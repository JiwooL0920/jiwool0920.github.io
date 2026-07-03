---
catalog_sha: bbff61e079f91214
flux_infra_commit: 577337a
generated_at: 2026-07-03
---

# Flux Infrastructure — Service Overview

GitOps Kubernetes homelab managed with [Flux CD](https://fluxcd.io).
**37 active services** across 13 dependency layers,
enabling intelligent parallel deployment with precise `dependsOn` ordering.

## Service Layers

### Foundation services

13 enabled

| Service | Namespace | Type | Chart | Dependencies |
|---|---|---|---|---|
| [Argo CD](https://jiwool0920.github.io/projects/flux-infra/components/argocd/) | `argocd` | HelmRelease | `argo-cd` v7.7.16 | traefik-config, external-secrets-config, redis-sentinel |
| [CNPG Operator](https://jiwool0920.github.io/projects/flux-infra/components/cnpg-operator/) | `cnpg-system` | HelmRelease | `cloudnative-pg` v0.24.0 | — |
| [Cilium](https://jiwool0920.github.io/projects/flux-infra/components/cilium/) | `kube-system` | HelmRelease | `cilium` v1.17.2 | — |
| [External Secrets Config](https://jiwool0920.github.io/projects/flux-infra/components/external-secrets-config/) | `external-secrets-config` | Kustomization | — | external-secrets-operator, localstack |
| [External Secrets Operator](https://jiwool0920.github.io/projects/flux-infra/components/external-secrets-operator/) | `secrets-manager` | HelmRelease | `external-secrets` v0.10.7 | localstack |
| [Grafana SA Setup](https://jiwool0920.github.io/projects/flux-infra/components/grafana-sa-setup/) | `grafana-sa-setup` | Job | — | kube-prometheus-stack |
| [Kube Prometheus Stack](https://jiwool0920.github.io/projects/flux-infra/components/kube-prometheus-stack/) | `monitoring` | HelmRelease | `kube-prometheus-stack` v65.8.1 | external-secrets-config |
| [LocalStack](https://jiwool0920.github.io/projects/flux-infra/components/localstack/) | `localstack` | HelmRelease | `localstack` v0.6.15 | — |
| [Metrics Server](https://jiwool0920.github.io/projects/flux-infra/components/metrics-server/) | `kube-system` | HelmRelease | `metrics-server` v3.12.2 | — |
| [Scylla Operator](https://jiwool0920.github.io/projects/flux-infra/components/scylla-operator/) | `scylla-operator` | HelmRelease | `scylla-operator` v1.12.0 | — |
| [Traefik](https://jiwool0920.github.io/projects/flux-infra/components/traefik/) | `traefik` | HelmRelease | `traefik` v32.1.1 | — |
| [Traefik Config](https://jiwool0920.github.io/projects/flux-infra/components/traefik-config/) | `traefik-config` | Kustomization | — | traefik, external-secrets-config |
| [Weave GitOps](https://jiwool0920.github.io/projects/flux-infra/components/weave-gitops/) | `weave-gitops` | HelmRelease | `weave-gitops` v4.0.36 | — |

### Node maintenance

1 enabled

| Service | Namespace | Type | Chart | Dependencies |
|---|---|---|---|---|
| [Node Image GC](https://jiwool0920.github.io/projects/flux-infra/components/node-image-gc/) | `node-maintenance` | CronJob | — | — |

### Event-driven autoscaling

1 enabled

| Service | Namespace | Type | Chart | Dependencies |
|---|---|---|---|---|
| [KEDA](https://jiwool0920.github.io/projects/flux-infra/components/keda/) | `keda` | HelmRelease | `keda` v2.16.1 | — |

### Logging stack services

2 enabled

| Service | Namespace | Type | Chart | Dependencies |
|---|---|---|---|---|
| [Loki](https://jiwool0920.github.io/projects/flux-infra/components/loki/) | `monitoring` | HelmRelease | `loki` v6.37.0 | external-secrets-config, kube-prometheus-stack |
| [Promtail](https://jiwool0920.github.io/projects/flux-infra/components/promtail/) | `monitoring` | HelmRelease | `promtail` v6.17.0 | loki |

### Distributed tracing services

2 enabled

| Service | Namespace | Type | Chart | Dependencies |
|---|---|---|---|---|
| [Jaeger](https://jiwool0920.github.io/projects/flux-infra/components/jaeger/) | `jaeger` | HelmRelease | `jaeger` v3.3.1 | traefik-config |
| [OpenTelemetry Collector](https://jiwool0920.github.io/projects/flux-infra/components/opentelemetry-collector/) | `opentelemetry` | HelmRelease | `opentelemetry-collector` v0.108.0 | jaeger, loki, kube-prometheus-stack |

### Grafana Operator

3 enabled

| Service | Namespace | Type | Chart | Dependencies |
|---|---|---|---|---|
| [Grafana Config](https://jiwool0920.github.io/projects/flux-infra/components/grafana-config/) | `grafana-config` | Kustomization | — | grafana-operator |
| [Grafana Dashboards](https://jiwool0920.github.io/projects/flux-infra/components/grafana-dashboards/) | `grafana-dashboards` | Kustomization | — | grafana-config |
| [Grafana Operator](https://jiwool0920.github.io/projects/flux-infra/components/grafana-operator/) | `grafana-operator` | HelmRelease | `grafana-operator` vv5.15.1 | kube-prometheus-stack |

### Database management services

0 enabled, 1 disabled

| Service | Namespace | Type | Chart | Dependencies |
|---|---|---|---|---|
| ~~Scylla Manager~~ (disabled) | `scylla-manager` | HelmRelease | `scylla-manager` | — |

### Database services

3 enabled

| Service | Namespace | Type | Chart | Dependencies |
|---|---|---|---|---|
| [PostgreSQL Cluster](https://jiwool0920.github.io/projects/flux-infra/components/postgresql-cluster/) | `postgresql-cluster` | Kustomization | — | cnpg-operator |
| [Redis Sentinel](https://jiwool0920.github.io/projects/flux-infra/components/redis-sentinel/) | `redis-sentinel` | HelmRelease | `redis` v20.7.0 | external-secrets-config |
| [ScyllaDB Cluster](https://jiwool0920.github.io/projects/flux-infra/components/scylla-cluster/) | `scylla` | HelmRelease | `scylla` v1.12.0 | scylla-operator, traefik-config |

### Application services

2 enabled

| Service | Namespace | Type | Chart | Dependencies |
|---|---|---|---|---|
| [N8N](https://jiwool0920.github.io/projects/flux-infra/components/n8n/) | `n8n` | HelmRelease | `./charts/n8n` v2.31.0 | external-secrets-config, postgresql-cluster |
| [Temporal](https://jiwool0920.github.io/projects/flux-infra/components/temporal/) | `temporal` | HelmRelease | `temporal` v0.51.0 | external-secrets-config, postgresql-cluster |

### AI agent platform

6 enabled

| Service | Namespace | Type | Chart | Dependencies |
|---|---|---|---|---|
| [AgentGateway](https://jiwool0920.github.io/projects/flux-infra/components/agentgateway/) | `agentgateway-system` | HelmRelease | `agentgateway` vv1.3.0-alpha.1 | gateway-api-crds, kagent, traefik, external-secrets-config |
| [AgentGateway Config](https://jiwool0920.github.io/projects/flux-infra/components/agentgateway-config/) | `agentgateway-config` | Kustomization | — | agentgateway, opentelemetry-collector |
| [Code Tools](https://jiwool0920.github.io/projects/flux-infra/components/code-tools/) | `code-tools` | Deployment | — | — |
| [Gateway API CRDs](https://jiwool0920.github.io/projects/flux-infra/components/gateway-api-crds/) | `gateway-api-crds` | Kustomization | — | — |
| [Ollama](https://jiwool0920.github.io/projects/flux-infra/components/ollama/) | `ollama` | HelmRelease | `ollama` v1.53.0 | — |
| [kagent](https://jiwool0920.github.io/projects/flux-infra/components/kagent/) | `kagent` | Kustomization | — | ollama, cnpg-operator, external-secrets-config, traefik, gra… |

### Security and cost observability

2 enabled

| Service | Namespace | Type | Chart | Dependencies |
|---|---|---|---|---|
| [Kubescape](https://jiwool0920.github.io/projects/flux-infra/components/kubescape/) | `kubescape` | HelmRelease | `kubescape-operator` v1.30.4 | metrics-server, kube-prometheus-stack |
| [OpenCost](https://jiwool0920.github.io/projects/flux-infra/components/opencost/) | `opencost` | HelmRelease | `opencost` v2.5.12 | kube-prometheus-stack |

### Database UI services

2 enabled

| Service | Namespace | Type | Chart | Dependencies |
|---|---|---|---|---|
| [RedisInsight](https://jiwool0920.github.io/projects/flux-infra/components/redisinsight/) | `redisinsight` | Deployment | — | redis-sentinel |
| [pgAdmin4](https://jiwool0920.github.io/projects/flux-infra/components/pgadmin4/) | `pgadmin4` | HelmRelease | `pgadmin4` v1.30.0 | external-secrets-config, postgresql-cluster |

### Infrastructure as Code services

0 enabled, 3 disabled

| Service | Namespace | Type | Chart | Dependencies |
|---|---|---|---|---|
| ~~Crossplane~~ (disabled) | `crossplane-system` | HelmRelease | `crossplane` | — |
| ~~Crossplane Config~~ (disabled) | `crossplane-config` | Kustomization | — | — |
| ~~Crossplane Providers~~ (disabled) | `crossplane-providers` | Kustomization | — | — |


## Deployment Parallelism

Services without unresolved `dependsOn` references start concurrently.
The dependency graph is fully described in each service's Flux Kustomization under
[`base/services/`](https://github.com/JiwooL0920/flux-infra/tree/develop/base/services/).

---
*Generated from [service-catalog.json](https://github.com/JiwooL0920/flux-infra/blob/develop/service-catalog.json) at commit `577337a` · catalog sha `bbff61e079f91214`*