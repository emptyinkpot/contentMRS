# 软约束生成（只传 topic）

面向产品调用：**用户只给主题**（可选一句 `note`），不必记检索参数。系统在 ContentBase runtime 内做 **open 默认**（联网 + 全库 hybrid），或通过**显式** `notebookId` / `sourceIds` 限定材料边界。见 [GENERATION-KERNEL.md](GENERATION-KERNEL.md)。

## 调用面

| 字段 | 必填 | 说明 |
|------|------|------|
| `topic` | 是 | 文章主题或剧情梗概 |
| `note` | 否 | 自然语言补充，如「要联网」「仅联网」 |
| `notebookId` | 否 | **仅材料边界**（如 `scope-ragflow-web`）；不传则 open 模式 |
| `sourceIds` | 否 | 显式书库边界，优先于 notebook |
| `styleProfileId` | 否 | Author Memory 合同（默认 `immersive_historical_synthetic_narrative`） |
| `styleQuery` | 否 | 显式文学句法检索源（如 `book_kinkakuji_restricted_style`） |

**禁止依赖**：关键词软路由、`styleTopicId` 自动注入、`topic-corpus` preset 树。

## 内部分层（KERNEL）

1. **检索** — `normalizeArticleRequest` → Gateway `/scope/resolve`（显式边界）→ `/evidence/search`
2. **Author Memory** — `styleProfileId` + `styleQuery` + `legacy-authorial-hints`
3. **结构** — STORM 大纲（可选）+ `writingBrief`
4. **写作** — 单一 `WriterAgent`
5. **批评** — 事实 gate + AI 病 surface gate；`revision` 默认开启

实现入口：`ContentBase/product/novel/app/article/normalize-article-request.ts`（`soft-generate-defaults` → `material-scope`；`applyTopicPresetToRequest` 为恒等）。

### Scope 严格模式（默认开）

| 变量 | 默认 | 说明 |
|------|------|------|
| `CONTENTMRS_STRICT` | `true` | Gateway requireScope + ContentBase scope fail-fast |
| `CONTENTMRS_NOTEBOOKS_LOCAL_FALLBACK=1` | 未设 | 读本地 `config/material-notebooks.json` |
| `CONTENTMRS_TOPIC_CORPUS_LOCAL_FALLBACK=1` | 未设 | 读本地 `topic-corpus.json`（空 open corpus） |

## 材料 scope 示例（非车道）

| notebookId | 用途 |
|------------|------|
| `scope-ragflow-web` | RAGFlow 策展 + 联网，不扫全库 |
| `scope-hybrid-tight` | hybrid，较紧轮次/条数 |
| `scope-hybrid-default` | hybrid，默认轮次/条数 |

配置真源：`DataBase/apps/gateway/config/material-notebooks.json`（无 `softRoute` / `styleTopicId`）。

## 本机全文生成

```powershell
cd ./ContentBase/product/novel
$env:DATABASE_GATEWAY_URL = "http://127.0.0.1:18090"
$env:DATABASE_GATEWAY_API_KEY = "<key>"

# 只传 topic + note（open + 默认联网）
node --experimental-strip-types tools/generate-article-mvp.mjs `
  --topic "你的题目" `
  --note "要联网" `
  --persist false --sync true

# 显式 RAGFlow+web 材料边界
node --experimental-strip-types tools/generate-article-mvp.mjs `
  --topic "你的题目" `
  --notebookId scope-ragflow-web `
  --note "要联网" `
  --persist false --sync true

# Tier-1 出厂
pnpm run smoke:production:full -- --profile hybrid --topic "你的题目"
```

作者模型：[AUTHOR-MODEL.md](AUTHOR-MODEL.md)。整合：[INTEGRATION.md](INTEGRATION.md)、[evidence-scope.md](evidence-scope.md)。
