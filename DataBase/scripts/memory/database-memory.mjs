#!/usr/bin/env node
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const scriptsRoot = path.dirname(__filename);
const defaultDataBaseRoot = path.resolve(scriptsRoot, "..");

function parseArgs(argv) {
  const parsed = {
    command: argv[0],
    query: "",
    limit: 5,
    dryRun: false,
    input: "",
    commit: false,
    type: "",
    candidateId: "",
    status: "",
    reviewer: "",
    reason: "",
    dataBaseRoot: process.env.DATABASE_MEMORY_REPO_ROOT || defaultDataBaseRoot,
    experienceRoot: process.env.DATABASE_MEMORY_EXPERIENCE_ROOT || "",
    qmdRoot: process.env.DATABASE_MEMORY_QMD_ROOT || "",
    qmdIndexPath: process.env.DATABASE_MEMORY_QMD_INDEX_PATH || "",
  };

  for (let index = 1; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === "--query" || arg === "-Query" || arg === "--Query") {
      parsed.query = next || "";
      index += 1;
    } else if (arg === "--limit" || arg === "-Limit" || arg === "--Limit") {
      parsed.limit = Number.parseInt(next || "5", 10);
      index += 1;
    } else if (arg === "--dry-run" || arg === "-DryRun" || arg === "--DryRun") {
      parsed.dryRun = true;
    } else if (arg === "--commit") {
      parsed.commit = true;
    } else if (arg === "--type") {
      parsed.type = next || "";
      index += 1;
    } else if (arg === "--input") {
      parsed.input = next || "";
      index += 1;
    } else if (arg === "--candidate-id") {
      parsed.candidateId = next || "";
      index += 1;
    } else if (arg === "--status") {
      parsed.status = next || "";
      index += 1;
    } else if (arg === "--reviewer") {
      parsed.reviewer = next || "";
      index += 1;
    } else if (arg === "--reason") {
      parsed.reason = next || "";
      index += 1;
    } else if (arg === "--database-root") {
      parsed.dataBaseRoot = next || parsed.dataBaseRoot;
      index += 1;
    } else if (arg === "--experience-root") {
      parsed.experienceRoot = next || parsed.experienceRoot;
      index += 1;
    } else if (arg === "--qmd-root") {
      parsed.qmdRoot = next || parsed.qmdRoot;
      index += 1;
    } else if (arg === "--qmd-index-path") {
      parsed.qmdIndexPath = next || parsed.qmdIndexPath;
      index += 1;
    }
  }

  return parsed;
}

function requireDir(label, dir) {
  const resolved = path.resolve(dir);
  if (!fs.existsSync(resolved)) {
    throw new Error(`${label} does not exist: ${resolved}`);
  }
  return resolved;
}

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      shell: false,
      ...options,
      env: {
        ...process.env,
        ...(options.env || {}),
      },
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} ${args.join(" ")} exited with code ${code}`));
      }
    });
  });
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const allowed = new Set([
    "status",
    "probe",
    "search",
    "recall",
    "refresh",
    "record-experience",
    "record-note",
    "submit-candidate",
    "list-candidates",
    "review-candidate",
  ]);
  if (!allowed.has(options.command)) {
    throw new Error("Usage: database-memory.mjs <status|probe|search|recall|refresh|record-experience|record-note|submit-candidate|list-candidates|review-candidate> [options]");
  }

  const dataBaseRoot = requireDir("DATABASE_MEMORY_REPO_ROOT", options.dataBaseRoot);
  const experienceRoot = requireDir(
    "DATABASE_MEMORY_EXPERIENCE_ROOT",
    options.experienceRoot || path.join(dataBaseRoot, "services", "experience-manager")
  );
  const qmdRoot = requireDir(
    "DATABASE_MEMORY_QMD_ROOT",
    options.qmdRoot || path.resolve(dataBaseRoot, "..", "my-project-qmd")
  );

  const env = {
    EXPERIENCE_QMD_ROOT: qmdRoot,
    QMD_EXPERIENCE_COLLECTION_DIR: path.join(qmdRoot, "collections", "experience-manager"),
  };
  if (options.qmdIndexPath) {
    env.EXPERIENCE_QMD_INDEX_PATH = options.qmdIndexPath;
    env.INDEX_PATH = options.qmdIndexPath;
  }

  const npm = "npm";
  const pnpm = "pnpm";
  const qmdCli = ["exec", "tsx", "src/cli/qmd.ts"];

  switch (options.command) {
    case "status":
      await run(npm, ["run", "health"], { cwd: experienceRoot, env });
      await run(pnpm, [...qmdCli, "status"], { cwd: qmdRoot, env });
      break;
    case "probe":
      await run(npm, ["run", "probe:readonly"], { cwd: experienceRoot, env });
      break;
    case "search":
      if (!options.query) throw new Error("database-memory search requires --query");
      await run(pnpm, [...qmdCli, "search", options.query, "-c", "experience-manager", "-n", String(options.limit), "--json"], {
        cwd: qmdRoot,
        env,
      });
      break;
    case "recall":
      if (!options.query) throw new Error("database-memory recall requires --query");
      await run(pnpm, [...qmdCli, "vsearch", options.query, "-c", "experience-manager", "-n", String(options.limit), "--json"], {
        cwd: qmdRoot,
        env: { ...env, QMD_VSEARCH_EXPAND: "false" },
      });
      break;
    case "refresh":
      await run(npm, ["run", options.dryRun ? "sync:qmd:dry" : "sync:qmd"], {
        cwd: experienceRoot,
        env: { ...env, EXPERIENCE_QMD_SYNC_LIMIT: String(options.limit) },
      });
      if (!options.dryRun) {
        await run(pnpm, [...qmdCli, "update"], { cwd: qmdRoot, env });
      }
      break;
    case "record-experience":
    case "record-note": {
      if (!options.input) throw new Error(`${options.command} requires --input <json-file>`);
      const type = options.command === "record-experience" ? "experience" : "note";
      const args = ["./scripts/controlled-record.mjs", "--type", type, "--input", options.input];
      if (options.commit) args.push("--commit");
      await run(process.execPath, args, { cwd: experienceRoot, env });
      break;
    }
    case "submit-candidate": {
      if (!options.input) throw new Error("submit-candidate requires --input <json-file>");
      if (!["experience", "note"].includes(options.type)) throw new Error("submit-candidate requires --type <experience|note>");
      await run(process.execPath, ["./scripts/memory-approval.mjs", "submit", "--type", options.type, "--input", options.input], {
        cwd: experienceRoot,
        env,
      });
      break;
    }
    case "list-candidates": {
      const args = ["./scripts/memory-approval.mjs", "list", "--limit", String(options.limit)];
      if (options.status) args.push("--status", options.status);
      await run(process.execPath, args, { cwd: experienceRoot, env });
      break;
    }
    case "review-candidate": {
      if (!options.candidateId) throw new Error("review-candidate requires --candidate-id");
      if (!options.status) throw new Error("review-candidate requires --status <approved|rejected|superseded>");
      const args = [
        "./scripts/memory-approval.mjs",
        "review",
        "--candidate-id",
        options.candidateId,
        "--status",
        options.status,
      ];
      if (options.reviewer) args.push("--reviewer", options.reviewer);
      if (options.reason) args.push("--reason", options.reason);
      await run(process.execPath, args, { cwd: experienceRoot, env });
      break;
    }
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
