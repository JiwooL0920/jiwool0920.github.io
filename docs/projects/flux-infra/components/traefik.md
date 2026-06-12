---
catalog_sha: 4d088b0b3a67b4c4
fleet_infra_commit: 2d36e22
generated_at: 2026-06-12
---

# Traefik

[Traefik](https://traefik.io/traefik/) ([GitHub](https://github.com/traefik/traefik)) is a cloud-native reverse proxy and ingress controller designed for dynamic service discovery in container orchestrators. Unlike Nginx Ingress which relies on annotation-heavy Ingress resources and periodic config reloads, Traefik watches the Kubernetes API directly and reconfigures routing in real-time as services appear or disappear — no HUP signals, no config generation, no race conditions between discovery and routing.

What distinguishes Traefik from other ingress controllers in this space: it defines routing through IngressRoute CRDs rather than annotations, making routing rules first-class Kubernetes objects that are composable, version-controlled, and reconcilable by GitOps controllers. Middleware (auth, rate limiting, header manipulation) is declared as separate CRD objects and chained declaratively — a model closer to a service mesh's traffic policy than a traditional reverse proxy's monolithic config.

Traefik also natively supports the emerging Gateway API standard, providing an incremental migration path away from its proprietary CRDs when the ecosystem matures.

## Overview

| Property | Value |
|---|---|
| **Namespace** | `traefik` |
| **Type** | HelmRelease (chart: `traefik` v32.1.1) |
| **Layer** | Foundation services |
| **Chart** | [`traefik`](https://helm.traefik.io/traefik) v32.1.1 |
| **Status** | Enabled |
| **Source** | [`apps/base/traefik/`](https://github.com/JiwooL0920/fleet-infra/tree/develop/apps/base/traefik/) |

## Dependencies

### Upstream — required before Traefik starts

_No upstream Flux dependencies — starts immediately._

### Downstream — services that depend on Traefik

| Service | Dependency type | Reason |
|---|---|---|
| `traefik-config` | Flux `dependsOn` | Requires Traefik |
| `kagent` | Flux `dependsOn` | Requires Traefik |
| `agentgateway` | Flux `dependsOn` | Requires Traefik |

## Purpose

Traefik is the platform's sole ingress controller, routing external traffic to 15+ services across multiple namespaces via `.local` domains. It sits in the foundation layer with zero dependencies — starting immediately on cluster bootstrap — and serves as a prerequisite for `traefik-config` (which declares the IngressRoute/Middleware CRDs), `kagent`, and `agentgateway`.

In this platform it operates as a NodePort service bound to fixed ports on the Kind cluster nodes, allowing the host machine to reach any routed service through a single stable entrypoint without LoadBalancer infrastructure. All routing decisions are expressed as IngressRoute CRDs managed through the same GitOps pipeline as the services themselves.

**Why Traefik over Nginx Ingress or Envoy:** The platform routes to services spanning many namespaces with per-service middleware chains (authentication, CORS, path stripping). Nginx Ingress encodes this in annotations — which are untyped, unvalidatable, and don't compose across objects. Traefik's IngressRoute CRDs make each routing rule and middleware a discrete, reconcilable Kubernetes resource that Flux can manage, diff, and prune like any other manifest. Cross-namespace routing is first-class (`allowCrossNamespace: true`) rather than requiring explicit namespace grants. The built-in dashboard provides immediate routing visibility during development without deploying a separate observability tool. Envoy (via Istio or standalone) would deliver equivalent L7 capability but at 10x the operational complexity and resource cost for a local development cluster.


## Features

| Feature | Detail |
|---|---|
| **Cross-namespace CRD routing** | kubernetesCRD with allowCrossNamespace enables a single Traefik instance to route to services in any namespace without per-namespace ingress controllers or explicit grants |
| **Dual provider mode** | Both IngressRoute CRDs and standard Ingress resources are served simultaneously, allowing gradual migration and third-party chart compatibility |
| **Pod anti-affinity (HA)** | requiredDuringSchedulingIgnoredDuringExecution on hostname topology ensures replicas never co-locate on the same node, eliminating single-node failure as a traffic black hole |
| **JSON access logs with header redaction** | Structured JSON access logs keep general fields but explicitly redact Authorization, Cookie, and Proxy-Authorization headers — queryable without leaking credentials into log aggregation |
| **NodePort fixed-port binding** | Ports 30080 and 30443 are statically assigned for Kind cluster compatibility, giving the host machine deterministic ingress endpoints without cloud LoadBalancer provisioning |
| **Secure dashboard** | Dashboard enabled with insecure mode explicitly disabled — accessible only through authenticated IngressRoute rather than an open internal port |
| **Telemetry suppression** | Version check and anonymous usage reporting disabled via globalArguments, preventing unexpected outbound traffic from the cluster and eliminating startup latency from DNS resolution to Traefik's telemetry endpoints |
| **Health ping endpoint** | Dedicated ping endpoint enabled for liveness/readiness probes and Flux healthCheck verification independent of traffic-serving ports |


## Configuration

All values sourced from [`base/services/environment.env`](https://github.com/JiwooL0920/fleet-infra/blob/develop/base/services/environment.env)
(base); per-environment overrides in [`clusters/stages/dev/.../environment.env`](https://github.com/JiwooL0920/fleet-infra/blob/develop/clusters/stages/dev/clusters/services-amer/environment.env).

| Parameter | Dev | Prod |
|---|---|---|
| `TRAEFIK_CHART_VERSION` | `32.1.1` | `32.1.1` |
| `TRAEFIK_CPU_LIMIT` | `500m` | `2000m` |
| `TRAEFIK_CPU_REQUEST` | `500m` | `200m` |
| `TRAEFIK_MEMORY_LIMIT` | `256Mi` | `1Gi` |
| `TRAEFIK_MEMORY_REQUEST` | `256Mi` | `256Mi` |
| `TRAEFIK_REPLICA_COUNT` | `1` | `2` |


## Operations

<!-- TODO: Add operations in service-insights/traefik.yaml → operations field -->

## Related


- [`apps/base/traefik/`](https://github.com/JiwooL0920/fleet-infra/tree/develop/apps/base/traefik/) — Kubernetes manifests
- [`base/services/traefik.yaml`](https://github.com/JiwooL0920/fleet-infra/blob/develop/base/services/traefik.yaml) — Flux Kustomization
- [`base/services/environment.env`](https://github.com/JiwooL0920/fleet-infra/blob/develop/base/services/environment.env) — environment variables

---
*Generated from [service-catalog.json](https://github.com/JiwooL0920/fleet-infra/blob/develop/service-catalog.json) at commit `2d36e22` · catalog sha `4d088b0b3a67b4c4`*