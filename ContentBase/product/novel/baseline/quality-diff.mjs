/**
 * quality-diff.mjs — compare two scorecard.jsonl files
 * Outputs markdown table showing per-topic deltas.
 * Usage: node quality-diff.mjs <before.jsonl> <after.jsonl>
 * Exit 0 if no regression (avg score delta >= 0), exit 1 otherwise.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const [beforePath, afterPath] = process.argv.slice(2);
if (!beforePath || !afterPath) {
  console.error('Usage: node quality-diff.mjs <before.jsonl> <after.jsonl>');
  process.exit(2);
}

function loadScorecard(path) {
  const lines = readFileSync(resolve(path), 'utf8').split('\n').filter(l => l.trim());
  const records = lines.map(l => JSON.parse(l));
  const map = new Map();
  for (const r of records) {
    map.set(r.topicId, r);
  }
  return map;
}

const before = loadScorecard(beforePath);
const after = loadScorecard(afterPath);

const allIds = [...new Set([...before.keys(), ...after.keys()])].sort();

const rows = [];
let totalDeltaScore = 0;
let totalDeltaTokens = 0;
let compared = 0;

for (const id of allIds) {
  const b = before.get(id);
  const a = after.get(id);

  if (!b || !a) {
    rows.push({ id, topic: (b || a).topic.slice(0, 25), bScore: b?.score ?? '-', aScore: a?.score ?? '-', delta: '-', bTokens: b?.promptTokens ?? '-', aTokens: a?.promptTokens ?? '-', tokenDelta: '-' });
    continue;
  }

  if (!b.success || !a.success) {
    rows.push({ id, topic: (b || a).topic.slice(0, 25), bScore: b.success ? b.score : 'FAIL', aScore: a.success ? a.score : 'FAIL', delta: '-', bTokens: b.promptTokens || '-', aTokens: a.promptTokens || '-', tokenDelta: '-' });
    continue;
  }

  const deltaScore = a.score - b.score;
  const deltaTokens = a.promptTokens - b.promptTokens;
  totalDeltaScore += deltaScore;
  totalDeltaTokens += deltaTokens;
  compared++;

  rows.push({
    id,
    topic: a.topic.slice(0, 25),
    bScore: b.score,
    aScore: a.score,
    delta: (deltaScore >= 0 ? '+' : '') + deltaScore,
    bTokens: b.promptTokens,
    aTokens: a.promptTokens,
    tokenDelta: (deltaTokens >= 0 ? '+' : '') + deltaTokens,
  });
}

console.log('## Quality Diff\n');
console.log('| ID | Topic | Before | After | Δ Score | Before Tokens | After Tokens | Δ Tokens |');
console.log('|----|-------|--------|-------|---------|---------------|--------------|----------|');
for (const r of rows) {
  console.log(`| ${r.id} | ${r.topic} | ${r.bScore} | ${r.aScore} | ${r.delta} | ${r.bTokens} | ${r.aTokens} | ${r.tokenDelta} |`);
}

if (compared > 0) {
  const avgDelta = Math.round(totalDeltaScore / compared);
  const avgTokenDelta = Math.round(totalDeltaTokens / compared);
  console.log('');
  console.log(`**Average Δ Score: ${avgDelta >= 0 ? '+' : ''}${avgDelta}**`);
  console.log(`**Average Δ Tokens: ${avgTokenDelta >= 0 ? '+' : ''}${avgTokenDelta}**`);

  if (avgDelta < 0) {
    console.log('\n⚠ REGRESSION DETECTED — average score dropped.');
    process.exit(1);
  } else {
    console.log('\n✓ No regression.');
    process.exit(0);
  }
} else {
  console.log('\nNo comparable pairs found.');
  process.exit(2);
}
