import { readFileSync, readdirSync } from 'node:fs';
import { join, basename } from 'node:path';
import { randomUUID } from 'node:crypto';

const GATEWAY_URL = process.env.DATABASE_GATEWAY_URL || 'http://127.0.0.1:18090';
const API_KEY = process.env.DATABASE_GATEWAY_API_KEY;
if (!API_KEY) {
  throw new Error('DATABASE_GATEWAY_API_KEY is required');
}
const BASELINE_DIR = join(import.meta.dirname, '../../../../ContentBase/product/novel/baseline/bodies');

async function writesMutation(action, payload) {
  const res = await fetch(`${GATEWAY_URL}/writes/${action}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'authorization': `Bearer ${API_KEY}`,
      'x-database-idempotency-key': randomUUID(),
    },
    body: JSON.stringify({ actor: 'corpus-expansion-script', payload }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${action} failed: ${res.status} ${text.slice(0, 200)}`);
  }
  return res.json();
}

function extractParagraphs(text) {
  return text.split(/\n{2,}/).map(p => p.trim()).filter(p => p.length > 50);
}

function extractVocabulary(text) {
  const phrases = new Set();
  const fourCharPatterns = text.match(/[一-鿿]{4,8}/g) || [];
  for (const p of fourCharPatterns) {
    if (p.length >= 4 && p.length <= 8) phrases.add(p);
  }
  const quotedPhrases = text.match(/[「「"]([一-鿿\w，、；：]{2,20})[」」"]/g) || [];
  for (const q of quotedPhrases) {
    const inner = q.slice(1, -1).trim();
    if (inner.length >= 2 && inner.length <= 20) phrases.add(inner);
  }
  const verbNounPairs = text.match(/[一-鿿]{2,3}[了着过][一-鿿]{2,4}/g) || [];
  for (const vn of verbNounPairs) phrases.add(vn);
  return [...phrases].filter(p => {
    if (/^(这个|那个|一个|我们|他们|它们|自己|什么|怎么|如何|可以|已经|因为|所以|但是|然而|虽然|如果|不是|就是|只是|还是|或者|以及|而且|并且|同时|其中|之间|之后|之前|以后|以前|关于|对于|通过|根据|按照|由于|为了|除了)/.test(p)) return false;
    if (/^[一-鿿]$/.test(p)) return false;
    return true;
  });
}

async function main() {
  const files = readdirSync(BASELINE_DIR).filter(f => f.endsWith('.md')).sort();
  console.log(`Found ${files.length} baseline articles in ${BASELINE_DIR}`);

  let semanticCount = 0;
  let vocabCount = 0;
  const allVocab = new Set();

  for (const file of files) {
    const filePath = join(BASELINE_DIR, file);
    const content = readFileSync(filePath, 'utf-8').trim();
    const articleId = basename(file, '.md');
    console.log(`\n--- ${file} (${content.length} chars) ---`);

    const paragraphs = extractParagraphs(content);
    const bestParagraphs = paragraphs
      .filter(p => p.length > 100 && p.length < 2000)
      .slice(0, 8);

    for (let i = 0; i < bestParagraphs.length; i++) {
      const para = bestParagraphs[i];
      try {
        await writesMutation('record-semantic-reference-material', {
          materialKind: 'literary',
          sourceId: `baseline-article-${articleId}`,
          sourceTitle: `Baseline Article ${articleId} §${i + 1}`,
          sourceAuthor: 'ContentMRS',
          sourceLocator: `paragraph ${i + 1}`,
          excerpt: para.slice(0, 2000),
          summary: para.slice(0, 120),
          status: 'active',
          tags: [
            { layer: 'usable_for', value: 'author_corpus', description: 'Author writing sample from baseline generation' },
            { layer: 'style', value: 'narrative_essay', description: 'Narrative essay style sample' },
          ],
        });
        semanticCount++;
      } catch (err) {
        console.error(`  [semantic] ${err.message}`);
      }
    }
    console.log(`  imported ${bestParagraphs.length} paragraphs as semantic units`);

    const vocab = extractVocabulary(content);
    for (const term of vocab) {
      allVocab.add(term);
    }
  }

  console.log(`\n--- Importing ${allVocab.size} unique vocabulary terms ---`);
  const vocabArray = [...allVocab];
  for (let i = 0; i < vocabArray.length; i++) {
    const term = vocabArray[i];
    try {
      await writesMutation('upsert-vocabulary-item', {
        content: term,
        type: 'author-extracted',
        category: 'baseline-article',
        note: 'Auto-extracted from baseline article corpus',
        tags: ['author-corpus', 'auto-extracted'],
      });
      vocabCount++;
      if (vocabCount % 100 === 0) process.stdout.write(`  ${vocabCount}/${vocabArray.length}\n`);
    } catch (err) {
      if (!err.message.includes('409')) {
        console.error(`  [vocab] ${term}: ${err.message}`);
      }
    }
  }

  console.log(`\n=== Done ===`);
  console.log(`Semantic units imported: ${semanticCount}`);
  console.log(`Vocabulary terms imported: ${vocabCount}`);
}

main().catch(err => { console.error(err); process.exit(1); });
