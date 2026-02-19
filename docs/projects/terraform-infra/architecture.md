# Architecture

## Infrastructure Overview

```mermaid
graph TB
    subgraph "Terraform Workflow"
        DEV[Developer] -->|terraform plan| TF[Terraform]
        TF -->|Apply| CLOUD[Cloud Provider]
    end
    
    subgraph "State Management"
        TF -->|Store| S3[Remote State]
        S3 -->|Lock| DDB[DynamoDB]
    end
```

## Design Principles

1. **Module Composition** - Small, focused modules composed together
2. **Environment Parity** - Same modules across dev/staging/prod
3. **Immutable Infrastructure** - Replace, don't modify

## State Management

| Environment | Backend | Lock |
|-------------|---------|------|
| Development | S3 | DynamoDB |
| Staging | S3 | DynamoDB |
| Production | S3 | DynamoDB |
