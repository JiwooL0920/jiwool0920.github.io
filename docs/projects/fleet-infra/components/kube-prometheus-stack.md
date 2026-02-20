# Kube-Prometheus-Stack

Complete monitoring solution with Prometheus, Grafana, and AlertManager.

## Overview

| Property | Value |
|----------|-------|
| **Namespace** | `monitoring` |
| **Type** | HelmRelease |
| **Layer** | Monitoring (Layer 1) |
| **Dependencies** | Foundation services |
| **Access** | `http://grafana.local`, `http://prometheus.local`, `http://alertmanager.local` |

## Purpose

Kube-Prometheus-Stack provides a complete monitoring solution for Kubernetes, including metrics collection, visualization, and alerting.

## Components

### Prometheus

- Metrics collection and storage
- PromQL query language
- Alert rule evaluation
- Service discovery

### Grafana

- Visualization dashboards
- Multi-datasource support
- Alerting integration
- Pre-built Kubernetes dashboards

### AlertManager

- Alert routing and grouping
- Notification channels (email, Slack, PagerDuty)
- Silencing and inhibition
- Alert deduplication

### Node Exporter

- Host-level metrics
- CPU, memory, disk, network
- DaemonSet deployment

### kube-state-metrics

- Kubernetes object metrics
- Deployment, pod, service states
- Resource quotas and limits

## Access

=== "Grafana"

    ```
    http://grafana.local
    ```
    
    Default credentials stored in External Secrets.

=== "Prometheus"

    ```
    http://prometheus.local
    ```

=== "AlertManager"

    ```
    http://alertmanager.local
    ```

## Environment Differences

| Setting | Dev | Prod |
|---------|-----|------|
| Storage | 20Gi | 50Gi |
| Retention | 7 days | 30 days |
| Replicas | 1 | 2 |

## Pre-built Dashboards

The stack includes dashboards for:

- Kubernetes cluster overview
- Node resource usage
- Pod resource usage
- Namespace overview
- Persistent volume usage

## Verification

```bash
# Check all pods
kubectl get pods -n monitoring

# Check Prometheus targets
kubectl port-forward -n monitoring svc/prometheus-kube-prometheus-prometheus 9090:9090
# Then visit http://localhost:9090/targets
```

## Troubleshooting

### Grafana not accessible

```bash
# Check Grafana pod
kubectl get pods -n monitoring -l app.kubernetes.io/name=grafana

# Check logs
kubectl logs -n monitoring deploy/kube-prometheus-stack-grafana
```

### Prometheus not scraping

```bash
# Check ServiceMonitors
kubectl get servicemonitor -n monitoring

# Check Prometheus config
kubectl get secret -n monitoring prometheus-kube-prometheus-prometheus -o jsonpath='{.data.prometheus\.yaml\.gz}' | base64 -d | gunzip
```

## Related

- [Loki](loki.md) - Log aggregation
- [Jaeger](jaeger.md) - Distributed tracing
- [Runbooks](../runbooks.md) - Operations guide
