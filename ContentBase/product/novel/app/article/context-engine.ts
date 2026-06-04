import { getRerankerConfig, rerankByEmbedding, loadAuthorStateText } from './reranker';

export type ContextEngineRequest = Record<string, any>;

export type ContextItem = {
  channel: 'reality' | 'literary' | 'semantic' | 'lexicon' | 'structure' | 'author';
  title?: string;
  url?: string;
  source?: string;
  text: string;
  priority?: number;
  metadata?: Record<string, any>;
};

export type ContextEngineResult = {
  prompt: string;
  warnings: string[];
  evidencePack: Record<string, any>;
  diagnostics: {
    query: string;
    contextTokenBudget: number;
    contextCharBudget: number;
    contextChars: number;
    counts: Record<string, number>;
    packedCounts: Record<string, number>;
    charsByChannel: Record<string, number>;
    reality: {
      itemCount: number;
      packedItemCount: number;
      chars: number;
      fullTextItemCount: number;
      sourceTierCounts: Record<string, number>;
      topSources: Array<{
        title?: string;
        url?: string;
        source?: string;
        sourceTier?: string;
        fullTextChars?: number;
      }>;
    };
    corpus: Record<string, {
      itemCount: number;
      packedItemCount: number;
      chars: number;
    }>;
    audit: {
      reality: { loaded: boolean; chars: number; sources: number; fulltext_ratio: number };
      literary: { loaded: boolean; units: number; chars: number };
      semantic: { loaded: boolean; units: number; chars: number };
      lexicon: { loaded: boolean; units: number; chars: number };
      structure: { loaded: boolean; patterns: number };
      author: { loaded: boolean; chars: number };
      composition: { order: string[]; truncated: string[] };
    };
    items: Array<{
      id: string;
      channel: string;
      title?: string;
      url?: string;
      source?: string;
      preview: string;
    }>;
  };
};

const MODEL_CONTEXT_WINDOWS: Record<string, number> = {
  'gpt-4o': 128000,
  'gpt-4o-mini': 128000,
  'gpt-4.1': 1000000,
  'gpt-4.1-mini': 1000000,
  'gpt-4.1-nano': 1000000,
  'gpt-5.5': 200000,
  'claude-sonnet-4-6': 200000,
  'claude-sonnet-4-5-20250514': 200000,
  'claude-opus-4-7': 200000,
  'deepseek-chat': 64000,
  'deepseek-reasoner': 64000,
};
const DEFAULT_MODEL_CONTEXT_WINDOW = 128000;
const CONTEXT_UTILIZATION_RATIO = 0.25;
const SYSTEM_PROMPT_RESERVE = 3000;
const OUTPUT_TOKEN_RESERVE = 8000;

const DEFAULT_CONTEXT_TOKEN_BUDGET = 57000;
const DEFAULT_CONTEXT_CHAR_BUDGET = 50000;
const DEFAULT_REALITY_LIMIT = 160;
const DEFAULT_EVIDENCE_TIMEOUT_MS = 240000;

const RAGFLOW_DATASETS = {
  literaryCorpus: 'bdcc99c658f111f18aecb3d695a2553d',
  essay: 'eb927cf6550211f1b2958f4a76330bcc',
  film: 'eb7df254550211f1b2958f4a76330bcc',
  xingwang: 'eb8a1250550211f1b2958f4a76330bcc',
} as const;

const GENRE_RAGFLOW_DATASETS: Record<Genre, string[]> = {
  historical_commentary: [RAGFLOW_DATASETS.literaryCorpus, RAGFLOW_DATASETS.essay],
  reality_commentary:    [RAGFLOW_DATASETS.literaryCorpus, RAGFLOW_DATASETS.essay],
  narrative:             [RAGFLOW_DATASETS.literaryCorpus, RAGFLOW_DATASETS.film],
  essay:                 [RAGFLOW_DATASETS.literaryCorpus, RAGFLOW_DATASETS.essay],
};

export async function buildArticleContextEngine(input: {
  request: ContextEngineRequest;
  topic: string;
  targetWordCount: number;
}): Promise<ContextEngineResult> {
  const warnings: string[] = [];
  const query = readContextQuery(input.request, input.topic);
  const gatewayUrl = String(process.env.DATABASE_GATEWAY_URL || '').trim().replace(/\/+$/, '');
  if (!gatewayUrl) {
    throw new Error('Reality required: DATABASE_GATEWAY_URL is not configured');
  }

  const contextTokenBudget = computeContextTokenBudget(input.request);
  const contextCharBudget = readNumber(
    input.request.contextCharBudget || input.request.settings?.contextCharBudget,
    Math.min(DEFAULT_CONTEXT_CHAR_BUDGET, Math.floor(contextTokenBudget * 3.2)),
  );

  const genre = detectGenre(input.request);
  const retrievalLimits = GENRE_RETRIEVAL_LIMITS[genre];

  // Pre-research: expand topic into multiple specific search queries via lightweight LLM
  const expandedQueries = await expandResearchQueries(input.topic, input.request.target || input.request.goal || '', genre);
  if (expandedQueries.length) {
    warnings.push(`pre-research: expanded into ${expandedQueries.length} queries`);
  }

  const evidencePack = await loadEvidencePack({
    gatewayUrl,
    query,
    request: {
      ...input.request,
      webQueries: expandedQueries.length ? expandedQueries : (input.request.webQueries || []),
    },
    warnings,
    realityLimit: retrievalLimits.reality,
    genre,
  });
  assertEvidencePack(evidencePack);

  const corpusItems = await loadCorpusItems({
    gatewayUrl,
    query,
    request: input.request,
    limits: retrievalLimits,
  });
  const evidenceItems = normalizeEvidencePackChunks(evidencePack);
  const contextItems = [
    ...evidenceItems,
    ...corpusItems,
  ];
  if (!contextItems.length) {
    throw new Error('Reality required: EvidencePack returned zero usable Reality chunks');
  }
  const stageCountsRaw = countChannels(contextItems);
  const ranked = rankAndDedupe(contextItems, input.topic);
  const stageCountsRanked = countChannels(ranked);
  const rerankerConfig = getRerankerConfig();
  const authorStateText = rerankerConfig ? await loadAuthorStateText(gatewayUrl) : '';
  const reranked = rerankerConfig
    ? await rerankByEmbedding(input.topic, ranked, rerankerConfig, authorStateText)
    : ranked;
  if (rerankerConfig && reranked.length < ranked.length) {
    warnings.push(`reranker: kept ${reranked.length}/${ranked.length} items (${Math.round(reranked.length / ranked.length * 100)}%)`);
  }
  const stageCountsReranked = countChannels(reranked);
  const filtered = contaminationFilter(reranked);
  const stageCountsFiltered = countChannels(filtered);
  const diverse = injectDiversity(filtered);
  const stageCountsDiverse = countChannels(diverse);
  const packed = composeByBudget({
    items: diverse,
    charBudget: contextCharBudget,
    genre,
  });
  if (!packed.items.length) {
    throw new Error('Corpus Context required: packed context is empty');
  }
  const packedCounts = countChannels(packed.items);
  const packedChars = countCharsByChannel(packed.items);
  if ((packedCounts.reality || 0) < 1) {
    throw new Error(`Reality required: zero Reality items survived context packing. Stage trace: evidence=${evidenceItems.length}(reality:${stageCountsRaw.reality||0}), ranked=${ranked.length}(reality:${stageCountsRanked.reality||0}), reranked=${reranked.length}(reality:${stageCountsReranked.reality||0}), filtered=${filtered.length}(reality:${stageCountsFiltered.reality||0}), diverse=${diverse.length}(reality:${stageCountsDiverse.reality||0}), packed=${packed.items.length}(reality:${packedCounts.reality||0}), charBudget=${contextCharBudget}`);
  }
  if ((packedChars.reality || 0) < 500) {
    warnings.push('Reality thin: packed Reality < 500 chars, Writer output should stay narrow');
  }

  const prompt = buildWriterPrompt({
    request: input.request,
    topic: input.topic,
    targetWordCount: input.targetWordCount,
    contextTokenBudget,
    contextChars: packed.contextChars,
    sections: packed.sections,
  });

  return {
    prompt,
    warnings,
    evidencePack,
    diagnostics: {
      query,
      contextTokenBudget,
      contextCharBudget,
      contextChars: packed.contextChars,
      counts: countChannels(contextItems),
      packedCounts,
      charsByChannel: packedChars,
      reality: buildRealityDiagnostics(contextItems.filter((item) => item.channel === 'reality'), packed.items.filter((item) => item.channel === 'reality')),
      corpus: buildCorpusDiagnostics(contextItems, packed.items),
      audit: {
        reality: { loaded: true, chars: packedChars.reality || 0, sources: packedCounts.reality || 0, fulltext_ratio: computeFulltextRatio(packed.items.filter((i) => i.channel === 'reality')) },
        literary: { loaded: (packedCounts.literary || 0) > 0, units: packedCounts.literary || 0, chars: packedChars.literary || 0 },
        semantic: { loaded: (packedCounts.semantic || 0) > 0, units: packedCounts.semantic || 0, chars: packedChars.semantic || 0 },
        lexicon: { loaded: (packedCounts.lexicon || 0) > 0, units: packedCounts.lexicon || 0, chars: packedChars.lexicon || 0 },
        structure: { loaded: (packedCounts.structure || 0) > 0, patterns: packedCounts.structure || 0 },
        author: { loaded: (packedCounts.author || 0) > 0, chars: packedChars.author || 0 },
        composition: {
          order: ['reality', 'literary', 'semantic', 'lexicon', 'structure', 'author'].filter((ch) => (packedCounts[ch] || 0) > 0),
          truncated: ['reality', 'literary', 'semantic', 'lexicon', 'structure', 'author'].filter((ch) => (countChannels(contextItems)[ch] || 0) > (packedCounts[ch] || 0)),
        },
      },
      items: packed.items.map((item, index) => ({
        id: `context_${index + 1}`,
        channel: item.channel,
        title: item.title,
        url: item.url,
        source: item.source,
        preview: item.text.slice(0, 300),
      })),
    },
  };
}

async function loadCorpusItems(input: {
  gatewayUrl: string;
  query: string;
  request: ContextEngineRequest;
  limits: RetrievalLimits;
}): Promise<ContextItem[]> {
  const evidenceQuery = readObject(input.request.evidenceQuery);
  if (evidenceQuery.requireCorpus === false || input.request.requireCorpus === false) {
    return [];
  }
  const [semantic, vocabulary, corpusContract, literature, authorProfile] = await Promise.all([
    getJson(input.gatewayUrl, '/semantic/units', { search: input.query, limit: String(input.limits.semantic) }, 'semantic corpus', [], DEFAULT_EVIDENCE_TIMEOUT_MS),
    getJson(input.gatewayUrl, '/vocabulary/search', { q: input.query, limit: String(input.limits.lexicon) }, 'lexicon corpus', [], DEFAULT_EVIDENCE_TIMEOUT_MS),
    getJson(input.gatewayUrl, '/creative/style-contract', { protocol: String(evidenceQuery.protocol || input.request.protocol || 'immersive_historical_synthetic_narrative') }, 'corpus contract', [], DEFAULT_EVIDENCE_TIMEOUT_MS),
    getJson(input.gatewayUrl, '/content/literature', { search: input.query, limit: String(input.limits.literary) }, 'literary corpus', [], DEFAULT_EVIDENCE_TIMEOUT_MS),
    getJson(input.gatewayUrl, '/creative/author-profile', {}, 'author corpus', [], DEFAULT_EVIDENCE_TIMEOUT_MS),
  ]);
  // Literary style samples: always inject regardless of topic (teaches HOW to write, not WHAT)
  const literaryCorpusItems = await loadLiteraryCorpusSearch(input.gatewayUrl, input.query);
  const fixedStyleSamples = await loadFixedStyleSamples(input.gatewayUrl);
  return [
    ...normalizeSemanticUnits(semantic),
    ...normalizeVocabularyItems(vocabulary),
    ...normalizeCorpusContract(corpusContract),
    ...normalizeLiteratureItems(literature),
    ...normalizeAuthorProfile(authorProfile),
    ...literaryCorpusItems,
    ...fixedStyleSamples,
  ];
}

async function loadEvidencePack(input: {
  gatewayUrl: string;
  query: string;
  request: ContextEngineRequest;
  warnings: string[];
  realityLimit: number;
  genre: Genre;
}): Promise<Record<string, any>> {
  const evidenceQuery = readObject(input.request.evidenceQuery);
  const datasetIds = Array.isArray(evidenceQuery.ragflowDatasetIds)
    ? evidenceQuery.ragflowDatasetIds.map(String).filter(Boolean)
    : GENRE_RAGFLOW_DATASETS[input.genre] || [];
  const params: Record<string, string> = {
    q: input.query,
    query: input.query,
    limit: String(readNumber(evidenceQuery.perQueryLimit || evidenceQuery.limit || input.request.evidenceLimit, input.realityLimit)),
    rounds: String(readNumber(evidenceQuery.rounds || input.request.evidenceRounds, 8)),
    includeWeb: String(evidenceQuery.includeWeb !== false),
    includeRagflow: String(evidenceQuery.includeRagflow !== false),
    persistWeb: String(evidenceQuery.persistWeb !== false),
  };
  const webQueries = normalizeWebQueries(evidenceQuery.webQueries || input.request.webQueries);
  if (webQueries.length) {
    params.webQueries = webQueries.join('\n');
  }
  return getJson(
    input.gatewayUrl,
    '/evidence/search',
    params,
    'evidence search',
    datasetIds,
    readNumber(evidenceQuery.evidenceTimeoutMs || evidenceQuery.timeoutMs, DEFAULT_EVIDENCE_TIMEOUT_MS),
  );
}

async function getJson(
  gatewayUrl: string,
  path: string,
  params: Record<string, string>,
  label: string,
  ragflowDatasetIds: string[] = [],
  timeoutMs = DEFAULT_EVIDENCE_TIMEOUT_MS,
): Promise<Record<string, any>> {
  const urlParams = new URLSearchParams(params);
  for (const id of ragflowDatasetIds) {
    urlParams.append('ragflowDatasetIds', id);
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${gatewayUrl}${path}?${urlParams.toString()}`, {
      signal: controller.signal,
      headers: databaseGatewayHeaders(),
    });
    const text = await response.text();
    let payload: Record<string, any> = {};
    if (text.trim()) {
      try {
        payload = JSON.parse(text) as Record<string, any>;
      } catch {
        throw new Error(`${label} returned non-JSON response: HTTP ${response.status}`);
      }
    }
    if (!response.ok) {
      throw new Error(`${label} returned HTTP ${response.status}: ${String(payload.message || payload.error || text).slice(0, 240)}`);
    }
    return payload;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`${label} unavailable: ${error.message}`);
    }
    throw new Error(`${label} unavailable: ${String(error)}`);
  } finally {
    clearTimeout(timeout);
  }
}

function databaseGatewayHeaders(): Record<string, string> | undefined {
  const apiKey = String(process.env.DATABASE_GATEWAY_API_KEY || '').trim();
  if (!apiKey) return undefined;
  const header = String(process.env.DATABASE_GATEWAY_HEADER || 'X-DataBase-Api-Key').trim() || 'X-DataBase-Api-Key';
  return { [header]: apiKey };
}

function assertEvidencePack(pack: Record<string, any>) {
  if (!pack || typeof pack !== 'object') {
    throw new Error('Reality required: EvidencePack is missing');
  }
  const queryRun = readObject(pack.queryRun);
  const screening = readObject(pack.screening);
  const sources = Array.isArray(pack.sources) ? pack.sources : [];
  const chunks = Array.isArray(pack.chunks) ? pack.chunks : [];
  const citations = Array.isArray(pack.citations) ? pack.citations : [];
  const rounds = Array.isArray(queryRun.rounds) ? queryRun.rounds : [];
  if (!queryRun.provider || rounds.length < 1) {
    throw new Error('Reality required: EvidencePack queryRun is missing');
  }
  if (!screening.version && Number(screening.queryCount || 0) < 1) {
    throw new Error('Reality required: EvidencePack screening is missing');
  }
  if (sources.length < 1 || chunks.length < 1 || citations.length < 1) {
    throw new Error('Reality required: EvidencePack sources/chunks/citations are incomplete');
  }
}

function normalizeEvidencePackChunks(payload: Record<string, any>): ContextItem[] {
  const sources = new Map<string, Record<string, any>>();
  for (const source of Array.isArray(payload.sources) ? payload.sources : []) {
    if (source && typeof source === 'object') {
      const id = String(source.id || source.sourceId || '').trim();
      if (id) sources.set(id, source);
    }
  }
  return (Array.isArray(payload.chunks) ? payload.chunks : []).map((chunk: any): ContextItem | undefined => {
    if (!chunk || typeof chunk !== 'object') return undefined;
    const text = String(chunk.text || chunk.fullText || chunk.content || chunk.body || chunk.snippet || chunk.excerpt || '').trim();
    if (!text) return undefined;
    const source = sources.get(String(chunk.sourceId || '').trim()) || {};
    const metadata = {
      ...readObject(source.metadata),
      ...readObject(chunk.metadata),
    };
    const title = String(source.title || chunk.title || chunk.sourceTitle || '').trim() || undefined;
    const sourceId = String(chunk.sourceId || source.sourceId || source.id || '').trim() || undefined;
    const url = String(
      chunk.location?.url
      || metadata.url
      || source.source
      || source.externalRefs?.find?.((item: any) => item?.url)?.url
      || '',
    ).trim() || undefined;
    return {
      channel: classifyCorpusChannel({
        chunk,
        source,
        metadata,
        text,
        title,
        sourceId,
      }),
      title,
      url,
      source: sourceId,
      text,
      priority: Number(chunk.relevanceScore || metadata.sourceQualityScore || 0) || undefined,
      metadata: {
        ...metadata,
        provider: metadata.provider || 'database.evidence_pack',
        sourceType: source.sourceType,
        sourceTable: source.sourceTable,
        sourceId: source.sourceId || sourceId,
        relevanceScore: chunk.relevanceScore,
      },
    };
  }).filter(Boolean) as ContextItem[];
}

function normalizeSemanticUnits(payload: Record<string, any>): ContextItem[] {
  const units = Array.isArray(payload.units) ? payload.units : [];
  return units.map((unit: any): ContextItem | undefined => {
    const text = [unit.summary, unit.excerpt].map((item) => String(item || '').trim()).filter(Boolean).join('\n');
    if (!text) return undefined;
    const materialKind = String(unit.materialKind || unit.material_kind || readSemanticMaterialKind(unit.tags) || '').trim();
    return {
      channel: classifyMaterialKind(materialKind) || 'semantic',
      title: String(unit.source_title || unit.id || '').trim() || undefined,
      source: String(unit.source_id || unit.id || '').trim() || undefined,
      text,
      priority: 90,
      metadata: {
        provider: 'database.semantic_units',
        semanticUnitId: unit.id,
        materialKind,
        sourceAuthor: unit.source_author,
        sourceLocator: unit.source_locator,
      },
    };
  }).filter(Boolean) as ContextItem[];
}

function normalizeVocabularyItems(payload: Record<string, any>): ContextItem[] {
  const items = Array.isArray(payload.items) ? payload.items : [];
  return items.map((item: any): ContextItem | undefined => {
    const content = String(item.content || item.term || item.value || '').trim();
    if (!content) return undefined;
    return {
      channel: 'lexicon',
      title: String(item.category || item.type || 'vocabulary').trim(),
      source: item.id ? `vocabulary:${item.id}` : undefined,
      text: [
        `词项：${content}`,
        item.type ? `类型：${item.type}` : '',
        item.category ? `类别：${item.category}` : '',
        item.note ? `说明：${item.note}` : '',
      ].filter(Boolean).join('\n'),
      priority: 95,
      metadata: {
        provider: 'database.vocabulary',
        id: item.id,
        type: item.type,
        category: item.category,
      },
    };
  }).filter(Boolean) as ContextItem[];
}

function normalizeCorpusContract(payload: Record<string, any>): ContextItem[] {
  const items: ContextItem[] = [];
  const lexicon = readObject(payload.lexicon);
  const preferred = Array.isArray(lexicon.preferred) ? lexicon.preferred : [];
  const banned = Array.isArray(lexicon.banned) ? lexicon.banned : [];
  // Banned list is small (~60 items, ~10k chars) - keep all
  // Preferred list is huge (~940 items, ~166k chars) - compress to top 120 by priority/relevance
  const compressedPreferred = preferred.slice(0, 120);
  if (compressedPreferred.length || banned.length) {
    items.push({
      channel: 'lexicon',
      title: 'DataBase corpus contract lexicon',
      source: 'creative/style-contract',
      text: [
        banned.length ? `banned:\n${banned.map(formatUnknownRecord).join('\n')}` : '',
        compressedPreferred.length ? `preferred (top ${compressedPreferred.length} of ${preferred.length}):\n${compressedPreferred.map(formatUnknownRecord).join('\n')}` : '',
      ].filter(Boolean).join('\n\n'),
      priority: 120,
      metadata: { provider: 'database.corpus_contract', part: 'lexicon' },
    });
  }
  for (const [channel, key] of [
    ['structure', 'modules'],
    ['structure', 'editingSteps'],
    ['structure', 'qualityRules'],
    ['literary', 'sourceMaterials'],
    ['author', 'authorTechniques'],
  ] as Array<[ContextItem['channel'], string]>) {
    const values = Array.isArray(payload[key]) ? payload[key] : [];
    if (!values.length) continue;
    items.push({
      channel,
      title: `DataBase corpus contract ${key}`,
      source: 'creative/style-contract',
      text: values.map(formatUnknownRecord).join('\n'),
      priority: 105,
      metadata: { provider: 'database.corpus_contract', part: key },
    });
  }
  return items;
}

function normalizeAuthorProfile(payload: Record<string, any>): ContextItem[] {
  const parts = [
    readObject(payload.profile),
    ...(Array.isArray(payload.interestClusters) ? payload.interestClusters : []),
    ...(Array.isArray(payload.authorTechniques) ? payload.authorTechniques : []),
  ];
  const text = parts.map(formatUnknownRecord).filter(Boolean).join('\n');
  if (!text) return [];
  return [{
    channel: 'author',
    title: 'DataBase author corpus',
    source: 'creative/author-profile',
    text,
    priority: 115,
    metadata: { provider: 'database.author_profile' },
  }];
}

function normalizeLiteratureItems(payload: Record<string, any>): ContextItem[] {
  const items = Array.isArray(payload.items) ? payload.items : Array.isArray(payload.literature) ? payload.literature : [];
  return items.map((item: any): ContextItem | undefined => {
    const text = String(item.excerpt || item.summary || item.content || item.description || item.title || '').trim();
    if (!text) return undefined;
    return {
      channel: 'literary',
      title: String(item.title || item.name || item.id || '').trim() || undefined,
      source: String(item.id || item.source_id || '').trim() || undefined,
      text,
      priority: 100,
      metadata: { provider: 'database.literature', id: item.id },
    };
  }).filter(Boolean) as ContextItem[];
}

async function loadFixedStyleSamples(gatewayUrl: string): Promise<ContextItem[]> {
  // Three-layer literary injection:
  // Layer 1: Resident authors (always injected, env configurable)
  // Layer 2: Genre-matched style samples (from style_tag in literature)
  // Layer 3: Random discovery (unpredictable fragments from the full library)
  const defaultQueries = ['鲁迅 杂文', '三岛由纪夫 散文', '内藤湖南 东洋史'];
  const envQueries = String(process.env.CONTENTBASE_STYLE_QUERIES || '').trim();
  const residentQueries = envQueries ? envQueries.split(',').map((q: string) => q.trim()).filter(Boolean) : defaultQueries;
  const items: ContextItem[] = [];

  // Layer 1: Resident authors (4-6 items)
  for (const q of residentQueries) {
    try {
      const payload = await getJson(gatewayUrl, '/search/vector', { q, limit: '2' }, 'resident style', [], 8000);
      const results = Array.isArray(payload.results) ? payload.results : [];
      for (const item of results) {
        const text = String(item.snippet || item.chunk_text || item.content || '').trim();
        if (!text || text.length < 100) continue;
        items.push({
          channel: 'literary',
          title: String(item.title || item.source || '').trim() || '常驻范本',
          source: `resident-style/${String(item.document_id || '').trim()}`,
          text: text.slice(0, 800),
          priority: 145,
          metadata: { provider: 'database.resident_style', layer: 'resident' },
        });
      }
    } catch { /* skip */ }
  }

  // Layer 3: Random discovery (2-3 items from random parts of the library)
  const randomSeeds = ['散文 节奏', '历史 判断', '人物 描写', '制度 批评', '战争 细节'];
  const seed = randomSeeds[Math.floor(Math.random() * randomSeeds.length)];
  try {
    const payload = await getJson(gatewayUrl, '/search/vector', { q: seed, limit: '3' }, 'random discovery', [], 8000);
    const results = Array.isArray(payload.results) ? payload.results : [];
    for (const item of results.slice(0, 2)) {
      const text = String(item.snippet || item.chunk_text || item.content || '').trim();
      if (!text || text.length < 100) continue;
      items.push({
        channel: 'literary',
        title: String(item.title || item.source || '').trim() || '随机发现',
        source: `random-discovery/${String(item.document_id || '').trim()}`,
        text: text.slice(0, 600),
        priority: 120,
        metadata: { provider: 'database.random_discovery', layer: 'discovery' },
      });
    }
  } catch { /* skip */ }

  return items.slice(0, 12);
}

async function loadLiteraryCorpusSearch(gatewayUrl: string, query: string): Promise<ContextItem[]> {
  const vectorQuery = String(query || '').trim();
  if (!vectorQuery) return [];

  // Style pool: vector search only, capped at 5 items as topic-aware supplement.
  // The main literary material comes from /content/literature and style-contract.
  const payload = await getJson(
    gatewayUrl,
    '/search/vector',
    { q: vectorQuery, limit: '5' },
    'literary corpus vector search',
    [],
    DEFAULT_EVIDENCE_TIMEOUT_MS,
  );

  const results = Array.isArray(payload.results) ? payload.results : [];
  const items: ContextItem[] = [];
  for (const item of results) {
    const text = String(item.snippet || item.chunk_text || item.content || '').trim();
    if (!text || text.length < 80) continue;
    items.push({
      channel: 'literary',
      title: String(item.title || item.source || '').trim() || undefined,
      source: `search/vector/${String(item.document_id || item.documentId || '').trim()}`,
      text,
      priority: 125,
      metadata: {
        provider: 'database.literary_corpus_vector',
        documentId: item.document_id || item.documentId,
        score: item.score,
      },
    });
  }
  return items;
}


function classifyMaterialKind(value: string): ContextItem['channel'] | undefined {
  const normalized = value.toLowerCase();
  if (!normalized) return undefined;
  if (/lexical|vocab|禁用|词/.test(normalized)) return 'lexicon';
  if (/sentence|句式/.test(normalized)) return 'structure';
  if (/image|imagery|movement|典故|意象|运动/.test(normalized)) return 'semantic';
  if (/literary|literature|poetry|prose|novel|文学|小说|诗/.test(normalized)) return 'literary';
  return 'semantic';
}

function readSemanticMaterialKind(tags: unknown): string {
  const parsed = typeof tags === 'string' ? safeJsonArray(tags) : Array.isArray(tags) ? tags : [];
  for (const tag of parsed) {
    const value = String(tag?.value || tag?.tag_value || '').trim();
    if (value.startsWith('reference:')) return value.replace(/^reference:/, '');
  }
  return '';
}

function safeJsonArray(value: string): any[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function formatUnknownRecord(value: unknown): string {
  if (value && typeof value === 'object') {
    const record = value as Record<string, any>;
    const primary = record.content || record.term || record.word || record.name || record.title || record.id || '';
    const secondary = record.ruleText || record.description || record.note || record.rule || record.reason || record.text || '';
    const extra = [
      record.category ? `[${record.category}]` : '',
      record.severity === 'block' ? '[必须遵守]' : '',
      record.replacement ? `→${record.replacement}` : '',
    ].filter(Boolean).join(' ');
    return [primary, secondary, extra].map((item) => String(item || '').trim()).filter(Boolean).join(' - ') || JSON.stringify(record);
  }
  return String(value || '').trim();
}

type Genre = 'historical_commentary' | 'reality_commentary' | 'narrative' | 'essay';

type RetrievalLimits = {
  reality: number;
  semantic: number;
  lexicon: number;
  literary: number;
  structure: number;
};

const GENRE_RETRIEVAL_LIMITS: Record<Genre, RetrievalLimits> = {
  historical_commentary: { reality: 80,  semantic: 30, lexicon: 40,  literary: 20, structure: 20 },
  reality_commentary:    { reality: 160, semantic: 20, lexicon: 50,  literary: 10, structure: 15 },
  narrative:             { reality: 40,  semantic: 30, lexicon: 40,  literary: 30, structure: 25 },
  essay:                 { reality: 100, semantic: 30, lexicon: 50,  literary: 20, structure: 20 },
};

const GENRE_BUDGETS: Record<Genre, Record<string, number>> = {
  historical_commentary: { reality: 35, literary: 25, semantic: 10, lexicon: 12, structure: 8, author: 10 },
  reality_commentary:    { reality: 40, literary: 20, semantic: 10, lexicon: 12, structure: 8, author: 10 },
  narrative:             { reality: 20, literary: 30, semantic: 15, lexicon: 12, structure: 13, author: 10 },
  essay:                 { reality: 35, literary: 25, semantic: 10, lexicon: 12, structure: 8, author: 10 },
};

function detectGenre(request: ContextEngineRequest): Genre {
  const hint = String(request.genre || request.genreHint || request.type || '').toLowerCase();
  if (/histor|历史/.test(hint)) return 'historical_commentary';
  if (/novel|fiction|小说|叙事|narrative/.test(hint)) return 'narrative';
  if (/reality|现实|时事|news/.test(hint)) return 'reality_commentary';
  if (/essay|散文|文案|short/.test(hint)) return 'essay';
  const protocol = String(request.protocol || '').toLowerCase();
  if (/historical/.test(protocol)) return 'historical_commentary';
  if (/narrative|novel/.test(protocol)) return 'narrative';
  return 'essay';
}

function contaminationFilter(items: ContextItem[]): ContextItem[] {
  return items.filter((item) => {
    const text = item.text.toLowerCase();
    const title = (item.title || '').toLowerCase();
    const url = (item.url || '').toLowerCase();
    if (item.text.length < 15) return false;
    if (/^(首页|导航|关于我们|联系方式|copyright|all rights|cookie|privacy policy)/i.test(item.text)) return false;
    if (/seo|广告|推广|点击这里|免费领取|限时优惠/.test(text)) return false;
    if (/(百家号|搜狐号|头条号|企鹅号)/.test(title + url)) return false;
    if (item.channel === 'reality' && item.text.length < 40 && !/\d/.test(item.text)) return false;
    return true;
  });
}

function injectDiversity(items: ContextItem[]): ContextItem[] {
  const channelSeen = new Map<string, Set<string>>();
  const result: ContextItem[] = [];
  for (const item of items) {
    const ch = item.channel;
    if (!channelSeen.has(ch)) channelSeen.set(ch, new Set());
    const seen = channelSeen.get(ch)!;
    const sourceKey = String(item.source || item.title || '').trim().toLowerCase().slice(0, 60);
    const sameSourceCount = [...seen].filter((k) => k === sourceKey).length;
    if (sameSourceCount >= 5) continue;
    seen.add(sourceKey);
    result.push(item);
  }
  return result;
}

const CHANNEL_MIN_ITEMS: Record<string, number> = {
  reality: 3,
  literary: 3,
  semantic: 2,
  lexicon: 5,
  structure: 2,
  author: 2,
};

function composeByBudget(input: {
  items: ContextItem[];
  charBudget: number;
  genre: Genre;
}) {
  const hardBudget = Math.max(1000, Math.floor(input.charBudget));
  const budgetPct = GENRE_BUDGETS[input.genre];
  const channels: ContextItem['channel'][] = ['reality', 'literary', 'semantic', 'lexicon', 'structure', 'author'];
  const channelBudgets = Object.fromEntries(
    channels.map((ch) => [ch, Math.floor(hardBudget * (budgetPct[ch] || 10) / 100)])
  );
  const channelItems = Object.fromEntries(channels.map((ch) => [ch, [] as ContextItem[]]));
  const channelUsed = Object.fromEntries(channels.map((ch) => [ch, 0]));
  const packedKeys = new Set<string>();
  let totalUsed = 0;

  const pushPackedItem = (item: ContextItem, itemBudget: number): boolean => {
    const ch = item.channel;
    const normalized = { ...item, text: normalizeText(item.text) };
    if (!normalized.text) return false;
    const key = dedupeKey(normalized);
    if (packedKeys.has(key)) return false;
    const remainingTotal = hardBudget - totalUsed;
    if (remainingTotal <= 0) return false;
    const fitted = fitItemToBudget(normalized, Math.min(itemBudget, remainingTotal));
    if (!fitted) return false;
    const serialized = serializeItem(fitted, 1);
    if (serialized.length > remainingTotal) return false;
    channelItems[ch].push(fitted);
    channelUsed[ch] += serialized.length;
    totalUsed += serialized.length;
    packedKeys.add(key);
    return true;
  };

  // Pass 1: keep channel diversity without letting oversized items exceed the request budget.
  const itemsByChannel = Object.fromEntries(channels.map((ch) => [ch, [] as ContextItem[]]));
  for (const item of input.items) {
    const normalized = { ...item, text: normalizeText(item.text) };
    if (!normalized.text) continue;
    itemsByChannel[item.channel]?.push(normalized);
  }
  for (const ch of channels) {
    const minItems = CHANNEL_MIN_ITEMS[ch] || 2;
    const available = itemsByChannel[ch];
    for (let i = 0; i < Math.min(minItems, available.length); i++) {
      const item = available[i];
      const perItemBudget = Math.max(240, Math.floor((channelBudgets[ch] || hardBudget) / Math.max(minItems, 1)));
      pushPackedItem(item, perItemBudget);
    }
  }

  // Pass 2: fill remaining budget per channel
  for (const item of input.items) {
    const ch = item.channel;
    const remainingChannel = (channelBudgets[ch] || 0) - (channelUsed[ch] || 0);
    if (remainingChannel <= 0) continue;
    pushPackedItem(item, remainingChannel);
  }

  let packed = channels.flatMap((ch) => channelItems[ch]);

  // Pass 3: fill remaining budget with overflow from any channel
  if (totalUsed < hardBudget * 0.85) {
    for (const item of input.items) {
      pushPackedItem(item, hardBudget - totalUsed);
    }
    packed = channels.flatMap((ch) => channelItems[ch]);
  }

  return {
    items: packed,
    contextChars: packed.reduce((sum, item, index) => sum + serializeItem(item, index + 1).length, 0),
    sections: buildSections(packed),
  };
}

function fitItemToBudget(item: ContextItem, charBudget: number): ContextItem | null {
  const normalized = { ...item, text: normalizeText(item.text) };
  if (!normalized.text) return null;
  if (serializeItem(normalized, 1).length <= charBudget) return normalized;

  const marker = '\n[...truncated by context budget...]';
  const headerChars = serializeItem({ ...normalized, text: '' }, 1).length;
  const textBudget = Math.floor(charBudget - headerChars - marker.length);
  if (textBudget < 80) return null;
  return {
    ...normalized,
    text: `${normalized.text.slice(0, textBudget).trimEnd()}${marker}`,
  };
}

function packCorpusContext(input: {
  items: ContextItem[];
  charBudget: number;
}) {
  const items: ContextItem[] = [];
  let used = 0;
  for (const item of input.items) {
    const normalized = { ...item, text: normalizeText(item.text) };
    if (!normalized.text) continue;
    const serialized = serializeItem(normalized, items.length + 1);
    if (used + serialized.length > input.charBudget && used > 0) continue;
    items.push(normalized);
    used += serialized.length;
  }
  return {
    items,
    contextChars: items.reduce((sum, item, index) => sum + serializeItem(item, index + 1).length, 0),
    sections: buildSections(items),
  };
}

function buildWriterPrompt(input: {
  request: ContextEngineRequest;
  topic: string;
  targetWordCount: number;
  contextTokenBudget: number;
  contextChars: number;
  sections: Record<string, string>;
}) {
  const userTarget = String(input.request.target || input.request.goal || '').trim();
  const sectionText = [
    ['REALITY', input.sections.reality],
    ['LITERARY', input.sections.literary],
    ['SEMANTIC', input.sections.semantic],
    ['LEXICON', input.sections.lexicon],
    ['STRUCTURE', input.sections.structure],
    ['AUTHOR', input.sections.author],
  ]
    .filter(([, text]) => String(text || '').trim())
    .map(([title, text]) => `[${title}]\n${text}`)
    .join('\n\n');
  const hasLiterary = String(input.sections.literary || '').trim().length > 0;
  return [
    `题目：${input.topic}`,
    `目标字数：约 ${input.targetWordCount} 字`,
    userTarget ? `用户要求：${userTarget}` : '',
    `上下文预算：${input.contextTokenBudget} tokens；本次已打包约 ${input.contextChars} 字符 Corpus。`,
    '',
    sectionText,
    '',
    '写作角色与体裁：',
    '你是写散文的人，不是写新闻稿、报告或社论的人。',
    '本文是评论性散文，要求评论的力度，也要求散文的美。',
    '事实从 [REALITY] 来，立场从 [SEMANTIC]/[AUTHOR] 来，',
    hasLiterary
      ? '但句法、节奏、转折方式、意象密度、收束方式，要全部从 [LITERARY] 学。'
      : '但句法、节奏、转折方式要保持克制冷感，避免新闻腔。',
    '',
    hasLiterary ? '[LITERARY] 是你的化用素材库：' : '',
    hasLiterary ? '- 从中找到与当前论证相关的描写、句式、意象，化用到正文中（不是引用，是用那些作者的方式说你自己的话）。' : '',
    hasLiterary ? `- 每${readNumber(input.request.settings?.literaryInterval, 1000)}字至少1处化用，全文不少于${readNumber(input.request.settings?.literaryMinCount, 5)}处。化用方式：借句式节奏、借意象、借语气温度。` : '',
    hasLiterary ? '- 允许出现意象和物件描写，但必须来自[LITERARY]材料的化用，不得自行编造。' : '',
    hasLiterary ? '- 不允许出现"宛如"、"犹如"、"恰似"这类廉价比喻词。' : '',
    '',
    '写作要求：',
    '直接输出完整正文，不输出流程说明、检查报告、JSON、表格或项目符号。',
    '禁止使用"第一幕"、"第二幕"、"第三幕"、"第一层"、"第二层"、"第N个悖论"等序数编号来标记结构。正文是连续散文，段落之间靠内容逻辑和节奏自然过渡，不靠编号分幕。',
    '只基于 Corpus Context 写作；没有依据的现场、人物、数字、机构、引语和因果关系不得编造。',
    '所有精确数字、日期、编号、条款、金额、船名、人名、地名、机构名必须能在 [REALITY] 中逐字找到原文，否则只能用模糊表达。',
    '正文中禁止出现"材料中说"、"材料里提到"、"据材料"、"根据资料"等元叙述痕迹。正文是成品，不是读书报告。',
    '正文中禁止出现小括号备注、英文注释、缩写解释或任何形式的括号补充说明。专有名词首次出现时直接使用中文全称或原文，不加括号标注。',
    '禁止使用"不禁让人思考"、"引人深思"、"值得我们注意"、"我们应当"、"在某种意义上"、"在一定程度上"、"从某种角度来看"这类评论腔套话。',
    '禁止用括号、冒号、破折号引出长段补充说明。需要补充就另起一句。',
    '段落要有呼吸感：不要每段都同样长。允许出现两三句话的短段落用来收束或转折。',
    '每个段落必须包含至少一个具体锚点（人名、书名、年份、数字、地名、文件名、引文）。纯概括性段落不得超过连续两段。',
    '段落结尾必须停在事实、判断或未解决的张力上，禁止用意象画面收束段落。',
    '"不是A，是B"对立句式全文最多出现1次，多了是AI味。直接陈述你认为对的那个，不需要先否定再肯定。',
    '结尾必须停在一个具体的残酷事实上（一个数字、一个制度细节、一个没有出路的困境），不得升华、不得展望、不得回扣开头。',
    `字数要求：正文不得少于 ${input.targetWordCount} 字。可以超出，鼓励写长写透，但不得注水重复。宁可多展开一层论证、多一个微观细节，也不要为凑字数而堆砌同义句。`,
    hasOnlyReality(input.sections)
      ? '注意：本次只有 Reality/Web 事实材料，无其他 Corpus。输出必须收窄为简短分析短文，不得写长篇文学性或地缘政治叙事。'
      : '',
  ].filter((line) => line !== '').join('\n');
}

function rankAndDedupe(items: ContextItem[], topic: string): ContextItem[] {
  let terms: string[];
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const jieba = require('jieba-wasm');
    terms = (jieba.cut(topic, true) as string[]).filter((w: string) => w.trim().length >= 2);
  } catch {
    terms = splitTerms(topic);
  }
  const seen = new Set<string>();
  return items
    .map((item) => ({ item, score: scoreItem(item, terms) }))
    .sort((a, b) => b.score - a.score)
    .filter(({ item }) => {
      const key = dedupeKey(item);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map(({ item }) => item);
}

function scoreItem(item: ContextItem, topicTerms: string[]): number {
  const hay = `${item.title || ''}\n${item.source || ''}\n${item.url || ''}\n${item.text || ''}`.toLowerCase();
  // Base score from text length (cap at 60 to avoid huge items dominating)
  let score = Math.min(60, Math.floor(item.text.length / 200));
  score += readNumber(item.priority, 0);
  // Term match bonus - more weight per term hit
  let termHits = 0;
  for (const term of topicTerms) {
    if (term && hay.includes(term.toLowerCase())) {
      score += 22;
      termHits++;
    }
  }
  // Bonus for multiple term hits (indicates higher relevance)
  if (termHits >= 3) score += 30;
  else if (termHits >= 2) score += 15;
  // Literary corpus items with term hits get extra boost (style reference)
  if (item.channel === 'literary' && termHits >= 1) score += 20;
  return score;
}

function hasOnlyReality(sections: Record<string, string>): boolean {
  for (const ch of ['literary', 'semantic', 'lexicon', 'structure', 'author']) {
    if (String(sections[ch] || '').trim().length > 0) return false;
  }
  return true;
}

function buildSections(items: ContextItem[]): Record<string, string> {
  const sections: Record<string, string> = {};
  for (const channel of ['reality', 'literary', 'semantic', 'lexicon', 'structure', 'author']) {
    sections[channel] = buildSection(items.filter((item) => item.channel === channel));
  }
  return sections;
}

function buildSection(items: ContextItem[]): string {
  return items
    .map((item, index) => serializeItem(item, index + 1))
    .join('\n\n');
}

function serializeItem(item: ContextItem, index: number): string {
  return [
    `材料 ${index}`,
    item.title ? `标题：${item.title}` : '',
    item.source ? `来源：${item.source}` : '',
    item.url ? `链接：${item.url}` : '',
    `内容：${item.text}`,
  ].filter(Boolean).join('\n');
}

function countChannels(items: ContextItem[]): Record<string, number> {
  return items.reduce((acc, item) => {
    acc[item.channel] = (acc[item.channel] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
}

function countCharsByChannel(items: ContextItem[]): Record<string, number> {
  return items.reduce((acc, item, index) => {
    acc[item.channel] = (acc[item.channel] || 0) + serializeItem(item, index + 1).length;
    return acc;
  }, {} as Record<string, number>);
}

function buildRealityDiagnostics(allItems: ContextItem[], packedItems: ContextItem[]) {
  const sourceTierCounts = packedItems.reduce((acc, item) => {
    const tier = String(item.metadata?.sourceTier || 'U');
    acc[tier] = (acc[tier] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const topSources = packedItems.slice(0, 20).map((item) => ({
    title: item.title,
    url: item.url,
    source: item.source,
    sourceTier: item.metadata?.sourceTier ? String(item.metadata.sourceTier) : undefined,
    fullTextChars: readNumber(item.metadata?.fullTextChars, 0),
  }));
  return {
    itemCount: allItems.length,
    packedItemCount: packedItems.length,
    chars: countCharsByChannel(packedItems).reality || 0,
    fullTextItemCount: packedItems.filter((item) => readNumber(item.metadata?.fullTextChars, 0) >= 1200).length,
    sourceTierCounts,
    topSources,
  };
}

function computeFulltextRatio(items: ContextItem[]): number {
  if (!items.length) return 0;
  const fulltext = items.filter((item) => readNumber(item.metadata?.fullTextChars, 0) >= 1200).length;
  return Math.round((fulltext / items.length) * 100) / 100;
}

function buildCorpusDiagnostics(allItems: ContextItem[], packedItems: ContextItem[]) {
  const allCounts = countChannels(allItems);
  const packedCounts = countChannels(packedItems);
  const packedChars = countCharsByChannel(packedItems);
  return Object.fromEntries(
    ['reality', 'literary', 'semantic', 'lexicon', 'structure', 'author'].map((channel) => [
      channel,
      {
        itemCount: Number(allCounts[channel] || 0),
        packedItemCount: Number(packedCounts[channel] || 0),
        chars: Number(packedChars[channel] || 0),
      },
    ]),
  );
}

function classifyCorpusChannel(input: {
  chunk: Record<string, any>;
  source: Record<string, any>;
  metadata: Record<string, any>;
  text: string;
  title?: string;
  sourceId?: string;
}): ContextItem['channel'] {
  const provider = String(input.metadata.provider || input.chunk.provider || input.source.provider || '').toLowerCase();
  const sourceTable = String(input.metadata.sourceTable || input.chunk.sourceTable || input.source.sourceTable || '').toLowerCase();
  const sourceId = String(input.sourceId || '').toLowerCase();

  // Evidence items: web search results and RAGFlow document chunks are always Reality
  if (provider === 'web.search' || sourceId.startsWith('web__')) return 'reality';
  if (provider.startsWith('ragflow') || sourceTable === 'search_chunks') return 'reality';

  const hay = [
    input.chunk.sourceProvider,
    input.chunk.sourceType,
    input.chunk.collection,
    input.chunk.datasetId,
    input.chunk.datasetName,
    input.source.sourceType,
    input.source.collection,
    input.source.datasetId,
    input.source.datasetName,
    input.metadata.sourceType,
    input.metadata.collection,
    input.metadata.collectionName,
    input.metadata.datasetId,
    input.metadata.datasetName,
    input.metadata.corpus,
    input.metadata.corpusType,
    input.metadata.channel,
    input.metadata.kind,
    input.metadata.tags,
    input.title,
    input.sourceId,
  ].map((item) => JSON.stringify(item || '')).join('\n').toLowerCase();

  if (/(lexical|vocab|vocabulary|banned|preferred|forbidden|禁用|偏好|词库|词表)/i.test(hay)) {
    return 'lexicon';
  }
  if (/(sentence|句式|语法)/i.test(hay)) {
    return 'structure';
  }
  if (/(imagery|image|movement|典故|意象|物象|运动)/i.test(hay)) {
    return 'semantic';
  }
  if (/(literary|literature|poetry|novel|prose|文学|诗|小说|散文)/i.test(hay)) {
    return 'literary';
  }
  if (/(semantic|worldview|unit|语义|世界观)/i.test(hay)) {
    return 'semantic';
  }
  if (/(ragflow|dataset|knowledge|corpus|private)/i.test(hay)) {
    return 'reality';
  }
  return 'reality';
}

function normalizeWebQueries(value: unknown): string[] {
  if (Array.isArray(value)) {
    return dedupeStrings(value.map(String));
  }
  if (typeof value === 'string') {
    return dedupeStrings(value.split(/[|｜\n\r]+/));
  }
  return [];
}

function readContextQuery(request: ContextEngineRequest, topic: string): string {
  const evidenceQuery = readObject(request.evidenceQuery);
  return String(evidenceQuery.query || request.searchQuery || request.query || topic).trim() || topic;
}

function computeContextTokenBudget(request: ContextEngineRequest): number {
  const explicit = request.contextTokenBudget || request.settings?.contextTokenBudget;
  if (explicit && Number(explicit) > 0) return Math.min(Number(explicit), 120000);
  const model = String(request.model || process.env.CONTENTBASE_LLM_MODEL || process.env.SUB2API_NOVEL_MODEL || '').trim();
  const window = MODEL_CONTEXT_WINDOWS[model] || DEFAULT_MODEL_CONTEXT_WINDOW;
  const usable = Math.floor(window * CONTEXT_UTILIZATION_RATIO) - SYSTEM_PROMPT_RESERVE - OUTPUT_TOKEN_RESERVE;
  return Math.max(20000, Math.min(usable, 120000));
}

function readObject(value: unknown): Record<string, any> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, any> : {};
}

function readNumber(value: unknown, defaultValue: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : defaultValue;
}

function splitTerms(value: string): string[] {
  return String(value || '')
    .split(/[\s,，。；;:：、|/\\()[\]{}"'“”‘’]+/)
    .map((item) => item.trim())
    .filter((item) => item.length >= 2)
    .slice(0, 24);
}

function dedupeKey(item: ContextItem): string {
  const url = String(item.url || '').trim().toLowerCase().replace(/[?#].*$/, '');
  if (url) return `url:${url}`;
  return normalizeText(`${item.channel}\n${item.title || ''}\n${item.text || ''}`).slice(0, 280).toLowerCase();
}

function normalizeText(value: string): string {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function dedupeStrings(values: string[]): string[] {
  return Array.from(new Set(values.map((item) => String(item || '').trim()).filter(Boolean)));
}

async function expandResearchQueries(topic: string, target: string, genre: Genre): Promise<string[]> {
  const baseUrl = String(process.env.CONTENTBASE_LLM_BASE_URL || process.env.DATABASE_RESEARCH_LLM_BASE_URL || '').trim().replace(/\/+$/, '');
  const apiKey = String(process.env.CONTENTBASE_LLM_API_KEY || process.env.DATABASE_RESEARCH_LLM_API_KEY || '').trim();
  const model = String(process.env.CONTENTBASE_LLM_MODEL || process.env.DATABASE_RESEARCH_LLM_MODEL || 'gpt-5.5').trim();
  if (!baseUrl || !apiKey) return [];

  const prompt = `文章主题：${topic}${target ? `\n写作方向：${target}` : ''}

把这个主题拆成6-8个具体的搜索查询。要求：
- 中英文各半
- 每个查询针对一个具体的事实、人物、事件、年份、文献或数据
- 不要泛泛的概念词，要能搜到具体信息的查询
- 英文查询要用学术/百科风格的关键词组合
- 每行一个查询，不要编号，不要解释`;

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: '你是研究助手。只输出搜索查询列表，不输出其他内容。' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 500,
      }),
      signal: AbortSignal.timeout(12000),
    });
    if (!response.ok) return [];
    const payload = await response.json() as Record<string, any>;
    const text = String(payload?.choices?.[0]?.message?.content || '');
    return text.split('\n').map((line: string) => line.trim()).filter((line: string) => line.length >= 4 && line.length <= 80).slice(0, 8);
  } catch {
    return [];
  }
}
