---
catalog_sha: 4d088b0b3a67b4c4
fleet_infra_commit: 09eeed6
generated_at: 2026-06-12
---

# External Secrets Operator

[External Secrets Operator](https://external-secrets.io) ([GitHub](https://github.com/external-secrets/external-secrets)) is a Kubernetes operator that synchronizes secrets from external secret management systems into native Kubernetes `Secret` objects. Unlike alternatives that require sidecar injection (Vault Agent) or custom volume drivers (Secrets Store CSI), ESO operates as a reconciliation controller — it watches `ExternalSecret` custom resources, fetches the referenced secret data from a configured provider, and materializes it as a standard `Secret` that any pod can consume via `envFrom` or volume mounts.

The operator introduces three key CRDs: `SecretStore` / `ClusterSecretStore` (provider connection configuration), `ExternalSecret` (declarative mapping from external path to K8s Secret), and `PushSecret` (reverse sync from K8s into the external provider). This CRD-based model makes secret consumption fully GitOps-compatible — teams declare what secrets they need without embedding credentials in manifests or Helm values.

ESO supports a wide matrix of backends (AWS Secrets Manager, GCP Secret Manager, Azure Key Vault, HashiCorp Vault, 1Password, and others) through a pluggable provider architecture. The same `ExternalSecret` manifest can target different backends by swapping only the `SecretStore` reference, enabling environment portability without manifest changes.

## Overview

| Property | Value |
|---|---|
| **Namespace** | `secrets-manager` |
| **Type** | HelmRelease (chart: `external-secrets` v0.10.7) |
| **Layer** | Foundation services |
| **Chart** | [`external-secrets`](https://charts.external-secrets.io) v0.10.7 |
| **Status** | Enabled |
| **Source** | [`apps/base/external-secrets-operator/`](https://github.com/JiwooL0920/fleet-infra/tree/develop/apps/base/external-secrets-operator/) |

## Dependencies

### Upstream — required before External Secrets Operator starts

| Service | Reason | Status |
|---|---|---|
| `localstack` | Flux `dependsOn` | Active |

### Downstream — services that depend on External Secrets Operator

| Service | Dependency type | Reason |
|---|---|---|
| `external-secrets-config` | Flux `dependsOn` | Requires External Secrets Operator |
| `crossplane-config` | Flux `dependsOn` | Requires External Secrets Operator |

## Purpose

External Secrets Operator is the platform's secret materialization layer. It bridges the gap between LocalStack's AWS Secrets Manager emulation (the authoritative secret store for this cluster) and the Kubernetes `Secret` objects that application workloads actually mount. Every service that needs credentials — database passwords, API keys, admin tokens — declares an `ExternalSecret` that the operator reconciles into a native Secret, eliminating manual `kubectl create secret` operations and ensuring secrets regenerate automatically on cluster rebuild.

The operator also enables the `PushSecret` flow used by services like CNPG that generate credentials at runtime and need to push them back into the secret store for consumption by other services.

**Why External Secrets Operator over alternatives:** The primary requirement was production portability — the same `ExternalSecret` manifests must work against LocalStack in development and a real AWS Secrets Manager in production, with only the `ClusterSecretStore` differing between environments. SOPS and Sealed Secrets both commit encrypted material to Git (non-portable, environment-specific keys). The Secrets Store CSI Driver requires sidecar injection and doesn't support the push-secret pattern needed for CNPG credential propagation. ESO's reconciliation model also means secrets self-heal on drift — if a Secret is accidentally deleted, the operator recreates it within the reconciliation interval.


## Features

| Feature | Detail |
|---|---|
| **ClusterSecretStore with LocalStack backend** | A cluster-scoped store targeting LocalStack's Secrets Manager API at port 4566, authenticated via a static K8s Secret with test credentials — enabling all namespaces to reference a single provider without per-namespace configuration. |
| **Explicit endpoint override for non-AWS environments** | The controller is configured with AWS_SECRETSMANAGER_ENDPOINT and AWS_STS_ENDPOINT environment variables pointing to LocalStack's in-cluster service, with EC2 metadata and SDK config loading disabled to prevent accidental real-AWS calls. |
| **CRD auto-installation** | The Helm chart deploys all ESO CRDs (ExternalSecret, SecretStore, ClusterSecretStore, PushSecret) as part of the release, ensuring the API types exist before downstream kustomizations attempt to create instances. |
| **Webhook with independent scaling** | The validating/mutating webhook runs as a separate deployment with its own replica count and resource budget, decoupling admission latency from the main controller's reconciliation load. |
| **Install and upgrade remediation** | Both install and upgrade operations are configured with 3 retries and a 10-minute timeout, tolerating transient failures during LocalStack startup without manual intervention. |

## Architecture

### Deployment Topology

```mermaid
graph TD
    subgraph flux-system["flux-system namespace"]
        HR[HelmRelease: secrets-manager]
        REPO[HelmRepository: charts.external-secrets.io]
        HR -->|chart source| REPO
    end

    subgraph secrets-manager["secrets-manager namespace"]
        CTRL[ESO Controller]
        WH[ESO Webhook]
        CRED[Secret: localstack-credentials]
        CSS[ClusterSecretStore: localstack-secretstore]
        CSS -->|auth secretRef| CRED
    end

    subgraph localstack-ns["localstack namespace"]
        LS[LocalStack :4566]
    end

    CTRL -->|"AWS SM API :4566"| LS
    CSS -->|provider endpoint| LS
    HR -->|deploys to| secrets-manager
```

### Secret Reconciliation Flow

```mermaid
sequenceDiagram
    participant App as Downstream Service
    participant ES as ExternalSecret CR
    participant CTRL as ESO Controller
    participant CSS as ClusterSecretStore
    participant LS as LocalStack :4566
    participant K8S as Kubernetes Secret

    App->>ES: declares needed secret path
    CTRL->>ES: watches (reconcile interval 5m)
    CTRL->>CSS: resolve provider config
    CTRL->>LS: GetSecretValue (AWS SM API)
    LS-->>CTRL: secret payload
    CTRL->>K8S: create/update Secret
    App->>K8S: mount via envFrom/volume
```


## Configuration

All values sourced from [`base/services/environment.env`](https://github.com/JiwooL0920/fleet-infra/blob/develop/base/services/environment.env)
(base); per-environment overrides in [`clusters/stages/dev/.../environment.env`](https://github.com/JiwooL0920/fleet-infra/blob/develop/clusters/stages/dev/clusters/services-amer/environment.env).

| Parameter | Dev | Prod |
|---|---|---|
| `EXTERNAL_SECRETS_CHART_VERSION` | `0.10.7` | `0.10.7` |
| `EXTERNAL_SECRETS_CPU_LIMIT` | `100m` | `500m` |
| `EXTERNAL_SECRETS_CPU_REQUEST` | `100m` | `100m` |
| `EXTERNAL_SECRETS_MEMORY_LIMIT` | `128Mi` | `512Mi` |
| `EXTERNAL_SECRETS_MEMORY_REQUEST` | `128Mi` | `256Mi` |
| `EXTERNAL_SECRETS_WEBHOOK_REPLICA_COUNT` | `1` | `2` |


## Operations

<!-- TODO: Add operations in service-insights/external-secrets-operator.yaml → operations field -->

## Related


- [`apps/base/external-secrets-operator/`](https://github.com/JiwooL0920/fleet-infra/tree/develop/apps/base/external-secrets-operator/) — Kubernetes manifests
- [`base/services/external-secrets-operator.yaml`](https://github.com/JiwooL0920/fleet-infra/blob/develop/base/services/external-secrets-operator.yaml) — Flux Kustomization
- [`base/services/environment.env`](https://github.com/JiwooL0920/fleet-infra/blob/develop/base/services/environment.env) — environment variables

---
*Generated from [service-catalog.json](https://github.com/JiwooL0920/fleet-infra/blob/develop/service-catalog.json) at commit `09eeed6` · catalog sha `4d088b0b3a67b4c4`*