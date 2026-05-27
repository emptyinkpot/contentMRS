#!/usr/bin/env node
/**
 * Copy canonical Gateway configs into ContentBase novel config.
 *
 * Usage:
 *   node apps/gateway/scripts/sync-topic-corpus.mjs
 *   node apps/gateway/scripts/sync-topic-corpus.mjs --check
 */
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const gatewayRoot = path.resolve(scriptDir, "..");
const pairs = [
  {
    sourcePath: path.join(gatewayRoot, "config", "topic-corpus.json"),
    targetPath: path.resolve(gatewayRoot, "../../../ContentBase/product/novel/config/topic-corpus.json"),
    label: "DataBase/apps/gateway/config/topic-corpus.json",
  },
  {
    sourcePath: path.join(gatewayRoot, "config", "category-register.json"),
    targetPath: path.resolve(gatewayRoot, "../../../ContentBase/product/novel/config/category-register.json"),
    label: "DataBase/apps/gateway/config/category-register.json",
  },
];

const checkOnly = process.argv.includes("--check");

function sha256Text(text) {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

function stripSyncMetadata(parsed) {
  const clone = { ...parsed };
  delete clone._sync;
  return clone;
}

function buildSyncedDocument(sourcePath, label) {
  const parsed = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
  return {
    ...parsed,
    _sync: {
      source: label,
      note: "Edit the Gateway config only; run sync-topic-corpus.mjs to refresh ContentBase copies.",
      syncedAt: new Date().toISOString(),
    },
  };
}

function main() {
  for (const pair of pairs) {
    if (!fs.existsSync(pair.sourcePath)) {
      console.error(JSON.stringify({ ok: false, error: "source_missing", ...pair }, null, 2));
      process.exit(1);
    }
    if (!checkOnly && !fs.existsSync(path.dirname(pair.targetPath))) {
      console.error(JSON.stringify({ ok: false, error: "target_dir_missing", ...pair }, null, 2));
      process.exit(1);
    }
  }

  if (checkOnly) {
    const results = pairs.map((pair) => {
      const sourceHash = sha256Text(
        `${JSON.stringify(JSON.parse(fs.readFileSync(pair.sourcePath, "utf8")), null, 2)}\n`,
      );
      if (!fs.existsSync(pair.targetPath)) {
        return { ...pair, match: false, reason: "target_missing" };
      }
      const targetHash = sha256Text(
        `${JSON.stringify(stripSyncMetadata(JSON.parse(fs.readFileSync(pair.targetPath, "utf8"))), null, 2)}\n`,
      );
      return { ...pair, match: sourceHash === targetHash, sourceHash, targetHash };
    });
    const ok = results.every((item) => item.match);
    console.log(JSON.stringify({ ok, checkOnly: true, results }, null, 2));
    process.exit(ok ? 0 : 1);
  }

  const written = [];
  for (const pair of pairs) {
    const body = `${JSON.stringify(buildSyncedDocument(pair.sourcePath, pair.label), null, 2)}\n`;
    fs.mkdirSync(path.dirname(pair.targetPath), { recursive: true });
    fs.writeFileSync(pair.targetPath, body, "utf8");
    written.push({ targetPath: pair.targetPath, sha256: sha256Text(body) });
  }
  console.log(JSON.stringify({ ok: true, written }, null, 2));
}

main();
