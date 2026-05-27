/**
 * baseline-run.mjs — serial baseline generation driver
 * Runs all topics from topics.json, scores each, appends to scorecard.jsonl.
 * Usage: node baseline-run.mjs [--base-url http://127.0.0.1:5101]
 */

import { readFileSync, writeFileSync, appendFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { scoreArticle } from './quality-scorecard.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TOPICS_PATH = resolve(__dirname, 'topics.json');
const SCORECARD_PATH = resolve(__dirname, 'scorecard.jsonl');
const BODIES_DIR = resolve(__dirname, 'bodies');
const COOLDOWN_MS = 30_000;
const REQUEST_TIMEOUT_MS = 300_000;

const args = process.argv.slice(2);
const baseUrl = getArg(args, '--base-url') || 'http://127.0.0.1:5101';

async function main() {
  const topics = JSON.parse(readFileSync(TOPICS_PATH, 'utf8')).topics;
  mkdirSync(BODIES_DIR, { recursive: true });

  console.log(`[baseline] ${topics.length} topics, endpoint: ${baseUrl}`);
  console.log(`[baseline] scorecard: ${SCORECARD_PATH}`);
  console.log(`[baseline] cooldown: ${COOLDOWN_MS / 1000}s between runs`);
  console.log('');

  const results = [];

  for (let i = 0; i < topics.length; i++) {
    const t = topics[i];
    const label = `[${t.id}] ${t.topic.slice(0, 30)}...`;
    console.log(`${label} — generating...`);
    const startMs = Date.now();

    let record;
    try {
      const response = await fetch(`${baseUrl}/api/content/runtime/generate/article`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ topic: t.topic, structure: { targetWordCount: t.targetWordCount } }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });

      const payload = await response.json();
      const elapsedMs = Date.now() - startMs;

      if (!payload.success) {
        record = makeRecord(t, { success: false, error: payload.error || 'unknown', elapsedMs });
        console.log(`  FAILED (${(elapsedMs / 1000).toFixed(1)}s): ${record.error}`);
      } else {
        const body = payload.data?.draft?.body || '';
        const mi = payload.data?.draft?.modelInvocation || payload.data?.trace?.modelInvocation || {};
        const score = scoreArticle(body);

        const bodyFile = resolve(BODIES_DIR, `${t.id}.md`);
        writeFileSync(bodyFile, body, 'utf8');

        record = makeRecord(t, {
          success: true,
          elapsedMs,
          model: mi.model || '',
          promptTokens: mi.usage?.prompt_tokens || 0,
          completionTokens: mi.usage?.completion_tokens || 0,
          totalTokens: mi.usage?.total_tokens || 0,
          bodyChars: [...body].length,
          score: score.total,
          pass: score.pass,
          metrics: score.metrics,
        });
        console.log(`  OK (${(elapsedMs / 1000).toFixed(1)}s) — ${record.bodyChars} chars, score ${record.score}/100, ${record.pass ? 'PASS' : 'FAIL'}`);
      }
    } catch (err) {
      const elapsedMs = Date.now() - startMs;
      record = makeRecord(t, { success: false, error: err.message, elapsedMs });
      console.log(`  ERROR (${(elapsedMs / 1000).toFixed(1)}s): ${err.message}`);
    }

    results.push(record);
    appendFileSync(SCORECARD_PATH, JSON.stringify(record) + '\n', 'utf8');

    if (i < topics.length - 1) {
      console.log(`  cooldown ${COOLDOWN_MS / 1000}s...`);
      await sleep(COOLDOWN_MS);
    }
  }

  console.log('');
  console.log('=== BASELINE SUMMARY ===');
  const succeeded = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  const passed = results.filter(r => r.pass);
  console.log(`Total: ${results.length} | Success: ${succeeded.length} | Failed: ${failed.length} | Quality Pass: ${passed.length}`);
  if (succeeded.length > 0) {
    const avgScore = Math.round(succeeded.reduce((s, r) => s + r.score, 0) / succeeded.length);
    const avgTokens = Math.round(succeeded.reduce((s, r) => s + r.promptTokens, 0) / succeeded.length);
    const avgTime = Math.round(succeeded.reduce((s, r) => s + r.elapsedMs, 0) / succeeded.length / 1000);
    console.log(`Avg score: ${avgScore}/100 | Avg prompt tokens: ${avgTokens} | Avg time: ${avgTime}s`);
  }
  if (failed.length > 0) {
    console.log('Failed topics:');
    for (const r of failed) console.log(`  ${r.topicId}: ${r.error}`);
  }

  process.exit(failed.length > 0 ? 1 : 0);
}

function makeRecord(topic, data) {
  return {
    topicId: topic.id,
    topic: topic.topic,
    runAt: new Date().toISOString(),
    ...data,
  };
}

function getArg(args, name) {
  const idx = args.indexOf(name);
  return idx >= 0 && idx + 1 < args.length ? args[idx + 1] : null;
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

main();
