# Fleet Infrastructure

GitOps-based Kubernetes infrastructure using FluxCD.

## Overview

This project implements a GitOps workflow for managing Kubernetes clusters with:

- **FluxCD** for continuous deployment
- **Kustomize** for manifest composition
- **SOPS** for secrets management

## Quick Links

- [Architecture](architecture.md) - System design and component overview
- [Components](components.md) - Detailed component documentation
- [Runbooks](runbooks.md) - Operational procedures

## Repository Structure

```
fleet-infra/
├── apps/           # Application deployments
├── base/           # Base Kustomize configurations
├── clusters/       # Cluster-specific overlays
└── scripts/        # Automation scripts
```
