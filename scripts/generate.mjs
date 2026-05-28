#!/usr/bin/env node
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { execSync } from "node:child_process";

const API_KEY = process.env.CONTENTMRS_API_KEY || "cb-k9Xm4wPqR7vJ2nLs5tYh8dFe";
const SSH_HOST = process.env.CONTENTMRS_SSH_HOST || "ubuntu@124.220.233.126";
const LOCAL_API = "http://127.0.0.1:5111";

const args = process.argv.slice(2);
const flags = {};
const positional = [];

for (let i = 0; i < args.length; i++) {
  if (args[i].startsWith("--")) {
    const key = args[i].slice(2);
    const val = args[i + 1] && !args[i + 1].startsWith("--") ? args[++i] : "true";
    flags[key] = val;
  } else {
    positional.push(args[i]);
  }
}

const topic = positional[0] || flags.topic;
if (!topic) {
  console.error(`用法: node scripts/generate.mjs "文章主题" [选项]

选项:
  --words <数字>     目标字数 (默认 2400)
  --genre <类型>     体裁 (默认 historical-essay)
  --target <描述>    写作方向
  --output <路径>    输出文件路径 (默认 stdout)
  --json             输出完整 JSON (含诊断信息)

示例:
  node scripts/generate.mjs "满洲人征服中国的历史悖论" --words 8000 --output ./output.md
  node scripts/generate.mjs "波斯湾的石油与信仰" --words 3000`);
  process.exit(1);
}

const body = {
  topic,
  wordCount: Number(flags.words || flags.wordCount) || 2400,
  genre: flags.genre || "historical-essay",
};
if (flags.target) body.target = flags.target;
if (flags.maxTokens) body.settings = { maxTokens: Number(flags.maxTokens) };

console.error(`[generate] topic: ${topic}`);
console.error(`[generate] wordCount: ${body.wordCount}, genre: ${body.genre}`);
console.error(`[generate] 通过 SSH 调用服务器...`);

const start = Date.now();

// Port 5111 is not exposed externally (cloud security group).
// Call via SSH tunnel to the server's localhost.
const jsonPayload = JSON.stringify(body).replace(/'/g, "'\\''");
const curlCmd = `curl -sS --max-time 600 -X POST ${LOCAL_API}/api/content/runtime/generate/article -H 'Content-Type: application/json' -H 'Authorization: Bearer ${API_KEY}' -d '${jsonPayload}'`;
let rawResult;
try {
  rawResult = execSync(`ssh ${SSH_HOST} "${curlCmd.replace(/"/g, '\\"')}"`, {
    encoding: "utf8",
    maxBuffer: 50 * 1024 * 1024,
    timeout: 660000,
  });
} catch (err) {
  console.error(`[generate] SSH 调用失败: ${err.message?.slice(0, 200)}`);
  process.exit(1);
}

let data;
try {
  data = JSON.parse(rawResult);
} catch {
  console.error(`[generate] 响应解析失败: ${rawResult.slice(0, 300)}`);
  process.exit(1);
}

if (!data.success) {
  console.error(`[generate] ERROR: ${data.error}`);
  process.exit(1);
}

const article = data.data.draft.body;
const elapsed = Math.round((Date.now() - start) / 1000);
console.error(`[generate] 完成: ${article.length}字, ${elapsed}秒`);

if (flags.json) {
  const output = JSON.stringify(data, null, 2);
  if (flags.output) {
    await writeFile(resolve(flags.output), output, "utf8");
    console.error(`[generate] 已写入: ${flags.output}`);
  } else {
    process.stdout.write(output);
  }
} else {
  if (flags.output) {
    await writeFile(resolve(flags.output), article, "utf8");
    console.error(`[generate] 已写入: ${flags.output}`);
  } else {
    process.stdout.write(article);
  }
}
