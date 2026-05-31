#!/usr/bin/env node
// 章节摘要生成器
// 通过 SSH 在服务器运行，连接 MySQL 为缺失 plot_summary 的章节生成摘要。
// 用法: node generate-summaries.mjs [--work 7] [--batch=5]

import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REGISTRY = JSON.parse(readFileSync(join(__dirname, 'registry.json'), 'utf-8'));
const SERVER = 'ubuntu@124.220.233.126';
const BATCH = parseInt(process.argv.find(a => a.startsWith('--batch='))?.split('=')[1] || '5', 10);
const WORK_FILTER = (() => { const i = process.argv.indexOf('--work'); return i > -1 ? process.argv[i+1] : null; })();

const workIds = WORK_FILTER
  ? [WORK_FILTER]
  : REGISTRY.books.filter(b => b.active).map(b => b.localWorkId);

console.log(`[${new Date().toISOString()}] 章节摘要生成 (batch=${BATCH}, works=${workIds.join(',')})`);

const remoteScript = `
const mysql = require('/srv/database-gateway/node_modules/mysql2/promise');
const http = require('http');

const WORK_IDS = [${workIds.join(',')}];
const BATCH = ${BATCH};
const DB = {
  host: '124.220.245.121', port: 22295,
  database: 'cloudbase-4glvyyq9f61b19cd',
  user: 'database_content_rw',
  password: 'vreDCh386uglGIa05sEx1JO9wcAZyK4W',
};

function summarize(title, excerpt) {
  const body = JSON.stringify({
    model: 'qwen-max',
    messages: [{ role: 'user', content: '请用200字以内概括以下章节的情节推进、人物状态变化和关键事件。只输出摘要，不要前缀。\\n\\n标题：' + title + '\\n正文：' + excerpt.slice(0, 1500) }],
    max_tokens: 400, temperature: 0.3,
  });
  return new Promise((resolve) => {
    const https = require('https');
    const url = new URL('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions');
    const req = https.request({
      hostname: url.hostname, port: 443, method: 'POST', path: url.pathname,
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer sk-aa85ad17bc6c4a2e83309f339d953258', 'Content-Length': Buffer.byteLength(body) },
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)?.choices?.[0]?.message?.content || ''); }
        catch { resolve(''); }
      });
    });
    req.on('error', () => resolve(''));
    req.setTimeout(60000, () => { req.destroy(); resolve(''); });
    req.write(body); req.end();
  });
}
`;

const remoteScript2 = `
async function main() {
  const pool = mysql.createPool(DB);
  let total = 0;
  for (const workId of WORK_IDS) {
    const [rows] = await pool.query(
      'SELECT id, chapter_number, title, LEFT(content, 2000) as excerpt FROM chapters WHERE work_id = ? AND (plot_summary IS NULL OR plot_summary = "") AND content IS NOT NULL AND LENGTH(content) > 200 ORDER BY chapter_number DESC LIMIT ?',
      [workId, BATCH]
    );
    if (!rows.length) { console.log('work ' + workId + ': 全部已有摘要'); continue; }
    console.log('work ' + workId + ': 缺少摘要 ' + rows.length + ' 章');
    for (const row of rows) {
      const summary = await summarize(row.title || ('第'+row.chapter_number+'章'), row.excerpt);
      if (summary && summary.length > 30) {
        await pool.query('UPDATE chapters SET plot_summary = ? WHERE id = ?', [summary, row.id]);
        console.log('  ok 第' + row.chapter_number + '章: ' + summary.slice(0, 50) + '...');
        total++;
      } else {
        console.log('  fail 第' + row.chapter_number + '章');
      }
    }
  }
  console.log('完成: ' + total + ' 条摘要');
  await pool.end();
}
main().catch(e => { console.error(e.message); process.exit(1); });
`;

const fullScript = remoteScript + remoteScript2;
const tmpFile = '/tmp/gen_summaries_' + Date.now() + '.js';

try {
  execSync(`ssh -o ConnectTimeout=10 ${SERVER} "cat > ${tmpFile}"`, {
    input: fullScript, encoding: 'utf-8', timeout: 10000,
  });
  const out = execSync(`ssh -o ConnectTimeout=10 ${SERVER} "node ${tmpFile} && rm ${tmpFile}"`, {
    encoding: 'utf-8', timeout: 600000,
  });
  console.log(out);
} catch (err) {
  console.error('远程执行失败:', err.stderr?.slice(0, 300) || err.message);
  process.exit(1);
}
