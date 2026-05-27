# 证据检索边界

> 真源：[GENERATION-KERNEL.md](GENERATION-KERNEL.md)。**材料边界** = `material-notebooks.json` 中的 `scope-*` 或显式 `sourceIds`；**不是**关键词车道或 `styleTopicId` 路由。

## 调用约定

| 输入 | 行为 |
|------|------|
| `topic`（必填） | 检索 query、材料筛选、写作合同的主真源 |
| `note`（可选） | 如「仅联网」→ `web_only`（经 Gateway `retrieval-policy`） |
| `notebookId`（可选） | **仅**绑定 `sourceIds` / `ragflowDatasetEnv` / `excludeQueries` 等检索参数 |
| `sourceIds`（可选） | 显式书库；可与 notebook 叠加 |
| `topicId`（可选） | 显式高级覆盖；**不会**从标题推断 |
| `evidenceQuery` | 轮次、limit、includeWeb、includeRagflow |

**已删除**：`topic-mode-resolver` 关键词推断、`notebook.styleTopicId` 自动绑语气。

## 预置 scope（检索专用）

| notebookId | 检索模式 | 说明 |
|------------|----------|------|
| `scope-ragflow-web` | ragflow_web | RAGFlow + web；`skipDatabaseSearch` |
| `scope-hybrid-tight` | hybrid | 较紧轮次；`sourceIds` 见 `material-notebooks.json` |
| `scope-hybrid-default` | hybrid | 默认轮次；`sourceIds` 见配置 |

## Runtime 默认（open）

- 无 `notebookId`：`topic-mode.v2-open`，默认联网 + hybrid 全库（`defaultEvidence`）
- 证据轮次：`material-notebooks.json` → `defaultEvidence` 或 scope 条目上的 `defaultRounds` / `defaultLimit`
- 出厂：`revision` 默认开启；`quality` block 必须清零

## 本机闭环

```powershell
cd ./ContentBase/product/novel
$env:DATABASE_GATEWAY_URL = "http://127.0.0.1:18090"
pnpm run smoke:closed-loop -- --notebookId scope-hybrid-default --topic "你的题目"
```

## Gateway

检索在 **DataBase Gateway**（`search_chunks`、`semantic_units`、web、RAGFlow）。ContentBase 不直连 MySQL。
