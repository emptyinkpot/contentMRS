/**
 * Regenerate single article with diagnostics block
 * 用法: node tests/e2e/regenerate-with-diagnostics.mjs "<topic>" [wordCount]
 * 例:  node tests/e2e/regenerate-with-diagnostics.mjs "广州十三行的白银流动" 2400
 *
 * 诊断块(含8类指标 + 化用率事实提取法)统一来自 ./diagnostics.mjs。
 * 产物: REGEN_{safeName(topic)}.md = 正文 + 诊断块(以 ---\n## 质量评估 分割)。
 */
import fs from "node:fs"
import path from "node:path"
import { buildDiagnosticsBlock, regenFileName, body, packed, items, DOWNLOADS } from "./diagnostics.mjs"

const BASE = process.env.CONTENTBASE_E2E_URL || "http://127.0.0.1:5111"
const API_KEY = process.env.CONTENTBASE_API_KEY || "cb-k9Xm4wPqR7vJ2nLs5tYh8dFe"

const topic = process.argv[2]
const wordCount = Number(process.argv[3]) || 2400
if (!topic) { console.error("用法: node regenerate-with-diagnostics.mjs <topic> [wordCount]"); process.exit(1) }

console.log(`生成中: ${topic} (目标 ${wordCount} 字)...`)
const t0 = Date.now()

const res = await fetch(`${BASE}/api/content/runtime/generate/article`, {
  method: "POST",
  headers: { "content-type": "application/json", authorization: `Bearer ${API_KEY}` },
  body: JSON.stringify({
    topic, wordCount,
    genre: "historical_commentary",
    evidenceQuery: { includeWeb: true, includeRagflow: true },
  }),
})
const r = { status: res.status, json: await res.json() }
const elapsed = ((Date.now() - t0) / 1000).toFixed(1)

if (r.status !== 200 || !r.json?.success) {
  console.error(`❌ HTTP ${r.status}: ${r.json?.error || "unknown"}`)
  process.exit(1)
}

const b = body(r)
const diag = buildDiagnosticsBlock(r) + `\n\n### 生成耗时: ${elapsed}s`
const outPath = path.join(DOWNLOADS, regenFileName(topic))
fs.writeFileSync(outPath, b + diag, "utf8")

const pc = packed(r)
const assocN = items(r).filter(i => (i.source || "").startsWith("association/")).length
console.log(`✅ 已生成: ${outPath} (${b.length}字, ${elapsed}s)`)
console.log(`   reality=${pc.reality||0} literary=${pc.literary||0} association=${assocN}`)
