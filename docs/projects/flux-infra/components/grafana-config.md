I detect **implementation** intent - writing a documentation page with all context provided in the prompt. My approach: analyze manifests → write the doc directly. The prompt provides complete source material.

Let me quickly check the existing docs structure for proper relative links:
I have full context. The dependency chain is: `kube-prometheus-stack` → `grafana-operator` → `grafana-config` → `grafana-dashboards`. This service is the glue CR that registers the existing kube-prometheus-stack Grafana instance with the Grafana Operator, enabling dashboard-as-code management.
Done. Written to `docs/components/grafana-config.md`.

The page covers the full exemplar structure: overview table, purpose, features, mermaid architecture diagram showing how the Grafana CR bridges the operator to the kube-prometheus-stack instance, configuration details (including instance selector usage for downstream dashboard CRs), environment config, verification commands, troubleshooting scenarios, and related links. All facts sourced from the manifests.
