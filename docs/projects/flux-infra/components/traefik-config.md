---
catalog_sha: 9be0573fcf582c2a
flux_infra_commit: 20dba34
generated_at: 2026-07-03
---

# Traefik Config

Traefik Config is a post-install configuration layer that provisions the routing rules, authentication middleware, and credential management required to securely expose Traefik's built-in dashboard. It is separated from the Traefik Helm deployment itself to enforce a clean dependency boundary: the reverse proxy must be fully operational — with its CRDs registered and admission webhooks ready — before any IngressRoutes or Middlewares are submitted to the API server.

This pattern of splitting operator installation from its configuration is a deliberate GitOps design choice. Traefik's custom resource definitions (IngressRoute, Middleware) only become available after the Helm chart reconciles. By isolating post-install configuration into its own Flux Kustomization with explicit `dependsOn`, the platform avoids race conditions where CRD-based resources are applied before the API server can validate them — a common failure mode in monolithic Flux deployments.

## Overview

| Property | Value |
|---|---|
| **Namespace** | `traefik-config` |
| **Type** | Kustomization |
| **Layer** | Foundation services |
| **Status** | Enabled |
| **Source** | [`apps/base/traefik-config/`](https://github.com/JiwooL0920/flux-infra/tree/develop/apps/base/traefik-config/) |

## Dependencies

### Upstream — required before Traefik Config starts

| Service | Reason | Status |
|---|---|---|
| `traefik` | Flux `dependsOn` | Active |
| `external-secrets-config` | Flux `dependsOn` | Active |

### Downstream — services that depend on Traefik Config

| Service | Dependency type | Reason |
|---|---|---|
| `argocd` | Flux `dependsOn` | Requires Traefik Config |
| `jaeger` | Flux `dependsOn` | Requires Traefik Config |
| `scylla-cluster` | Flux `dependsOn` | Requires Traefik Config |

## Purpose

Traefik Config secures and exposes the Traefik dashboard behind basic authentication with credentials managed entirely through ExternalSecrets. Rather than embedding htpasswd strings in Git or relying on manual secret creation, it pulls pre-hashed credentials from LocalStack's secret store on a 1-hour refresh cycle. This gives operators real-time visibility into routing topology, middleware chains, entrypoint health, and service discovery state without exposing an unauthenticated admin interface to the cluster network.

It also serves as the foundation dependency for downstream services (Jaeger, Scylla cluster) that require Traefik's middleware and routing primitives to be present before their own IngressRoutes can reference them.

**Why a separate Kustomization rather than bundling config in the Traefik Helm values:** Helm values can configure the dashboard and middlewares, but doing so couples credential management to chart upgrades and makes the ExternalSecrets integration awkward (Helm values don't natively support ExternalSecret-driven secrets). Separating configuration into native Traefik CRDs gives full control over the credential lifecycle, allows independent reconciliation intervals, and means dashboard auth can be updated without triggering a Helm release — which would restart Traefik pods and briefly disrupt all proxied traffic.


## Features

| Feature | Detail |
|---|---|
| **ExternalSecrets-managed basic auth credentials** | Pulls htpasswd-formatted credentials from LocalStack via ClusterSecretStore with 1-hour refresh interval, eliminating secrets from Git entirely |
| **BasicAuth middleware with header injection** | Authenticates dashboard requests and injects X-WebAuth-User header for audit traceability, stripping the original Authorization header before forwarding to upstream |
| **IngressRoute dashboard exposure** | Routes Host(`traefik.local`) on the web entrypoint to Traefik's internal API service with the authentication middleware chain applied |
| **Post-build variable substitution** | Supports cluster-vars ConfigMap substitution for environment-specific overrides without duplicating manifests across stages |

## Architecture

### Dashboard Authentication Topology

```mermaid
graph TD
    subgraph flux-system["flux-system namespace"]
        KS["Kustomization: traefik-config"]
    end
    subgraph traefik-ns["traefik namespace"]
        IR["IngressRoute: traefik-dashboard"]
        MW["Middleware: dashboard-auth"]
        ES["ExternalSecret: traefik-dashboard-credentials"]
        SEC["Secret: traefik-dashboard-credentials"]
        API["TraefikService: api@internal"]
    end
    subgraph ext-deps["Dependencies"]
        TFK["Kustomization: traefik"]
        CSS["ClusterSecretStore: localstack-secretstore"]
    end
    KS -->|dependsOn| TFK
    KS -->|dependsOn| CSS
    KS -->|reconciles| IR
    KS -->|reconciles| MW
    KS -->|reconciles| ES
    ES -->|"refreshInterval: 1h"| CSS
    ES -->|"creationPolicy: Owner"| SEC
    MW -->|"references secret"| SEC
    IR -->|"Host traefik.local / web entrypoint"| API
    IR -->|"applies middlewares"| MW
```

### Dashboard Request Authentication Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant EP as Traefik web entrypoint
    participant MW as Middleware: dashboard-auth
    participant S as Secret: traefik-dashboard-credentials
    participant D as api@internal
    C->>EP: GET Host: traefik.local
    EP->>MW: Route matched — apply middleware
    MW->>S: Load htpasswd users
    MW->>C: 401 WWW-Authenticate: Basic
    C->>EP: GET with Authorization: Basic header
    EP->>MW: Route matched — apply middleware
    MW->>MW: Validate against htpasswd
    Note over MW: Set X-WebAuth-User header
    Note over MW: Strip Authorization header (removeHeader: true)
    MW->>D: Forward authenticated request
    D->>C: 200 Dashboard response
```


## Configuration

All values sourced from [`base/services/environment.env`](https://github.com/JiwooL0920/flux-infra/blob/develop/base/services/environment.env)
(base); per-environment overrides in [`clusters/stages/dev/.../environment.env`](https://github.com/JiwooL0920/flux-infra/blob/develop/clusters/stages/dev/clusters/services-amer/environment.env).

_No environment-specific configuration variables for this service._


## Operations

### Dashboard returns 401 despite correct credentials

**Symptoms:** Accessing `traefik.local` returns HTTP 401. Credentials known to be correct. The Secret may be empty or contain stale htpasswd data.

```bash
kubectl get externalsecret traefik-dashboard-credentials -n traefik -o jsonpath='{.status.conditions[*].message}'
kubectl get secret traefik-dashboard-credentials -n traefik -o jsonpath='{.data.users}' | base64 -d
kubectl get clustersecretstore localstack-secretstore -o jsonpath='{.status.conditions[*].message}'
kubectl annotate externalsecret traefik-dashboard-credentials -n traefik force-sync=$(date +%s) --overwrite
kubectl get externalsecret traefik-dashboard-credentials -n traefik -w
```

---

### ExternalSecret stuck in SecretSyncedError

**Symptoms:** `kubectl get externalsecret -n traefik` shows `SecretSyncedError` status. Downstream services (jaeger, scylla-cluster) may be blocked waiting for traefik-config readiness.

```bash
kubectl get externalsecret traefik-dashboard-credentials -n traefik -o yaml | grep -A5 'conditions'
kubectl get clustersecretstore localstack-secretstore -o jsonpath='{.status.conditions[?(@.type=="Ready")].status}'
kubectl logs -n external-secrets -l app.kubernetes.io/name=external-secrets --tail=50 | grep traefik
kubectl get pods -n localstack -o wide
kubectl exec -n localstack deploy/localstack -- awslocal secretsmanager get-secret-value --secret-id traefik/dashboard/credentials/htpasswd
```

---

### IngressRoute not matching requests

**Symptoms:** Requests to `traefik.local` return 404 instead of reaching the dashboard. Traefik access logs show no match for the Host header.

```bash
kubectl get ingressroute traefik-dashboard -n traefik -o yaml
kubectl get middleware dashboard-auth -n traefik -o yaml
kubectl port-forward -n traefik svc/traefik 9000:9000
curl -s http://localhost:9000/api/http/routers | jq '.[] | select(.name | contains("dashboard"))'
curl -v -H 'Host: traefik.local' http://localhost:80/
```

---

### Flux Kustomization traefik-config stuck not ready

**Symptoms:** `flux get kustomization traefik-config` shows `dependency 'flux-system/traefik' is not ready` or `dependency 'flux-system/external-secrets-config' is not ready`. Downstream services blocked.

```bash
flux get kustomization traefik-config
flux get kustomization traefik
flux get kustomization external-secrets-config
kubectl get helmrelease -A | grep -E 'traefik|external-secrets'
flux reconcile kustomization traefik-config --with-source
```

---

### Middleware not applied to IngressRoute

**Symptoms:** Dashboard accessible without authentication. Traefik logs show the route is active but middleware chain is empty or errored.

```bash
curl -s http://localhost:9000/api/http/routers | jq '.[] | select(.name | contains("dashboard")) | .middlewares'
kubectl get middleware dashboard-auth -n traefik -o jsonpath='{.spec}'
kubectl get secret traefik-dashboard-credentials -n traefik
kubectl logs -n traefik -l app.kubernetes.io/name=traefik --tail=30 | grep -i 'middleware\|error\|dashboard'
kubectl describe ingressroute traefik-dashboard -n traefik
```

---


## Related


- [`apps/base/traefik-config/`](https://github.com/JiwooL0920/flux-infra/tree/develop/apps/base/traefik-config/) — Kubernetes manifests
- [`base/services/traefik-config.yaml`](https://github.com/JiwooL0920/flux-infra/blob/develop/base/services/traefik-config.yaml) — Flux Kustomization
- [`base/services/environment.env`](https://github.com/JiwooL0920/flux-infra/blob/develop/base/services/environment.env) — environment variables

---
*Generated from [service-catalog.json](https://github.com/JiwooL0920/flux-infra/blob/develop/service-catalog.json) at commit `20dba34` · catalog sha `9be0573fcf582c2a`*