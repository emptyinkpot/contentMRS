import { readFile, stat } from "node:fs/promises";
import { extname, resolve, dirname } from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import process from "node:process";
import AdmZip from "adm-zip";
import mysql from "mysql2/promise";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MANIFEST = JSON.parse(await readFile(resolve(__dirname, "import-manifest.json"), "utf8"));

async function main() {
  const apply = process.argv.includes("--apply");
  const epubOnly = process.argv.includes("--epub-only");
  const mysqlConfig = await readMysqlConfig();
  const pool = mysql.createPool({ ...mysqlConfig, waitForConnections: true, connectionLimit: 2 });

  const items = epubOnly ? MANIFEST.filter(i => /\.epub$/i.test(i.path)) : MANIFEST;
  console.log(`[batch-import] ${items.length} files to process. apply=${apply} epubOnly=${epubOnly}`);
  console.log();

  let successCount = 0;
  let skipCount = 0;
  let failCount = 0;

  for (const item of items) {
    const ext = extname(item.path).toLowerCase();
    const shortName = item.title.slice(0, 40);

    try {
      const fileStat = await stat(item.path).catch(() => null);
      if (!fileStat) {
        console.log(`  SKIP  ${shortName} — file not found`);
        skipCount++;
        continue;
      }

      console.log(`  READ  ${shortName} (${ext}, ${Math.round(fileStat.size / 1048576)}MB)...`);

      let text = "";
      if (ext === ".epub") {
        text = parseEpubToText(await readFile(item.path));
      } else if (ext === ".azw3" || ext === ".mobi" || ext === ".pdf") {
        text = convertWithMarkitdown(item.path);
      } else {
        console.log(`  SKIP  ${shortName} — unsupported format ${ext}`);
        skipCount++;
        continue;
      }

      if (!text || text.length < 100) {
        console.log(`  FAIL  ${shortName} — extracted text too short (${text.length} chars)`);
        failCount++;
        continue;
      }

      console.log(`  OK    ${shortName} — ${text.length} chars extracted`);

      if (apply) {
        await upsertLiterature(pool, {
          title: item.title,
          author: item.author,
          category: item.category,
          content: text,
          source: item.path,
        });
        console.log(`  WRITE ${shortName} — upserted into literature table`);
      }

      successCount++;
    } catch (err) {
      console.log(`  FAIL  ${shortName} — ${err.message}`);
      failCount++;
    }
  }

  console.log();
  console.log(`[batch-import] Done. success=${successCount} skip=${skipCount} fail=${failCount}`);
  if (!apply) {
    console.log(`[batch-import] Dry run. Use --apply to write to database.`);
  }

  await pool.end();
}

function parseEpubToText(buffer) {
  const zip = new AdmZip(buffer);
  const container = readZipText(zip, "META-INF/container.xml");
  const rootfile = container.match(/full-path=["']([^"']+)["']/i)?.[1];
  if (!rootfile) throw new Error("EPUB container.xml missing rootfile");

  const opf = readZipText(zip, rootfile);
  const opfBase = dirnamePosix(rootfile);

  const manifest = new Map();
  for (const match of opf.matchAll(/<item\b([^>]+)>/gi)) {
    const attrs = match[1];
    const id = attrs.match(/\bid=["']([^"']+)["']/i)?.[1];
    const href = attrs.match(/\bhref=["']([^"']+)["']/i)?.[1];
    const mediaType = attrs.match(/\bmedia-type=["']([^"']+)["']/i)?.[1] || "";
    if (id && href) manifest.set(id, { href: joinPosix(opfBase, decodeURIComponent(href)), mediaType });
  }

  const spineIds = Array.from(opf.matchAll(/<itemref\b([^>]+)>/gi))
    .map(m => m[1].match(/\bidref=["']([^"']+)["']/i)?.[1])
    .filter(Boolean);

  const parts = [];
  for (const id of spineIds) {
    const item = manifest.get(id);
    if (!item || !/(xhtml|html|xml)/i.test(item.mediaType || item.href)) continue;
    const raw = readZipText(zip, item.href);
    if (!raw) continue;
    const text = stripXmlText(raw);
    if (text && text.length > 20) parts.push(text);
  }
  return parts.join("\n\n").trim();
}

function convertWithMarkitdown(filePath) {
  const ext = extname(filePath).toLowerCase();
  const scriptDir = dirname(fileURLToPath(import.meta.url));
  if (ext === ".pdf") {
    const helper = resolve(scriptDir, "pdf2text.py");
    const result = execSync(`python "${helper}" "${filePath}"`, {
      encoding: "buffer",
      maxBuffer: 200 * 1024 * 1024,
      timeout: 300_000,
      windowsHide: true,
    });
    return result.toString("utf8").trim();
  }
  // MOBI/AZW3: try markitdown
  try {
    const result = execSync(`python -m markitdown "${filePath}"`, {
      encoding: "utf8",
      maxBuffer: 100 * 1024 * 1024,
      timeout: 180_000,
      windowsHide: true,
    });
    return result.trim();
  } catch (err) {
    throw new Error(`conversion failed for ${ext}: ${err.message?.slice(0, 100)}`);
  }
}

async function upsertLiterature(pool, { title, author, category, content, source }) {
  const [existing] = await pool.execute(
    "SELECT id FROM literature WHERE title = ? LIMIT 1",
    [title]
  );
  if (existing.length > 0) {
    await pool.execute(
      "UPDATE literature SET author = ?, category = ?, content = ?, source = ?, updated_at = NOW() WHERE id = ?",
      [author, category, content, source, existing[0].id]
    );
  } else {
    await pool.execute(
      "INSERT INTO literature (title, author, category, content, source, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())",
      [title, author, category, content, source]
    );
  }
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
  const named = { amp: "&", lt: "<", gt: ">", quot: "\"", apos: "'", nbsp: " " };
  return String(text || "").replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (match, entity) => {
    if (entity.startsWith("#x")) return String.fromCodePoint(Number.parseInt(entity.slice(2), 16));
    if (entity.startsWith("#")) return String.fromCodePoint(Number.parseInt(entity.slice(1), 10));
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

async function readMysqlConfig() {
  const cnfPath = resolve(process.env.USERPROFILE || process.env.HOME || "", ".codex-secrets", "mysql", "myblog.cnf");
  const content = await readFile(cnfPath, "utf8");
  const config = {};
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith(";") || trimmed.startsWith("[")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    config[trimmed.slice(0, index).trim()] = trimmed.slice(index + 1).trim().replace(/^["']|["']$/g, "");
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

main().catch(err => {
  console.error("[batch-import] Fatal:", err.message);
  process.exit(1);
});
