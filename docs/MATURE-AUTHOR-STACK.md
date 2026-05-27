# 成熟作者栈（Mature Author Stack）

> **不是玩具拼装**：主链 = 抄 vendor 的 **Notebook 隔离 + RAGFlow 向量召回 + STORM 扩问 + paper-qa 筛料 + ContentBase 作者合同**。  
> 禁止用更长 prompt、`topic-corpus` preset 树或 pressure 程序替代本栈。哲学真源：**[GENERATION-KERNEL.md](GENERATION-KERNEL.md)**。

## 与 NotebookLM 对齐的部分

| NotebookLM 能力 | ContentMRS 实现 |
|-----------------|-----------------|
| 材料边界（非车道） | 显式 `notebookId`/`sourceIds` + `POST /scope/resolve`；`material-scope.v2-open` 无信号路由 |
| 上传→切块→embed | DataBase-owned RAGFlow integration + MySQL `import:local-book-corpus` |
| 向量问答/成文 | Gateway **Phase1 RAGFlow 多 query** → EvidencePack → ContentBase 写作 |
| 多源引用 | `citation-grounding` + 禁 [S01] 可见编号 |

## ContentMRS 独有（NotebookLM 不做）

- **AuthorState**（`author-state.ts`：合同 + 词表 + 表面病 + `styleQuery` 样本；风格靠 rerank + in-context，不靠 preset/lane）
- **散文作者合同**（`legacy-authorial-hints` + `writing_state.compressedPrompt`）
- **批评家出厂**（事实 gate + AI 病 surface gate；无 `ARTICLE-PRESSURE-*`）
- Gateway 写库 + MyBlog/番茄发布

## 三阶段检索（Gateway `/evidence/search`）

```text
Phase 1  vector_primary   RAGFlow（notebook dataset env）× STORM 扩问（最多 5 条）
Phase 2  lexical_corpus   search_chunks + semantic_units（hybrid notebook）
Phase 3  web_supplement   Tavily（web-evidence-quality 去 SEO/舆情壳）
         ↓
fuseEvidenceChunkRanking → paper-qa gather → excludeQueries → EvidencePack
```

`mode` 字段：`vector_primary_projection` | `author_hybrid_projection` | …

## 配置真源（生产必配）

### 1. Vendor / reference ownership

Upstream reference code and vendored runtime code belong inside the module that
uses them. ContentMRS root no longer keeps a vendor reference tree or a
vendor-in script.

### 2. RAGFlow + embedding

RAGFlow deployment, embedding configuration, dataset preparation, and smoke
tests belong to the DataBase Gateway module and the RAGFlow service owner. The
ContentMRS root must not provide deploy or repair scripts for this path.

### 3. Gateway env（`database_gateway.env`）

```env
DATABASE_EVIDENCE_RAGFLOW_URL=http://127.0.0.1:9380
DATABASE_EVIDENCE_RAGFLOW_API_KEY=<ragflow-api-key>
DATABASE_EVIDENCE_RAGFLOW_REQUIRED=true

# 全局回落（可选）
DATABASE_EVIDENCE_RAGFLOW_DATASET_IDS=<default-dataset-id>

# 按 scope 隔离（推荐）
DATABASE_EVIDENCE_RAGFLOW_DATASET_HYBRID=<hybrid scope dataset>
DATABASE_EVIDENCE_RAGFLOW_DATASET_WEB=<web/RAGFlow scope dataset>

DATABASE_EVIDENCE_WEB_SEARCH_URL=http://127.0.0.1:19091/search
```

`material-notebooks.json` 用 `ragflowDatasetEnv` 指向上述变量名，**不在 JSON 里写死 dataset UUID**。

### 4. RAGFlow 策展（`scope-ragflow-web`）

向 `DATABASE_EVIDENCE_RAGFLOW_DATASET_WEB` 灌领域 PDF/摘录。  
仅 Tavily、无 dataset → 备注 **「仅联网」**（`web_only`），不得声称 NotebookLM 级读 PDF。

## 验收

```powershell
# Gateway 向量 + 词法，命令在 DataBase 模块内执行
cd DataBase/apps/gateway
npm run smoke:ragflow-evidence

# 闭环，命令在 ContentBase 模块内执行
cd ContentBase/product/novel
pnpm run smoke:closed-loop -- --profile hybrid --topic "你的题目"

# RAGFlow+web scope（勿 --revision false）
node --experimental-strip-types tools/generate-article-mvp.mjs `
  --topic "你的题目" `
  --notebookId scope-ragflow-web `
  --note "要联网" --persist false --sync true
```

通过标准：

- `trace.evidencePack.mode` 含 `vector_primary` 或 `author_hybrid`
- `provider` 含 `ragflow.retrieval`
- 正文无 SEO 舆情标题复读；`quality` block 须 revision 或 CLI 失败

## 禁止回退

- 每题加 `topic-inference` 正则  
- 无 RAGFlow 时静默只跑 LIKE（`DATABASE_EVIDENCE_RAGFLOW_REQUIRED=true` 时直接 503）  
- `--revision false` 当验收成功  
- 在 ContentBase 私接 Tavily/RAGFlow  

## 相关文档

- [AUTHOR-MODEL.md](AUTHOR-MODEL.md) · [AUTHOR-RETRIEVAL.md](AUTHOR-RETRIEVAL.md)
- [INTEGRATION.md](INTEGRATION.md)
