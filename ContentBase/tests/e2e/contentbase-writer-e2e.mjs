/**
 * ContentBase Writer E2E Test Suite
 * 验证 system prompt 风格协议 + deterministicDeAI 硬剖除 + 11层检索 + 自动续写
 * 产出保存到 C:\Users\ASUS-KL\Downloads\
 * 执行: node tests/contentbase-writer-e2e.mjs [--live]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(__filename), "..");
const DOWNLOADS = "C:\\Users\\ASUS-KL\\Downloads";
const CB_URL = "http://127.0.0.1:15111";
const TIMEOUT_MS = 200_000;

// --public: use public domain (unreliable for long requests)
// --tunnel: use SSH tunnel on localhost:15111 (default, most reliable)
// Default: localhost:15111 via SSH tunnel
const USE_PUBLIC = process.argv.includes("--public");
const BASE = USE_PUBLIC ? "https://contentbase.tengokukk.com" : CB_URL;

let API_KEY = process.env.CONTENTBASE_API_KEY || "";

const RESULTS = [];

async function getApiKey() {
  if (API_KEY) return API_KEY;
  // Try fetching from public health (no key needed)
  return "";
}

async function generate(topic, opts = {}) {
  const body = JSON.stringify({
    topic,
    target: "article",
    genre: opts.genre || "historical_commentary",
    structure: { targetWordCount: opts.wordCount || 2400 },
    evidenceQuery: {
      query: opts.query || topic,
      sourceIds: [],
      includeRagflow: opts.includeRagflow !== false,
      includeWeb: opts.includeWeb !== false,
      limit: opts.limit || 5,
    },
  });
  const headers = { "content-type": "application/json" };
  if (API_KEY) headers["authorization"] = `Bearer ${API_KEY}`;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE}/api/content/runtime/generate/article`, {
      method: "POST", headers, body, signal: ctrl.signal,
    });
    const json = await res.json();
    return { status: res.status, json };
  } finally { clearTimeout(timer); }
}

// ========== TEST DEFINITIONS ==========
const BANNED_NAMES = [
  "鲁迅", "三岛由纪夫", "三岛", "内藤湖南", "石黑一雄", "北一辉", "安德森",
  "白鸟库吉", "桑原骘藏", "宫崎市定", "希特勒", "墨索里尼", "戈培尔",
  "太宰治", "坂口安吾", "川端康成", "夏目漱石",
];
const BANNED_PHRASES = ["说白了", "不禁让人思考", "引人深思", "值得我们注意", "在某种意义上"];
const BANNED_TRANSITIONS = ["然而，", "但是，", "不过，", "也要承认", "不可否认", "客观来说"];
const ORDINAL_RE = [
  /第[一二三四五六七八九十]+层/g,
  /第[一二三四五六七八九十]个/g,
  /^首先[，,]/gm, /^其次[，,]/gm, /^最后[，,]/gm,
  /最外一层/g, /最外层/g,
];
const SENTIMENTAL_END_RE = /(?:下班|天亮|灯灭|转身离去|背影消失|走出了|关上了灯)/;

const TESTS = [
  // — style-negative —
  { id: "STYLE_001", cat: "style-negative", topic: "日本战后宪法第九条的实际约束力",
    wordCount: 2400, genre: "historical_commentary",
    check: (body) => {
      const hits = BANNED_NAMES.filter(n => body.includes(n));
      return hits.length === 0 ? { pass: true } : { pass: false, reason: `作家名出现: ${hits}` };
    }},
  { id: "STYLE_002", cat: "style-negative", topic: "中国地方债务的结构性风险",
    wordCount: 2400, genre: "reality_commentary",
    check: (body) => {
      const hits = BANNED_PHRASES.filter(p => body.includes(p));
      return hits.length === 0 ? { pass: true } : { pass: false, reason: `禁忌套话: ${hits}` };
    }},
  { id: "STYLE_003", cat: "style-negative", topic: "东亚半导体供应链的地缘重组",
    wordCount: 2400, genre: "reality_commentary",
    check: (body) => {
      const hits = BANNED_TRANSITIONS.filter(t => body.includes(t));
      return hits.length === 0 ? { pass: true } : { pass: false, reason: `转折/平衡词: ${hits}` };
    }},
  { id: "STYLE_004", cat: "style-negative", topic: "明治维新的财阀与军部共谋结构",
    wordCount: 2400, genre: "historical_commentary",
    check: (body) => {
      let hits = 0;
      for (const re of ORDINAL_RE) { const m = body.match(re); if (m) hits += m.length; }
      return hits === 0 ? { pass: true } : { pass: false, reason: `序数分层标记 ${hits} 处` };
    }},
  { id: "STYLE_005", cat: "style-negative", topic: "冲绳基地问题与日本主权悖论",
    wordCount: 2400, genre: "historical_commentary",
    check: (body) => {
      const paras = body.split("\n\n").filter(p => p.trim());
      const last = paras[paras.length - 1] || "";
      if (SENTIMENTAL_END_RE.test(last))
        return { pass: false, reason: `结尾含感伤意象: ${last.slice(-60)}` };
      const buShi = (body.match(/不是[^。\n]*[，,][^。\n]*是/g) || []).length;
      if (buShi > 1) return { pass: false, reason: `"不是A是B"出现${buShi}次>1` };
      return { pass: true };
    }},
  // — style-positive —
  { id: "STYLE_006", cat: "style-positive", topic: "台湾海峡军事部署的经济代价",
    wordCount: 2400, genre: "reality_commentary",
    check: (body) => {
      const paras = body.split("\n\n").filter(p => p.trim());
      const last = paras[paras.length - 1] || "";
      const hasNumber = /\d+/.test(last);
      const hasInstitution = /[部省局委军旅师亿万%]/.test(last);
      const noHope = !/[希望|展望|未来可期|终将]/.test(last);
      if ((hasNumber || hasInstitution) && noHope) return { pass: true };
      return { pass: false, reason: `结尾非硬事实: ${last.slice(-80)}` };
    }},
  { id: "STYLE_007", cat: "style-positive", topic: "德川幕府的情报统制与出版检阅",
    wordCount: 2400, genre: "historical_commentary",
    check: (body, diag) => {
      const litCount = diag?.packedCounts?.literary || 0;
      if (litCount < 5) return { pass: false, reason: `literary packed=${litCount}<5` };
      return { pass: true };
    }},
  // — topic-diversity —
  { id: "TOPIC_008", cat: "topic-diversity", topic: "鸦片战争前广州十三行的金融网络",
    wordCount: 2400, genre: "historical_commentary",
    check: (body, diag) => {
      if (body.length < 2000) return { pass: false, reason: `字数不足: ${body.length}` };
      if ((diag?.packedCounts?.reality || 0) < 1) return { pass: false, reason: "reality=0" };
      return { pass: true };
    }},
  { id: "TOPIC_009", cat: "topic-diversity", topic: "萨赫勒地区法国撤军后的权力真空",
    wordCount: 2400, genre: "reality_commentary",
    check: (body) => {
      if (body.length < 2000) return { pass: false, reason: `字数不足: ${body.length}` };
      return { pass: true };
    }},
  { id: "TOPIC_010", cat: "topic-diversity", topic: "日本能剧面具制作中的身体哲学",
    wordCount: 2400, genre: "essay",
    check: (body) => {
      if (body.length < 2000) return { pass: false, reason: `字数不足: ${body.length}` };
      return { pass: true };
    }},
  { id: "TOPIC_011", cat: "topic-diversity", topic: "当代中国网络文学的工业化生产体制",
    wordCount: 2400, genre: "essay",
    check: (body) => {
      if (body.length < 2000) return { pass: false, reason: `字数不足: ${body.length}` };
      return { pass: true };
    }},
  // — edge-case —
  { id: "EDGE_012", cat: "edge-case", topic: "美元霸权的制度基础",
    wordCount: 600, genre: "reality_commentary",
    check: (body) => {
      if (body.length < 400) return { pass: false, reason: `太短: ${body.length}` };
      if (body.length > 1500) return { pass: false, reason: `超长(应短): ${body.length}` };
      return { pass: true };
    }},
  { id: "EDGE_013", cat: "edge-case", topic: "二战后国际秩序的七十年演变",
    wordCount: 6000, genre: "historical_commentary",
    check: (body, diag, draft) => {
      if (body.length < 5000) return { pass: false, reason: `字数不足: ${body.length}<5000` };
      if ((draft?.continuations || 0) < 1) return { pass: false, reason: "未触发自动续写" };
      return { pass: true };
    }},
  { id: "EDGE_014", cat: "edge-case", topic: "火星土壤中的高氯酸盐对植物代谢的影响",
    wordCount: 2400, genre: "essay",
    allowFail: true,
    check: (body, diag, draft, raw) => {
      if (raw.status === 200 && body.length > 500) return { pass: true, note: "web证据足够" };
      if (raw.status === 500) {
        const err = raw.json?.error || "";
        if (err.includes("Reality required")) return { pass: true, note: "正确fail-closed" };
      }
      return { pass: false, reason: `非预期: status=${raw.status} bodyLen=${body.length}` };
    }},
  // — association-engine —
  { id: "ASSOC_016", cat: "association", topic: "广州十三行的白银流动与全球贸易网络",
    wordCount: 2400, genre: "historical_commentary",
    check: (body, diag) => {
      const items = diag?.items || [];
      const assocItems = items.filter(i => i.source?.startsWith("association/"));
      if (assocItems.length === 0) return { pass: false, reason: "无association_engine items" };
      return { pass: true, note: `association items=${assocItems.length}` };
    }},
  { id: "ASSOC_017", cat: "association", topic: "明治维新后的铁路国有化与军事动员",
    wordCount: 2400, genre: "historical_commentary",
    check: (body, diag) => {
      const items = diag?.items || [];
      const assocItems = items.filter(i => i.source?.startsWith("association/"));
      if (assocItems.length < 3) return { pass: false, reason: `association items=${assocItems.length}<3` };
      return { pass: true, note: `association items=${assocItems.length}` };
    }},
];

// ========== INFRA TEST ==========
async function runInfra() {
  const checks = [
    { name: "ContentBase /healthz", url: `${BASE}/healthz` },
    { name: "ContentBase root", url: `${BASE}/` },
  ];
  const results = [];
  for (const { name, url } of checks) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
      results.push({ name, status: r.status, pass: r.status === 200 });
    } catch (e) {
      results.push({ name, status: 0, pass: false, error: e.message });
    }
  }
  return results;
}

// ========== MAIN RUNNER ==========
async function main() {
  console.log(`ContentBase Writer E2E — ${BASE}`);
  console.log(`产出目录: ${DOWNLOADS}\n`);

  // INFRA_015
  console.log("▶ INFRA_015: infrastructure health...");
  const infra = await runInfra();
  const infraPass = infra.every(i => i.pass);
  RESULTS.push({ id: "INFRA_015", cat: "infra", pass: infraPass, detail: infra });
  console.log(`  ${infraPass ? "✅" : "❌"} ${JSON.stringify(infra)}`);
  if (!infraPass) {
    console.log("\n⛔ 基础设施不通，跳过生成测试。");
    writeReport();
    process.exit(1);
  }

  // Generation tests
  for (const t of TESTS) {
    console.log(`\n▶ ${t.id} [${t.cat}]: ${t.topic}`);
    const startMs = Date.now();
    try {
      const res = await generate(t.topic, { wordCount: t.wordCount, genre: t.genre });
      const elapsed = ((Date.now() - startMs) / 1000).toFixed(1);
      if (res.status !== 200 && !t.allowFail) {
        const err = res.json?.error || "unknown";
        RESULTS.push({ id: t.id, cat: t.cat, pass: false, reason: `HTTP ${res.status}: ${err}`, elapsed });
        console.log(`  ❌ HTTP ${res.status} (${elapsed}s): ${err}`);
        continue;
      }
      const draft = res.json?.data?.draft || {};
      const body = draft.body || "";
      const diag = res.json?.data?.context?.diagnostics || {};
      const result = t.check(body, diag, draft, res);
      RESULTS.push({ id: t.id, cat: t.cat, ...result, bodyLen: body.length, elapsed });
      console.log(`  ${result.pass ? "✅" : "❌"} ${body.length}字 ${elapsed}s${result.reason ? " — " + result.reason : ""}${result.note ? " — " + result.note : ""}`);

      // Save article to Downloads
      if (body.length > 0) {
        const safeName = t.topic.replace(/[\\/:*?"<>|]/g, "_").slice(0, 40);
        const filePath = path.join(DOWNLOADS, `${t.id}_${safeName}.md`);
        fs.writeFileSync(filePath, `# ${t.topic}\n\n${body}\n`, "utf8");
      }
    } catch (e) {
      const elapsed = ((Date.now() - startMs) / 1000).toFixed(1);
      RESULTS.push({ id: t.id, cat: t.cat, pass: false, reason: `EXCEPTION: ${e.message}`, elapsed });
      console.log(`  ❌ EXCEPTION (${elapsed}s): ${e.message}`);
    }
  }

  writeReport();
}

function writeReport() {
  const passed = RESULTS.filter(r => r.pass).length;
  const failed = RESULTS.filter(r => !r.pass).length;
  const report = {
    timestamp: new Date().toISOString(),
    base: BASE,
    summary: { total: RESULTS.length, passed, failed },
    results: RESULTS,
  };
  const reportPath = path.join(DOWNLOADS, "contentbase-writer-e2e-report.json");
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");
  console.log(`\n${"=".repeat(50)}`);
  console.log(`结果: ${passed}/${RESULTS.length} passed, ${failed} failed`);
  console.log(`报告: ${reportPath}`);
  if (failed > 0) process.exit(1);
}

main().catch(e => { console.error("FATAL:", e); process.exit(1); });

