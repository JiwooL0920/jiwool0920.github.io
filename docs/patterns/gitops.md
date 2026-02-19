# GitOps Patterns

Declarative infrastructure management using Git as the source of truth.

## Core Principles

1. **Declarative** - Describe desired state, not steps to achieve it
2. **Versioned** - All changes tracked in Git history
3. **Automated** - Reconciliation without manual intervention
4. **Observable** - Drift detection and alerting

## Pattern: Repository Structure

```
fleet-repo/
├── apps/              # Application manifests
│   ├── base/         # Base configurations
│   └── overlays/     # Environment-specific
├── infrastructure/    # Platform components
└── clusters/          # Cluster configurations
    ├── dev/
    ├── staging/
    └── prod/
```

## Pattern: Progressive Delivery

```mermaid
graph LR
    DEV[Dev] -->|Promote| STG[Staging]
    STG -->|Promote| PROD[Production]
```

!!! tip "Promotion Strategy"
    Use separate branches or directories per environment, promoting via PRs.

## Pattern: Secrets Management

| Approach | Pros | Cons |
|----------|------|------|
| SOPS | Git-native, auditable | Key management complexity |
| Sealed Secrets | K8s-native | Cluster-specific |
| External Secrets | Cloud-native | External dependency |

## Anti-Patterns

!!! danger "Avoid These"
    - Manual kubectl applies to production
    - Secrets in plain text
    - Skipping staging for "urgent" fixes
