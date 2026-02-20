---
date: 2026-02-20
categories:
  - Infrastructure
  - Kubernetes
tags:
  - bottlerocket
  - kubernetes
  - aws
  - eks
  - security
  - karpenter
authors:
  - jiwoo
---

# Migrating EKS Nodes to Bottlerocket: Architecture, Operations, and Lessons Learned

After migrating multiple EKS clusters from Amazon Linux 2 to Bottlerocket, I want to share the architecture differences, what changed operationally, the EBS snapshot workflow we built for image caching, and the production challenges we hit along the way.

<!-- more -->

## Why Bottlerocket?

Amazon Linux 2 (AL2) is a general-purpose Linux distribution — it ships with a package manager, SSH, and a full userland. That flexibility comes at a cost: larger attack surface, mutable state, and operational patterns (SSH + bash scripts) that don't align well with Kubernetes-native workflows.

Bottlerocket is AWS's container-optimized OS, purpose-built to run containers and nothing else. The migration was driven by security posture, operational simplicity, and node provisioning speed.

---

## Architecture Deep Dive

Understanding Bottlerocket's architecture explains why the migration was worth the effort.

### Container-Optimized Minimal OS

Bottlerocket ships exactly three things: **containerd**, **kubelet**, and minimal system services. That's it.

- No package manager (no `yum`, no `apt`)
- No SSH by default
- No user-installed software

This results in roughly **80% smaller attack surface** compared to a general-purpose Linux distribution.

### Immutable Root Filesystem

System components are **read-only at runtime**. You cannot modify them. Configuration happens through declarative TOML files, not imperative shell scripts. Any changes require a full image update — not in-place package installs.

This is a fundamental shift from how most teams operate with AL2.

### Dual-Disk Architecture

Bottlerocket separates the OS and data onto **two independent disks**:

```mermaid
graph LR
    subgraph "Disk 1: OS Volume (/dev/xvda)"
        direction TB
        A["Read-only root filesystem<br/>~20 GB"]
    end

    subgraph "Disk 2: Data Volume (/dev/xvdb)"
        direction TB
        B["/var/lib/containerd<br/>/var/log<br/>50–100 GB"]
    end
```

The key benefit: **container storage is completely isolated from the OS** and survives OS updates. Your running containers and their data are unaffected when the OS partition is updated.

### A/B Partition Updates

The OS disk has two partitions — **Partition A** and **Partition B**. One is active, the other is passive.

```mermaid
sequenceDiagram
    participant Active as Partition A (Active)
    participant Passive as Partition B (Passive)
    participant Boot as Bootloader

    Note over Active: Running current OS version
    Active->>Passive: Write update to passive partition
    Boot->>Passive: Reboot → swap to Partition B
    alt Boot succeeds
        Note over Passive: Partition B is now Active
    else Boot fails
        Boot->>Active: Automatic rollback to Partition A
    end
```

When an update arrives:

1. It writes to the **passive** partition
2. On reboot, an **atomic swap** makes the passive partition active
3. If the boot fails, it **automatically rolls back** to the previous partition

Zero-downtime updates with a built-in safety net.

### Security Enforcement

- **SELinux in enforcing mode** by default (AL2 typically runs permissive)
- **IMDSv2 required** — blocks SSRF attacks on the metadata service
- Fewer binaries overall → fewer CVEs to track and easier compliance audits

### Kubernetes-Native Operation Model

There's no more "SSH into the node and fix things." Everything flows through Kubernetes:

- **Configuration** → Kubernetes user data (TOML)
- **Debugging** → ephemeral admin containers via `kubectl`
- **Monitoring** → metrics and logs, not shell access

---

## The Admin Container: Debugging Without SSH

Since there's no SSH, how do you debug node-level issues? Bottlerocket provides an **admin container** — a special privileged container you temporarily deploy on a node for low-level access.

### How It Works

```bash
# Launch an admin container on a specific node
kubectl debug node/<node-name> -it --image=public.ecr.aws/bottlerocket/bottlerocket-admin:latest \
  --profile=sysadmin

# Inside the admin container, useful commands:
sheltie           # Enter the host namespace
journalctl -u kubelet    # Check kubelet logs
crictl ps                # List running containers
mount | grep xvd         # Inspect disk mounts
cat /etc/bottlerocket/config.toml  # View node configuration
```

Key characteristics:

- Runs with **elevated privileges** (`--profile=sysadmin`)
- **Mounts the host filesystem** for full node inspection
- **Ephemeral** — you delete it when done

For most day-to-day operations (checking logs, viewing metrics, inspecting resources), standard Kubernetes tooling like `kubectl top node` or your observability stack is still the recommended approach. The admin container is for when you need to go deeper.

---

## Operational Impact: What Changed

Here's a concrete comparison of how daily operations shifted:

| Area | Amazon Linux 2 | Bottlerocket |
|------|---------------|-------------|
| **Node debugging** | SSH + shell commands | Ephemeral admin container via `kubectl debug node` |
| **Config changes** | Bash scripts applied via SSH | TOML config via Kubernetes user data |
| **OS patching** | Scheduled maintenance window (`yum update` + reboot) | Atomic A/B partition update, zero downtime |
| **AMI management** | Custom AMIs with pre-pulled images (Packer builds) | AWS base AMI, no customization needed |
| **Image caching** | Bake container images into custom AMIs | Attach EBS snapshots with cached images |
| **Multi-region** | Copy custom AMIs across regions | Replicate EBS snapshots across regions |
| **GPU drivers** | Manual install and update | Built into AWS Bottlerocket NVIDIA AMI variants |
| **Node provisioning** | ~4 minutes to join cluster | ~30 seconds (87% reduction) |

The provisioning speed improvement was immediately noticeable during migration. For Karpenter-based autoscaling, this means much faster response to workload spikes and less time waiting for capacity.

---

## EBS Snapshot Workflow for Image Caching

This was a significant part of the migration effort. The problem: when a pod gets scheduled on a fresh node without cached images, pulling large container images can take **40+ minutes** — unacceptable for user-facing workloads.

### The Old Approach (AL2)

With AL2, we maintained **custom AMIs** with pre-pulled images:

1. A CI pipeline used **HashiCorp Packer** to build custom AMIs
2. Separate AMIs for CPU and GPU across regions
3. Every time new container images were released, **rebuild all AMIs** and replicate them across regions
4. AMI IDs were hardcoded in infrastructure config and manually updated

This was a lot of maintenance overhead.

### The New Approach (Bottlerocket)

With Bottlerocket, we use **AWS's base AMI** (no customization) and manage **EBS snapshots** for image caching:

```mermaid
flowchart TD
    A["New container image released"] --> B["CI workflow triggered"]
    B --> C["Provision temporary<br/>CPU + GPU instances"]
    C --> D["Pull container images<br/>onto data volumes"]
    D --> E["Create EBS snapshots<br/>of data volumes"]
    E --> F["Store snapshot IDs<br/>in SSM Parameter Store"]
    F --> G["Karpenter EC2NodeClass<br/>references latest snapshot ID"]
    G --> H["New nodes boot with<br/>cached images attached"]
```

How it works:

1. When new container images are released, automation provisions temporary CPU and GPU instances
2. Images are pulled onto those instances' data volumes
3. **EBS snapshots** are created from those data volumes
4. Snapshot IDs are saved to **SSM Parameter Store**, so the node provisioner (Karpenter) always references the latest snapshot automatically
5. In the **EC2NodeClass** `blockDeviceMappings`, we reference those snapshot IDs
6. When Karpenter provisions a node, it uses the base Bottlerocket AMI and **attaches the snapshot as the data volume** — the node boots with all images already cached

This is AWS's officially recommended method. Packer doesn't even support Bottlerocket AMI customization. It's a much cleaner architecture with significantly better maintainability.

### EKS Cluster Configuration (Terraform)

Before configuring Karpenter, the **base EKS cluster itself** needs to run Bottlerocket. The EKS managed node group that runs cluster-critical components (CoreDNS, Karpenter itself, etc.) must also be migrated — these nodes aren't managed by Karpenter, they're managed by the EKS control plane via the Terraform EKS module.

If you're using the popular [`terraform-aws-modules/eks`](https://registry.terraform.io/modules/terraform-aws-modules/eks/aws/latest) module, the key change is setting `ami_type` to `BOTTLEROCKET_x86_64` (or `BOTTLEROCKET_ARM_64`) in your managed node group:

```hcl
module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 20.0"

  cluster_name    = "my-cluster"
  cluster_version = "1.31"

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets

  cluster_endpoint_public_access = true

  eks_managed_node_groups = {
    # System node group — runs Karpenter, CoreDNS, etc.
    system = {
      # Bottlerocket AMI type instead of AL2
      ami_type       = "BOTTLEROCKET_x86_64"
      instance_types = ["m6i.xlarge"]

      min_size     = 2
      max_size     = 4
      desired_size = 2

      labels = {
        "node-role" = "system"
      }

      taints = {
        system = {
          key    = "CriticalAddonsOnly"
          value  = "true"
          effect = "NO_SCHEDULE"
        }
      }

      # IMDSv2 settings — hop limit must be 2 for containerized workloads
      # (containers add an extra network hop; default of 1 blocks pod IMDS access)
      metadata_options = {
        http_endpoint               = "enabled"
        http_tokens                 = "required"
        http_put_response_hop_limit = 2
      }

      # Bottlerocket uses TOML for node configuration (not bash scripts)
      # This replaces the AL2 pattern of pre/post bootstrap user data
      bootstrap_extra_args = <<-EOT
        [settings.pki.custom-ca]
        trusted = true
        data = "-----BEGIN CERTIFICATE-----\nMIIBxTCCAWugAwIBAgIUZ3M...your-base64-cert-data...==\n-----END CERTIFICATE-----"
      EOT
    }
  }
}
```

!!! warning "Two separate layers"
    Don't confuse the Terraform EKS module's managed node groups with Karpenter's NodePools. They serve different purposes:

    - **Terraform EKS managed node groups** → bootstrap nodes that run cluster infrastructure (Karpenter, CoreDNS, kube-proxy). These exist before Karpenter is even installed.
    - **Karpenter NodePools + EC2NodeClasses** → dynamically provisioned nodes for application workloads. Karpenter manages their lifecycle.

    Both need to be configured for Bottlerocket independently.

### Karpenter Configuration

With the base cluster running Bottlerocket, now configure Karpenter to provision application workload nodes on Bottlerocket as well. This is where the EBS snapshot caching comes in.

**EC2NodeClass** — defines the node template, including the Bottlerocket AMI family and EBS snapshot-backed data volume:

```yaml
apiVersion: karpenter.k8s.aws/v1
kind: EC2NodeClass
metadata:
  name: default
spec:
  role: "KarpenterNodeRole-my-cluster"
  amiFamily: Bottlerocket

  # IMDSv2 — hop limit must be 2 for containerized workloads
  metadataOptions:
    httpEndpoint: enabled
    httpTokens: required
    httpPutResponseHopLimit: 2

  # Bottlerocket user data is TOML, not bash
  userData: |
    [settings.pki.custom-ca]
    trusted = true
    data = "-----BEGIN CERTIFICATE-----\nMIIBxTCCAWugAwIBAgIUZ3M...your-base64-cert-data...==\n-----END CERTIFICATE-----"

    [settings.kubernetes]
    max-pods = 110

  subnetSelectorTerms:
    - tags:
        karpenter.sh/discovery: "my-cluster"
  securityGroupSelectorTerms:
    - tags:
        karpenter.sh/discovery: "my-cluster"

  blockDeviceMappings:
    # Disk 1: OS volume
    - deviceName: /dev/xvda
      ebs:
        volumeSize: 20Gi
        volumeType: gp3
        encrypted: true

    # Disk 2: Data volume — attach EBS snapshot with cached images
    - deviceName: /dev/xvdb
      ebs:
        volumeSize: 100Gi
        volumeType: gp3
        encrypted: true
        # Reference the snapshot containing pre-pulled container images
        snapshotID: "snap-0123456789abcdef0"

  tags:
    environment: production
    managed-by: karpenter
```

**NodePool** — defines scheduling constraints, instance types, and scaling behavior:

```yaml
apiVersion: karpenter.sh/v1
kind: NodePool
metadata:
  name: default
spec:
  template:
    metadata:
      labels:
        workload-type: general
    spec:
      nodeClassRef:
        group: karpenter.k8s.aws
        kind: EC2NodeClass
        name: default
      requirements:
        - key: kubernetes.io/arch
          operator: In
          values: ["amd64"]
        - key: karpenter.sh/capacity-type
          operator: In
          values: ["on-demand", "spot"]
        - key: karpenter.k8s.aws/instance-category
          operator: In
          values: ["m", "c", "r"]
        - key: karpenter.k8s.aws/instance-generation
          operator: Gt
          values: ["4"]
      # Karpenter auto-expires nodes for rolling updates
      expireAfter: 720h
  disruption:
    consolidationPolicy: WhenEmptyOrUnderutilized
    consolidateAfter: 1m
  # Cluster-wide resource limits
  limits:
    cpu: "1000"
    memory: 1000Gi
```

For GPU workloads, use a separate NodePool and EC2NodeClass with `amiFamily: Bottlerocket` and NVIDIA-variant instance types:

```yaml
apiVersion: karpenter.k8s.aws/v1
kind: EC2NodeClass
metadata:
  name: gpu
spec:
  role: "KarpenterNodeRole-my-cluster"
  # Bottlerocket NVIDIA variants have built-in GPU support
  amiFamily: Bottlerocket

  # IMDSv2 — hop limit must be 2 for containerized workloads
  metadataOptions:
    httpEndpoint: enabled
    httpTokens: required
    httpPutResponseHopLimit: 2

  subnetSelectorTerms:
    - tags:
        karpenter.sh/discovery: "my-cluster"
  securityGroupSelectorTerms:
    - tags:
        karpenter.sh/discovery: "my-cluster"

  blockDeviceMappings:
    - deviceName: /dev/xvda
      ebs:
        volumeSize: 20Gi
        volumeType: gp3
        encrypted: true
    - deviceName: /dev/xvdb
      ebs:
        volumeSize: 200Gi
        volumeType: gp3
        encrypted: true
        # GPU workloads typically have larger images
        snapshotID: "snap-0abcdef1234567890"
---
apiVersion: karpenter.sh/v1
kind: NodePool
metadata:
  name: gpu
spec:
  template:
    metadata:
      labels:
        workload-type: gpu
    spec:
      nodeClassRef:
        group: karpenter.k8s.aws
        kind: EC2NodeClass
        name: gpu
      requirements:
        - key: karpenter.k8s.aws/instance-category
          operator: In
          values: ["g", "p"]
        - key: karpenter.sh/capacity-type
          operator: In
          values: ["on-demand"]
      taints:
        - key: nvidia.com/gpu
          effect: NoSchedule
      expireAfter: 720h
  disruption:
    consolidationPolicy: WhenEmpty
    consolidateAfter: 5m
  limits:
    cpu: "200"
    memory: 800Gi
```

!!! tip
    Store snapshot IDs in **SSM Parameter Store** and reference them dynamically in your infrastructure-as-code (e.g., Terraform or Helm values) rather than hardcoding them. This way, when the CI pipeline creates new snapshots, Karpenter picks up the latest cached images automatically.

!!! note
    This snapshot-based approach only applies to clusters that require large image caching. Standard service clusters don't need it.

---

## Production Challenges and Lessons

### Mass Image Pulls During Migration

During one cluster migration, all deployments tried to pull Docker images simultaneously when new Bottlerocket nodes came online. This created significant **memory pressure** on the nodes.

**Resolution**: We leveraged Karpenter's self-healing capabilities. For stateless service deployments that remain running unless manually stopped, we brought down all AL2 nodes at once and let pods get recreated on Bottlerocket nodes. For user-facing workloads that restart naturally on termination, we used a **gradual rollout strategy**. The entire process resolved in about 15 minutes as image pulls spread out over time.

**What I'd do differently**:

1. **Over-provision capacity by 30%** during the migration window
2. **Automate batch draining** with health checks between batches

### cgroup Version Mismatch

AL2 uses **cgroup v1**; Bottlerocket uses **cgroup v2**. Applications that directly interacted with cgroup APIs broke after migration.

We had two options: downgrade Bottlerocket to cgroup v1 for backward compatibility, or keep v2 and update the application code.

**Decision**: Keep cgroup v2. Since v1 is being phased out across the Linux ecosystem, downgrading would create technical debt. We worked with the affected team to find a temporary workaround for their production issue while they implemented a permanent fix for v2 compatibility.

### NVIDIA Device Plugin Conflict

On AL2, the **NVIDIA device plugin for Kubernetes** is manually installed to expose GPUs as schedulable resources. Bottlerocket's NVIDIA AMI variants have **built-in GPU support**.

When migrating GPU nodes, both the device plugin *and* Bottlerocket's native GPU support tried to expose GPUs — causing **resource conflicts**.

**Temporary fix**: Add a node selector to prevent the NVIDIA device plugin DaemonSet from running on Bottlerocket nodes:

```yaml
affinity:
  nodeAffinity:
    requiredDuringSchedulingIgnoredDuringExecution:
      nodeSelectorTerms:
        - matchExpressions:
            - key: kubernetes.io/os-variant
              operator: NotIn
              values:
                - bottlerocket
```

**Permanent fix**: Once all GPU workloads are fully migrated to Bottlerocket, remove the NVIDIA device plugin entirely.

---

## Key Takeaways

1. **Immutability changes your operational model** — no SSH, no imperative scripts. Everything flows through Kubernetes APIs and declarative config. This is a paradigm shift that pays off in consistency and auditability.

2. **Dual-disk + A/B partitions = safe updates** — container data survives OS updates, and failed updates automatically roll back. This eliminates an entire class of "patching gone wrong" incidents.

3. **EBS snapshots > custom AMIs for image caching** — cleaner, more maintainable, and AWS's recommended approach. The snapshot workflow integrates naturally with Karpenter and SSM Parameter Store.

4. **Production migrations are about operational maturity** — you can't plan for every edge case. What matters is the ability to triage quickly, mitigate impact, and circle back to do things properly. The cgroup mismatch and GPU plugin conflict were both discovered in production, and both were resolved without extended downtime.

5. **Node provisioning speed matters more than you think** — going from 4 minutes to 30 seconds fundamentally changes how autoscaling feels. Karpenter can respond to workload spikes almost immediately.
