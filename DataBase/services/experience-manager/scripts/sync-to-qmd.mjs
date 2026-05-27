import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { closePools, getPool } from "../lib/db.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, "..");
const DATABASE_API_RESOURCE_PREFIX = "/api/database-api/resources";
const DEFAULT_DATABASE_API_ENDPOINT = process.env.EXPERIENCE_DATABASE_API_DEFAULT_ENDPOINT || "http://127.0.0.1:18090";
const DATABASE_API_TIMEOUT_MS = Number.parseInt(
  process.env.EXPERIENCE_DATABASE_API_TIMEOUT_MS || "15000",
  10
);
const DRY_RUN = process.argv.includes("--dry-run") || process.env.EXPERIENCE_QMD_SYNC_DRY_RUN === "true";
const SYNC_LIMIT = Number.parseInt(process.env.EXPERIENCE_QMD_SYNC_LIMIT || "0", 10);
const CONTROL_PLANE_ROOT = process.env.EXPERIENCE_CONTROL_PLANE_ROOT
  ? path.resolve(process.env.EXPERIENCE_CONTROL_PLANE_ROOT)
  : path.resolve(projectRoot, "..", "..");

const OUTPUT_ROOT = process.env.QMD_EXPERIENCE_COLLECTION_DIR
  ? path.resolve(process.env.QMD_EXPERIENCE_COLLECTION_DIR)
  : path.resolve(projectRoot, "..", "qmd-adapter", "collections", "experience-manager");
const DISTILLED_ROOT = path.join(OUTPUT_ROOT, "distilled");
const DISTILLED_CLUSTER_DIR = path.join(DISTILLED_ROOT, "clusters");
const DISTILLED_RULE_DIR = path.join(DISTILLED_ROOT, "rules");
const DISTILLED_ANTIPATTERN_DIR = path.join(DISTILLED_ROOT, "anti-patterns");
const DISTILLED_MANIFEST_PATH = path.join(DISTILLED_ROOT, "manifest.json");
let databaseApiEndpointsPromise = null;

const TOKEN_STOP_WORDS = new Set([
  "this",
  "that",
  "with",
  "from",
  "into",
  "about",
  "when",
  "then",
  "also",
  "have",
  "using",
  "should",
  "after",
  "before",
  "through",
  "their",
  "there",
  "would",
  "could",
  "still",
  "only",
  "just",
  "need",
  "keep",
  "make",
  "into",
  "进行中",
  "已验证",
  "当前",
  "本轮",
  "继续",
  "不要",
  "先",
  "然后",
  "已经",
  "问题",
  "经验",
  "记录",
  "系统",
  "任务",
  "处理",
  "验证",
  "修复",
  "使用",
  "需要",
  "通过",
  "以及",
  "当前状态",
]);

function slugify(value) {
  return String(value || "item")
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "item";
}

function safeJsonParse(value, fallback = {}) {
  if (value == null || value === "") return fallback;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function toArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      return value.split(/[\n,|/]+/).map(s => s.trim()).filter(Boolean);
    }
  }
  return [];
}

function toText(value) {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  return JSON.stringify(value, null, 2);
}

function sentenceSplit(value) {
  return String(value || "")
    .split(/[\r\n]+|(?<=[。！？!?;；])\s*/u)
    .map((item) => item.replace(/^[-*]\s*/, "").trim())
    .filter(Boolean);
}

function yamlList(items) {
  if (!items || items.length === 0) return "[]";
  return `[${items.map(item => JSON.stringify(String(item))).join(", ")}]`;
}

function yamlValue(value) {
  if (value == null || value === "") return '""';
  return JSON.stringify(String(value));
}

function frontmatter(lines) {
  return ["---", ...lines, "---"].join("\n");
}

function normalizeWords(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]+/gu, " ")
    .split(/\s+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item) => item.length >= 2)
    .filter((item) => !TOKEN_STOP_WORDS.has(item))
    .filter((item) => !/^\d+$/.test(item));
}

function ensureUnique(items) {
  return [...new Set(items.filter(Boolean))];
}

function tokenizeExperienceRow(row) {
  const source = safeJsonParse(row.source_text, {});
  const parts = [
    row.title,
    row.summary,
    row.description,
    row.user_query,
    row.solution,
    row.root_cause,
    ...toArray(row.tags_text),
    ...toArray(row.experience_applied),
    ...toArray(row.experience_gained),
    source?.project,
    source?.file,
  ];
  return ensureUnique(normalizeWords(parts.join(" ")));
}

function jaccardSimilarity(leftTokens, rightTokens) {
  const left = new Set(leftTokens);
  const right = new Set(rightTokens);
  if (left.size === 0 || right.size === 0) return 0;

  let intersection = 0;
  for (const token of left) {
    if (right.has(token)) intersection += 1;
  }

  const union = left.size + right.size - intersection;
  return union > 0 ? intersection / union : 0;
}

function toArrayFromField(row, field) {
  return toArray(row?.[field]);
}

function collectRuleCandidates(row) {
  return ensureUnique([
    ...toArrayFromField(row, "experience_gained"),
    ...toArrayFromField(row, "experience_applied"),
    ...toArrayFromField(row, "verification"),
  ].flatMap(sentenceSplit));
}

function collectAntiPatternCandidates(row) {
  const seed = [
    row.root_cause,
    row.description,
    row.user_query,
    ...toArrayFromField(row, "experience_applied"),
    ...toArrayFromField(row, "experience_gained"),
  ].flatMap(sentenceSplit);

  return ensureUnique(seed.filter((line) => (
    /不要|避免|别再|误判|误把|不要只|不要再|avoid|don'?t|do not|mis/i.test(line)
    || /先.+再/u.test(line)
  )));
}

function rankTextCandidates(candidates, minimumCount = 1, limit = 6) {
  const counts = new Map();
  const firstSeen = new Map();

  for (const candidate of candidates) {
    const text = String(candidate || "").trim();
    if (!text || text.length < 4) continue;
    const key = text.toLowerCase();
    counts.set(key, (counts.get(key) || 0) + 1);
    if (!firstSeen.has(key)) {
      firstSeen.set(key, text);
    }
  }

  return [...counts.entries()]
    .filter(([, count]) => count >= minimumCount)
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, limit)
    .map(([key, count]) => ({
      text: firstSeen.get(key) || key,
      count,
    }));
}

function summarizeClusterLabel(cluster) {
  const tagCounts = new Map();
  const tokenCounts = new Map();

  for (const item of cluster.members) {
    for (const tag of toArray(item.row.tags_text)) {
      const key = String(tag).trim();
      if (!key) continue;
      tagCounts.set(key, (tagCounts.get(key) || 0) + 1);
    }
    for (const token of item.tokens) {
      tokenCounts.set(token, (tokenCounts.get(token) || 0) + 1);
    }
  }

  const topTags = [...tagCounts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 3)
    .map(([tag]) => tag);

  if (topTags.length > 0) {
    return topTags.join("-");
  }

  const topTokens = [...tokenCounts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 3)
    .map(([token]) => token);

  return topTokens.length > 0 ? topTokens.join("-") : "general-pattern";
}

function buildExperienceClusters(rows) {
  const decorated = rows.map((row) => ({
    row,
    tokens: tokenizeExperienceRow(row),
  }));

  const clusters = [];
  const threshold = 0.22;

  for (const candidate of decorated) {
    let bestCluster = null;
    let bestScore = 0;

    for (const cluster of clusters) {
      let clusterScore = 0;
      for (const member of cluster.members) {
        const score = jaccardSimilarity(candidate.tokens, member.tokens);
        if (score > clusterScore) {
          clusterScore = score;
        }
      }
      if (clusterScore > bestScore) {
        bestScore = clusterScore;
        bestCluster = cluster;
      }
    }

    if (bestCluster && bestScore >= threshold) {
      bestCluster.members.push(candidate);
    } else {
      clusters.push({ members: [candidate] });
    }
  }

  return clusters
    .map((cluster) => ({
      label: summarizeClusterLabel(cluster),
      members: cluster.members.sort((left, right) => {
        const leftUpdated = new Date(left.row.updated_at || 0).getTime();
        const rightUpdated = new Date(right.row.updated_at || 0).getTime();
        return rightUpdated - leftUpdated;
      }),
    }))
    .filter((cluster) => cluster.members.length >= 2)
    .sort((left, right) => right.members.length - left.members.length || left.label.localeCompare(right.label))
    .map((cluster, index) => ({
      ...cluster,
      id: `cluster-${String(index + 1).padStart(2, "0")}`,
    }));
}

function clusterSummary(cluster) {
  const sourceProjects = ensureUnique(cluster.members.map((item) => {
    return safeJsonParse(item.row.source_text, {})?.project || "";
  }));
  const titles = cluster.members.slice(0, 3).map((item) => item.row.title || item.row.summary || item.row.id);
  const tagCounts = rankTextCandidates(cluster.members.flatMap((item) => toArray(item.row.tags_text)), 1, 4);

  const pieces = [
    `该簇聚合了 ${cluster.members.length} 条相近经验记录。`,
    tagCounts.length > 0 ? `高频标签：${tagCounts.map((item) => item.text).join("、")}。` : "",
    sourceProjects.length > 0 ? `涉及项目：${sourceProjects.join("、")}。` : "",
    titles.length > 0 ? `代表记录：${titles.join("；")}。` : "",
  ].filter(Boolean);

  return pieces.join("");
}

async function exportDistilledKnowledge(rows) {
  const clusters = buildExperienceClusters(rows);
  await mkdir(DISTILLED_CLUSTER_DIR, { recursive: true });
  await mkdir(DISTILLED_RULE_DIR, { recursive: true });
  await mkdir(DISTILLED_ANTIPATTERN_DIR, { recursive: true });
  await clearMarkdownFiles(DISTILLED_CLUSTER_DIR);
  await clearMarkdownFiles(DISTILLED_RULE_DIR);
  await clearMarkdownFiles(DISTILLED_ANTIPATTERN_DIR);

  let ruleCount = 0;
  let antiPatternCount = 0;

  for (const cluster of clusters) {
    const labelSlug = slugify(cluster.label);
    const clusterPath = path.join(DISTILLED_CLUSTER_DIR, `${cluster.id}-${labelSlug}.md`);
    const ruleCandidates = rankTextCandidates(
      cluster.members.flatMap((item) => collectRuleCandidates(item.row)),
      1,
      6
    );
    const antiPatternCandidates = rankTextCandidates(
      cluster.members.flatMap((item) => collectAntiPatternCandidates(item.row)),
      1,
      6
    );

    const clusterDoc = [
      frontmatter([
        `kind: "distilled-cluster"`,
        `cluster_id: ${yamlValue(cluster.id)}`,
        `label: ${yamlValue(cluster.label)}`,
        `member_count: ${cluster.members.length}`,
      ]),
      `# ${cluster.id} - ${cluster.label}`,
      "",
      "## Summary",
      clusterSummary(cluster),
      "",
      "## Stable Rules",
      ...(ruleCandidates.length > 0
        ? ruleCandidates.map((item) => `- ${item.text}（evidence=${item.count}）`)
        : ["- 暂无足够重复证据生成稳定规则"]),
      "",
      "## Anti-Patterns",
      ...(antiPatternCandidates.length > 0
        ? antiPatternCandidates.map((item) => `- ${item.text}（evidence=${item.count}）`)
        : ["- 暂无明确反模式信号"]),
      "",
      "## Member Records",
      ...cluster.members.map((item) => `- ${item.row.id} | ${item.row.title || item.row.summary || "Untitled"}`),
    ].join("\n");
    await writeFile(clusterPath, clusterDoc, "utf8");

    if (ruleCandidates.length > 0) {
      ruleCount += 1;
      const rulePath = path.join(DISTILLED_RULE_DIR, `${cluster.id}-${labelSlug}.md`);
      const ruleDoc = [
        frontmatter([
          `kind: "distilled-rule"`,
          `cluster_id: ${yamlValue(cluster.id)}`,
          `label: ${yamlValue(cluster.label)}`,
          `member_count: ${cluster.members.length}`,
        ]),
        `# Stable Rule - ${cluster.label}`,
        "",
        "## Rule Candidates",
        ...ruleCandidates.map((item) => `- ${item.text}（evidence=${item.count}）`),
        "",
        "## Backing Records",
        ...cluster.members.map((item) => `- ${item.row.id} | ${item.row.title || item.row.summary || "Untitled"}`),
      ].join("\n");
      await writeFile(rulePath, ruleDoc, "utf8");
    }

    if (antiPatternCandidates.length > 0) {
      antiPatternCount += 1;
      const antiPatternPath = path.join(DISTILLED_ANTIPATTERN_DIR, `${cluster.id}-${labelSlug}.md`);
      const antiPatternDoc = [
        frontmatter([
          `kind: "distilled-anti-pattern"`,
          `cluster_id: ${yamlValue(cluster.id)}`,
          `label: ${yamlValue(cluster.label)}`,
          `member_count: ${cluster.members.length}`,
        ]),
        `# Anti-Pattern - ${cluster.label}`,
        "",
        "## Avoid Repeating",
        ...antiPatternCandidates.map((item) => `- ${item.text}（evidence=${item.count}）`),
        "",
        "## Backing Records",
        ...cluster.members.map((item) => `- ${item.row.id} | ${item.row.title || item.row.summary || "Untitled"}`),
      ].join("\n");
      await writeFile(antiPatternPath, antiPatternDoc, "utf8");
    }
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    clusters: clusters.map((cluster) => ({
      id: cluster.id,
      label: cluster.label,
      memberCount: cluster.members.length,
      recordIds: cluster.members.map((item) => item.row.id),
    })),
    clusterCount: clusters.length,
    ruleCount,
    antiPatternCount,
  };
  await writeFile(DISTILLED_MANIFEST_PATH, JSON.stringify(manifest, null, 2), "utf8");
  return manifest;
}

async function readJsonFileIfExists(filePath) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch {
    return null;
  }
}

function normalizeDatabaseApiEndpoint(raw) {
  const text = String(raw || "").trim();
  if (!text) return null;
  const withoutTrailingSlash = text.replace(/\/+$/, "");
  const resourceIndex = withoutTrailingSlash.indexOf(DATABASE_API_RESOURCE_PREFIX);
  if (resourceIndex >= 0) {
    return withoutTrailingSlash.slice(0, resourceIndex) || null;
  }
  const apiIndex = withoutTrailingSlash.indexOf("/api/database-api");
  if (apiIndex >= 0) {
    return withoutTrailingSlash.slice(0, apiIndex) || null;
  }
  return withoutTrailingSlash;
}

function addEndpointCandidate(candidates, raw) {
  const endpoint = normalizeDatabaseApiEndpoint(raw);
  if (endpoint) {
    candidates.add(endpoint);
  }
}

function addUrlOriginCandidate(candidates, raw) {
  const endpoint = normalizeDatabaseApiEndpoint(raw);
  if (!endpoint) return;
  try {
    const url = new URL(endpoint);
    candidates.add(`${url.protocol}//${url.host}`);
  } catch {
    candidates.add(endpoint);
  }
}

async function resolveDatabaseApiEndpoints() {
  if (!databaseApiEndpointsPromise) {
    databaseApiEndpointsPromise = (async () => {
      const candidates = new Set();
      addEndpointCandidate(candidates, process.env.EXPERIENCE_DATABASE_API_ENDPOINT);
      addEndpointCandidate(candidates, process.env.OPENCLAW_DATABASE_API_ENDPOINT);

      const deployTargets = await readJsonFileIfExists(
        path.join(CONTROL_PLANE_ROOT, "policy", "deploy-targets.json")
      );
      const primaryTarget = Array.isArray(deployTargets?.targets)
        ? deployTargets.targets.find((target) => target?.enabled !== false) || deployTargets.targets[0]
        : null;
      addUrlOriginCandidate(candidates, primaryTarget?.health?.localUrl);
      addEndpointCandidate(candidates, DEFAULT_DATABASE_API_ENDPOINT);
      addUrlOriginCandidate(candidates, primaryTarget?.health?.publicBaseUrl);
      addUrlOriginCandidate(candidates, primaryTarget?.health?.publicDirectUrl);
      addUrlOriginCandidate(candidates, primaryTarget?.health?.publicUrl);

      const serverRegistry = await readJsonFileIfExists(
        path.join(CONTROL_PLANE_ROOT, "registry", "servers.json")
      );
      const primaryServer = Array.isArray(serverRegistry?.servers)
        ? serverRegistry.servers.find((server) => Array.isArray(server?.roles) && server.roles.includes("console"))
          || serverRegistry.servers.find((server) => server?.enabled !== false)
          || serverRegistry.servers[0]
        : null;
      addUrlOriginCandidate(candidates, primaryServer?.health?.localConsoleSummary);
      addUrlOriginCandidate(candidates, primaryServer?.health?.publicConsoleRoot);
      addUrlOriginCandidate(candidates, primaryServer?.health?.publicConsoleSummaryDirect);
      addUrlOriginCandidate(candidates, primaryServer?.health?.publicConsoleSummary);

      return [...candidates];
    })();
  }

  return databaseApiEndpointsPromise;
}

function buildDatabaseApiUrl(endpoint, pathname) {
  const cleanEndpoint = endpoint.replace(/\/+$/, "");
  const cleanPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${cleanEndpoint}${cleanPath}`;
}

async function requestDatabaseApiJson(pathname) {
  const endpoints = await resolveDatabaseApiEndpoints();
  const failures = [];

  for (const endpoint of endpoints) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DATABASE_API_TIMEOUT_MS);
    try {
      const response = await fetch(buildDatabaseApiUrl(endpoint, pathname), {
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "X-OpenClaw-Source": "experience-manager-mirror-sync",
        },
      });

      const text = await response.text().catch(() => "");
      let parsed = null;
      if (text) {
        try {
          parsed = JSON.parse(text);
        } catch {
          parsed = null;
        }
      }

      if (!response.ok) {
        const bodySnippet = text.trim() ? ` body=${JSON.stringify(text.trim().slice(0, 160))}` : "";
        failures.push(
          typeof parsed?.error === "string"
            ? `${endpoint}: ${parsed.error}`
            : `${endpoint}: HTTP ${response.status}${bodySnippet}`
        );
        continue;
      }

      if (!parsed || typeof parsed !== "object") {
        const bodySnippet = text.trim() ? ` body=${JSON.stringify(text.trim().slice(0, 160))}` : "";
        failures.push(`${endpoint}: expected JSON response${bodySnippet}`);
        continue;
      }

      return parsed;
    } catch (error) {
      failures.push(
        `${endpoint}: ${error instanceof Error ? error.message : String(error)}`
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new Error(
    failures.length > 0
      ? failures.join(" | ")
      : `database-api request failed for ${pathname}`
  );
}

async function loadAllRows(resource) {
  try {
    return await loadAllRowsFromDatabaseApi(resource);
  } catch (error) {
    if (process.env.EXPERIENCE_QMD_SYNC_DISABLE_DB_FALLBACK === "true") {
      throw error;
    }
    console.warn(`[sync-to-qmd] database-api unavailable for ${resource}; falling back to direct MySQL read: ${error?.message || error}`);
    return await loadAllRowsFromMysql(resource);
  }
}

async function loadAllRowsFromDatabaseApi(resource) {
  const items = [];
  const limit = 200;
  let offset = 0;

  while (true) {
    const response = await requestDatabaseApiJson(
      `${DATABASE_API_RESOURCE_PREFIX}/${encodeURIComponent(resource)}?limit=${limit}&offset=${offset}`
    );
    const pageItems = Array.isArray(response?.data?.items) ? response.data.items : [];
    items.push(...pageItems);
    const total = Number(response?.data?.total ?? items.length);
    offset += pageItems.length;
    if (SYNC_LIMIT > 0 && items.length >= SYNC_LIMIT) {
      return items.slice(0, SYNC_LIMIT);
    }
    if (pageItems.length < limit || offset >= total) {
      break;
    }
  }

  return SYNC_LIMIT > 0 ? items.slice(0, SYNC_LIMIT) : items;
}

async function loadAllRowsFromMysql(resource) {
  const allowed = new Set(["experience_records_cloud", "experience_notes_cloud"]);
  if (!allowed.has(resource)) {
    throw new Error(`Unsupported direct MySQL resource: ${resource}`);
  }

  const limitClause = SYNC_LIMIT > 0 ? ` LIMIT ${SYNC_LIMIT}` : "";
  const orderBy = resource === "experience_records_cloud"
    ? " ORDER BY updated_at DESC, timestamp DESC"
    : " ORDER BY updated_at DESC, created_at DESC";
  const pool = await getPool();
  const [rows] = await pool.query(`SELECT * FROM ${resource}${orderBy}${limitClause}`);
  return rows;
}

function sortExperiences(rows) {
  return [...rows].sort((a, b) => {
    const aUpdated = new Date(a.updated_at || 0).getTime();
    const bUpdated = new Date(b.updated_at || 0).getTime();
    if (bUpdated !== aUpdated) return bUpdated - aUpdated;
    return Number(b.timestamp || 0) - Number(a.timestamp || 0);
  });
}

function sortNotes(rows) {
  return [...rows].sort((a, b) => {
    const aUpdated = new Date(a.updated_at || a.created_at || 0).getTime();
    const bUpdated = new Date(b.updated_at || b.created_at || 0).getTime();
    return bUpdated - aUpdated;
  });
}

async function exportExperiencesFromRows(rows) {
  if (DRY_RUN) {
    return rows.length;
  }

  const experienceDir = path.join(OUTPUT_ROOT, "experiences");
  await mkdir(experienceDir, { recursive: true });
  await clearMarkdownFiles(experienceDir);

  for (const row of rows) {
    const title = row.title || "Untitled";
    const date = new Date(Number(row.timestamp) || Date.now()).toISOString().slice(0, 10);
    const fileName = `${date}-${slugify(title)}-${row.id}.md`;
    const filePath = path.join(experienceDir, fileName);
    const applied = toArray(row.experience_applied);
    const gained = toArray(row.experience_gained);
    const tags = toArray(row.tags_text);
    const verification = toArray(row.verification);
    const source = safeJsonParse(row.source_text, {});

    const body = [
      frontmatter([
        `id: ${yamlValue(row.id)}`,
        `title: ${yamlValue(title)}`,
        `type: ${yamlValue(row.type)}`,
        `date: ${yamlValue(new Date(Number(row.timestamp) || Date.now()).toISOString())}`,
        `updated_at: ${yamlValue(row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString())}`,
        `difficulty: ${Number(row.difficulty) || 1}`,
        `xp_gained: ${Number(row.xp_gained) || 0}`,
        `tags: ${yamlList(tags)}`,
        `source_project: ${yamlValue(source?.project || "")}`,
        `source_file: ${yamlValue(source?.file || "")}`,
      ]),
      `# ${title}`,
      "",
      "## Summary",
      toText(row.summary || row.description || title),
      "",
      "## Problem",
      toText(row.user_query || ""),
      "",
      "## Solution",
      toText(row.solution || ""),
      "",
      "## Applied",
      ...(applied.length ? applied.map(item => `- ${item}`) : ["-"]),
      "",
      "## Gained",
      ...(gained.length ? gained.map(item => `- ${item}`) : ["-"]),
      "",
      "## Verification",
      ...(verification.length ? verification.map(item => `- ${item}`) : ["-"]),
      "",
      "## Source",
      `- project: ${source?.project || ""}`,
      `- branch: ${source?.branch || ""}`,
      `- file: ${source?.file || ""}`,
      `- url: ${source?.url || ""}`,
    ].join("\n");

    await writeFile(filePath, body, "utf8");
  }

  return rows.length;
}

async function exportNotes() {
  const rows = sortNotes(await loadAllRows("experience_notes_cloud"));

  if (DRY_RUN) {
    return rows.length;
  }

  const notesDir = path.join(OUTPUT_ROOT, "notes");
  await mkdir(notesDir, { recursive: true });
  await clearMarkdownFiles(notesDir);

  for (const row of rows) {
    const title = row.title || "Untitled";
    const date = row.created_at ? new Date(row.created_at).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
    const fileName = `${date}-${slugify(title)}-${row.id}.md`;
    const filePath = path.join(notesDir, fileName);
    const tags = toArray(row.tags_text);
    const related = toArray(row.related_experience_ids);
    const sections = safeJsonParse(row.sections_text, {});

    const body = [
      frontmatter([
        `id: ${yamlValue(row.id)}`,
        `title: ${yamlValue(title)}`,
        `category: ${yamlValue(row.category)}`,
        `created_at: ${yamlValue(row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString())}`,
        `updated_at: ${yamlValue(row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString())}`,
        `tags: ${yamlList(tags)}`,
        `related_experience_ids: ${yamlList(related)}`,
      ]),
      `# ${title}`,
      "",
      "## Summary",
      toText(row.summary || title),
      "",
      "## Content",
      toText(row.content || ""),
      "",
      "## Sections",
      ...(Object.keys(sections).length
        ? Object.entries(sections).flatMap(([key, value]) => ["", `### ${key}`, toText(value)])
        : ["-"]),
    ].join("\n");

    await writeFile(filePath, body, "utf8");
  }

  return rows.length;
}

async function writeIndex(experienceCount, noteCount, distilledManifest) {
  if (DRY_RUN) {
    return;
  }

  await mkdir(OUTPUT_ROOT, { recursive: true });
  const readme = [
    "# Experience Manager Mirror",
    "",
    "This collection mirrors shared experience records from the cloud-backed experience manager.",
    "",
    `- Experience records: ${experienceCount}`,
    `- Notes: ${noteCount}`,
    `- Distilled clusters: ${Number(distilledManifest?.clusterCount || 0)}`,
    `- Stable rule docs: ${Number(distilledManifest?.ruleCount || 0)}`,
    `- Anti-pattern docs: ${Number(distilledManifest?.antiPatternCount || 0)}`,
    "",
    "Refresh it with `npm run sync:qmd` from the experience-manager plugin folder.",
  ].join("\n");
  await writeFile(path.join(OUTPUT_ROOT, "README.md"), readme, "utf8");
}

async function clearMarkdownFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
    await rm(path.join(directory, entry.name), { force: true });
  }
}

async function main() {
  const rows = sortExperiences(await loadAllRows("experience_records_cloud"));
  const experienceCount = await exportExperiencesFromRows(rows);
  const noteCount = await exportNotes();
  const distilledManifest = DRY_RUN
    ? { clusterCount: 0, ruleCount: 0, antiPatternCount: 0 }
    : await exportDistilledKnowledge(rows);
  await writeIndex(experienceCount, noteCount, distilledManifest);
  const mode = DRY_RUN ? "Dry-run checked" : "Exported";
  console.log(`${mode} ${experienceCount} experiences, ${noteCount} notes, ${distilledManifest.clusterCount} clusters to ${OUTPUT_ROOT}`);
}

main().catch((error) => {
  console.error("[sync-to-qmd] fatal error:", error);
  process.exitCode = 1;
}).finally(async () => {
  await closePools();
});
