# Tier-1 生产成文管线（GENERATION-KERNEL）

出厂真源：验收、脚本、ContentAdmin 均应走同一条链。哲学见 [GENERATION-KERNEL.md](GENERATION-KERNEL.md)。

## 架构

```text
topic (+ 可选 note)
  → normalizeArticleRequest（唯一预处理）
      open defaults / 显式 notebookId（材料 scope only）
      Gateway POST /scope/resolve
  → EvidencePack + StylePack（显式 styleQuery / styleProfileId）
  → runtime.generate.article（单一 Writer + critic revision）
  → 出厂（block 清零，referenceCoverage ≥ 72）
```

**无** preset 注入、`POST /scope/route`、`ARTICLE-PRESSURE-*`。

## 验收 scope（材料边界，非专题）

| profile | notebookId | 用途 |
|---------|------------|------|
| `ragflow_web` | `scope-ragflow-web` | RAGFlow + 联网，`skipDatabaseSearch` |
| `hybrid_tight` | `scope-hybrid-tight` | hybrid，较紧轮次 |
| `hybrid` | `scope-hybrid-default` | hybrid，默认轮次 |
| `open` | （空） | 仅 topic + 默认联网边界 |

**必须** 传 `--topic`（profile 内 topic 默认为空）。

```powershell
cd ContentBase/product/novel

pnpm run smoke:production -- --profile hybrid --topic "你的题目" --mode evidence
pnpm run smoke:production:full -- --profile ragflow_web --topic "你的题目"
```

报告：`product/novel/.runtime/acceptance/production-article-acceptance-*.json`。

## 与旧工具

| 旧 | 现 |
|----|-----|
| `film` / `zhenghe` / `corpus` profile | `ragflow_web` / `hybrid_tight` / `hybrid` |
| `scope-film-*` / `scope-zhenghe-*` notebookId | `scope-ragflow-web` / `scope-hybrid-*` |
| `generate-article-mvp` + `allowQualityFailures` | block 即失败 |
| `closed-loop-article-smoke.mjs` | 转发 `production-article-acceptance.mjs` |
| `generate-zhenghe-evaluation.mjs` | `generate-scope-evaluation.mjs` |

## 出厂判据（硬）

1. `scope.resolve` 成功
2. EvidencePack `citations ≥ 3`
3. `GET /creative/style-contract` 200
4. RAGFlow profile：`kernel.latent-rerank` 通过（`vectorHitsInTop ≥ 1`，可设 `CONTENTMRS_MIN_VECTOR_HITS_IN_TOP`）
5. `quality` **block = 0**
6. `referenceCoverage.score ≥ threshold`
6. `acceptance.passed` 与 `quality.passed` 为真

## 代码真源

- `tools/lib/production-article-pipeline.mjs` — `PRODUCTION_SCOPES`
- `DataBase/apps/gateway/config/material-notebooks.json`
- `config/material-notebooks.json`（ContentBase 副本）

## 模型回退与风控可观测

- 运行时候选顺序：`CONTENTBASE_LLM_MODEL / CONTENTBASE_DEFAULT_MODEL`（同 provider 多模型，按声明顺序）→ `CONTENTBASE_LLM_FALLBACK_*`（备用 provider 白名单）。
- 关键 env：
  - 主路由：`CONTENTBASE_LLM_BASE_URL`、`CONTENTBASE_LLM_API_KEY`、`CONTENTBASE_LLM_MODEL`
  - 同 provider 模型序列：`CONTENTBASE_DEFAULT_MODEL`（支持逗号分隔）
  - 备用 provider：`CONTENTBASE_LLM_FALLBACK_BASE_URL`、`CONTENTBASE_LLM_FALLBACK_API_KEY`、`CONTENTBASE_LLM_FALLBACK_MODEL`
- moderation / provider 拒绝时，错误文本必须含：`provider`、`model`、`endpoint`、`status`、`moderation`，用于切换白名单路由；不允许吞成通用 500。
