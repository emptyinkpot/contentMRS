# ContentMRS Root Scripts

This directory is limited to workspace maintenance.

Allowed here:

- clone or update sibling module repositories
- run inventory-only checks that do not deploy, start, stop, or configure services

Not allowed here:

- service deployment or repair
- production verification
- secret synchronization
- systemd installation
- Dify workflow execution
- centralized SDK generation
- copying API contracts or vendor code into modules

Runtime, deployment, SDK, and API contract scripts belong in the module that
owns the service. Dify owns orchestration.

## Current Scripts

| Script | Boundary |
|--------|----------|
| `clone-contentmrs-repos.ps1` | Clone or update sibling module repositories. |
| `export-latent-training-corpus.mjs` | Offline corpus export utility; not a service runtime. |

If a script needs to deploy, restart, verify, configure, or copy executable code
between modules, move it to the owning module or remove it.
