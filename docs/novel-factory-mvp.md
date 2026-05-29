# Novel Factory MVP Spec

更新日期：2026-05-29 19:05

## 0. 当前状态

| 组件 | 状态 |
|------|------|
| ContentBase generate-chapter | 服务器部署 release `novel-factory-202605291902`，含 `/api/novel/runtime/actions/generate-chapter` |
| DataBase Gateway 写入门面 | 活跃，accept `{payload:{...}}` envelope + `X-DataBase-Idempotency-Key` |
| fanqie-service publish driver | 已修复（标题/内容/检测面板/bridge envelope）|
| fanqie-service session 管理 | DPAPI 提取自动化已集成到 `--login --wait` 流程 |
| n8n workflow `novel-factory-generate-quality-publish` | 已激活，webhook 注册 `POST /webhook/novel-factory-generate-quality-publish` |
| Live publish 验证 | Chapter 106 "疯狂的撕咬" + Chapter 107 "圣袍与裹尸布" 已发布到番茄 |

## 1. 阶段目标

先打通最小闭环，不追求最终文风和全自动审核：

```text
人物 / 背景 / 大纲 / workId / chapterNumber
  -> ContentBase 生成章节
  -> DataBase 保存章节正文、trace、diagnostics
  -> fanqie-service 从 DataBase 解析待发布章节
  -> dry-run 发布验证
  -> 可选 live 发布
  -> DataBase 记录发布结果
```

## 1.1 一般文章生成 vs 小说正文生成（区别）

| 维度 | 一般文章（Claude 散文） | 小说正文（Novel Factory） |
|------|----------------------|--------------------------|
| 模型 | Claude (走 ContentBase 通用 LLM 配置) | Qwen fiction (`CONTENTBASE_QWEN_*`)，narrative/fiction 路由 |
| 入口 | `POST /api/content/runtime/generate/article` | `POST /api/novel/runtime/actions/generate-chapter` |
| 输入 | topic + EvidencePack（RAGFlow 联网检索）| 人物设定 + 世界观背景 + 大纲 + 前文摘要 |
| 材料来源 | RAGFlow + DataBase `/evidence/search` | DataBase 人物/世界/大纲 + 前章记忆 + 三层文学注入 |
| 文风控制 | StyleContract + 单层 styleQuery | Literary 化用 + Semantic 语义密度 + Lexicon 词汇管控 |
| 反 AI 检测 | 基础 de-AI | 严格 de-AI 后处理 + 文学化用要求 + 粗粝结尾 |
| 字数 | ~2000 | 2400+，continuation threshold 90% |
| 出厂判据 | block=0, referenceCoverage≥72 | violations 为空 + 正文非空 + trace 完整 |
| 发布 | 无自动发布 | 自动发布到番茄小说平台 |

## 2. 边界

| 模块 | 本阶段职责 |
|---|---|
| n8n | 调度和串联 HTTP 节点；不拼自由 prompt；不直连 MySQL。 |
| ContentBase | `generate-chapter` action；使用人物、背景、大纲、目标字数生成正文并返回 trace/diagnostics。 |
| DataBase Gateway | 章节正文和 canonical block 写入；发布目标、账号、远端作品、发布结果真源。 |
| fanqie-service | 复用现有 `publish/database-chapter`；负责浏览器发布、确认和回写。 |

## 3. 输入合同

| 字段 | 必填 | 说明 |
|---|---|---|
| `workId` | 是 | DataBase legacy `works.id`。 |
| `chapterNumber` | 是 | 要生成和发布的章节号。 |
| `title` | 是 | 章节标题；没有时用 topic。 |
| `characters` | 否 | 人物列表或人物说明。 |
| `background` | 否 | 世界观、当前背景、场景约束。 |
| `outline` | 否 | 本章大纲、冲突、转折、结尾点。 |
| `wordCount` | 否 | 默认 2400。 |
| `targetId/accountId/bookId/localWorkId` | 发布时至少能解析出 | fanqie-service/DataBase 发布目标。 |
| `dryRun` | 否 | 默认 `true`，先验证不真实发布。 |

禁止字段：

```text
prompt
messages
freeformPrompt
systemPromptOverride
```

## 4. 执行流

| 步骤 | 调用 | 验收 |
|---|---|---|
| 生成章节 | `POST /api/novel/runtime/actions/generate-chapter` | `draft.body` 非空；`trace.modelInvocation` 有 provider/model/baseUrl；`violations` 为空。 |
| 保存章节 | `POST /writes/record-generation-output` | `item.chapterId`、`item.partId`、`item.blockId` 存在；`wordCount > 0`。 |
| dry-run 发布 | `POST /publish/database-chapter` | `accepted=true`、`completed=true`、`status=succeeded`。 |
| live 发布 | 同上，`dryRun=false` | `status=succeeded`，并且有 confirmation evidence。 |
| 结果回写 | fanqie-service 自动调用 DataBase | `publication_records` 有记录；章节状态进入 published 或 published_unconfirmed。 |

## 5. 先跑版成功标准

| 标准 | 说明 |
|---|---|
| 可生成 | 不要求文风完美，但必须生成一章完整正文。 |
| 可保存 | DataBase 能通过 `/content/publication/publish-chapter` 读回正文。 |
| 可 dry-run | fanqie-service database publish dry-run 成功。 |
| 可 live | 人工确认后再关闭 dry-run。 |
| 可追踪 | 每次运行保留 trace、diagnostics、idempotencyKey 和发布结果。 |

## 6. 后续精修

| 项 | 延后原因 |
|---|---|
| 人工审核 UI | 先用 dry-run 和 DataBase 状态跑通。 |
| 连续性检查 | 第一阶段只生成单章。 |
| 自动修订 | 等质量门稳定后再接 `revise-chapter`。 |
| 远端章节冲突策略 | 先用 `publish/database-chapter` 精确章节；后续再用 `publish/next-database-chapter`。 |

## 7. n8n workflow 触发示例

n8n webhook 已激活在 server-124 上：

```bash
ssh ubuntu@124.220.233.126 "curl -X POST http://127.0.0.1:5678/webhook/novel-factory-generate-quality-publish \
  -H 'Content-Type: application/json' \
  -d '{
    \"workId\": 7,
    \"chapterNumber\": 108,
    \"title\": \"新的教义\",
    \"topic\": \"新的教义\",
    \"characters\": \"...\",
    \"background\": \"...\",
    \"outline\": \"...\",
    \"wordCount\": 2400,
    \"accountId\": \"fanqie_52d5ff1c9614\",
    \"bookId\": \"7600575059215780926\",
    \"localWorkId\": \"7\",
    \"dryRun\": true
  }'"
```

成功流程：webhook → ContentBase generate-chapter → DataBase record-generation-output → fanqie-service publish/database-chapter → 返回 `{ok:true, generation, saved, publish}`。

## 8. fanqie session 管理

每 ~14 天番茄账号 cookies 会失效。重新登录流程（已自动化）：

```bash
# 在 Windows 本地（不在服务器）：
cd "E:/My Project/fanqie-service"
node dist/src/runtime/browser/fanqie-session-check.mjs <accountId> --login --wait
# → 弹出 Edge 窗口 → 用户登录 → 关闭窗口
# → 自动 DPAPI 解密 cookies → 写入 DataBase Gateway → 完成
```

服务器上的 fanqie-service 自动从 DataBase 读取最新 cookies，无需重启。

