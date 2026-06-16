# Terraform Module Design

Building reusable, composable infrastructure modules.

## Design Principles

1. **Single Responsibility** - One module, one purpose
2. **Composability** - Modules can be combined
3. **Sensible Defaults** - Works out of the box
4. **Explicit Inputs** - No magic, all configurable

## Module Structure

```
modules/
└── vpc/
    ├── main.tf        # Resource definitions
    ├── variables.tf   # Input variables
    ├── outputs.tf     # Output values
    ├── versions.tf    # Provider requirements
    └── README.md      # Usage documentation
```

## Pattern: Variable Design

```hcl
# Required variables - no defaults
variable "environment" {
  description = "Environment name"
  type        = string
  
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be dev, staging, or prod."
  }
}

# Optional with sensible defaults
variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.micro"
}
```

## Pattern: Output Design

```hcl
# Always output identifiers
output "id" {
  description = "Resource ID"
  value       = aws_resource.this.id
}

# Output connection info
output "endpoint" {
  description = "Connection endpoint"
  value       = aws_resource.this.endpoint
  sensitive   = true
}
```

## Pattern: Composition

```hcl
module "vpc" {
  source = "./modules/vpc"
  # ...
}

module "eks" {
  source = "./modules/eks"
  vpc_id = module.vpc.id  # Compose modules
  # ...
}
```

## Anti-Patterns

!!! danger "Avoid These"
    - Monolithic modules doing everything
    - Hard-coded values
    - Missing variable validation
    - No documentation
