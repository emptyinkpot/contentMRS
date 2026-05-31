#!/usr/bin/env node
// Populate story_events / character_growth / important_items via Gateway API.
// Uses LLM to extract structured data from chapter content.
// Usage: node populate-story-memory.mjs [--work 7] [--batch=5] [--start=1]

import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REGISTRY = JSON.parse(readFileSync(join(__dirname, 'registry.json'), 'utf-8'));

const SERVER = 'ubuntu@124.220.233.126';
const DB_URL = 'http://127.0.0.1:18090';

const BATCH = parseInt(process.argv.find(a => a.startsWith('--batch='))?.split('=')[1] || '5', 10);
const START = parseInt(process.argv.find(a => a.startsWith('--start='))?.split('=')[1] || '1', 10);
const WORK_FILTER = (() => { const i = process.argv.indexOf('--work'); return i > -1 ? process.argv[i+1] : null; })();
const DRY_RUN = process.argv.includes('--dry-run');

const workIds = WORK_FILTER
  ? [WORK_FILTER]
  : REGISTRY.books.filter(b => b.active).map(b => b.localWorkId);

console.log(`[${new Date().toISOString()}] Story Memory 填充 (batch=${BATCH}, start=${START}, works=${workIds.join(',')})`);

function ssh(cmd, timeout = 30000) {
  const full = `ssh -o ConnectTimeout=10 ${SERVER} "${cmd.replace(/"/g, '\\"')}"`;
  return execSync(full, { encoding: 'utf-8', timeout }).trim();
}

function sshJson(cmd, timeout = 30000) {
  const raw = ssh(cmd, timeout);
  try { return JSON.parse(raw); } catch { return null; }
}

function getChapter(workId, chapterNumber) {
  return sshJson(
    `curl -sS -m 10 '${DB_URL}/content/publication/publish-chapter?local_work_id=${workId}&chapter_number=${chapterNumber}'`
  );
}

function getExistingMemory(workId) {
  return sshJson(`curl -sS -m 10 '${DB_URL}/creative/story-memory?workId=${workId}'`);
}

function getWorks() {
  return sshJson(`curl -sS -m 10 '${DB_URL}/content/works'`);
}

function writeStoryMemory(workId, chapterNumber, events, characterGrowth, importantItems) {
  const payload = JSON.stringify({
    payload: {
      workId: Number(workId),
      chapterNumber: Number(chapterNumber),
      events: events || [],
      characterGrowth: characterGrowth || [],
      importantItems: importantItems || [],
    },
  });
  const key = `populate-sm-${workId}-${chapterNumber}-${Date.now()}`;
  const tmpFile = `/tmp/sm_write_${Date.now()}.json`;
  try {
    execSync(
      `ssh -o ConnectTimeout=10 ${SERVER} "cat > ${tmpFile}"`,
      { input: payload, encoding: 'utf-8', timeout: 10000 }
    );
    const raw = ssh(
      `curl -sS -m 15 -X POST '${DB_URL}/writes/record-story-memory' -H 'Content-Type: application/json' -H 'X-DataBase-Idempotency-Key: ${key}' -d @${tmpFile} && rm -f ${tmpFile}`,
      20000
    );
    return JSON.parse(raw);
  } catch (e) {
    try { ssh(`rm -f ${tmpFile}`, 5000); } catch {}
    return { ok: false, error: e.message };
  }
}

async function extractMemoryFromChapter(title, content) {
  const prompt = `请分析以下小说章节，提取结构化信息。只输出 JSON，不要其他文字。

标题：${title}
正文：${content.slice(0, 3000)}

输出格式：
{"events":[{"eventType":"plot|conflict|revelation|decision","title":"事件标题","description":"简述","charactersInvolved":["人名"],"importance":"high|medium|low"}],"characterGrowth":[{"characterName":"人名","growthType":"emotion|relationship|power|belief","before":"变化前状态","after":"变化后状态","description":"简述"}],"importantItems":[{"name":"物品/地点名","type":"weapon|location|artifact|document","description":"简述"}]}
只提取本章中明确出现的重要事件(1-3个)、人物变化(0-2个)、重要物品(0-1个)。没有就留空数组。`;

  const payload = JSON.stringify({
    model: 'qwen-max',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 1500,
    temperature: 0.1,
  });

  // Write payload to temp file on server to avoid shell escaping issues
  const tmpFile = `/tmp/sm_payload_${Date.now()}.json`;
  try {
    execSync(
      `ssh -o ConnectTimeout=10 ${SERVER} "cat > ${tmpFile}"`,
      { input: payload, encoding: 'utf-8', timeout: 10000 }
    );
    const raw = ssh(
      `source /srv/contentbase/shared/llm.env && curl -sS -m 60 -X POST "$CONTENTBASE_QWEN_BASE_URL/chat/completions" -H 'Content-Type: application/json' -H "Authorization: Bearer $CONTENTBASE_QWEN_API_KEY" -d @${tmpFile} && rm -f ${tmpFile}`,
      65000
    );
    const res = JSON.parse(raw);
    const text = res?.choices?.[0]?.message?.content || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
  } catch (e) {
    try { ssh(`rm -f ${tmpFile}`, 5000); } catch {}
  }
  return { events: [], characterGrowth: [], importantItems: [] };
}

async function main() {
  const works = getWorks();
  const allWorks = works?.works || (Array.isArray(works) ? works : []);

  for (const workId of workIds) {
    const work = allWorks.find(w => String(w.id) === String(workId));
    const totalChapters = work?.current_chapters || 0;
    console.log(`\n[Work ${workId}] ${work?.title || '?'} (${totalChapters} 章)`);

    const existing = getExistingMemory(workId);
    const existingEvents = existing?.counts?.events || 0;
    console.log(`  已有 story-memory: ${existingEvents} 条事件`);

    const startCh = Math.max(START, 1);
    const endCh = Math.min(startCh + BATCH - 1, totalChapters);
    console.log(`  处理范围: 第${startCh}章 ~ 第${endCh}章`);

    for (let ch = startCh; ch <= endCh; ch++) {
      // Throttle SSH connections to avoid rate limiting
      if (ch > startCh) {
        await new Promise(r => setTimeout(r, 3000));
      }
      const chData = getChapter(workId, ch);
      const content = chData?.chapter?.content || '';
      const title = chData?.chapter?.title || `第${ch}章`;
      if (!content || content.length < 200) {
        console.log(`  [跳过] 第${ch}章: 内容过短`);
        continue;
      }

      const extracted = await extractMemoryFromChapter(title, content);
      const totalItems = (extracted.events?.length || 0) + (extracted.characterGrowth?.length || 0) + (extracted.importantItems?.length || 0);

      if (totalItems === 0) {
        console.log(`  [跳过] 第${ch}章: 未提取到结构化数据`);
        continue;
      }

      if (DRY_RUN) {
        console.log(`  [DRY] 第${ch}章: ${extracted.events?.length || 0} 事件, ${extracted.characterGrowth?.length || 0} 人物变化, ${extracted.importantItems?.length || 0} 物品`);
        continue;
      }

      const res = writeStoryMemory(workId, ch, extracted.events, extracted.characterGrowth, extracted.importantItems);
      const ok = res?.success || res?.ok;
      console.log(`  [${ok ? '✓' : '✗'}] 第${ch}章: ${extracted.events?.length || 0} 事件, ${extracted.characterGrowth?.length || 0} 人物变化`);
    }
  }
  console.log('\n完成。');
}

main().catch(err => { console.error('Fatal:', err.message); process.exit(1); });
