# Traefik

Ingress controller and load balancer for all cluster traffic.

## Overview

| Property | Value |
|----------|-------|
| **Namespace** | `traefik` |
| **Type** | HelmRelease |
| **Layer** | Foundation (Layer 0) |
| **Dependencies** | None |
| **Access** | `http://traefik.local` |

## Purpose

Traefik serves as the primary ingress controller, handling all external traffic routing into the cluster using IngressRoute CRDs.

## Features

- **Automatic Service Discovery** - Discovers services via Kubernetes API
- **IngressRoute CRDs** - Native Kubernetes routing configuration
- **Middleware Support** - Auth, rate limiting, headers, redirects
- **Dashboard** - Visual route and service monitoring
- **HTTPS** - Automatic certificate management (when configured)

## Configuration

### Traefik Service

The main Traefik deployment includes:

- Deployment with configurable replicas (1 in dev, 3 in prod)
- NodePort service for external access
- Dashboard enabled for monitoring

### Traefik Config

Separate kustomization that depends on Traefik, containing:

- **Middleware definitions** - Auth, headers, rate limiting
- **IngressRoutes** - Routes for all services (Grafana, N8N, Temporal, etc.)

## Access

=== "Local DNS (Recommended)"

    ```
    http://traefik.local
    ```
    
    Setup with `make setup-dns`

=== "Port Forwarding"

    ```bash
    kubectl port-forward -n traefik svc/traefik 8080:80
    ```

## Dashboard

The Traefik dashboard provides:

- Active routers and services
- Middleware configurations
- Health status
- Request metrics

## Troubleshooting

### IngressRoutes not working

```bash
# Check Traefik pods
kubectl get pods -n traefik

# Check IngressRoutes
kubectl get ingressroute --all-namespaces

# Check Traefik logs
kubectl logs -n traefik deploy/traefik
```

### Service not accessible

```bash
# Verify service exists
kubectl get svc -n <namespace>

# Check IngressRoute configuration
kubectl describe ingressroute <name> -n <namespace>
```

## Related

- [Traefik Config](traefik.md#configuration) - Middleware and routes
- [Runbooks](../runbooks.md#service-access-issues) - Access troubleshooting
