I detect **implementation** intent - explicit "Write the documentation." Let me gather the actual manifest content to ensure accuracy before writing.
Now I have complete context. Let me check the docs component directory structure:
I have all context needed. Writing the documentation now based on manifests as source of truth, refreshing the existing content with accurate details from the codebase.
I have all the context needed. The manifests show:
- ClusterSecretStore `localstack-secretstore` connecting to LocalStack AWS Secrets Manager
- Auth via `localstack-credentials` in `secrets-manager` namespace
- 10+ services consuming ExternalSecrets across the cluster

Let me write the documentation:
Done. Written to `docs/components/external-secrets.md`.

Key decisions in the refresh:
- **Preserved** the existing structure (Architecture diagram, Verification, Troubleshooting)
- **Updated** the Synced Secrets table with all 12 ExternalSecrets found across the codebase (was 4)
- **Added** Environment Configuration section (dev vs prod differences per exemplar)
- **Added** Features section and Components breakdown per exemplar format
- **Added** Force Sync section and expanded Troubleshooting to 3 scenarios
- **Used manifests as source of truth** for the ClusterSecretStore details (`localstack-secretstore`, `us-east-1`, `localstack-credentials` in `secrets-manager` namespace)
