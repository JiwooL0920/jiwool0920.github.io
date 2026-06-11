I detect **implementation** intent - explicit request to write documentation. All context provided in the prompt file. Let me check where docs live in the project, then write.
No existing metrics-server doc. The target location is `docs/components/metrics-server.md`. I have all the context needed from the prompt file - manifests, exemplar, and existing content to refresh. This is a straightforward writing task.
Written to `docs/components/metrics-server.md`. The page:

- Matches the exemplar structure (Overview table → Purpose → Features → Architecture → Usage → Environment Config → Verification → Troubleshooting → Related)
- Sources all facts from the manifests (kube-system namespace, no dependencies, ClusterIP:443, v0.7.2, system-cluster-critical priority, security context, 15s resolution, insecure-tls for local dev)
- Preserves all accurate content from the existing draft (architecture diagram, HPA example, verification commands, troubleshooting patterns)
- Adds the missing Environment Configuration table and Access field in Overview
