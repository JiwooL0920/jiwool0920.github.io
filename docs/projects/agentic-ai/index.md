# Agentic AI

AI agent platform with RAG and multi-agent orchestration.

## Overview

A platform for building and deploying AI agents with:

- **RAG Pipeline** - Retrieval-augmented generation
- **Multi-Agent Orchestration** - Coordinated agent workflows
- **Tool Integration** - Extensible tool ecosystem

## Quick Links

- [Architecture](architecture.md) - System design
- [Packages](packages.md) - Package documentation
- [Decisions](decisions.md) - Architecture Decision Records

## Repository Structure

```
agentic-ai/
├── packages/       # Monorepo packages
├── infrastructure/ # Deployment configs
├── k8s/           # Kubernetes manifests
└── terraform/     # Cloud infrastructure
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Runtime | Python, TypeScript |
| AI Framework | LangChain, LangGraph |
| Vector Store | Pinecone/Weaviate |
| Infrastructure | Kubernetes, Terraform |
