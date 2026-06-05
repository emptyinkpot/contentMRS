/**
 * Regenerate single article with diagnostics block
 * 用法: node tests/e2e/regenerate-with-diagnostics.mjs "<topic>" [wordCount]
 * 例:  node tests/e2e/regenerate-with-diagnostics.mjs "广州十三行的白银流动" 2400
 */
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const BASE = process.env.CONTENTBASE_E2E_URL || "http://127.0.0.1:5111"
const API_KEY = process.env.CONTENTBASE_API_KEY || "cb-k9Xm4wPqR7vJ2nLs5tYh8dFe"
const DOWNLOADS = "C:\\Users\\ASUS-KL\\Downloads"

const BANNED_NAMES = ["鲁迅","三岛由纪夫","三岛","内藤湖南","石黑一雄","北一辉","安德森","白鸟库吉","桑原骘藏","宫崎市定","希特勒","墨索里尼","戈培尔","太宰治","坂口安吾","川端康成","夏目漱石"]
const BANNED_PHRASES = ["说白了","不禁让人思考","引人深思","值得我们注意","在某种意义上"]
const BANNED_TRANSITIONS = ["然而，","但是，","不过，","也要承认","不可否认","客观来说"]

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

const b = r.json.data.draft.body
const diag = r.json.data.context.diagnostics
const its = diag.items || []
const pc = diag.packedCounts || {}
const counts = diag.counts || {}

const realityItems = its.filter(i => i.channel === "reality")
const assocItems = its.filter(i => (i.source || "").startsWith("association/"))
const litItems = its.filter(i => i.channel === "literary" && !(i.source || "").startsWith("association/"))

const usedSources = realityItems.filter(item => {
  const title = (item.title || "").trim()
  return title.length >= 2 && b.includes(title)
})
const usageRate = realityItems.length ? (usedSources.length / realityItems.length * 100).toFixed(0) : "N/A"

const transHits = BANNED_TRANSITIONS.filter(t => b.includes(t))
const nameHits = BANNED_NAMES.filter(n => b.includes(n))
const phraseHits = BANNED_PHRASES.filter(p => b.includes(p))

const lines = [
  "", "---", "## 召回与化用诊断", "",
  "### 召回总量 (raw counts)", `reality=${counts.reality||0} semantic=${counts.semantic||0} literary=${counts.literary||0} lexicon=${counts.lexicon||0} structure=${counts.structure||0} author=${counts.author||0}`, "",
  "### 入 prompt (packed counts)", `reality=${pc.reality||0} literary=${pc.literary||0} semantic=${pc.semantic||0} lexicon=${pc.lexicon||0} structure=${pc.structure||0} author=${pc.author||0}`, "",
  "### Reality items (top 10)",
]
realityItems.slice(0, 10).forEach((item, i) => {
  const title = (item.title || item.source || "unknown").slice(0, 60)
  const len = (item.preview || "").length
  lines.push(`${i+1}. ${title} (${len}字)`)
})

lines.push("", "### Association Engine 联想词")
if (assocItems.length) {
  const terms = [...new Set(assocItems.map(i => i.metadata?.associationTerm).filter(Boolean))]
  if (terms.length) terms.forEach(t => lines.push(`- ${t}`))
  else lines.push(`- (${assocItems.length} items, 无 metadata.associationTerm)`)
} else { lines.push("- (无联想items)") }

lines.push("", "### Literary Style 来源 (top 5)")
litItems.slice(0, 5).forEach((item, i) => {
  lines.push(`${i+1}. ${(item.title || item.source || "unknown").slice(0, 60)}`)
})

lines.push("", "### Reality 来源 → 正文化用率")
lines.push(`- Reality items: ${realityItems.length}`)
lines.push(`- 正文中出现 source title 的: ${usedSources.length}`)
lines.push(`- **化用率: ${usageRate}%**`)

lines.push("", "### 风格违规命中")
lines.push(`- 作家名泄漏: ${nameHits.length}${nameHits.length ? " ("+nameHits.join("、")+")" : ""}`)
lines.push(`- 禁忌套话: ${phraseHits.length}${phraseHits.length ? " ("+phraseHits.join("、")+")" : ""}`)
lines.push(`- 转折/平衡词: ${transHits.length}${transHits.length ? " ("+transHits.join("、")+")" : ""}`)
lines.push(`- 字数: ${b.length}`)

lines.push("", `### 生成耗时: ${elapsed}s`)

const safeName = topic.replace(/[^一-鿿\w]/g, "").slice(0, 30)
const fname = `REGEN_${safeName}.md`
const outPath = path.join(DOWNLOADS, fname)
fs.writeFileSync(outPath, b + lines.join("\n"), "utf8")
console.log(`✅ 已生成: ${outPath} (${b.length}字, ${elapsed}s)`)
console.log(`   reality=${pc.reality} literary=${pc.literary} association=${assocItems.length} 化用率=${usageRate}%`)
