# ContentMRS Agent Rules

更新日期：2026-05-29

本文件用于约束 Codex、Claude、OpenCode 或其他 agent 在 ContentMRS 里的工作方式。

## 1. 默认任务合同

每个非平凡任务都必须先明确：

| 字段 | 要求 |
|---|---|
| Goal | 一句话目标，不能在执行中自行替换。 |
| Non-goals | 明确不做什么，尤其是不改边界、不降质量、不绕过 EvidencePack。 |
| Allowed files | 本任务允许修改的文件或目录。 |
| Forbidden files | 本任务禁止修改的文件或目录。 |
| Acceptance | 可执行命令、HTTP 检查、人工检查点。 |
| Diff budget | 最多改几个文件；超过就停止报告。 |
| Stop conditions | 需要改 schema、改目标、改 forbidden files、文档源码冲突等情况必须停。 |

## 2. 标准模板

```md
# TASK CONTRACT

## Goal
实现：<一句话目标>

## Non-goals
- 不改变产品目标
- 不改数据库真源边界
- 不改 ContentBase Writer 行为，除非本任务明确要求
- 不为了测试通过降低验收标准
- 不新增 fallback 假数据
- 不绕过 EvidencePack
- 不把业务编排放到根目录
- 不把 n8n 当业务真源

## Allowed files
- <允许改的文件>

## Forbidden files
- <禁止改的文件>

## Required behavior
- 保持现有 API 兼容
- 新功能必须走现有 Gateway / ContentBase 边界
- 所有新增状态必须可追踪
- 所有 AI 输出必须带 trace / diagnostics

## Acceptance
- <命令1>
- <命令2>
- <人工检查点>

## Diff budget
最多改 <N> 个文件。
超过必须停止并报告，不允许自行扩大范围。

## Stop conditions
遇到以下情况必须停止：
- 需要改 forbidden files
- 需要改 schema
- 需要改变目标
- 测试失败但原因不在本任务范围
- 发现现有文档与源码冲突
```

## 3. 明确禁止的“聪明优化”

| 禁止行为 | 原因 |
|---|---|
| 为了跑通测试切换 provider/model/runtime | 违反目标锁定，结果不可验真。 |
| 把 prompt 拼接逻辑放进 n8n workflow 或根脚本 | 会产生第二个业务大脑。 |
| 直连 MySQL 写作品、章节、发布状态 | 绕过 DataBase Gateway 的合同和审计。 |
| 新增 parallel clone、shadow config、shadow registry | 制造并行真源。 |
| 用假 evidence、假 draft、假 publish result 占位 | 会污染后续自动生产链路。 |
| 在文档、workflow、脚本里写真实 API Key/cookie/token | 造成凭据泄漏。 |

## 4. 默认验收顺序

| 顺序 | 检查 |
|---|---|
| 1 | 读取真实源码定义，确认改动没有偏离现有边界。 |
| 2 | 运行最小语法/类型检查，例如 `node --check server.mjs` 或模块 build。 |
| 3 | 对新增 HTTP 合同做无密钥/本地可行的形状检查。 |
| 4 | 扫描文档和改动文件，确认没有真实 secret 值。 |
| 5 | 汇报已改文件、验证结果、未完成的明确阻塞项。 |

