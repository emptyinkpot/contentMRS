#!/usr/bin/env node
/**
 * Export latent MVP training corpus from acceptance/runtime traces.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const defaultAcceptanceDir = path.join(root, 'ContentBase', 'product', 'novel', '.runtime', 'acceptance');
const defaultOutDir = path.join(root, 'training', 'latent-mvp', 'data');
const defaultXingwangMd = 'E:\\Vaults\\Obsidian\\docs\\books\\兴亡的世界史全21卷.md';
const defaultKinkakujiEpub = 'C:\\Users\\ASUS-KL\\Downloads\\金阁寺.epub';
const defaultExtraLiteraryEpubs = [
  'C:\\Users\\ASUS-KL\\Downloads\\兴亡的世界史全21卷.epub',
  'C:\\Users\\ASUS-KL\\Downloads\\川端康成必讀套裝：雪國+古都+千羽鶴+伊豆的舞女+花未眠+美麗與哀愁+花之圓舞曲（全7冊）（50週年紀念珍藏版！諾貝爾文學獎得主，日式東方美學標杆！細膩到揪心、美得令人窒息的川端康成文學世界，學者型翻譯名家陳德文9分譯本）.epub',
  'C:\\Users\\ASUS-KL\\Downloads\\石黑一雄作品集全套5册.epub',
  'C:\\Users\\ASUS-KL\\Downloads\\宫崎市定中国史【豆瓣8.1分！史学泰斗、“汉学诺贝尔奖”儒莲奖得主宫崎市定核心著作，写给普通读者的通识经典！旁观者的视角，世界史的立场，展现不一样的中国历史脉络！】.epub',
  'C:\\Users\\ASUS-KL\\Downloads\\禹域鸿爪（日本东洋学京都学派创始人之一，著名日本汉学家内藤湖南著。与严复、文廷式、张元济畅谈中国政治的笔谈实录）【东瀛文人·印象中国】.epub',
  'C:\\Users\\ASUS-KL\\Downloads\\紫图经典文库：三岛由纪夫大合集（全10册）（诺奖三度提名;世纪天才;“文艺青年之神”——必读的三岛由纪夫9大经典力作：极限写作五部曲+20世纪的文学奇迹：《丰饶之海》四部曲，权威译者陈德文译本2021全新修订！）.epub',
  'C:\\Users\\ASUS-KL\\Downloads\\夏目漱石爱情三部曲.epub',
  'C:\\Users\\ASUS-KL\\Downloads\\『夏目漱石全集・122作品⇒1冊』.epub',
  'C:\\Users\\ASUS-KL\\Downloads\\太宰治【极致典藏系列 人间失格 晚年 斜阳 御伽草纸 维庸之妻 奔跑吧,梅勒斯】（6册套装）.epub',
  'C:\\Users\\ASUS-KL\\Downloads\\我的前半生.epub',
  'C:\\Users\\ASUS-KL\\Downloads\\支那革命的真相：來自日本的視角與立場  支那革命外史.epub',
  'C:\\Users\\ASUS-KL\\Downloads\\僕の見た「大日本帝国」.epub',
  'C:\\Users\\ASUS-KL\\Downloads\\東条英機 大日本帝国に殉じた男 (PHP文庫).epub',
  'E:\\Pixcall_同步\\EPUB\\通往文明的阶梯·甲骨文中国史系列精选集（全10册） ，。 (甲骨文系列) ( etc.) (z-library.sk, 1lib.sk, z-lib.sk).epub',
  'E:\\Pixcall_同步\\EPUB\\支那革命的真相：來自日本的視角與立場 = 支那革命外史 (北一輝 著  董炯明, 王敬翔 譯) (z-library.sk, 1lib.sk, z-lib.sk).epub',
  'E:\\Pixcall_同步\\EPUB\\欧洲史选集（套装共7册） (艾瑞克·霍布斯鲍姆, 查尔斯·埃默森, 伊斯特万·迪克, 西恩·麦克米金) (z-library.sk, 1lib.sk, z-lib.sk).epub',
  'C:\\Users\\ASUS-KL\\Downloads\\民国时权威的《鲁迅全集》！（全20册）（收录鲁迅一生全部作品，完全无删改，原汁原味鲁迅的文字！1938年“鲁迅先生纪念委员会”编印版。简体横排，权威定本！市面上最通俗好读的鲁迅版本！）.epub',
];
const defaultExtraLiteraryTextDir = path.join(root, 'training', 'latent-mvp', 'external', 'book-text-cache');
const requireFromRoot = createRequire(import.meta.url);

const args = parseArgs(process.argv.slice(2));
const acceptanceDir = path.resolve(args.acceptanceDir || defaultAcceptanceDir);
const outDir = path.resolve(args.outputDir || defaultOutDir);
const limit = Number(args.limit || 0);
const trainRatio = clampRatio(Number(args.trainRatio || 0.8), 0.8);
const valRatio = clampRatio(Number(args.valRatio || 0.1), 0.1);
const includeAcceptance = args.includeAcceptance !== 'false';
const includeLocalBooks = args.includeLocalBooks !== 'false';
const xingwangMd = path.resolve(args.xingwangMd || defaultXingwangMd);
const kinkakujiEpub = path.resolve(args.kinkakujiEpub || defaultKinkakujiEpub);
const extraLiteraryEpubs = parsePathList(args.extraLiteraryEpubs || defaultExtraLiteraryEpubs.join('|'));
const extraLiteraryTexts = parsePathList(args.extraLiteraryTexts || defaultTextCacheList(defaultExtraLiteraryTextDir).join('|'));
const xingwangLimit = clampInt(Number(args.xingwangLimit || 2500), 2500, 0, 100000);
const kinkakujiRawLimit = clampInt(Number(args.kinkakujiRawLimit || 1200), 1200, 0, 10000);
const extraLiteraryLimit = clampInt(Number(args.extraLiteraryLimit || 6000), 6000, 0, 100000);
const xingwangChunkTarget = clampInt(Number(args.xingwangChunkTarget || 700), 700, 200, 5000);
const xingwangChunkMax = clampInt(Number(args.xingwangChunkMax || 1200), 1200, 300, 8000);
const kinkakujiChunkTarget = clampInt(Number(args.kinkakujiChunkTarget || 350), 350, 120, 3000);
const kinkakujiChunkMax = clampInt(Number(args.kinkakujiChunkMax || 650), 650, 180, 5000);

if (includeAcceptance && !fs.existsSync(acceptanceDir)) {
  throw new Error(`acceptance dir not found: ${acceptanceDir}`);
}

const files = includeAcceptance
  ? fs.readdirSync(acceptanceDir)
    .filter((name) => name.endsWith('.json'))
    .sort((a, b) => fs.statSync(path.join(acceptanceDir, b)).mtimeMs - fs.statSync(path.join(acceptanceDir, a)).mtimeMs)
  : [];

const samples = [];
if (includeAcceptance) {
  for (const file of files) {
    const payload = readJson(path.join(acceptanceDir, file));
    if (!payload) continue;
    collectFromPayload(payload, file, samples);
    if (limit > 0 && samples.length >= limit) break;
  }
}
if (includeLocalBooks) {
  collectXingwangPositives({
    filePath: xingwangMd,
    limit: xingwangLimit,
    targetChars: xingwangChunkTarget,
    maxChars: xingwangChunkMax,
    sink: samples,
  });
  collectKinkakujiRawPositives({
    filePath: kinkakujiEpub,
    limit: kinkakujiRawLimit,
    targetChars: kinkakujiChunkTarget,
    maxChars: kinkakujiChunkMax,
    sink: samples,
  });
  collectExtraLiteraryEpubPositives({
    filePaths: extraLiteraryEpubs,
    limitPerBook: extraLiteraryLimit,
    targetChars: kinkakujiChunkTarget,
    maxChars: kinkakujiChunkMax,
    sink: samples,
  });
  collectExtraLiteraryTextPositives({
    filePaths: extraLiteraryTexts,
    limitPerBook: extraLiteraryLimit,
    targetChars: kinkakujiChunkTarget,
    maxChars: kinkakujiChunkMax,
    sink: samples,
  });
}

const deduped = dedupe(samples);
if (!deduped.length) {
  throw new Error('no latent samples extracted');
}

const split = splitByHash(deduped, trainRatio, valRatio);
fs.mkdirSync(outDir, { recursive: true });
writeJsonl(path.join(outDir, 'samples.jsonl'), deduped);
writeJsonl(path.join(outDir, 'train.jsonl'), split.train);
writeJsonl(path.join(outDir, 'val.jsonl'), split.val);
writeJsonl(path.join(outDir, 'test.jsonl'), split.test);

const summary = {
  version: 'latent-mvp-corpus.v1',
  generatedAt: new Date().toISOString(),
  acceptanceDir,
  scannedFiles: files.length,
  samples: deduped.length,
  labelCounts: countBy(deduped, (row) => String(row.label)),
  taskKinds: countBy(deduped, (row) => String(row.taskKind || 'unknown')),
  positiveSources: countBy(deduped.filter((row) => row.label === 1), (row) => String(row.sourceId || 'unknown')),
  negativeSources: countBy(deduped.filter((row) => row.label === 0), (row) => String(row.sourceId || 'unknown')),
  train: split.train.length,
  val: split.val.length,
  test: split.test.length,
  trainRatio,
  valRatio,
};
fs.writeFileSync(path.join(outDir, 'summary.json'), JSON.stringify(summary, null, 2), 'utf8');
console.log(JSON.stringify(summary, null, 2));

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) out[key] = true;
    else {
      out[key] = next;
      i += 1;
    }
  }
  return out;
}

function parsePathList(value) {
  return String(value || '')
    .split('|')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => path.resolve(item));
}

function defaultTextCacheList(dirPath) {
  if (!fs.existsSync(dirPath)) return [];
  return fs.readdirSync(dirPath)
    .filter((name) => name.toLowerCase().endsWith('.txt'))
    .map((name) => path.join(dirPath, name));
}

function clampRatio(value, fallback) {
  if (!Number.isFinite(value) || value <= 0 || value >= 1) return fallback;
  return value;
}

function clampInt(value, fallback, min, max) {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(value)));
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function collectFromPayload(payload, fileName, sink) {
  const topic = String(
    payload.topic
    || payload.centralClaim
    || payload.input?.topic
    || payload.request?.topic
    || payload.result?.topic
    || ''
  ).trim();
  const profile = String(payload.profile || 'unknown').trim();
  const status = String(payload.status || '').trim().toLowerCase();
  const runtimeStep = Array.isArray(payload.steps)
    ? payload.steps.find((step) => step?.step === 'runtime.generate.article')
    : null;
  const qualityBlocks = Number(runtimeStep?.qualityBlockCount || 0);
  const coverage = Number(runtimeStep?.referenceCoverageScore || 0);

  const pack = payload.pack || payload.evidencePack || payload.trace?.evidencePack || payload.result?.trace?.evidencePack;
  if (!pack || !Array.isArray(pack.chunks)) return;

  for (const chunk of pack.chunks) {
    const text = String(chunk?.text || chunk?.excerpt || '').trim();
    if (!text) continue;
    const meta = chunk?.metadata && typeof chunk.metadata === 'object' ? chunk.metadata : {};
    const vector = Number(meta.vectorSimilarity ?? meta.vector_similarity ?? 0) || 0;
    const fused = Number(meta.fusedRelevanceScore ?? meta.fused_relevance_score ?? 0) || 0;
    const relevance = Number(chunk?.relevanceScore || 0) || 0;
    const provider = String(meta.provider || '').toLowerCase();
    const sourceId = String(chunk?.sourceId || meta.sourceId || meta.source_id || '').trim();

    const label = decideLabel({
      vector,
      fused,
      relevance,
      provider,
      qualityBlocks,
      coverage,
      status,
    });
    if (!label && shouldSkipAmbiguousNegative({ text, provider, sourceId })) {
      continue;
    }

    sink.push({
      sampleId: hash(`${fileName}:${chunk?.id || text.slice(0, 80)}:${topic}`),
      sourceFile: fileName,
      topic,
      profile,
      provider,
      taskKind: label ? 'accepted_evidence_positive' : 'generated_trace_negative',
      sourceId,
      text,
      features: {
        vectorSimilarity: vector,
        fusedRelevance: fused,
        relevanceScore: relevance,
        qualityBlockCount: qualityBlocks,
        referenceCoverageScore: coverage,
      },
      label,
    });
  }
}

function decideLabel(input) {
  const vectorGood = input.vector >= 0.5;
  const fusedGood = input.fused >= 55 || input.relevance >= 65;
  const qualityGood = input.qualityBlocks <= 0;
  const coverageGood = input.coverage <= 0 || input.coverage >= 60;
  const providerGood = input.provider.includes('ragflow') || input.provider.includes('semantic');
  const passed = input.status === 'passed';
  return vectorGood || (fusedGood && providerGood && qualityGood && coverageGood && passed) ? 1 : 0;
}

function shouldSkipAmbiguousNegative(input) {
  const text = String(input.text || '').trim();
  if (text.length < 80) return true;
  const sourceId = String(input.sourceId || '').toLowerCase();
  const provider = String(input.provider || '').toLowerCase();
  if (/book_xingwang|xingwang|world_history/.test(sourceId)) return true;
  if (/(ragflow|semantic|sd_|sem_ref)/.test(`${provider} ${sourceId}`) && isGoodXingwangReasoningChunk(text)) return true;
  return false;
}

function collectXingwangPositives(input) {
  if (input.limit <= 0 || !fs.existsSync(input.filePath)) return;
  const raw = fs.readFileSync(input.filePath, 'utf8');
  const chunks = chunkText(cleanMarkdownBookText(raw), input.targetChars || 700, input.maxChars || 1200)
    .filter((text) => isGoodXingwangReasoningChunk(text))
    .slice(0, input.limit);
  const topics = [
    '文明史 制度演化 长时段判断 材料推进',
    '历史论述中的制度词 结构判断 因果推进',
    '兴亡的世界史 原文 长时段叙述 冷峻判断',
    '国家 社会 宗教 贸易 战争 城市的历史关系',
    '用史书材料触发议论和散文判断',
  ];
  for (let index = 0; index < chunks.length; index += 1) {
    const text = chunks[index];
    input.sink.push({
      sampleId: hash(`xingwang:${index}:${text.slice(0, 100)}`),
      sourceFile: input.filePath,
      sourceId: 'book_xingwang_world_history_21',
      topic: topics[index % topics.length],
      profile: 'historical_reasoning',
      provider: 'local.book_corpus',
      taskKind: 'historical_reasoning_positive',
      text,
      features: {
        vectorSimilarity: 0.82,
        fusedRelevance: 92,
        relevanceScore: 92,
        qualityBlockCount: 0,
        referenceCoverageScore: 85,
        styleSignal: 0.35,
        factSignal: 0.9,
      },
      label: 1,
    });
  }
}

function collectKinkakujiRawPositives(input) {
  if (input.limit <= 0 || !fs.existsSync(input.filePath)) return;
  const chunks = chunkText(expandLongParagraphs(readEpubParagraphs(input.filePath)).join('\n\n'), input.targetChars || 350, input.maxChars || 650)
    .filter((text) => isGoodKinkakujiRawChunk(text))
    .slice(0, input.limit);
  const topics = [
    '金阁寺 原文 句法节奏 物象推进 心理压力 冷感抒情',
    '文学原文中的长句压力 身体感知 光影和建筑意象',
    '三岛式段落推进 欲望 羞耻 美感和冷静叙述',
    '原文风格样本 物象到心理的转折',
    '散文写作可借鉴的文学节奏和感受密度',
  ];
  for (let index = 0; index < chunks.length; index += 1) {
    const text = chunks[index];
    input.sink.push({
      sampleId: hash(`kinkakuji-raw:${index}:${text.slice(0, 100)}`),
      sourceFile: input.filePath,
      sourceId: 'book_kinkakuji_raw',
      topic: topics[index % topics.length],
      profile: 'literary_style_raw',
      provider: 'local.book_corpus',
      taskKind: 'kinkakuji_raw_literary_positive',
      text,
      features: {
        vectorSimilarity: 0.8,
        fusedRelevance: 90,
        relevanceScore: 90,
        qualityBlockCount: 0,
        referenceCoverageScore: 80,
        styleSignal: 0.98,
        factSignal: 0.1,
      },
      label: 1,
    });
  }
}

function collectExtraLiteraryEpubPositives(input) {
  for (const filePath of input.filePaths) {
    if (!filePath || !fs.existsSync(filePath)) continue;
    const bookId = literaryBookId(filePath);
    const chunks = chunkText(expandLongParagraphs(readEpubParagraphs(filePath)).join('\n\n'), input.targetChars || 350, input.maxChars || 650)
      .filter((text) => isGoodLiteraryRawChunk(text))
      .slice(0, input.limitPerBook);
    for (let index = 0; index < chunks.length; index += 1) {
      const text = chunks[index];
      input.sink.push({
        sampleId: hash(`${bookId}:${index}:${text.slice(0, 100)}`),
        sourceFile: filePath,
        sourceId: bookId,
        topic: extraLiteraryTopic(bookId, index),
        profile: 'literary_style_raw',
        provider: 'local.book_corpus',
        taskKind: 'extra_literary_raw_positive',
        text,
        features: {
          vectorSimilarity: 0.78,
          fusedRelevance: 88,
          relevanceScore: 88,
          qualityBlockCount: 0,
          referenceCoverageScore: 78,
          styleSignal: 0.92,
          factSignal: 0.12,
        },
        label: 1,
      });
    }
  }
}

function collectExtraLiteraryTextPositives(input) {
  for (const filePath of input.filePaths) {
    if (!filePath || !fs.existsSync(filePath)) continue;
    const bookId = literaryBookId(filePath);
    const raw = fs.readFileSync(filePath, 'utf8');
    const chunks = chunksForBookText(bookId, raw, input.targetChars || 350, input.maxChars || 650)
      .filter((text) => isGoodLiteraryRawChunk(text))
      .slice(0, input.limitPerBook);
    for (let index = 0; index < chunks.length; index += 1) {
      const text = chunks[index];
      input.sink.push({
        sampleId: hash(`${bookId}:${index}:${text.slice(0, 100)}`),
        sourceFile: filePath,
        sourceId: bookId,
        topic: extraLiteraryTopic(bookId, index),
        profile: 'literary_style_raw',
        provider: 'local.book_corpus',
        taskKind: 'extra_literary_raw_positive',
        text,
        features: {
          vectorSimilarity: 0.78,
          fusedRelevance: 88,
          relevanceScore: 88,
          qualityBlockCount: 0,
          referenceCoverageScore: 78,
          styleSignal: 0.88,
          factSignal: 0.2,
        },
        label: 1,
      });
    }
  }
}

function chunksForBookText(bookId, raw, targetChars, maxChars) {
  const cleaned = cleanPlainBookText(raw);
  if (bookId === 'book_quan_tangshi_raw') {
    return chunkClassicalPoetry(cleaned, targetChars, maxChars);
  }
  return chunkText(cleaned, targetChars, maxChars);
}

function chunkClassicalPoetry(text, targetChars, maxChars) {
  const lines = String(text || '')
    .split(/\n+/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  const units = [];
  let current = '';
  for (const line of lines) {
    if (/^(全唐诗|唐代诗人|简介|卷[一二三四五六七八九十百千万\d]+)$/.test(line)) {
      if (current) {
        units.push(current);
        current = '';
      }
      continue;
    }
    const startsPoem = /^卷\d+_\d+\s*【/.test(line) || /^【[^】]{1,80}】/.test(line);
    if (startsPoem && current) {
      units.push(current);
      current = '';
    }
    current = current ? `${current}\n${line}` : line;
    if (current.length >= maxChars) {
      units.push(current);
      current = '';
    }
  }
  if (current) units.push(current);
  const chunks = [];
  current = '';
  for (const unit of units.filter(isClassicalPoetryUnit)) {
    if (current && current.length + unit.length + 2 > maxChars) {
      chunks.push(current);
      current = '';
    }
    current = current ? `${current}\n\n${unit}` : unit;
    if (current.length >= targetChars) {
      chunks.push(current);
      current = '';
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

function isClassicalPoetryUnit(text) {
  const value = String(text || '').trim();
  if (value.length < 20) return false;
  if (/版权|ISBN|目录|出版|http|www\.|简介 《全唐诗》/i.test(value)) return false;
  return /[，。！？；]/.test(value);
}

function literaryBookId(filePath) {
  const base = path.basename(String(filePath || '')).toLowerCase();
  if (base.includes('兴亡') || base.includes('興亡') || base.includes('world_history')) return 'book_xingwang_world_history_21';
  if (base.includes('川端') || base.includes('kawabata')) return 'book_kawabata_collection_raw';
  if (base.includes('石黑') || base.includes('ishiguro')) return 'book_ishiguro_collection_raw';
  if (base.includes('宫崎') || base.includes('宮崎') || base.includes('miyazaki')) return 'book_miyazaki_history_raw';
  if (base.includes('内藤湖南')) return 'book_naito_konan_raw';
  if (base.includes('naito_konan')) return 'book_naito_konan_raw';
  if (base.includes('禹域鸿爪') || base.includes('禹域鴻爪')) return 'book_yuyuhongzhao_raw';
  if (base.includes('东瀛文人') || base.includes('東瀛文人') || base.includes('dongying_wenren')) return 'book_dongying_wenren_raw';
  if (base.includes('三岛') || base.includes('三島') || base.includes('鲜花盛开的森林') || base.includes('mishima')) return 'book_mishima_collection_raw';
  if (base.includes('夏目漱石') || base.includes('natsume_soseki')) return 'book_natsume_soseki_raw';
  if (base.includes('太宰治')) return 'book_dazai_osamu_raw';
  if (base.includes('坂口安吾') || base.includes('sakaguchi_ango')) return 'book_sakaguchi_ango_raw';
  if (base.includes('我的前半生')) return 'book_puyi_memoir_raw';
  if (base.includes('支那革命') || base.includes('革命外史')) return 'book_shina_revolution_gaishi_raw';
  if (base.includes('通往文明的阶梯') || base.includes('甲骨文中国史')) return 'book_oracle_chinese_history_raw';
  if (base.includes('欧洲史选集')) return 'book_european_history_selection_raw';
  if (base.includes('僕の見た') || base.includes('大日本帝国')) return 'book_japanese_empire_observation_raw';
  if (base.includes('東条英機') || base.includes('东条英机')) return 'book_tojo_hideki_raw';
  if (base.includes('北一辉') || base.includes('北一輝') || base.includes('日本改造法案') || base.includes('kita_ikki')) return 'book_kita_ikki_raw';
  if (base.includes('塞外史地') || base.includes('saiwai_shidi')) return 'book_saiwai_shidi_raw';
  if (base.includes('鲁迅') || base.includes('魯迅') || base.includes('luxun')) return 'book_luxun_complete_raw';
  if (base.includes('全唐诗') || base.includes('全唐詩') || base.includes('quan_tangshi')) return 'book_quan_tangshi_raw';
  if (base.includes('马克思恩格斯') || base.includes('馬克思恩格斯') || base.includes('marx_engels')) return 'book_marx_engels_vol32_raw';
  if (base.includes('资本论') || base.includes('資本論') || base.includes('capital_vol')) return 'book_capital_raw';
  if (base.includes('朝鲜通史') || base.includes('朝鮮通史') || base.includes('korea_general_history')) return 'book_korea_general_history_raw';
  if (base.includes('围城') || base.includes('圍城') || base.includes('fortress_besieged')) return 'book_fortress_besieged_raw';
  if (base.includes('资治通鉴') || base.includes('資治通鑑') || base.includes('zizhi_tongjian')) return 'book_zizhi_tongjian_raw';
  return `book_extra_literary_${hash(base).slice(0, 10)}`;
}

function extraLiteraryTopic(bookId, variant) {
  const map = {
    book_kawabata_collection_raw: [
      '川端康成 原文 细腻感受 物象审美 东方美学',
      '雪国 古都 千羽鹤 伊豆的舞女 文学原文 风景与感受',
      '日式抒情 轻微动作 情绪留白 句法节奏',
      '细腻到揪心的感官描写和心理波纹',
    ],
    book_ishiguro_collection_raw: [
      '石黑一雄 原文 记忆 叙述克制 情感延迟',
      '文学原文 不可靠叙述 回忆结构 低温情绪',
      '克制叙事 身份 记忆 道德迟疑',
      '现代小说段落推进和潜台词',
    ],
    book_miyazaki_history_raw: [
      '宫崎市定 中国史 原文 世界史立场 通识历史脉络',
      '中国史 旁观者视角 制度与时代判断',
      '汉学史学原文 历史叙述和结构分析',
      '亚洲史 中国史 长时段史论材料',
    ],
    book_naito_konan_raw: [
      '内藤湖南 原文 亚洲再生 汉学 政治思想',
      '京都学派 东洋史 中国政治和文化判断',
      '近代日本汉学 原文 历史思想和亚洲论',
    ],
    book_yuyuhongzhao_raw: [
      '禹域鸿爪 原文 中国政治笔谈 东洋学观察',
      '内藤湖南 印象中国 汉学家现场记录',
      '晚清中国 政治文化 旅行笔谈原文',
    ],
    book_dongying_wenren_raw: [
      '东瀛文人印象中国 原文 游记 现场观察',
      '日本文人 中国经验 城市 风俗 文学观察',
      '芥川 谷崎 佐藤春夫 游历中国原文',
    ],
    book_mishima_collection_raw: [
      '三岛由纪夫 原文 极限写作 美 身体 死 羞耻',
      '三岛文学原文 句法压力 物象 心理和毁灭感',
      '丰饶之海 短篇小说 文学节奏和冷感抒情',
    ],
    book_natsume_soseki_raw: [
      '夏目漱石 原文 个人心理 爱情 人性观察',
      '日本近代文学 心理描写 关系和自我意识',
      '夏目漱石小说原文 情感冲突和叙述节奏',
    ],
    book_dazai_osamu_raw: [
      '太宰治 原文 无赖派 自我厌恶 羞耻 颓败感',
      '人间失格 斜阳 晚年 原文 破碎自白和心理阴影',
      '日本近代文学 原文 私小说语气和冷感幽默',
    ],
    book_sakaguchi_ango_raw: [
      '坂口安吾 原文 无赖派 推理小说 犯罪和现代性',
      '日本战后文学 原文 侦探叙事 阴影和反秩序感',
      '坂口安吾短篇 原文 冷幽默 破格人物和悬疑节奏',
    ],
    book_puyi_memoir_raw: [
      '我的前半生 原文 近代中国 宫廷记忆 政治变迁',
      '溥仪回忆录 原文 制度崩塌 个人命运 历史证词',
      '历史当事人叙述 原文 权力 衰败和时代转折',
    ],
    book_shina_revolution_gaishi_raw: [
      '支那革命外史 原文 日本视角 中国革命 近代政治',
      '近代日本观察中国 原文 革命 政局和东亚秩序',
      '东亚近代史 原文 政治判断和外部视角',
    ],
    book_oracle_chinese_history_raw: [
      '甲骨文中国史 原文 中国史 长时段制度和文明阶梯',
      '通往文明的阶梯 原文 中国历史 社会结构和文化变迁',
      '中国史精选集 原文 王朝 制度 地理和文明叙述',
    ],
    book_european_history_selection_raw: [
      '欧洲史选集 原文 现代欧洲 革命 帝国和战争',
      '霍布斯鲍姆 欧洲史 原文 长十九世纪 民族和资本主义',
      '欧洲近现代史 原文 政治秩序 战争和社会转型',
    ],
    book_japanese_empire_observation_raw: [
      '大日本帝国观察 原文 帝国经验 近代日本 战争记忆',
      '日本帝国史 原文 殖民地 统治经验和历史反思',
      '东亚帝国秩序 原文 现场观察和政治记忆',
    ],
    book_tojo_hideki_raw: [
      '东条英机 原文 日本战争政治 军国主义 传记材料',
      '大日本帝国 原文 战争责任 国家机器和人物命运',
      '近代日本政治人物 原文 帝国崩坏和战争叙述',
    ],
    book_kita_ikki_raw: [
      '北一辉 日本改造法案 原文 政治思想 戏剧文本',
      '近代日本政治思想 国家改造 革命语言',
    ],
    book_saiwai_shidi_raw: [
      '塞外史地论文译丛 原文 边疆史地 海外汉学',
      '近代海外汉学 史地论文 边疆与亚洲史材料',
    ],
    book_luxun_complete_raw: [
      '鲁迅全集 原文 小说 杂文 讽刺 批判和冷峻判断',
      '鲁迅原文 议论与小说互通 短句 针砭和人物观察',
      '现代中文原文 杂文锋利度 白话节奏 社会批判',
      '鲁迅小说散文杂文 原文 讽刺 冷幽默和思想密度',
    ],
    book_quan_tangshi_raw: [
      '全唐诗 原文 古典诗歌 意象 节奏和凝练表达',
      '唐诗原文 山水 边塞 宫廷 送别和身体感受',
      '古典中文诗性材料 对仗 声律 物象和情绪压缩',
      '唐代诗歌总集 原文 意象组合和短句密度',
    ],
    book_marx_engels_vol32_raw: [
      '马克思恩格斯全集 原文 资本论手稿 政治经济学和批判逻辑',
      '政治经济学原文 概念辨析 资本 劳动 价值和社会关系',
      '马克思恩格斯 原文 长句论证 概念推进和批判结构',
    ],
    book_zizhi_tongjian_raw: [
      '资治通鉴 原文 编年叙事 政治判断 权力和因果',
      '古典史书原文 君臣 战争 制度 人物决断和史论',
      '资治通鉴卷一二四至一五五 原文 南北朝政治叙事',
    ],
    book_capital_raw: [
      '资本论 原文 政治经济学 概念推进 资本 劳动和价值',
      '马克思 资本论 原文 长句论证 批判逻辑和社会关系',
      '政治经济学批判 原文 商品 货币 剩余价值和生产关系',
    ],
    book_korea_general_history_raw: [
      '朝鲜通史 原文 东亚史 朝鲜半岛 古代近代社会变迁',
      '朝鲜历史 原文 政治制度 民族 国家和社会结构',
      '东北亚历史材料 原文 长时段叙述和历史判断',
    ],
    book_fortress_besieged_raw: [
      '围城 原文 现代中文小说 讽刺 知识分子和心理观察',
      '钱钟书 原文 幽默 比喻 关系描写和社会讽刺',
      '现代小说原文 机锋 人情世故 对话和叙事节奏',
    ],
  };
  const topics = map[bookId] || ['文学原文 句法节奏 感受密度 段落推进'];
  return topics[variant % topics.length];
}

function isGoodLiteraryRawChunk(text) {
  const value = String(text || '').trim();
  if (value.length < 100) return false;
  if (/Document generated by Anna.?s Archive|pdg_main_pages_found|pdf_generation_missing_pages|losslessly embedded/i.test(value)) return false;
  if (/版权|ISBN|目录|译者|出版|http|www\.|电子书|图书在版编目/i.test(value)) return false;
  if (isClassicalPoetryChunk(value)) return true;
  return /[。！？]/.test(value);
}

function cleanMarkdownBookText(raw) {
  return String(raw || '')
    .split(/\r?\n/)
    .filter((line) => {
      const trimmed = line.trim();
      if (!trimmed) return true;
      if (/^!\[/.test(trimmed)) return false;
      if (/^>\s*备注：/.test(trimmed)) return false;
      return true;
    })
    .join('\n')
    .replace(/\\$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function cleanPlainBookText(raw) {
  return String(raw || '')
    .replace(/\r/g, '')
    .replace(/[ \t\f\v]+/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function chunkText(text, targetChars, maxChars) {
  const paragraphs = splitToChunkableUnits(text)
    .map((item) => item.replace(/\s+/g, ' ').trim())
    .filter((item) => item.length >= 20);
  const chunks = [];
  let current = '';
  for (const paragraph of paragraphs) {
    if (current && current.length + paragraph.length + 2 > maxChars) {
      chunks.push(current);
      current = '';
    }
    current = current ? `${current}\n\n${paragraph}` : paragraph;
    if (current.length >= targetChars) {
      chunks.push(current);
      current = '';
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

function splitToChunkableUnits(text) {
  const paragraphs = String(text || '')
    .split(/\n{2,}/)
    .map((item) => item.replace(/\s+/g, ' ').trim())
    .filter((item) => item.length >= 40);
  const units = [];
  for (const paragraph of paragraphs) {
    if (paragraph.length <= 260) {
      units.push(paragraph);
      continue;
    }
    const sentences = paragraph.split(/(?<=[。！？!?；;])/)
      .map((item) => item.trim())
      .filter((item) => item.length >= 8);
    if (sentences.length <= 1) {
      for (let index = 0; index < paragraph.length; index += 220) {
        units.push(paragraph.slice(index, index + 260));
      }
      continue;
    }
    units.push(...sentences);
  }
  return units;
}

function isGoodXingwangReasoningChunk(text) {
  const value = String(text || '');
  if (value.length < 100) return false;
  if (/!\[|备注：原书插图|目录|版权|ISBN|http|www\./i.test(value)) return false;
  const reasoningSignals = [
    /文明|制度|国家|帝国|社会|阶层|宗教|贸易|战争|城市|殖民|革命/,
    /因此|不过|另一方面|换句话说|相较|反观|所谓|可说|重要的是|由此/,
    /历史|时代|空间|结构|权力|秩序|关系|变化|原因|结果/,
  ];
  return reasoningSignals.filter((pattern) => pattern.test(value)).length >= 2;
}

function isGoodKinkakujiRawChunk(text) {
  const value = String(text || '').trim();
  if (value.length < 100) return false;
  if (/版权|ISBN|目录|译者|出版|http|www\.|电子书/i.test(value)) return false;
  return /[。！？]/.test(value);
}

function isClassicalPoetryChunk(text) {
  const value = String(text || '').trim();
  if (value.length < 60) return false;
  if (/卷\d+_|【[^】]{1,80}】|全唐诗/.test(value) && /[，。！？；]/.test(value)) return true;
  const compactLines = value.split(/\n+/).map((line) => line.trim()).filter((line) => line.length >= 4);
  return compactLines.length >= 4 && /[，。！？；]/.test(value) && !/[a-zA-Z]{20,}/.test(value);
}

function readEpubParagraphs(filePath) {
  const AdmZip = requireFromRoot('../DataBase/apps/gateway/node_modules/adm-zip');
  const zip = new AdmZip(fs.readFileSync(filePath));
  const container = readZipText(zip, 'META-INF/container.xml');
  const rootfile = container.match(/full-path=["']([^"']+)["']/i)?.[1];
  if (!rootfile) return [];
  const opf = readZipText(zip, rootfile);
  const base = dirnamePosix(rootfile);
  const manifest = new Map();
  for (const match of opf.matchAll(/<item\b([^>]+)>/gi)) {
    const attrs = match[1];
    const id = attrs.match(/\bid=["']([^"']+)["']/i)?.[1];
    const href = attrs.match(/\bhref=["']([^"']+)["']/i)?.[1];
    const mediaType = attrs.match(/\bmedia-type=["']([^"']+)["']/i)?.[1] || '';
    if (id && href) manifest.set(id, { href: joinPosix(base, href), mediaType });
  }
  const spineIds = Array.from(opf.matchAll(/<itemref\b([^>]+)>/gi))
    .map((match) => match[1].match(/\bidref=["']([^"']+)["']/i)?.[1])
    .filter(Boolean);
  const paragraphs = [];
  for (const id of spineIds) {
    const item = manifest.get(id);
    if (!item || !/(xhtml|html|xml)/i.test(item.mediaType || item.href)) continue;
    const text = stripXmlText(readZipText(zip, item.href));
    for (const paragraph of text.split(/\n{2,}/)) {
      const normalized = paragraph.replace(/\s+/g, ' ').trim();
      if (normalized) paragraphs.push(normalized);
    }
  }
  return paragraphs;
}

function expandLongParagraphs(paragraphs) {
  const out = [];
  for (const paragraph of paragraphs) {
    const value = String(paragraph || '').replace(/\s+/g, ' ').trim();
    if (!value) continue;
    if (value.length <= 700) {
      out.push(value);
      continue;
    }
    const sentences = value.split(/(?<=[。！？!?])/).map((item) => item.trim()).filter(Boolean);
    let current = '';
    for (const sentence of sentences) {
      if (current && current.length + sentence.length > 520) {
        out.push(current);
        current = '';
      }
      current = current ? `${current}${sentence}` : sentence;
    }
    if (current) out.push(current);
  }
  return out;
}

function readZipText(zip, filePath) {
  const entry = zip.getEntry(filePath);
  return entry ? entry.getData().toString('utf8') : '';
}

function stripXmlText(raw) {
  return decodeXmlEntities(String(raw || '')
    .replace(/<\s*(script|style)[\s\S]*?<\s*\/\s*\1\s*>/gi, ' ')
    .replace(/<\s*br\s*\/?\s*>/gi, '\n')
    .replace(/<\/\s*(p|div|section|article|h1|h2|h3|h4|h5|h6|li)\s*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[ \t\f\v]+/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n'))
    .trim();
}

function decodeXmlEntities(text) {
  const named = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
  return String(text || '').replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (match, entity) => {
    if (entity.startsWith('#x')) return String.fromCodePoint(Number.parseInt(entity.slice(2), 16));
    if (entity.startsWith('#')) return String.fromCodePoint(Number.parseInt(entity.slice(1), 10));
    return Object.prototype.hasOwnProperty.call(named, entity) ? named[entity] : match;
  });
}

function dirnamePosix(filePath) {
  const normalized = String(filePath || '').replace(/\\/g, '/');
  const index = normalized.lastIndexOf('/');
  return index >= 0 ? normalized.slice(0, index + 1) : '';
}

function joinPosix(base, relative) {
  if (/^[a-z]+:/i.test(relative) || relative.startsWith('/')) return relative.replace(/^\/+/, '');
  const parts = `${base || ''}${relative || ''}`.split('/');
  const stack = [];
  for (const part of parts) {
    if (!part || part === '.') continue;
    if (part === '..') stack.pop();
    else stack.push(part);
  }
  return stack.join('/');
}

function countBy(rows, getKey) {
  const out = {};
  for (const row of rows) {
    const key = getKey(row);
    out[key] = (out[key] || 0) + 1;
  }
  return out;
}

function dedupe(rows) {
  const map = new Map();
  for (const row of rows) {
    const key = hash(`${String(row.label)}:${String(row.sourceId || '')}:${normalizeDedupeText(row.text)}`);
    const previous = map.get(key);
    if (!previous || (previous.label !== 1 && row.label === 1)) {
      map.set(key, row);
    }
  }
  return Array.from(map.values());
}

function normalizeDedupeText(text) {
  return String(text || '').replace(/\s+/g, ' ').trim();
}

function splitByHash(rows, trainRatioValue, valRatioValue) {
  const train = [];
  const val = [];
  const test = [];
  for (const row of rows) {
    const bucket = Number.parseInt(hash(row.sampleId).slice(0, 8), 16) % 1000;
    const p = bucket / 1000;
    if (p < trainRatioValue) train.push(row);
    else if (p < trainRatioValue + valRatioValue) val.push(row);
    else test.push(row);
  }
  return { train, val, test };
}

function hash(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function writeJsonl(filePath, rows) {
  fs.writeFileSync(filePath, rows.map((row) => JSON.stringify(row)).join('\n') + '\n', 'utf8');
}
