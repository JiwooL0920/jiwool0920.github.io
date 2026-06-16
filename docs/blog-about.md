# About this blog

This is my personal homelab documentation and technical blog.

I run a Kubernetes homelab on a local kind cluster, and use it as a playground to learn, experiment, and build things I'd otherwise only touch at work. It's the same stack I work with daily — GitOps, observability, databases, agentic AI — but entirely mine to break and rebuild.

---

## Projects

| Project | Description | Stack |
|---------|-------------|-------|
| [Flux Infrastructure](projects/flux-infra/index.md) | Kubernetes GitOps homelab | FluxCD, Kustomize |
| [Terraform Infrastructure](projects/terraform-infra/index.md) | Modular cloud infrastructure | Terraform, AWS/GCP |
| [Grafana Dashboards](projects/grafana-dashboards/index.md) | Observability dashboards | Grafana, Prometheus |
| [Agentic AI](projects/agentic-ai/index.md) | AI agent platform with RAG | Python, LangChain |

## Engineering Patterns

Documented patterns and learnings from building production systems:

- [GitOps Patterns](engineering-patterns/gitops.md) - Declarative infrastructure management
- [Terraform Module Design](engineering-patterns/terraform-modules.md) - Reusable infrastructure components
- [Observability](engineering-patterns/observability.md) - Metrics, logging, and tracing strategies
- [Agent Architectures](engineering-patterns/agent-architectures.md) - AI agent design patterns
