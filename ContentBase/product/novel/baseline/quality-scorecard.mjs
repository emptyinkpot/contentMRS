/**
 * quality-scorecard.mjs — deterministic article quality scorer
 * Pure Node, no NPM deps. Scores a single article body on 6 dimensions.
 * Usage: node quality-scorecard.mjs <body-file.md> [--json]
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const METRICS = {
  charCount: { min: 1200, ideal: 2000, max: 4000 },
  paragraphCount: { min: 4, ideal: 8, max: 30 },
  avgParagraphLength: { min: 80, ideal: 200, max: 600 },
  uniqueCharRatio: { min: 0.15, ideal: 0.35, max: 1.0 },
  sentenceVariance: { min: 0.2, ideal: 0.5, max: 1.0 },
  concreteNounDensity: { min: 0.005, ideal: 0.02, max: 0.1 },
};

export function scoreArticle(body) {
  const text = String(body || '').trim();
  if (!text) return { total: 0, metrics: {}, pass: false, reason: 'empty body' };

  const chars = [...text];
  const charCount = chars.length;

  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
  const paragraphCount = paragraphs.length;

  const paragraphLengths = paragraphs.map(p => [...p.trim()].length);
  const avgParagraphLength = paragraphLengths.length > 0
    ? paragraphLengths.reduce((a, b) => a + b, 0) / paragraphLengths.length
    : 0;

  const uniqueChars = new Set(chars.filter(c => /[一-鿿]/.test(c)));
  const totalCJK = chars.filter(c => /[一-鿿]/.test(c)).length;
  const uniqueCharRatio = totalCJK > 0 ? uniqueChars.size / totalCJK : 0;

  const sentences = text.split(/[。！？；\n]+/).filter(s => s.trim().length > 2);
  const sentenceLengths = sentences.map(s => [...s.trim()].length);
  const sentenceVariance = computeCV(sentenceLengths);

  const concreteNouns = countConcreteNouns(text);
  const concreteNounDensity = totalCJK > 0 ? concreteNouns / totalCJK : 0;

  const raw = { charCount, paragraphCount, avgParagraphLength, uniqueCharRatio, sentenceVariance, concreteNounDensity };
  const scores = {};
  let total = 0;

  for (const [key, bounds] of Object.entries(METRICS)) {
    const value = raw[key];
    const score = rangeScore(value, bounds.min, bounds.ideal, bounds.max);
    scores[key] = { value: Math.round(value * 1000) / 1000, score };
    total += score;
  }

  const maxTotal = Object.keys(METRICS).length * 100;
  const normalizedTotal = Math.round((total / maxTotal) * 100);
  const pass = normalizedTotal >= 50 && charCount >= METRICS.charCount.min && paragraphCount >= METRICS.paragraphCount.min;

  return { total: normalizedTotal, metrics: scores, pass, reason: pass ? 'ok' : 'below threshold' };
}

function rangeScore(value, min, ideal, max) {
  if (value < min) return Math.max(0, (value / min) * 40);
  if (value <= ideal) return 40 + ((value - min) / (ideal - min)) * 60;
  if (value <= max) return 100 - ((value - ideal) / (max - ideal)) * 30;
  return Math.max(0, 70 - ((value - max) / max) * 70);
}

function computeCV(arr) {
  if (arr.length < 2) return 0;
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  if (mean === 0) return 0;
  const variance = arr.reduce((sum, v) => sum + (v - mean) ** 2, 0) / arr.length;
  return Math.sqrt(variance) / mean;
}

function countConcreteNouns(text) {
  const concretePatterns = /[山河湖海城墙门窗桌椅刀剑马车船帆灯烛酒茶花树石桥塔庙殿宫院街巷路田野林园池塘井泉瓦砖柱梁窗帘幕帐篷伞杖笔墨纸砚琴棋书画镜钟鼓钟碗盘杯壶瓶罐箱柜床枕被褥衣裳帽鞋袜带扇伞]/g;
  const matches = text.match(concretePatterns);
  return matches ? matches.length : 0;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'))) {
  const file = process.argv[2];
  if (!file) {
    console.error('Usage: node quality-scorecard.mjs <body-file.md> [--json]');
    process.exit(1);
  }
  const body = readFileSync(resolve(file), 'utf8');
  const result = scoreArticle(body);
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`Score: ${result.total}/100  Pass: ${result.pass}`);
    for (const [key, m] of Object.entries(result.metrics)) {
      console.log(`  ${key}: ${m.value} → ${m.score}/100`);
    }
  }
  process.exit(result.pass ? 0 : 1);
}
