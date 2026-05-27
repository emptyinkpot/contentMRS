import { mkdir, writeFile } from "node:fs/promises";

await mkdir(new URL("../dist/cjs/", import.meta.url), { recursive: true });

// Node 以最近的 package.json 判定 .js 模块格式；这里声明 CJS 是正式导出格式的一部分。
await writeFile(
  new URL("../dist/cjs/package.json", import.meta.url),
  `${JSON.stringify({ type: "commonjs" }, null, 2)}\n`,
);
