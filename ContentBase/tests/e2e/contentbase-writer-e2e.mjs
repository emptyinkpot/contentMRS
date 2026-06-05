/**
 * ContentBase Writer E2E Test Suite
 * 执行: pnpm test:e2e
 */
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const BASE = process.env.CONTENTBASE_E2E_URL
  || (process.argv.includes("--public") ? "https://contentbase.tengokukk.com" : "http://127.0.0.1:5111")
const API_KEY = process.env.CONTENTBASE_API_KEY || "cb-k9Xm4wPqR7vJ2nLs5tYh8dFe"
const TIMEOUT_MS = 360_000
const BASELINE_DIR = path.join(__dirname, "baseline")
const LAST_RUN = path.join(BASELINE_DIR, "last-run.json")
const DOWNLOADS = "C:\\Users\\ASUS-KL\\Downloads"

const BANNED_NAMES = ["鲁迅","三岛由纪夫","三岛","内藤湖南","石黑一雄","北一辉","安德森","白鸟库吉","桑原骘藏","宫崎市定","希特勒","墨索里尼","戈培尔","太宰治","坂口安吾","川端康成","夏目漱石"]
const BANNED_PHRASES = ["说白了","不禁让人思考","引人深思","值得我们注意","在某种意义上"]
const BANNED_TRANSITIONS = ["然而，","但是，","不过，","也要承认","不可否认","客观来说"]

const RESULTS = []

async function generate(topic, opts = {}) {
  const payload = JSON.stringify({
    topic,
    genre: opts.genre || "historical_commentary",
    wordCount: opts.wordCount || 2400,
    evidenceQuery: { includeWeb: true, includeRagflow: true },
  })
  const headers = { "content-type": "application/json", authorization: `Bearer ${API_KEY}` }
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(`${BASE}/api/content/runtime/generate/article`, {
      method: "POST", headers, body: payload, signal: ctrl.signal,
    })
    const json = await res.json()
    return { status: res.status, json }
  } finally { clearTimeout(timer) }
}

function bodyLen(r) { return r?.json?.data?.draft?.body?.length || 0 }
function body(r) { return r?.json?.data?.draft?.body || "" }
function packed(r) { return r?.json?.data?.context?.diagnostics?.packedCounts || {} }
function items(r) { return r?.json?.data?.context?.diagnostics?.items || [] }
function conts(r) { return r?.json?.data?.draft?.continuations || [] }

const TESTS = [
  { id: "INFRA_015", group: "INFRA", topic: null, check: "health" },
  { id: "STYLE_001", group: "STYLE-", topic: "日本战后宪法第九条的实际约束力",
    check: r => BANNED_NAMES.every(n => !body(r).includes(n)) || "含有禁忌作家名" },
  { id: "STYLE_002", group: "STYLE-", topic: "中国地方债务的结构性风险",
    check: r => BANNED_PHRASES.every(p => !body(r).includes(p)) || "含有禁忌套话" },
  { id: "STYLE_003", group: "STYLE-", topic: "东亚半导体供应链的地缘重组",
    check: r => BANNED_TRANSITIONS.every(t => !body(r).includes(t)) || "含有转折/平衡词" },
  { id: "STYLE_004", group: "STYLE-", topic: "明治维新的财阀与军部共谋结构",
    check: r => !/(?:^|\n)\s*(?:第[一二三四五六七八九十]+|[一二三四五六七八九十]+[、.]|[1-9][、.])/m.test(body(r)) || "含有序数分层" },
  { id: "STYLE_005", group: "STYLE-", topic: "冲绳基地问题与日本主权悖论", check: r => {
    const b = body(r), paras = b.split(/\n{2,}/), last = paras[paras.length - 1] || ""
    const sentimental = /希望|期待|未来可期|让我们|值得期许|愿/.test(last)
    if (sentimental) return "感伤结尾"
    const notAisB = (b.match(/不是.{2,20}而是/g) || []).length
    if (notAisB > 1) return `不是A是B出现${notAisB}次(>1)`
    return true
  }},
  { id: "STYLE_006", group: "STYLE+", topic: "台湾海峡军事部署的经济代价", check: r => {
    const paras = body(r).split(/\n{2,}/), last = paras[paras.length - 1] || ""
    const hasHard = /\d/.test(last) || /部|局|省|委|军|舰|师|旅/.test(last)
    const noHope = !/希望|期待|未来可期|让我们/.test(last)
    return (hasHard && noHope) || "结尾缺硬事实或含希望词"
  }},
  { id: "STYLE_007", group: "STYLE+", topic: "德川幕府的情报统制与出版检阅",
    check: r => (packed(r).literary || 0) >= 5 || `literary=${packed(r).literary || 0}(<5)` },
  { id: "POS_018", group: "STYLE+", topic: "明代海禁的执行落差", check: r => {
    const paras = body(r).split(/\n{2,}/).filter(p => p.trim().length > 20)
    if (paras.length < 4) return "段落太少"
    const lens = paras.map(p => p.length), mean = lens.reduce((a, b) => a + b, 0) / lens.length
    const deviant = lens.filter(l => Math.abs(l - mean) / mean > 0.4).length
    return deviant / lens.length >= 0.3 || `节奏偏差段落${(deviant/lens.length*100).toFixed(0)}%(<30%)`
  }},
  { id: "POS_019", group: "STYLE+", topic: "二十世纪初日本财阀的金融控制", check: r => {
    const paras = body(r).split(/\n{2,}/).filter(p => p.trim().length > 20)
    const concrete = paras.filter(p => /\d|部|局|省|厅|银行|公司|株式会社|万|亿|年/.test(p))
    return concrete.length / paras.length >= 0.7 || `锚点密度${(concrete.length/paras.length*100).toFixed(0)}%(<70%)`
  }},
  { id: "POS_020", group: "STYLE+", topic: "俄乌战争对全球粮食供应链的冲击", check: "deterministic" },
  { id: "TOPIC_008", group: "TOPIC", topic: "鸦片战争前广州十三行的金融网络",
    check: r => (bodyLen(r) >= 2000 && (packed(r).reality || 0) >= 1) || `body=${bodyLen(r)},reality=${packed(r).reality||0}` },
  { id: "TOPIC_009", group: "TOPIC", topic: "萨赫勒地区法国撤军后的权力真空",
    check: r => bodyLen(r) >= 2000 || `body=${bodyLen(r)}(<2000)` },
  { id: "TOPIC_010", group: "TOPIC", topic: "日本能剧面具制作中的身体哲学",
    check: r => bodyLen(r) >= 2000 || `body=${bodyLen(r)}(<2000)` },
  { id: "TOPIC_011", group: "TOPIC", topic: "当代中国网络文学的工业化生产体制",
    check: r => bodyLen(r) >= 2000 || `body=${bodyLen(r)}(<2000)` },
  { id: "EDGE_012", group: "EDGE", topic: "美元霸权的制度基础", wordCount: 600,
    check: r => { const l = bodyLen(r); return (l >= 400 && l <= 1500) || `body=${l}(需400-1500)` }},
  { id: "EDGE_013", group: "EDGE", topic: "二战后国际秩序的七十年演变", wordCount: 6000,
    check: r => (bodyLen(r) >= 5000 && conts(r).length >= 1) || `body=${bodyLen(r)},conts=${conts(r).length}` },
  { id: "EDGE_014", group: "EDGE", topic: "火星土壤中的高氯酸盐对植物代谢的影响", allowFail: true,
    check: r => {
      if (r.status === 200 && bodyLen(r) > 500) return true
      if (r.status >= 400 && JSON.stringify(r.json).includes("Reality")) return true
      return `status=${r.status},body=${bodyLen(r)}`
    }},
  { id: "ASSOC_016", group: "ASSOC", topic: "广州十三行的白银流动与全球贸易网络",
    check: r => items(r).filter(i => (i.source || "").startsWith("association/")).length > 0 || "无联想items" },
  { id: "ASSOC_017", group: "ASSOC", topic: "明治维新后的铁路国有化与军事动员",
    check: r => items(r).filter(i => (i.source || "").startsWith("association/")).length >= 3 || "联想items<3" },
]

async function runHealth() {
  try {
    const [r1, r2] = await Promise.all([
      fetch(`${BASE}/healthz`).then(r => r.status),
      fetch(`${BASE}/`).then(r => r.status),
    ])
    return (r1 === 200 && r2 === 200) || `healthz=${r1}, /=${r2}`
  } catch (e) { return e.message }
}

async function runDeterministic(test) {
  const t0 = Date.now()
  const [r1, r2] = [await generate(test.topic), await generate(test.topic)]
  const elapsed = (Date.now() - t0) / 1000
  const b1 = body(r1), b2 = body(r2)
  const wc1 = b1.length, wc2 = b2.length
  const diff = Math.abs(wc1 - wc2) / Math.max(wc1, wc2, 1)
  let pass = true, reason = null
  if (diff > 0.3) { pass = false; reason = `字数差${(diff*100).toFixed(0)}%(>30%)` }
  if (pass) {
    const countTrans = s => BANNED_TRANSITIONS.filter(t => s.includes(t)).length
    if (countTrans(b1) > 0 || countTrans(b2) > 0) { pass = false; reason = "AI转折词非零" }
  }
  if (pass) {
    const pc1 = b1.split(/\n{2,}/).length, pc2 = b2.split(/\n{2,}/).length
    if (Math.abs(pc1 - pc2) > 3) { pass = false; reason = `段落数差${Math.abs(pc1-pc2)}(>3)` }
  }
  const testResult = { id: test.id, group: test.group, pass, reason, elapsed, bodyLen: wc1 }
  saveArticle(test.id, test.topic, b1, r1, testResult)
  return { pass, reason, elapsed, bodyLen: wc1 }
}

function safeName(topic) { return topic.replace(/[^一-鿿\w]/g, "").slice(0, 30) }

function buildDiagnosticsBlock(r, testResult) {
  const b = body(r)
  const diag = r?.json?.data?.context?.diagnostics || {}
  const its = diag.items || []
  const pc = diag.packedCounts || {}
  const counts = diag.counts || {}

  const realityItems = its.filter(i => i.channel === "reality")
  const assocItems = its.filter(i => (i.source || "").startsWith("association/"))
  const litItems = its.filter(i => i.channel === "literary" && !(i.source || "").startsWith("association/"))

  const sentences = b.split(/[。！？…]+/).filter(s => s.trim().length > 0)
  const paragraphs = b.split(/\n\n+/).filter(p => p.trim().length > 0)
  const paraLens = paragraphs.map(p => p.length)
  const meanParaLen = paraLens.length ? paraLens.reduce((a, c) => a + c, 0) / paraLens.length : 0
  const avgSentLen = sentences.length ? Math.round(b.length / sentences.length) : 0
  const shortRatio = sentences.length ? (sentences.filter(s => s.length < 15).length / sentences.length * 100).toFixed(1) : "0"
  const longRatio = sentences.length ? (sentences.filter(s => s.length > 80).length / sentences.length * 100).toFixed(1) : "0"
  const rhythmDeviant = paraLens.length ? (paraLens.filter(l => Math.abs(l - meanParaLen) > meanParaLen * 0.4).length / paraLens.length * 100).toFixed(1) : "0"
  const uniformPct = paraLens.length ? (paraLens.filter(l => Math.abs(l - meanParaLen) <= meanParaLen * 0.2).length / paraLens.length * 100).toFixed(1) : "0"

  const facts = []
  realityItems.forEach(item => {
    const preview = item.preview || ""
    const years = preview.match(/\d{4}年/g) || []
    const nums = preview.match(/\d+[万亿%千百]+/g) || []
    years.forEach(y => facts.push(y))
    nums.forEach(n => facts.push(n))
    const nouns = preview.match(/[一-鿿]{2,6}(?=[局部委院所厅处署馆司会社校府庄园厂站台港城邦省县市镇村乡])/g) || []
    nouns.forEach(n => { if (b.includes(n)) facts.push(n) })
  })
  const uniqueFacts = [...new Set(facts)]
  const matchedFacts = uniqueFacts.filter(f => b.includes(f))
  const evidenceRate = uniqueFacts.length ? (matchedFacts.length / uniqueFacts.length * 100).toFixed(0) : "N/A"

  const firstSentence = sentences[0] || ""
  const opensWithConcrete = /^[一-鿿]*\d|^\d{4}|^[一二三四五六七八九十百千万亿]/.test(firstSentence)
  const lastPara = paragraphs[paragraphs.length - 1] || ""
  const hopeWords = /希望|期待|未来|总有一天|终将|相信.*会/
  const endsHard = (/\d|[局部委院所厅处署馆司会社校府]/.test(lastPara)) && !hopeWords.test(lastPara)

  const questionMarks = (b.match(/？/g) || []).length
  const quotes = (b.match(/[「」""『』]/g) || []).length / 2 | 0
  const connectives = ["因此","于是","而","但","却","况且","何况","既然","倘若","若","故","遂","乃","盖","以致"]
  const usedConnectives = connectives.filter(c => b.includes(c))
  const selfParaphrase = (b.match(/换个说法|换句话说|也就是说/g) || []).length
  const zheSentences = sentences.filter(s => /^这[是个种套意不一]/.test(s.trim()))
  const zheRatio = sentences.length ? (zheSentences.length / sentences.length * 100).toFixed(1) : "0"

  const repeatedPhrases = []
  const seen = {}
  for (let len = 4; len <= 8; len++) {
    for (let i = 0; i <= b.length - len; i++) {
      const sub = b.slice(i, i + len)
      if (!/^[一-鿿]+$/.test(sub)) continue
      seen[sub] = (seen[sub] || 0) + 1
    }
  }
  Object.entries(seen).filter(([, c]) => c >= 3).sort((a, b2) => b2[1] - a[1]).slice(0, 5).forEach(([w, c]) => repeatedPhrases.push(`${w}(${c})`))

  const transHits = BANNED_TRANSITIONS.filter(t => b.includes(t))
  const nameHits = BANNED_NAMES.filter(n => b.includes(n))
  const phraseHits = BANNED_PHRASES.filter(p => b.includes(p))
  const totalViolations = nameHits.length + phraseHits.length + transHits.length

  let score = 0
  if (totalViolations === 0) score += 20
  if (parseFloat(rhythmDeviant) >= 30) score += 15
  if (matchedFacts.length > 0) score += 15
  if (opensWithConcrete) score += 15
  if (endsHard) score += 15
  if (parseFloat(zheRatio) < 10) score += 10
  if (selfParaphrase <= 1) score += 10

  const lines = [
    "", "---", "## 质量评估", "",
    "### 1. 检索层",
    `raw: reality=${counts.reality||0} semantic=${counts.semantic||0} literary=${counts.literary||0} lexicon=${counts.lexicon||0} structure=${counts.structure||0} author=${counts.author||0}`,
    `packed: reality=${pc.reality||0} literary=${pc.literary||0} semantic=${pc.semantic||0} lexicon=${pc.lexicon||0} structure=${pc.structure||0} author=${pc.author||0}`,
    `Reality top 10:`,
  ]
  realityItems.slice(0, 10).forEach((item, i) => {
    lines.push(`  ${i+1}. ${(item.title || item.source || "?").slice(0, 60)} (${(item.preview||"").length}字)`)
  })
  lines.push(`Association Engine:`)
  const assocTerms = [...new Set(assocItems.map(i => i.metadata?.associationTerm).filter(Boolean))]
  lines.push(assocTerms.length ? assocTerms.map(t => `  - ${t}`).join("\n") : `  (${assocItems.length} items, 无联想词)`)
  lines.push(`Literary Style top 5:`)
  litItems.slice(0, 5).forEach((item, i) => {
    lines.push(`  ${i+1}. ${(item.title || item.source || "?").slice(0, 60)}`)
  })

  lines.push("", "### 2. 化用率",
    `- 提取事实: ${uniqueFacts.length}`,
    `- 正文命中: ${matchedFacts.length}`,
    `- **化用率: ${evidenceRate}%**`)

  lines.push("", "### 3. 文章结构",
    `- 总字数: ${b.length} | 段落: ${paragraphs.length} | 句子: ${sentences.length}`,
    `- 均句长: ${avgSentLen}字 | 短句(<15): ${shortRatio}% | 长句(>80): ${longRatio}%`,
    `- 均段长: ${Math.round(meanParaLen)}字 | 段落节奏偏差(>40%均值): ${rhythmDeviant}%`)

  lines.push("", "### 4. 风格特征",
    `- 首句具象开头: ${opensWithConcrete ? "是" : "否"}`,
    `- 末段硬事实收束: ${endsHard ? "是" : "否"}`,
    `- 问号: ${questionMarks} | 引号对: ${quotes}`,
    `- 连接词多样性: ${usedConnectives.length}/${connectives.length} (${usedConnectives.join("、") || "无"})`,
    `- 自我复述: ${selfParaphrase}次`,
    `- "这"字句开头: ${zheRatio}% (${zheSentences.length}/${sentences.length})`)

  lines.push("", "### 5. 过拟合风险",
    `- 重复短语(4-8字≥3次): ${repeatedPhrases.length ? repeatedPhrases.join(" | ") : "无"}`,
    `- 段落均匀度(±20%均值内): ${uniformPct}%${parseFloat(uniformPct) > 60 ? " ⚠️模板风险" : ""}`)

  lines.push("", "### 6. 风格违规",
    `- 作家名泄漏: ${nameHits.length}${nameHits.length ? " (" + nameHits.join("、") + ")" : ""}`,
    `- 禁忌套话: ${phraseHits.length}${phraseHits.length ? " (" + phraseHits.join("、") + ")" : ""}`,
    `- 转折/平衡词: ${transHits.length}${transHits.length ? " (" + transHits.join("、") + ")" : ""}`)

  lines.push("", `### 7. 综合评分: ${score}/100`)

  lines.push("", `### 8. Test verdict: ${testResult.pass ? "✅" : "❌"} ${testResult.id} ${testResult.pass ? "PASS" : "FAIL"}${testResult.reason ? " — " + testResult.reason : ""}`)
  return lines.join("\n")
}

function saveArticle(id, topic, content, r, testResult) {
  if (!content) return
  const fname = `${id}_${safeName(topic)}.md`
  const diag = r ? buildDiagnosticsBlock(r, testResult || { id, pass: true }) : ""
  fs.writeFileSync(path.join(DOWNLOADS, fname), content + diag, "utf8")
}

async function runTest(test) {
  try {
    if (test.check === "health") {
      const t0 = Date.now()
      const result = await runHealth()
      const elapsed = (Date.now() - t0) / 1000
      const pass = result === true
      return { id: test.id, group: test.group, pass, reason: pass ? null : String(result), elapsed, bodyLen: 0 }
    }
    if (test.check === "deterministic") return { id: test.id, group: test.group, ...(await runDeterministic(test)) }

    const t0 = Date.now()
    const r = await generate(test.topic, { wordCount: test.wordCount })
    const elapsed = (Date.now() - t0) / 1000
    if (!test.allowFail && r.status !== 200) {
      return { id: test.id, group: test.group, pass: false, reason: `HTTP ${r.status}: ${r.json?.error || "unknown"}`, elapsed, bodyLen: 0 }
    }
    const result = test.check(r)
    const pass = result === true
    const testResult = { id: test.id, group: test.group, pass, reason: pass ? null : String(result), elapsed, bodyLen: bodyLen(r) }
    saveArticle(test.id, test.topic, body(r), r, testResult)
    return testResult
  } catch (e) {
    return { id: test.id, group: test.group, pass: false, reason: `EXCEPTION: ${e.message}`, elapsed: 0, bodyLen: 0 }
  }
}

async function main() {
  console.log(`\n目标: ${BASE}\n`)

  const infra = TESTS.find(t => t.id === "INFRA_015")
  const infraResult = await runTest(infra)
  RESULTS.push(infraResult)
  console.log(`${infraResult.pass ? "✅" : "❌"} ${infra.id} (${infraResult.elapsed.toFixed(1)}s) ${infraResult.reason || ""}`)
  if (!infraResult.pass) { console.log("\nINFRA 失败，中止"); process.exit(1) }

  for (const test of TESTS.filter(t => t.id !== "INFRA_015")) {
    const result = await runTest(test)
    RESULTS.push(result)
    const mark = result.pass ? "✅" : "❌"
    console.log(`${mark} ${result.id} [${result.bodyLen}字 ${result.elapsed.toFixed(1)}s] ${result.reason || ""}`)
  }

  fs.mkdirSync(BASELINE_DIR, { recursive: true })

  let regressions = 0, fixes = 0, newTests = 0
  let prev = null
  try { prev = JSON.parse(fs.readFileSync(LAST_RUN, "utf8")) } catch {}
  if (prev?.results) {
    const prevMap = Object.fromEntries(prev.results.map(r => [r.id, r.pass]))
    for (const r of RESULTS) {
      if (prevMap[r.id] === undefined) { newTests++; continue }
      if (prevMap[r.id] && !r.pass) { regressions++; console.log(`⚠️  回归: ${r.id}`) }
      if (!prevMap[r.id] && r.pass) { fixes++; console.log(`🔧 修复: ${r.id}`) }
    }
  }

  const report = { timestamp: new Date().toISOString(), base: BASE, results: RESULTS }
  fs.writeFileSync(LAST_RUN, JSON.stringify(report, null, 2), "utf8")
  fs.writeFileSync(path.join(DOWNLOADS, "contentbase-writer-e2e-report.json"), JSON.stringify(report, null, 2), "utf8")

  const groups = ["INFRA", "STYLE-", "STYLE+", "TOPIC", "EDGE", "ASSOC"]
  console.log(`\n══════════════ ContentBase Writer E2E ══════════════`)
  for (const g of groups) {
    const gr = RESULTS.filter(r => r.group === g)
    const passed = gr.filter(r => r.pass).length
    const mark = passed === gr.length ? "✅" : "❌"
    console.log(`${g.padEnd(9)}${mark} ${passed}/${gr.length}`)
  }
  const total = RESULTS.filter(r => r.pass).length
  console.log(`─────────────────────────────────────────────────────`)
  console.log(`总计: ${total}/${RESULTS.length} passed`)
  console.log(`回归: ${regressions} 个`)
  console.log(`报告: tests/e2e/baseline/last-run.json\n`)

  if (regressions > 0) process.exit(2)
  if (total < RESULTS.length) process.exit(1)
  process.exit(0)
}

main().catch(e => { console.error(e); process.exit(1) })
