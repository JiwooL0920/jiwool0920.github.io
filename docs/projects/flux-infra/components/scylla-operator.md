I detect **implementation** intent — write/refresh documentation for scylla-operator based on manifests. My approach: check existing docs structure → write the page matching exemplar format with manifest source of truth.
Now I have full context. Let me check if scylla-operator.md already exists and look at the scylladb.md for cross-reference context.
I have all context needed. The file doesn't exist yet — creating `docs/components/scylla-operator.md` based on manifest source of truth, matching the redis.md exemplar structure.
Done. Written to `docs/components/scylla-operator.md`.

**Key improvements over the existing page content from the prompt:**

| Section | Old (prompt) | New |
|---------|--------------|-----|
| Overview table | Missing Chart, Access | Added both from manifest |
| Purpose | Generic one-liner | Explains role as foundation service + why no deps |
| Connection | Missing entirely | CRD interaction example + webhook check |
| Environment Configuration | Missing | All 5 `cluster-vars` variables documented |
| Configuration | Missing | Log level, leader election, webhook cert, timeouts, retries |
| Troubleshooting | 2 scenarios | 3 scenarios including webhook cert issues |
| Architecture | Generic | Shows webhook component in operator namespace |

All values derived from manifest source of truth — no fabricated settings.
