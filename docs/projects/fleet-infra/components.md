# Components

## Core Components

### FluxCD Controllers

- **Source Controller** - Manages Git repositories and Helm charts
- **Kustomize Controller** - Applies Kustomize overlays
- **Helm Controller** - Manages Helm releases
- **Notification Controller** - Sends alerts and notifications

### Infrastructure Components

| Component | Namespace | Purpose |
|-----------|-----------|---------|
| cert-manager | cert-manager | TLS certificate management |
| ingress-nginx | ingress-nginx | Ingress controller |
| external-dns | external-dns | DNS record management |

## Application Stack

*Documentation in progress*
