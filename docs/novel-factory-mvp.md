# Novel Factory MVP Spec

更新日期：2026-05-29

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

