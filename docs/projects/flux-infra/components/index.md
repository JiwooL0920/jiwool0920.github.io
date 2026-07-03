---
catalog_sha: 9be0573fcf582c2a
flux_infra_commit: 80d85fb
generated_at: 2026-07-03
---

# Components Index

All 41 services in flux-infra, including disabled ones.

## Enabled Services (37)

| Service | Layer | Namespace | Chart | Version |
|---|---|---|---|---|
| [AgentGateway](https://jiwool0920.github.io/projects/flux-infra/components/agentgateway/) | AI agent platform | `agentgateway-system` | `agentgateway` | vv1.3.0-alpha.1 |
| [AgentGateway Config](https://jiwool0920.github.io/projects/flux-infra/components/agentgateway-config/) | AI agent platform | `agentgateway-config` | — | — |
| [Argo CD](https://jiwool0920.github.io/projects/flux-infra/components/argocd/) | Foundation services | `argocd` | `argo-cd` | v7.7.16 |
| [Cilium](https://jiwool0920.github.io/projects/flux-infra/components/cilium/) | Foundation services | `kube-system` | `cilium` | v1.17.2 |
| [CNPG Operator](https://jiwool0920.github.io/projects/flux-infra/components/cnpg-operator/) | Foundation services | `cnpg-system` | `cloudnative-pg` | v0.24.0 |
| [Code Tools](https://jiwool0920.github.io/projects/flux-infra/components/code-tools/) | AI agent platform | `code-tools` | — | — |
| [External Secrets Config](https://jiwool0920.github.io/projects/flux-infra/components/external-secrets-config/) | Foundation services | `external-secrets-config` | — | — |
| [External Secrets Operator](https://jiwool0920.github.io/projects/flux-infra/components/external-secrets-operator/) | Foundation services | `secrets-manager` | `external-secrets` | v0.10.7 |
| [Gateway API CRDs](https://jiwool0920.github.io/projects/flux-infra/components/gateway-api-crds/) | AI agent platform | `gateway-api-crds` | — | — |
| [Grafana Config](https://jiwool0920.github.io/projects/flux-infra/components/grafana-config/) | Grafana Operator | `grafana-config` | — | — |
| [Grafana Dashboards](https://jiwool0920.github.io/projects/flux-infra/components/grafana-dashboards/) | Grafana Operator | `grafana-dashboards` | — | — |
| [Grafana Operator](https://jiwool0920.github.io/projects/flux-infra/components/grafana-operator/) | Grafana Operator | `grafana-operator` | `grafana-operator` | vv5.15.1 |
| [Grafana SA Setup](https://jiwool0920.github.io/projects/flux-infra/components/grafana-sa-setup/) | Foundation services | `grafana-sa-setup` | — | — |
| [Jaeger](https://jiwool0920.github.io/projects/flux-infra/components/jaeger/) | Distributed tracing services | `jaeger` | `jaeger` | v3.3.1 |
| [kagent](https://jiwool0920.github.io/projects/flux-infra/components/kagent/) | AI agent platform | `kagent` | — | — |
| [KEDA](https://jiwool0920.github.io/projects/flux-infra/components/keda/) | Event-driven autoscaling | `keda` | `keda` | v2.16.1 |
| [Kube Prometheus Stack](https://jiwool0920.github.io/projects/flux-infra/components/kube-prometheus-stack/) | Foundation services | `monitoring` | `kube-prometheus-stack` | v65.8.1 |
| [Kubescape](https://jiwool0920.github.io/projects/flux-infra/components/kubescape/) | Security and cost observability | `kubescape` | `kubescape-operator` | v1.30.4 |
| [LocalStack](https://jiwool0920.github.io/projects/flux-infra/components/localstack/) | Foundation services | `localstack` | `localstack` | v0.6.15 |
| [Loki](https://jiwool0920.github.io/projects/flux-infra/components/loki/) | Logging stack services | `monitoring` | `loki` | v6.37.0 |
| [Metrics Server](https://jiwool0920.github.io/projects/flux-infra/components/metrics-server/) | Foundation services | `kube-system` | `metrics-server` | v3.12.2 |
| [N8N](https://jiwool0920.github.io/projects/flux-infra/components/n8n/) | Application services | `n8n` | `./charts/n8n` | v2.31.0 |
| [Node Image GC](https://jiwool0920.github.io/projects/flux-infra/components/node-image-gc/) | Node maintenance | `node-maintenance` | — | — |
| [Ollama](https://jiwool0920.github.io/projects/flux-infra/components/ollama/) | AI agent platform | `ollama` | `ollama` | v1.53.0 |
| [OpenCost](https://jiwool0920.github.io/projects/flux-infra/components/opencost/) | Security and cost observability | `opencost` | `opencost` | v2.5.12 |
| [OpenTelemetry Collector](https://jiwool0920.github.io/projects/flux-infra/components/opentelemetry-collector/) | Distributed tracing services | `opentelemetry` | `opentelemetry-collector` | v0.108.0 |
| [pgAdmin4](https://jiwool0920.github.io/projects/flux-infra/components/pgadmin4/) | Database UI services | `pgadmin4` | `pgadmin4` | v1.30.0 |
| [PostgreSQL Cluster](https://jiwool0920.github.io/projects/flux-infra/components/postgresql-cluster/) | Database services | `postgresql-cluster` | — | — |
| [Promtail](https://jiwool0920.github.io/projects/flux-infra/components/promtail/) | Logging stack services | `monitoring` | `promtail` | v6.17.0 |
| [Redis Sentinel](https://jiwool0920.github.io/projects/flux-infra/components/redis-sentinel/) | Database services | `redis-sentinel` | `redis` | v20.7.0 |
| [RedisInsight](https://jiwool0920.github.io/projects/flux-infra/components/redisinsight/) | Database UI services | `redisinsight` | — | — |
| [ScyllaDB Cluster](https://jiwool0920.github.io/projects/flux-infra/components/scylla-cluster/) | Database services | `scylla` | `scylla` | v1.12.0 |
| [Scylla Operator](https://jiwool0920.github.io/projects/flux-infra/components/scylla-operator/) | Foundation services | `scylla-operator` | `scylla-operator` | v1.12.0 |
| [Temporal](https://jiwool0920.github.io/projects/flux-infra/components/temporal/) | Application services | `temporal` | `temporal` | v0.51.0 |
| [Traefik](https://jiwool0920.github.io/projects/flux-infra/components/traefik/) | Foundation services | `traefik` | `traefik` | v32.1.1 |
| [Traefik Config](https://jiwool0920.github.io/projects/flux-infra/components/traefik-config/) | Foundation services | `traefik-config` | — | — |
| [Weave GitOps](https://jiwool0920.github.io/projects/flux-infra/components/weave-gitops/) | Foundation services | `weave-gitops` | `weave-gitops` | v4.0.36 |

## Disabled Services (4)

| Service | Layer | Reason |
|---|---|---|
| Crossplane | Infrastructure as Code services | Commented out in base/services/kustomization.yaml |
| Crossplane Config | Infrastructure as Code services | Commented out in base/services/kustomization.yaml |
| Crossplane Providers | Infrastructure as Code services | Commented out in base/services/kustomization.yaml |
| Scylla Manager | Database management services | Commented out in base/services/kustomization.yaml |

---
*Generated from [service-catalog.json](https://github.com/JiwooL0920/flux-infra/blob/develop/service-catalog.json) at commit `80d85fb` · catalog sha `9be0573fcf582c2a`*