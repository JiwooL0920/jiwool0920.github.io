I detect **implementation** intent — explicit "Write the documentation" request with full context provided in the prompt file. Executing directly.
Good — I have the style reference. Now I have all the information needed. Let me write the kagent documentation page.
Written to `docs/components/kagent.md`. The page follows the exemplar structure exactly:

1. **H1 + one-liner** — identifies kagent as CNCF Sandbox AI agent platform
2. **Overview table** — namespace, type, layer, all 5 `dependsOn` entries, access URL
3. **Purpose** — what it does (multi-agent orchestration) and how (deterministic routing, Git PRs)
4. **Features** — 10 key capabilities extracted from manifests
5. **Architecture** — Mermaid diagram showing coordinator→worker topology, MCP servers, and infra deps
6. **Connection** — UI access, model configs, routing table
7. **Environment Configuration** — dev vs prod settings from manifest values
8. **Verification** — kubectl commands for agents, MCP servers, model configs, flux status
9. **Troubleshooting** — 4 scenarios (agent timeout, MCP failure, flux stuck, git-agent PR failure)
10. **Related** — relative links to code-tools, external-secrets, grafana-config, architecture doc, ADR

All facts sourced from the manifests (namespaces, dependencies, runtime configs, token thresholds, tool names, tier labels, safety rules).
