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
  if (diff > 0.3) return { pass: false, reason: `字数差${(diff*100).toFixed(0)}%(>30%)`, elapsed, bodyLen: wc1 }
  const countTrans = s => BANNED_TRANSITIONS.filter(t => s.includes(t)).length
  if (countTrans(b1) > 0 || countTrans(b2) > 0) return { pass: false, reason: "AI转折词非零", elapsed, bodyLen: wc1 }
  const pc1 = b1.split(/\n{2,}/).length, pc2 = b2.split(/\n{2,}/).length
  if (Math.abs(pc1 - pc2) > 3) return { pass: false, reason: `段落数差${Math.abs(pc1-pc2)}(>3)`, elapsed, bodyLen: wc1 }
  saveArticle(test.id, test.topic, b1)
  return { pass: true, reason: null, elapsed, bodyLen: wc1 }
}

function safeName(topic) { return topic.replace(/[^一-鿿\w]/g, "").slice(0, 30) }

function saveArticle(id, topic, content) {
  if (!content) return
  const fname = `${id}_${safeName(topic)}.md`
  fs.writeFileSync(path.join(DOWNLOADS, fname), content, "utf8")
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
    saveArticle(test.id, test.topic, body(r))
    return { id: test.id, group: test.group, pass, reason: pass ? null : String(result), elapsed, bodyLen: bodyLen(r) }
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
