#!/usr/bin/env node
/**
 * Idempotent import from workspace author prompt markdown into DataBase.
 * Source: E:/My Project/之前的给ai生成文章的提示词
 *
 * The old prompt is no longer treated as an opaque prompt string. It is
 * dissolved into:
 *   - vocabulary rows from 板块五
 *   - semantic_units from all author world-model sections
 *
 * Usage:
 *   node apps/gateway/scripts/import-author-lexicon-from-markdown.mjs [--dry-run] [--gateway http://127.0.0.1:18090]
 */
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const gatewayRoot = path.resolve(scriptDir, "..");
const defaultPromptPath = resolveDefaultPromptPath();

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const promptPath = readArgValue("--prompt") || defaultPromptPath;
const gatewayUrl = String(readArgValue("--gateway") || process.env.DATABASE_GATEWAY_URL || "http://127.0.0.1:18090").replace(/\/+$/, "");
const apiKey = process.env.DATABASE_GATEWAY_API_KEY || readArgValue("--api-key") || "";
const importVocabulary = !args.includes("--semantic-only");
const importSemantic = !args.includes("--lexicon-only");
const AUTHOR_PROMPT_SOURCE_ID = "author_prompt_semantic_world_model_v1";
const AUTHOR_PROMPT_SOURCE_TITLE = "之前的给ai生成文章的提示词";
const AUTHOR_PROMPT_SOURCE_AUTHOR = "operator";

function resolveDefaultPromptPath() {
  const candidates = [
    path.resolve(gatewayRoot, "../../../../之前的给ai生成文章的提示词"),
    path.resolve(gatewayRoot, "../../../之前的给ai生成文章的提示词"),
    "E:/My Project/之前的给ai生成文章的提示词",
  ];
  return candidates.find((candidate) => fs.existsSync(candidate)) || candidates[0];
}

const CATEGORY_TAG_MAP = [
  { pattern: /1\.1\s*宏大叙事/, category: "宏大叙事", tags: ["creative-style", "historical-narrative"] },
  { pattern: /1\.2\s*政权/, category: "政权与制度", tags: ["creative-style", "historical-narrative"] },
  { pattern: /2\.1\s*日方/, category: "日方语境", tags: ["creative-style", "japanese-right-context"] },
  { pattern: /2\.2\s*中方/, category: "中方语境", tags: ["creative-style", "chinese-resistance-context"] },
  { pattern: /2\.3\s*苏联/, category: "苏联语境", tags: ["creative-style", "left-soviet-context"] },
  { pattern: /2\.4\s*罗马/, category: "古典语境", tags: ["creative-style", "classical-imperial-context"] },
  { pattern: /2\.5\s*特定历史/, category: "历史术语", tags: ["creative-style", "historical-term"] },
  { pattern: /3\.1\s*比喻/, category: "比喻系统", tags: ["creative-style", "metaphor-system"] },
  { pattern: /3\.2\s*象征/, category: "象征物", tags: ["creative-style", "metaphor-system"] },
  { pattern: /4\.1\s*内心/, category: "情态", tags: ["creative-style", "author-active", "emotional-register"] },
  { pattern: /4\.2\s*外貌/, category: "情态", tags: ["creative-style", "author-active", "emotional-register"] },
  { pattern: /4\.3\s*肢体/, category: "动作", tags: ["creative-style", "author-active", "action-image"] },
  { pattern: /4\.4\s*声音/, category: "语言", tags: ["creative-style", "author-active"] },
  { pattern: /5\.1\s*自然/, category: "物境", tags: ["creative-style", "author-active", "material-detail"] },
  { pattern: /5\.2\s*人工/, category: "物境", tags: ["creative-style", "author-active", "material-detail"] },
  { pattern: /5\.3\s*色彩/, category: "物境", tags: ["creative-style", "author-active", "material-detail"] },
  { pattern: /6\.1\s*思维/, category: "思辨", tags: ["creative-style", "author-active"] },
  { pattern: /6\.2\s*评价/, category: "思辨", tags: ["creative-style", "author-active"] },
  { pattern: /6\.3\s*时间/, category: "思辨", tags: ["creative-style", "author-active"] },
  { pattern: /7\.1\s*社交/, category: "社会", tags: ["creative-style", "author-active"] },
  { pattern: /7\.2\s*身份/, category: "社会", tags: ["creative-style", "author-active"] },
  { pattern: /8\.1\s*连接/, category: "语法", tags: ["creative-style", "author-active"] },
];

function readArgValue(flag) {
  const index = args.indexOf(flag);
  if (index === -1) return "";
  return args[index + 1] || "";
}

function splitTerms(cell) {
  const normalized = String(cell || "")
    .replace(/[（(][^）)]*[）)]/g, " ")
    .replace(/[。.]+$/g, "")
    .replace(/^\-\s*/gm, " ")
    .replace(/[：:][^、，,；;]*?(?=[、，,；;]|$)/g, " ");
  return normalized
    .split(/[、，,；;]+/)
    .map((item) => item.trim().replace(/^[\-\d.\s]+/, "").trim())
    .filter((item) => item.length >= 2 && item.length <= 40 && /[\u4e00-\u9fff]/.test(item))
    .filter((item) => !/^(一|二|三|四|五|六|七|八)、/.test(item))
    .filter((item) => !/应优先|推荐使用的词汇|词汇类别/.test(item));
}

function detectCategory(line) {
  for (const rule of CATEGORY_TAG_MAP) {
    if (rule.pattern.test(line)) return rule;
  }
  return null;
}

function parseSectionFive(markdown) {
  const start = markdown.indexOf("板块五");
  const end = markdown.indexOf("板块六", start === -1 ? 0 : start);
  const section = start === -1 ? markdown : markdown.slice(start, end === -1 ? undefined : end);
  const lines = section.split(/\r?\n/);
  let current = CATEGORY_TAG_MAP[0];
  const rows = [];
  for (const line of lines) {
    if (!line.includes("|")) continue;
    const cells = line.split("|").map((item) => item.trim()).filter(Boolean);
    if (cells.length < 2 || cells[0] === "---") continue;
    const hit = detectCategory(cells[0]) || detectCategory(line);
    if (hit) current = hit;
    const payload = cells[cells.length - 1];
    if (!payload || payload === "---" || /^[-\s]+$/.test(payload)) continue;
    if (/词汇类别|应优先/.test(payload)) continue;
    for (const term of splitTerms(payload)) {
      rows.push({
        content: term,
        category: current.category,
        tags: current.tags,
      });
    }
  }
  const deduped = new Map();
  for (const row of rows) {
    if (!deduped.has(row.content)) deduped.set(row.content, row);
  }
  return [...deduped.values()];
}

const SEMANTIC_SECTIONS = [
  {
    key: "perspective",
    title: "人称视角选择",
    start: "**人称视角选择",
    end: "## **板块一",
    materialKind: "literary",
    tags: [
      tag("concept", "author_prompt_world_model", "Author prompt semantic world model."),
      tag("narrative_function", "perspective_control", "Narrative perspective and knowledge boundary."),
      tag("style", "limited_omniscient", "Limited omniscient perspective without hindsight."),
    ],
  },
  {
    key: "core_philosophy",
    title: "板块一：核心理念与思想底色",
    start: "## **板块一",
    end: "## **板块二",
    materialKind: "theory",
    rowMode: true,
    tags: [
      tag("concept", "author_prompt_world_model", "Author prompt semantic world model."),
      tag("concept", "history_contextualism", "Historical contextualism and anti-hindsight narrative principle."),
      tag("emotion", "restrained_tragic", "Restrained tragic affect."),
    ],
  },
  {
    key: "narrative_technique",
    title: "板块二：叙事技法：视角、情感与结构",
    start: "## **板块二",
    end: "## **板块三",
    materialKind: "literary",
    rowMode: true,
    tags: [
      tag("concept", "author_prompt_world_model", "Author prompt semantic world model."),
      tag("narrative_function", "narrative_technique", "Reusable narrative technique and few-shot operation guide."),
      tag("style", "deep_empathy_cold_dissection", "Deep empathy with cold dissection."),
    ],
  },
  {
    key: "structure",
    title: "板块三：文章结构：模块化路径与节奏控制",
    start: "## **板块三",
    end: "## **板块四",
    materialKind: "document",
    rowMode: true,
    tags: [
      tag("concept", "author_prompt_world_model", "Author prompt semantic world model."),
      tag("narrative_function", "structure_pattern", "Article structure and pacing pattern."),
      tag("narrative_position", "article_structure", "Opening, development, turn and ending logic."),
    ],
  },
  {
    key: "style_constraints",
    title: "板块四：文体、语言与禁忌",
    start: "## **板块四",
    end: "## **板块五",
    materialKind: "literary",
    rowMode: true,
    tags: [
      tag("concept", "author_prompt_world_model", "Author prompt semantic world model."),
      tag("style", "style_constraint", "Style and format constraints."),
      tag("narrative_function", "negative_constraint", "Things the writer should avoid."),
    ],
  },
  {
    key: "lexicon_section",
    title: "板块五：词汇库",
    start: "## **板块五",
    end: "## **板块六",
    materialKind: "literary",
    rowMode: true,
    tags: [
      tag("concept", "author_prompt_world_model", "Author prompt semantic world model."),
      tag("style", "lexicon_layer", "Reusable lexicon and diction domain."),
      tag("narrative_function", "language_fuel", "Language material for writer context."),
    ],
  },
  {
    key: "allusion_library",
    title: "板块六：引用与化用素材库",
    start: "## **板块六",
    end: null,
    materialKind: "literary",
    rowMode: true,
    tags: [
      tag("concept", "author_prompt_world_model", "Author prompt semantic world model."),
      tag("concept", "allusion_library", "Allusion, citation and source-use library."),
      tag("narrative_function", "source_transformation", "How reference materials should be transformed into prose."),
    ],
  },
];

function tag(layer, value, description) {
  return { layer, value, description };
}

function parseSemanticSections(markdown) {
  const lineStarts = buildLineStarts(markdown);
  const units = [];
  for (const section of SEMANTIC_SECTIONS) {
    const startIndex = markdown.indexOf(section.start);
    if (startIndex === -1) continue;
    const endIndex = section.end ? markdown.indexOf(section.end, startIndex + section.start.length) : -1;
    const body = markdown.slice(startIndex, endIndex === -1 ? undefined : endIndex).trim();
    if (!body) continue;
    const lineRange = lineRangeForSlice(lineStarts, startIndex, startIndex + body.length);
    const chunks = section.rowMode ? parseMarkdownRows(body, section, lineRange) : [buildSectionUnit(section, body, lineRange, 1)];
    units.push(...chunks);
  }
  const deduped = new Map();
  for (const unit of units) {
    if (!unit.excerpt || unit.excerpt.length < 20) continue;
    deduped.set(unit.unitId, unit);
  }
  return [...deduped.values()];
}

function buildLineStarts(text) {
  const starts = [0];
  for (let index = 0; index < text.length; index += 1) {
    if (text[index] === "\n") starts.push(index + 1);
  }
  return starts;
}

function lineRangeForSlice(lineStarts, startIndex, endIndex) {
  let startLine = 1;
  let endLine = 1;
  for (let index = 0; index < lineStarts.length; index += 1) {
    if (lineStarts[index] <= startIndex) startLine = index + 1;
    if (lineStarts[index] <= endIndex) endLine = index + 1;
  }
  return { startLine, endLine };
}

function parseMarkdownRows(body, section, sectionLineRange) {
  const rows = [];
  let rowIndex = 0;
  for (const rawLine of body.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line.includes("|")) continue;
    const cells = line.split("|").map((item) => item.trim()).filter(Boolean);
    if (cells.length < 2) continue;
    if (cells.some((cell) => /^-+$/.test(cell.replace(/\s/g, "")))) continue;
    if (["维度", "结构模块", "类别", "词汇类别"].includes(cells[0])) continue;
    const excerpt = cells.join("\n");
    if (excerpt.length < 20) continue;
    rowIndex += 1;
    rows.push(buildSectionUnit(section, excerpt, sectionLineRange, rowIndex, cells[0]));
  }
  if (rows.length) return rows;
  return splitLongSection(body, 2200).map((chunk, index) => buildSectionUnit(section, chunk, sectionLineRange, index + 1));
}

function splitLongSection(text, maxChars) {
  const normalized = normalizePromptBlock(text);
  if (normalized.length <= maxChars) return [normalized];
  const parts = [];
  let rest = normalized;
  while (rest.length > maxChars) {
    let cut = rest.lastIndexOf("\n", maxChars);
    if (cut < maxChars * 0.5) cut = rest.lastIndexOf("。", maxChars);
    if (cut < maxChars * 0.5) cut = maxChars;
    parts.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest) parts.push(rest);
  return parts;
}

function buildSectionUnit(section, rawText, lineRange, index, rowTitle = "") {
  const excerpt = normalizePromptBlock(rawText);
  const summary = buildSemanticSummary(section, excerpt, rowTitle);
  const locator = `${section.title}${rowTitle ? ` / ${rowTitle}` : ""} / lines ${lineRange.startLine}-${lineRange.endLine} / unit ${index}`;
  return {
    unitId: semanticUnitId(section.key, index, rowTitle || excerpt),
    sourceId: AUTHOR_PROMPT_SOURCE_ID,
    sourceTitle: AUTHOR_PROMPT_SOURCE_TITLE,
    sourceAuthor: AUTHOR_PROMPT_SOURCE_AUTHOR,
    sourceLocator: locator,
    excerpt,
    summary,
    materialKind: section.materialKind,
    status: "active",
    tags: enrichSemanticTags(section.tags, section.key, rowTitle, excerpt),
  };
}

function normalizePromptBlock(value) {
  return String(value || "")
    .replace(/\u200b/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function buildSemanticSummary(section, excerpt, rowTitle) {
  const lead = rowTitle ? `${section.title}：${rowTitle}` : section.title;
  return `${lead}。${excerpt.replace(/\n+/g, " ").slice(0, 900)}`;
}

function enrichSemanticTags(baseTags, sectionKey, rowTitle, excerpt) {
  const values = new Map();
  const materialKind = SEMANTIC_SECTIONS.find((section) => section.key === sectionKey)?.materialKind || "literary";
  values.set(
    `usable_for:reference:${materialKind}`,
    tag("usable_for", `reference:${materialKind}`, `Reusable ${materialKind} material for writing reference selection.`)
  );
  for (const item of baseTags) {
    values.set(`${item.layer}:${item.value}`, item);
  }
  values.set(`narrative_function:${sectionKey}`, tag("narrative_function", sectionKey, `Prompt section ${sectionKey}.`));
  const text = `${rowTitle} ${excerpt}`;
  const inferred = [
    [/后见之明|未来|历史迷雾|全知/, tag("concept", "anti_hindsight", "Avoid hindsight and preserve historical uncertainty.")],
    [/物哀|苍凉|悲怆|虚无/, tag("emotion", "mono_no_aware", "Quiet melancholy and awareness of transience.")],
    [/水文|暗流|洪流|支流|漩涡/, tag("image", "hydrology", "Hydrology imagery domain.")],
    [/建筑|大厦|基石|梁柱|废墟/, tag("image", "architecture", "Architecture imagery domain.")],
    [/神学|末世|天命|救世/, tag("image", "theology", "Theological or eschatological imagery domain.")],
    [/开端|切入|结尾|转折|结构/, tag("narrative_position", "composition", "Composition and article movement.")],
    [/禁|严禁|避免|不得|禁止/, tag("narrative_function", "constraint", "Negative or boundary constraint.")],
  ];
  for (const [pattern, item] of inferred) {
    if (pattern.test(text)) values.set(`${item.layer}:${item.value}`, item);
  }
  return [...values.values()].slice(0, 16);
}

function semanticUnitId(sectionKey, index, seed) {
  const digest = createHash("sha256")
    .update(`${AUTHOR_PROMPT_SOURCE_ID}:${sectionKey}:${index}:${seed}`, "utf8")
    .digest("hex")
    .slice(0, 24);
  return `author_prompt_${digest}`;
}

function idempotencyKeyForTerm(content) {
  const digest = createHash("sha256").update(String(content), "utf8").digest("hex").slice(0, 32);
  return `import-author-lexicon:${digest}`;
}

function idempotencyKeyForSemanticUnit(unit) {
  const digest = createHash("sha256")
    .update(stableJson(unit), "utf8")
    .digest("hex")
    .slice(0, 16);
  return `import-author-semantic:${unit.unitId}:${digest}`;
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

async function upsertTerm(row, attempt = 1) {
  const idempotencyKey = idempotencyKeyForTerm(row.content);
  let response;
  try {
    response = await fetch(`${gatewayUrl}/writes/upsert-vocabulary-item`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(apiKey ? { "X-DataBase-Api-Key": apiKey } : {}),
      "X-DataBase-Idempotency-Key": idempotencyKey,
    },
      body: JSON.stringify({
        requestId: "import-author-lexicon",
        actor: "import-author-lexicon-from-markdown",
        payload: {
          content: row.content,
          type: "vocabulary",
          category: row.category,
          tags: row.tags,
          note: "creative-style import: author prompt section-five",
        },
      }),
    });
  } catch (error) {
    if (attempt < 4) {
      await new Promise((resolve) => setTimeout(resolve, attempt * 400));
      return upsertTerm(row, attempt + 1);
    }
    throw error;
  }
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (attempt < 4 && response.status >= 500) {
      await new Promise((resolve) => setTimeout(resolve, attempt * 400));
      return upsertTerm(row, attempt + 1);
    }
    throw new Error(`upsert failed for ${row.content}: ${response.status} ${JSON.stringify(body)}`);
  }
  return body;
}

async function recordSemanticUnit(unit, attempt = 1) {
  let response;
  try {
    response = await fetch(`${gatewayUrl}/writes/record-semantic-reference-material`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(apiKey ? { "X-DataBase-Api-Key": apiKey } : {}),
        "X-DataBase-Idempotency-Key": idempotencyKeyForSemanticUnit(unit),
      },
      body: JSON.stringify({
        requestId: "import-author-semantic-world-model",
        actor: "import-author-lexicon-from-markdown",
        payload: unit,
      }),
    });
  } catch (error) {
    if (attempt < 4) {
      await new Promise((resolve) => setTimeout(resolve, attempt * 400));
      return recordSemanticUnit(unit, attempt + 1);
    }
    throw error;
  }
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (attempt < 4 && response.status >= 500) {
      await new Promise((resolve) => setTimeout(resolve, attempt * 400));
      return recordSemanticUnit(unit, attempt + 1);
    }
    throw new Error(`semantic unit import failed for ${unit.unitId}: ${response.status} ${JSON.stringify(body)}`);
  }
  return body;
}

async function main() {
  if (!fs.existsSync(promptPath)) {
    console.error(JSON.stringify({ ok: false, error: "prompt_file_missing", promptPath }, null, 2));
    process.exit(1);
  }
  const markdown = fs.readFileSync(promptPath, "utf8");
  const terms = parseSectionFive(markdown);
  const semanticUnits = parseSemanticSections(markdown);
  const sqlOut = path.join(gatewayRoot, "sql", "004_author_lexicon_from_prompt_generated.sql");
  const sqlLines = [
    "-- AUTO-GENERATED by import-author-lexicon-from-markdown.mjs; do not hand-edit",
    "INSERT INTO vocabulary (content, type, category, tags, note)",
    "VALUES",
  ];
  for (const row of terms) {
    const tagsJson = JSON.stringify(row.tags);
    sqlLines.push(
      `  ('${row.content.replace(/'/g, "''")}', 'vocabulary', '${row.category.replace(/'/g, "''")}', CAST('${tagsJson.replace(/'/g, "''")}' AS JSON), 'creative-style import: author prompt section-five'),`
    );
  }
  sqlLines.push("ON DUPLICATE KEY UPDATE");
  sqlLines.push("  category = VALUES(category),");
  sqlLines.push("  tags = CASE WHEN tags IS NULL THEN VALUES(tags) ELSE tags END,");
  sqlLines.push("  updated_at = CURRENT_TIMESTAMP;");
  if (importVocabulary) {
    fs.writeFileSync(sqlOut, `${sqlLines.join("\n")}\n`, "utf8");
  }

  if (dryRun) {
    console.log(JSON.stringify({
      ok: true,
      dryRun: true,
      importVocabulary,
      importSemantic,
      termCount: terms.length,
      semanticUnitCount: semanticUnits.length,
      semanticTextChars: semanticUnits.reduce((sum, item) => sum + item.excerpt.length + String(item.summary || "").length, 0),
      sqlOut: importVocabulary ? sqlOut : null,
      vocabularySample: terms.slice(0, 12),
      semanticSample: semanticUnits.slice(0, 6).map((item) => ({
        unitId: item.unitId,
        materialKind: item.materialKind,
        sourceLocator: item.sourceLocator,
        excerptChars: item.excerpt.length,
        tagValues: item.tags.map((tagItem) => tagItem.value),
      })),
    }, null, 2));
    return;
  }

  let written = 0;
  if (importVocabulary) {
    for (const row of terms) {
      await upsertTerm(row);
      written += 1;
      if (written % 50 === 0) {
        console.error(`[vocabulary] ${written}/${terms.length}`);
      }
    }
  }
  let semanticWritten = 0;
  if (importSemantic) {
    for (const unit of semanticUnits) {
      await recordSemanticUnit(unit);
      semanticWritten += 1;
      if (semanticWritten % 10 === 0) {
        console.error(`[semantic] ${semanticWritten}/${semanticUnits.length}`);
      }
    }
  }
  console.log(JSON.stringify({
    ok: true,
    termCount: terms.length,
    written,
    semanticUnitCount: semanticUnits.length,
    semanticWritten,
    semanticTextChars: semanticUnits.reduce((sum, item) => sum + item.excerpt.length + String(item.summary || "").length, 0),
    sqlOut: importVocabulary ? sqlOut : null,
    gatewayUrl,
  }, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) }, null, 2));
  process.exit(1);
});
