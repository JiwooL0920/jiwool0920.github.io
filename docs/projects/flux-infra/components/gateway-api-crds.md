---
catalog_sha: 4d088b0b3a67b4c4
fleet_infra_commit: 2d36e22
generated_at: 2026-06-12
---

# Gateway API CRDs

[Kubernetes Gateway API](https://gateway-api.sigs.k8s.io/) ([GitHub](https://github.com/kubernetes-sigs/gateway-api)) is the official successor to the Ingress resource, developed by the SIG-Network community. Unlike the legacy Ingress spec — which flattens routing, TLS termination, and traffic policy into a single resource owned by one persona — Gateway API separates concerns across distinct resource types with explicit role-oriented ownership: infrastructure providers manage GatewayClass, cluster operators manage Gateway, and application developers manage HTTPRoute/GRPCRoute.

What distinguishes Gateway API from Ingress and vendor-specific CRDs (Istio VirtualService, Traefik IngressRoute): it provides a portable, expressive routing model with first-class support for header-based matching, traffic splitting, cross-namespace references, and protocol-specific route types — all under a single upstream specification with a formal conformance test suite. Implementations are interchangeable at the API layer without rewriting route definitions.

The standard channel includes the graduated resource types — GatewayClass, Gateway, HTTPRoute, ReferenceGrant, and GRPCRoute — which have reached GA stability guarantees. Experimental-channel resources (TCPRoute, TLSRoute, BackendTLSPolicy) are excluded from this installation.

## Overview

| Property | Value |
|---|---|
| **Namespace** | `gateway-api-crds` |
| **Type** | Kustomization |
| **Layer** | AI agent platform |
| **Status** | Enabled |
| **Source** | [`apps/base/agentgateway/gateway-api-crds/`](https://github.com/JiwooL0920/fleet-infra/tree/develop/apps/base/agentgateway/gateway-api-crds/) |

## Dependencies

### Upstream — required before Gateway API CRDs starts

_No upstream Flux dependencies — starts immediately._

### Downstream — services that depend on Gateway API CRDs

| Service | Dependency type | Reason |
|---|---|---|
| `agentgateway` | Flux `dependsOn` | Requires Gateway API CRDs |

## Purpose

This Kustomization installs the Gateway API CRD definitions into the cluster so that downstream controllers — specifically agentgateway — can register a GatewayClass and instantiate Gateway/HTTPRoute resources. Without these CRDs present in the API server, any HelmRelease attempting to create Gateway API objects would fail at the admission stage with "no matches for kind" errors.

It is deployed as a standalone Flux Kustomization rather than bundled inside the agentgateway chart to decouple CRD lifecycle from application lifecycle — CRDs are cluster-scoped, shared resources that must outlive any single controller installation.

**Why a dedicated Kustomization over Helm CRD hooks or chart dependencies:** Helm's `crds/` directory applies CRDs only on initial install and never upgrades or deletes them — leaving version drift unmanaged. Bundling CRDs inside chart templates risks accidental deletion on `helm uninstall`. A standalone Flux Kustomization with `prune: false` provides controlled, auditable CRD upgrades through Git while guaranteeing that uninstalling the consuming chart never removes the shared definitions. This is the pattern recommended by the Flux documentation for any CRD that multiple controllers or tenants may depend on.


## Features

| Feature | Detail |
|---|---|
| **Prune-safe CRD lifecycle** | prune: false ensures Flux never garbage-collects these CRDs during reconciliation, even if the Kustomization source is temporarily unreachable or the resource list changes |
| **Dependency gate with wait** | wait: true blocks downstream Kustomizations (agentgateway) from reconciling until all CRDs report Established=True, preventing race conditions at cluster bootstrap |
| **Standard channel pinning** | Pulls exclusively from the upstream standard-install.yaml release artifact, excluding experimental-channel resources that carry no stability guarantees |
| **Remote source reference** | Resources are fetched directly from the upstream GitHub release tag rather than vendored into the repository, keeping the diff surface minimal during version bumps |


## Configuration

All values sourced from [`base/services/environment.env`](https://github.com/JiwooL0920/fleet-infra/blob/develop/base/services/environment.env)
(base); per-environment overrides in [`clusters/stages/dev/.../environment.env`](https://github.com/JiwooL0920/fleet-infra/blob/develop/clusters/stages/dev/clusters/services-amer/environment.env).

_No environment-specific configuration variables for this service._


## Operations

<!-- TODO: Add operations in service-insights/gateway-api-crds.yaml → operations field -->

## Related


- [`apps/base/agentgateway/gateway-api-crds/`](https://github.com/JiwooL0920/fleet-infra/tree/develop/apps/base/agentgateway/gateway-api-crds/) — Kubernetes manifests
- [`base/services/gateway-api-crds.yaml`](https://github.com/JiwooL0920/fleet-infra/blob/develop/base/services/gateway-api-crds.yaml) — Flux Kustomization
- [`base/services/environment.env`](https://github.com/JiwooL0920/fleet-infra/blob/develop/base/services/environment.env) — environment variables

---
*Generated from [service-catalog.json](https://github.com/JiwooL0920/fleet-infra/blob/develop/service-catalog.json) at commit `2d36e22` · catalog sha `4d088b0b3a67b4c4`*