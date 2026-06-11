I detect **implementation** intent - user explicitly asks to write documentation. But the prompt template is missing all source material (manifests, exemplar, existing content). I need to gather context from the codebase first.
Good. I found the relevant files. Let me read the traefik manifests, existing doc, and an exemplar page in parallel.
Let me get the HelmRelease details and the traefik-config manifests.
I have all the context I need. The existing `docs/components/traefik.md` is already well-structured and matches manifests. Let me cancel the background tasks and produce the refreshed doc.
I already have everything I need from direct reads. The existing `docs/components/traefik.md` is verified accurate against all manifests. Writing the refreshed documentation now:
Done. Refreshed `docs/components/traefik.md` — verified all facts against manifests (`base/services/traefik.yaml`, `apps/base/traefik/helmrelease.yaml`, `base/services/traefik-config.yaml`).

Changes from the prior version:
- Standardized em-dashes (`—`) in feature list for consistency with redis exemplar
- Added "Privacy Controls" feature bullet (from `globalArguments` disabling telemetry/version checks)
- Fixed Related link for Traefik Config to point to `traefik-config.md` (was an anchor link `#traefik-config`)
- All other content preserved as-is — it was already accurate
