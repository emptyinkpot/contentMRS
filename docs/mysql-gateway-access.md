# MySQL / Gateway 访问排障（ContentMRS）

## 症状

- `GET /creative/style-contract` → HTTP 500，`Access denied for user 'database_readonly'@'<公网IP>'`
- `GET /evidence/search`（hybrid scope，`skipDatabaseSearch=false`）→ 同类错误
- ContentBase 成文：`creative style contract gateway read failed (MySQL): ...`

`scope-ragflow-web` 可把 evidence 设为 `skipDatabaseSearch=true` 并走 web/RAGFlow，但**成文仍必须**经 Gateway 读取 `creative_style_*` 等表，无法绕过 MySQL。

## 根因

DataBase Gateway 使用 `database_readonly`（或 env 中的 `DATABASE_READONLY_*`）连接 CynosDB。腾讯云 MySQL 用户主机限制或安全组未放行当前客户端公网 IP 时会拒绝连接。

## 修复步骤

1. **确认 Gateway 用的账号**  
   读 `~/.codex-secrets/database-gateway/database_gateway.env` 与 `~/.codex-secrets/mysql/database_service_users.env`。

2. **在 CynosDB 控制台**  
   - 为 `database_readonly` 增加当前开发机公网 IP（或 `%` 仅限 VPN 段，按安全策略）  
   - 或让 Gateway 只跑在 **124** 上，本机经 SSH 隧道访问 `127.0.0.1:18090`

3. **本机验收**

```powershell
# 预检（不跑 LLM）
node --experimental-strip-types ContentBase/product/novel/tools/closed-loop-article-smoke.mjs --profile hybrid --topic "你的题目" --generate false

# 成文前会多一步 creative.style-contract
node --experimental-strip-types ContentBase/product/novel/tools/closed-loop-article-smoke.mjs --profile hybrid --topic "你的题目" --generate true
```

4. **直连 Gateway 探针**

```powershell
$env:DATABASE_GATEWAY_URL = 'http://127.0.0.1:18090'  # 或 https://database.tengokukk.com
# 需 DATABASE_GATEWAY_API_KEY（同上 secrets）
curl -s -H "x-api-key: $env:DATABASE_GATEWAY_API_KEY" `
  "$env:DATABASE_GATEWAY_URL/creative/style-contract?protocol=immersive_historical_synthetic_narrative"
```

## 与代码收敛的关系

P0–P2 已统一 scope / topic-corpus / env；**基础设施未通时**表现为 Gateway 500，不是缺 `DATABASE_GATEWAY_URL`（ContentBase `server.mjs` 会从 secrets 注入）。

## 相关

- `docs/server-124-recovery.md` — root recovery boundary
- `ACCEPTANCE.md` — 闭环 smoke 命令  
- `DataBase/apps/gateway/sql/003_creative_style_registry.sql` — 风格合同表结构  
