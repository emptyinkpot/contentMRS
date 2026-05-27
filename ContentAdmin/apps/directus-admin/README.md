# Directus Admin

Directus is the first mature admin shell for ContentAdmin.

This app uses the official `directus/directus` Docker image and local
extensions. Directus is an admin/runtime host, not a forked upstream.

## Local Runtime

```powershell
Copy-Item .env.example .env
pnpm install
pnpm --filter directus-extension-content-topology build
pnpm --filter directus-extension-endpoint-evidence-search build
docker compose up -d
```

Default local URL:

```text
http://127.0.0.1:8055
```

## Boundary

Directus may own its own metadata and extension state. Business content should
be read through SDK projections and written through Gateway contracts.

```text
Directus extension
  -> database-sdk-adapter
  -> DataBase Gateway

Directus extension
  -> contentbase-sdk-adapter
  -> ContentBase Runtime
```

For local Docker runs, `DATABASE_GATEWAY_URL` should point at the host-visible
Gateway address from inside the container:

```text
DATABASE_GATEWAY_URL=http://host.docker.internal:18207
```

EvidencePack proxy smoke:

```powershell
Invoke-RestMethod "http://127.0.0.1:8055/evidence-search/search?q=test&limit=1"
```

ContentBase runtime proxy smoke:

```powershell
Invoke-RestMethod "http://127.0.0.1:8055/evidence-search/runtime/capabilities"
```

Create a long-running article generation job through Directus:

```powershell
Invoke-RestMethod "http://127.0.0.1:8055/evidence-search/runtime/jobs" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"capabilityId":"runtime.generate.article","input":{"topic":"测试主题","target":"draft","persist":false},"requestedBy":"content-admin-directus"}'
```

This proxy is an operation boundary only. It does not make Directus the owner of
runtime jobs, generated prose, EvidencePack, or DataBase canonical writes.

## Upstream Update

Directus is tracked as a Docker image tag, not a vendored source tree.

```text
DIRECTUS_VERSION=11
```

When updating Directus:

1. Change `DIRECTUS_VERSION`.
2. Run `pnpm run typecheck`.
3. Run `pnpm run build`.
4. Start Directus and verify the `content-topology` module loads.
5. Verify SDK calls still go through DataBase Gateway and ContentBase Runtime.

## Planned Extensions

```text
directus-extension-content-topology
  Graph view for works, chapters, characters, sources, EvidencePack, and
  generation traces.

evidence-search
  Server-side Directus endpoint that proxies DataBase Gateway EvidencePack
  search and ContentBase runtime calls so the browser does not hold service
  credentials.
  Runtime route: `/evidence-search/search`.
  Runtime routes: `/evidence-search/runtime/*`.

interfaces/chapter-editor
  Editor surface that saves through SDK/Gateway writes.

panels/evidence-pack-panel
  EvidencePack query/readback panel.

hooks/gateway-write-hook
  Guardrail hook for Gateway-mediated mutations.
```
