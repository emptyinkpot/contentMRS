---
description: "调度 Codex CLI 执行子任务。Claude Code 负责拆任务和审查，Codex 负责局部实现。"
---

# /codex 命令

你现在要把任务拆给 Codex CLI 执行。

## 流程

1. 分析用户需求，产出**机器可执行的任务清单**（文件级、函数级）
2. 调用 `./scripts/codex-worker.sh` 传入任务
3. 等待 Codex 返回结果
4. 审查 `git diff`，检查是否符合预期
5. 不满意则再次调用 Codex 修正
6. 满意则向用户汇报

## 任务清单格式（传给 Codex 的）

不要写高层描述，要写具体指令：

```
1. 修改 src/publish/publish-chapter.ts
2. 在 publishToFanqie 函数中，fetch 失败后加入重试逻辑（最多3次，间隔2秒）
3. 不修改其他文件
4. 不改变函数签名
```

## 执行

```bash
./scripts/codex-worker.sh "$ARGUMENTS"
```

## 审查要点

- Codex 是否只改了指定文件
- 是否引入了新依赖
- 是否改变了现有接口
- 类型检查是否通过（`npx tsc --noEmit`）
- 是否有硬编码的密钥或 URL
