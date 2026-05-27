# Web Evidence Provider

Small HTTP adapter for DataBase Gateway `DATABASE_EVIDENCE_WEB_SEARCH_URL`.

## Provider

Default: **Tavily** (`WEB_EVIDENCE_PROVIDER=tavily`).

## Run

```powershell
cd "E:\My Project\DataBase\apps\web-evidence-provider"
copy .env.example .env
# Set TAVILY_API_KEY in .env or environment
pnpm install
pnpm run dev
```

Listens on `http://127.0.0.1:19091` by default.

## Gateway wiring

```text
DATABASE_EVIDENCE_WEB_SEARCH_URL=http://127.0.0.1:19091/search
```

Then:

```powershell
Invoke-RestMethod "http://127.0.0.1:18090/evidence/search?q=test&includeWeb=true&limit=5"
```

## Contract

`GET /search?q=<query>&limit=<n>` returns:

```json
{
  "provider": "tavily",
  "query": "...",
  "limit": 8,
  "count": 3,
  "items": [
    { "title": "...", "url": "...", "snippet": "..." }
  ]
}
```

Gateway maps `items` into EvidencePack `web.search` rounds.
