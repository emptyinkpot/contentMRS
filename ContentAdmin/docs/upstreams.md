# Upstreams

ContentAdmin is an integration repository. It uses mature upstream projects as
runtime and UI foundations without forking their source trees.

## Runtime Shell

```text
name: Directus
source: https://github.com/directus/directus
docs: https://docs.directus.io/
docker image: directus/directus
purpose: admin studio, permissions surface, extension host, database-facing UI
current pin: DIRECTUS_VERSION=11 in apps/directus-admin/.env.example
update method: bump Docker image tag, then run extension and SDK smoke checks
```

## Extension SDK

```text
package: @directus/extensions-sdk
purpose: custom modules, interfaces, displays, panels, hooks, endpoints
current pin: ^17.1.4 in apps/directus-admin/extensions/directus-extension-*
update method: package version bump inside extension packages
```

## Topology UI

```text
name: Vue Flow
source: https://github.com/bcakmakoglu/vue-flow
docs: https://vueflow.dev/
packages:
  - @vue-flow/core
  - @vue-flow/background
  - @vue-flow/controls
  - @vue-flow/minimap
purpose: EvidencePack topology graph rendering inside the Directus Vue module
update method: package version bump in the topology module, then run Directus
extension build and runtime smoke checks
```

## Internal SDKs

```text
DataBase SDK:
  package: @emptyinkpot/database-gateway-generated-client
  owner: E:\My Project\DataBase
  purpose: content, EvidencePack, style, and controlled write access

ContentBase SDK:
  owner: E:\My Project\ContentBase
  purpose: generation, review, publishing, runtime job inspection
```

## Non-Fork Rule

Do not vendor Directus or React Flow source into this repository. If a patch is
needed upstream, keep it as an extension, adapter, or documented upstream issue.
