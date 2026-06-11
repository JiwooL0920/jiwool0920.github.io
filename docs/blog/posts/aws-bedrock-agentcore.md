---
date: 2026-02-20
categories:
  - AI
  - AWS
tags:
  - bedrock
  - agentcore
  - mcp
  - strands
  - terraform
  - containers
authors:
  - jiwoo
---

# AWS Bedrock AgentCore: Components, Architecture, and Implementation Guide

After working extensively with AWS Bedrock AgentCore to build containerized AI agents on a platform team, I want to break down its three core components — Runtime, Gateway, and Memory — how they work together, and practical patterns for deploying them with Terraform.

<!-- more -->

## Overview

AWS Bedrock AgentCore consists of three main components that work together to enable containerized, stateful AI agents:

| Component | Purpose | AWS Resource | Analogy |
|-----------|---------|--------------|---------|
| **Runtime** | Hosts your agent code in a container | `aws_bedrockagentcore_agent_runtime` | The "brain" — where your agent runs |
| **Gateway** | Exposes tools via MCP protocol | `aws_bedrockagentcore_gateway` | The "toolbox" — what your agent can do |
| **Memory** | Stores conversation history and facts | `aws_bedrockagentcore_memory` | The "memory" — what your agent remembers |

Unlike traditional AWS Bedrock Agents (which are fully managed services), AgentCore gives you:

- **Full control** over agent logic (you write the code)
- **Containerized deployment** (Docker-based)
- **Built-in memory** (short-term + long-term semantic storage)
- **Tool integration** via MCP protocol (not direct Lambda invocations)

---

## Component 1: Runtime

### What It Does

**Runtime** is a containerized execution environment for your agent. It runs your agent code (Strands SDK, LangGraph, custom Python, etc.) on AWS-managed serverless infrastructure.

Think of it as **"AWS Lambda for AI agents"** — but with:

- Persistent containers (not cold-start every time)
- ARM64 architecture (GPU-optimized)
- HTTP/MCP protocol support
- Built-in health checks

### Architecture

```
┌─────────────────────────────────────────────────────┐
│              AgentCore Runtime                       │
│                                                     │
│  ┌────────────────────────────────────────────┐     │
│  │  Your Docker Container (ARM64)             │     │
│  │                                            │     │
│  │  ┌──────────────────────────────────┐      │     │
│  │  │  FastAPI/Flask Server            │      │     │
│  │  │  Port: 8080                      │      │     │
│  │  │                                  │      │     │
│  │  │  Endpoints:                      │      │     │
│  │  │  - POST /invocations (required)  │      │     │
│  │  │  - GET  /ping (health check)     │      │     │
│  │  └──────────────────────────────────┘      │     │
│  │                                            │     │
│  │  ┌──────────────────────────────────┐      │     │
│  │  │  Your Agent Logic                │      │     │
│  │  │  (Strands / LangGraph / Custom)  │      │     │
│  │  └──────────────────────────────────┘      │     │
│  │                                            │     │
│  └────────────────────────────────────────────┘     │
│                                                     │
│  VPC Networking: ✅ ECR access, ✅ Bedrock API      │
│  IAM Role: Bedrock, Memory, CloudWatch, X-Ray       │
│  Protocol: HTTP, MCP, or A2A                        │
└─────────────────────────────────────────────────────┘
```

### Terraform Resource

```hcl
resource "aws_bedrockagentcore_agent_runtime" "agent" {
  agent_runtime_name    = "my_agent"           # Name (letters, digits, underscores; max 48)
  role_arn              = "arn:aws:iam::..."    # Execution role
  environment_variables = {                     # Environment variables
    AGENTCORE_MEMORY_ID   = "mem_abc123"
    AGENTCORE_GATEWAY_URL = "https://gateway..."
    AWS_REGION            = "us-east-1"
  }

  agent_runtime_artifact {
    container_configuration {
      container_uri = "123456789012.dkr.ecr.us-east-1.amazonaws.com/my-agent:latest"
    }
  }

  network_configuration {
    network_mode = "VPC"                       # VPC mode (required for ECR/Bedrock)
    network_mode_config {
      security_groups = ["sg-abc123"]
      subnets         = ["subnet-abc", "subnet-def"]
    }
  }

  protocol_configuration {
    server_protocol = "HTTP"                   # HTTP, MCP, or A2A
  }
}
```

### Key Characteristics

| Aspect | Details |
|--------|---------|
| **Container Architecture** | **ARM64 only** (`linux/arm64`) — x86_64 will fail |
| **Container Port** | Must expose port **8080** |
| **Required Endpoint** | `POST /invocations` — receives user prompts |
| **Health Check Endpoint** | `GET /ping` or `GET /health` (200 OK required) |
| **Networking** | VPC mode — needs NAT Gateway or VPC endpoints for ECR/Bedrock |
| **Protocol** | HTTP (most common), MCP (tool-first), A2A (agent-to-agent) |
| **Scaling** | Serverless — AWS manages scaling automatically |
| **Logs** | CloudWatch Logs: `/aws/bedrock-agentcore/runtimes/<runtime-id>-DEFAULT` |

### IAM Permissions Required

The Runtime execution role needs:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel",
        "bedrock:InvokeModelWithResponseStream"
      ],
      "Resource": "arn:aws:bedrock:*::foundation-model/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "bedrock-agentcore:CreateEvent",
        "bedrock-agentcore:ListEvents",
        "bedrock-agentcore:RetrieveMemoryRecords"
      ],
      "Resource": "arn:aws:bedrock-agentcore:*:*:memory/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "ecr:GetAuthorizationToken",
        "ecr:BatchGetImage",
        "ecr:GetDownloadUrlForLayer"
      ],
      "Resource": "*"
    }
  ]
}
```

### What Your Container Must Do

Your Docker image must:

1. **Start an HTTP server** on port 8080
2. **Implement `/invocations` endpoint**:
    - Accepts POST requests with JSON body: `{"prompt": "...", "session_id": "...", "actor_id": "..."}`
    - Returns JSON: `{"response": "...", "session_id": "..."}`
3. **Implement `/ping` or `/health` endpoint**:
    - Returns 200 OK status
4. **Be built for ARM64** architecture (critical!)

#### Example: Minimal FastAPI Server with Strands SDK

```python
from fastapi import FastAPI
from pydantic import BaseModel
from strands import Agent
from strands.models import BedrockModel

app = FastAPI()

# Initialize agent
model = BedrockModel(model_id="us.anthropic.claude-3-5-sonnet-20241022-v2:0")
agent = Agent(model=model, system_prompt="You are a helpful assistant.")

class InvokeRequest(BaseModel):
    prompt: str
    session_id: str = None
    actor_id: str = None

class InvokeResponse(BaseModel):
    response: str
    session_id: str = None

@app.get("/ping")
@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@app.post("/invocations")
async def invoke_agent(request: InvokeRequest):
    # Call your agent
    response = agent(request.prompt)

    return InvokeResponse(
        response=str(response),
        session_id=request.session_id
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)
```

#### Example: Dockerfile (ARM64)

```dockerfile
FROM --platform=linux/arm64 public.ecr.aws/docker/library/python:3.12-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy agent code
COPY src/ .

# Expose port
EXPOSE 8080

# Start server
CMD ["python", "server.py"]
```

**Build command**:

```bash
docker buildx build --platform linux/arm64 -t my-agent:latest --load .
```

### When to Use Runtime

✅ **Use Runtime when**:

- You need custom agent logic (Strands, LangGraph, custom frameworks)
- You want full control over conversation flow
- You need advanced memory patterns
- You want to integrate custom tools
- You need stateful agents with memory

❌ **Don't use Runtime when**:

- Simple Q&A with predefined tools (use Bedrock Agents instead)
- You need zero infrastructure management (use Bedrock Agents)
- You can't run Docker containers

---

## Component 2: Gateway

### What It Does

**Gateway** exposes tools (functions) to your agent via the **[MCP (Model Context Protocol)](https://modelcontextprotocol.io/)**. It acts as a **tool registry and router**, allowing your agent to:

- **Discover** available tools dynamically
- **Invoke** tools via standardized MCP requests
- **Search** for relevant tools semantically (optional)

Think of it as **"API Gateway for AI tools"** — but with:

- Automatic tool discovery (no hardcoding tool lists)
- Semantic search (LLM finds relevant tools based on query)
- AWS IAM authorization
- Lambda backend support

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  AgentCore Gateway (MCP)                     │
│                                                             │
│  ┌─────────────────────────────────────────────────┐        │
│  │  MCP Server                                     │        │
│  │  - Protocol: Model Context Protocol             │        │
│  │  - Authorization: AWS IAM                       │        │
│  │  - Search: SEMANTIC (optional)                  │        │
│  └─────────────────────────────────────────────────┘        │
│                        │                                    │
│                        ▼                                    │
│  ┌─────────────────────────────────────────────────┐        │
│  │  Gateway Targets (Tools)                        │        │
│  │                                                 │        │
│  │  ┌───────────────┐  ┌───────────────┐          │        │
│  │  │ Tool 1        │  │ Tool 2        │  ...     │        │
│  │  │ Name: search  │  │ Name: analyze │          │        │
│  │  │ Lambda ARN    │  │ Lambda ARN    │          │        │
│  │  │ MCP Schema    │  │ MCP Schema    │          │        │
│  │  └───────────────┘  └───────────────┘          │        │
│  └─────────────────────────────────────────────────┘        │
│                        │                                    │
│                        ▼                                    │
│              Invoke Lambda Functions                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Terraform Resources

#### Gateway Resource

```hcl
resource "aws_bedrockagentcore_gateway" "gateway" {
  name            = "my-tools-gateway"
  description     = "MCP Gateway for my agent's tools"
  role_arn        = "arn:aws:iam::..."      # Execution role

  protocol_type   = "MCP"                   # Model Context Protocol
  authorizer_type = "AWS_IAM"               # AWS IAM authorization
  exception_level = "DEBUG"                 # DEBUG or NONE (logs errors)

  protocol_configuration {
    mcp {
      search_type = "SEMANTIC"              # SEMANTIC or NONE
    }
  }
}
```

#### Gateway Target (Tool Definition)

```hcl
resource "aws_bedrockagentcore_gateway_target" "search_data" {
  gateway_identifier = aws_bedrockagentcore_gateway.gateway.id
  name               = "search_data"
  description        = "Search a data source for relevant records"

  # Lambda backend
  target_config {
    lambda {
      function_arn = aws_lambda_function.search_data.arn
    }
  }

  # MCP tool schema
  protocol_config {
    mcp {
      # Input schema (JSON Schema)
      input_schema = jsonencode({
        type = "object"
        properties = {
          query = {
            type        = "string"
            description = "Search query"
          }
          max_results = {
            type        = "integer"
            description = "Maximum number of results"
            default     = 10
          }
        }
        required = ["query"]
      })

      # Output schema (JSON Schema)
      output_schema = jsonencode({
        type = "object"
        properties = {
          results = {
            type = "array"
            items = {
              type = "object"
              properties = {
                id    = { type = "string" }
                title = { type = "string" }
                score = { type = "number" }
              }
            }
          }
        }
      })
    }
  }
}
```

### Key Characteristics

| Aspect | Details |
|--------|---------|
| **Protocol** | MCP (Model Context Protocol) — standardized AI tool interface |
| **Tool Discovery** | Dynamic — agent queries Gateway for available tools |
| **Tool Search** | SEMANTIC (LLM-based) or NONE (name-based) |
| **Authorization** | AWS_IAM — Gateway uses IAM to invoke Lambda functions |
| **Backend** | Lambda functions (other backends possible in future) |
| **Tool Schema** | JSON Schema for input/output validation |
| **Logs** | CloudWatch Logs: `/aws/bedrock-agentcore/gateways/<gateway-id>` |

### IAM Permissions Required

The Gateway execution role needs:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "lambda:InvokeFunction"
      ],
      "Resource": "arn:aws:lambda:*:*:function:*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:*"
    }
  ]
}
```

### How Your Agent Uses Gateway

Your agent code connects to Gateway via MCP:

```python
from strands import Agent
from strands.tools.mcp import MCPClient
from mcp_proxy_for_aws.client import aws_iam_streamablehttp_client

# Create MCP client with AWS IAM auth
mcp_client = MCPClient(
    lambda: aws_iam_streamablehttp_client(
        endpoint="https://gateway-abc123.mcp.us-east-1.amazonaws.com",
        aws_region="us-east-1",
        aws_service="bedrock-agentcore",
    )
)

# Create agent with MCP tools
agent = Agent(
    model=BedrockModel(...),
    tools=[mcp_client],  # Agent auto-discovers tools from Gateway
)

# Agent can now use tools dynamically
response = agent("Search for diabetes clinical trials")
```

**What happens under the hood**:

1. Agent sends query to LLM
2. LLM decides it needs a tool (e.g., `search_data`)
3. Agent queries Gateway for tool schema
4. Agent calls Gateway with tool name + arguments
5. Gateway invokes Lambda function
6. Lambda returns result to Gateway
7. Gateway returns result to agent
8. Agent continues reasoning with the result

### Semantic Search (Optional)

When `search_type = "SEMANTIC"`, the Gateway uses an LLM to:

- **Match user queries to tool descriptions**
- **Rank tools by relevance**
- **Suggest tools the agent might not explicitly request**

For example, a query like "Find information about drug side effects" would semantically match an `openfda_search` tool — even if the agent didn't name it explicitly.

!!! note
    Each semantic search costs 1 Bedrock API call. Use `NONE` for name-based matching if cost is a concern.

### When to Use Gateway

✅ **Use Gateway when**:

- You have multiple tools (2+ Lambda functions)
- Tools change frequently (dynamic discovery)
- You want semantic tool search
- You need standardized tool interface (MCP)
- You want to reuse tools across multiple agents

❌ **Don't use Gateway when**:

- Single tool only (direct Lambda invocation is simpler)
- Tools are hardcoded in agent (no discovery needed)
- You need non-Lambda backends (not supported yet)

---

## Component 3: Memory

### What It Does

**Memory** stores conversation history and extracted facts across sessions. It provides:

- **Short-term memory**: Recent conversation events (immediate)
- **Long-term memory**: Semantic facts extracted from conversations (5–10 min delay)

Think of it as **"DynamoDB + Vector DB for conversations"** — but with:

- Event-based storage (immutable conversation log)
- Semantic extraction (LLM-powered fact extraction)
- Actor-based isolation (per-user memory)
- Session-based organization (conversation threads)

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  AgentCore Memory                            │
│                                                             │
│  ┌─────────────────────────────────────────────────┐        │
│  │  Event Storage (Short-term Memory)              │        │
│  │                                                 │        │
│  │  SessionId: "conv-123"                          │        │
│  │  ActorId: "/agents/my_agent/users/user-456"     │        │
│  │                                                 │        │
│  │  Events:                                        │        │
│  │  - [14:00] User: "Find diabetes trials..."      │        │
│  │  - [14:01] Assistant: "I found 3 trials..."     │        │
│  │  - [14:02] User: "Tell me more about..."        │        │
│  │                                                 │        │
│  │  Expiry: 30 days (configurable 3–365 days)      │        │
│  └─────────────────────────────────────────────────┘        │
│                        │                                    │
│                        │ (5–10 min async)                   │
│                        ▼                                    │
│  ┌─────────────────────────────────────────────────┐        │
│  │  Semantic Extraction (Long-term Memory)         │        │
│  │                                                 │        │
│  │  Strategy: SEMANTIC                             │        │
│  │  Model: Bedrock (configured by AWS)             │        │
│  │                                                 │        │
│  │  Extracted Facts:                               │        │
│  │  - "User is researching Type 1 diabetes"        │        │
│  │  - "User prefers clinical trial data"           │        │
│  │  - "User is interested in pediatric studies"    │        │
│  │                                                 │        │
│  │  Namespace: /strategies/{strategyId}/actors/... │        │
│  └─────────────────────────────────────────────────┘        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Terraform Resources

#### Memory Resource

```hcl
resource "aws_bedrockagentcore_memory" "memory" {
  name        = "my_agent_memory"
  description = "Memory store for my agent"

  # Events expire after N days (minimum 3, max 365)
  event_expiry_duration = 30

  # IAM role for memory operations
  memory_execution_role_arn = "arn:aws:iam::..."
}
```

#### Memory Strategy Resource

```hcl
resource "aws_bedrockagentcore_memory_strategy" "semantic" {
  name        = "semantic_facts"
  memory_id   = aws_bedrockagentcore_memory.memory.id
  type        = "SEMANTIC"  # SEMANTIC or SUMMARY
  description = "Extracts key facts from conversations"

  # Namespace pattern for organizing extracted facts
  namespaces = [
    "/strategies/{memoryStrategyId}/actors/{actorId}/"
  ]
}
```

### Key Characteristics

| Aspect | Details |
|--------|---------|
| **Event Storage** | Immutable log of conversation turns (user + assistant) |
| **Event Expiry** | 3–365 days (configurable) |
| **Semantic Extraction** | LLM-powered fact extraction (5–10 min delay) |
| **Strategy Types** | SEMANTIC (facts) or SUMMARY (summaries) |
| **Actor-based Isolation** | Separate memory per user (`actorId`) |
| **Session Organization** | Group conversations by `sessionId` |
| **Namespace Pattern** | Hierarchical organization (e.g., `/agents/{agent}/users/{user}/`) |

### IAM Permissions Required

The Memory execution role needs:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel"
      ],
      "Resource": "arn:aws:bedrock:*::foundation-model/*",
      "Condition": {
        "StringEquals": {
          "aws:RequestedRegion": "us-east-1"
        }
      }
    },
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:*"
    }
  ]
}
```

### How Your Agent Uses Memory

Your agent code interacts with Memory via boto3:

```python
import boto3
from datetime import datetime, timezone

# Initialize memory client
memory_client = boto3.client("bedrock-agentcore", region_name="us-east-1")
memory_id = "mem_abc123"

# Save user message
memory_client.create_event(
    memoryId=memory_id,
    sessionId="conv-123",
    actorId="/agents/my_agent/users/user-456",
    eventTimestamp=datetime.now(timezone.utc).isoformat(),
    payload=[
        {
            "conversational": {
                "role": "USER",
                "content": {"text": "Find diabetes clinical trials"}
            }
        }
    ]
)

# Retrieve recent conversation history (short-term memory)
response = memory_client.list_events(
    memoryId=memory_id,
    sessionId="conv-123",
    actorId="/agents/my_agent/users/user-456",
    maxResults=10
)
events = response.get("events", [])

# Search long-term memory (semantic facts)
memory_response = memory_client.retrieve_memory_records(
    memoryId=memory_id,
    namespace="/strategies/",  # Prefix to search all strategies
    searchCriteria={"searchQuery": "diabetes research interests"},
    maxResults=5
)
facts = memory_response.get("memoryRecordSummaries", [])

# Build conversation context
context = ""
for event in events:
    role = event["payload"][0]["conversational"]["role"]
    text = event["payload"][0]["conversational"]["content"]["text"]
    context += f"{role}: {text}\n"

for fact in facts:
    context += f"Fact: {fact['content']['text']}\n"

# Use context in agent prompt
enhanced_prompt = f"""Context from previous conversations:
{context}

Current request: Find diabetes clinical trials
"""
```

### Memory Strategies

| Strategy | Type | Description | Use Case | Extraction Delay |
|----------|------|-------------|----------|------------------|
| **SEMANTIC** | `SEMANTIC` | Extracts key facts and user preferences | Long-term memory (user profile, interests) | 5–10 minutes |
| **SUMMARY** | `SUMMARY` | Creates conversation summaries | Session summaries (recap long conversations) | 5–10 minutes |

**Example extracted facts** (SEMANTIC):

- "User is researching Type 1 diabetes"
- "User prefers pediatric studies"
- "User works in clinical research"

**Example summary** (SUMMARY):

- "Conversation about diabetes clinical trials. User asked for pediatric studies and requested trial locations in California."

### Actor ID Pattern

The `actorId` identifies who the memory belongs to:

```python
# Pattern: /agents/{agent_name}/users/{user_id}
actor_id = f"/agents/my_agent/users/user-456"

# Alternative patterns:
actor_id = f"/teams/research_team/users/user-456"    # Team-based
actor_id = f"/organizations/acme_corp/users/user-456" # Org-based
```

**Why hierarchical?**

- Enables namespace-based queries (search all users in a team)
- Supports future access control patterns
- Matches AWS resource hierarchy conventions

### Memory Timeline

```
User sends message
     │
     ▼
[T+0s] create_event() saves user message
     │
     ▼
Agent processes and responds
     │
     ▼
[T+2s] create_event() saves assistant response
     │
     ▼
[Immediate] list_events() retrieves recent conversation
     │         ↓
     │    Short-term memory available ✅
     │
     ▼
[T+5-10 min] Semantic extraction processes events
     │              ↓
     │         LLM analyzes conversation
     │              ↓
     │         Facts extracted and stored
     │
     ▼
[T+10 min] retrieve_memory_records() searches facts
     │         ↓
     │    Long-term memory available ✅
```

### When to Use Memory

✅ **Use Memory when**:

- Multi-turn conversations (chatbots, assistants)
- User preferences should persist (personalization)
- Agent needs to recall past interactions
- Building a knowledge base from conversations
- Session continuity is important

❌ **Don't use Memory when**:

- Single-turn Q&A (no conversation history)
- Stateless operations (API-style requests)
- Privacy constraints prevent storing conversations
- You need immediate long-term memory (5–10 min delay is unacceptable)

---

## How Components Work Together

### Full Request Flow

Here's what happens end-to-end when a user sends a prompt to an AgentCore-powered agent:

```
┌──────────────────────────────────────────────────────────────────┐
│  1. User sends prompt                                            │
│     "Find diabetes clinical trials in California"                │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│  2. Runtime receives request                                     │
│     POST /invocations                                            │
│     {"prompt": "...", "session_id": "conv-123", ...}             │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│  3. Runtime loads conversation context from Memory               │
│     list_events(sessionId="conv-123")                            │
│     retrieve_memory_records(query="diabetes")                    │
│                                                                  │
│     Returns:                                                     │
│     - Recent messages: "User asked about pediatric studies..."   │
│     - Long-term facts: "User prefers CA-based trials"            │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│  4. Runtime builds enhanced prompt                               │
│     Context: [recent conversation + long-term facts]             │
│     Request: "Find diabetes clinical trials in California"       │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│  5. Agent processes prompt with LLM                              │
│     LLM decides: "I need the search_data tool"                   │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│  6. Agent queries Gateway for tool                               │
│     MCP Request: tools/list                                      │
│     Gateway returns: search_data tool schema                     │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│  7. Agent calls Gateway to invoke tool                           │
│     MCP Request: tools/call                                      │
│     Tool: search_data                                            │
│     Args: {query: "diabetes", location: "California"}            │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│  8. Gateway invokes Lambda function                              │
│     Lambda: search_data_handler(query, location)                 │
│     Returns: [list of results]                                   │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│  9. Gateway returns result to Agent                              │
│     Result: {results: [...]}                                     │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│ 10. Agent generates final response                               │
│     LLM synthesizes answer with tool results                     │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│ 11. Runtime saves conversation to Memory                         │
│     create_event(role=USER, content="Find...")                   │
│     create_event(role=ASSISTANT, content="I found...")           │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│ 12. Runtime returns response to user                             │
│     {"response": "I found 3 trials in California...", ...}       │
└──────────────────────────────────────────────────────────────────┘
```

### Component Dependencies

```
Runtime
  │
  ├── Depends on → Memory (optional, for conversation history)
  │                 - Reads: list_events, retrieve_memory_records
  │                 - Writes: create_event
  │
  ├── Depends on → Gateway (optional, for tools)
  │                 - MCP protocol: tools/list, tools/call
  │
  └── Depends on → Bedrock (required, for LLM)
                    - InvokeModel, InvokeModelWithResponseStream

Gateway
  │
  ├── Depends on → Lambda (required, for tool backends)
  │                 - InvokeFunction
  │
  └── Depends on → Bedrock (optional, for semantic search)
                    - InvokeModel (if search_type=SEMANTIC)

Memory
  │
  └── Depends on → Bedrock (required, for semantic extraction)
                    - InvokeModel (for SEMANTIC/SUMMARY strategies)
```

---

## Component Lifecycle

### Deployment Order

```bash
# 1. Deploy Memory (no dependencies)
terraform apply -target=module.agentcore_memory

# 2. Deploy Gateway + Lambda tools (no dependencies)
terraform apply -target=module.agentcore_gateway
terraform apply -target=aws_bedrockagentcore_gateway_target.search_data

# 3. Build and push Docker image
docker buildx build --platform linux/arm64 -t my-agent:latest --load .
aws ecr get-login-password | docker login --username AWS --password-stdin <ecr-repo>
docker tag my-agent:latest <ecr-repo>/my-agent:latest
docker push <ecr-repo>/my-agent:latest

# 4. Deploy Runtime (depends on Memory, Gateway, ECR image)
terraform apply -target=module.agentcore_runtime
```

### Update Workflow

```bash
# Update agent code
vim src/agent/server.py

# Rebuild and push image
make docker-build docker-push

# Runtime will use new image on next cold start
# To force update:
terraform apply
```

### Cold Start Behavior

| Component | Cold Start Time | Frequency | Mitigation |
|-----------|-----------------|-----------|------------|
| **Runtime** | 30–60s (pulls Docker image) | After ~15 min idle | Keep-alive requests, or accept cold starts |
| **Gateway** | <1s | Rare (serverless) | None needed |
| **Memory** | <1s | Never (always available) | None needed |

---

## Configuration Examples

### Minimal Setup (No Memory, No Tools)

```hcl
# Just a Runtime with LLM
module "agentcore_runtime" {
  source = "../../modules/agentcore/runtime"

  agent_runtime_name = "simple_agent"
  image_uri          = "123456789012.dkr.ecr.us-east-1.amazonaws.com/simple-agent:latest"
  role_arn           = module.runtime_role.role_arn

  tags = local.standard_tags
}
```

**Use case**: Single-turn Q&A, no tools, no memory.

---

### Runtime + Memory (Stateful Agent, No Tools)

```hcl
# Memory
module "agentcore_memory" {
  source = "../../modules/agentcore/memory"

  name     = "my_memory"
  role_arn = module.memory_role.role_arn

  strategies = [
    {
      name        = "semantic"
      type        = "SEMANTIC"
      description = "Extract user preferences"
      namespaces  = ["/strategies/{memoryStrategyId}/actors/{actorId}/"]
    }
  ]

  tags = local.standard_tags
}

# Runtime
module "agentcore_runtime" {
  source = "../../modules/agentcore/runtime"

  agent_runtime_name = "stateful_agent"
  image_uri          = "123456789012.dkr.ecr.us-east-1.amazonaws.com/stateful-agent:latest"
  role_arn           = module.runtime_role.role_arn

  agent_runtime_env_variables = {
    AGENTCORE_MEMORY_ID = module.agentcore_memory.memory_id
  }

  tags = local.standard_tags
}
```

**Use case**: Chatbot with conversation history, no tools.

---

### Runtime + Gateway (Tool-enabled Agent, No Memory)

```hcl
# Gateway
module "agentcore_gateway" {
  source = "../../modules/agentcore/gateway"

  name        = "my_gateway"
  description = "Tools for my agent"
  role_arn    = module.gateway_role.role_arn

  tags = local.standard_tags
}

# Tool: search_web
resource "aws_bedrockagentcore_gateway_target" "search_web" {
  gateway_identifier = module.agentcore_gateway.gateway_id
  name               = "search_web"
  description        = "Search the web for information"

  target_config {
    lambda {
      function_arn = aws_lambda_function.search_web.arn
    }
  }

  protocol_config {
    mcp {
      input_schema = jsonencode({
        type = "object"
        properties = {
          query = { type = "string", description = "Search query" }
        }
        required = ["query"]
      })
      output_schema = jsonencode({
        type = "object"
        properties = {
          results = { type = "array" }
        }
      })
    }
  }
}

# Runtime
module "agentcore_runtime" {
  source = "../../modules/agentcore/runtime"

  agent_runtime_name = "tool_agent"
  image_uri          = "123456789012.dkr.ecr.us-east-1.amazonaws.com/tool-agent:latest"
  role_arn           = module.runtime_role.role_arn

  agent_runtime_env_variables = {
    AGENTCORE_GATEWAY_URL = module.agentcore_gateway.gateway_url
  }

  tags = local.standard_tags
}
```

**Use case**: Stateless agent with web search, no memory.

---

### Full Stack (Runtime + Gateway + Memory)

```hcl
# Memory
module "agentcore_memory" {
  source = "../../modules/agentcore/memory"

  name     = "agent_memory"
  role_arn = module.memory_role.role_arn

  strategies = [
    {
      name        = "semantic"
      type        = "SEMANTIC"
      description = "Extract research interests"
      namespaces  = ["/strategies/{memoryStrategyId}/actors/{actorId}/"]
    }
  ]

  tags = local.standard_tags
}

# Gateway
module "agentcore_gateway" {
  source = "../../modules/agentcore/gateway"

  name        = "agent_tools"
  description = "Research tools"
  role_arn    = module.gateway_role.role_arn

  tags = local.standard_tags
}

# Tool: search_data
resource "aws_bedrockagentcore_gateway_target" "search_data" {
  gateway_identifier = module.agentcore_gateway.gateway_id
  name               = "search_data"
  description        = "Search data sources for relevant records"

  target_config {
    lambda {
      function_arn = aws_lambda_function.search_data.arn
    }
  }

  protocol_config {
    mcp {
      input_schema = jsonencode({
        type = "object"
        properties = {
          query = { type = "string", description = "Search query" }
        }
        required = ["query"]
      })
      output_schema = jsonencode({
        type = "object"
        properties = {
          results = { type = "array" }
        }
      })
    }
  }
}

# Runtime
module "agentcore_runtime" {
  source = "../../modules/agentcore/runtime"

  agent_runtime_name = "research_analyst"
  image_uri          = "123456789012.dkr.ecr.us-east-1.amazonaws.com/research-analyst:latest"
  role_arn           = module.runtime_role.role_arn

  agent_runtime_env_variables = {
    AGENTCORE_MEMORY_ID   = module.agentcore_memory.memory_id
    AGENTCORE_GATEWAY_URL = module.agentcore_gateway.gateway_url
  }

  tags = local.standard_tags
}
```

**Use case**: Full-featured agent with tools + memory.

---

## Common Patterns

### Pattern 1: Multi-Agent with Shared Gateway

```hcl
# Shared Gateway
module "shared_gateway" {
  source = "../../modules/agentcore/gateway"
  name   = "shared_tools"
  # ... 10 tools registered
}

# Agent 1: Research Analyst
module "research_runtime" {
  source = "../../modules/agentcore/runtime"
  agent_runtime_name = "research_analyst"
  agent_runtime_env_variables = {
    AGENTCORE_GATEWAY_URL = module.shared_gateway.gateway_url
  }
}

# Agent 2: Financial Analyst
module "financial_runtime" {
  source = "../../modules/agentcore/runtime"
  agent_runtime_name = "financial_analyst"
  agent_runtime_env_variables = {
    AGENTCORE_GATEWAY_URL = module.shared_gateway.gateway_url  # Same Gateway!
  }
}
```

**Benefits**:

- Reuse tools across agents
- Single Gateway to manage
- Lower cost (1 Gateway vs 2)

**Considerations**:

- All agents see all tools (use Gateway interceptors for filtering)
- Gateway becomes single point of failure

---

### Pattern 2: Per-Agent Memory Isolation

```hcl
# Agent 1 Memory
module "research_memory" {
  source = "../../modules/agentcore/memory"
  name   = "research_memory"
}

# Agent 2 Memory
module "financial_memory" {
  source = "../../modules/agentcore/memory"
  name   = "financial_memory"
}

# Agent 1 Runtime
module "research_runtime" {
  source = "../../modules/agentcore/runtime"
  agent_runtime_env_variables = {
    AGENTCORE_MEMORY_ID = module.research_memory.memory_id
  }
}

# Agent 2 Runtime
module "financial_runtime" {
  source = "../../modules/agentcore/runtime"
  agent_runtime_env_variables = {
    AGENTCORE_MEMORY_ID = module.financial_memory.memory_id
  }
}
```

**Benefits**:

- Complete memory isolation
- Independent scaling
- Easier compliance (separate data stores)

**Considerations**:

- Cannot share memory between agents
- Higher cost (2 Memory instances)

---

### Pattern 3: Shared Memory with Actor Namespacing

```hcl
# Shared Memory
module "shared_memory" {
  source = "../../modules/agentcore/memory"
  name   = "org_memory"
}

# Both agents use same Memory ID, different actorId prefixes
module "research_runtime" {
  source = "../../modules/agentcore/runtime"
  agent_runtime_env_variables = {
    AGENTCORE_MEMORY_ID = module.shared_memory.memory_id
    AGENT_NAME          = "research_analyst"  # Used to build actorId
  }
}

module "financial_runtime" {
  source = "../../modules/agentcore/runtime"
  agent_runtime_env_variables = {
    AGENTCORE_MEMORY_ID = module.shared_memory.memory_id
    AGENT_NAME          = "financial_analyst"  # Different prefix
  }
}
```

**Agent code**:

```python
agent_name = os.environ["AGENT_NAME"]
actor_id = f"/agents/{agent_name}/users/{user_id}"  # Isolates by agent name
```

**Benefits**:

- Share Memory infrastructure (lower cost)
- Logical isolation via actorId
- Could enable cross-agent memory queries (advanced)

**Considerations**:

- Must enforce actorId conventions in code
- Risk of actorId collision (namespace carefully)

---

## Troubleshooting

### Runtime Issues

| Symptom | Cause | Solution |
|---------|-------|----------|
| **502 errors** | Container crash, wrong architecture, or health check failing | 1. Check CloudWatch logs 2. Verify ARM64 architecture: `docker inspect <image> --format='{{.Architecture}}'` 3. Test locally: `docker run -p 8080:8080 <image>` 4. Verify `/ping` returns 200 OK |
| **Empty CloudWatch logs** | Container never started | 1. Check VPC has NAT Gateway (for ECR access) 2. Verify IAM role has ECR permissions 3. Check ECR image exists: `aws ecr describe-images` |
| **Slow cold starts (60s+)** | Large Docker image | 1. Reduce image size (multi-stage builds) 2. Remove unnecessary dependencies 3. Accept cold starts (or implement keep-alive) |

**Debug commands**:

```bash
# View Runtime logs
aws logs tail "/aws/bedrock-agentcore/runtimes/<runtime-id>-DEFAULT" --since 30m --follow

# Check Runtime status
aws bedrock-agentcore get-agent-runtime --agent-runtime-id <runtime-id>

# Test locally
docker run -p 8080:8080 -e AWS_REGION=us-east-1 <image>
curl http://localhost:8080/ping
curl -X POST http://localhost:8080/invocations -d '{"prompt":"hello"}'
```

---

### Gateway Issues

| Symptom | Cause | Solution |
|---------|-------|----------|
| **Tools not discovered** | MCP connection failed | 1. Check Gateway URL is correct 2. Verify IAM permissions for Gateway invocation 3. Check CloudWatch logs for Gateway |
| **Lambda invocation fails** | Missing IAM permissions | 1. Gateway role needs `lambda:InvokeFunction` 2. Lambda resource policy allows Gateway principal |
| **Tool schema errors** | Invalid JSON Schema | 1. Validate JSON Schema syntax 2. Check required fields match Lambda expectations |

**Debug commands**:

```bash
# View Gateway logs
aws logs tail "/aws/bedrock-agentcore/gateways/<gateway-id>" --since 30m --follow

# Test Lambda directly
aws lambda invoke --function-name <function> --payload '{"query":"test"}' output.json

# Verify Gateway targets
aws bedrock-agentcore list-gateway-targets --gateway-identifier <gateway-id>
```

---

### Memory Issues

| Symptom | Cause | Solution |
|---------|-------|----------|
| **No events returned** | Wrong sessionId/actorId | 1. Verify sessionId matches create_event calls 2. Verify actorId matches create_event calls 3. Check events haven't expired |
| **No semantic facts** | Extraction not complete yet | 1. Wait 10–15 minutes after create_event 2. Check Memory logs for extraction errors 3. Verify Memory role has Bedrock permissions |
| **"memoryRecordSummaries" key error** | Wrong API response key | 1. Use `response.get("memoryRecordSummaries")` not `response.get("records")` 2. Update boto3: `pip install --upgrade boto3` |

**Debug commands**:

```bash
# View Memory logs
aws logs tail "/aws/bedrock-agentcore/memories/<memory-id>" --since 30m --follow

# List events (short-term memory)
aws bedrock-agentcore list-events \
  --memory-id <memory-id> \
  --session-id <session-id> \
  --actor-id "/agents/my_agent/users/user-123"

# Search semantic memory (long-term)
aws bedrock-agentcore retrieve-memory-records \
  --memory-id <memory-id> \
  --namespace "/strategies/" \
  --search-criteria '{"searchQuery":"diabetes"}'
```

---

### Multi-Component Issues

| Symptom | Cause | Solution |
|---------|-------|----------|
| **Agent can't invoke tools** | Runtime → Gateway auth fails | 1. Verify Runtime IAM role has `bedrock-agentcore:InvokeGateway` 2. Check Gateway authorizer is AWS_IAM 3. Verify MCP client uses correct AWS signing |
| **Memory not persisting** | create_event() not called | 1. Add logging before/after create_event() 2. Wrap create_event() in try/except 3. Verify AGENTCORE_MEMORY_ID is set |
| **High latency** | Sequential operations | 1. Parallelize Memory queries (short + long-term) 2. Cache Gateway tool schemas 3. Profile agent code for bottlenecks |

---

## Summary

| Component | Core Function | Key Benefit | Critical Requirement |
|-----------|---------------|-------------|---------------------|
| **Runtime** | Hosts containerized agent | Full control over agent logic | ARM64 Docker image |
| **Gateway** | Exposes tools via MCP | Dynamic tool discovery | Lambda backend |
| **Memory** | Stores conversations + facts | Stateful, personalized agents | Semantic extraction delay |

## References

- [AWS Bedrock AgentCore Documentation](https://docs.aws.amazon.com/bedrock-agentcore/)
- [Amazon Bedrock AgentCore Samples (awslabs)](https://github.com/awslabs/amazon-bedrock-agentcore-samples)
- [Guidance for Multi-Agent Orchestration using Bedrock AgentCore (AWS Solutions Library)](https://github.com/aws-solutions-library-samples/guidance-for-multi-agent-orchestration-using-bedrock-agentcore-on-aws)
- [Strands Agents SDK Documentation](https://strandsagents.com/)
- [MCP Protocol Specification](https://modelcontextprotocol.io/)
