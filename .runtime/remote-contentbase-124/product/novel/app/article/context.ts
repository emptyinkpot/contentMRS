import {
  DEFAULT_CREATIVE_PROTOCOL_ID,
  getCreativeStyleContractRepository,
} from '../../core/manuscript/content-craft/src/creative-contract';
import { getSemanticContextRepository } from '../../core/manuscript/content-craft/src/semantic-context';
import { createContentDatabaseClient, createDataBaseGatewayClient } from '../../core/utils/database-gateway-client';
import type { RuntimeArticleContext, RuntimeGenerateArticleRequest } from './runtime';
import {
  applyTopicNarrativePerspective,
  applyTopicPresetToRequest,
  filterLexiconTermsByPreset,
  mergeTopicPresetWarnings,
  resolveTopicPreset,
  type LexiconTermRow,
} from './topic-preset';
import type {
  EvidencePack,
  LiteratureResponse,
  StoryMemoryContextResponse,
  StylePack,
} from '@emptyinkpot/database-gateway-generated-client';

export type SourcePassageMaterialKind = 'document' | 'theory' | 'comparison' | 'observer' | 'literary';

export async function resolveArticleContextWithWarnings(
  input: RuntimeGenerateArticleRequest,
  resolver?: (input: RuntimeGenerateArticleRequest) => Promise<RuntimeArticleContext>,
): Promise<RuntimeArticleContext> {
  const context = resolver ? await resolver(input) : await resolveArticleContextFromDataBase(input);
  return normalizeRuntimeArticleContext(context, readArticleContextQuery(input));
}

function normalizeRuntimeArticleContext(context: RuntimeArticleContext, query: string): RuntimeArticleContext {
  if (!context || typeof context !== 'object') {
    throw new Error('article context resolver returned no context');
  }
  assertResolvedStyleContract(context);
  const scaffold = buildArticleContextScaffold(query, context.warnings || []);
  return {
    ...scaffold,
    ...context,
    styleContract: {
      ...scaffold.styleContract,
      ...(context.styleContract || {}),
    },
    semantic: {
      ...scaffold.semantic,
      ...(context.semantic || {}),
      counts: {
        ...scaffold.semantic.counts,
        ...(context.semantic?.counts || {}),
      },
    },
    evidence: {
      ...scaffold.evidence,
      ...(context.evidence || {}),
      items: Array.isArray(context.evidence?.items) ? context.evidence.items : [],
    },
    stylePack: {
      ...scaffold.stylePack,
      ...(context.stylePack || {}),
      profiles: Array.isArray(context.stylePack?.profiles) ? context.stylePack.profiles : [],
    },
    memory: {
      ...scaffold.memory,
      ...(context.memory || {}),
      items: Array.isArray(context.memory?.items) ? context.memory.items : [],
    },
    literature: {
      ...scaffold.literature,
      ...(context.literature || {}),
      items: Array.isArray(context.literature?.items) ? context.literature.items : [],
    },
    learning: {
      ...scaffold.learning,
      ...(context.learning || {}),
      events: Array.isArray(context.learning?.events) ? context.learning.events : [],
    },
    experience: {
      ...scaffold.experience,
      ...(context.experience || {}),
      items: Array.isArray(context.experience?.items) ? context.experience.items : [],
    },
    warnings: Array.isArray(context.warnings) ? context.warnings : [],
  };
}

async function resolveArticleContextFromDataBase(input: RuntimeGenerateArticleRequest): Promise<RuntimeArticleContext> {
  const normalizedInput = applyTopicPresetToRequest(input);
  const topicPreset = normalizedInput.topicPreset || resolveTopicPreset(normalizedInput.topicId);
  const warnings: string[] = [];
  const query = readArticleContextQuery(normalizedInput);
  const context = buildArticleContextScaffold(query, warnings);
  const providedEvidence = normalizeSourcePassageEvidence(input.sourcePassages || []);
  if (providedEvidence.length) {
    context.evidence = {
      status: 'provided',
      query,
      items: providedEvidence,
      pack: context.evidence.pack,
    };
  }
  (context as any).retrievalPlan = normalizedInput.retrievalPlan;
  if (topicPreset) {
    context.topicPreset = {
      id: topicPreset.id,
      label: topicPreset.entry.label,
      forbiddenLexiconTags: topicPreset.entry.forbiddenLexiconTags,
      allowedLexiconTags: topicPreset.entry.allowedLexiconTags,
      defaultSourceIds: topicPreset.entry.defaultSourceIds,
      pressureTransitions: topicPreset.entry.pressureTransitions,
      defaultStyleProfileId: topicPreset.entry.defaultStyleProfileId,
      narrativePerspectiveMode: topicPreset.entry.narrativePerspectiveMode,
    };
  }

  const protocolId = String(
    normalizedInput.styleProfileId
    || topicPreset?.entry.defaultStyleProfileId
    || DEFAULT_CREATIVE_PROTOCOL_ID,
  ).trim() || DEFAULT_CREATIVE_PROTOCOL_ID;
  const contract = await getCreativeStyleContractRepository().load(protocolId);
  const preferredLexiconRows: LexiconTermRow[] = contract.lexicon.preferred.map((item) => ({
    content: item.content || item.word,
    category: item.category,
    tags: item.tags,
  }));
  const bannedLexiconRows: LexiconTermRow[] = contract.lexicon.banned.map((item) => ({
    content: item.content || item.word,
    category: item.category,
    tags: item.tags,
  }));
  const filteredPreferredRows = filterLexiconTermsByPreset(preferredLexiconRows, topicPreset);
  const filteredBannedRows = filterLexiconTermsByPreset(bannedLexiconRows, topicPreset);
  context.warnings = mergeTopicPresetWarnings(context.warnings, topicPreset, {
    preferredKept: filteredPreferredRows.length,
    preferredTotal: preferredLexiconRows.length,
    bannedKept: filteredBannedRows.length,
    bannedTotal: bannedLexiconRows.length,
  });
  const narrativeProtocol = applyTopicNarrativePerspective(
    normalizeArticleNarrativeProtocolInput(contract.protocol.payload?.narrativeProtocol),
    topicPreset?.entry.narrativePerspectiveMode,
  );
  context.styleContract = {
    status: 'resolved',
    protocolId: contract.protocol.id || protocolId,
    name: contract.protocol.name,
    perspectiveRule: contract.protocol.perspectiveRule,
    toneRule: contract.protocol.toneRule,
    executionRule: contract.protocol.executionRule,
    authorProfile: normalizeArticleAuthorProfile(contract.protocol.payload?.authorProfile),
    processPlan: normalizeArticleProcessPlanInput(contract.protocol.payload?.processPlan),
    narrativeProtocol,
    authorialConstitution: normalizeArticleAuthorialConstitutionInput(contract.protocol.payload?.authorialConstitution),
    writingTechniques: contract.techniques.map((item) => ({
      id: item.id,
      name: item.name,
      layer: item.layer,
      promptInstruction: item.promptInstruction,
      qualityCheck: item.qualityCheck,
    })),
    authorTechniques: contract.authorTechniques.map((item) => ({
      techniqueId: item.techniqueId,
      weight: item.weight,
      priority: item.priority,
      trigger: item.trigger,
      constraint: item.constraint,
    })),
    qualityRules: contract.qualityRules.map((item) => ({
      id: item.id,
      severity: item.severity,
      ruleText: item.ruleText,
      checkHint: item.checkHint,
    })),
    sourceMaterials: contract.sourceMaterials.map((item) => ({
      id: item.id,
      category: item.category,
      title: item.title,
      useCase: item.useCase,
    })),
    preferredTerms: filteredPreferredRows.map((item) => item.content).filter(Boolean),
    bannedTerms: filteredBannedRows.map((item) => item.content || item.word).filter(Boolean),
    qualityRuleCount: contract.qualityRules.length,
    techniqueCount: contract.techniques.length,
    authorTechniqueCount: contract.authorTechniques.length,
  };
  assertResolvedStyleContract(context);
  const lexiconLifecycle = normalizeLexiconLifecycle(contract.protocol.payload?.lexiconLifecycle);
  context.learning = {
    status: lexiconLifecycle.events.length || lexiconLifecycle.activeSource || lexiconLifecycle.promotionRule ? 'resolved' : 'empty',
    events: lexiconLifecycle.events,
    activeSource: lexiconLifecycle.activeSource,
    promotionRule: lexiconLifecycle.promotionRule,
  };

  try {
    const evidenceSizing = readArticleEvidenceSizing(normalizedInput);
    const retrievalPlan = normalizedInput.retrievalPlan;
    const evidencePack = await readArticleEvidencePack({
      query: retrievalPlan?.query || query,
      topic: normalizedInput.topic,
      // target 是运行目标，不是资料词；传给 DataBase 会把 article/draft 误扩成检索轮次。
      target: undefined,
      semanticTags: retrievalPlan?.semanticTags || (Array.isArray(normalizedInput.evidenceQuery?.semanticTags) ? normalizedInput.evidenceQuery.semanticTags : []),
      sourceIds: retrievalPlan?.sourceIds || (Array.isArray(normalizedInput.evidenceQuery?.sourceIds) ? normalizedInput.evidenceQuery.sourceIds : []),
      limit: evidenceSizing.limit,
      rounds: evidenceSizing.rounds,
      includeWeb: Boolean(retrievalPlan?.includeWeb || normalizedInput.evidenceQuery?.includeWeb),
      includeRagflow: Boolean(retrievalPlan?.includeRagflow || normalizedInput.evidenceQuery?.includeRagflow),
    });
    assertResolvedEvidencePack(evidencePack);
    const evidenceItems = normalizeEvidencePackCitations(evidencePack);
    if (evidenceItems.length) {
      context.evidence = {
        status: 'resolved',
        query,
        items: evidenceItems,
        pack: evidencePack,
      };
    }
  } catch (error) {
    if (!providedEvidence.length) {
      throw new Error(`DataBase EvidencePack retrieval is required for article generation: ${error instanceof Error ? error.message : String(error)}`);
    }
    warnings.push(`EvidencePack refresh unavailable; using provided DataBase sourcePassages: ${error instanceof Error ? error.message : String(error)}`);
  }

  try {
    const stylePack = await readArticleStylePack({
      query: readArticleStyleQuery(normalizedInput),
      sourceIds: Array.isArray(normalizedInput.styleQuery?.sourceIds) ? normalizedInput.styleQuery.sourceIds : [],
      limit: Number(normalizedInput.styleQuery?.limit || 0) || 6,
    });
    assertStylePackResponse(stylePack as StylePack);
    const profiles = normalizeArticleStylePackProfiles(stylePack);
    context.stylePack = {
      status: profiles.length ? 'resolved' : 'empty',
      query: String(stylePack.query || ''),
      sourceIds: Array.isArray(stylePack.sourceIds) ? stylePack.sourceIds.map(String) : [],
      pack: stylePack,
      profiles,
    };
  } catch (error) {
    throw new Error(`DataBase StylePack retrieval is required for article generation: ${error instanceof Error ? error.message : String(error)}`);
  }

  try {
    const tag = Array.isArray(input.evidenceQuery?.semanticTags) && input.evidenceQuery.semanticTags.length > 0
      ? String(input.evidenceQuery.semanticTags[0]).trim() || undefined
      : undefined;
    const limit = Number(input.evidenceQuery?.limit || 0) || 8;
    const semantic = await getSemanticContextRepository().load({
      text: query,
      tag,
      materialKinds: ['theory', 'comparison', 'observer', 'document', 'literary'],
      unitLimit: Math.max(1, Math.min(limit, 20)),
      relationLimit: 20,
    });
    const normalizedUnits = rankArticleSemanticUnits({
      query,
      topic: input.topic,
      target: input.target,
      units: semantic.units.map((unit) => ({
        id: unit.id,
        sourceTitle: unit.sourceTitle,
        sourceAuthor: unit.sourceAuthor,
        sourceLocator: unit.sourceLocator,
        excerpt: unit.excerpt,
        summary: unit.summary,
        materialKind: readSemanticUnitMaterialKind(unit),
        tags: Array.isArray(unit.tags)
          ? unit.tags.map((tagItem: any) => String(tagItem.value || tagItem.name || tagItem.label || tagItem.id || '')).filter(Boolean)
          : [],
        searchScore: unit.searchScore,
      })),
      limit,
    });
    context.semantic = {
      status: 'resolved',
      query: semantic.query,
      units: normalizedUnits,
      relations: semantic.relations.map((relation) => ({
        id: relation.id,
        relationType: relation.relationType,
        fromUnitId: relation.fromUnitId,
        toUnitId: relation.toUnitId,
        description: relation.description,
      })),
      counts: {
        units: normalizedUnits.length,
        relations: semantic.counts.relations,
      },
    };
  } catch (error) {
    warnings.push(`semantic context unavailable: ${error instanceof Error ? error.message : String(error)}`);
  }

  try {
    const workId = readOptionalPositiveInteger(input.workId);
    const chapterNumber = readOptionalPositiveInteger(input.chapterNumber);
    if (workId && chapterNumber) {
      const memory = await readArticleMemoryContext({ workId, chapterNumber, query });
      context.memory = {
        status: memory.length ? 'resolved' : 'empty',
        query,
        items: memory,
      };
    }
  } catch (error) {
    warnings.push(`story memory context unavailable: ${error instanceof Error ? error.message : String(error)}`);
  }

  try {
    const literature = await readArticleLiteratureContext({ query, limit: 8 });
    context.literature = {
      status: literature.length ? 'resolved' : 'empty',
      query,
      items: literature,
    };
  } catch (error) {
    warnings.push(`literature context unavailable: ${error instanceof Error ? error.message : String(error)}`);
  }

  try {
    const experience = await readArticleExperienceContext({
      query,
      topic: input.topic,
      target: input.target,
      limit: 12,
    });
    context.experience = {
      status: experience.length ? 'resolved' : 'empty',
      query,
      items: experience,
    };
  } catch (error) {
    warnings.push(`experience context unavailable: ${error instanceof Error ? error.message : String(error)}`);
  }

  return context;
}

function readArticleContextQuery(input: RuntimeGenerateArticleRequest): string {
  if (input.retrievalPlan?.query) {
    return String(input.retrievalPlan.query).trim().slice(0, 800);
  }
  // EvidencePack 检索只吃主题、用户材料和显式检索词；版式目标、字数、结构参数不参与资料召回。
  return [
    input.topic,
    Array.isArray(input.sourcePassages) ? input.sourcePassages.map((item) => `${item.title || ''} ${item.excerpt || ''}`).join(' ') : '',
    input.evidenceQuery?.query || '',
  ].filter(Boolean).join(' ').slice(0, 800);
}

function readArticleStyleQuery(input: RuntimeGenerateArticleRequest): string {
  // StylePack 只接收显式风格检索词；未传时用主题，让 DataBase 决定召回策略。
  const styleQuery = String(input.styleQuery?.query || '').trim();
  if (styleQuery) {
    return styleQuery.slice(0, 500);
  }
  return String(input.topic || '').trim().slice(0, 500);
}

function buildArticleContextScaffold(query: string, warnings: string[] = []): RuntimeArticleContext {
  return {
    styleContract: {
      status: 'unavailable',
      protocolId: '',
      name: '',
      writingTechniques: [],
      authorTechniques: [],
      qualityRules: [],
      sourceMaterials: [],
      preferredTerms: [],
      bannedTerms: [],
      qualityRuleCount: 0,
      techniqueCount: 0,
      authorTechniqueCount: 0,
    },
    semantic: {
      status: 'unavailable',
      query,
      units: [],
      relations: [],
      counts: { units: 0, relations: 0 },
    },
    evidence: {
      status: 'empty',
      query,
      items: [],
    },
    stylePack: {
      status: 'empty',
      query,
      sourceIds: [],
      profiles: [],
    },
    memory: {
      status: 'empty',
      query,
      items: [],
    },
    literature: {
      status: 'empty',
      query,
      items: [],
    },
    learning: {
      status: 'empty',
      events: [],
      activeSource: '',
      promotionRule: '',
    },
    experience: {
      status: 'empty',
      query,
      items: [],
    },
    warnings,
  };
}

function assertResolvedStyleContract(context: RuntimeArticleContext): void {
  if (context.styleContract?.status !== 'resolved') {
    throw new Error('DataBase creative style contract is required for article generation');
  }
  if (!context.styleContract.protocolId) {
    throw new Error('DataBase creative style contract is missing protocolId');
  }
  if (!Array.isArray(context.styleContract.preferredTerms) || context.styleContract.preferredTerms.length === 0) {
    throw new Error('DataBase creative style contract is missing preferred vocabulary');
  }
  if (!Array.isArray(context.styleContract.bannedTerms) || context.styleContract.bannedTerms.length === 0) {
    throw new Error('DataBase creative style contract is missing banned vocabulary');
  }
  if (!Array.isArray(context.styleContract.writingTechniques) || context.styleContract.writingTechniques.length === 0) {
    throw new Error('DataBase creative style contract is missing writing techniques');
  }
  if (!Array.isArray(context.styleContract.authorTechniques) || context.styleContract.authorTechniques.length === 0) {
    throw new Error('DataBase creative style contract is missing author techniques');
  }
}

function assertResolvedEvidencePack(pack: Record<string, any>): void {
  const queryRun = pack?.queryRun && typeof pack.queryRun === 'object' ? pack.queryRun : {};
  const screening = pack?.screening && typeof pack.screening === 'object' ? pack.screening : {};
  const sources = Array.isArray(pack?.sources) ? pack.sources : [];
  const chunks = Array.isArray(pack?.chunks) ? pack.chunks : [];
  const citations = Array.isArray(pack?.citations) ? pack.citations : [];
  const rounds = Array.isArray(queryRun.rounds) ? queryRun.rounds : [];
  if (!pack || typeof pack !== 'object') {
    throw new Error('DataBase EvidencePack returned no object');
  }
  if (!queryRun.provider || rounds.length === 0) {
    throw new Error('DataBase EvidencePack is missing queryRun rounds');
  }
  if (!screening.version || Number(screening.queryCount || 0) <= 0) {
    throw new Error('DataBase EvidencePack is missing screening evidence');
  }
  if (sources.length === 0 || chunks.length === 0 || citations.length === 0) {
    throw new Error('DataBase EvidencePack must include at least one source, chunk and citation');
  }
}

function assertEvidencePackResponse(response: EvidencePack): void {
  if (!response || typeof response !== 'object') {
    throw new Error('DataBase EvidencePack gateway response is empty');
  }
  if (!Array.isArray(response.sources) || !Array.isArray(response.chunks) || !Array.isArray(response.citations)) {
    throw new Error('DataBase EvidencePack gateway response violates contract: sources/chunks/citations must be arrays');
  }
  if (!response.queryRun || !Array.isArray(response.queryRun.rounds)) {
    throw new Error('DataBase EvidencePack gateway response violates contract: queryRun.rounds must be an array');
  }
}

function assertStylePackResponse(response: StylePack): void {
  if (!response || typeof response !== 'object') {
    throw new Error('DataBase StylePack gateway response is empty');
  }
  if (!Array.isArray(response.profiles) || !Array.isArray(response.constraints)) {
    throw new Error('DataBase StylePack gateway response violates contract: profiles/constraints must be arrays');
  }
  if (!response.screening || typeof response.screening !== 'object') {
    throw new Error('DataBase StylePack gateway response violates contract: screening is required');
  }
}

function readArticleEvidenceSizing(input: RuntimeGenerateArticleRequest): { limit: number; rounds: number } {
  const targetWordCount = Number(input.structure?.targetWordCount || 0);
  const requestedLimit = Number(input.evidenceQuery?.limit || 0);
  const requestedRounds = Number(input.evidenceQuery?.rounds || 0);
  const strictArticleEvidence = Boolean(input.evidenceQuery?.includeWeb || input.evidenceQuery?.includeRagflow)
    && ['article', 'article_draft', 'commentary', 'draft', 'obsidian-video-script'].includes(String(input.target || 'draft').trim() || 'draft');
  const defaultLimit = targetWordCount >= 9000 ? 20 : targetWordCount >= 6000 ? 16 : targetWordCount >= 3600 ? 12 : strictArticleEvidence ? 10 : 8;
  const defaultRounds = targetWordCount >= 9000 ? 8 : targetWordCount >= 6000 ? 6 : strictArticleEvidence ? 6 : 4;
  const effectiveLimit = strictArticleEvidence
    ? Math.max(Number.isFinite(requestedLimit) && requestedLimit > 0 ? requestedLimit : defaultLimit, defaultLimit)
    : Number.isFinite(requestedLimit) && requestedLimit > 0 ? requestedLimit : defaultLimit;
  const effectiveRounds = strictArticleEvidence
    ? Math.max(Number.isFinite(requestedRounds) && requestedRounds > 0 ? requestedRounds : defaultRounds, defaultRounds)
    : Number.isFinite(requestedRounds) && requestedRounds > 0 ? requestedRounds : defaultRounds;
  // 长文需要更多材料切面。这里仅调整 DataBase Gateway 的检索请求，不在 ContentBase 建第二套材料库。
  return {
    limit: Math.max(1, Math.min(effectiveLimit, 20)),
    rounds: Math.max(1, Math.min(effectiveRounds, 12)),
  };
}

function normalizeArticleProcessPlanInput(value: unknown): RuntimeArticleContext['styleContract']['processPlan'] | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }
  const record = value as Record<string, unknown>;
  return {
    series: String(record.series || '').trim() || undefined,
    episode: String(record.episode || '').trim() || undefined,
    timeBoundary: String(record.timeBoundary || '').trim() || undefined,
    viewpointBoundary: String(record.viewpointBoundary || '').trim() || undefined,
    knowledgeBoundary: String(record.knowledgeBoundary || '').trim() || undefined,
    sceneEntrances: toStringList(record.sceneEntrances),
    eventSequence: toStringList(record.eventSequence),
    narrativeMoves: toStringList(record.narrativeMoves),
    imageMotifs: toStringList(record.imageMotifs),
    pacingRules: toStringList(record.pacingRules),
    dictionRules: toStringList(record.dictionRules),
    forbiddenMoves: toStringList(record.forbiddenMoves),
    endingHook: String(record.endingHook || '').trim() || undefined,
    required: Boolean(record.required),
  };
}

function normalizeArticleNarrativeProtocolInput(value: unknown): RuntimeArticleContext['styleContract']['narrativeProtocol'] | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }
  return value as RuntimeArticleContext['styleContract']['narrativeProtocol'];
}

export function rankArticleSemanticUnits(input: {
  query: string;
  topic: string;
  target?: string;
  units: RuntimeArticleContext['semantic']['units'];
  limit: number;
}): RuntimeArticleContext['semantic']['units'] {
  const queryTokens = tokenizeRetrievalText([input.topic, input.query].join(' '));
  const ranked = input.units
    .map((unit) => ({
      unit,
      score: scoreArticleSemanticUnit(unit, queryTokens),
    }))
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score);
  return ranked.slice(0, Math.max(1, Math.min(input.limit, 20))).map((item) => item.unit);
}

function scoreArticleSemanticUnit(
  unit: RuntimeArticleContext['semantic']['units'][number],
  queryTokens: string[],
): number {
  const haystack = [
    unit.id,
    unit.sourceTitle,
    unit.sourceAuthor,
    unit.sourceLocator,
    unit.summary,
    unit.excerpt,
    ...unit.tags,
  ].map((item) => String(item || '')).join(' ');
  if (/smoke|test fixture|debug seed|placeholder|占位/i.test(haystack)) {
    return 0;
  }
  const normalized = normalizeRetrievalText(haystack);
  const lexicalHits = queryTokens.filter((token) => token.length >= 2 && normalized.includes(token)).length;
  const gatewayScore = Number(unit.searchScore || 0);
  const materialBoost = unit.materialKind === 'theory' ? 3 : unit.materialKind === 'observer' ? 2 : 1;
  // DataBase 原始分数只作为同等主题命中下的辅助排序，不能压过本轮 query 的主题重合。
  return lexicalHits * 10 + Math.min(Number.isFinite(gatewayScore) ? gatewayScore : 0, 20) + materialBoost;
}

function tokenizeRetrievalText(value: string): string[] {
  const normalized = normalizeRetrievalText(value);
  const cjk = normalized.match(/[\u4e00-\u9fa5]{2,}/g) || [];
  const ascii = normalized.match(/[a-z0-9_]{2,}/g) || [];
  const terms = new Set<string>();
  [...cjk, ...ascii].forEach((token) => {
    terms.add(token);
    for (let size = 2; size <= Math.min(6, token.length); size += 1) {
      for (let index = 0; index <= token.length - size; index += 1) {
        terms.add(token.slice(index, index + size));
      }
    }
  });
  return Array.from(terms).filter((item) => !/^(文章|生成|draft|article|target)$/.test(item));
}

function normalizeRetrievalText(value: string): string {
  return String(value || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function normalizeArticleAuthorialConstitutionInput(value: unknown): RuntimeArticleContext['styleContract']['authorialConstitution'] | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }
  const record = value as Record<string, unknown>;
  return {
    coreLaw: String(record.coreLaw || record.core_law || '').trim() || undefined,
    cannotDo: toStringList(record.cannotDo || record.cannot_do),
    blockers: toStringList(record.blockers),
  };
}

function normalizeArticleAuthorProfile(value: unknown): RuntimeArticleContext['styleContract']['authorProfile'] | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }
  const record = value as Record<string, unknown>;
  return {
    id: String(record.id || '').trim() || undefined,
    stance: String(record.stance || '').trim() || undefined,
    voice: toStringList(record.voice),
    narrativeTechniques: toStringList(record.narrativeTechniques),
    preferredDiction: toStringList(record.preferredDiction),
    rejectedDiction: toStringList(record.rejectedDiction),
    qualityNorthStar: String(record.qualityNorthStar || '').trim() || undefined,
    authorialConstitution: normalizeArticleAuthorialConstitutionInput(record.authorialConstitution || record.authorial_constitution),
  };
}

function normalizeLexiconLifecycle(value: unknown): {
  activeSource: string;
  promotionRule: string;
  events: string[];
} {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { activeSource: '', promotionRule: '', events: [] };
  }
  const record = value as Record<string, unknown>;
  return {
    activeSource: String(record.activeSource || '').trim(),
    promotionRule: String(record.promotionRule || '').trim(),
    events: [
      ...toStringList(record.learningEvents),
      ...toStringList(record.events),
    ],
  };
}

function readOptionalPositiveInteger(value: unknown): number | undefined {
  const numberValue = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numberValue) || numberValue <= 0) {
    return undefined;
  }
  return Math.floor(numberValue);
}

async function readArticleMemoryContext(input: {
  workId: number;
  chapterNumber: number;
  query: string;
}): Promise<RuntimeArticleContext['memory']['items']> {
  const client = createDataBaseGatewayClient();
  const response = await client.getStoryMemoryContext({
    workId: input.workId,
    currentChapter: input.chapterNumber,
    limit: 8,
  });
  return normalizeArticleMemoryItems(response, input.query);
}

function normalizeArticleMemoryItems(
  response: StoryMemoryContextResponse,
  fallbackQuery: string,
): RuntimeArticleContext['memory']['items'] {
  if (!response || typeof response !== 'object') {
    throw new Error('DataBase story memory context response is empty');
  }
  const record = response as unknown as Record<string, any>;
  const candidates = [
    ...arrayFrom(record.items),
    ...arrayFrom(record.memories),
    ...arrayFrom(record.events),
    ...arrayFrom(record.storyEvents),
    ...arrayFrom(record.importantItems),
    ...arrayFrom(record.characterGrowth),
  ];
  const summary = String(record.summary || record.prompt || record.context || '').trim();
  const fromSummary = summary
    ? [{
      id: String(record.id || 'story-memory-context'),
      title: 'DataBase 故事记忆摘要',
      summary,
      source: 'memoryContext' as const,
    }]
    : [];
  return [
    ...fromSummary,
    ...candidates.map((item, index) => {
      const value = item && typeof item === 'object' && !Array.isArray(item)
        ? item as Record<string, any>
        : { summary: String(item || '').trim() };
      const itemSummary = String(value.summary || value.description || value.content || value.text || value.event || '').trim();
      return {
        id: String(value.id || value.memoryId || `story-memory-${index + 1}`),
        title: String(value.title || value.name || value.kind || value.type || fallbackQuery || `故事记忆 ${index + 1}`).trim(),
        summary: itemSummary,
        source: 'storyMemory' as const,
        score: Number.isFinite(Number(value.score)) ? Number(value.score) : null,
      };
    }),
  ].filter((item) => item.title && item.summary).slice(0, 8);
}

async function readArticleLiteratureContext(input: {
  query: string;
  limit: number;
}): Promise<RuntimeArticleContext['literature']['items']> {
  const client = createDataBaseGatewayClient();
  const response = await client.listLiterature({
    search: input.query,
    limit: input.limit,
  });
  assertLiteratureResponse(response);
  const records = response.literature;
  return records.map((item, index) => {
    const record = item && typeof item === 'object' && !Array.isArray(item)
      ? item as Record<string, any>
      : { title: String(item || '').trim() };
    return {
      id: String(record.id || record.literatureId || `literature-${index + 1}`),
      title: String(record.title || record.name || '').trim(),
      author: record.author == null ? null : String(record.author).trim(),
      summary: String(record.summary || record.description || record.excerpt || record.note || '').trim() || null,
      category: record.category == null ? null : String(record.category).trim(),
      content: compactPromptText(record.content || record.text || '', 1800) || null,
      originalSource: record.source == null ? null : String(record.source).trim(),
      note: record.note == null ? null : String(record.note).trim(),
      tags: parseTextTags(record.tags),
      priority: Number.isFinite(Number(record.priority)) ? Number(record.priority) : null,
      source: 'literature' as const,
    };
  }).filter((item) => item.title).slice(0, input.limit);
}

async function readArticleExperienceContext(input: {
  query: string;
  topic: string;
  target?: string;
  limit: number;
}): Promise<RuntimeArticleContext['experience']['items']> {
  const search = buildArticleExperienceSearch(input);
  const response = await createContentDatabaseClient().memory.experiences({
    type: 'article_experience',
    search,
    // 多取一层再在 ContentBase 做任务相关性排序；DataBase 仍是长期真相，ContentBase 只做本次运行筛选。
    limit: Math.max(input.limit, Math.min(input.limit * 3, 36)),
  });
  const records = Array.isArray(response.experienceRecords) ? response.experienceRecords : [];
  return rankArticleExperienceRecords({
    query: input.query,
    topic: input.topic,
    target: input.target,
    limit: input.limit,
    records,
  });
}

function buildArticleExperienceSearch(input: {
  query: string;
  topic: string;
  target?: string;
}): string {
  return [
    input.topic,
    input.target,
    compactPromptText(input.query, 160),
    'article_experience article-experience-report reviewer rewind rewrite prompt style retrieval quality acceptance',
  ].filter(Boolean).join(' ').slice(0, 260);
}

export function rankArticleExperienceRecords(input: {
  query: string;
  topic: string;
  target?: string;
  limit: number;
  records: any[];
}): RuntimeArticleContext['experience']['items'] {
  const queryTokens = tokenizeRetrievalText([input.query, input.topic, input.target].filter(Boolean).join(' '));
  const ranked = input.records
    .map((record, index) => {
      const item = normalizeArticleExperienceRecord(record, index);
      const { score, reasons } = scoreArticleExperienceRecord(item, record, queryTokens, input);
      return {
        item: {
          ...item,
          score,
          reasons,
        },
        score,
      };
    })
    .filter((entry) => entry.item.summary || entry.item.title)
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || String(a.item.id).localeCompare(String(b.item.id)));
  return ranked.slice(0, Math.max(1, Math.min(input.limit, 20))).map((entry) => entry.item);
}

function normalizeArticleExperienceRecord(record: any, index: number): RuntimeArticleContext['experience']['items'][number] {
  const payload = normalizeArticleExperiencePayload(record);
  const tags = normalizeArticleExperienceTags(record, payload);
  const title = String(record?.title || payload.topic || record?.topic || payload.summary || record?.summary || '文章经验').trim();
  const summary = compactPromptText([
    record?.content,
    record?.summary,
    record?.note,
    payload.reusableLesson,
    payload.failureLesson,
    payload.summary,
    buildArticleExperiencePayloadSummary(payload),
  ].filter(Boolean).join(' '), 900);
  return {
    id: String(record?.id || record?.record_id || record?.experienceId || payload.id || `article-experience-${index + 1}`),
    title,
    summary,
    passed: readExperiencePassed(record, payload),
    topic: stringOrNull(payload.topic || record?.topic),
    target: stringOrNull(payload.target || record?.target),
    type: stringOrNull(record?.type || payload.type || payload.recordType),
    tags,
    score: null,
    reasons: [],
    version: stringOrNull(payload.version || record?.version),
    createdAt: stringOrNull(record?.createdAt || record?.created_at || payload.createdAt),
    recordType: stringOrNull(record?.type || payload.type || 'article_experience'),
    source: 'experienceRecord',
  };
}

function normalizeArticleExperiencePayload(record: any): Record<string, any> {
  const candidates = [
    record?.payload,
    record?.envelope?.payload,
    record?.data,
    record?.result,
  ];
  for (const candidate of candidates) {
    if (candidate && typeof candidate === 'object' && !Array.isArray(candidate)) {
      return candidate as Record<string, any>;
    }
    if (typeof candidate === 'string') {
      try {
        const parsed = JSON.parse(candidate);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          return parsed as Record<string, any>;
        }
      } catch {
        // DataBase 可能只返回普通文本 content；解析失败不应中断经验回读。
      }
    }
  }
  return {};
}

function normalizeArticleExperienceTags(record: any, payload: Record<string, any>): string[] {
  const rawTags = [
    ...collectRawArticleExperienceTags(record?.tags),
    ...collectRawArticleExperienceTags(payload.tags),
    ...collectRawArticleExperienceTags(record?.labels),
    ...collectRawArticleExperienceTags(payload.labels),
  ];
  return rawTags
    .map((tag: any) => {
      if (tag && typeof tag === 'object' && !Array.isArray(tag)) {
        return String(tag.value || tag.name || tag.label || tag.id || '').trim();
      }
      return String(tag || '').trim();
    })
    .filter(Boolean)
    .filter((item, index, list) => list.indexOf(item) === index)
    .slice(0, 24);
}

function collectRawArticleExperienceTags(value: unknown): any[] {
  if (Array.isArray(value)) {
    return value;
  }
  return parseTextTags(value);
}

function buildArticleExperiencePayloadSummary(payload: Record<string, any>): string {
  const warnings = Array.isArray(payload.reviewerWarnings) ? payload.reviewerWarnings.slice(0, 8).join('、') : '';
  const quality = Array.isArray(payload.qualityWarnRules) ? payload.qualityWarnRules.slice(0, 8).join('、') : '';
  const blocks = Array.isArray(payload.qualityBlockRules) ? payload.qualityBlockRules.slice(0, 8).join('、') : '';
  return [
    payload.version ? `版本 ${payload.version}` : '',
    payload.passed === true ? '经验结果 通过' : payload.passed === false ? '经验结果 未通过' : '',
    warnings ? `审稿问题 ${warnings}` : '',
    quality ? `质量警告 ${quality}` : '',
    blocks ? `阻断问题 ${blocks}` : '',
    Number.isFinite(Number(payload.referenceCoverageScore)) ? `引用覆盖 ${Number(payload.referenceCoverageScore)}` : '',
  ].filter(Boolean).join('。');
}

function scoreArticleExperienceRecord(
  item: RuntimeArticleContext['experience']['items'][number],
  rawRecord: any,
  queryTokens: string[],
  request: {
    topic: string;
    target?: string;
  },
): { score: number; reasons: string[] } {
  const haystack = normalizeRetrievalText([
    item.id,
    item.title,
    item.summary,
    item.topic,
    item.target,
    item.type,
    item.version,
    item.recordType,
    ...item.tags,
  ].filter(Boolean).join(' '));
  if (/smoke|test fixture|debug seed|placeholder|占位/i.test(haystack)) {
    return { score: 0, reasons: ['debug_or_placeholder_filtered'] };
  }
  const reasons: string[] = [];
  let score = 0;
  const lexicalHits = queryTokens.filter((token) => token.length >= 2 && haystack.includes(token)).length;
  if (lexicalHits > 0) {
    score += lexicalHits * 4;
    reasons.push(`lexical_hits:${lexicalHits}`);
  }
  if (item.topic && normalizeRetrievalText(item.topic) === normalizeRetrievalText(request.topic)) {
    score += 24;
    reasons.push('topic_exact');
  } else if (item.topic && normalizeRetrievalText(request.topic).includes(normalizeRetrievalText(item.topic))) {
    score += 10;
    reasons.push('topic_partial');
  }
  if (item.target && request.target && normalizeRetrievalText(item.target) === normalizeRetrievalText(request.target)) {
    score += 8;
    reasons.push('target_exact');
  }
  if (item.passed === true) {
    score += 4;
    reasons.push('passed');
  } else if (item.passed === false) {
    score += 2;
    reasons.push('failed_lesson');
  }
  if (item.version === 'article-experience-report.v1') {
    score += 6;
    reasons.push('current_version');
  }
  if (item.tags.includes('experience-record') || item.tags.includes('article-generation')) {
    score += 3;
    reasons.push('runtime_tag');
  }
  const gatewayScore = Number(rawRecord?.score || rawRecord?.searchScore || rawRecord?.rankScore || 0);
  if (Number.isFinite(gatewayScore) && gatewayScore > 0) {
    score += Math.min(gatewayScore, 20);
    reasons.push('gateway_score');
  }
  return {
    score,
    reasons,
  };
}

function readExperiencePassed(record: any, payload: Record<string, any>): boolean | null {
  if (typeof payload.passed === 'boolean') return payload.passed;
  if (typeof record?.passed === 'boolean') return record.passed;
  if (typeof record?.result?.passed === 'boolean') return record.result.passed;
  return null;
}

function stringOrNull(value: unknown): string | null {
  const text = String(value || '').trim();
  return text || null;
}

function assertLiteratureResponse(response: LiteratureResponse): void {
  if (!response || typeof response !== 'object') {
    throw new Error('DataBase literature gateway response is empty');
  }
  if (!Array.isArray(response.literature)) {
    throw new Error('DataBase literature gateway response violates contract: literature must be an array');
  }
}

function normalizeSourcePassageEvidence(sourcePassages: Array<Record<string, any>>) {
  return sourcePassages
    .slice(0, 12)
    .map((item, index) => ({
      title: String(item.title || item.sourceTitle || item.name || `来源材料 ${index + 1}`).trim(),
      excerpt: String(item.excerpt || item.text || item.summary || '').trim(),
      sourceId: String(item.sourceId || item.id || '').trim() || undefined,
      sourceType: 'sourcePassage' as const,
    }))
    .filter((item) => item.title || item.excerpt);
}

async function readArticleEvidencePack(input: {
  query: string;
  topic?: string;
  target?: string;
  semanticTags?: string[];
  sourceIds?: string[];
  limit: number;
  rounds?: number;
  includeWeb?: boolean;
  includeRagflow?: boolean;
}): Promise<Record<string, any>> {
  const q = String(input.query || '').trim();
  if (!q) {
    throw new Error('EvidencePack query is empty');
  }

  const client = createDataBaseGatewayClient();
  const limit = Math.max(1, Math.min(input.limit || 8, 20));
  const response = await client.searchEvidencePack({
    q,
    topic: input.topic,
    target: input.target,
    semanticTags: Array.isArray(input.semanticTags) ? input.semanticTags.join(',') : '',
    sourceIds: Array.isArray(input.sourceIds) ? input.sourceIds.join(',') : '',
    limit,
    rounds: Math.max(1, Math.min(Number(input.rounds || 0) || 4, 12)),
    includeWeb: Boolean(input.includeWeb),
    includeRagflow: Boolean(input.includeRagflow),
  });
  assertEvidencePackResponse(response);
  return response as unknown as Record<string, any>;
}

async function readArticleStylePack(input: {
  query: string;
  sourceIds?: string[];
  limit: number;
}): Promise<Record<string, any>> {
  const q = String(input.query || '').trim();
  if (!q) {
    throw new Error('StylePack query is empty');
  }

  const client = createDataBaseGatewayClient();
  const response = await client.getStylePack({
    q,
    sourceIds: Array.isArray(input.sourceIds) ? input.sourceIds.join(',') : '',
    limit: Math.max(1, Math.min(Number(input.limit || 0) || 6, 20)),
  });
  assertStylePackResponse(response);
  return response as unknown as Record<string, any>;
}

function normalizeArticleStylePackProfiles(pack: Record<string, any>): RuntimeArticleContext['stylePack']['profiles'] {
  const profiles = Array.isArray(pack.profiles) ? pack.profiles : [];
  return profiles
    .map((item: any) => ({
      id: String(item.id || '').trim(),
      sourceId: item.sourceId == null ? null : String(item.sourceId).trim(),
      sourceTitle: String(item.sourceTitle || '').trim(),
      sourceAuthor: item.sourceAuthor == null ? null : String(item.sourceAuthor).trim(),
      summary: String(item.summary || '').trim(),
      sentenceLengthBand: String(item.sentenceLengthBand || '').trim(),
      paragraphDensity: String(item.paragraphDensity || '').trim(),
      progressionMoves: toStringList(item.progressionMoves),
      rhetoricalMoves: toStringList(item.rhetoricalMoves),
      imageryClusters: toStringList(item.imageryClusters),
      constraints: toStringList(item.constraints),
    }))
    .filter((item) => item.id && item.sourceTitle)
    .slice(0, 12);
}

function normalizeEvidencePackCitations(pack: Record<string, any>) {
  const citations = Array.isArray(pack.citations) ? pack.citations : [];
  return citations
    .map((item: any) => ({
      title: String(item.title || '').trim(),
      excerpt: String(item.excerpt || '').trim(),
      sourceId: String(item.sourceId || item.id || '').trim() || undefined,
      sourceType: 'evidencePack' as const,
      locator: String(item.locator || '').trim() || undefined,
      relevanceScore: Number.isFinite(Number(item.relevanceScore)) ? Number(item.relevanceScore) : undefined,
    }))
    .filter((item: any) => item.title || item.excerpt);
}

function readSemanticUnitMaterialKind(unit: unknown): SourcePassageMaterialKind | null {
  const record = unit && typeof unit === 'object' && !Array.isArray(unit)
    ? unit as Record<string, unknown>
    : {};
  const direct = String(record.materialKind || '').trim();
  if (isSemanticMaterialKind(direct)) return direct;
  const tags = Array.isArray(record.tags) ? record.tags : [];
  for (const tag of tags) {
    if (!tag || typeof tag !== 'object' || Array.isArray(tag)) continue;
    const tagRecord = tag as Record<string, unknown>;
    const value = String(tagRecord.value || tagRecord.name || tagRecord.label || '').trim();
    const materialKind = value.replace(/^reference:/, '');
    if (isSemanticMaterialKind(materialKind)) return materialKind;
  }
  return null;
}

function isSemanticMaterialKind(value: string): value is SourcePassageMaterialKind {
  return ['document', 'theory', 'comparison', 'observer', 'literary'].includes(value);
}

export function normalizeSourcePassageKind(value: unknown): SourcePassageMaterialKind {
  const raw = String(value || '').trim().toLowerCase();
  if (
    raw.includes('theory')
    || raw.includes('理论')
    || raw.includes('学说')
    || raw.includes('主义')
    || raw.includes('再生产')
    || raw.includes('新阶级')
    || raw.includes('权力精英')
    || raw.includes('寡头')
    || raw.includes('地租')
    || raw.includes('寻租')
  ) return 'theory';
  if (raw.includes('comparison') || raw.includes('比较') || raw.includes('对照')) return 'comparison';
  if (raw.includes('observer') || raw.includes('观察') || raw.includes('记者') || raw.includes('新闻') || raw.includes('报道') || raw.includes('舆情')) return 'observer';
  if (
    raw.includes('literary')
    || raw.includes('literature')
    || raw.includes('文献')
    || raw.includes('文学')
    || raw.includes('史料')
    || raw.includes('典籍')
    || raw.includes('诗')
    || raw.includes('小说')
    || raw.includes('典故')
  ) return 'literary';
  return 'document';
}

function arrayFrom(value: unknown): any[] {
  return Array.isArray(value) ? value : [];
}

export function compactPromptText(value: unknown, maxLength: number): string {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

function parseTextTags(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(String).map((item) => item.trim()).filter(Boolean);
  }
  return String(value || '')
    .split(/[，,、\s]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function toStringList(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String).map((item) => item.trim()).filter(Boolean) : [];
}
