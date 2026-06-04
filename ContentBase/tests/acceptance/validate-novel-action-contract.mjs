import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(__filename), "..", "..");

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

const server = stripComments(read("server.mjs"));
const packageJson = JSON.parse(read("package.json"));

assert(
  server.includes("/api/novel/runtime/actions/generate-chapter"),
  "ContentBase must expose POST /api/novel/runtime/actions/generate-chapter; novel-factory cannot be accepted through the article endpoint"
);
assert(
  /generate(?:Novel)?Chapter|generateChapter/.test(server),
  "ContentBase must own a chapter generation handler, not only a route string"
);
assert(
  server.includes("modelInvocation"),
  "Novel action must return modelInvocation evidence from the Writer runtime"
);
assert(
  !/\/api\/content\/runtime\/generate\/article[\s\S]{0,240}generate-chapter/i.test(server),
  "Novel action must not be a shallow alias to the article endpoint"
);
assert(
  packageJson.scripts?.["acceptance:novel-action-contract"],
  "package.json must expose acceptance:novel-action-contract"
);

console.log(JSON.stringify({
  ok: true,
  root,
  endpoint: "POST /api/novel/runtime/actions/generate-chapter",
  requiredEvidence: ["body", "modelInvocation"],
  providerPolicy: "same Claude/sub2api Writer contract; no article-endpoint bypass"
}, null, 2));
