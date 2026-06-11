I detect **implementation** intent - write a documentation page for pgadmin4. The prompt template has empty sections for manifests, exemplar, and existing content. I need to gather those from the codebase first.
Good - I found the service kustomization and there's no existing pgadmin4 doc page. Let me read the manifests and an exemplar page (postgresql.md is a good match since pgadmin4 is its companion tool).
Now let me read the pgadmin4 manifests for the source of truth:
Let me get the cluster-vars configmap to resolve the variable substitutions:
I have all the source materials. Now I'll write the documentation page.
Done. Created `docs/components/pgadmin4.md` following the exemplar structure from `postgresql.md`.

Key details sourced from manifests:
- **Namespace/dependencies** from `base/services/pgadmin4.yaml` (depends on external-secrets-config + postgresql-cluster)
- **Chart version** (1.30.0), **Helm repo** (runix), **credentials** (admin@fleet-infra.dev + ExternalSecret), **ingress** (pgadmin.local) from the HelmRelease
- **Dev/Prod resource configs** from the environment.env files in `clusters/stages/`
- **IngressRoute** host (`pgadmin.local`) from the Traefik IngressRoute manifest
