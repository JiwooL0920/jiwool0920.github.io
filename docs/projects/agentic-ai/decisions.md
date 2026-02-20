# Architecture Decision Records

Key architectural decisions made during the development of the Agentic AI platform.

## ADR Index

| ADR | Title | Status | Impact |
|-----|-------|--------|--------|
| [ADR-001](#adr-001-agent-squad-over-langchainlanggraph) | agent-squad over LangChain/LangGraph | Accepted | Core framework |
| [ADR-002](#adr-002-ollama-for-local-first-llm-inference) | Ollama for Local-First LLM Inference | Accepted | LLM runtime |
| [ADR-003](#adr-003-pnpm-monorepo-structure) | pnpm Monorepo Structure | Accepted | Project organization |
| [ADR-004](#adr-004-supervisor-routing-pattern) | Supervisor Routing Pattern | Accepted | Agent orchestration |
| [ADR-005](#adr-005-yaml-driven-agent-configuration) | YAML-Driven Agent Configuration | Accepted | Agent management |
| [ADR-006](#adr-006-pgvector-for-embeddings) | pgvector for Embeddings | Accepted | Vector storage |
| [ADR-007](#adr-007-scylladb-alternator-for-dynamodb-compatible-storage) | ScyllaDB Alternator for DynamoDB-Compatible Storage | Accepted | Session storage |
| [ADR-008](#adr-008-skaffold-for-kubernetes-development) | Skaffold for Kubernetes Development | Accepted | Dev workflow |
| [ADR-009](#adr-009-module-blueprint-pattern) | Module-Blueprint Pattern | Accepted | Infrastructure |

---

## ADR-001: agent-squad over LangChain/LangGraph

!!! success "Accepted"

### Context

The platform requires a multi-agent orchestration framework that supports supervisor-based routing, YAML-driven agent definitions, and lightweight integration with local LLMs. The primary contenders were:

- **LangChain/LangGraph** — the most popular AI framework ecosystem
- **agent-squad** (AWS Labs) — a lightweight multi-agent orchestration library
- **CrewAI** — role-based agent framework

### Decision

Use **agent-squad** (AWS Labs) as the core orchestration framework.

### Consequences

| Positive | Negative |
|----------|----------|
| Native supervisor routing pattern — no custom graph building | Smaller community and ecosystem than LangChain |
| Lightweight — minimal abstraction layers | Fewer pre-built tools and integrations |
| Easy YAML-to-agent mapping with agent factory pattern | Less documentation and tutorials available |
| AWS-maintained with production usage patterns | Tighter coupling to AWS service patterns |

---

## ADR-002: Ollama for Local-First LLM Inference

!!! success "Accepted"

### Context

The platform needs LLM inference capabilities. Options include cloud APIs (OpenAI, Anthropic) and local inference servers (Ollama, vLLM, llama.cpp).

### Decision

Use **Ollama** as the exclusive LLM inference runtime, running models locally.

### Consequences

| Positive | Negative |
|----------|----------|
| Zero API costs — no per-token billing | Requires significant local hardware (32GB+ RAM for qwen2.5:32b) |
| Full data privacy — no data leaves the network | Slower inference than cloud GPUs |
| Works offline without internet | Model quality may lag behind latest cloud offerings |
| Simple model management (`ollama pull`) | Limited to models available in Ollama's registry |
| Easy model switching via config change | No multi-GPU scaling without additional setup |

---

## ADR-003: pnpm Monorepo Structure

!!! success "Accepted"

### Context

The project contains a Python backend (`core`) and a TypeScript frontend (`ui`) that share deployment lifecycle. Options: separate repos, npm workspaces, pnpm workspaces, Turborepo.

### Decision

Use **pnpm workspaces** for monorepo management with packages under `packages/`.

### Consequences

| Positive | Negative |
|----------|----------|
| Single repo for unified versioning and CI/CD | pnpm is less common than npm (learning curve) |
| Shared configuration (ESLint, Prettier, Husky) | Python package (core) doesn't use pnpm — mixed tooling |
| Efficient disk usage via pnpm's content-addressed store | Workspace hoisting can cause subtle dependency issues |
| Simpler cross-package development workflow | Monorepo CI can be slower without proper caching |

---

## ADR-004: Supervisor Routing Pattern

!!! success "Accepted"

### Context

With multiple specialist agents, the system needs a strategy for routing user requests to the appropriate agent. Options: keyword matching, user-selected routing, LLM-based classification (supervisor pattern).

### Decision

Use a **supervisor agent** that leverages the LLM to dynamically classify and route requests to specialist agents.

### Consequences

| Positive | Negative |
|----------|----------|
| Adaptive — understands nuanced requests | Adds one extra LLM call per request (latency + compute) |
| No manual routing rules to maintain | Routing errors are possible (wrong agent selected) |
| Adding new agents automatically updates routing | Supervisor prompt engineering required |
| Graceful degradation to general agent | Debugging routing decisions is less transparent |

---

## ADR-005: YAML-Driven Agent Configuration

!!! success "Accepted"

### Context

Agent definitions (personality, model, tools, capabilities) need to be configurable without code changes. Options: Python classes, JSON config, YAML config, database-driven.

### Decision

Define agents as **YAML files** under `blueprints/<name>/agents/`, loaded by an agent factory at startup.

### Consequences

| Positive | Negative |
|----------|----------|
| Non-developers can modify agent behavior | YAML lacks type safety — runtime errors possible |
| Version-controlled agent configurations | Complex logic still requires code changes |
| Easy to add/remove/modify agents | No IDE autocompletion for custom YAML schema |
| Blueprint-scoped — different blueprints have different agents | Validation must be implemented separately |

---

## ADR-006: pgvector for Embeddings

!!! success "Accepted"

### Context

The RAG pipeline requires vector storage for document embeddings and similarity search. Options: Pinecone, Weaviate, ChromaDB, pgvector.

### Decision

Use **PostgreSQL with the pgvector extension** for vector storage, leveraging the existing PostgreSQL cluster from fleet-infra.

### Consequences

| Positive | Negative |
|----------|----------|
| Reuses existing PostgreSQL infrastructure (CNPG from fleet-infra) | Less optimized for vector-only workloads than dedicated vector DBs |
| No additional service to manage | Limited ANN index types compared to Pinecone/Weaviate |
| SQL-based queries — familiar interface | Scaling vector search independently is harder |
| Open-source, self-hosted | Missing some advanced features (hybrid search, metadata filtering) |

---

## ADR-007: ScyllaDB Alternator for DynamoDB-Compatible Storage

!!! success "Accepted"

### Context

The platform needs a key-value store for session management and chat history. The agent-squad framework uses DynamoDB patterns. Options: AWS DynamoDB, ScyllaDB Alternator, local DynamoDB, Redis.

### Decision

Use **ScyllaDB Alternator** (DynamoDB-compatible API) running in the fleet-infra cluster for session and history storage.

### Consequences

| Positive | Negative |
|----------|----------|
| DynamoDB API compatibility — works with AWS SDK | Not 100% DynamoDB feature parity |
| Self-hosted — no AWS dependency or costs | Additional operational complexity vs managed service |
| Already running in fleet-infra cluster | ScyllaDB has higher resource requirements than simple KV stores |
| Migration path to real DynamoDB if moving to cloud | Alternator-specific quirks may require workarounds |

---

## ADR-008: Skaffold for Kubernetes Development

!!! success "Accepted"

### Context

Developing against Kubernetes requires a workflow that bridges local code changes with in-cluster deployment. Options: Skaffold, Tilt, DevSpace, manual kubectl apply.

### Decision

Use **Skaffold** with file-sync for Kubernetes development, providing hot-reload of code changes into running pods.

### Consequences

| Positive | Negative |
|----------|----------|
| File sync enables hot-reload without image rebuilds | Skaffold configuration can be complex |
| Multiple profiles (backend-only, full) for different workflows | File sync has edge cases with certain file types |
| Google-maintained with active development | Adds tooling dependency beyond kubectl |
| Integrates with existing Kustomize manifests | Initial setup and debugging can be time-consuming |

---

## ADR-009: Module-Blueprint Pattern

!!! success "Accepted"

### Context

The platform needs infrastructure that is both reusable across different AI assistant configurations and customizable per deployment. Traditional Terraform module composition doesn't capture the domain-specific agent + infra relationship.

### Decision

Adopt a **Module-Blueprint pattern** where:

- `terraform/modules/` contains reusable, general-purpose infrastructure modules
- `blueprints/<name>/` composes those modules with agent definitions and knowledge bases

### Consequences

| Positive | Negative |
|----------|----------|
| Clear separation of reusable infra from domain config | Two-level indirection can be confusing initially |
| New blueprints reuse existing modules without duplication | Blueprint-specific Terraform overrides add complexity |
| Agent definitions live alongside their infrastructure | Pattern is non-standard — new contributors need onboarding |
| Self-contained deployable units | Testing blueprint compositions requires integration tests |
