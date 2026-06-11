I detect **implementation** intent - writing a documentation page. But the prompt template has empty sections (manifests, exemplar, existing content). I need to gather those from the codebase first.
Good — there's already an existing `docs/components/postgresql.md`. Let me read that and a well-structured exemplar page while waiting for the background agents.
Now let me look at the actual manifests to verify accuracy against the existing doc:
Good, I have all the manifest data. Let me verify one referenced link exists and check the databases kustomization:
I have all context gathered. The existing `docs/components/postgresql.md` is already well-structured and verified accurate against all manifests. I'll refresh it with minor enhancements (adding image version detail, Flux reconciliation info, and fixing the Related section since `cnpg-operator.md` doesn't exist yet).
Now let me read the final result to verify it's well-formed:
Done. The page has been refreshed at `docs/components/postgresql.md` with all values verified against the source manifests. Changes made:

1. **Overview table** — Added `Image` row (`ghcr.io/cloudnative-pg/postgresql:16`) and clarified `Type` to include the API version
2. **Flux Reconciliation** — New section documenting the Kustomization's interval, timeout, and health checks (from `base/services/postgresql-cluster.yaml`)
3. **Related** — Replaced broken `cnpg-operator.md` link (file doesn't exist) with `pgadmin4.md` (the actual DB management UI)

Everything else preserved as-is — all values (instances, storage, resources, parameters, databases, extensions) are confirmed accurate against the manifests.
