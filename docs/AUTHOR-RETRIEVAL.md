# 作者检索链（读 → 写）

与 [AUTHOR-MODEL.md](AUTHOR-MODEL.md) 配套：**检索不是独立产品，是作者能力的前半段。**

## 真源

| 层 | 文件 / 接口 |
|----|-------------|
| 策略 | `DataBase/apps/gateway/config/material-notebooks.json` → `retrieval` |
| 解析 | `gateway/src/lib/retrieval-policy.ts` → `material-scope.ts` |
| 召回 | `GET /evidence/search`（LIKE + **默认 RAGFlow** + web） |
| 融合 | `gateway/src/lib/evidence-fusion.ts`（向量相似度 × 权重 + 词法分） |
| 内核 latent rerank | `latent-retrieval-signals.ts` + `author-conditioned-rerank.v2-latent`（读 `vectorSimilarity` / fused 分，非题材路由） |
| 消费 | ContentBase `normalizeArticleRequest` → `evidence-client` → `runGenerationKernel` |

## `retrieval.mode`

| mode | MySQL chunks | RAGFlow（env dataset） | Web |
|------|--------------|------------------------|-----|
| `hybrid` | 是（sourceIds 边界） | 默认开（env 已配置时） | 默认开 |
| `ragflow_web` | 否（不扫全库） | 默认开 | 默认开 |
| `web_only` | 否 | 否 | 是 |

备注含 **「仅联网」** → 强制 `web_only`（覆盖 notebook 默认）。

## Ownership

Retrieval operations belong to the DataBase Gateway module and the external
RAGFlow service owner. ContentMRS root does not deploy, configure, or verify
RAGFlow.

Required runtime shape:

1. DataBase Gateway owns `DATABASE_EVIDENCE_RAGFLOW_*`.
2. Gateway notebook config may point to env dataset names instead of hard-coded
   dataset UUIDs.
3. Scope curation should feed the owned RAGFlow datasets, not root scripts.
4. Dify calls the Gateway retrieval API; it does not depend on root runtime state.

## 禁止

- 用更长 prompt 替代向量召回  
- 每题加 `topic-inference` 或 `topic-corpus` 检索车道  
- `skipDatabaseSearch` 且关闭 RAGFlow/web（无材料边界）
