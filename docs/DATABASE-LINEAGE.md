# ContentMRS 数据与配置血缘

## 业务数据库（唯一写口）

```text
CynosDB MySQL (124.220.245.121:22295)
  ↑ 仅 DataBase Gateway 连接（database_gateway.env）
  ↑ ContentBase / ContentAdmin / 脚本：禁止直连业务表
```

| 数据类 | 表/投影 | 写入方 | 读取方 |
|--------|---------|--------|--------|
| 作品/章节/正文块 | canonical content + legacy 映射 | Gateway `/writes/*` | ContentBase runtime、ContentAdmin |
| 检索 | `search_documents` / `search_chunks` | Gateway import 脚本 | Gateway `/evidence/search` → ContentBase |
| 语义资料 | `semantic_units` | Gateway | EvidencePack |
| 创作合同 | creative_style_* + vocabulary | Gateway | `/creative/style-contract` → ContentBase |
| 主题预设 | `topic-corpus.json`（配置，非表） | 人编辑 Gateway 配置 | sync → ContentBase `topicId` |
| 文章经验 | `experience_records` | Gateway `recordExperience` | 下一轮 material pack |
| 番茄绑定/快照 | `novel_work_registry` 等 | Gateway / fanqie-service 回写 | 发布链 |

**连贯性**：真相在 **MySQL + Gateway 合同**；ContentBase 只有 runtime 投影与 trace，不复制 schema 真相。

## 文件与索引

```text
OpenList / Obsidian EPUB
  → import-local-book-corpus.mjs（DataBase）
  → literature + search_chunks + semantic_units
  → EvidencePack（经 Gateway）
```

未 import 的书 **不会** 进入生成链。

## LLM（不是数据库）

```text
sub2api (170)  ← 上游账号/路由/配额
  ↑
ContentBase llm-client
  → /srv/contentbase/shared/llm.env (CONTENTBASE_LLM_*)
  → sub2api (170)
```

见 [CONVERGENCE.md](../CONVERGENCE.md#llm仅-sub2api--llmenv)。

## 运维配置归属

| 项 | 本机真源 | 124 落点 |
|----|----------|----------|
| Gateway | DataBase module | `/home/ubuntu/.codex-secrets/database-gateway/` |
| LLM | ContentBase module | `/srv/contentbase/shared/llm.env` |
| Tavily | web-evidence-provider module | `/srv/web-evidence-provider/.env` |
| 主题 | DataBase module | ContentBase consumes through module contract or explicit export |

ContentMRS root does not synchronize production secrets or restart services.
Each module owns its own secret sync and deployment procedure.
