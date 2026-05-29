#!/usr/bin/env bash
set -euo pipefail

TASK="$*"

if [ -z "$TASK" ]; then
  echo "Usage: ./scripts/codex-worker.sh <task description>"
  exit 1
fi

echo "[codex-worker] Executing task..."
echo "[codex-worker] Task: $TASK"
echo ""

codex exec "
你是 Claude Code 调度下的 Codex 子代理。
严格按照项目根目录的 AGENTS.md 规则行事。
只做下面任务，不要扩大范围。

完成后输出：
1. 修改文件：[列表]
2. 改动原因：[一句话]
3. 测试方式：[如何验证]
4. 风险：[可能出问题的地方]

任务：
$TASK
"
