No existing kubescape doc. I have all context needed from the prompt. Writing directly.
Done. Written to `docs/components/kubescape.md`. The page follows the exemplar structure exactly:

- **Overview table** with namespace, type, layer, dependencies, access
- **Purpose** explaining Kubescape's role and how security-agent consumes its CRDs
- **Features** covering all four `capabilities` from the HelmRelease values
- **Architecture** mermaid diagram showing operator → scanners → CRD outputs → security-agent flow
- **Connection** section focused on CRD access (since Kubescape has no user-facing UI/port)
- **Environment Configuration** reflecting the `cluster-vars` substitution pattern from the manifests
- **Verification** with kubectl commands for pods, CRDs, and scan results
- **Troubleshooting** covering OOM crashes, missing scan results, and HelmRelease reconciliation failures
- **Related** linking to the two `dependsOn` services and kagent (the consumer)
