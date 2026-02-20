# Promtail

Log shipping agent for Loki.

## Overview

| Property | Value |
|----------|-------|
| **Namespace** | `loki` |
| **Type** | DaemonSet |
| **Layer** | Logging (Layer 2) |
| **Dependencies** | Loki |

## Purpose

Promtail is an agent that ships container logs to Loki. It runs as a DaemonSet, collecting logs from all pods on each node.

## Features

- **Auto-discovery** - Discovers pods via Kubernetes API
- **Label extraction** - Extracts labels from log lines
- **Pipeline stages** - Transform logs before sending
- **Multiline support** - Handle stack traces and multiline logs
- **Efficient** - Low resource footprint

## Architecture

```mermaid
graph TB
    subgraph Node1
        P1[Pod A]
        P2[Pod B]
        PT1[Promtail]
    end
    
    subgraph Node2
        P3[Pod C]
        P4[Pod D]
        PT2[Promtail]
    end
    
    subgraph Central
        L[Loki]
    end
    
    P1 -->|logs| PT1
    P2 -->|logs| PT1
    P3 -->|logs| PT2
    P4 -->|logs| PT2
    PT1 -->|push| L
    PT2 -->|push| L
```

## Log Sources

Promtail collects logs from:

| Source | Path |
|--------|------|
| Container logs | `/var/log/pods/*/*/*.log` |
| Container runtime | `/var/lib/docker/containers/*/*.log` |

## Labels Added

Promtail automatically adds these labels:

- `namespace` - Kubernetes namespace
- `pod` - Pod name
- `container` - Container name
- `node_name` - Node where pod runs
- `app` - From pod labels

## Verification

```bash
# Check Promtail DaemonSet
kubectl get ds -n loki

# Check all Promtail pods
kubectl get pods -n loki -l app=promtail

# View Promtail logs
kubectl logs -n loki -l app=promtail --tail=100
```

## Troubleshooting

### Logs not being collected

```bash
# Check Promtail is on all nodes
kubectl get pods -n loki -l app=promtail -o wide

# Check Promtail config
kubectl get cm -n loki promtail -o yaml

# Check for errors
kubectl logs -n loki -l app=promtail | grep -i error
```

### High memory usage

1. Check log volume
2. Reduce pipeline complexity
3. Increase resource limits if needed

## Related

- [Loki](loki.md) - Log storage
- [Kube-Prometheus-Stack](kube-prometheus-stack.md) - Grafana for querying
