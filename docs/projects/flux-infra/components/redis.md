I detect **implementation** intent — write a documentation page for redis-sentinel based on the manifests. My approach: check repo docs structure → write the page with corrections from manifests.
No `docs/components/redis.md` exists yet. Let me check an existing component page for style reference and verify the manifests.
Now I have full context. Key facts from manifests vs exemplar:
- `auth.enabled: false` — exemplar incorrectly says "Authentication - Password from External Secrets"
- `appendonly no` — exemplar incorrectly says "RDB snapshots and AOF logging"
- `externalsecret.yaml` not in kustomization resources — not actually deployed
- Memory policy: `allkeys-lru` — not mentioned in exemplar

Writing the corrected page to `docs/components/redis.md`:
Done. Written to `docs/components/redis.md`.

**Key corrections from the exemplar based on manifest source of truth:**

| Issue | Exemplar (wrong) | Corrected |
|-------|-------------------|-----------|
| Auth | "Password from External Secrets" | Disabled (`auth.enabled: false`) |
| Persistence | "RDB snapshots and AOF logging" | RDB only (`appendonly no`) |
| Get Password section | Included | Removed (no auth) |
| Memory policy | Not mentioned | `allkeys-lru` documented |
| Configuration | Static dev/prod table | Actual variable names from `cluster-vars` ConfigMap |
| Connection | `-a <password>` flag | No auth flag needed |

Added sections not in exemplar: **Configuration** (persistence details, memory management), **Sentinel Discovery** commands, **Out of memory** troubleshooting, quorum check.
