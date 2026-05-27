import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join } from "node:path";
import process from "node:process";

const SOURCE_PATH = process.env.NEW_LANDLORD_SOURCE_PATH
  || "E:/Vaults/Obsidian/docs/blog/视频文案/新地主阶级事件与理论资料聚合.md";

const BASE_URL = process.env.DATABASE_GATEWAY_URL || "http://127.0.0.1:18090";
const API_KEY = process.env.DATABASE_GATEWAY_API_KEY || "";

const SOURCE_LABEL = "new-landlord-aggregate";

function headers() {
  const result = {
    "Content-Type": "application/json"
  };
  if (API_KEY) {
    result["X-DataBase-Api-Key"] = API_KEY;
  }
  return result;
}

function stableId(parts) {
  return parts
    .map((part) => String(part).trim())
    .filter(Boolean)
    .join("|");
}

function materialUnitId(materialKind, title) {
  const raw = `${SOURCE_LABEL}|${materialKind}|${title}`;
  const normalized = raw
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/gi, "_")
    .replace(/^_+|_+$/g, "");
  return `sem_${normalized.slice(0, 96)}`;
}

function idempotencyKey(materialKind, title, index) {
  return createHash("sha256")
    .update(`${SOURCE_LABEL}|${index}|${materialKind}|${title}`)
    .digest("hex")
    .slice(0, 48);
}

function chunkParagraphs(block) {
  return block
    .split(/\n{2,}/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function classifySection(sectionTitle) {
  if (/理论材料库|理论和事件的对应表|马克思主义|韦伯|米歇尔斯|德热拉斯|托洛茨基|布迪厄|柯林斯|米尔斯|寻租理论|监管俘获|社会闭合|有限准入秩序/i.test(sectionTitle)) {
    return "theory";
  }
  if (/事件材料|协和|北极鲇鱼|周劼|严书记女儿|我爸是李刚|黄杨/i.test(sectionTitle)) {
    return "document";
  }
  if (/可用结构|开篇入口|主体推进|收束意象|事实边界/i.test(sectionTitle)) {
    return "comparison";
  }
  return "observer";
}

function extractSections(text) {
  const lines = text.split(/\r?\n/);
  const sections = [];
  let current = null;

  for (const line of lines) {
    const heading = line.match(/^###\s+(.*)$/);
    if (heading) {
      if (current) sections.push(current);
      current = {
        title: heading[1].trim(),
        lines: []
      };
      continue;
    }
    if (current) {
      current.lines.push(line);
    }
  }

  if (current) sections.push(current);
  return sections;
}

function buildUnits(text) {
  const sections = extractSections(text);
  const units = [];

  for (const section of sections) {
    const materialKind = classifySection(section.title);
    const body = section.lines.join("\n").trim();
    const paragraphs = chunkParagraphs(body);

    if (paragraphs.length === 0) {
      continue;
    }

    const firstParagraph = paragraphs[0];
    const unitTitle = section.title;
    const excerpt = firstParagraph.length > 500 ? `${firstParagraph.slice(0, 497)}…` : firstParagraph;
    const summary = `${section.title}：${firstParagraph.slice(0, 120)}`;
    const tags = [
      { layer: "concept", value: unitTitle.replace(/^【.*?】/, "").slice(0, 80) },
      { layer: "narrative_function", value: "资料聚合" },
      { layer: "usable_for", value: `reference:${materialKind}` },
      { layer: "narrative_position", value: "transition" }
    ];

    units.push({
      unitId: materialUnitId(materialKind, unitTitle),
      sourceTitle: unitTitle,
      sourceAuthor: "operator",
      sourceLocator: `Obsidian:${section.title}`,
      excerpt,
      summary,
      materialKind,
      status: "active",
      tags
    });
  }

  return units;
}

async function writeSemanticMaterial(unit, index) {
  const response = await fetch(`${BASE_URL}/writes/record-semantic-reference-material`, {
    method: "POST",
    headers: {
      ...headers(),
      "X-DataBase-Idempotency-Key": idempotencyKey(unit.materialKind, unit.sourceTitle, index)
    },
    body: JSON.stringify({
      requestId: `import-new-landlord-${index}`,
      actor: "operator",
      payload: unit
    })
  });

  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }

  if (!response.ok) {
    throw new Error(`write failed for ${unit.sourceTitle}: ${response.status} ${text}`);
  }

  return body;
}

async function main() {
  const text = await readFile(SOURCE_PATH, "utf8");
  const units = buildUnits(text);
  const results = [];

  for (let index = 0; index < units.length; index += 1) {
    const unit = units[index];
    const body = await writeSemanticMaterial(unit, index);
    results.push({
      title: unit.sourceTitle,
      kind: unit.materialKind,
      unitId: body?.item?.unitId || unit.unitId
    });
  }

  console.log(JSON.stringify({
    sourcePath: SOURCE_PATH,
    count: results.length,
    results
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
