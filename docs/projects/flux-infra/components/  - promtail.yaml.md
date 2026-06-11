I detect **implementation** intent - user wants me to write a documentation page for promtail. The prompt template is missing manifests and exemplar, so I need to gather those from the codebase.
I have the manifests and exemplar. Let me check cluster vars for actual resource values.
I have all the data I need. Let me write the documentation page now.
Done. Written to `/Users/jiwoolee/Project/fleet-infra-update-docs/docs/components/promtail.md`.

**Sources used:**
- `base/services/promtail.yaml` — dependsOn (Loki), health check (DaemonSet)
- `apps/base/promtail/helmrelease.yaml` — chart v6.17.0, full config (push URL, scrape pipeline, tolerations, init container, security context, ServiceMonitor)
- `clusters/stages/dev/.../environment.env` — 128Mi/128Mi, 100m/100m
- `clusters/stages/prod/.../environment.env` — 256Mi/512Mi, 100m/500m
- `docs/components/loki.md` — structure/style exemplar
