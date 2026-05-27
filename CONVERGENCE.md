# ContentMRS 收敛说明（2026-05-21）

本文档替代 `LEGACY.md` 的「冻结」叙事，描述收敛后的**唯一主链**与**分工**。

## 目标态（集中后）

```text
人类操作
  -> ContentAdmin（Directus + extensions + public-workbench）
  -> SDK -> DataBase Gateway / ContentBase Runtime

生成与验收
  -> ContentBase product/novel（/api/content/runtime/*）
  -> Gateway EvidencePack / StylePack
  -> sub2api（qwen-plus 等）

表结构浏览（过渡）
  -> NocoDB :18088（元数据 Postgres，业务仍只经 Gateway 写）

深度检索（可选）
  -> RAGFlow :9380（includeRagflow=true，需 embedding 就绪）

发布
  -> fanqie-service / MyBlog（独立生命周期）
```

## 已删除的平行实现（政策退役 → 物理删除）

| 路径 | 说明 |
|------|------|
| `OpenClaw/mcps/novel-manager/` | 第二条正文生成链，已整树删除 |
| `OpenClaw/apps/console-web/.../novel-manager/` | 重复工作台 UI，已删除 |
| `ContentBase/apps/console-web/components/novel-manager/` | 与 ContentAdmin 重叠，已删除 |
| `ContentBase/product/novel/frontend/` | Vite 小说工作台 UI，与 ContentAdmin 重叠，已删除 |
| `ContentMRS/CozeOpenAIProxy/` | 与仓根 `CozeOpenAIProxy` 重复，已从 MRS 目录移除 |
| `ContentMRS/remotion-project/` | 视频合成侧项目，已迁到工作区同级 `remotion-project/` |

**保留**：`ContentBase/product/novel/`（runtime、capability、tools）——这是唯一生成真源。

## UI 分工（去重叠）

| 表面 | 职责 |
|------|------|
| **ContentAdmin** | 作品/章节编辑、Evidence 拓扑、触发 `runtime.generate.*`、trace 查看 |
| **ContentBase console-web** | 系统总览 + `/novel` **重定向**到 ContentAdmin；不再承载小说工作台 |
| **ContentBase `/api/novel`** | HTTP/SSE runtime API（保留） |

环境变量：

```env
CONTENTADMIN_PUBLIC_URL=https://你的-directus-或-workbench-地址
```

## Tier 划分（更新后）

### Tier-1（双态：本机基线 / 生产基线）

- 本机基线（默认）：
  - DataBase Gateway（本机）
  - ContentBase（本机，含 runtime API）
  - sub2api（170，LLM 网关）
  - web-evidence-provider（本机）
- 生产基线（`-Target prod`）：
  - server-124 上 Gateway + ContentBase + web-evidence-provider
  - sub2api（170，LLM 网关）

### Tier-1.5（扩展组件，按需部署）

- **NocoDB** — 表浏览与低代码网关（`127.0.0.1:18088`）
- **Directus / ContentAdmin** — 人类主后台（`127.0.0.1:8055`）；**正式路径为 SQLite 元数据**（`ContentAdmin/apps/directus-admin/docker-compose.yml`）。CynosDB MySQL 上的 `uploaded_on` 迁移仅作遗留，见 `fix-directus-migration-remote.sh`
- **RAGFlow** — `includeRagflow` 证据（`127.0.0.1:9380`）

### Tier-2（不绑 124 主进程）

- OpenList 文件守护
- MyBlog 静态发布
- fanqie-service 发布执行

### 外置、非 ContentMRS 仓内

- **OpenClaw** — MCP/密钥/总览；**不再**承载 novel 生成

## Tier-1 出厂验收

生产成文唯一脚本链见 **[docs/PRODUCTION-PIPELINE.md](docs/PRODUCTION-PIPELINE.md)**（`production-article-acceptance.mjs` + `normalizeArticleRequest`）。

## 运维入口（集中）

```powershell
# 本机基线验收（默认）
pwsh -File ./scripts/verify-production.ps1

# 生产基线验收（124）
pwsh -File ./scripts/verify-production.ps1 -Target prod

# 密钥 + 模型 + Tavily
pwsh -File ./scripts/sync-production-secrets-124.ps1 -Restart

# Tier-1 systemd
pwsh -File ./scripts/install-systemd-124.ps1

# Tier-1.5（NocoDB / Directus / RAGFlow）
pwsh -File ./scripts/deploy-tier2-124.ps1
pwsh -File ./scripts/verify-tier2-124.ps1
```

## LLM：仅 sub2api + llm.env

| 组件 | 作用 |
|------|------|
| **sub2api（170）** | LLM 网关（千问上游、路由、配额） |
| **`llm.env`（124）** | ContentBase 进程读 `CONTENTBASE_LLM_*`，指向 sub2api |

已移除 ContentBase 对 `vscode-key-guard/keys.local.json` 的依赖。OpenClaw 里的 key-guard 与正文链无关。

**真源**：`~/.codex-secrets/sub2api/consumers/contentmrs-novel.env` → `sync-production-secrets-124.ps1` → `/srv/contentbase/shared/llm.env`。

## 配置单真源

| 项 | 真源 |
|----|------|
| 生产 LLM | `sub2api/consumers/contentmrs-novel.env` → `/srv/contentbase/shared/llm.env`（默认 `qwen-plus`） |
| Tavily | `~/.codex-secrets/web-evidence/tavily.env` |
| 主题语料 | `DataBase/apps/gateway/config/topic-corpus.json` → `sync-topic-corpus.ps1` |
| Gateway / MySQL | `~/.codex-secrets/database-gateway/database_gateway.env` |

数据库与配置血缘见 [docs/DATABASE-LINEAGE.md](docs/DATABASE-LINEAGE.md)。

## 通用能力：vendor-in（源码进产品仓），禁止只写胶水冒充缝合

1. **克隆**：`scripts/clone-vendor-references.ps1` → `ContentMRS/vendor/`
2. **拷进仓**：`scripts/sync-vendor-into-products.ps1` → `ContentBase/product/novel/vendor/`、`DataBase/apps/gateway/vendor/`
3. **裁剪接线**：删 demo/frontend/tests，LLM 改 sub2api，检索改 Gateway；Python 用子进程或侧车调 vendored 包
4. **参考克隆可删**：`prune-stitched-vendor-trees.ps1` 只删 `ContentMRS/vendor/`，不删产品仓里的 vendor-in

详见 [`vendor/README.md`](vendor/README.md)。**冻结**按题推断；新车道只增 `material-notebooks.json`。

## 证据软边界（过渡，将收敛到 vendor）

- `GET /evidence/search?excludeQueries=` — 离题短语负样本
- `POST /evidence/screen` — 候选 chunk relevance gate
- ContentBase：显式 `scope-*` / `sourceIds` + `styleProfileId`/`styleQuery` + 默认 `revision` + `topicScopeMode` trace（无关键词车道）
- 详见 [docs/evidence-scope.md](docs/evidence-scope.md)

## 仍待闭环

- [ ] Directus MySQL 迁移 `uploaded_on` 阻塞（恢复后台前需修）
- [ ] RAGFlow embedding provider 就绪后 `smoke:ragflow-evidence`
- [ ] ContentAdmin 生产公网域名与 nginx 反代（若需外网访问）
- [ ] fanqie / MyBlog 纳入统一 `verify-tier2` 发布检查（可选）
