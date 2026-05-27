# ContentMRS 主链验收

通过即表示 **Tier-1 生产链** 可用（库内证据 + sub2api，不依赖 web/RAGFlow/Directus）。

## 124 稳定化（首次或重置后）

```powershell
pwsh -File ./scripts/sync-production-secrets-124.ps1
pwsh -File ./scripts/install-systemd-124.ps1
```

## RAGFlow Tier-1.5（向量证据，禁止掉队）

`material-notebooks.json` 中 `ragflow_web` / `hybrid` **材料边界**依赖 Gateway 环境变量 `DATABASE_EVIDENCE_RAGFLOW_DATASET_*`。  
**单一修复入口**（部署 + scope dataset + prepare + smoke + 同步 env）：

```powershell
pwsh -File ./scripts/ensure-ragflow.ps1 -SyncEnvToLocal -LocalTunnel
# 首次或 compose 缺失：加 -DeployStack
```

本机开发需 9380 可达：`-LocalTunnel` 或本机 RAGFlow。  
建议检查：`runtime doctor`、`verify-production.ps1`（本机 baseline）、`CONTENTMRS_STRICT` 下 `smoke:production`（RAGFlow 不可用会 fail-fast，避免静默 web-only）。

详见 **[docs/RAGFLOW-OPS.md](docs/RAGFLOW-OPS.md)**。

## 本机联邦

```powershell
cd ./runtime
node src/cli.mjs doctor
node src/cli.mjs status
```

## Tier-1 生产出厂（主验收）

见 **[docs/PRODUCTION-PIPELINE.md](docs/PRODUCTION-PIPELINE.md)**。

```powershell
cd ./ContentBase/product/novel
pnpm run smoke:production -- --profile hybrid --topic "你的题目" --mode evidence
pnpm run smoke:production:full -- --profile hybrid --topic "你的题目"
```

通过：scope + EvidencePack + style-contract +（full）**quality block 清零** + 引用覆盖 ≥ 阈。报告：`production-article-acceptance-*.json`。

## 本机引经据典闭环（兼容命令）

```powershell
cd ./ContentBase/product/novel
$env:DATABASE_GATEWAY_URL = "http://127.0.0.1:18090"
pnpm run smoke:closed-loop
```

（`smoke:closed-loop` 已指向 `production-article-acceptance --profile hybrid --mode evidence`，需 `--topic`。）

## 一键冒烟（默认本机，可切 prod）

```powershell
pwsh -File ./scripts/verify-production.ps1
# 明确跑公网（124）
pwsh -File ./scripts/verify-production.ps1 -Target prod
```

默认包含：`scope` 硬边界、`gateway-evidence-vector-fusion`（`screening.fusion` + 向量块）、`latent-rerank-production`（`ragflow_web` + `kernel.latent-rerank`）、`smoke:closed-loop`（`hybrid`）。  
跳过 latent：`-SkipLatent`。仅跳过成文：`-SkipGeneration`（仍跑 Gateway 向量融合步，除非同时 `-SkipLatent`）。  
本机 `-Target local` 默认按 baseline 执行；`-Target prod` 执行生产必检项（含 RAGFlow 向量/latent 检查）。  
全文生成加 `-FullGeneration`（慢，需 sub2api）。

生产默认 `CONTENTMRS_STRICT=true`（`sync-production-secrets-124.ps1` 注入 Gateway env，并保留 `DATABASE_EVIDENCE_REQUIRE_SCOPE=true`）。  
本机调试：`CONTENTMRS_STRICT=false`，或 legacy `DATABASE_EVIDENCE_ALLOW_UNSCOPED=true` / `CONTENTBASE_ALLOW_UNSCOPED_EVIDENCE=true`。  
无 Gateway 跑单测：`CONTENTMRS_NOTEBOOKS_LOCAL_FALLBACK=1`。

闭环 smoke 推荐：

```powershell
cd ./ContentBase/product/novel
# hybrid（默认材料边界，需 Gateway→MySQL readonly 可用）
node --experimental-strip-types tools/closed-loop-article-smoke.mjs --profile hybrid --topic "你的题目" --generate false
# ragflow_web（跳过 MySQL 全库，默认联网）
node --experimental-strip-types tools/closed-loop-article-smoke.mjs --profile ragflow_web --topic "你的题目" --generate false
# 成文（多一步 creative.style-contract 预检；MySQL 拒绝见 docs/mysql-gateway-access.md）
node --experimental-strip-types tools/closed-loop-article-smoke.mjs --profile hybrid --topic "你的题目" --generate true
```

可选环境变量：

| 变量 | 默认 |
|------|------|
| `DATABASE_GATEWAY_URL` | local: `http://127.0.0.1:18090`（`-Target prod` 时为公网） |
| `CONTENTBASE_BASE_URL` | local: `http://127.0.0.1:5101`（`-Target prod` 时为公网） |
| `DATABASE_GATEWAY_API_KEY` | 读 `~/.codex-secrets/database-gateway/database_gateway.env` |

## 分步（手动）

### 1. Gateway

```powershell
# 默认本机
curl.exe -fsS http://127.0.0.1:18090/health
```

期望：`checks.mysql` 为 `ok`。

### 2. ContentBase

```powershell
# 默认本机
curl.exe -fsS http://127.0.0.1:5101/api/health
```

期望：`success: true`。

### 3. topic-corpus style-contract（三主题，显式 topicId）

> 检索边界验收以 **§本机引经据典闭环**（`notebookId`）为准；本节仅验证风格合同 API。

```powershell
pwsh -File ./scripts/verify-production.ps1 -SkipGeneration
```

### 4. 全文生成（可选，慢）

```powershell
pwsh -File ./scripts/verify-production.ps1 -FullGeneration
```

或：

```powershell
$env:CONTENTBASE_BASE_URL = 'https://contentbase.tengokukk.com'
Set-Location ./ContentBase/product/novel
node tools/generate-scope-evaluation.mjs --notebookId scope-hybrid-default --topic "你的题目"
```

期望：退出码 0，`ok: true`，`bodyLength` > 1000，`webSources: 0`。

## Tier-1.5（扩展验收）

```powershell
pwsh -File ./scripts/verify-tier2-124.ps1
```

覆盖：Gateway 联网证据、NocoDB HTTP、Directus health（可 WARN）、RAGFlow health（可 WARN）。

部署：

```powershell
pwsh -File ./scripts/deploy-tier2-124.ps1
```

## 不纳入主验收

- MyBlog 全站发布
- fanqie 端到端发布
- RAGFlow `requireRagflowEvidence=true`（按生产模式单独验）

## 失败时先看

| 症状 | 检查 |
|------|------|
| EvidencePack 失败 | 124 是否开了 web/RAGFlow；请求是否 `includeWeb: false` |
| LLM 401/405 | `llm.env` 中 `CONTENTBASE_LLM_BASE_URL` 是否带 `/v1`；密钥是否来自 `sub2api-novel.env` |
| Gateway 合同失败 | `DATABASE_GATEWAY_URL` 是否在 ContentBase 进程环境中 |

详见 [STACK.md](STACK.md)。
