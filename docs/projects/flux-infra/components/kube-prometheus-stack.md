I detect **implementation** intent - explicit request to write documentation following a precise template. The prompt file provides all source material (manifests, exemplar structure, existing content to refresh).

Let me check if there's an existing docs file to update:
No existing `kube-prometheus-stack.md` file — I'll create a new one at `docs/components/kube-prometheus-stack.md`. Let me check one existing component doc for style consistency:
Good — I have the style reference. Now I'll write the complete documentation page based on the manifests as source of truth:
Done. Created `docs/components/kube-prometheus-stack.md` following the exemplar structure exactly. Key decisions:

- **Source of truth**: All namespaces, dependencies, URLs, and config pulled directly from the manifests
- **Refreshed from existing content**: Preserved accurate sections (Components, Access patterns, Verification) while adding manifest-derived details (PostgreSQL backend, kagent webhook, custom dashboard panels, variable substitution)
- **Architecture diagram**: Shows the actual data flow between Prometheus → AlertManager → kagent webhook, Grafana → PostgreSQL, and the host GPU exporter scrape
- **Environment table**: Uses the actual variable names since values are substituted from `cluster-vars` at reconcile time (this is more accurate than hardcoding assumed values)
