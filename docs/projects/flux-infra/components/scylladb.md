I detect **implementation** intent — refresh the scylla-cluster documentation page based on manifest source of truth. My approach: gather manifests + existing docs in parallel → write the corrected page.
No existing `docs/components/scylladb.md`. Let me read the manifests and an exemplar page.
Now I have full context. Key facts from manifests:

- **Type**: HelmRelease (not just "ScyllaCluster CRD")
- **Dependencies**: Scylla Operator + Traefik Config (existing page only shows Operator)
- **Datacenter**: `dc1`, Rack: `rack1` → pod naming: `scylla-dc1-rack1-0`
- **Alternator**: port 8000, writeIsolation `only_rmw_uses_lwt`
- **Developer mode**: configurable via `${SCYLLA_DEVELOPER_MODE}`
- **No secrets**: no ExternalSecret in kustomization

Writing the refreshed page to `docs/components/scylladb.md`:
Done. Written to `docs/components/scylladb.md`.

**Key corrections from the existing page content based on manifest source of truth:**

| Issue | Existing (wrong/incomplete) | Corrected |
|-------|----------------------------|-----------|
| Type | "ScyllaCluster CRD" | HelmRelease (deploys ScyllaCluster via Helm) |
| Dependencies | "Scylla Operator" only | Scylla Operator + Traefik Config |
| Pod naming | `scylla-dc-default-0` | `scylla-dc1-rack1-0` (datacenter=dc1, rack=rack1) |
| Section structure | "Access" with tabs | "Connection" matching exemplar format |
| Environment config | Not present | Full variable table from `cluster-vars` ConfigMap |
| Developer mode | Not mentioned | Documented as key Kind cluster requirement |
| Write isolation | Not mentioned | `only_rmw_uses_lwt` documented |
| Agent sidecar | Not mentioned | Manager Agent documented |
| Architecture diagram | Generic 3-node ring | Accurate topology with IngressRoute, operator, service |

**Removed sections** not in exemplar structure: "Use Cases" table (merged into Purpose), "TTL Configuration" (moved to connection examples where relevant).

**Added sections** matching exemplar: "Environment Configuration" with all `cluster-vars` substitution variables, "Alternator Configuration" details, "Cluster Topology" summary.
