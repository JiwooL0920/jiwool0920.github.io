I detect **implementation** intent - explicit writing request with all context provided in the prompt file. All source-of-truth is in the manifests; no exploration needed.

Let me check the existing docs structure to place this correctly:
Good — component docs live in `docs/components/`. Let me check an existing one for style calibration, and also check if there's already a `kagent.md` (since ollama serves kagent per the manifests):
I have all the context needed. The manifests are the source of truth, and I can see the exact style from kagent.md and the exemplar. Writing the page now:
Done. Created `docs/components/ollama.md` following the exemplar structure exactly. Key decisions from the manifests:

- **Layer 1 (Foundation)** — the service comment says "no dependencies, can start immediately"
- **No dependsOn** — confirmed in `base/services/ollama.yaml`
- **Consumer relationship** — comment explicitly states "Serves models to kagent"
- **All resource values left as variable references** — they're substituted at deploy time from `cluster-vars` ConfigMap, so the doc references the variable names rather than hardcoding values that differ per environment
