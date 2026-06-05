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

  // 化用率: 从 Reality preview 提取事实(年份/数字/机构名词)→ 正文命中率。
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

  if (testResult) {
    lines.push("", `### 8. Test verdict: ${testResult.pass ? "✅" : "❌"} ${testResult.id || ""} ${testResult.pass ? "PASS" : "FAIL"}${testResult.reason ? " — " + testResult.reason : ""}`)
  }
  return lines.join("\n")
}
