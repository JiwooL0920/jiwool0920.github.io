# LocalStack

AWS services emulation for local development.

## Overview

| Property | Value |
|----------|-------|
| **Namespace** | `localstack` |
| **Type** | HelmRelease |
| **Layer** | Foundation (Layer 0) |
| **Dependencies** | None |
| **Access** | `http://localstack.local` |

## Purpose

LocalStack provides AWS-compatible services locally, eliminating the need for real AWS resources during development.

## Emulated Services

### Secrets Manager

Stores credentials for:

- **Redis** - Authentication password
- **pgAdmin4** - Admin email and password
- **Grafana** - Admin credentials
- **Traefik** - Dashboard auth (username, password, htpasswd)

### S3

- PostgreSQL backup storage
- Object storage for applications

## Auto-Initialization

Secrets are automatically created via LocalStack startup hooks:

1. LocalStack starts with `enableStartupScripts: true`
2. Init scripts in ConfigMap run on startup
3. Secrets are created if they don't exist (idempotent)
4. Data persists across pod restarts

!!! info "No Manual Setup Required"
    Unlike previous versions, secrets are now fully automated. No need to run initialization scripts manually.

## Access

=== "Local DNS (Recommended)"

    ```
    http://localstack.local
    ```

=== "Port Forwarding"

    ```bash
    kubectl port-forward -n localstack svc/localstack 4566:4566
    ```

## Verifying Secrets

```bash
# Port forward to LocalStack
kubectl port-forward -n localstack svc/localstack 4566:4566

# List all secrets
aws --endpoint-url=http://localhost:4566 secretsmanager list-secrets \
  --region us-east-1

# Get a specific secret
aws --endpoint-url=http://localhost:4566 secretsmanager get-secret-value \
  --secret-id redis/credentials/password --region us-east-1
```

## Health Check

```bash
curl http://localhost:4566/_localstack/health
```

## Troubleshooting

### Secrets not syncing to Kubernetes

1. Check External Secrets Operator is running
2. Verify ClusterSecretStore is configured
3. Check ExternalSecret status:

```bash
kubectl get externalsecrets --all-namespaces
kubectl describe externalsecret <name> -n <namespace>
```

### LocalStack not starting

```bash
# Check pod status
kubectl get pods -n localstack

# View logs
kubectl logs -n localstack deploy/localstack
```

## Related

- [External Secrets](external-secrets.md) - Syncs LocalStack secrets to Kubernetes
- [Runbooks](../runbooks.md#secret-management) - Secret operations
