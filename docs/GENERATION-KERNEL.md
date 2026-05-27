# Generation Kernel（生成内核）

ContentMRS Tier-1 正文生成的**唯一哲学与实现真源**。不得用写作产品、车道、preset、pressure 观察器或体裁门禁覆盖本文件。

> **一句话**：Replace symbolic topic routing with latent retrieval-conditioned generation.  
> （用连续检索条件生成，取代符号化题材路由。）

## 专业术语（Glossary）

| 术语 | 含义 |
|------|------|
| **Retrieval-native generation** | \(P(\text{token} \mid \text{retrieved context})\)，不是 \(P(\text{token} \mid \text{preset})\) |
| **Author-conditioned generation** | 生成条件为 AuthorState，不是 `{ "style": "historical" }` 标签 |
| **In-context style learning** | 风格来自上下文段落分布，不是「请模仿三岛」单句 instruction |
| **Advanced / generative RAG** | 检索是 generation state 的一部分，不是联网插件 |
| **Latent style space** | 风格连续、重叠；反对 discrete symbolic routing |
| **Author-conditioned reranking** | `relevance(query, chunk, author_state)` |
| **Critic–revision loop** | 只处理 violation（事实 + surface pathology），不评文风正确性 |
| **Surface pathology** | 套语、SEO 腔、wiki 总结句 = entropy collapse |
| **Unified semantic memory** | 统一 chunk/manifold；`scope-*` 仅是边界 filter |
| **LM program** | `retrieve → rerank → compress → write → critique → revise`（`generation-kernel-pipeline.ts`） |
| **反对：Topic-classification-driven generation** | `topic → route → preset → template`（CMS 思维） |

**系统全名**：Author-conditioned retrieval-native generative system。

## 目标

**Author-conditioned retrieval-native generation**。

### 实现顺序（硬，按序做）

```txt
1. 删除 lane / preset / pressure / styleTopicId 自动注入     ← 已完成
2. 统一 chunk + metadata（semantic-chunk.ts）
3. query 检索（Gateway EvidencePack）
4. author_state rerank（`author-conditioned-rerank.v2-latent` + `latent-retrieval-signals.ts`，用 Gateway 向量/融合分）
5. compress → writing_state（compress-writing-state.ts）
6. 单 writer（WriterAgent）
7. fact gate + AI 病 gate（evaluation.ts）
8. revise until clean
```

### 运行时管线

```txt
USER QUERY
   ↓ retrieve (Gateway)
   ↓ web hygiene gate (drop titlebait/slogan shells, keep trace)
   ↓ author-conditioned rerank (ContentBase)
   ↓ compress → writing_state
   ↓ writer (single)
   ↓ critic (fact + surface only)
   ↓ revise until clean
```

## 禁止回归（硬 — 不得再合并）

下列模式**永久禁止**进入 `ContentBase/product/novel/app/article` 主链：

| 禁止 | 专业名 |
|------|--------|
| `notebook lane` / `softRoute` / `POST /scope/route` 关键词路由 | symbolic routing |
| `styleTopicId` 自动注入、`applyTopicPresetToRequest` 非恒等 | preset injection |
| `pressure-runtime` / `ARTICLE-PRESSURE-*` / `pressureTransitions` | rhetoric-as-gate |
| `film_commentary` / `zhenghe-lane` 等作 **writer 或 gate 开关** | topic-classification-driven |
| 按 `notebookId` / 兴亡 / 影评 切换 syntax profile 或 block 严重度 | discrete genre gates |
| `enableExtendedArticleGates`、段落字数/5–8 段/拼贴密度门禁 | legacy CMS gates |
| `allowQualityFailures` 出厂 | industrial bypass |
| 多 writer / 按 target 分叉人格 | split author persona |

**允许**：`scope-*` 仅作 **材料边界**（`sourceIds` / RAGFlow dataset）；`note` 仅影响联网策略（`web_only` 等）。
**必须**：web 检索结果进入 writer 前先过 hygiene gate，剔除标题壳句与舆情口号，保留剔除证据供审计。

**回归测试**：`tests/kernel-regression-guard.test.ts` — CI 应包含。

## 已删除的世界观

见上表。`film-commentary` 等旧名**不得**再出现在路由代码中；仅允许在历史文档对照或 `legacyNotebookId` 溯源字段。

## 实现映射（代码）

| 层 | 模块 |
|----|------|
| L0 AuthorState | `author-state.ts` |
| L1 SemanticChunk | `semantic-chunk.ts` |
| L2 Rerank | `author-conditioned-rerank.ts` + `latent-retrieval-signals.ts` + (optional) Gateway learned rerank service |
| L2.5 Writing state | `compress-writing-state.ts` + `latent-generation-controller.ts` |
| 编排 | `generation-kernel-pipeline.ts` → `capability.ts` `buildArticleMaterialPack` |
| L3 Writer | `article-agent-contracts.ts`（单 Writer） |
| L4 Critic | `evaluation.ts`（事实 + `syntax-reviewer` 表面病） |

`material-pack` 版本：`article-material-pack.v2-kernel`。`retrievalPolicy.kernel`: `generation-kernel.v1`。

### Learned latent MVP (env-gated)

- Gateway 设置 `DATABASE_EVIDENCE_LATENT_RERANK_URL` 时，`/evidence/search` 会先调用 learned rerank；失败自动回退到现有 fusion + paper-qa。
- ContentBase `generation-kernel` 会生成 `latentControl`（`styleWeight` / `factWeight` / `source` / `reason`），并写入 `writing_state`。
- 验收报告 `production-article-acceptance` 会输出 `kernel.latent-generation-control` trace。
- 对比命令：`node -r ts-node/register/transpile-only tools/eval-latent-mvp.mjs`。

### AuthorState（MVP）

```txt
AuthorState = 作者合同 + 词表 + 禁用表面病 + styleQuery 样本检索结果
```

不必先训自有 embedding 模型；Tier-1 用 RAGFlow 向量 + Gateway 融合 + 内核 latent rerank。cross-encoder / DSPy 为演进项。

## 请求面

```json
{
  "topic": "伊朗危机",
  "target": "essay",
  "note": "可选",
  "includeWeb": true,
  "styleProfileId": "immersive_historical_synthetic_narrative",
  "styleQuery": { "query": "句法 物象", "sourceIds": ["book_kinkakuji_restricted_style"] }
}
```

可选：`notebookId` / `sourceIds`（材料边界 only）。禁止自动 `notebookId`、`styleTopicId`、关键词车道。

## 配置真源

| 文件 | 状态 |
|------|------|
| `material-notebooks.json` | `scope-*` 边界 only |
| `topic-corpus.json` | `v2-open`，空 topics |
| `applyTopicPresetToRequest` | **恒等** |
| `pressure-runtime` / `author-lane` | **不存在** |

## 验收

- `production-article-acceptance`：`revision` on，`quality.block === 0`
- `node --test tests/kernel-regression-guard.test.ts`
- `node --test tests/generation-kernel.test.ts`
- 禁止：`allowQualityFailures`
- 风控可观测：错误必须包含 `provider/model/endpoint/status`，且文档化 fallback 顺序可执行

## 相关文档

- [CONTRACT.md](../CONTRACT.md) §2
- [AUTHOR-MODEL.md](AUTHOR-MODEL.md)
- [INTEGRATION.md](INTEGRATION.md)
