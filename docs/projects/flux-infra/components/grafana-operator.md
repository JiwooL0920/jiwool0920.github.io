I have all the context needed from the manifests and existing docs. The `grafana-config.md` already references `grafana-operator.md`, confirming the expected file location.
Done. Written to `docs/components/grafana-operator.md`. Key details sourced from the manifests:

- **Namespace**: `grafana-operator` (from `namespace.yaml` + `targetNamespace`)
- **Chart**: `grafana-operator` v5.15.1 from `oci://ghcr.io/grafana/helm-charts`
- **Dependency**: `kube-prometheus-stack` (from `dependsOn` in the Flux Kustomization)
- **Resources**: 100m–200m CPU, 128Mi–256Mi memory (from HelmRelease values)
- **Scope**: `namespaceScope: false` — watches all namespaces

The architecture diagram shows the full flow from Flux Kustomization → HelmRelease → Operator → watches CRs in all namespaces → provisions into Grafana instance. Related links align with the existing `grafana-config.md` page which already references this file.
