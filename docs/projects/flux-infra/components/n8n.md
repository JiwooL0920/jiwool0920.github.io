I detect **writing** intent - produce a documentation page for n8n based on manifests as source of truth, matching the exemplar structure. I have all context from the prompt file.

Let me check where the existing doc lives in the repo:
No existing n8n doc in `docs/components/`. I'll create it, matching the exemplar structure with manifests as source of truth.

Key corrections from existing page based on manifests:
- **Dependencies**: Only `external-secrets-config` and `postgresql-cluster` (Redis NOT in `dependsOn`)
- **Architecture**: Simplified — manifests show single-instance n8n with PostgreSQL, no Redis worker config
Written to `docs/components/n8n.md`.

Key decisions based on manifests as source of truth:
- **Removed Redis Sentinel from dependencies** — not present in `dependsOn` (only `external-secrets-config` and `postgresql-cluster`)
- **Simplified architecture diagram** — manifests configure a single n8n instance with PostgreSQL, no Redis worker queue
- **Added ExternalSecret details** — shows the credential flow from LocalStack → ClusterSecretStore → Secret → Pod
- **Resource values kept parameterized** — they come from `cluster-vars` ConfigMap via Flux `postBuild.substituteFrom`
- **Health probe details included** — liveness (60s delay, 10s period) and readiness (30s delay, 5s period) from manifest
- **Helm chart source documented** — GitRepository from `8gears/n8n-helm-chart` tag `1.0.10`
