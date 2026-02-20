# Architecture

## High-Level Overview

The Agentic AI platform follows a layered architecture with a supervisor orchestration pattern. User requests flow through a Next.js frontend to a FastAPI backend, where a supervisor agent intelligently routes to specialist agents powered by local Ollama inference.

```mermaid
flowchart TB
    subgraph "Presentation Layer"
        UI[Next.js 14 UI<br/>shadcn/ui + Tailwind]
    end

    subgraph "API Layer"
        API[FastAPI<br/>Streaming SSE]
    end

    subgraph "Orchestration Layer"
        SUP[Supervisor Agent<br/>Request Classification]
        K8S[Kubernetes Agent]
        TF[Terraform Agent]
        AWS[AWS Agent]
        PY[Python Agent]
        FE[Frontend Agent]
        ARCH[Architect Agent]
    end

    subgraph "Intelligence Layer"
        OLLAMA[Ollama<br/>qwen2.5:32b]
        RAG[RAG Pipeline<br/>nomic-embed-text]
    end

    subgraph "Storage Layer"
        DDB[(DynamoDB<br/>Sessions & History)]
        S3[(S3<br/>Documents & Knowledge)]
        PGV[(pgvector<br/>Embeddings)]
        REDIS[(Redis<br/>Cache)]
    end

    UI -->|HTTP/SSE Stream| API
    API -->|Route Request| SUP
    SUP -->|Delegate| K8S & TF & AWS & PY & FE & ARCH
    K8S & TF & AWS & PY & FE & ARCH -->|Inference| OLLAMA
    K8S & TF & AWS & PY & FE & ARCH -->|Context| RAG
    RAG -->|Embeddings| PGV
    API -->|Session State| DDB
    RAG -->|Document Retrieval| S3
    API -->|Response Cache| REDIS
```

## Supervisor Orchestration

The platform uses agent-squad's **supervisor pattern** rather than a sequential chain. The supervisor agent analyzes each incoming request and routes it to the most appropriate specialist.

```mermaid
sequenceDiagram
    participant U as User
    participant API as FastAPI
    participant S as Supervisor
    participant A as Specialist Agent
    participant O as Ollama
    participant R as RAG Pipeline

    U->>API: Send message
    API->>API: Load session history (DynamoDB)
    API->>S: Route request
    S->>O: Classify intent
    O-->>S: Best agent: "kubernetes"
    S->>A: Delegate to Kubernetes Agent
    A->>R: Retrieve relevant context
    R->>R: Embed query (nomic-embed-text)
    R-->>A: Top-k documents
    A->>O: Generate response (with context)
    O-->>A: Streaming tokens
    A-->>API: Stream response
    API-->>U: SSE stream
    API->>API: Persist to DynamoDB
```

### Routing Strategy

| Routing Mode | Description |
|--------------|-------------|
| **Supervisor** | LLM-based classification — supervisor analyzes request and selects best agent |
| **Direct** | Explicit agent selection — user or API specifies which agent to use |

The supervisor agent uses the descriptions and capabilities defined in each agent's YAML configuration to make routing decisions.

## Module-Blueprint Pattern

The infrastructure follows a two-tier composition pattern that separates reusable modules from domain-specific deployments.

```mermaid
flowchart TB
    subgraph "Terraform Modules (Reusable)"
        DDB_MOD[dynamodb module<br/>Tables, indexes, capacity]
        S3_MOD[s3 module<br/>Buckets, policies, lifecycle]
        PGV_MOD[pgvector module<br/>PostgreSQL + extension]
        OBS_MOD[observability module<br/>Metrics, traces, dashboards]
    end

    subgraph "Blueprints (Domain-Specific)"
        subgraph "DevAssist Blueprint"
            DA_TF[terraform/<br/>Compose modules]
            DA_AGENTS[agents/<br/>7 YAML definitions]
            DA_KB[knowledge/<br/>RAG documents]
            DA_CFG[config.yaml<br/>Blueprint config]
        end

        subgraph "Future Blueprint"
            FB[Custom composition<br/>of same modules]
        end
    end

    DA_TF -->|Uses| DDB_MOD & S3_MOD & PGV_MOD & OBS_MOD
    FB -.->|Reuses| DDB_MOD & S3_MOD & PGV_MOD & OBS_MOD
```

### Blueprint Configuration

Each blueprint is defined by a `config.yaml` that specifies:

| Field | Description |
|-------|-------------|
| `name` | Blueprint identifier (e.g., `devassist`) |
| `description` | Human-readable purpose |
| `supervisor_mode` | Orchestration strategy (`supervisor`) |
| `agents` | List of agent YAML files to load |
| `knowledge_base` | RAG document paths |
| `storage` | Backend configuration (DynamoDB tables, S3 buckets) |

### Agent YAML Definition

Agents are defined declaratively with personality, capabilities, and tool access:

```yaml
# blueprints/devassist/agents/kubernetes.yaml
name: kubernetes
description: "Kubernetes specialist for manifests, debugging, and cluster operations"
model: qwen2.5:32b
system_prompt: |
  You are a Kubernetes expert...
tools:
  - kubectl_explain
  - manifest_generator
capabilities:
  - kubernetes_manifests
  - cluster_debugging
  - helm_charts
```

## Storage Architecture

```mermaid
flowchart LR
    subgraph "Application"
        CORE[Core Backend]
    end

    subgraph "Session Storage"
        DDB[(ScyllaDB Alternator<br/>DynamoDB-compatible)]
    end

    subgraph "Document Storage"
        S3_LS[(LocalStack S3)]
    end

    subgraph "Vector Storage"
        PGV[(PostgreSQL<br/>+ pgvector extension)]
    end

    subgraph "Cache"
        REDIS[(Redis)]
    end

    CORE -->|Sessions, Chat History| DDB
    CORE -->|Knowledge Base, Uploads| S3_LS
    CORE -->|Embeddings, Similarity Search| PGV
    CORE -->|Response Cache, Rate Limits| REDIS
```

| Store | Technology | Purpose | Data |
|-------|-----------|---------|------|
| **Sessions** | ScyllaDB Alternator (DynamoDB API) | Conversation persistence | Chat history, session metadata |
| **Documents** | LocalStack S3 | Knowledge base storage | RAG source documents, uploads |
| **Embeddings** | PostgreSQL + pgvector | Vector similarity search | Document embeddings, search index |
| **Cache** | Redis | Performance optimization | Response cache, rate limiting |

## Development Modes

The platform supports two development workflows:

### Local Development

```mermaid
flowchart LR
    subgraph "Local Machine"
        UV[Uvicorn<br/>FastAPI Backend]
        NEXT[Next.js Dev<br/>Frontend]
        OLL[Ollama<br/>LLM Server]
    end

    subgraph "K8s Cluster (port-forward)"
        PG[PostgreSQL + pgvector]
        SCYLLA[ScyllaDB]
        RED[Redis]
        LS[LocalStack S3]
    end

    UV -->|Port Forward| PG & SCYLLA & RED & LS
    NEXT -->|API Calls| UV
    UV -->|Inference| OLL
```

| Aspect | Detail |
|--------|--------|
| **Backend** | `uvicorn` with auto-reload |
| **Frontend** | `next dev` with fast refresh |
| **LLM** | Ollama running natively |
| **Databases** | Port-forwarded from fleet-infra cluster |
| **Command** | `make dev-local` |

### Kubernetes Development (Skaffold)

```mermaid
flowchart LR
    subgraph "Skaffold"
        SK[Skaffold<br/>File Sync + Hot Reload]
    end

    subgraph "K8s Cluster"
        BE_POD[Backend Pod<br/>FastAPI]
        FE_POD[Frontend Pod<br/>Next.js]
        OLL_POD[Ollama Pod]
        DB_PODS[Database Pods]
    end

    SK -->|Build & Deploy| BE_POD & FE_POD
    SK -->|File Sync| BE_POD & FE_POD
    BE_POD -->|In-Cluster| OLL_POD & DB_PODS
```

| Aspect | Detail |
|--------|--------|
| **Orchestration** | Skaffold with two configs: `backend-only` and `full` |
| **Hot Reload** | File sync maps local changes into running pods |
| **Networking** | In-cluster service discovery (no port-forwarding needed) |
| **Command** | `make dev-k8s` or `skaffold dev -p backend-only` |

## Integration with Fleet Infrastructure

The agentic-ai platform runs on the Kubernetes cluster provisioned by [terraform-infra](../terraform-infra/index.md) and managed by [fleet-infra](../fleet-infra/index.md).

```mermaid
flowchart TB
    subgraph "terraform-infra"
        TF[OpenTofu/Terraform]
    end

    subgraph "fleet-infra (GitOps)"
        FLUX[Flux CD]
        PROM[kube-prometheus-stack]
        PG[PostgreSQL Cluster]
        REDIS[Redis Sentinel]
        SCYLLA[ScyllaDB]
        LS[LocalStack]
        TRAEFIK[Traefik Ingress]
    end

    subgraph "agentic-ai"
        CORE[Core Backend]
        UIFE[Next.js Frontend]
        OLLAMA[Ollama]
    end

    TF -->|Provisions Cluster| FLUX
    FLUX -->|Manages| PROM & PG & REDIS & SCYLLA & LS & TRAEFIK
    CORE -->|Metrics| PROM
    CORE -->|Database| PG & SCYLLA
    CORE -->|Cache| REDIS
    CORE -->|Object Store| LS
    TRAEFIK -->|Ingress| UIFE
```

## Design Decisions

!!! success "agent-squad over LangChain/LangGraph"
    The agent-squad framework (AWS Labs) was chosen for its lightweight supervisor pattern and native multi-agent support. Unlike LangChain's chain-based approach, agent-squad provides:
    
    - **Built-in supervisor routing** without custom graph definitions
    - **YAML-driven agent configuration** for rapid iteration
    - **Minimal abstraction overhead** compared to LangGraph's state machines

!!! info "Ollama for Local-First Inference"
    All LLM inference runs locally via Ollama, eliminating cloud API costs and latency:
    
    - **Zero API costs** — no OpenAI/Anthropic billing
    - **Full data privacy** — no data leaves the local network
    - **Offline capable** — works without internet connectivity
    - **Model flexibility** — swap models by changing one config line

!!! tip "Supervisor Pattern vs Direct Routing"
    The supervisor agent dynamically classifies requests using the LLM itself, rather than keyword matching or static rules:
    
    - **Adaptive routing** — learns from agent descriptions in YAML
    - **Graceful degradation** — falls back to general-purpose agent
    - **No maintenance** — adding a new agent YAML automatically updates routing

!!! note "Dual Development Modes"
    Supporting both local (uvicorn) and Kubernetes (Skaffold) development accommodates different workflows:
    
    - **Local mode** — fastest iteration, minimal resource usage, ideal for backend changes
    - **K8s mode** — production-like environment, tests service mesh, ideal for integration testing
