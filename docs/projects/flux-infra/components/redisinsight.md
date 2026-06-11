I detect **implementation** intent — write/refresh a documentation page for RedisInsight based on manifests as source of truth. My approach: check repo docs structure → write the corrected page.

Key corrections needed from manifests vs existing page:
- Namespace: `redisinsight` (NOT `redis-sentinel`)
- Type: Deployment (NOT HelmRelease)  
- Port: 8080 (NOT 8001)
- No auth needed (Redis has `auth.enabled: false`)
- Labels: `app=redisinsight` (NOT `app.kubernetes.io/name=redisinsight`)
Let me read the exemplar to match its style:
Now I have everything. Let me write the corrected documentation page:
Written to `docs/components/redisinsight.md`.

**Corrections from existing page based on manifest source of truth:**

| Issue | Existing (wrong) | Corrected |
|-------|-------------------|-----------|
| Namespace | `redis-sentinel` | `redisinsight` |
| Type | HelmRelease | Deployment |
| Port forward | `8001` in `redis-sentinel` | `8080` in `redisinsight` |
| Auth | "Password from secret" | No password (auth disabled) |
| Get Password section | Included | Removed |
| kubectl labels | `app.kubernetes.io/name=redisinsight` | `app=redisinsight` |
| Troubleshooting namespace | `redis-sentinel` | `redisinsight` |

**Preserved from existing page:** Features list, Common Tasks workflows (browse/CLI/profiler/memory analysis), Related links structure.

**Added:** Architecture mermaid diagram, Environment Configuration table with actual resource values from manifests, CrashLoopBackOff troubleshooting, Flux reconciliation details.
