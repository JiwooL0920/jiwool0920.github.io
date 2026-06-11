I detect **implementation** intent - explicit write request with a clear spec and exemplar. Writing the Cilium documentation page directly.
Now I have all the context needed. Let me write the documentation page for Cilium.
Done. Written to `docs/components/cilium.md`.

Key decisions made from the manifests:
- **Layer 1 (Network)** — foundation service, no `dependsOn`
- **Namespace** `kube-system` — from `targetNamespace` in HelmRelease
- **Hubble UI access** — derived from `hubble.ui.enabled: true`
- **Kind-specific notes** — cgroup config and k8sServiceHost from values, plus context from ADR-008
