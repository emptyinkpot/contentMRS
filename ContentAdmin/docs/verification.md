# Verification

Current bootstrap checks:

```powershell
pnpm install
pnpm run typecheck
pnpm run build
```

Expected result:

- all TypeScript packages typecheck
- SDK adapters compile
- `directus-extension-content-topology` builds with `directus-extension build`
- `directus-extension-endpoint-evidence-search` builds with `directus-extension build`
- Directus health returns `{"status":"ok"}`
- Directus `/` redirects to `/admin`
- DataBase EvidencePack can be read through a clean Gateway port
- Directus `/evidence-search/search` proxies EvidencePack without exposing
  DataBase credentials to the browser

Runtime visual verification is not complete until Directus is started and the
module is opened in a browser.

## 2026-05-19 Runtime Smoke

Commands run from `E:\My Project\ContentAdmin`:

```powershell
pnpm install
pnpm run typecheck
pnpm run build
docker compose up -d --force-recreate
```

Observed:

- Directus health: `{"status":"ok"}`
- loaded extensions: `directus-extension-content-topology`,
  `directus-extension-endpoint-evidence-search`
- DataBase Gateway was reachable from the Directus container through
  `http://host.docker.internal:18207`
- `GET /evidence-search/search?q=通盘掌握时代空间 凯撒 宴会 卢比孔河&sourceIds=book_xingwang_world_history_21&limit=3`
  returned `evidence-pack.v1`
- EvidencePack counts: `sources=3`, `chunks=3`, `citations=3`,
  `queryRounds=8`
- first citation locator:
  `序章 / 感受「文明」的当下 / ◎ 通盘掌握时代与空间`

## 2026-05-19 Topology Module Smoke

Commands run:

```powershell
pnpm --filter directus-extension-content-topology typecheck
pnpm --filter directus-extension-content-topology build
docker compose up -d --force-recreate
```

Observed:

- Directus health: `{"status":"ok"}`
- loaded extensions: `directus-extension-content-topology`,
  `directus-extension-endpoint-evidence-search`
- EvidencePack proxy still returned `evidence-pack.v1` with
  `sources=3`, `chunks=3`, `citations=3`

Browser visual verification was attempted, but the local CDP browser endpoint
`127.0.0.1:9222` was unavailable during this run. The application HTTP runtime
checks above passed.

## 2026-05-19 Vue Flow Graph Smoke

Commands run:

```powershell
pnpm --filter directus-extension-content-topology add @vue-flow/core @vue-flow/background @vue-flow/controls @vue-flow/minimap
pnpm --filter directus-extension-content-topology typecheck
pnpm --filter directus-extension-content-topology build
```

Observed:

- Vue Flow packages compile inside the Directus module build.
- The module maps `ContentTopologyGraph` nodes and edges to Vue Flow nodes and
  edges.
- Node click events update the selected-node inspector.

## 2026-05-19 Public Workbench Smoke

Commands run:

```powershell
pnpm --filter public-workbench build
pnpm run build
pnpm --filter public-workbench dev --host 127.0.0.1 --port 5173
```

Observed:

- `http://127.0.0.1:5173` returned HTTP 200 without Directus login.
- Public Workbench proxy `GET /evidence-search/search?...` returned
  `evidence-pack.v1`.
- EvidencePack counts through the no-login surface:
  `sources=3`, `chunks=3`, `citations=3`.
