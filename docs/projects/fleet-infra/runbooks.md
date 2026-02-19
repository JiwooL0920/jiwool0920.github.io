# Runbooks

Operational procedures for fleet-infra.

## Common Operations

### Force Reconciliation

```bash
flux reconcile kustomization flux-system --with-source
```

### Check Flux Status

```bash
flux get all -A
```

### Suspend/Resume Reconciliation

```bash
# Suspend
flux suspend kustomization <name>

# Resume
flux resume kustomization <name>
```

## Troubleshooting

### Kustomization Stuck

!!! warning "Check for drift"
    If a kustomization is stuck, check for manual changes in the cluster.

```bash
flux get kustomization <name> -o yaml
kubectl describe kustomization <name> -n flux-system
```

### Failed Helm Release

```bash
flux get helmrelease <name> -n <namespace>
helm history <name> -n <namespace>
```
