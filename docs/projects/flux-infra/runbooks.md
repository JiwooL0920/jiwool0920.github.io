# Runbooks

Operational procedures and troubleshooting guides for fleet-infra.

## Initial Setup

### Prerequisites

Install required tools:

```bash
# Core Kubernetes tools
brew install kubectl kind flux

# Container runtime
brew install colima
# or use Docker Desktop

# Development tools
brew install pre-commit kubeconform kustomize yq
brew install yamllint shellcheck markdownlint-cli
brew install detect-secrets awscli
```

Verify installation:

```bash
kubectl version --client
kind version
flux version
pre-commit --version
kubeconform -v
```

---

### Start Docker Engine (Colima)

```bash
# Edit Colima configuration
colima edit
# or
vi ~/.colima/default/colima.yaml
```

!!! warning "Resource Requirements"
    **Recommended**: 8 CPU, 16GB RAM, 80GB disk  
    **Minimum**: 6 CPU, 12GB RAM, 60GB disk

```bash
# Start Colima
colima start

# Verify status
colima list
```

---

### Create Kind Cluster

```bash
# Create cluster with custom config
kind create cluster --config kind-config.yaml

# Verify cluster
kind get clusters
kubectl get nodes
```

---

### Bootstrap Flux

```bash
flux bootstrap github \
    --owner=<your-github-username> \
    --repository=fleet-infra \
    --branch=develop \
    --path=./clusters/stages/dev/clusters/services-amer \
    --personal
```

This will:

- Install Flux controllers on your cluster
- Connect Flux to your GitHub repository
- Track the `develop` branch
- Deploy services from `clusters/stages/dev/clusters/services-amer`

---

### Wait for Deployment

```bash
# Watch all Flux resources
flux get all --watch

# Check kustomizations
flux get kustomizations

# Check Helm releases
flux get helmreleases -A
```

!!! info "Deployment Time"
    Initial deployment takes 8-12 minutes due to parallel service deployment.

---

### Post-Bootstrap Setup

**Fix Control Plane IP (if needed):**

```bash
make fix-control-plane
```

**Setup Local DNS (Recommended):**

```bash
make setup-dns
```

This adds `.local` domain entries to `/etc/hosts` for accessing services via Traefik.

**Alternative - Port Forwarding:**

```bash
make port-forward
```

---

## Common Operations

### Force Reconciliation

```bash
# Reconcile with source refresh
flux reconcile kustomization flux-system --with-source

# Reconcile specific kustomization
flux reconcile kustomization <name>

# Reconcile Git source
flux reconcile source git flux-system
```

---

### Check Flux Status

```bash
# All Flux resources
flux get all -A

# Kustomizations only
flux get kustomizations

# Helm releases only
flux get helmreleases -A

# Sources
flux get sources git
```

---

### Suspend/Resume Reconciliation

```bash
# Suspend a kustomization
flux suspend kustomization <name>

# Resume
flux resume kustomization <name>

# Suspend a Helm release
flux suspend helmrelease <name> -n <namespace>

# Resume
flux resume helmrelease <name> -n <namespace>
```

---

### Check Application Health

```bash
# All pods across namespaces
kubectl get pods --all-namespaces

# Specific namespace
kubectl get pods -n <namespace>

# Watch pods
kubectl get pods -A -w
```

---

## Database Operations

### PostgreSQL

```bash
# Check cluster status
kubectl get cluster -n cnpg-system
kubectl describe cluster postgresql-cluster -n cnpg-system

# Get credentials
kubectl get secret postgresql-cluster-app -n cnpg-system \
  -o jsonpath='{.data.username}' | base64 -d
kubectl get secret postgresql-cluster-app -n cnpg-system \
  -o jsonpath='{.data.password}' | base64 -d

# Connect via psql
kubectl exec -it postgresql-cluster-1 -n cnpg-system -- psql -U postgres

# Check databases
kubectl exec -it postgresql-cluster-1 -n cnpg-system -- psql -U postgres -c "\l"
```

Pre-configured databases:

| Database | Purpose |
|----------|---------|
| `appdb` | General application database |
| `n8n` | N8N workflow data |
| `temporal` | Temporal workflow state |
| `temporal_visibility` | Temporal search |

---

### Redis Sentinel

```bash
# Check pods
kubectl get pods -n redis-sentinel

# View logs
kubectl logs -n redis-sentinel <redis-pod-name>

# Connect to Redis
kubectl exec -it <redis-pod> -n redis-sentinel -- redis-cli
```

---

### ScyllaDB

```bash
# Check cluster status
kubectl get scyllacluster -n scylla
kubectl describe scyllacluster scylla -n scylla

# Check pods
kubectl get pods -n scylla
kubectl get pods -n scylla-operator

# View logs
kubectl logs -n scylla <scylla-pod-name>

# Test Alternator endpoint (DynamoDB API)
curl http://scylla.local/
```

---

## Secret Management

### Verify LocalStack Secrets

```bash
# Port forward to LocalStack
kubectl port-forward -n localstack svc/localstack 4566:4566

# List all secrets
aws --endpoint-url=http://localhost:4566 secretsmanager list-secrets \
  --region us-east-1

# Get a specific secret
aws --endpoint-url=http://localhost:4566 secretsmanager get-secret-value \
  --secret-id redis/credentials/password --region us-east-1
```

---

### External Secrets Status

```bash
# Check all ExternalSecrets
kubectl get externalsecrets --all-namespaces

# Check SecretStores
kubectl get secretstore --all-namespaces
kubectl get clustersecretstore

# Force secret synchronization
kubectl annotate externalsecret <secret-name> -n <namespace> \
  force-sync=$(date +%s)
```

---

## Troubleshooting

### Kustomization Stuck

!!! warning "Check for drift"
    If a kustomization is stuck, check for manual changes in the cluster.

```bash
# Get detailed status
flux get kustomization <name> -o yaml

# Describe the resource
kubectl describe kustomization <name> -n flux-system

# Check events
kubectl get events -n flux-system --sort-by='.lastTimestamp'
```

---

### Failed Helm Release

```bash
# Check release status
flux get helmrelease <name> -n <namespace>

# View Helm history
helm history <name> -n <namespace>

# Get detailed error
kubectl describe helmrelease <name> -n <namespace>

# Check Helm controller logs
kubectl logs -n flux-system deploy/helm-controller
```

---

### Pods Not Starting

```bash
# Describe the pod
kubectl describe pod <pod-name> -n <namespace>

# Check events
kubectl get events -n <namespace> --sort-by='.lastTimestamp'

# View logs
kubectl logs <pod-name> -n <namespace>

# Check previous container logs
kubectl logs <pod-name> -n <namespace> --previous
```

---

### Service Access Issues

**Local DNS not working:**

```bash
# Verify DNS entries
cat /etc/hosts | grep "Kubernetes local services"

# Re-run DNS setup
make setup-dns

# Check Traefik is running
kubectl get pods -n traefik

# Verify IngressRoutes
kubectl get ingressroute --all-namespaces
```

**Port forwarding fails:**

```bash
# Check service exists
kubectl get svc -n <namespace>

# Kill processes on occupied ports
lsof -ti:<port> | xargs kill -9

# Restart port forwarding
make port-forward
```

---

### External Secrets Not Syncing

```bash
# Check ExternalSecret status
kubectl describe externalsecret <name> -n <namespace>

# Check ClusterSecretStore
kubectl describe clustersecretstore localstack

# Verify LocalStack connectivity
curl http://localhost:4566/_localstack/health

# Check External Secrets Operator logs
kubectl logs -n external-secrets deploy/external-secrets
```

---

### Flux Not Reconciling

```bash
# Check all failed resources
flux get all --status-selector ready=false

# Check source controller
kubectl logs -n flux-system deploy/source-controller

# Check kustomize controller
kubectl logs -n flux-system deploy/kustomize-controller

# Force full reconciliation
flux reconcile source git flux-system
flux reconcile kustomization flux-system --with-source
```

---

## After Colima Restart

When Colima restarts, services start automatically in dependency order:

```bash
# Run post-restart setup
make post-colima-restart

# This fixes control plane IP configuration
```

!!! info "Automatic Recovery"
    - Dependencies are handled by Flux `dependsOn` clauses
    - Extended timeouts (10-15m) allow for slower startups
    - Health checks prevent premature service starts
    - Secrets are restored from LocalStack persistence

---

## Development Workflow

### Pre-commit Hooks

```bash
# Install hooks
make precommit-install

# Run on all files
make precommit-run

# Run on staged files only
make precommit-run-staged

# Update hooks
make precommit-update
```

**What gets validated:**

- YAML syntax and formatting
- Kubernetes/Flux manifest validation
- Kustomize overlay validation
- Flux API version compatibility
- Secret detection
- Markdown and shell script linting

---

### Validate Manifests

```bash
# Validate all
make validate-all

# Individual validations
make validate-manifests   # Kubeconform
make validate-flux        # Flux API version
make validate-kustomize   # Kustomize overlay build
```

---

### Making Infrastructure Changes

1. Create feature branch from `develop`
2. Make changes to configurations
3. Test with Flux dry-run:
   ```bash
   flux diff kustomization apps --path ./base
   ```
4. Commit and push
5. Create PR to `develop`
6. After merge, changes auto-deploy to dev
7. Validate, then merge to `main` for production

---

### Adding New Applications

1. Create base configuration:
   ```
   apps/base/<app-name>/
   ├── namespace.yaml
   ├── kustomization.yaml
   └── helmrelease.yaml
   ```

2. Create service kustomization in `base/services/<app-name>.yaml`:
   ```yaml
   apiVersion: kustomize.toolkit.fluxcd.io/v1
   kind: Kustomization
   metadata:
     name: <app-name>
     namespace: flux-system
   spec:
     interval: 10m0s
     sourceRef:
       kind: GitRepository
       name: flux-system
     path: ./apps/base/<app-name>
     prune: true
     wait: true
     timeout: 10m0s
     dependsOn:
       - name: <dependency-service>
     postBuild:
       substituteFrom:
         - kind: ConfigMap
           name: cluster-vars
   ```

3. Add to `base/services/kustomization.yaml` resources list

4. Test in development environment first

---

### Enabling/Disabling Services

**Disable:**
```yaml
# In base/services/kustomization.yaml
resources:
  # - crossplane.yaml  # Commented out = disabled
```

**Enable:**
```yaml
resources:
  - crossplane.yaml  # Uncommented = enabled
```

Flux will reconcile automatically after the change is committed.

---

## Makefile Reference

| Command | Description |
|---------|-------------|
| `make help` | Show all available targets |
| `make setup-dns` | Setup local DNS for Traefik ingress |
| `make port-forward` | Start port forwarding for all services |
| `make fix-control-plane` | Fix control plane IP after Colima restart |
| `make post-colima-restart` | Complete post-restart setup |
| `make precommit-install` | Install pre-commit hooks |
| `make precommit-run` | Run pre-commit on all files |
| `make validate-all` | Validate all manifests |
