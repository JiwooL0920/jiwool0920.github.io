# Modules

## Available Modules

*Documentation in progress - modules will be documented here*

## Module Design Guidelines

### Input Variables

```hcl
variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
}

variable "tags" {
  description = "Common tags for all resources"
  type        = map(string)
  default     = {}
}
```

### Outputs

```hcl
output "id" {
  description = "Resource identifier"
  value       = aws_resource.this.id
}
```
