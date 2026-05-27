import { copyFile, readdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const clientRoot = path.resolve(
  fileURLToPath(new URL("../../..", import.meta.url)),
  "packages",
  "database-client",
);

const INCLUDED_EXTENSIONS = new Set([".ts", ".md", ".json", ".yml", ".yaml"]);

async function collectFiles(root) {
  const entries = await readdir(root, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectFiles(fullPath));
    } else if (INCLUDED_EXTENSIONS.has(path.extname(entry.name))) {
      files.push(fullPath);
    }
  }

  return files;
}

for (const filePath of await collectFiles(clientRoot)) {
  const original = await readFile(filePath, "utf8");
  const normalized = original
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{2,}$/g, "\n");

  if (normalized !== original) {
    await writeFile(filePath, normalized, "utf8");
  }

  const tempPath = `${filePath}.materialized`;
  await copyFile(filePath, tempPath);
  await rename(tempPath, filePath).catch(async (error) => {
    if (error?.code !== "EEXIST" && error?.code !== "EPERM") throw error;
    await rm(filePath, { force: true });
    await rename(tempPath, filePath);
  });
}

const indexPath = path.join(clientRoot, "src", "index.ts");
const indexSource = await readFile(indexPath, "utf8");
if (!indexSource.includes("export * from './database-client';")) {
  await writeFile(indexPath, `${indexSource.trimEnd()}\nexport * from './database-client';\n`, "utf8");
}

console.log("cleaned generated database-gateway client whitespace, materialized package files, and preserved domain client export");
