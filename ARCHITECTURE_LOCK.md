# ContentMRS Architecture Lock

更新日期：2026-05-29

本文锁定 ContentMRS 的模块边界。后续 agent、n8n、脚本和人工操作都应按这里的职责分工推进。

## 1. 单一职责边界

| 模块 | 职责 | 禁止事项 |
|---|---|---|
| n8n | 调度、Webhook、重试、人工审核通知、发布流水线状态推进 | 不保存业务真源；不拼 prompt；不直连 MySQL；不拥有作品状态机；不绕过 ContentBase/DataBase |
| ContentBase | 上下文组装、EvidencePack 消费、Writer 调用、修订、诊断、runtime action 合同 | 不拥有数据库 schema；不替代 DataBase 写入审计；不让自由 prompt 成为编排入口 |
| DataBase Gateway | 作品、章节、证据、语料、写入审计、发布结果、API/SDK/OpenAPI 真源 | 不把业务合同复制到根目录；不让 ContentBase 或 n8n 绕过 Gateway 直写数据库 |
| ContentAdmin | 人类审稿、配置观察、队列观察、回滚入口、服务端代理 | 不保存服务密钥到浏览器；不成为业务数据真源 |
| OpenList | 文件投影、文件读取面 | 不做语义真源；不替代 DataBase 的作品/证据记录 |
| 根目录 | 索引、边界说明、部署辅助、只读生成辅助 | 不恢复 root runtime；不拥有业务编排、SDK、数据库或 Writer 逻辑 |

## 2. n8n 使用规则

| 规则 | 说明 |
|---|---|
| n8n 只能调用固定 action | 使用 `POST /api/novel/runtime/actions/<action>`，不要把自由 prompt 直接传给 Writer。 |
| 状态必须回到 DataBase | draft、trace、diagnostics、acceptance report、publish result 必须通过 DataBase Gateway 写入门面保存。 |
| 失败不自动改目标 | 生成失败、证据缺失、字数偏离或发布失败时，n8n 只能重试同一合同或通知人工，不允许自行改模型、改目标、降质量。 |
| 人工审核是发布前置 | `draft_ready` 之后必须经 ContentAdmin 或人工批准，才允许进入发布队列。 |
| 凭据只走 n8n credentials/env | 不允许在 workflow JSON、Code Node、文档或 prompt 中硬编码 API Key、cookie、token、密码。 |

## 3. ContentBase action 合同

当前允许的 action 名称：

| Action | 当前状态 | 说明 |
|---|---|---|
| `plan-work` | 合同占位，返回 blocked | 预留作品规划入口。 |
| `plan-volume` | 合同占位，返回 blocked | 预留分卷规划入口。 |
| `generate-chapter` | 已接入现有 Writer | 复用 `generateArticle`、context engine、LLM trace 和 diagnostics。 |
| `revise-chapter` | 合同占位，返回 blocked | 预留修订入口。 |
| `check-continuity` | 合同占位，返回 blocked | 预留连续性检查入口。 |
| `prepare-publication` | 合同占位，返回 blocked | 预留发布 payload 准备入口。 |

所有 action 返回同一外壳：

```json
{
  "draft": {},
  "trace": {},
  "diagnostics": {},
  "contractUsed": {},
  "violations": [],
  "nextAllowedActions": []
}
```

禁止输入字段：

```text
freeformPrompt
prompt
messages
systemPromptOverride
```

## 4. Agent 修改约束

| 约束 | 说明 |
|---|---|
| 不降目标 | 不得为了测试通过改产品目标、改用户指定 provider/model/runtime、降低验收标准。 |
| 不新增假数据 fallback | 不能用假 evidence、假 draft、假 publish result 冒充跑通。 |
| 不绕过 EvidencePack | 事实类写作必须通过 DataBase Gateway EvidencePack 或明确标记证据缺失。 |
| 不扩散真源 | 新增 registry/config/preferences/catalog/map/metadata 前，必须证明 canonical owner、schema 和执行消费者。 |
| 先读真实定义 | 改接口、字段、构造参数、路由或服务方法前，先读源码定义和现有调用方。 |

## 5. 首个 n8n MVP

| 步骤 | 执行方 | 接口/动作 |
|---|---|---|
| 查询待生成任务 | n8n -> DataBase Gateway | 读取待处理作品/章节或任务视图 |
| 生成章节 | n8n -> ContentBase | `POST /api/novel/runtime/actions/generate-chapter` |
| 保存草稿和报告 | n8n -> DataBase Gateway | `writes/record-generation-output`、acceptance/reference/audit 写入门面 |
| 通知审核 | n8n -> ContentAdmin/人工渠道 | draft_ready 通知 |
| 审核通过后发布 | n8n -> 平台/API | 记录 publish result，不自动改正文 |

