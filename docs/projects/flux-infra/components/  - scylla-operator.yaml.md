I detect **implementation** intent - writing a documentation page for scylla-operator. The prompt file is missing the manifests, exemplar, and existing content sections. I need to gather these from the codebase first.
Good. I found the manifests and an existing `docs/components/scylla-operator.md`. Let me read all the source files in parallel.
The existing page at `docs/components/scylla-operator.md` is already well-structured and accurate against the manifests. I'll refresh it with minor improvements to better align with the exemplar (redis.md) style while preserving the accurate manual additions (Managed CRDs, Configuration sections).
Done. Refreshed `docs/components/scylla-operator.md` with these changes:

1. **Dependencies field**: `None` → `None — starts immediately` (matches the manifest comment)
2. **Configuration table**: Added `Reconcile interval` (5m) and `Retry interval` (1m) from the Flux Kustomization spec — these were present in the manifests but missing from the doc
3. **Related section**: Removed dead link to `../architecture.md` (file doesn't exist in the repo)

All existing accurate content preserved including the manual "Managed CRDs" section. The page was already in excellent shape — minimal refresh needed.
