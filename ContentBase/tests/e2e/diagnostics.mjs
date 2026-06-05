/**
 * 共享诊断模块 · ContentBase Writer 测试体系
 * 被 contentbase-writer-e2e.mjs(全量套件) 与 regenerate-with-diagnostics.mjs(单篇复跑) 共用。
 * 单一真源: 禁忌词表 / 响应访问器 / 产物命名+分割规则 / 8类诊断块。
 *
 * 产物命名规则:
 *   全量套件 → {ID}_{safeName(题目)}.md   例 STYLE_001_日本战后宪法第九条的实际约束力.md
 *   单篇复跑 → REGEN_{safeName(题目)}.md
 *   ID 编号 001-020 全局连续(按用例历史添加序),前缀=类别(STYLE/TOPIC/EDGE/INFRA/ASSOC/POS)
 *   safeName = 去非中文非\w字符后截前30字
 *
 * 文件分割规则:
 *   写入内容 = 正文 + buildDiagnosticsBlock(...)  正文在上,诊断块在下
 *   诊断块以 "\n\n---\n## 质量评估" 开头(markdown 水平线+二级标题做分割锚)
 */
import path from "node:path"

export const DOWNLOADS = "C:\\Users\\ASUS-KL\\Downloads"

export const BANNED_NAMES = ["鲁迅","三岛由纪夫","三岛","内藤湖南","石黑一雄","北一辉","安德森","白鸟库吉","桑原骘藏","宫崎市定","希特勒","墨索里尼","戈培尔","太宰治","坂口安吾","川端康成","夏目漱石"]
export const BANNED_PHRASES = ["说白了","不禁让人思考","引人深思","值得我们注意","在某种意义上"]
export const BANNED_TRANSITIONS = ["然而，","但是，","不过，","也要承认","不可否认","客观来说"]

export function safeName(topic) {
  return topic.replace(/[^一-鿿\w]/g, "").slice(0, 30)
}

export function articleFileName(id, topic) {
  return `${id}_${safeName(topic)}.md`
}

export function regenFileName(topic) {
  return `REGEN_${safeName(topic)}.md`
}

export function body(r) { return r?.json?.data?.draft?.body || "" }
export function bodyLen(r) { return body(r).length }
export function packed(r) { return r?.json?.data?.context?.diagnostics?.packedCounts || {} }
export function items(r) { return r?.json?.data?.context?.diagnostics?.items || [] }
export function conts(r) { return r?.json?.data?.draft?.continuations || [] }

export function buildDiagnosticsBlock(r, testResult) {
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

  // 事实接地率: 从 Reality preview 提取事实(年份/数字/机构名词)→ 正文命中率。
  // 注意: 这测的是"事实有没有落进正文",不是文学化用。文学化用见"文体特征"段。
  // 不用 source title 匹配(title 是文件名,正文不会原样出现 → 恒为 0)。
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

  // 文体特征(代理指标): 测文体纹理,不测"是否借了三岛的句式"。字面统计无法证明化用,
  // 化用是"改头换面用人家的方式说自己的话",字面重叠越低越成功。真·化用见 --judge LLM 评委。
  const imageryChars = (b.match(/[光影雪血铁灰雾烟霜火水风夜骨石木花草木山河海星月云雨雷电泥沙尘土锈刃]/g) || []).length
  const imageryDensity = b.length ? (imageryChars / (b.length / 1000)).toFixed(1) : "0"
  const sentLens = sentences.map(s => s.length)
  const sentMean = sentLens.length ? sentLens.reduce((a, c) => a + c, 0) / sentLens.length : 0
  const sentStd = sentLens.length ? Math.sqrt(sentLens.reduce((a, c) => a + (c - sentMean) ** 2, 0) / sentLens.length) : 0
  const sentCV = sentMean ? (sentStd / sentMean).toFixed(2) : "0"
  const metaphorHits = (b.match(/仿佛|像[^.。，,]{2,12}(一样|那样|似的)|如同|好比|宛若/g) || []).length
  let alternations = 0
  for (let i = 1; i < sentLens.length; i++) {
    const a = sentLens[i - 1], c = sentLens[i]
    if ((a < 20 && c > 40) || (a > 40 && c < 20)) alternations++
  }
  const alternRatio = sentLens.length > 1 ? (alternations / (sentLens.length - 1) * 100).toFixed(1) : "0"

  const seen = {}
  for (let len = 4; len <= 8; len++) {
    for (let i = 0; i <= b.length - len; i++) {
      const sub = b.slice(i, i + len)
      if (!/^[一-鿿]+$/.test(sub)) continue
      seen[sub] = (seen[sub] || 0) + 1
    }
  }
  const repeatedPhrases = []
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

  lines.push("", "### 2. 事实接地率",
    `- 提取事实(Reality年份/数字/机构): ${uniqueFacts.length}`,
    `- 正文命中: ${matchedFacts.length}`,
    `- **事实接地率: ${evidenceRate}%** (测事实落地,非文学化用)`)

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

  lines.push("", "### 5. 文体特征 (代理指标·非化用证明)",
    `- 意象词密度: ${imageryDensity}/千字 (光影雪血铁雾等具象字)`,
    `- 句长变异系数CV: ${sentCV} (越高=长短句越错落,单调文体趋近0)`,
    `- 比喻结构数: ${metaphorHits} (仿佛/如同/像…一样)`,
    `- 长短句交替率: ${alternRatio}% (相邻句跨越短↔长的占比)`,
    `- ⚠️ 字面统计测不出"是否借了三岛的句式"。真·文学化用需 --judge LLM评委。`)

  lines.push("", "### 6. 过拟合风险",
    `- 重复短语(4-8字≥3次): ${repeatedPhrases.length ? repeatedPhrases.join(" | ") : "无"}`,
    `- 段落均匀度(±20%均值内): ${uniformPct}%${parseFloat(uniformPct) > 60 ? " ⚠️模板风险" : ""}`)

  lines.push("", "### 7. 风格违规",
    `- 作家名泄漏: ${nameHits.length}${nameHits.length ? " (" + nameHits.join("、") + ")" : ""}`,
    `- 禁忌套话: ${phraseHits.length}${phraseHits.length ? " (" + phraseHits.join("、") + ")" : ""}`,
    `- 转折/平衡词: ${transHits.length}${transHits.length ? " (" + transHits.join("、") + ")" : ""}`)

  lines.push("", `### 8. 综合评分: ${score}/100`)

  if (testResult) {
    lines.push("", `### 9. Test verdict: ${testResult.pass ? "✅" : "❌"} ${testResult.id || ""} ${testResult.pass ? "PASS" : "FAIL"}${testResult.reason ? " — " + testResult.reason : ""}`)
  }
  return lines.join("\n")
}

/**
 * 可选 LLM 文学化用评委 (--judge)。默认不跑。
 * 喂 Literary 范本 + 正文,让模型判"文体迁移"0-10。这是唯一能真测"是否借了三岛句式"的路。
 * 代价: 花钱 + 不确定(故必须排除出 POS_020 确定性测试) + 给网关加一次负载。
 * 失败一律返回 null,调用方据此跳过,绝不让评委失败影响主判定。
 */
export async function judgeLiteraryReuse(r) {
  const b = body(r)
  if (!b || b.length < 200) return null
  const baseUrl = String(process.env.CONTENTBASE_LLM_BASE_URL || "").trim().replace(/\/+$/, "")
  const apiKey = String(process.env.CONTENTBASE_LLM_API_KEY || "").trim()
  const model = String(process.env.CONTENTBASE_JUDGE_MODEL || "claude-sonnet-4-6").trim()
  if (!baseUrl || !apiKey) return null

  const its = (r?.json?.data?.context?.diagnostics?.items) || []
  const litSamples = its
    .filter(i => i.channel === "literary")
    .map(i => String(i.text || i.preview || "").trim())
    .filter(t => t.length >= 80)
    .slice(0, 4)
  if (!litSamples.length) return null

  const samplesText = litSamples.map((s, i) => `范本${i + 1}：${s.slice(0, 400)}`).join("\n\n")
  const sys = "你是文体批评家。给你几段文学范本和一篇成品文章。判断文章是否真的吸收了范本的文体(句式节奏/意象方式/语气温度),不是抄词句,是用那种方式说自己的话。只输出JSON：{\"transfer\":0-10整数,\"evidence\":\"一句话举证正文里哪处体现了范本文体,或指出毫无迁移\"}。0=毫无文体迁移纯AI腔,10=明显吸收范本文体。"
  const usr = `${samplesText}\n\n=== 成品文章(前1500字) ===\n${b.slice(0, 1500)}`

  try {
    const resp = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model, messages: [{ role: "system", content: sys }, { role: "user", content: usr }], temperature: 0, max_tokens: 300 }),
      signal: AbortSignal.timeout(30000),
    })
    if (!resp.ok) return null
    const payload = await resp.json()
    const text = String(payload?.choices?.[0]?.message?.content || "").trim()
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) return null
    const parsed = JSON.parse(match[0])
    const transfer = Math.max(0, Math.min(10, Number(parsed.transfer) || 0))
    return { transfer, evidence: String(parsed.evidence || "").slice(0, 200), model, samples: litSamples.length }
  } catch {
    return null
  }
}

export function judgeBlock(judge) {
  if (!judge) return "\n\n### 文学化用评委 (--judge): 未运行或评委不可用"
  return `\n\n### 文学化用评委 (--judge · ${judge.model} · ${judge.samples}范本)\n- **文体迁移分: ${judge.transfer}/10**\n- 举证: ${judge.evidence}`
}
