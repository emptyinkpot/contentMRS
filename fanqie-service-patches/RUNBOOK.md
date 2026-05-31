# 自动发布 RUNBOOK

## 核心原则

**禁止根据 DataBase 最新章节决定发布顺序。只能根据番茄远端最新章节决定下一章。**

## 发布状态机

```
LOCK book
  ↓
POST /publication/plan-next
  ↓
publishable == false → 进入生成模式
  ↓
POST /publication/publish-next-safe
  ↓
success == true → 完成
  ↓
success == false → 查看 abortedAt 和 reason，不重试
UNLOCK book
```

## 接口契约

### POST /publication/plan-next

输入：
```json
{ "workId": 9, "bookId": "7610788958707928089", "accountId": "fanqie_1fb88c898efb" }
```

输出：
```json
{
  "remoteLatestChapterNumber": 189,
  "nextChapterNumber": 190,
  "dbChapterFound": true,
  "publishable": true,
  "reason": null,
  "dbChapterWordCount": 3200
}
```

### POST /publication/publish-next-safe

输入：
```json
{
  "workId": 9,
  "bookId": "7610788958707928089",
  "accountId": "fanqie_1fb88c898efb",
  "dryRun": false,
  "minWordCount": 1000
}
```

输出（成功）：
```json
{
  "success": true,
  "chapterNumber": 190,
  "dryRun": false,
  "steps": [
    { "step": "plan", "status": "ok" },
    { "step": "preflight", "status": "ok" },
    { "step": "publish", "status": "succeeded" },
    { "step": "verify", "status": "ok" },
    { "step": "record", "status": "ok" }
  ]
}
```

输出（失败）：
```json
{
  "success": false,
  "abortedAt": "preflight",
  "reason": "正文 500 字 < 最低 1000 字",
  "steps": [...]
}
```

## 禁止事项

- 禁止根据 DataBase 章数决定发布顺序
- 禁止在生产服务器上 sed/vim/tsc/npm install
- 禁止重启生产服务
- 禁止绕过 fanqie-service 自己写 Playwright 脚本
- 禁止不经验真就报告发布成功
- 禁止跳过 preflight 直接发布

## 故障处理

| 故障 | 处理 |
|------|------|
| plan-next 返回 remote_scan_failed | 检查 session，不重试 |
| preflight 字数不足 | 重新生成，不降低标准 |
| publish 超时 | 生成修复报告，不在生产改代码 |
| verify 失败 | 记录异常，人工确认 |

## 真源划分

| 数据 | 真源 |
|------|------|
| 已发布到第几章 | 番茄远端（通过 scan） |
| 下一章是几 | 番茄远端 + 1 |
| 章节正文 | DataBase |
| 发布执行 | fanqie-service |
| 生成逻辑 | ContentBase |
