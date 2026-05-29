# ContentBase Ops

This directory owns ContentBase deployment artifacts. `novel-factory` is the
operator-facing service name for the ContentBase novel runtime; it must point to
`server.mjs` and must not introduce a second generation engine.

## Systemd

Install once on server-124:

```bash
sudo install -m 0644 ops/contentbase.service /etc/systemd/system/contentbase.service
sudo systemctl daemon-reload
sudo systemctl enable contentbase
```

Deploy from this module:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/deploy-contentbase-production.ps1 -UseSystemd
```

Verify:

```bash
curl -fsS http://127.0.0.1:5111/api/health
curl -fsS http://127.0.0.1:5111/api/novel/health
```

Runtime env belongs under `/srv/contentbase/shared/` or the canonical local
secrets mirrored by the deployment operator. Do not commit API keys.
