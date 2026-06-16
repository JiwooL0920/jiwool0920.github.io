# Agent Architectures

Design patterns for AI agents and multi-agent systems.

## Single Agent Architecture

```mermaid
graph TB
    USER[User] -->|Query| AGENT[Agent]
    AGENT -->|Retrieve| RAG[RAG Pipeline]
    AGENT -->|Execute| TOOLS[Tools]
    AGENT -->|Generate| LLM[LLM]
    AGENT -->|Response| USER
```

## Multi-Agent Patterns

### Pattern: Orchestrator

Central coordinator managing specialized agents.

```mermaid
graph TB
    ORCH[Orchestrator] -->|Delegate| A1[Research Agent]
    ORCH -->|Delegate| A2[Code Agent]
    ORCH -->|Delegate| A3[Review Agent]
    A1 -->|Result| ORCH
    A2 -->|Result| ORCH
    A3 -->|Result| ORCH
```

### Pattern: Pipeline

Sequential processing through specialized agents.

```mermaid
graph LR
    A1[Parse] -->|Output| A2[Process]
    A2 -->|Output| A3[Validate]
    A3 -->|Output| A4[Format]
```

### Pattern: Debate

Multiple agents propose and critique solutions.

## RAG Architecture

```mermaid
graph TB
    Q[Query] -->|Embed| EMB[Embeddings]
    EMB -->|Search| VS[Vector Store]
    VS -->|Context| LLM[LLM]
    LLM -->|Response| R[Response]
```

### Chunking Strategies

| Strategy | Use Case | Chunk Size |
|----------|----------|------------|
| Fixed | Simple docs | 512 tokens |
| Semantic | Technical docs | Variable |
| Hierarchical | Long documents | Parent/child |

## Tool Design

!!! tip "Tool Best Practices"
    - Clear, specific descriptions
    - Minimal required parameters
    - Idempotent when possible
    - Graceful error handling

```python
@tool
def search_database(query: str, limit: int = 10) -> list[dict]:
    """Search the database for records matching query.
    
    Args:
        query: Natural language search query
        limit: Maximum results to return (default: 10)
    
    Returns:
        List of matching records with id, title, and score
    """
    ...
```

## Anti-Patterns

!!! danger "Avoid These"
    - Agents with unclear responsibilities
    - Missing guardrails/validation
    - No fallback for tool failures
    - Unbounded agent loops
