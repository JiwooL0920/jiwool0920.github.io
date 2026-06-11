I detect **implementation** intent — explicit "write the documentation" request with complete context provided (manifests + exemplar + structure). My approach: check existing docs structure for layer/link conventions, then write the page.
I have all context needed. KEDA has no `dependsOn` (foundation-level operator), deploys to namespace `keda`, chart v2.16.1. Writing the doc:
Done. Written to `docs/components/keda.md`. Key decisions:

- **Layer 2 (Platform)** — KEDA is an operator with no `dependsOn`, similar to cnpg-operator and external-secrets-operator, but it serves application-layer workloads rather than being a bare foundation service.
- **No external access** — KEDA is purely cluster-internal, interacted with via CRDs.
- **Usage section** instead of "Connection" — KEDA doesn't expose ports; the interaction model is declarative via ScaledObject/ScaledJob manifests. Adapted the exemplar's "Connection" section to "Usage" with practical CRD examples.
- **Resource values** pulled directly from the HelmRelease manifest (100m/128Mi requests, 500m/512Mi limits, 1 replica each for operator and metrics server).
