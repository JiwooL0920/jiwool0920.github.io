# pgAdmin4

Web-based PostgreSQL administration interface.

## Overview

| Property | Value |
|----------|-------|
| **Namespace** | `pgadmin` |
| **Type** | HelmRelease |
| **Layer** | Database UI (Layer 6) |
| **Dependencies** | PostgreSQL Cluster |
| **Access** | `http://pgadmin.local` |

## Purpose

pgAdmin4 provides a graphical interface for managing PostgreSQL databases, executing queries, and monitoring database health.

## Features

- **Query Tool** - Execute SQL with syntax highlighting
- **Object Browser** - Navigate schemas, tables, views
- **Dashboard** - Server metrics and activity
- **Backup/Restore** - Database backup management
- **ERD Designer** - Visual schema design
- **Query History** - Track executed queries

## Access

=== "Local DNS (Recommended)"

    ```
    http://pgadmin.local
    ```

=== "Port Forwarding"

    ```bash
    kubectl port-forward -n pgadmin svc/pgadmin 8080:80
    ```
    
    Then visit `http://localhost:8080`

## Credentials

Credentials are stored in External Secrets, synced from LocalStack:

```bash
# Get credentials (if needed)
kubectl get secret pgadmin-credentials -n pgadmin -o yaml
```

## Connecting to PostgreSQL

### Pre-configured Server

pgAdmin may be pre-configured with the PostgreSQL cluster connection. If not:

1. Right-click "Servers" → "Register" → "Server"
2. Configure:

| Field | Value |
|-------|-------|
| Name | `postgresql-cluster` |
| Host | `postgresql-cluster-rw.cnpg-system` |
| Port | `5432` |
| Username | From secret |
| Password | From secret |

### Connection String

```
postgresql://<user>:<password>@postgresql-cluster-rw.cnpg-system:5432/<database>
```

## Common Tasks

### Execute Query

1. Select database in object browser
2. Click "Query Tool" button
3. Enter SQL and press F5 or click Execute

### View Table Data

1. Navigate to schema → table
2. Right-click → "View/Edit Data" → "All Rows"

### Export Data

1. Right-click table → "Import/Export Data"
2. Select format (CSV, JSON, etc.)
3. Configure options and export

## Verification

```bash
# Check pod status
kubectl get pods -n pgadmin

# Check logs
kubectl logs -n pgadmin deploy/pgadmin
```

## Troubleshooting

### Cannot login

1. Check credentials in secret
2. Verify External Secret is synced
3. Check LocalStack has the secret

```bash
kubectl get externalsecret -n pgadmin
```

### Cannot connect to PostgreSQL

1. Verify PostgreSQL cluster is healthy
2. Check network connectivity
3. Verify credentials

```bash
# Test from pgadmin pod
kubectl exec -it -n pgadmin deploy/pgadmin -- \
  psql -h postgresql-cluster-rw.cnpg-system -U app -d appdb -c "SELECT 1"
```

### Slow performance

1. Check pod resources
2. Increase memory limits if needed
3. Clear pgAdmin cache

## Related

- [PostgreSQL](postgresql.md) - Database cluster
- [External Secrets](external-secrets.md) - Credential management
