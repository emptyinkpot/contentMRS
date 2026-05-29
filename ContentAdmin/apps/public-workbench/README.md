# Public Workbench

Public Workbench is the no-login read surface for ContentAdmin.

It does not replace Directus Admin. Directus remains the authenticated admin
host. This app is for viewing EvidencePack search, runtime job status,
generated body, trace, and writeback/readback summaries without exposing
DataBase or ContentBase credentials in the browser.

## Local Runtime

Start Directus first:

```powershell
cd apps/directus-admin
docker compose up -d
```

Then start the public workbench:

```powershell
pnpm --filter public-workbench dev
```

Open:

```text
http://127.0.0.1:5173
```

The Vite dev server proxies `/evidence-search/*` to Directus:

```text
public-workbench -> /evidence-search/search -> Directus endpoint -> DataBase Gateway
public-workbench -> /evidence-search/runtime/* -> Directus endpoint -> ContentBase Runtime
```

## Authentication Boundary

Default public access is enabled for this app because it only reads through the
server-side Directus proxy. Directus Admin login stays enabled.

## Surface

The workbench currently shows:

- source catalog
- EvidencePack topology
- runtime job creation and polling
- novel management fields for work/chapter/Fanqie publish payloads
- generated body
- persisted writeback summary
- trace / quality / acceptance JSON

## Novel Management Flow

The novel management section uses ContentBase as the `novel-factory` runtime
service. It still calls the same Directus proxy boundary:

```text
public-workbench
  -> /evidence-search/runtime/jobs
  -> ContentBase /api/novel/runtime/jobs
  -> ContentBase /api/content/runtime/generate/article
```

n8n owns the webhook orchestration for `generate -> quality check -> publish`.
The workbench displays the webhook payload shape, but it does not store Fanqie
credentials or call fanqie-service directly from the browser.
