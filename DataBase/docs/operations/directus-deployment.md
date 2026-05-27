# Directus Deployment

## Runtime Path

```text
/srv/directus
```

## Compose Files

```text
/srv/directus/docker-compose.yml
/srv/directus/.env
```

## Database

Directus connects to the existing Tencent CynosDB MySQL database:

```text
cloudbase-4glvyyq9f61b19cd
```

## First Verification

```bash
sudo docker compose -f /srv/directus/docker-compose.yml ps
curl -i http://127.0.0.1:8055/server/health
```

## Current Result

Directus is stopped/blocked because the current CynosDB MySQL parameter set rejects a Directus migration:

```text
Invalid default value for 'uploaded_on'
```

See `docs/gateway/directus.md`.

## Current Alternative

NocoDB is deployed at:

```text
/srv/nocodb
127.0.0.1:18088
```

It uses a dedicated local Postgres metadata store and should be used as the current database gateway.

## Exposure

Initial deployment should bind locally or to a controlled port first. Public reverse proxy and domain exposure are a separate decision.
