# CNPG Operator

CloudNative PostgreSQL operator for Kubernetes.

## Overview

| Property | Value |
|----------|-------|
| **Namespace** | `cnpg-system` |
| **Type** | HelmRelease |
| **Layer** | Foundation (Layer 0) |
| **Dependencies** | None |

## Purpose

The CloudNative PostgreSQL (CNPG) operator manages PostgreSQL clusters as native Kubernetes resources, providing enterprise-grade database operations.

## Features

- **Declarative Management** - PostgreSQL clusters defined as CRDs
- **Automated Failover** - Automatic promotion of replicas
- **Point-in-Time Recovery** - Restore to any point in time
- **Backup Scheduling** - Automated backups to S3 (LocalStack)
- **Rolling Updates** - Zero-downtime upgrades
- **Connection Pooling** - Built-in PgBouncer support

## Architecture

```mermaid
graph LR
    subgraph Operator
        CNPG[CNPG Operator]
    end
    
    subgraph Cluster
        Primary[Primary Pod]
        Replica1[Replica Pod]
        Replica2[Replica Pod]
    end
    
    subgraph Storage
        S3[LocalStack S3]
    end
    
    CNPG -->|manages| Primary
    CNPG -->|manages| Replica1
    CNPG -->|manages| Replica2
    Primary -->|streams WAL| Replica1
    Primary -->|streams WAL| Replica2
    Primary -->|backups| S3
```

## Configuration

The operator is installed via Helm with default settings. It watches for `Cluster` CRDs and manages the PostgreSQL lifecycle.

## Managed Resources

The operator creates and manages:

- PostgreSQL pods with proper init containers
- Services for read/write and read-only access
- Secrets for credentials
- ConfigMaps for PostgreSQL configuration
- PersistentVolumeClaims for data storage

## Verification

```bash
# Check operator status
kubectl get pods -n cnpg-system

# Check operator logs
kubectl logs -n cnpg-system deploy/cnpg-controller-manager
```

## Troubleshooting

### Operator not starting

```bash
# Check pod status
kubectl describe pod -n cnpg-system -l app.kubernetes.io/name=cloudnative-pg

# Check events
kubectl get events -n cnpg-system --sort-by='.lastTimestamp'
```

### CRDs not recognized

```bash
# Verify CRDs installed
kubectl get crd | grep cnpg
```

## Related

- [PostgreSQL Cluster](postgresql.md) - Managed database cluster
- [Architecture](../architecture.md) - System design
