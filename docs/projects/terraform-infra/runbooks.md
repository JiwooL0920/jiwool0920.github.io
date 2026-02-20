# Runbooks

Operational procedures and troubleshooting guides for terraform-infra.

## Initial Setup

### Prerequisites

Install required tools:

```bash
# Container runtime (choose one)
brew install colima
# or use Docker Desktop

# Kubernetes tools
brew install kubectl kind

# Infrastructure as Code
brew install opentofu
# or: brew install terraform

# Optional: FluxCD CLI
brew install flux
```

Quick all-in-one install:

```bash
brew install colima kubectl kind opentofu flux
```

Verify installation:

```bash
tofu version        # or: terraform version
kind version
kubectl version --client
docker ps           # Verify container runtime
```

---

### Start Docker Engine (Colima)

```bash
# Start with recommended resources
colima start --cpu 8 --memory 16 --disk 80

# Verify status
colima list
```

!!! warning "Resource Requirements"
    **Recommended**: 8 CPU, 16GB RAM, 80GB disk  
    **Minimum**: 6 CPU, 12GB RAM, 60GB disk

---

### Initialize Infrastructure

```bash
# Step 1: Verify all tools are available
make install-tools
```

**Expected output:**

```
✓ All required tools are installed
✓ Using: /opt/homebrew/bin/tofu

Tool versions:
OpenTofu v1.8.x
kind v0.x.x
```

```bash
# Step 2: Initialize OpenTofu/Terraform
# Creates terraform.tfvars from example, downloads providers
make init
```

This will:

- Create `main/terraform.tfvars` with default values
- Download the KIND provider
- Initialize the local state backend

---

### Preview and Apply

```bash
# Step 3: Preview what will be created
make plan
```

You'll see:

- 1 KIND cluster resource (`dev-services-amer`)
- 3 nodes (1 control-plane + 2 workers)
- Port mappings for Traefik ingress (80/443)

```bash
# Step 4: Create the cluster
make apply

# Review the plan and type 'yes' when prompted
```

!!! info "Cluster Creation Time"
    Initial provisioning takes ~2-3 minutes. OpenTofu creates the KIND cluster, configures networking and port mappings, and waits for all nodes to be ready.

---

### Verify Cluster

```bash
# Comprehensive cluster information
make cluster-info
```

**Expected output:**

```
==================== Cluster Information ====================

KIND Clusters:
  dev-services-amer

Kubernetes Nodes:
NAME                             STATUS   ROLES           AGE   VERSION
dev-services-amer-control-plane  Ready    control-plane   2m    v1.31.0
dev-services-amer-worker         Ready    <none>          2m    v1.31.0
dev-services-amer-worker2        Ready    <none>          2m    v1.31.0

Current kubectl context:
  kind-dev-services-amer

Outputs:
  cluster_name = "dev-services-amer"
  cluster_endpoint = "https://127.0.0.1:xxxxx"
  kubectl_context = "kind-dev-services-amer"
```

```bash
# Test cluster access
kubectl get nodes
kubectl get namespaces
kubectl cluster-info
```

---

### Next Steps: Bootstrap FluxCD

After the cluster is running, bootstrap FluxCD using the [fleet-infra](https://github.com/JiwooL0920/fleet-infra) repository:

```bash
# Get the bootstrap command from terraform output
make output

# The flux_bootstrap_command output provides the exact command
flux bootstrap github \
    --owner=<your-github-username> \
    --repository=fleet-infra \
    --branch=develop \
    --path=./clusters/stages/dev/clusters/services-amer \
    --personal
```

---

## Common Operations

### View Cluster Information

```bash
# Full cluster status
make cluster-info

# Terraform outputs only
make output

# kubectl node status
kubectl get nodes -o wide
```

---

### Update Kubernetes Version

1. Edit `main/terraform.tfvars`:
    ```hcl
    kind_release_version = "v1.32.0"  # Change version
    ```

2. Apply the change:
    ```bash
    make plan    # Preview — will show cluster recreation
    make apply   # Apply changes
    ```

!!! warning "Cluster Recreation"
    Changing the Kubernetes version requires destroying and recreating the cluster. All workloads will be lost.

---

### Customize Cluster Configuration

Edit `main/terraform.tfvars` to change any setting:

| Variable | Default | Description |
|----------|---------|-------------|
| `kind_cluster_name` | `"dev-services-amer"` | Cluster name |
| `kind_release_version` | `"v1.31.0"` | Kubernetes version |
| `env` | `"dev"` | Environment label |
| `cluster_type` | `"services"` | Cluster type/purpose |
| `target_region` | `"us-west-1"` | Region (for tagging) |

After editing:

```bash
make plan    # Preview changes
make apply   # Apply changes
```

---

### Rebuild Cluster from Scratch

```bash
# Quick way
make restart

# Or step-by-step
make destroy
make apply
```

---

### Destroy Cluster

```bash
make destroy

# Confirm with 'yes' when prompted
```

This removes:

- KIND cluster and all containers
- Infrastructure state (`.tfstate` file)

!!! info "Preserved Files"
    Configuration files (`terraform.tfvars`, `.tf` files) are **not** deleted by `make destroy`.

---

### Switch kubectl Context

If you have multiple clusters:

```bash
# Switch to this cluster
make use-context

# Verify
kubectl config current-context
# Output: kind-dev-services-amer
```

---

## Alternative: Manual Commands (Without Makefile)

If you prefer not to use the Makefile:

```bash
cd main

# Copy and edit configuration
cp terraform.tfvars.example terraform.tfvars
vim terraform.tfvars  # Customize if needed

# Initialize
tofu init
# or: terraform init

# Preview
tofu plan

# Apply
tofu apply

# Verify
kind get clusters
kubectl get nodes
```

---

## Troubleshooting

### Docker/Colima Not Running

!!! danger "Error: `Cannot connect to the Docker daemon`"

```bash
# Check status
docker ps

# If using Colima
colima status
colima start --cpu 8 --memory 16 --disk 80

# If using Docker Desktop — start the application
```

---

### Port 80 or 443 Already in Use

!!! danger "Error: `port is already allocated`"

```bash
# Find what's using the ports
sudo lsof -i :80
sudo lsof -i :443

# Option 1: Stop the conflicting service
# Option 2: Modify port mappings in modules/homelab/tf-kind-base/main.tf
```

---

### Cluster Creation Fails

!!! danger "Error: Various cluster creation errors"

```bash
# Clean up failed attempt
kind delete cluster --name dev-services-amer

# Restart container runtime
colima restart  # or restart Docker Desktop

# Verify Docker is working
docker ps

# Try again
make apply
```

---

### kubectl Can't Connect to Cluster

!!! danger "Error: `The connection to the server ... was refused`"

```bash
# Check cluster exists
kind get clusters

# Check current context
kubectl config current-context

# Switch to the correct context
make use-context
# or manually:
kubectl config use-context kind-dev-services-amer

# Verify connection
kubectl cluster-info
kubectl get nodes
```

---

### Missing tofu/terraform Command

!!! danger "Error: Command not found"

```bash
# Install OpenTofu
brew install opentofu

# Or install Terraform
brew install terraform

# Verify installation
which tofu
tofu version
```

---

### Wrong Kubernetes Version

!!! warning "Problem: Cluster has wrong Kubernetes version"

```bash
# Edit configuration
vim main/terraform.tfvars

# Change this line:
kind_release_version = "v1.31.0"  # Set desired version

# Recreate cluster (version change requires rebuild)
make restart
```

---

### After Colima Restart, Services Don't Work

!!! warning "Problem: Control plane IP changed after Colima restart"

```bash
# In fleet-infra repo (after FluxCD is deployed)
cd /path/to/fleet-infra
make fix-control-plane
```

!!! info "Why This Happens"
    When Colima restarts, the Docker network is recreated and the KIND control plane gets a new IP address. The `fix-control-plane` target in fleet-infra updates the kubeconfig accordingly.

---

### Complete Reset

If everything is broken and you want to start fresh:

```bash
# 1. Delete the cluster
make destroy

# 2. Clean all cache files
make clean

# 3. Delete state (nuclear option)
rm main/terraform.tfstate*

# 4. Restart container runtime
colima restart

# 5. Start over
make init
make apply
```

!!! warning "Nuclear Option"
    Deleting `terraform.tfstate*` removes all knowledge of managed resources. Only do this if you've already destroyed the cluster or are prepared to manually clean up orphaned resources.

---

## Development Workflow

### Format and Validate

```bash
# Format all .tf files
make fmt

# Validate configuration syntax
make validate

# Run tflint (if installed)
make lint
```

---

### Dev Workflow (All-in-One)

```bash
# Format + validate + plan in one command
make dev
```

---

### Enabling Debug Logs

```bash
cd main
TF_LOG=DEBUG tofu apply
```

---

## Makefile Reference

| Command | Description |
|---------|-------------|
| `make help` | Show all available commands |
| `make install-tools` | Check and install required tools |
| `make init` | Initialize OpenTofu/Terraform |
| `make plan` | Preview infrastructure changes |
| `make apply` | Create or update cluster |
| `make destroy` | Delete cluster completely |
| `make cluster-info` | Show cluster status |
| `make output` | Show infrastructure outputs |
| `make cluster-create` | Alias for `make apply` |
| `make cluster-destroy` | Alias for `make destroy` |
| `make restart` | Destroy and recreate cluster |
| `make use-context` | Switch kubectl to this cluster |
| `make fmt` | Format all `.tf` files |
| `make validate` | Validate configuration syntax |
| `make lint` | Run tflint (if installed) |
| `make clean` | Remove cache files (preserves state) |
| `make dev` | Run fmt + validate + plan |
