# Weave GitOps

GitOps dashboard for visualizing and managing Flux resources.

## Overview

| Property | Value |
|----------|-------|
| **Namespace** | `flux-system` |
| **Type** | HelmRelease |
| **Layer** | Monitoring (Layer 1) |
| **Dependencies** | Foundation services |
| **Access** | `http://weave.local` |

## Purpose

Weave GitOps provides a web UI for visualizing Flux CD resources, making it easier to understand deployment status and troubleshoot issues.

## Features

- **Resource Visualization** - View all Flux resources
- **Sync Status** - Real-time reconciliation status
- **Dependency Graph** - Visualize resource relationships
- **Event History** - Track deployment events
- **Multi-cluster** - Support for multiple clusters

## Dashboard Views

### Applications

Shows all Kustomizations and HelmReleases with:

- Sync status (Ready, Progressing, Failed)
- Last applied revision
- Source reference

### Sources

Displays Git repositories and Helm repositories:

- URL and branch/tag
- Last fetched revision
- Fetch interval

### Flux Runtime

Shows Flux controllers:

- Controller status
- Version information
- Resource usage

## Access

=== "Local DNS (Recommended)"

    ```
    http://weave.local
    ```

=== "Port Forwarding"

    ```bash
    kubectl port-forward -n flux-system svc/weave-gitops 9001:9001
    ```
    
    Then visit `http://localhost:9001`

## Authentication

Default authentication is configured via External Secrets. Check the credentials in the `weave-gitops` secret.

## Verification

```bash
# Check pod status
kubectl get pods -n flux-system -l app.kubernetes.io/name=weave-gitops

# Check service
kubectl get svc -n flux-system weave-gitops
```

## Troubleshooting

### Dashboard not loading

```bash
# Check pod logs
kubectl logs -n flux-system deploy/weave-gitops

# Check pod status
kubectl describe pod -n flux-system -l app.kubernetes.io/name=weave-gitops
```

### Resources not showing

1. Verify Flux controllers are running
2. Check RBAC permissions
3. Verify service account has cluster-wide access

## Related

- [Architecture](../architecture.md) - Flux architecture
- [Runbooks](../runbooks.md#flux-not-reconciling) - Flux troubleshooting
