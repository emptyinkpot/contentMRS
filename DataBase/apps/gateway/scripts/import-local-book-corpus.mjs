import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import process from "node:process";
import AdmZip from "adm-zip";
import mysql from "mysql2/promise";

const DEFAULT_MD_PATH = "E:\\Vaults\\Obsidian\\docs\\books\\兴亡的世界史全21卷.md";
const DEFAULT_EPUB_PATH = "E:\\Vaults\\Obsidian\\docs\\books\\original\\兴亡的世界史全21卷.epub";

const MATERIAL_TAGS = {
  historical_case: [
    { layer: "usable_for", value: "reference:document", description: "历史案例与事实材料。" },
    { layer: "narrative_function", value: "历史案例", description: "可作为论证或叙事中的历史案例。" },
  ],
  civilization_pattern: [
    { layer: "usable_for", value: "reference:theory", description: "文明史模式与解释框架。" },
    { layer: "concept", value: "文明兴衰", description: "可用于文明兴衰、制度演化或结构性比较。" },
  ],
  literary_style: [
    { layer: "usable_for", value: "reference:literary", description: "可作为文风、句法和叙述节奏参考。" },
    { layer: "style", value: "兴亡的世界史", description: "讲谈社文明史叙述风格参考。" },
  ],
  restricted_style: [
    { layer: "usable_for", value: "reference:literary", description: "受限版权文本的文风、句法和修辞画像。" },
    { layer: "style", value: "restricted-style-reference", description: "只可用于句法、修辞和段落技法参考，不可复写原句。" },
  ],
  syntax_profile: [
    { layer: "usable_for", value: "reference:literary", description: "句式结构、句长分布和段落推进参考。" },
    { layer: "narrative_function", value: "句法画像", description: "用于指导模型构句，不提供可复制原句。" },
  ],
};

function parseArgs(argv) {
  const result = {
    sourceMd: DEFAULT_MD_PATH,
    sourceEpub: DEFAULT_EPUB_PATH,
    sourceId: "book_xingwang_world_history_21",
    title: "兴亡的世界史全21卷",
    author: "讲谈社《兴亡的世界史》系列",
    category: "history-style-reference",
    privacyLevel: "private",
    chunkChars: 1800,
    semanticSamples: 120,
    sourceFormat: "auto",
    copyrightMode: "source-grounded",
    apply: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (!item.startsWith("--")) continue;
    const key = item.slice(2);
    if (key === "apply") {
      result.apply = true;
      continue;
    }
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      result[key] = true;
      continue;
    }
    result[key] = next;
    index += 1;
  }

  result.chunkChars = clampNumber(result.chunkChars, 1800, 600, 5000);
  result.semanticSamples = clampNumber(result.semanticSamples, 120, 0, 1000);
  result.sourceFormat = String(result.sourceFormat || "auto").trim();
  result.copyrightMode = String(result.copyrightMode || "source-grounded").trim();
  return result;
}

function clampNumber(value, fallback, min, max) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

async function readMysqlConfig() {
  const cnfPath = process.env.MYBLOG_CNF
    || resolve(process.env.USERPROFILE || process.env.HOME || "", ".codex-secrets", "mysql", "myblog.cnf");
  const content = await readFile(cnfPath, "utf8");
  const config = {};
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith(";") || trimmed.startsWith("[")) {
      continue;
    }
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^["']|["']$/g, "");
    config[key] = value;
  }
  return {
    host: process.env.MYSQL_HOST || config.host,
    port: Number(process.env.MYSQL_PORT || config.port || 3306),
    user: process.env.MYSQL_USER || config.user,
    password: process.env.MYSQL_PASSWORD || config.password,
    database: process.env.MYSQL_DATABASE || config.database,
    charset: "utf8mb4",
  };
}

function sha256(text) {
  return createHash("sha256").update(String(text || ""), "utf8").digest("hex");
}

function stableId(prefix, value, length = 40) {
  return `${prefix}_${sha256(value).slice(0, length)}`;
}

function normalizeLine(line) {
  return String(line || "")
    .replace(/\r/g, "")
    .replace(/\\$/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function isImageOrImageNote(line) {
  return /^!\[[^\]]*]\([^)]+\)$/.test(line)
    || /^>\s*备注：原书插图保留件/.test(line);
}

function isEmptyHeading(line) {
  return /^#{1,6}\s*$/.test(line);
}

function parseHeading(line) {
  const markdown = line.match(/^(#{1,6})\s*(.+?)\s*$/);
  if (markdown) {
    return { level: markdown[1].length, title: normalizeLine(markdown[2]) };
  }
  const chapter = line.match(/^(序章|终章|第[一二三四五六七八九十百千万零〇0-9]+[章节部卷])$/);
  if (chapter) {
    return { level: 2, title: chapter[1] };
  }
  return null;
}

function cleanMarkdown(raw) {
  // 只做确定性清洗：去图片噪声、保留标题层级和源行号，不让模型参与基础切分。
  const lines = raw.split(/\n/);
  const cleanLines = [];
  const sections = [];
  const current = {
    h1: "",
    h2: "",
    h3: "",
    h4: "",
    h5: "",
    h6: "",
  };
  let paragraph = [];
  let paragraphStart = 1;

  function locatorText() {
    return [current.h2, current.h3, current.h4, current.h5, current.h6]
      .filter(Boolean)
      .join(" / ");
  }

  function flushParagraph(endLine) {
    const text = paragraph.join("\n").trim();
    if (!text) {
      paragraph = [];
      return;
    }
    sections.push({
      text,
      locator: locatorText() || current.h1 || "正文",
      chapter: current.h2 || null,
      section: [current.h3, current.h4, current.h5, current.h6].filter(Boolean).join(" / ") || null,
      startLine: paragraphStart,
      endLine,
    });
    paragraph = [];
  }

  for (let index = 0; index < lines.length; index += 1) {
    const lineNumber = index + 1;
    const line = normalizeLine(lines[index]);
    if (!line || isImageOrImageNote(line) || isEmptyHeading(line)) {
      flushParagraph(lineNumber - 1);
      continue;
    }

    const heading = parseHeading(line);
    if (heading) {
      flushParagraph(lineNumber - 1);
      current[`h${heading.level}`] = heading.title;
      for (let level = heading.level + 1; level <= 6; level += 1) {
        current[`h${level}`] = "";
      }
      cleanLines.push(`${"#".repeat(Math.min(heading.level, 6))} ${heading.title}`);
      continue;
    }

    if (paragraph.length === 0) paragraphStart = lineNumber;
    paragraph.push(line);
    cleanLines.push(line);
  }
  flushParagraph(lines.length);

  return {
    text: cleanLines.join("\n").replace(/\n{3,}/g, "\n\n").trim(),
    sections,
  };
}

function readZipText(zip, path) {
  const normalized = String(path || "").replace(/\\/g, "/");
  const entry = zip.getEntry(normalized);
  if (!entry) return "";
  return entry.getData().toString("utf8");
}

function stripXmlText(raw) {
  return decodeXmlEntities(String(raw || "")
    .replace(/<\s*(script|style)[\s\S]*?<\s*\/\s*\1\s*>/gi, " ")
    .replace(/<\s*br\s*\/?\s*>/gi, "\n")
    .replace(/<\/\s*(p|div|section|article|h1|h2|h3|h4|h5|h6|li)\s*>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/[ \t\f\v]+/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n"))
    .trim();
}

function decodeXmlEntities(text) {
  const named = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: "\"",
    apos: "'",
    nbsp: " ",
  };
  return String(text || "").replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (match, entity) => {
    if (entity.startsWith("#x")) {
      return String.fromCodePoint(Number.parseInt(entity.slice(2), 16));
    }
    if (entity.startsWith("#")) {
      return String.fromCodePoint(Number.parseInt(entity.slice(1), 10));
    }
    return Object.prototype.hasOwnProperty.call(named, entity) ? named[entity] : match;
  });
}

function dirnamePosix(path) {
  const normalized = String(path || "").replace(/\\/g, "/");
  const index = normalized.lastIndexOf("/");
  return index >= 0 ? normalized.slice(0, index + 1) : "";
}

function joinPosix(base, relative) {
  if (/^[a-z]+:/i.test(relative) || relative.startsWith("/")) return relative.replace(/^\/+/, "");
  const parts = `${base || ""}${relative || ""}`.split("/");
  const stack = [];
  for (const part of parts) {
    if (!part || part === ".") continue;
    if (part === "..") stack.pop();
    else stack.push(part);
  }
  return stack.join("/");
}

function parseEpub(rawBuffer) {
  // EPUB 是 zip + OPF spine。这里只做确定性文本提取，后续受限版权模式会再转成风格画像。
  const zip = new AdmZip(rawBuffer);
  const container = readZipText(zip, "META-INF/container.xml");
  const rootfile = container.match(/full-path=["']([^"']+)["']/i)?.[1];
  if (!rootfile) {
    throw new Error("EPUB container.xml does not declare a rootfile");
  }
  const opf = readZipText(zip, rootfile);
  const opfBase = dirnamePosix(rootfile);
  const manifest = new Map();
  for (const match of opf.matchAll(/<item\b([^>]+)>/gi)) {
    const attrs = match[1];
    const id = attrs.match(/\bid=["']([^"']+)["']/i)?.[1];
    const href = attrs.match(/\bhref=["']([^"']+)["']/i)?.[1];
    const mediaType = attrs.match(/\bmedia-type=["']([^"']+)["']/i)?.[1] || "";
    if (id && href) {
      manifest.set(id, {
        href: joinPosix(opfBase, href),
        mediaType,
      });
    }
  }
  const spineIds = Array.from(opf.matchAll(/<itemref\b([^>]+)>/gi))
    .map((match) => match[1].match(/\bidref=["']([^"']+)["']/i)?.[1])
    .filter(Boolean);
  const sections = [];
  const textParts = [];
  let order = 0;
  for (const id of spineIds) {
    const item = manifest.get(id);
    if (!item || !/(xhtml|html|xml)/i.test(item.mediaType || item.href)) continue;
    const raw = readZipText(zip, item.href);
    if (!raw) continue;
    const text = stripXmlText(raw);
    if (!text) continue;
    order += 1;
    const locator = `EPUB spine ${order} ${basename(item.href)}`;
    textParts.push(`## ${locator}\n${text}`);
    for (const paragraph of text.split(/\n{2,}/)) {
      const normalized = normalizeLine(paragraph);
      if (!normalized || normalized.length < 20) continue;
      sections.push({
        text: normalized,
        locator,
        chapter: locator,
        section: null,
        startLine: order,
        endLine: order,
      });
    }
  }
  return {
    text: textParts.join("\n\n").trim(),
    sections,
  };
}

function buildRestrictedStyleCorpus(parsed) {
  // 受限版权文本只落“风格画像”和“句法标注”，不把原文长段落写入可召回 chunk。
  const derived = [];
  const grouped = new Map();
  for (const section of parsed.sections) {
    const current = grouped.get(section.locator) || [];
    current.push(section.text);
    grouped.set(section.locator, current);
  }
  for (const [locator, paragraphs] of grouped.entries()) {
    const profile = buildStyleProfile(paragraphs);
    if (!profile) continue;
    derived.push({
      text: [
        `受限版权风格画像。来源定位 ${locator}。`,
        `句长分布 ${profile.sentenceLengthBand}。段落密度 ${profile.paragraphDensity}。`,
        `推进方式 ${profile.progressionMoves.join("，") || "以感受，判断，物象之间的牵连推进"}。`,
        `修辞倾向 ${profile.rhetoricalMoves.join("，") || "以物象承载心理和观念压力"}。`,
        `意象簇 ${profile.imageClusters.join("，") || "建筑，光影，身体感，宗教性物象"}。`,
        "使用边界 只能学习句法节奏，段落推进，意象关系和修辞功能，不得复写原句，不得把该材料当事实证据。",
      ].join("\n"),
      locator,
      chapter: locator,
      section: "restricted-style-profile",
      startLine: 0,
      endLine: 0,
      restrictedStyle: true,
    });
  }
  return {
    text: derived.map((item) => item.text).join("\n\n"),
    sections: derived,
  };
}

function buildStyleProfile(paragraphs) {
  const clean = paragraphs
    .map((item) => String(item || "").replace(/\s+/g, " ").trim())
    .filter((item) => item.length >= 20);
  if (!clean.length) return null;
  const sentences = clean.flatMap((item) => item.split(/[。！？!?]/).map((part) => part.trim()).filter(Boolean));
  const avgSentenceLength = sentences.length
    ? Math.round(sentences.reduce((sum, item) => sum + item.length, 0) / sentences.length)
    : 0;
  const avgParagraphLength = Math.round(clean.reduce((sum, item) => sum + item.length, 0) / clean.length);
  const joined = clean.join("\n");
  return {
    sentenceLengthBand: avgSentenceLength >= 70 ? "长句密集" : avgSentenceLength >= 42 ? "中长句为主" : "短中句交替",
    paragraphDensity: avgParagraphLength >= 480 ? "高密度段落" : avgParagraphLength >= 260 ? "中等密度段落" : "短段落",
    progressionMoves: detectStyleMoves(joined),
    rhetoricalMoves: detectRhetoricalMoves(joined),
    imageClusters: detectImageClusters(joined),
  };
}

function detectStyleMoves(text) {
  const moves = [];
  if (/美|丑|恐怖|不安|羞|罪|死|灭|空虚|孤独/.test(text)) moves.push("由感官和情绪转入观念压力");
  if (/看|凝视|听|闻|触|光|影|色|声/.test(text)) moves.push("由感官细节牵出内心判断");
  if (/寺|阁|门|墙|屋|塔|水|火|山|庭|廊/.test(text)) moves.push("以建筑或自然物象承载心理变化");
  if (/我|自己|心|想|觉得|意识|记忆/.test(text)) moves.push("以自我意识回环推进段落");
  return moves.slice(0, 4);
}

function detectRhetoricalMoves(text) {
  const moves = [];
  if (/仿佛|似乎|如同|好像/.test(text)) moves.push("比拟从具体物象起步");
  if (/然而|可是|但是|却|反而/.test(text)) moves.push("转折句推动心理反向");
  if (/不是|并非|无论|即使/.test(text)) moves.push("否定句建立内在辩驳");
  if (/必须|不能|只有|终于/.test(text)) moves.push("判断句形成强迫性收束");
  return moves.slice(0, 4);
}

function detectImageClusters(text) {
  const clusters = [];
  if (/寺|阁|塔|门|墙|屋|庭|廊|柱/.test(text)) clusters.push("建筑物象");
  if (/金|光|影|暗|白|黑|红|色/.test(text)) clusters.push("光影色彩");
  if (/火|烧|灰|烟|热/.test(text)) clusters.push("火与毁灭");
  if (/水|雨|海|湖|潮/.test(text)) clusters.push("水与流动");
  if (/脸|眼|手|脚|身体|皮肤|病|痛/.test(text)) clusters.push("身体感");
  if (/佛|神|寺|僧|经|祈|罪/.test(text)) clusters.push("宗教性词场");
  return clusters.slice(0, 6);
}

function chunkSections(sections, maxChars) {
  // 按章节定位合并段落，避免一个 chunk 横跨不同章节，后续 EvidencePack 可回指原书位置。
  const chunks = [];
  let current = null;

  function pushCurrent() {
    if (!current || !current.text.trim()) return;
    chunks.push({
      ...current,
      text: current.text.trim(),
    });
    current = null;
  }

  for (const section of sections) {
    const text = section.text.trim();
    if (!text) continue;
    if (text.length > maxChars) {
      pushCurrent();
      for (let start = 0; start < text.length; start += maxChars) {
        chunks.push({
          text: text.slice(start, start + maxChars).trim(),
          locator: section.locator,
          chapter: section.chapter,
          section: section.section,
          startLine: section.startLine,
          endLine: section.endLine,
        });
      }
      continue;
    }

    if (!current) {
      current = { ...section, text };
      continue;
    }

    const sameLocator = current.locator === section.locator;
    const candidate = `${current.text}\n\n${text}`;
    if (sameLocator && candidate.length <= maxChars) {
      current.text = candidate;
      current.endLine = section.endLine;
    } else {
      pushCurrent();
      current = { ...section, text };
    }
  }
  pushCurrent();
  return chunks;
}

function classifySection(section) {
  // P0 先用可解释规则粗分材料；后续 Qwen enrichment 会在同一 sourceId 下补更细的卡片。
  const text = `${section.locator} ${section.text}`;
  if (/文明|文化|时代|空间|制度|国家|社会|农业|都市|帝国|王国|民族|宗教|技术/.test(text)) {
    return "civilization_pattern";
  }
  if (/笔者|想法|理解|叙述|故事|比较|描写|具体|样貌|感受|经验/.test(text)) {
    return "literary_style";
  }
  return "historical_case";
}

function buildSemanticSamples(sections, limit) {
  if (limit <= 0) return [];
  const selected = [];
  const seenLocators = new Set();

  for (const section of sections) {
    const trimmed = section.text.replace(/\s+/g, " ").trim();
    if (trimmed.length < 80) continue;
    const kind = classifySection(section);
    const key = `${kind}:${section.locator}`;
    if (seenLocators.has(key) && selected.length < Math.floor(limit * 0.8)) {
      continue;
    }
    seenLocators.add(key);
    selected.push({
      ...section,
      materialKind: kind === "literary_style" ? "literary" : kind === "civilization_pattern" ? "theory" : "document",
      classification: kind,
      excerpt: trimmed.slice(0, 700),
      summary: `${section.locator}：${trimmed.slice(0, 160)}`,
      tags: MATERIAL_TAGS[kind],
    });
    if (selected.length >= limit) break;
  }

  return selected;
}

function buildRestrictedStyleSemanticSamples(sections, limit) {
  if (limit <= 0) return [];
  return sections
    .filter((section) => section.restrictedStyle && section.text.length >= 80)
    .slice(0, limit)
    .map((section) => ({
      ...section,
      materialKind: "literary",
      classification: "restricted_style",
      excerpt: section.text.slice(0, 700),
      summary: `${section.locator}：受限版权风格画像，只可用于句法，修辞和段落推进参考。`,
      tags: [
        ...MATERIAL_TAGS.restricted_style,
        ...MATERIAL_TAGS.syntax_profile,
      ],
    }));
}

async function ensureSearchTables(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS search_documents (
      id varchar(128) NOT NULL PRIMARY KEY,
      source_table varchar(96) NOT NULL,
      source_id varchar(128) NOT NULL,
      source varchar(96) NULL,
      title text NULL,
      content_hash varchar(64) NOT NULL,
      content_kind varchar(64) NULL,
      value_level varchar(32) NULL,
      privacy_level varchar(32) NOT NULL,
      search_status varchar(32) NOT NULL,
      metadata_json json NULL,
      created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_search_document_source (source_table, source_id),
      KEY idx_search_documents_privacy (privacy_level),
      KEY idx_search_documents_status (search_status),
      KEY idx_search_documents_kind (content_kind)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS search_chunks (
      id varchar(128) NOT NULL PRIMARY KEY,
      document_id varchar(128) NOT NULL,
      chunk_index int NOT NULL,
      chunk_text mediumtext NOT NULL,
      token_estimate int NOT NULL,
      content_hash varchar(64) NOT NULL,
      privacy_level varchar(32) NOT NULL,
      index_status varchar(32) NOT NULL,
      metadata_json json NULL,
      created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_search_chunk_doc_index (document_id, chunk_index),
      KEY idx_search_chunks_document (document_id),
      KEY idx_search_chunks_privacy (privacy_level),
      KEY idx_search_chunks_status (index_status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS search_index_jobs (
      id varchar(128) NOT NULL PRIMARY KEY,
      target varchar(64) NOT NULL,
      mode varchar(32) NOT NULL,
      status varchar(32) NOT NULL,
      item_limit int NOT NULL,
      metadata_json json NULL,
      created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      completed_at timestamp NULL,
      KEY idx_search_index_jobs_status (status),
      KEY idx_search_index_jobs_target (target)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

async function upsertLiterature(connection, args, cleanText, sourceHash) {
  const restricted = args.copyrightMode === "restricted-style-reference";
  const tags = JSON.stringify(restricted
    ? ["book-corpus", "restricted-copyright", "style-reference", "syntax-profile"]
    : ["book-corpus", "history", "civilization-history", "style-reference"], null, 0);
  const note = restricted
    ? [
      "Local operator-owned copyrighted source imported as restricted style/syntax reference.",
      "Search projection stores derived style profiles instead of reusable original prose.",
      "Use for syntax, rhetoric, paragraph motion, and imagery analysis only.",
      "Do not copy sentences or long passages into generated output.",
    ].join(" ")
    : [
      "Local operator-owned source imported as a searchable private reference corpus.",
      "Use for material discovery, style/syntax comparison, and citation candidate retrieval.",
      "Do not copy long passages into generated output.",
    ].join(" ");
  const [existing] = await connection.execute(
    "SELECT id FROM literature WHERE title = ? AND (author <=> ?) ORDER BY id DESC LIMIT 1",
    [args.title, args.author]
  );
  const values = [
    args.title,
    args.author,
    args.category,
    cleanText,
    args.sourceMd || args.sourceEpub,
    tags,
    `${note} contentHash=${sourceHash}`,
    95,
  ];
  if (existing.length > 0) {
    const id = existing[0].id;
    await connection.execute(
      `UPDATE literature
       SET title = ?, author = ?, category = ?, content = ?, source = ?, tags = CAST(? AS JSON), note = ?, priority = ?
       WHERE id = ?`,
      [...values, id]
    );
    return { id: String(id), action: "updated" };
  }
  const [result] = await connection.execute(
    `INSERT INTO literature (title, author, category, content, source, tags, note, priority)
     VALUES (?, ?, ?, ?, ?, CAST(? AS JSON), ?, ?)`,
    values
  );
  return { id: String(result.insertId), action: "inserted" };
}

async function upsertSearchProjection(connection, args, chunks, sourceHash) {
  // search_documents/search_chunks 是 ContentBase EvidencePack 当前读取的 canonical 投影。
  const documentId = stableId("sd", `literature|${args.sourceId}`);
  const metadata = {
    sourceId: args.sourceId,
    sourceMd: args.sourceMd,
    sourceEpub: args.sourceEpub,
    sourceFormat: args.sourceFormat,
    copyrightMode: args.copyrightMode,
    importedBy: "apps/gateway/scripts/import-local-book-corpus.mjs",
    sourceFile: basename(args.sourceMd || args.sourceEpub),
  };
  await connection.execute(
    `INSERT INTO search_documents
      (id, source_table, source_id, source, title, content_hash, content_kind, value_level, privacy_level, search_status, metadata_json)
     VALUES (?, 'literature', ?, ?, ?, ?, 'book_corpus', 'high', ?, 'ready', CAST(? AS JSON))
     ON DUPLICATE KEY UPDATE
      source = VALUES(source),
      title = VALUES(title),
      content_hash = VALUES(content_hash),
      content_kind = VALUES(content_kind),
      value_level = VALUES(value_level),
      privacy_level = VALUES(privacy_level),
      search_status = VALUES(search_status),
      metadata_json = VALUES(metadata_json),
      updated_at = CURRENT_TIMESTAMP`,
    [
      documentId,
      args.sourceId,
      args.sourceMd || args.sourceEpub,
      args.title,
      sourceHash,
      args.privacyLevel,
      JSON.stringify(metadata),
    ]
  );

  await connection.execute("DELETE FROM search_chunks WHERE document_id = ?", [documentId]);
  for (let index = 0; index < chunks.length; index += 1) {
    const chunk = chunks[index];
    const chunkHash = sha256(chunk.text);
    const chunkId = stableId("sc", `${documentId}|${index}|${chunkHash}`);
    await connection.execute(
      `INSERT INTO search_chunks
        (id, document_id, chunk_index, chunk_text, token_estimate, content_hash, privacy_level, index_status, metadata_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'indexed', CAST(? AS JSON))`,
      [
        chunkId,
        documentId,
        index,
        chunk.text,
        Math.max(1, Math.ceil(chunk.text.length / 3)),
        chunkHash,
        args.privacyLevel,
        JSON.stringify({
          sourceId: args.sourceId,
          title: args.title,
          copyrightMode: args.copyrightMode,
          locator: chunk.locator,
          chapter: chunk.chapter,
          section: chunk.section,
          startLine: chunk.startLine,
          endLine: chunk.endLine,
        }),
      ]
    );
  }
  return documentId;
}

async function ensureSemanticTables(connection) {
  await connection.query(`
    CREATE TABLE IF NOT EXISTS semantic_units (
      id VARCHAR(128) NOT NULL,
      source_id VARCHAR(128) NULL,
      source_title VARCHAR(255) NOT NULL,
      source_author VARCHAR(255) NULL,
      source_locator VARCHAR(255) NULL,
      excerpt TEXT NOT NULL,
      summary TEXT NULL,
      status ENUM('candidate','active','retired') NOT NULL DEFAULT 'candidate',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_semantic_units_source (source_id),
      KEY idx_semantic_units_status (status),
      FULLTEXT KEY ft_semantic_units_text (source_title, excerpt, summary)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await connection.query(`
    CREATE TABLE IF NOT EXISTS semantic_tag_taxonomy (
      id VARCHAR(128) NOT NULL,
      tag_layer ENUM('image','concept','civilization','emotion','narrative_function','style','usable_for','narrative_position') NOT NULL,
      tag_value VARCHAR(255) NOT NULL,
      description TEXT NULL,
      status ENUM('candidate','active','retired') NOT NULL DEFAULT 'candidate',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_semantic_tag_layer_value (tag_layer, tag_value),
      KEY idx_semantic_tag_layer (tag_layer),
      KEY idx_semantic_tag_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await connection.query(`
    CREATE TABLE IF NOT EXISTS semantic_unit_tags (
      unit_id VARCHAR(128) NOT NULL,
      tag_id VARCHAR(128) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (unit_id, tag_id),
      KEY idx_semantic_unit_tags_tag (tag_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

async function upsertSemanticSamples(connection, args, samples) {
  // semantic_units 只放可复用材料卡，不替代全文；全文仍在 literature/search_chunks 中可追溯。
  for (const sample of samples) {
    const unitId = stableId("sem_ref", `${args.sourceId}|${sample.classification}|${sample.locator}|${sample.startLine}`, 24);
    await connection.execute(
      `INSERT INTO semantic_units
        (id, source_id, source_title, source_author, source_locator, excerpt, summary, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'active')
       ON DUPLICATE KEY UPDATE
        source_id = VALUES(source_id),
        source_title = VALUES(source_title),
        source_author = VALUES(source_author),
        source_locator = VALUES(source_locator),
        excerpt = VALUES(excerpt),
        summary = VALUES(summary),
        status = VALUES(status),
        updated_at = CURRENT_TIMESTAMP`,
      [
        unitId,
        args.sourceId,
        args.title,
        args.author,
        sample.locator,
        sample.excerpt,
        sample.summary,
      ]
    );

    for (const tag of sample.tags) {
      const tagId = stableId("tag", `${tag.layer}|${tag.value}`, 24);
      await connection.execute(
        `INSERT INTO semantic_tag_taxonomy
          (id, tag_layer, tag_value, description, status)
         VALUES (?, ?, ?, ?, 'active')
         ON DUPLICATE KEY UPDATE
          description = COALESCE(VALUES(description), description),
          status = 'active',
          updated_at = CURRENT_TIMESTAMP`,
        [tagId, tag.layer, tag.value, tag.description ?? null]
      );
      await connection.execute(
        "INSERT IGNORE INTO semantic_unit_tags (unit_id, tag_id) VALUES (?, ?)",
        [unitId, tagId]
      );
    }
  }
}

async function insertIndexJob(connection, args, chunks, semanticSamples) {
  const jobId = `local-book-corpus-${new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14)}`;
  await connection.execute(
    `INSERT INTO search_index_jobs (id, target, mode, status, item_limit, metadata_json, completed_at)
     VALUES (?, 'local-book-corpus', 'apply', 'completed', ?, CAST(? AS JSON), CURRENT_TIMESTAMP)
     ON DUPLICATE KEY UPDATE
      status = VALUES(status),
      item_limit = VALUES(item_limit),
      metadata_json = VALUES(metadata_json),
      completed_at = VALUES(completed_at)`,
    [
      jobId,
      chunks.length,
      JSON.stringify({
        sourceId: args.sourceId,
        title: args.title,
        chunks: chunks.length,
        semanticSamples: semanticSamples.length,
        chunkChars: args.chunkChars,
      }),
    ]
  );
  return jobId;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  args.sourceMd = typeof args.sourceMd === "string" && args.sourceMd.trim() ? resolve(args.sourceMd) : "";
  args.sourceEpub = typeof args.sourceEpub === "string" && args.sourceEpub.trim() ? resolve(args.sourceEpub) : "";
  const sourceFormat = args.sourceFormat === "auto"
    ? /\.epub$/i.test(args.sourceMd || args.sourceEpub) ? "epub" : "markdown"
    : args.sourceFormat;
  args.sourceFormat = sourceFormat;
  if (
    sourceFormat === "epub"
    && args.sourceEpub
    && args.sourceMd === resolve(DEFAULT_MD_PATH)
    && args.sourceEpub !== resolve(DEFAULT_EPUB_PATH)
  ) {
    args.sourceMd = "";
  }

  const raw = sourceFormat === "epub"
    ? await readFile(args.sourceEpub || args.sourceMd)
    : await readFile(args.sourceMd, "utf8");
  const sourceHash = sha256(Buffer.isBuffer(raw) ? raw.toString("base64") : raw);
  const parsed = sourceFormat === "epub"
    ? parseEpub(raw)
    : cleanMarkdown(raw);
  const cleaned = args.copyrightMode === "restricted-style-reference"
    ? buildRestrictedStyleCorpus(parsed)
    : parsed;
  const chunks = chunkSections(cleaned.sections, args.chunkChars);
  const semanticSamples = args.copyrightMode === "restricted-style-reference"
    ? buildRestrictedStyleSemanticSamples(cleaned.sections, args.semanticSamples)
    : buildSemanticSamples(cleaned.sections, args.semanticSamples);

  const report = {
    mode: args.apply ? "apply" : "dry-run",
    sourceId: args.sourceId,
    title: args.title,
    sourceMd: args.sourceMd,
    sourceEpub: args.sourceEpub,
    sourceFormat,
    copyrightMode: args.copyrightMode,
    sourceHash,
    rawBytes: Buffer.isBuffer(raw) ? raw.length : Buffer.byteLength(raw, "utf8"),
    cleanBytes: Buffer.byteLength(cleaned.text, "utf8"),
    paragraphs: cleaned.sections.length,
    chunks: chunks.length,
    semanticSamples: semanticSamples.length,
    sampleLocators: chunks.slice(0, 8).map((chunk) => ({
      locator: chunk.locator,
      chars: chunk.text.length,
      startLine: chunk.startLine,
      endLine: chunk.endLine,
    })),
  };

  if (!args.apply) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  const pool = await mysql.createPool(await readMysqlConfig());
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await ensureSearchTables(connection);
    await ensureSemanticTables(connection);
    const literature = await upsertLiterature(connection, args, cleaned.text, sourceHash);
    const documentId = await upsertSearchProjection(connection, args, chunks, sourceHash);
    await upsertSemanticSamples(connection, args, semanticSamples);
    const jobId = await insertIndexJob(connection, args, chunks, semanticSamples);
    await connection.commit();
    console.log(JSON.stringify({
      ...report,
      literature,
      searchDocumentId: documentId,
      jobId,
    }, null, 2));
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
