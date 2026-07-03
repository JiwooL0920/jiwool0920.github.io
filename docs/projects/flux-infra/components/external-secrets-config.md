---
catalog_sha: bbff61e079f91214
flux_infra_commit: 0110717
generated_at: 2026-07-03
---

# External Secrets Config

[External Secrets Operator](https://external-secrets.io) (ESO) is a Kubernetes operator that synchronizes secrets from external providers (AWS Secrets Manager, HashiCorp Vault, Azure Key Vault, GCP Secret Manager, and others) into native Kubernetes Secrets. It decouples secret lifecycle management from application deployment — secrets are declared as `ExternalSecret` custom resources that reference a `SecretStore` or `ClusterSecretStore`, and the operator continuously reconciles the desired state against the external provider.

A **ClusterSecretStore** is the cluster-wide variant of ESO's provider connection. Unlike namespace-scoped `SecretStore` resources, a single `ClusterSecretStore` can serve `ExternalSecret` resources in any namespace, eliminating the need to duplicate provider credentials across every namespace that needs secrets.

This `external-secrets-config` service is not the operator itself — it is the **configuration layer** that deploys the `ClusterSecretStore` resource connecting ESO to the platform's secrets backend. It exists as a separate Flux Kustomization so that the operator CRDs and controller can be fully healthy before any custom resources are applied.

## Overview

| Property | Value |
|---|---|
| **Namespace** | `external-secrets-config` |
| **Type** | Kustomization |
| **Layer** | Foundation services |
| **Status** | Enabled |
| **Source** | [`apps/base/external-secrets-config/`](https://github.com/JiwooL0920/flux-infra/tree/develop/apps/base/external-secrets-config/) |

## Dependencies

### Upstream — required before External Secrets Config starts

| Service | Reason | Status |
|---|---|---|
| `external-secrets-operator` | Flux `dependsOn` | Active |
| `localstack` | Flux `dependsOn` | Active |

### Downstream — services that depend on External Secrets Config

| Service | Dependency type | Reason |
|---|---|---|
| `traefik-config` | Flux `dependsOn` | Requires External Secrets Config |
| `kube-prometheus-stack` | Flux `dependsOn` | Requires External Secrets Config |
| `argocd` | Flux `dependsOn` | Requires External Secrets Config |
| `loki` | Flux `dependsOn` | Requires External Secrets Config |
| `redis-sentinel` | Flux `dependsOn` | Requires External Secrets Config |
| `n8n` | Flux `dependsOn` | Requires External Secrets Config |
| `temporal` | Flux `dependsOn` | Requires External Secrets Config |
| `kagent` | Flux `dependsOn` | Requires External Secrets Config |
| `agentgateway` | Flux `dependsOn` | Requires External Secrets Config |
| `pgadmin4` | Flux `dependsOn` | Requires External Secrets Config |

## Purpose

This service deploys a single `ClusterSecretStore` named `localstack-secretstore` that connects the External Secrets Operator to LocalStack's Secrets Manager API. Every downstream service that needs credentials — databases, monitoring stacks, application services — declares an `ExternalSecret` that references this store. By gating readiness on a health check against the `ClusterSecretStore`, Flux guarantees that no downstream service attempts secret synchronization before the provider connection is verified healthy.

Nine services depend on this configuration being reconciled and healthy before they can start: traefik-config, kube-prometheus-stack, loki, redis-sentinel, n8n, temporal, kagent, agentgateway, and pgadmin4.

**Why a separate Kustomization from the operator:** CRD installation and controller startup must complete before any CR can be applied. Splitting config from operator allows Flux's `dependsOn` to enforce this ordering without relying on retry loops or apply-time errors. The operator Kustomization handles CRDs and the controller Deployment; this Kustomization handles the `ClusterSecretStore` CR that depends on those CRDs existing.

**Why ClusterSecretStore over namespace-scoped SecretStores:** With 9+ consuming namespaces, replicating provider credentials into each namespace creates operational overhead and secret sprawl. A single `ClusterSecretStore` provides one point of configuration for the LocalStack endpoint, and any namespace can reference it without needing its own copy of the provider connection.

**Why LocalStack as the secrets backend:** In a development/homelab context, LocalStack provides an AWS-compatible Secrets Manager API without cloud costs or external network dependencies. Secrets are auto-seeded via LocalStack init hooks on startup, making the cluster fully self-bootstrapping with no manual secret initialization required.


## Features

| Feature | Detail |
|---|---|
| **Cluster-wide secret store** | Deploys a ClusterSecretStore accessible from any namespace, eliminating per-namespace provider credential duplication. |
| **Health-gated readiness** | Flux health check on the ClusterSecretStore resource blocks all 9 downstream services until the provider connection is verified healthy. |
| **Variable substitution** | Uses postBuild substituteFrom with the cluster-vars ConfigMap, allowing environment-specific endpoint configuration without manifest duplication. |
| **Ordered dependency chain** | Depends on both external-secrets-operator (CRDs and controller) and localstack (secrets backend with pre-seeded data), ensuring the store is only created when both prerequisites are operational. |
| **Wait semantics** | Configured with wait=true and 5m timeout, meaning Flux will not report this Kustomization as ready until the ClusterSecretStore passes its health check. |

## Architecture

### Secret Distribution Topology

```mermaid
graph TD
    subgraph flux-system["flux-system namespace"]
        KS[Kustomization: external-secrets-config]
        ESO_KS[Kustomization: external-secrets-operator]
        LS_KS[Kustomization: localstack]
    end

    subgraph cluster-scope["Cluster-Scoped Resources"]
        CSS[ClusterSecretStore: localstack-secretstore]
    end

    subgraph localstack-ns["localstack namespace"]
        LS[LocalStack Pod<br/>Secrets Manager API]
    end

    subgraph downstream["Downstream Namespaces"]
        ES1[ExternalSecret: traefik-config]
        ES2[ExternalSecret: kube-prometheus-stack]
        ES3[ExternalSecret: n8n / temporal / kagent / ...]
    end

    ESO_KS -->|dependsOn| KS
    LS_KS -->|dependsOn| KS
    KS -->|deploys| CSS
    CSS -->|provider endpoint| LS
    ES1 -->|references| CSS
    ES2 -->|references| CSS
    ES3 -->|references| CSS
```


## Configuration

All values sourced from [`base/services/environment.env`](https://github.com/JiwooL0920/flux-infra/blob/develop/base/services/environment.env)
(base); per-environment overrides in [`clusters/stages/dev/.../environment.env`](https://github.com/JiwooL0920/flux-infra/blob/develop/clusters/stages/dev/clusters/services-amer/environment.env).

_No environment-specific configuration variables for this service._


## Operations

### ClusterSecretStore stuck in NotReady

**Symptoms:** `kubectl get clustersecretstore localstack-secretstore` shows `Ready: False`. Downstream Kustomizations remain suspended with `dependency 'flux-system/external-secrets-config' is not ready`. Flux health check fails with timeout after 5m.

```bash
kubectl get clustersecretstore localstack-secretstore -o yaml | grep -A 10 'status:'
kubectl logs -n external-secrets -l app.kubernetes.io/name=external-secrets --tail=50 | grep -i 'secretstore\|error\|localstack'
kubectl get pods -n localstack -o wide
kubectl exec -n localstack deploy/localstack -- awslocal secretsmanager list-secrets --region us-east-1
kubectl get configmap cluster-vars -n flux-system -o yaml | grep -i endpoint
```

---

### Flux Kustomization timeout during bootstrap

**Symptoms:** `flux get kustomization external-secrets-config` shows `reconciliation failed: timeout waiting for condition`. Typically occurs on fresh cluster bootstrap when LocalStack init hooks take longer than expected.

```bash
flux get kustomization external-secrets-config
flux get kustomization localstack
kubectl get pods -n localstack -o wide --show-labels
kubectl logs -n localstack deploy/localstack --tail=100 | grep -i 'ready\|init\|secret'
flux reconcile kustomization external-secrets-config --with-source
```

---

### PostBuild substitution failure

**Symptoms:** `flux get kustomization external-secrets-config` reports `SubstitutionFailed` or the rendered manifest contains literal `${VARIABLE}` placeholders. ClusterSecretStore may point to an incorrect or empty endpoint.

```bash
flux get kustomization external-secrets-config -o yaml | grep -A 5 'status:'
kubectl get configmap cluster-vars -n flux-system -o yaml
flux logs --kind=Kustomization --name=external-secrets-config --namespace=flux-system --tail=30
```

---

### Downstream ExternalSecrets failing after store is Ready

**Symptoms:** ClusterSecretStore shows `Ready: True` but `ExternalSecret` resources in downstream namespaces show `SecretSyncedError` or `ProviderError`. Specific secrets referenced by downstream services do not exist in LocalStack.

```bash
kubectl get externalsecrets --all-namespaces -o wide | grep -v 'SecretSynced'
kubectl describe externalsecret -n <failing-namespace> <failing-name> | grep -A 5 'Conditions:'
kubectl exec -n localstack deploy/localstack -- awslocal secretsmanager list-secrets --region us-east-1 --output table
kubectl logs -n external-secrets -l app.kubernetes.io/name=external-secrets --tail=100 | grep -i 'error\|not found'
```

---

### CRD not available when Kustomization reconciles

**Symptoms:** Flux reports `no matches for kind "ClusterSecretStore" in version "external-secrets.io/v1beta1"`. Occurs if operator Kustomization was suspended or failed while config attempts to reconcile.

```bash
kubectl get crd clustersecretstores.external-secrets.io
flux get kustomization external-secrets-operator
kubectl get pods -n external-secrets
flux reconcile kustomization external-secrets-operator --with-source
flux reconcile kustomization external-secrets-config
```
**See also:** docs/adr/001-fine-grained-service-dependencies.md

---


## Related


- [`apps/base/external-secrets-config/`](https://github.com/JiwooL0920/flux-infra/tree/develop/apps/base/external-secrets-config/) — Kubernetes manifests
- [`base/services/external-secrets-config.yaml`](https://github.com/JiwooL0920/flux-infra/blob/develop/base/services/external-secrets-config.yaml) — Flux Kustomization
- [`base/services/environment.env`](https://github.com/JiwooL0920/flux-infra/blob/develop/base/services/environment.env) — environment variables

---
*Generated from [service-catalog.json](https://github.com/JiwooL0920/flux-infra/blob/develop/service-catalog.json) at commit `0110717` · catalog sha `bbff61e079f91214`*