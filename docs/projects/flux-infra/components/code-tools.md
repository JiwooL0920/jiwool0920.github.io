I detect **implementation** intent - explicit "Write the documentation" request with complete context provided in the prompt file. All manifest data is available, no exploration needed.

Let me check the existing docs structure to place the file correctly.
Component docs go in `docs/components/`. The prompt specifies slug `code-tools`. I have all the manifest data needed — writing directly.
Done. Written to `docs/components/code-tools.md`.

Key decisions:
- **Layer 6 (AI Tools)** — it's a tool server consumed by kagent, above app-level services
- **No `dependsOn`** in the Flux Kustomization, so Dependencies = None (Ollama is external/native)
- **Architecture diagram** shows the init→container→PVC flow and the external Ollama + kagent consumer relationships
- **Connection section** shows both the kagent RemoteMCPServer CRD config and a curl-based debug path
- **Troubleshooting** covers the three most likely failure modes: slow init, Ollama unreachable, server crash
