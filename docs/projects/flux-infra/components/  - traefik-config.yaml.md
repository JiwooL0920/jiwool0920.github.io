I detect **implementation** intent — write a documentation page for traefik-config. The prompt template is missing manifests, exemplar, and existing content. I need to gather all three from the codebase first.
Good — I found the key files. Let me read the traefik-config manifests and an exemplar doc page in parallel.
Now let me read all the traefik-config manifests:
Let me also check the grafana-config page since it's a similar "-config" pattern:
I have all the context. Let me write the documentation page.
Done. Created `docs/components/traefik-config.md` — a complete reference page matching the exemplar structure (grafana-config.md style) with all information derived from the actual manifests:

- **3 resources documented**: ExternalSecret, Middleware, IngressRoute
- **Dependencies**: traefik + external-secrets-config (from the Flux Kustomization `dependsOn`)
- **Architecture diagram**: Shows the full credential flow from LocalStack → ExternalSecret → Secret → Middleware → IngressRoute
- **Full specs included**: All three manifest specs shown verbatim
- **3 troubleshooting scenarios**: Auth failures, ExternalSecret sync issues, routing problems
