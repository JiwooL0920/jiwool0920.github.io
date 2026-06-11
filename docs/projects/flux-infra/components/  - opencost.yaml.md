I detect **implementation** intent — write a documentation page for OpenCost based on the manifests. My approach: find manifests + exemplar → write the page.
Good — found all key files. Let me read the manifests, existing page, and an exemplar in parallel.
I have full context. The existing `docs/components/opencost.md` is well-structured but missing the `get_efficiency` MCP tool documented in `apps/base/kagent/mcpservers/opencost-mcp.yaml`. Let me refresh the page with that correction and minor improvements.
Done. Refreshed `docs/components/opencost.md` with corrections from manifests.

**Changes from the existing page:**

| Section | Before | After |
|---------|--------|-------|
| Chart version | Not shown | `v${OPENCOST_CHART_VERSION}` in overview |
| Purpose | "security-agent, finops-agent" | "finops-agent" (matches kagent manifest) |
| Features | Listed only 2 MCP tools | Mentions all 3 tools generically |
| Architecture | Generic "AI Agents" with security+finops | `kagent namespace` with `finops-agent` + STREAMABLE_HTTP protocol |
| MCP Tools | Missing `get_efficiency` | Added `get_efficiency` — CPU/memory efficiency ratios and right-sizing recommendations |
| MCP details | No protocol info | Added STREAMABLE_HTTP, 15s timeout, 2m SSE read timeout |
| Env Config | No chart version row, no sourcing note | Added chart version row + `cluster-vars` sourcing note |
| Related | 2 links | Added [Kagent](kagent.md) link |
