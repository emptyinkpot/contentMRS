#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';
import readline from 'node:readline';

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const limitArg = args.find(a => a.startsWith('--limit='));
const limit = limitArg ? Number(limitArg.split('=')[1]) : Infinity;
const chunkChars = 1800;
const mysqlCmd = path.join(process.env.USERPROFILE || '', '.codex-runtime', 'bin', 'mysql-myblog.cmd');
const fileArg = args.find(a => a.startsWith('--file='));
const trainFile = fileArg
  ? fileArg.split('=').slice(1).join('=')
  : path.resolve('E:/My Project/contentmrs-latent-training-dataset/data-local-books/train.jsonl');

function stableId(prefix, text) {
  return prefix + '-' + createHash('sha256').update(text).digest('hex').slice(0, 40);
}

function contentHash(text) {
  return createHash('sha256').update(text || '').digest('hex');
}

function sqlString(value) {
  if (value === null || value === undefined) return 'NULL';
  let text = String(value);
  text = text.replace(/\x00/g, '');
  text = text.replace(/\\/g, '\\\\');
  text = text.replace(/'/g, "''");
  text = text.replace(/\r/g, '\\r').replace(/\n/g, '\\n').replace(/\t/g, '\\t');
  return "'" + text + "'";
}

function runMysql(sql) {
  const tmpFile = path.join(process.env.TEMP || '/tmp', 'import-corpus-' + Date.now() + '.sql');
  fs.writeFileSync(tmpFile, sql, 'utf8');
  try {
    execSync('"' + mysqlCmd + '" --default-character-set=utf8mb4 --binary-mode=1 < "' + tmpFile + '"', { shell: true, stdio: 'pipe' });
  } finally {
    try { fs.unlinkSync(tmpFile); } catch {}
  }
}

function chunkText(text, maxChars) {
  const cleaned = (text || '').replace(/\n{3,}/g, '\n\n').trim();
  if (!cleaned) return [];
  if (cleaned.length <= maxChars) return [cleaned];
  const paragraphs = cleaned.split(/\n\s*\n/);
  const chunks = [];
  let current = '';
  for (const para of paragraphs) {
    const p = para.trim();
    if (!p) continue;
    if (p.length > maxChars) {
      if (current) { chunks.push(current.trim()); current = ''; }
      for (let i = 0; i < p.length; i += maxChars) chunks.push(p.slice(i, i + maxChars).trim());
      continue;
    }
    const candidate = current ? current + '\n\n' + p : p;
    if (candidate.length > maxChars && current) {
      chunks.push(current.trim());
      current = p;
    } else {
      current = candidate;
    }
  }
  if (current) chunks.push(current.trim());
  return chunks;
}

const TITLE_MAP = {
  book_xingwang_world_history_21: '兴亡的世界史全21卷',
  book_natsume_soseki_raw: '夏目漱石作品集',
  book_puyi_memoir_raw: '我的前半生',
  book_luxun_complete_raw: '鲁迅全集',
  book_mishima_collection_raw: '三岛由纪夫作品集',
  book_european_history_selection_raw: '欧洲史选读',
  book_oracle_chinese_history_raw: '中国通史',
  book_ishiguro_collection_raw: '石黑一雄作品集',
  book_kinkakuji_raw: '金阁寺',
  book_sakaguchi_ango_raw: '坂口安吾作品集',
  book_kawabata_collection_raw: '川端康成作品集',
  book_naito_konan_raw: '内藤湖南著作',
  book_japanese_empire_observation_raw: '日本帝国观察记',
  book_quan_tangshi_raw: '全唐诗',
  book_dazai_osamu_raw: '太宰治作品集',
  book_miyazaki_history_raw: '宫崎市定中国史',
  book_capital_raw: '资本论',
  book_marx_engels_vol32_raw: '马克思恩格斯全集第32卷',
  book_shina_revolution_gaishi_raw: '支那革命外史',
  book_dongying_wenren_raw: '东洋文人印象中国',
  book_fortress_besieged_raw: '围城',
  book_kita_ikki_raw: '北一辉著作',
  book_saiwai_shidi_raw: '幸而城市',
  book_korea_general_history_raw: '朝鲜通史',
};

async function loadTrainingSamples(filePath, maxItems) {
  const groups = new Map();
  const rl = readline.createInterface({ input: fs.createReadStream(filePath, 'utf8'), crlfDelay: Infinity });
  let count = 0;
  for await (const line of rl) {
    if (!line.trim()) continue;
    if (count >= maxItems) break;
    try {
      const item = JSON.parse(line);
      const sourceId = item.sourceId || item.source_id || 'unknown';
      if (!groups.has(sourceId)) {
        groups.set(sourceId, {
          sourceId,
          sourceFile: item.sourceFile || '',
          title: TITLE_MAP[sourceId] || sourceId,
          provider: item.provider || 'local.book_corpus',
          samples: [],
        });
      }
      groups.get(sourceId).samples.push(item.text || '');
      count++;
    } catch {}
  }
  return groups;
}

async function main() {
  console.log('Loading: ' + trainFile);
  console.log('Mode: ' + (apply ? 'APPLY' : 'DRY-RUN'));
  console.log('');

  const groups = await loadTrainingSamples(trainFile, limit);
  console.log('Books: ' + groups.size);

  let totalDocs = 0;
  let totalChunks = 0;
  const allStatements = [];

  for (const [sourceId, group] of groups) {
    const docId = stableId('bookdoc', 'literary_corpus|' + sourceId);
    const metadata = JSON.stringify({
      provider: group.provider,
      sourceFile: group.sourceFile,
      sourceTable: 'literary_corpus',
      content_kind: 'literary_book',
    });

    allStatements.push(
      'INSERT INTO search_documents (id, source_table, source_id, source, title, content_hash, content_kind, value_level, privacy_level, search_status, metadata_json) VALUES ('
      + [sqlString(docId), sqlString('literary_corpus'), sqlString(sourceId), sqlString(group.provider), sqlString(group.title), sqlString(contentHash(sourceId)), sqlString('literary_book'), sqlString('high'), sqlString('private'), sqlString('ready'), sqlString(metadata)].join(',')
      + ') ON DUPLICATE KEY UPDATE title=VALUES(title), search_status=VALUES(search_status);'
    );
    allStatements.push('DELETE FROM search_chunks WHERE document_id=' + sqlString(docId) + ';');

    let chunkIndex = 0;
    for (const sampleText of group.samples) {
      const subChunks = chunkText(sampleText, chunkChars);
      for (const chunk of subChunks) {
        if (!chunk || chunk.length < 20) continue;
        const chunkId = stableId('sc', docId + '|' + chunkIndex + '|' + contentHash(chunk));
        const chunkMeta = JSON.stringify({
          source_table: 'literary_corpus',
          source_id: sourceId,
          title: group.title,
          sourceType: 'literary_book',
        });
        allStatements.push(
          'INSERT INTO search_chunks (id, document_id, chunk_index, chunk_text, token_estimate, content_hash, privacy_level, index_status, metadata_json) VALUES ('
          + [sqlString(chunkId), sqlString(docId), String(chunkIndex), sqlString(chunk), String(Math.max(1, Math.floor(chunk.length / 4))), sqlString(contentHash(chunk)), sqlString('private'), sqlString('ready'), sqlString(chunkMeta)].join(',')
          + ') ON DUPLICATE KEY UPDATE chunk_text=VALUES(chunk_text), index_status=VALUES(index_status);'
        );
        chunkIndex++;
        totalChunks++;
      }
    }
    totalDocs++;
    console.log('  ' + group.title + ': ' + group.samples.length + ' samples -> ' + chunkIndex + ' chunks');
  }

  console.log('');
  console.log('Total: ' + totalDocs + ' docs, ' + totalChunks + ' chunks');

  if (!apply) {
    console.log('');
    console.log('Use --apply to execute.');
    return;
  }

  const batchSize = 3000;
  console.log('Executing ' + allStatements.length + ' SQL statements in batches of ' + batchSize + '...');
  for (let i = 0; i < allStatements.length; i += batchSize) {
    const batch = allStatements.slice(i, i + batchSize);
    runMysql(batch.join('\n'));
    process.stdout.write('  ' + Math.min(i + batchSize, allStatements.length) + '/' + allStatements.length + '\r');
  }
  console.log('');
  console.log('Done. ' + totalDocs + ' documents, ' + totalChunks + ' chunks inserted.');
}

main().catch(err => { console.error(err); process.exit(1); });
