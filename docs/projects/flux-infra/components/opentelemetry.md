I detect **writing** intent - producing a documentation page from manifests. My approach: analyze the manifests from the prompt, check existing doc location in the repo, then write the refreshed page.
I have enough context from the manifests and the existing page structure. The file goes to `docs/components/opentelemetry.md`. Let me write the refreshed documentation.
Done. Written to `docs/components/opentelemetry.md`.

Key changes from the existing page content:

- **Dependencies updated** — Added Loki and Kube-Prometheus-Stack (from `dependsOn` in the Flux Kustomization)
- **Layer corrected** — "Observability Pipeline (Layer 2)" since it depends on Layer 1 backends (Jaeger is Layer 1)
- **Receivers expanded** — All Jaeger protocol variants (gRPC :14250, thrift_compact :6831, thrift_binary :6832) and Prometheus self-scrape now documented
- **Kubernetes presets added** — kubernetesAttributes, clusterMetrics, kubeletMetrics from the manifest
- **Processor config specifics** — Batch size 1024/2048, memory limiter 80%, from actual values
- **Connection section added** — Matching exemplar structure with port-forward + app config + legacy protocols
- **Environment Configuration table** — Dev vs prod with variable substitution note
- **Image/chart metadata** — Added `otel/opentelemetry-collector-contrib` and chart source to overview
