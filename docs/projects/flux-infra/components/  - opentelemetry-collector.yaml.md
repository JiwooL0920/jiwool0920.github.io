I detect **implementation** intent — write a documentation page for opentelemetry-collector based on the manifests. My approach: explore repo for manifests + existing doc structure → write the page.
There's already an `opentelemetry.md` page. Let me read the manifests, the existing page, the service kustomization, and an exemplar page in parallel.
Now let me read the actual manifests to verify against the existing doc.
I have full context from the manifests. Now let me compare against the existing doc and write a corrected version.

**Key corrections from manifests (source of truth):**

| Issue | Existing Doc | Corrected |
|-------|-------------|-----------|
| Prometheus export port | `:8888` in Access | `:8889` (actual service port) |
| Processors | Only batch + memory_limiter | Add `resourcedetection`, `k8sattributes` |
| Environment Config | Hardcoded values (100m, 250m...) | Variable names from cluster-vars |
| Mode | "deployment" dev / "daemonset" prod | Hardcoded `deployment` (not variable) |
| Extensions | Not documented | health_check:13133, pprof:1777, zpages:55679 |
| Loki namespace | Implied "loki" | `monitoring-loki.monitoring.svc.cluster.local` |
| Architecture | Simplified single flow | 3 distinct pipelines (traces/metrics/logs) |
Done. Written to `docs/components/opentelemetry.md`.

**Key corrections from the existing page based on manifest source of truth:**

| Issue | Existing (wrong/incomplete) | Corrected |
|-------|----------------------------|-----------|
| Access ports | "metrics `:8888`" | Prometheus exporter `:8889`, self-metrics `:8888` |
| Processors | Only batch + memory_limiter | Added `resourcedetection`, `k8sattributes` |
| Environment Config | Hardcoded dev/prod values | Actual variable names from `cluster-vars` |
| Mode | "deployment" dev / "daemonset" prod | Hardcoded `deployment` (not variable-driven) |
| Memory limiter | "80% limit" only | Added 25% spike limit |
| Loki exporter | Generic "Loki" | Actual endpoint `monitoring-loki.monitoring:3100/otlp` |
| Jaeger exporter | Generic "Jaeger" | Actual endpoint `jaeger-collector.jaeger:4317` via OTLP |
| Prometheus receiver | "Port 8888" | Self-scrapes localhost:8888, not an exposed port |
| Architecture diagram | Single simplified flow | 3 distinct pipelines with correct receiver/exporter routing |

**Added sections not in existing page:** Exporters table, Pipelines table, Extensions table, chart version variable, health check / zpages verification, sending queue troubleshooting, config validation tip, Loki link in Related.
