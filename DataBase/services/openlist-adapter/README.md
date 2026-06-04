# DataBase OpenList Adapter

This service is the DataBase-owned boundary for an external OpenList runtime.

OpenList itself remains an upstream application. DataBase does not vendor its Go source, runtime `data/`, or binaries. This adapter gives DataBase callers a stable SDK/API surface over OpenList HTTP endpoints.

## Boundary

Owns:

- OpenList HTTP client types
- SDK calls for health, login, storage inventory, file listing, and file metadata
- a small HTTP API for DataBase consumers

Does not own:

- OpenList source code
- OpenList runtime database or `data/`
- mounted file object truth
- object storage primitives

## Environment

```text
OPENLIST_ENV_FILE=C:\Users\ASUS-KL\.codex-secrets\openlist-obsidian-sync.env
OPENLIST_BASE_URL=http://124.220.233.126:5244
OPENLIST_TOKEN=<admin token or login token>
OPENLIST_USERNAME=<optional login username>
OPENLIST_PASSWORD_HASH=<optional sha256 password hash for /api/auth/login/hash>
DATABASE_OPENLIST_ADAPTER_HOST=127.0.0.1
DATABASE_OPENLIST_ADAPTER_PORT=18110
```

If `OPENLIST_ENV_FILE` exists, values are loaded from that file first and process environment variables override them. If `OPENLIST_TOKEN` is set, the client uses it directly. If not, `OPENLIST_USERNAME` and `OPENLIST_PASSWORD_HASH` can be used to obtain a token from `/api/auth/login/hash`.

The SDK handles OpenList deployments mounted under a base path. If `OPENLIST_BASE_URL` returns the OpenList frontend and exposes `base_path: '/openlist'`, the client switches API calls to `/openlist/*`.

## API

```text
GET  /health
GET  /storages
GET  /storages/:id
POST /fs/list
POST /fs/get
```

## Smoke

```powershell
npm run build
npm run smoke
```

The smoke loads the configured OpenList env file, checks `/ping`, and lists admin storages. Business file targets are not configured here; they are DataBase rows read by the Gateway target API.

The adapter routes map to OpenList:

```text
GET  /ping
POST /api/auth/login/hash
GET  /api/admin/storage/list
GET  /api/admin/storage/get?id=
POST /api/fs/list
POST /api/fs/get
```

## S3-Compatible Storage Provisioning

Use the package-owned provisioning entrypoint instead of editing OpenList SQLite
state or hand-writing one-off curl commands:

```powershell
npm run provision:s3-storage
```

Required environment:

```text
OPENLIST_BASE_URL=http://124.220.233.126:5244
OPENLIST_TOKEN=<admin token>
OPENLIST_S3_MOUNT_PATH=/cos-myblog-media
OPENLIST_S3_BUCKET=myblog-media-1410041307
OPENLIST_S3_ENDPOINT=https://cos.ap-shanghai.myqcloud.com
OPENLIST_S3_REGION=ap-shanghai
OPENLIST_S3_ACCESS_KEY_ID=<secret id>
OPENLIST_S3_SECRET_ACCESS_KEY=<secret key>
```

Optional:

```text
OPENLIST_S3_ROOT_PATH=/
OPENLIST_PROVISION_DRY_RUN=true
OPENLIST_PROVISION_UPDATE_EXISTING=true
```

The script creates or updates an OpenList `S3` storage through
`POST /api/admin/storage/create|update` and then calls
`POST /api/admin/storage/load_all`. It redacts S3 credentials in its output.
