I detect **implementation** intent - explicit "write the documentation" request. Let me gather the actual manifest data from the repo to ensure accuracy.
Now I have all manifest data. Let me check if the target file exists:
I have all the data from the manifests. Writing the documentation page:
Done. Created `docs/components/postgresql.md` with content derived from the actual manifests:

**Key updates from the existing draft:**
- Removed references to `ro` and `r` services (disabled in manifest via `disabledDefaultServices`)
- Updated database list to match actual Database CRDs (added `agentic`, `grafana`, `kagent`, `youtube-automation`; noted pgvector extensions)
- Added PushSecret/credential sharing documentation (from `push-secret.yaml`)
- Added full PostgreSQL parameter table (from cluster spec)
- Updated architecture diagram to reflect single RW endpoint
- Linked to ADR-004 for architectural context
