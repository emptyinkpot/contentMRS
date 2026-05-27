# Data Classification

## Classes

| Class | Description | Storage |
| --- | --- | --- |
| `source-code` | Application source, scripts, docs | GitHub repos |
| `schema-contract` | SQL schemas, inventory metadata, data contracts | This repo |
| `structured-live-data` | MySQL rows and application state | Tencent CynosDB MySQL |
| `file-assets` | Images, archives, books, media, exports | OpenList / Quark / server file roots |
| `runtime-artifacts` | AI workspaces, logs, generated reports | Server runtime paths |
| `credentials` | Passwords, tokens, cookies, account secrets | Explicit credential surfaces |

## Repository Storage Policy

Allowed in this repo:

- Topology docs
- Schema docs
- Inventory snapshots
- Recovery docs
- Non-secret scripts
- Non-secret examples

Not allowed by default:

- Full MySQL dumps
- Production large files
- Generated deploy output
- Browser cookie exports
- Private keys
- Unrequested secret-value reports

Exception:

- If the operator explicitly requires plaintext secret values to be written into a named surface, follow the named surface and success criterion exactly.

