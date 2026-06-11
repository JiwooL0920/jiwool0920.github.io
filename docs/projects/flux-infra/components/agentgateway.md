I detect **implementation** intent - explicit request to write documentation. Let me gather the full manifest context from the repo first.
I have full context now. Let me write the documentation page.
Done. The doc is at `/tmp/update-docs-cg83/agentgateway.md`.

Key decisions:
- **Layer 6 (Agent Infrastructure)** — it sits above the application layer since it orchestrates agent traffic between kagent, MCP servers, and LLM backends
- **Two-phase deployment** documented as a distinct section since it's a non-obvious operational detail
- **Guardrail policies** get their own section given they're a core security feature unique to this service
- **MCP endpoint table** provides the quick-reference IDE clients need
- Mermaid diagram shows the three-listener architecture and backend routing
