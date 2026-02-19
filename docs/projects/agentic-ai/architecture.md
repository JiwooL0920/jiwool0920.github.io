# Architecture

## System Overview

```mermaid
graph TB
    subgraph "Client Layer"
        UI[Web UI] --> API[API Gateway]
    end
    
    subgraph "Agent Layer"
        API --> ORCH[Orchestrator]
        ORCH --> AGENT1[Agent 1]
        ORCH --> AGENT2[Agent 2]
        ORCH --> AGENT3[Agent N]
    end
    
    subgraph "Knowledge Layer"
        AGENT1 --> RAG[RAG Pipeline]
        RAG --> VS[Vector Store]
        RAG --> LLM[LLM Provider]
    end
    
    subgraph "Tool Layer"
        AGENT1 --> TOOLS[Tool Registry]
        TOOLS --> T1[Tool 1]
        TOOLS --> T2[Tool 2]
    end
```

## Key Components

### Orchestrator

Manages agent lifecycle and workflow coordination.

### RAG Pipeline

Retrieval-augmented generation for context-aware responses.

### Tool Registry

Extensible tool system for agent capabilities.

## Design Decisions

!!! note "Multi-Agent vs Single Agent"
    Multi-agent architecture chosen for separation of concerns and specialized capabilities.
