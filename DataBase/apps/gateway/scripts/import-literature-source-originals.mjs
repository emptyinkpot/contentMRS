import { readFile } from "node:fs/promises";
import { join } from "node:path";
import process from "node:process";
import mysql from "mysql2/promise";

const SOURCES = [
  {
    title: "The Prince",
    author: "Niccolo Machiavelli",
    category: "theory-original",
    source: "https://www.gutenberg.org/ebooks/1232.txt.utf-8",
    format: "text",
    tags: ["power-politics", "statecraft", "virtue-fortune", "elite-rule"],
    note: "Project Gutenberg public-domain source. Use as a comparative theory anchor for power, necessity, force, and rule.",
    priority: 92,
  },
  {
    title: "On War",
    author: "Carl von Clausewitz",
    category: "theory-original",
    source: "https://www.gutenberg.org/ebooks/1946.txt.utf-8",
    format: "text",
    tags: ["war", "politics", "strategy", "friction"],
    note: "Project Gutenberg public-domain source. Use for war as political instrument, friction, uncertainty, and decision under pressure.",
    priority: 94,
  },
  {
    title: "The Crowd: A Study of the Popular Mind",
    author: "Gustave Le Bon",
    category: "theory-original",
    source: "https://www.gutenberg.org/ebooks/445.txt.utf-8",
    format: "text",
    tags: ["crowd-psychology", "mass-politics", "suggestion", "myth"],
    note: "Project Gutenberg public-domain source. Use for mass psychology, collective imagination, contagion, and leadership.",
    priority: 90,
  },
  {
    title: "Leviathan",
    author: "Thomas Hobbes",
    category: "theory-original",
    source: "https://www.gutenberg.org/ebooks/3207.txt.utf-8",
    format: "text",
    tags: ["sovereignty", "security", "state", "fear"],
    note: "Project Gutenberg public-domain source. Use for fear, sovereignty, security, and the artificial person of the state.",
    priority: 90,
  },
  {
    title: "History of the Peloponnesian War",
    author: "Thucydides",
    category: "historical-theory-original",
    source: "https://www.gutenberg.org/ebooks/7142.txt.utf-8",
    format: "text",
    tags: ["realism", "empire", "war", "necessity", "fear-honor-interest"],
    note: "Project Gutenberg public-domain source. Use for power politics, fear, honor, interest, and imperial necessity.",
    priority: 91,
  },
  {
    title: "Civilization and Its Discontents",
    author: "Sigmund Freud",
    category: "theory-original",
    source: "https://www.gutenberg.org/ebooks/78221.txt.utf-8",
    format: "text",
    tags: ["civilization", "aggression", "repression", "modernity"],
    note: "Project Gutenberg public-domain source in the United States. Use for civilization, repression, aggression, and social unease.",
    priority: 84,
  },
  {
    title: "Nine-Power Treaty",
    author: "Washington Conference Powers",
    category: "historical-document-original",
    source: "https://courses.umass.edu/pols294p/documents.html/washington_treaty_1922.html",
    format: "html",
    tags: ["washington-system", "open-door", "china", "international-law"],
    note: "Public treaty text projection. Use for Washington-system obligations, China sovereignty, and open-door diplomatic language.",
    priority: 88,
  },
  {
    title: "Report of the Commission of Enquiry: Chapter VI, Manchukuo",
    author: "Victor Bulwer-Lytton; League of Nations Commission of Enquiry",
    category: "historical-document-original",
    source: "https://en.wikisource.org/wiki/Report_of_the_Commission_of_Enquiry/Chapter_6",
    format: "html",
    tags: ["lytton-report", "manchukuo", "league-of-nations", "kwantung-army"],
    note: "Wikisource transcription of the League of Nations report chapter on Manchukuo. Use for formation stages, self-government offices, Japanese advisers, and legitimacy disputes.",
    priority: 96,
  },
  {
    title: "Memorandum by the Secretary of State, January 7, 1932",
    author: "Henry L. Stimson",
    category: "historical-document-original",
    source: "https://history.state.gov/historicaldocuments/frus1932v03/d11",
    format: "html",
    tags: ["stimson-doctrine", "manchuria", "nonrecognition", "kellogg-pact"],
    note: "Office of the Historian FRUS document. Use for U.S. non-recognition logic and the legalistic limits of diplomatic response.",
    priority: 86,
  },
  {
    title: "Manchukuo Establishment Declaration newspaper metadata",
    author: "Kobe Shimbun",
    category: "historical-document-metadata",
    source: "https://da.lib.kobe-u.ac.jp/da/np/0100329523/",
    format: "metadata",
    tags: ["manchukuo", "declaration", "japanese-newspaper", "propaganda"],
    note: "Kobe University Library metadata for the March 2, 1932 Kobe Shimbun clipping containing the Manchukuo establishment declaration. Image reuse requires application, so full text is not imported.",
    priority: 78,
  },
];

function parseArgs(argv) {
  return {
    apply: argv.includes("--apply"),
  };
}

async function readMysqlConfig() {
  const cnfPath = process.env.MYBLOG_CNF
    || join(process.env.USERPROFILE || process.env.HOME || "", ".codex-secrets", "mysql", "myblog.cnf");
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

async function fetchSource(source) {
  if (source.format === "metadata") {
    return source.note;
  }
  const response = await fetch(source.source, {
    headers: {
      "User-Agent": "ContentBase literature importer; contact local operator",
    },
  });
  if (!response.ok) {
    throw new Error(`fetch failed ${response.status} ${source.source}`);
  }
  const text = await response.text();
  return source.format === "html" ? htmlToText(text) : normalizeText(text);
}

function htmlToText(html) {
  return normalizeText(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<\/(p|div|h[1-6]|li|tr|br|section|article)>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, "\"")
      .replace(/&#39;/g, "'")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
  );
}

function normalizeText(text) {
  return String(text || "")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function upsertLiterature(pool, source, content) {
  const [existing] = await pool.execute(
    "SELECT id FROM literature WHERE title = ? AND (author <=> ?) ORDER BY id DESC LIMIT 1",
    [source.title, source.author]
  );
  const values = [
    source.title,
    source.author,
    source.category,
    content,
    source.source,
    JSON.stringify(source.tags),
    source.note,
    source.priority,
  ];
  if (existing.length > 0) {
    const id = existing[0].id;
    await pool.execute(
      `UPDATE literature
       SET title = ?, author = ?, category = ?, content = ?, source = ?, tags = CAST(? AS JSON), note = ?, priority = ?
       WHERE id = ?`,
      [...values, id]
    );
    return { action: "updated", id };
  }
  const [result] = await pool.execute(
    `INSERT INTO literature (title, author, category, content, source, tags, note, priority)
     VALUES (?, ?, ?, ?, ?, CAST(? AS JSON), ?, ?)`,
    values
  );
  return { action: "inserted", id: result.insertId };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const results = [];
  const pool = args.apply ? await mysql.createPool(await readMysqlConfig()) : null;
  try {
    for (const source of SOURCES) {
      const content = await fetchSource(source);
      if (!content) {
        throw new Error(`empty content for ${source.title}`);
      }
      const result = args.apply
        ? await upsertLiterature(pool, source, content)
        : { action: "dry-run", id: null };
      results.push({
        title: source.title,
        category: source.category,
        bytes: Buffer.byteLength(content, "utf8"),
        ...result,
      });
    }
  } finally {
    if (pool) await pool.end();
  }
  console.log(JSON.stringify({ apply: args.apply, count: results.length, results }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
