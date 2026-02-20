# RedisInsight

Redis management and visualization interface.

## Overview

| Property | Value |
|----------|-------|
| **Namespace** | `redis-sentinel` |
| **Type** | HelmRelease |
| **Layer** | Database UI (Layer 6) |
| **Dependencies** | Redis Sentinel |
| **Access** | `http://redis.local` |

## Purpose

RedisInsight provides a graphical interface for managing Redis, browsing keys, executing commands, and analyzing memory usage.

## Features

- **Browser** - Navigate and search keys
- **CLI** - Built-in Redis CLI
- **Profiler** - Real-time command monitoring
- **Memory Analysis** - Memory usage breakdown
- **Slow Log** - Identify slow commands
- **Pub/Sub** - Monitor channels

## Access

=== "Local DNS (Recommended)"

    ```
    http://redis.local
    ```

=== "Port Forwarding"

    ```bash
    kubectl port-forward -n redis-sentinel svc/redisinsight 8001:8001
    ```
    
    Then visit `http://localhost:8001`

## Connecting to Redis

### Add Database

1. Click "Add Redis Database"
2. Configure:

| Field | Value |
|-------|-------|
| Host | `redis-sentinel-master.redis-sentinel` |
| Port | `6379` |
| Password | From secret |

### Get Password

```bash
kubectl get secret redis-sentinel -n redis-sentinel \
  -o jsonpath='{.data.redis-password}' | base64 -d
```

## Common Tasks

### Browse Keys

1. Select database
2. Use "Browser" tab
3. Search or filter keys
4. Click key to view value

### Execute Commands

1. Open "CLI" tab
2. Enter Redis commands
3. View output

```redis
# Example commands
KEYS *
GET mykey
SET mykey "value"
INFO
```

### Monitor Commands

1. Open "Profiler" tab
2. Click "Start Profiler"
3. Watch real-time commands

### Analyze Memory

1. Open "Analysis" tab
2. Click "New Report"
3. Review memory breakdown by key pattern

## Verification

```bash
# Check pod status
kubectl get pods -n redis-sentinel -l app.kubernetes.io/name=redisinsight

# Check logs
kubectl logs -n redis-sentinel -l app.kubernetes.io/name=redisinsight
```

## Troubleshooting

### Cannot connect to Redis

1. Verify Redis is running
2. Check password is correct
3. Verify service DNS

```bash
# Test connection from RedisInsight pod
kubectl exec -it -n redis-sentinel deploy/redisinsight -- \
  redis-cli -h redis-sentinel-master.redis-sentinel -a <password> ping
```

### UI not loading

```bash
# Check pod status
kubectl describe pod -n redis-sentinel -l app.kubernetes.io/name=redisinsight

# Check logs
kubectl logs -n redis-sentinel -l app.kubernetes.io/name=redisinsight
```

### Slow performance

1. Reduce key scan batch size
2. Avoid scanning large key spaces
3. Use specific key patterns

## Related

- [Redis Sentinel](redis.md) - Redis cluster
- [External Secrets](external-secrets.md) - Password management
