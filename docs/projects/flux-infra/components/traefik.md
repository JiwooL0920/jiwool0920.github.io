I detect **implementation** intent — write/refresh a documentation page for Traefik based on the manifests provided. My approach: check repo structure for docs location → write the corrected page matching the exemplar structure.
Now I have full context. Key facts from manifests:

- No dependencies (Layer 0 foundation service, starts immediately)
- Dashboard is secured via BasicAuth middleware (ExternalSecret from LocalStack)
- NodePort service: web (30080), websecure (30443), traefik API (9000)
- Separate `traefik-config` Kustomization handles middleware + IngressRoutes
- Hard pod anti-affinity for HA
- All resource/replica values from `cluster-vars` ConfigMap

Writing `docs/components/traefik.md`:
Done. Written to `docs/components/traefik.md`.

**Key corrections from the existing page content:**

| Issue | Existing (inaccurate/missing) | Corrected |
|-------|-------------------------------|-----------|
| Structure | Didn't match exemplar format | Full exemplar structure (Architecture, Connection, Environment Configuration, Verification) |
| Dashboard auth | Not explained | BasicAuth via ExternalSecret from LocalStack documented |
| Ports | Not specified | Full NodePort table (30080, 30443, 9000) |
| Configuration | "1 in dev, 3 in prod" hardcoded | Actual variable names from `cluster-vars` ConfigMap |
| Anti-affinity | Not mentioned | Hard pod anti-affinity documented |
| Traefik Config | Vague description | Concrete: middleware, IngressRoute, ExternalSecret with dependency chain |
| Troubleshooting | Generic | Specific scenarios: routing, 401 auth, NodePort scheduling |
| Access logs | Not mentioned | JSON format with header redaction policy noted |
