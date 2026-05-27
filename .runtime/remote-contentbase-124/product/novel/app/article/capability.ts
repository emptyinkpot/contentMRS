import { CONTENT_RUNTIME_VERSION } from '../runtime-capabilities';
import type { ContentRuntimeDeps } from '../api-content-runtime';
import {
  buildRuntimeArticleDraft,
  buildRuntimeArticlePlan,
  buildRuntimeArticleTrace,
  calculateArticleReferenceCoverage as calculateArticleReferenceCoverageRaw,
  type RuntimeArticleContext,
  type RuntimeGenerateArticleRequest,
  type RuntimeArticleRetrievalPlan,
} from './runtime';
import {
  getLastInvokeMeta,
  invokeContentCraftLlm,
} from '../../core/manuscript/content-craft/src/utils/llm-client';
import { resolveContentCraftModel } from '../../core/manuscript/content-craft/src/utils/model-default';
import { createDataBaseGatewayClient } from '../../core/utils/database-gateway-client';
import { runArticleGenerationWorkflow } from './generation-workflow';
import type { ArticleObservationReport } from './observation-report';
import {
  extractArticlePressure,
  type ArticlePressureRuntime,
} from './pressure-runtime';
import { evaluateArticleDraftContract as evaluateArticleDraftContractRaw } from './evaluation';
import {
  normalizeGeneratedArticleBody,
  parseArticleModelOutput,
  readArticleGenerationMode,
} from './model-runtime';
import { isHistoricalRegisterActive } from './contracts';
import { applyTopicPresetToRequest } from './topic-preset';
import {
  compactPromptText,
  normalizeSourcePassageKind,
  resolveArticleContextWithWarnings,
  type SourcePassageMaterialKind,
} from './context';
import {
  buildArticleAgentContractBundle,
  buildArticleReviewerAgentReview,
  buildArticleResearchAgentPrompt,
  buildArticleReviewerAgentPrompt,
  buildArticleWriterAgentPrompt,
} from './article-agent-contracts';
import {
  buildArticleArgumentDigestFromMaterialFunctions,
  buildArticleMaterialFunctionPlan,
} from './context-engineering';
import { prioritizeMaterialEvidenceRecords } from './material-prioritization';
import {
  filterMaterialEvidenceByTopic,
  isStyleOrBroadCorpusAnchorMaterial,
  shouldRejectOffTopicMaterialText,
  tokenizeArticleMaterialText,
  isWeakArticleMaterialToken,
} from './material-relevance';
import {
  buildRestrictedStyleForegroundGuard,
  detectRestrictedStyleForegroundLeak,
  type RestrictedStyleForegroundGuard,
} from './style-profile-guard';
import {
  persistArticleAcceptanceReportIfRequested,
  persistArticleExperienceIfRequested,
  persistArticleReferenceUsageReportIfRequested,
  persistGeneratedArticleIfRequested,
  persistStyleRevisionPairsIfRequested,
  readPositiveInteger,
} from './persistence';

function evaluateArticleDraftContract(
  input: Parameters<typeof evaluateArticleDraftContractRaw>[0],
): ReturnType<typeof evaluateArticleDraftContractRaw> {
  return evaluateArticleDraftContractRaw({
    ...input,
    sourcePassages: normalizeQualitySourcePassages(input.sourcePassages || []),
  });
}

function calculateArticleReferenceCoverage(
  input: Parameters<typeof calculateArticleReferenceCoverageRaw>[0],
): ReturnType<typeof calculateArticleReferenceCoverageRaw> {
  return calculateArticleReferenceCoverageRaw({
    ...input,
    sourcePassages: normalizeQualitySourcePassages(input.sourcePassages || []),
  });
}

async function resolveArticleRetrievalPlan(input: {
  request: RuntimeGenerateArticleRequest;
  sourcePassages: Array<Record<string, any>>;
  model?: string;
  settings?: Record<string, any>;
  deps: ContentRuntimeDeps;
}): Promise<RuntimeArticleRetrievalPlan> {
  const explicit = normalizeRequestRetrievalPlan(input.request);
  if (input.request.retrievalPlan) {
    return explicit;
  }
  // 外部测试或上游服务显式注入完整 context 时，检索已由上游负责。
  if (input.deps.resolveArticleContext) {
    return explicit;
  }
  const autoEnabled = input.settings?.autoRetrievalPlanning === true
    || input.settings?.auto_retrieval_planning === true;
  if (!autoEnabled) {
    return explicit;
  }
  try {
    return await runModelRetrievalPlanner(input);
  } catch (_error) {
    // 检索规划失败不能伪造资料，只退回用户显式 query，再由 DataBase EvidencePack 决定是否可生成。
    return {
      ...explicit,
      notes: uniqueStrings([
        ...explicit.notes,
        'model retrieval planner unavailable, request query used',
      ]),
    };
  }
}

function normalizeRequestRetrievalPlan(input: RuntimeGenerateArticleRequest): RuntimeArticleRetrievalPlan {
  const query = buildRequestRetrievalQuery(input);
  return {
    version: 'article-retrieval-plan.v1',
    source: 'request',
    query,
    semanticTags: Array.isArray(input.evidenceQuery?.semanticTags)
      ? input.evidenceQuery.semanticTags.map(String).filter(Boolean).slice(0, 12)
      : [],
    includeWeb: Boolean(input.evidenceQuery?.includeWeb),
    includeRagflow: Boolean(input.evidenceQuery?.includeRagflow),
    sourceIds: Array.isArray(input.evidenceQuery?.sourceIds)
      ? input.evidenceQuery.sourceIds.map(String).filter(Boolean).slice(0, 24)
      : [],
    intent: String(input.target || 'article'),
    mustFind: uniqueStrings([
      String(input.topic || ''),
      String(input.evidenceQuery?.query || ''),
    ].filter(Boolean)).slice(0, 12),
    avoid: [],
    notes: [],
  };
}

async function runModelRetrievalPlanner(input: {
  request: RuntimeGenerateArticleRequest;
  sourcePassages: Array<Record<string, any>>;
  model?: string;
  settings?: Record<string, any>;
  deps: ContentRuntimeDeps;
}): Promise<RuntimeArticleRetrievalPlan> {
  const explicit = normalizeRequestRetrievalPlan(input.request);
  const systemPrompt = [
    '你是资料检索规划代理。',
    '任务是把用户主题和用户材料转成 DataBase EvidencePack 可用的检索计划。',
    '只输出 JSON，不写正文，不评价主题。',
    'query 要像搜索词，不要写文章要求，不要加入 article draft target 这类运行词。',
    '如果用户显式要求联网，query 必须适合 Web 检索。非英文主题要保留原文核心词，同时补入英文实体名、地点名、行业词和权威来源类型词，方便检索到国际机构、通讯社、行业媒体和官方统计材料。',
    '英文补充只能服务检索召回，不得加入未在主题或用户材料中出现的新事实判断。',
    'semanticTags 只放主题核心词。',
    'includeWeb 只有用户显式要求联网，或主题涉及近期事件、新闻、政策、人物、公司、价格、法律时才为 true。',
    'avoid 写入明显不该混入的材料域，例如无关世界史、无关历史类比、测试占位资料。',
  ].join('\n');
  const userPrompt = JSON.stringify({
    topic: input.request.topic,
    target: input.request.target,
    explicitEvidenceQuery: input.request.evidenceQuery?.query || '',
    explicitSemanticTags: input.request.evidenceQuery?.semanticTags || [],
    explicitSourceIds: input.request.evidenceQuery?.sourceIds || [],
    includeWebRequested: Boolean(input.request.evidenceQuery?.includeWeb),
    includeRagflowRequested: Boolean(input.request.evidenceQuery?.includeRagflow),
    sourcePassages: input.sourcePassages.slice(0, 12).map((item) => ({
      title: item.title || item.sourceTitle || item.name || '',
      excerpt: compactPromptText(String(item.excerpt || item.text || item.summary || ''), 260),
    })),
    outputSchema: {
      query: 'string',
      semanticTags: ['string'],
      includeWeb: 'boolean',
      includeRagflow: 'boolean',
      intent: 'string',
      mustFind: ['string'],
      avoid: ['string'],
      notes: ['string'],
    },
  }, null, 2);
  const temperature = Number.isFinite(Number(input.settings?.retrievalPlannerTemperature))
    ? Number(input.settings?.retrievalPlannerTemperature)
    : 0.1;
  const maxTokens = Math.max(300, Math.min(1200, Number(input.settings?.retrievalPlannerMaxTokens || 700) || 700));
  const result = input.deps.invokeArticleModel
    ? await input.deps.invokeArticleModel({
      systemPrompt,
      userPrompt,
      model: input.model,
      temperature,
      maxTokens,
    })
    : {
      text: await invokeContentCraftLlm([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ], {
        temperature,
        model: input.model || resolveContentCraftModel(),
        maxTokens,
      }),
  };
  const parsed = parseRetrievalPlannerJson(result.text);
  const plannedQuery = mergeRetrievalPlannerQuery({
    explicitQuery: explicit.query,
    plannedQuery: String(parsed.query || ''),
  });
  return {
    version: 'article-retrieval-plan.v1',
    source: 'model',
    query: plannedQuery || explicit.query,
    semanticTags: uniqueStrings([
      ...toStringList(parsed.semanticTags),
      ...explicit.semanticTags,
    ]).slice(0, 12),
    includeWeb: Boolean(explicit.includeWeb || parsed.includeWeb),
    includeRagflow: Boolean(explicit.includeRagflow || parsed.includeRagflow),
    sourceIds: explicit.sourceIds,
    intent: compactPromptText(String(parsed.intent || explicit.intent), 160),
    mustFind: uniqueStrings([
      ...toStringList(parsed.mustFind),
      ...explicit.mustFind,
    ]).slice(0, 16),
    avoid: uniqueStrings(toStringList(parsed.avoid)).slice(0, 16),
    notes: uniqueStrings(toStringList(parsed.notes)).slice(0, 12),
  };
}

function mergeRetrievalPlannerQuery(input: {
  explicitQuery: string;
  plannedQuery: string;
}): string {
  const explicitQuery = compactPromptText(String(input.explicitQuery || ''), 800);
  const plannedQuery = compactPromptText(String(input.plannedQuery || ''), 800);
  if (!explicitQuery) return plannedQuery;
  if (!plannedQuery) return explicitQuery;
  const explicitTokens = tokenizeArticleMaterialText(explicitQuery)
    .filter((token) => !isWeakArticleMaterialToken(token) && token.length >= 2);
  const plannedCompact = plannedQuery.replace(/\s+/g, '');
  const missingCoreTokens = explicitTokens
    .filter((token) => token.length >= 3)
    .filter((token) => !plannedCompact.includes(token))
    .slice(0, 8);
  if (!missingCoreTokens.length && plannedQuery.length >= Math.min(12, explicitQuery.length)) {
    return plannedQuery;
  }
  return compactPromptText([explicitQuery, plannedQuery].filter(Boolean).join(' '), 800);
}

function parseRetrievalPlannerJson(text: string): Record<string, any> {
  const raw = String(text || '').trim();
  const fenced = raw.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)?.[1]?.trim();
  const candidate = fenced || raw;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start < 0 || end < start) {
    throw new Error('retrieval planner returned no JSON object');
  }
  return JSON.parse(candidate.slice(start, end + 1));
}

function buildRequestRetrievalQuery(input: RuntimeGenerateArticleRequest): string {
  const baseParts = uniqueStrings([
    input.topic,
    Array.isArray(input.sourcePassages)
      ? input.sourcePassages.map((item) => `${item.excerpt || item.text || item.summary || ''}`).join(' ')
      : '',
    input.evidenceQuery?.query || '',
  ].map((item) => String(item || '').replace(/\s+/g, ' ').trim()).filter(Boolean));
  return baseParts.join(' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 800);
}

export async function runGenerateArticleCapability(
  input: Record<string, any>,
  deps: ContentRuntimeDeps,
): Promise<Record<string, any>> {
  const topic = String(input.topic || '').trim();
  if (!topic) {
    throw new Error('topic is required');
  }
  const target = String(input.target || 'draft').trim() || 'draft';
  const structure = input.structure && typeof input.structure === 'object' ? input.structure : {};
  const sourcePassages = Array.isArray(input.sourcePassages) ? input.sourcePassages : [];
  const promptSourcePassages = normalizePromptSafeSourcePassages(sourcePassages);
  const pressureRequired = isArticlePressureRequired(input.pressure);
  if (input.persist === true) {
    readPositiveInteger(input.workId, 'workId');
    readPositiveInteger(input.chapterNumber, 'chapterNumber');
  }
  rejectLegacyArticleRepairInput(input.repair);
  const generationMode = readArticleGenerationMode(input.generation, {
    hasInjectedModelProvider: Boolean(deps.invokeArticleModel),
  });
  const articleRequest = applyTopicPresetToRequest({
    ...input,
    topic,
    target,
    structure,
    sourcePassages: promptSourcePassages,
    generation: { mode: generationMode },
    topicId: String(input.topicId || '').trim() || undefined,
  });
  articleRequest.retrievalPlan = await resolveArticleRetrievalPlan({
    request: articleRequest,
    sourcePassages,
    model: String(input.settings?.model || input.model || '').trim() || undefined,
    settings: input.settings && typeof input.settings === 'object' && !Array.isArray(input.settings)
      ? input.settings as Record<string, any>
      : undefined,
    deps,
  });
  const workflow = await runArticleGenerationWorkflow({
    resolveContext: async () => ({
      context: await resolveArticleContextWithWarnings(articleRequest, deps.resolveArticleContext) as any,
    }),
    // 资料代理：只整理来源、语义、记忆和文献边界，不生成正文。
    buildMaterialPack: (state) => {
      const context = state.context as RuntimeArticleContext;
      const materialPack = buildArticleMaterialPack({
        topic,
        target,
        context,
        sourcePassages: promptSourcePassages,
      }) as any;
      assertProductionArticleMaterialPackWritable(materialPack);
      return { materialPack };
    },
    extractPressure: async (state) => {
      const context = state.context as RuntimeArticleContext;
      return {
        pressure: extractArticlePressure({
          topic,
          context,
          sourcePassages: promptSourcePassages,
          pressureInput: input.pressure && typeof input.pressure === 'object' ? input.pressure : undefined,
        }) as any,
      };
    },
    planArgument: async (state) => {
      const context = state.context as RuntimeArticleContext;
      const plan = buildRuntimeArticlePlan(articleRequest, context);
      const pressure = state.pressure as ArticlePressureRuntime | undefined;
      const pressureTransitions = pressure?.transitions || [];
      const pressurePlan = pressure
        ? {
          ...plan,
          pressureRuntime: pressure,
          pressureRequired,
          pressureTransitions,
        }
        : plan;
      const runtimeDraft = buildRuntimeArticleDraft({
        topic,
        target,
        styleProfileId: String(input.styleProfileId || '').trim() || undefined,
        context,
        plan: pressurePlan,
      });
      const materialPack = state.materialPack as Record<string, any> | undefined;
      const acceptanceContract = await buildArticleAcceptanceContractInput(articleRequest, context, deps, materialPack);
      return {
        plan: {
          plan: pressurePlan,
          runtimeDraft,
          acceptanceContract,
          sourcePassages: promptSourcePassages,
        } as any,
      };
    },
    // 写作简报代理：把资料包、作者模型和验收合同压成模型可执行的写作合同。
    buildClaimBudget: (state) => {
      const planState = state.plan as any;
      return {
        claimBudget: buildArticleClaimBudget({
          topic,
          target,
          plan: planState.plan,
          acceptanceContract: planState.acceptanceContract,
          materialPack: state.materialPack as Record<string, any> | undefined,
        }) as any,
      };
    },
    buildWritingBrief: (state) => {
      const context = state.context as RuntimeArticleContext;
      const planState = state.plan as any;
      const claimBudget = state.claimBudget as Record<string, any> | undefined;
      return {
        writingBrief: buildArticleWritingBrief({
          topic,
          target,
          context,
          plan: planState.plan,
          materialPack: state.materialPack as Record<string, any> | undefined,
          acceptanceContract: planState.acceptanceContract,
          claimBudget,
        }) as any,
      };
    },
    buildParagraphBlueprint: (state) => {
      const planState = state.plan as any;
      const writingBrief = state.writingBrief as Record<string, any> | undefined;
      const claimBudget = state.claimBudget as Record<string, any> | undefined;
      return {
        paragraphBlueprint: buildArticleParagraphBlueprint({
          topic,
          target,
          plan: planState.plan,
          materialPack: state.materialPack as Record<string, any> | undefined,
          claimBudget,
          writingBrief,
        }) as any,
      };
    },
    writeArticle: async (state) => {
      const context = state.context as RuntimeArticleContext;
      const planState = state.plan as any;
      const plan = planState.plan as ReturnType<typeof buildRuntimeArticlePlan>;
      const runtimeDraft = planState.runtimeDraft;
      const acceptanceContract = planState.acceptanceContract;
      const materialPack = state.materialPack as Record<string, any> | undefined;
      const writingBrief = state.writingBrief as Record<string, any> | undefined;
      const paragraphBlueprint = state.paragraphBlueprint as Record<string, any> | undefined;
      const modelDraft = generationMode === 'model'
        ? await generateArticleBodyWithModel({
          topic,
          target,
          context,
          plan,
          materialPack,
          writingBrief,
          paragraphBlueprint,
          runtimeDraftBody: runtimeDraft.body,
          runtimeDraftAst: runtimeDraft.draftAst,
          acceptanceContract,
          sourcePassages: promptSourcePassages,
          partBodies: Array.isArray(input.partBodies) ? input.partBodies : undefined,
          factClaims: Array.isArray(input.factClaims) ? input.factClaims : undefined,
          model: String(input.settings?.model || input.model || '').trim() || undefined,
          settings: input.settings && typeof input.settings === 'object' && !Array.isArray(input.settings)
            ? input.settings as Record<string, any>
            : undefined,
          deps,
        })
        : null;
      if (!modelDraft) {
        throw new Error('runtime.generate.article requires model prose output; generateArticleDraft and AST body paths are disabled');
      }
      const draft = {
        title: topic,
        body: modelDraft.text,
        summary: `围绕「${topic}」生成的模型扩写文章草稿。`,
        draftAst: runtimeDraft.draftAst,
        referenceCoverage: modelDraft.referenceCoverage || runtimeDraft.referenceCoverage,
        factClaims: modelDraft.factClaims,
        paragraphBlueprint,
        modelInvocation: modelDraft,
        basePrompt: modelDraft.basePrompt,
        frontmatter: {
          ...runtimeDraft.frontmatter,
          generationMode: 'model',
        },
      };
      const rawText = finalizeArticleDeliveryBody(String((draft as any).body || (draft as any).text || ''));
      if (!rawText.trim()) {
        throw new Error('article prose generation requires model output or an explicit generation provider; AST is semantic topology, not article body');
      }
      return {
        draft: {
          ...draft,
          body: rawText,
          draftAst: draft.draftAst || runtimeDraft.draftAst,
          referenceCoverage: draft.referenceCoverage || modelDraft?.referenceCoverage || runtimeDraft.referenceCoverage,
        },
      };
    },
    observeEvaluation: async (state) => {
      const planState = state.plan as any;
      const context = state.context as RuntimeArticleContext;
      const paragraphBlueprint = state.paragraphBlueprint as Record<string, any> | undefined;
      let draft = state.draft as any;
      let evaluation = evaluateArticleDraftContract({
        body: String(draft.body || ''),
        draft,
        plan: planState.plan,
        context,
        acceptanceContract: planState.acceptanceContract,
        sourcePassages: promptSourcePassages,
        materialPack: state.materialPack as Record<string, any> | undefined,
        partBodies: Array.isArray(input.partBodies) ? input.partBodies : undefined,
        factClaims: Array.isArray(input.factClaims)
          ? input.factClaims
          : Array.isArray(draft.factClaims)
            ? draft.factClaims
            : undefined,
        paragraphBlueprint,
        generationMode,
      });
      const revisionInput = input.revision && typeof input.revision === 'object' && !Array.isArray(input.revision)
        ? input.revision as Record<string, any>
        : {};
      const layeredRevisionEnabled = revisionInput.enabled !== false && revisionInput.layered !== false;
      const layeredRevision = layeredRevisionEnabled
        ? await runArticleLayeredRevisionIfNeeded({
          draft,
          evaluation,
          context,
          plan: planState.plan,
          acceptanceContract: planState.acceptanceContract,
          sourcePassages: promptSourcePassages,
          materialPack: state.materialPack as Record<string, any> | undefined,
          partBodies: Array.isArray(input.partBodies) ? input.partBodies : undefined,
          factClaims: Array.isArray(input.factClaims)
            ? input.factClaims
            : Array.isArray(draft.factClaims)
              ? draft.factClaims
              : undefined,
          paragraphBlueprint,
          model: String(input.settings?.model || input.model || '').trim() || undefined,
          settings: input.settings && typeof input.settings === 'object' && !Array.isArray(input.settings)
            ? input.settings as Record<string, any>
            : undefined,
          deps,
        })
        : null;
      if (layeredRevision?.draft && layeredRevision.evaluation) {
        draft = layeredRevision.draft;
        draft = {
          ...draft,
          body: finalizeArticleDeliveryBody(String(draft.body || '')),
        };
        evaluation = evaluateArticleDraftContract({
          body: String(draft.body || ''),
          draft,
          plan: planState.plan,
          context,
          acceptanceContract: planState.acceptanceContract,
          sourcePassages: promptSourcePassages,
          materialPack: state.materialPack as Record<string, any> | undefined,
          partBodies: Array.isArray(input.partBodies) ? input.partBodies : undefined,
          factClaims: Array.isArray(input.factClaims)
            ? input.factClaims
            : Array.isArray(draft.factClaims)
              ? draft.factClaims
              : undefined,
          paragraphBlueprint,
          generationMode,
        });
      }
      return {
        draft,
        evaluation,
        generationPolicy: {
          version: 'article-generation-policy.v1',
          bodyOwner: 'model',
          evaluationRole: 'observation_report_only',
          mutationDisabled: false,
          generationRetryDisabled: true,
          layeredRevisionDisabled: !layeredRevisionEnabled,
          layeredRevision,
        },
      };
    },
    finalizeArticle: (state) => {
      const finalEvaluation = state.evaluation as ArticleObservationReport;
      const finalDraft = state.draft;
      if (!finalEvaluation.passed) {
        const blockers = Array.isArray(finalEvaluation.blockers) ? finalEvaluation.blockers : [];
        const blockerSummary = blockers
          .map((item: any) => String(item.ruleId || item.category || item.message || 'UNKNOWN'))
          .slice(0, 8)
          .join(', ') || 'UNKNOWN';
        const error = new Error(`article quality gate failed: ${blockerSummary}`);
        (error as any).quality = finalEvaluation.quality;
        (error as any).acceptance = finalEvaluation.acceptance;
        (error as any).blockers = blockers.slice(0, 12);
        (error as any).draft = finalDraft;
        (error as any).draftBody = String((finalDraft as any)?.body || '');
        (error as any).evaluation = finalEvaluation;
        (error as any).generationPolicy = state.generationPolicy;
        throw error;
      }
      return {
        final: {
          status: 'succeeded',
          draft: finalDraft,
          evaluation: finalEvaluation,
        },
      };
    },
    persistEvidence: () => ({}),
  }, articleRequest);
  const context = workflow.context as RuntimeArticleContext;
  const planState = workflow.plan as any;
  const plan = planState.plan as ReturnType<typeof buildRuntimeArticlePlan>;
  const runtimeDraft = planState.runtimeDraft;
  const acceptanceContract = planState.acceptanceContract;
  const final = workflow.final as any;
  const draft = final.draft || workflow.draft as any;
  const finalBody = finalizeArticleDeliveryBody(String(draft.body || ''));
  const draftAst = draft.draftAst || runtimeDraft.draftAst;
  const evaluation = final.evaluation as any;
  const quality = evaluation.quality;
  const acceptance = evaluation.acceptance;
  const referenceCoverage = evaluation.referenceCoverage || calculateArticleReferenceCoverage({
    body: finalBody,
    plan,
    context,
    sourcePassages: promptSourcePassages,
  });
  const workflowMaterialPack = workflow.materialPack as Record<string, any> | undefined;
  const workflowWritingBrief = workflow.writingBrief as Record<string, any> | undefined;
  const modelInvocation = draft.modelInvocation;
  const trace = buildRuntimeArticleTrace(plan, context, quality, {
    mode: generationMode,
    modelInvocation: modelInvocation
      ? {
        requested: true,
        provider: modelInvocation.provider,
        model: modelInvocation.model,
        factClaimCount: Array.isArray(modelInvocation.factClaims) ? modelInvocation.factClaims.length : 0,
        outputParseStatus: modelInvocation.outputParseStatus,
        referenceCoverage,
      }
      : generationMode === 'model'
        ? { requested: true }
        : undefined,
  }, acceptance);
  trace.stages = Array.from(new Set([
    ...trace.stages,
    ...workflow.stages,
  ]));
  (trace as any).workflow = {
    retrievalPlan: articleRequest.retrievalPlan,
    generationPolicy: (workflow as any).generationPolicy,
    writerContextAudit: auditArticleWriterContext({
      modelInvocation,
      target,
      stylePack: context.stylePack,
      memoryItemCount: context.memory.items.length,
      literatureItemCount: context.literature.items.length,
      factAtomCount: Array.isArray(acceptanceContract?.policy?.factBoundaryAtoms)
        ? acceptanceContract.policy.factBoundaryAtoms.length
        : 0,
      paragraphBlueprint: workflow.paragraphBlueprint as Record<string, any> | undefined,
    }),
    materialPack: workflow.materialPack,
    writingBrief: workflow.writingBrief,
    agentContracts: (workflow.writingBrief as any)?.agentContracts,
    draft: { body: String((workflow.draft as any)?.body || '') },
    claimBudget: workflow.claimBudget,
    paragraphBlueprint: workflow.paragraphBlueprint,
    evaluation: workflow.evaluation,
    final: {
      status: final.status,
    },
  };
  (trace as any).pressureEvolution = buildPressureEvolutionTrace({
    pressure: (plan as any).pressureRuntime,
    evaluation,
  });
  (trace as any).review = buildArticleReviewerAgentReview({
    contract: workflowWritingBrief?.agentContracts?.reviewer,
    quality,
    acceptance,
    referenceCoverage,
    materialScreening: buildArticleMaterialScreeningSummary(workflowMaterialPack, context),
  });
  (trace as any).research = buildArticleResearchTrace({
    materialPack: workflowMaterialPack,
    writingBrief: workflowWritingBrief,
    context,
  });
  const persisted = await persistGeneratedArticleIfRequested({
    input,
    topic,
    target,
    finalBody,
    semanticTopology: draftAst,
    quality,
    trace,
    deps,
  });
  const acceptancePersisted = await persistArticleAcceptanceReportIfRequested({
    input,
    topic,
    target,
    acceptance,
    trace,
    deps,
  });
  const referenceUsagePersisted = await persistArticleReferenceUsageReportIfRequested({
    input,
    topic,
    target,
    plan,
    context,
    trace,
    referenceCoverage,
    deps,
  });
  const styleRevisionPairsPersisted = await persistStyleRevisionPairsIfRequested({
    input,
    topic,
    target,
    trace,
    finalBody,
    deps,
  });
  const experiencePersisted = await persistArticleExperienceIfRequested({
    input,
    topic,
    target,
    trace,
    quality,
    acceptance,
    referenceCoverage,
    persisted,
    acceptancePersisted,
    referenceUsagePersisted,
    styleRevisionPairsPersisted,
    deps,
  });

  return {
    runtimeVersion: CONTENT_RUNTIME_VERSION,
    draft: {
      title: String(draft.title || topic),
      target,
      topic,
      body: finalBody,
      summary: String(draft.summary || ''),
      ast: draftAst,
      semanticTopology: draftAst,
      referenceCoverage,
      frontmatter: {
        draft: true,
        generatedBy: 'contentbase-runtime',
        target,
        articlePlanVersion: plan.version,
        generationMode,
        ...(draft.frontmatter && typeof draft.frontmatter === 'object' ? draft.frontmatter : {}),
      },
    },
    plan,
    quality,
    acceptance,
    context,
    trace,
    acceptancePersisted,
    referenceUsagePersisted,
    styleRevisionPairsPersisted,
    experiencePersisted,
    persisted,
  };
}

function buildPressureEvolutionTrace(input: {
  pressure?: ArticlePressureRuntime;
  evaluation?: ArticleObservationReport;
}) {
  if (!input.pressure) {
    return undefined;
  }
  const narrativePressure = input.evaluation?.sourceEvidence?.narrativePressure || input.evaluation?.narrativePressure;
  return {
    version: 'pressure-evolution-trace.v1',
    observationOnly: true,
    contradictionCount: input.pressure.contradictions.length,
    unresolvedTensionCount: input.pressure.unresolvedTensions.length,
    transitionCount: input.pressure.transitions.length,
    judgmentCandidateCount: input.pressure.judgmentCandidates.length,
    unresolvedTensions: input.pressure.unresolvedTensions,
    transitions: input.pressure.transitions,
    judgmentCandidates: input.pressure.judgmentCandidates,
    evaluation: narrativePressure,
  };
}

function buildArticleResearchTrace(input: {
  materialPack?: Record<string, any>;
  writingBrief?: Record<string, any>;
  context: RuntimeArticleContext;
}) {
  const materialPack = input.materialPack || {};
  const writingBrief = input.writingBrief || {};
  // Research trace 只记录资料从哪里来、整理成什么形状，不参与正文改写。
  return {
    role: 'research',
    title: 'ResearchAgent',
    passed: true,
    sourceGrounding: {
      evidencePackStatus: String(input.context.evidence.status || ''),
      evidencePackVersion: String(materialPack.evidencePack?.version || ''),
      evidencePackMode: String(materialPack.evidencePack?.mode || ''),
      sourceCount: Array.isArray(materialPack.evidencePackSources) ? materialPack.evidencePackSources.length : 0,
      chunkCount: Array.isArray(materialPack.evidencePackChunks) ? materialPack.evidencePackChunks.length : 0,
      citationCount: Array.isArray(materialPack.evidenceCitations) ? materialPack.evidenceCitations.length : 0,
      sourcePassageCount: Array.isArray(materialPack.sourcePassages) ? materialPack.sourcePassages.length : 0,
      semanticUnitCount: Array.isArray(materialPack.semanticUnits) ? materialPack.semanticUnits.length : 0,
      memoryItemCount: Array.isArray(materialPack.memoryItems) ? materialPack.memoryItems.length : 0,
      literatureItemCount: Array.isArray(materialPack.literatureItems) ? materialPack.literatureItems.length : 0,
      factBoundaryCount: Array.isArray(materialPack.factBoundary) ? materialPack.factBoundary.length : 0,
    },
    retrievalPolicy: {
      kernel: String(materialPack.retrievalPolicy?.kernel || 'source_grounded_material_pack'),
      inspiration: String(materialPack.retrievalPolicy?.inspiration || ''),
      allowHistoricalRegister: Boolean(materialPack.retrievalPolicy?.allowHistoricalRegister),
      debugMaterialFiltered: Number(materialPack.retrievalPolicy?.debugMaterialFiltered || 0),
      queryRounds: Number(materialPack.retrievalPolicy?.queryRounds || 0),
      webSourceCount: Number(materialPack.retrievalPolicy?.webSourceCount || 0),
      queryRun: materialPack.retrievalPolicy?.queryRun || {},
      screening: materialPack.retrievalPolicy?.screening || {},
    },
    outputs: {
      evidencePack: materialPack.evidencePack || null,
      argumentDigest: materialPack.argumentDigest || null,
      materialFunctionPlan: materialPack.materialFunctionPlan || null,
      sourcePack: {
      sources: Array.isArray(materialPack.evidencePackSources) ? materialPack.evidencePackSources : [],
      chunks: Array.isArray(materialPack.evidencePackChunks) ? materialPack.evidencePackChunks : [],
      citations: Array.isArray(materialPack.evidenceCitations) ? materialPack.evidenceCitations : [],
      requestSourcePassages: Array.isArray(materialPack.sourcePassages) ? materialPack.sourcePassages : [],
    },
      provenancePack: {
        sourcePassages: Array.isArray(materialPack.sourcePassages) ? materialPack.sourcePassages : [],
        semanticUnits: Array.isArray(materialPack.semanticUnits) ? materialPack.semanticUnits : [],
        memoryItems: Array.isArray(materialPack.memoryItems) ? materialPack.memoryItems : [],
        literatureItems: Array.isArray(materialPack.literatureItems) ? materialPack.literatureItems : [],
      },
    },
    prompt: String(writingBrief?.agentContracts?.research?.prompt || ''),
  };
}

function buildArticleMaterialScreeningSummary(
  materialPack?: Record<string, any>,
  context?: RuntimeArticleContext,
) {
  const queryRun = materialPack?.retrievalPolicy?.queryRun || materialPack?.evidencePack?.queryRun || {};
  const screening = materialPack?.retrievalPolicy?.screening || materialPack?.evidencePack?.screening || {};
  const evidencePackCounts = materialPack?.evidencePack?.counts && typeof materialPack.evidencePack.counts === 'object'
    ? materialPack.evidencePack.counts as Record<string, any>
    : {};
  const rawSources = Array.isArray(materialPack?.evidencePack?.sources) ? materialPack?.evidencePack?.sources.length : 0;
  const rawChunks = Array.isArray(materialPack?.evidencePack?.chunks) ? materialPack?.evidencePack?.chunks.length : 0;
  const rawCitations = Array.isArray(materialPack?.evidencePack?.citations) ? materialPack?.evidencePack?.citations.length : 0;
  const filteredSources = Array.isArray(materialPack?.evidencePackSources) ? materialPack.evidencePackSources.length : 0;
  const filteredChunks = Array.isArray(materialPack?.evidencePackChunks) ? materialPack.evidencePackChunks.length : 0;
  const filteredCitations = Array.isArray(materialPack?.evidenceCitations) ? materialPack.evidenceCitations.length : 0;
  return {
    queryRounds: Number(materialPack?.retrievalPolicy?.queryRounds || evidencePackCounts.queryRounds || 0),
    // 审稿筛选证明的是 DataBase EvidencePack 是否真实可追踪；
    // 写作过滤后的前景化数组不能被误当成检索源为空。
    sourceCount: Number(evidencePackCounts.sources || rawSources || filteredSources || 0),
    chunkCount: Number(evidencePackCounts.chunks || rawChunks || filteredChunks || 0),
    citationCount: Number(evidencePackCounts.citations || rawCitations || filteredCitations || 0),
    filteredSourceCount: filteredSources,
    filteredChunkCount: filteredChunks,
    filteredCitationCount: filteredCitations,
    webSourceCount: Number(materialPack?.retrievalPolicy?.webSourceCount || evidencePackCounts.webSources || 0),
    evidenceStatus: String(context?.evidence.status || ''),
    queryRun,
    screening,
  };
}

function assertProductionArticleMaterialPackWritable(materialPack: Record<string, any>): void {
  const functionItems = Array.isArray(materialPack?.materialFunctionPlan?.items)
    ? materialPack.materialFunctionPlan.items as Array<Record<string, any>>
    : [];
  const writableItems = functionItems.filter((item) => {
    const bodyUse = String(item.bodyUse || '');
    const fn = String(item.function || '');
    return bodyUse !== 'silent' && fn !== 'style_only' && fn !== 'rejected';
  });
  if (writableItems.length > 0) {
    return;
  }
  const filteredChunks = Array.isArray(materialPack?.evidencePackChunks)
    ? materialPack.evidencePackChunks.filter((item: any) => String(item?.text || item?.excerpt || item?.summary || '').trim())
    : [];
  const filteredCitations = Array.isArray(materialPack?.evidenceCitations)
    ? materialPack.evidenceCitations.filter((item: any) => String(item?.excerpt || item?.summary || '').trim())
    : [];
  if (filteredChunks.length > 0 || filteredCitations.length > 0) {
    return;
  }
  const evidencePackCounts = materialPack?.evidencePack?.counts && typeof materialPack.evidencePack.counts === 'object'
    ? materialPack.evidencePack.counts as Record<string, any>
    : {};
  const rawMaterialCount = Number(evidencePackCounts.sources || 0)
    + Number(evidencePackCounts.chunks || 0)
    + Number(evidencePackCounts.citations || 0);
  if (rawMaterialCount <= 0) {
    return;
  }
  const filtered = materialPack?.retrievalPolicy?.debugEvidencePackFiltered && typeof materialPack.retrievalPolicy.debugEvidencePackFiltered === 'object'
    ? materialPack.retrievalPolicy.debugEvidencePackFiltered as Record<string, any>
    : {};
  const queryRun = materialPack?.retrievalPolicy?.queryRun && typeof materialPack.retrievalPolicy.queryRun === 'object'
    ? materialPack.retrievalPolicy.queryRun as Record<string, any>
    : {};
  throw new Error([
    'Article generation requires writable material: DataBase retrieval produced no writable material after topic filtering.',
    `raw sources=${Number(evidencePackCounts.sources || 0)}, chunks=${Number(evidencePackCounts.chunks || 0)}, citations=${Number(evidencePackCounts.citations || 0)}.`,
    `filtered sources=${Number(filtered.sources || 0)}, chunks=${Number(filtered.chunks || 0)}.`,
    `queryRun provider=${String(queryRun.provider || '')}, status=${String(queryRun.status || '')}.`,
    'Fix retrieval/ranking first; do not generate fallback prose from broad corpus or style references.',
  ].join(' '));
}

function buildPromptSafeArticlePlan(plan: ReturnType<typeof buildRuntimeArticlePlan>): Record<string, any> {
  const {
    pressureRuntime: _pressureRuntime,
    pressureTransitions: _pressureTransitions,
    pressureRequired: _pressureRequired,
    ...safePlan
  } = plan as any;
  if (safePlan.narrativeProtocol?.sourceUse) {
    safePlan.narrativeProtocol = {
      ...safePlan.narrativeProtocol,
      sourceUse: {
        ...safePlan.narrativeProtocol.sourceUse,
        quotationSources: [],
        referenceAnchors: sanitizePromptAnchors(safePlan.narrativeProtocol.sourceUse.referenceAnchors),
      },
    };
  }
  if (safePlan.referenceWeave) {
    safePlan.referenceWeave = {
      ...safePlan.referenceWeave,
      anchors: sanitizePromptAnchors(safePlan.referenceWeave.anchors),
      sectionPlans: Array.isArray(safePlan.referenceWeave.sectionPlans)
        ? safePlan.referenceWeave.sectionPlans.map((section: any) => ({
          ...section,
          anchors: sanitizePromptAnchors(section.anchors),
        }))
        : safePlan.referenceWeave.sectionPlans,
    };
  }
  return safePlan;
}

function sanitizePromptAnchors(values: unknown): unknown[] {
  if (!Array.isArray(values)) return [];
  return values
    .filter((item) => {
      const source = String(item?.source || '');
      const title = String(item?.name || item?.title || item?.sourceTitle || '');
      const use = String(item?.use || item?.summary || item?.excerpt || item?.text || '');
      return source !== 'creativeContract' && !isSourcePassageMetaRecovery(title, use);
    })
    .map((item) => {
      const source = String(item?.source || '');
      if (source !== 'sourcePassage') {
        return item;
      }
      return {
        ...item,
        use: sanitizeSourcePassageMaterialText(String(item?.use || item?.summary || item?.excerpt || item?.text || '')),
      };
    })
    .filter((item) => String(item?.use || item?.name || item?.title || '').trim());
}

function normalizePromptSafeSourcePassages(sourcePassages: Array<Record<string, any>>): Array<Record<string, any>> {
  return sourcePassages
    .map((item) => {
      const title = String(item.title || item.sourceTitle || item.name || item.label || item.sourceId || '').trim();
      const rawText = String(item.excerpt || item.text || item.summary || item.note || '').trim();
      if (isSourcePassageMetaRecovery(title, rawText)) {
        return null;
      }
      const safeText = sanitizeSourcePassageMaterialText(rawText);
      const factText = compileSourcePassageFactPhrases(safeText);
      if (!title && !safeText) {
        return null;
      }
      return {
        ...item,
        title,
        excerpt: factText,
        text: factText,
        summary: factText,
        use: compileSourcePassageFactPhrases(String(item.use || factText)),
      };
    })
    .filter(Boolean) as Array<Record<string, any>>;
}

function normalizeQualitySourcePassages(sourcePassages: Array<Record<string, any>>): Array<Record<string, any>> {
  return (Array.isArray(sourcePassages) ? sourcePassages : [])
    .map((item, index) => {
      const text = compactPromptText(sanitizeSourcePassageMaterialText(String(
        item.excerpt || item.text || item.summary || item.use || '',
      )), 360);
      if (!text) return null;
      const label = `FactPack材料${index + 1}`;
      return {
        ...item,
        title: label,
        sourceTitle: label,
        name: label,
        label,
        excerpt: text,
        text,
        summary: text,
        use: text,
      };
    })
    .filter(Boolean) as Array<Record<string, any>>;
}

// 资料包是模型写作前的研究输入，保留 provenance，禁止把创作合同参考库升级为事实。
function buildArticleMaterialPack(input: {
  topic: string;
  target: string;
  context: RuntimeArticleContext;
  sourcePassages: Array<Record<string, any>>;
}): Record<string, any> {
  const allowHistoricalRegister = isHistoricalRegisterActive({ topic: input.topic, target: input.target } as RuntimeGenerateArticleRequest, input.context);
  const evidencePackSources = filterMaterialEvidenceByTopic({
    topic: input.topic,
    items: normalizeMaterialEvidencePackSources(input.context.evidence.pack),
  });
  const evidencePackChunks = filterMaterialEvidenceByTopic({
    topic: input.topic,
    items: normalizeMaterialEvidencePackChunks(input.context.evidence.pack),
  });
  const normalizedEvidencePackScreening = normalizeMaterialEvidencePackScreening(input.context.evidence.pack);
  const sourcePassages = input.sourcePassages
    .slice(0, 16)
    .map((item, index) => {
      const kind = normalizeSourcePassageKind(item.kind || item.type || item.category || item.sourceType || item.sourceKind);
      const title = String(item.title || item.sourceTitle || item.name || item.label || `来源${index + 1}`);
      const rawExcerpt = String(item.excerpt || item.text || item.summary || '');
      const excerpt = compactPromptText(compileSourcePassageFactPhrases(rawExcerpt), 320);
      const provenance = String(item.provenance || '').trim();
      const sourceId = String(item.sourceId || item.id || `source-${index + 1}`);
      const sourcePassageFactEligible = /^database\.evidencePack(?:\.chunks)?$/i.test(provenance)
        && isTrustedFactAtomSourceId(sourceId)
        && isWritableFactAtomText(title, rawExcerpt)
        && !isSourcePassageMetaRecovery(title, rawExcerpt);
      return {
        id: sourceId,
        title,
        kind,
        excerpt,
        provenance: provenance || 'request.sourcePassages',
        factEligible: sourcePassageFactEligible,
        promptEligible: Boolean(excerpt) && !isSourcePassageMetaRecovery(title, rawExcerpt),
      };
    })
    .filter((item) => item.promptEligible || item.factEligible);
  const semanticUnits = input.context.semantic.units
    .filter((unit) => isUsableArticleSemanticUnit(unit, allowHistoricalRegister))
    .slice(0, 20)
    .map((unit) => ({
      id: unit.id,
      title: unit.sourceTitle,
      author: unit.sourceAuthor || '',
      locator: unit.sourceLocator || '',
      kind: unit.materialKind || normalizeSourcePassageKind([
        unit.tags.join(' '),
        unit.sourceTitle,
        unit.summary,
        unit.excerpt,
      ].filter(Boolean).join(' ')),
      summary: compactPromptText(unit.summary || unit.excerpt, 520),
      tags: unit.tags,
      provenance: 'database.semantic',
    }));
  const memoryItems = input.context.memory.items.slice(0, 8).map((item) => ({
    id: item.id,
    title: item.title,
    summary: compactPromptText(item.summary, 360),
    provenance: item.source,
  }));
  const literatureItems = input.context.literature.items.slice(0, 8).map((item) => ({
    id: item.id,
    title: item.title,
    author: item.author || '',
    category: item.category || '',
    summary: compactPromptText(item.summary || item.content || item.note || '', 420),
    source: item.originalSource || item.source,
    tags: item.tags || [],
    provenance: 'database.literature',
  }));
  const experienceItems = input.context.experience.items.slice(0, 12).map((item) => ({
    id: item.id,
    title: item.title,
    summary: compactPromptText(item.summary, 420),
    passed: item.passed,
    topic: item.topic || '',
    target: item.target || '',
    type: item.type || '',
    tags: item.tags || [],
    score: Number.isFinite(Number(item.score)) ? Number(item.score) : null,
    reasons: Array.isArray(item.reasons) ? item.reasons.slice(0, 8) : [],
    version: item.version || '',
    createdAt: item.createdAt || '',
    provenance: 'database.experience',
  }));
  const evidencePack = normalizeMaterialEvidencePack(input.context.evidence.pack);
  const evidenceCitations = filterMaterialEvidenceByTopic({
    topic: input.topic,
    items: input.context.evidence.items
    .filter((item) => item.sourceType === 'evidencePack')
    .slice(0, 16)
    .map((item) => ({
      id: item.sourceId || item.title,
      sourceId: item.sourceId || item.title,
      title: item.title,
      excerpt: compactPromptText(item.excerpt, 520),
      locator: item.locator || '',
      relevanceScore: Number.isFinite(Number(item.relevanceScore)) ? Number(item.relevanceScore) : undefined,
      provenance: 'database.evidencePack',
      factEligible: true,
    })),
  });
  const prioritizeOptions = { topic: input.topic };
  const prioritizedEvidencePackSources = prioritizeMaterialEvidenceRecords(evidencePackSources, prioritizeOptions);
  const prioritizedEvidencePackChunks = prioritizeMaterialEvidenceRecords(evidencePackChunks, prioritizeOptions);
  const prioritizedEvidenceCitations = prioritizeMaterialEvidenceRecords(evidenceCitations, prioritizeOptions);
  const factBoundary = [
    ...prioritizedEvidenceCitations.map((item) => item.title),
    ...prioritizedEvidencePackChunks.map((item) => item.title || item.id),
    ...semanticUnits.filter((item) => item.kind === 'document' || item.kind === 'observer').map((item) => item.title),
    ...experienceItems.map((item) => item.title),
  ];
  const evidencePackQueryRun = evidencePack?.queryRun && typeof evidencePack.queryRun === 'object'
    ? evidencePack.queryRun
    : {};
  const evidencePackScreening = evidencePack?.screening && typeof evidencePack.screening === 'object'
    ? evidencePack.screening
    : {};
  const evidencePackRounds = Array.isArray(evidencePackQueryRun?.rounds)
    ? evidencePackQueryRun.rounds.map((item: Record<string, any>, index: number) => ({
      index,
      query: String(item?.query || ''),
      tokenCount: Number(item?.tokenCount || 0),
      resultCount: Number(item?.resultCount || 0),
      provider: String(item?.provider || ''),
    }))
    : [];
  const sourceCount = evidencePackSources.length;
  const chunkCount = evidencePackChunks.length;
  const citationCount = evidenceCitations.length;
  const fallbackArgumentDigest = buildArticleArgumentDigest({
    topic: input.topic,
    target: input.target,
    sourcePassages,
    semanticUnits,
    memoryItems,
    literatureItems,
    evidencePackSources: prioritizedEvidencePackSources,
    evidencePackChunks: prioritizedEvidencePackChunks,
    evidenceCitations: prioritizedEvidenceCitations,
  });
  const materialFunctionPlan = buildArticleMaterialFunctionPlan({
    topic: input.topic,
    target: input.target,
    allowHistoricalRegister,
    sourcePassages,
    semanticUnits,
    memoryItems,
    literatureItems,
    evidencePackSources: prioritizedEvidencePackSources,
    evidencePackChunks: prioritizedEvidencePackChunks,
    evidenceCitations: prioritizedEvidenceCitations,
  });
  const argumentDigest = buildArticleArgumentDigestFromMaterialFunctions({
    topic: input.topic,
    materialFunctionPlan,
    fallbackAnchors: Array.isArray(fallbackArgumentDigest.primaryAnchors)
      ? fallbackArgumentDigest.primaryAnchors
      : [],
  });

  return {
    version: 'article-material-pack.v1',
    role: 'research_material_pack',
    topic: input.topic,
    target: input.target,
    evidencePack,
    evidencePackSources: prioritizedEvidencePackSources,
    evidencePackChunks: prioritizedEvidencePackChunks,
    evidenceCitations: prioritizedEvidenceCitations,
    sourcePassages,
    semanticUnits,
    memoryItems,
    literatureItems,
    experienceItems,
    materialFunctionPlan,
    argumentDigest,
    learningEvents: input.context.learning.events.slice(0, 12),
    creativeContractBoundary: {
      role: 'style_citation_boundary_only',
      sourceMaterialCount: input.context.styleContract.sourceMaterials.length,
      rule: '创作合同参考库不得自动成为正文事实，除非同一材料也进入 sourcePassages、semantic、memory 或 literature。',
    },
    retrievalPolicy: {
      kernel: 'source_grounded_material_pack',
      // 资料代理只暴露 DataBase 检索得到的来源、切块和引用，正文仍交给模型综合生成。
      inspiration: 'NotebookLM style source-grounded retrieval: sources first, synthesis second, no detached shadow truth.',
      evidencePackStatus: input.context.evidence.status,
      allowHistoricalRegister,
      debugMaterialFiltered: input.context.semantic.units.length - semanticUnits.length,
      debugEvidencePackFiltered: {
        sources: normalizeMaterialEvidencePackSources(input.context.evidence.pack).length - evidencePackSources.length,
        chunks: normalizeMaterialEvidencePackChunks(input.context.evidence.pack).length - evidencePackChunks.length,
      },
      experienceItemCount: experienceItems.length,
      experienceTopHits: experienceItems.slice(0, 8).map((item) => ({
        id: item.id,
        title: item.title,
        score: item.score,
        reasons: item.reasons,
        passed: item.passed,
      })),
      queryRounds: Number(input.context.evidence.pack?.counts?.queryRounds || 0),
      webSourceCount: Number(input.context.evidence.pack?.counts?.webSources || 0),
      queryRun: {
        id: String(evidencePackQueryRun?.id || ''),
        provider: String(evidencePackQueryRun?.provider || ''),
        status: String(evidencePackQueryRun?.status || ''),
        rounds: evidencePackRounds,
      },
      screening: {
        ...evidencePackScreening,
        queryCount: Number(evidencePackScreening?.queryCount || evidencePackRounds.length || 0),
        selectedChunkCount: Number(evidencePackScreening?.selectedChunkCount || chunkCount || 0),
        selectedCitationCount: Number(evidencePackScreening?.selectedCitationCount || citationCount || 0),
        sourceDiversityCount: Number(evidencePackScreening?.sourceDiversityCount || sourceCount || 0),
      },
    },
    evidencePackScreening: normalizedEvidencePackScreening,
    factBoundary,
    factBoundaryWarnings: materialFunctionPlan.factBoundaryWarnings,
    sourceUsePolicy: {
      sourceDisplayForbidden: true,
      citationSilenceRule: '资料只支撑判断，不在正文中声明材料来源、理论来源或检索来源。',
      analogyRequiresClaimBinding: true,
      unsupportedSceneDetailsForbidden: true,
      bodyOwner: 'model',
    },
    warnings: input.context.warnings,
  };
}

function normalizeMaterialEvidencePackScreening(pack: unknown): Record<string, any> | null {
  if (!pack || typeof pack !== 'object' || Array.isArray(pack)) {
    return null;
  }
  const record = pack as Record<string, any>;
  return record.screening && typeof record.screening === 'object' ? record.screening : null;
}

function normalizeMaterialEvidencePack(pack: unknown): Record<string, any> | null {
  if (!pack || typeof pack !== 'object' || Array.isArray(pack)) {
    return null;
  }
  const record = pack as Record<string, any>;
  return {
    version: String(record.version || ''),
    query: String(record.query || ''),
    mode: String(record.mode || ''),
    queryRun: record.queryRun && typeof record.queryRun === 'object' ? record.queryRun : {},
    counts: record.counts && typeof record.counts === 'object' ? record.counts : {},
    constraints: Array.isArray(record.constraints) ? record.constraints.map(String).slice(0, 8) : [],
  };
}

function normalizeMaterialEvidencePackSources(pack: unknown): Array<Record<string, any>> {
  if (!pack || typeof pack !== 'object' || Array.isArray(pack)) {
    return [];
  }
  const sources = Array.isArray((pack as Record<string, any>).sources)
    ? (pack as Record<string, any>).sources
    : [];
  return sources
    .slice(0, 20)
    .map((item, index) => {
      const record = item && typeof item === 'object' && !Array.isArray(item)
        ? item as Record<string, any>
        : {};
      return {
        id: String(record.id || record.sourceId || `evidence-source-${index + 1}`),
        title: String(record.title || record.name || record.path || `Evidence source ${index + 1}`).trim(),
        sourceType: String(record.sourceType || record.type || record.kind || '').trim(),
        uri: String(record.uri || record.url || record.path || '').trim(),
        metadata: record.metadata && typeof record.metadata === 'object' ? record.metadata : {},
        provenance: 'database.evidencePack.sources',
      };
    })
    .filter((item) => item.title || item.id);
}

function normalizeMaterialEvidencePackChunks(pack: unknown): Array<Record<string, any>> {
  if (!pack || typeof pack !== 'object' || Array.isArray(pack)) {
    return [];
  }
  const chunks = Array.isArray((pack as Record<string, any>).chunks)
    ? (pack as Record<string, any>).chunks
    : [];
  return chunks
    .slice(0, 24)
    .map((item, index) => {
      const record = item && typeof item === 'object' && !Array.isArray(item)
        ? item as Record<string, any>
        : {};
      const metadata = record.metadata && typeof record.metadata === 'object' && !Array.isArray(record.metadata)
        ? record.metadata as Record<string, any>
        : {};
      const title = String(metadata.title || metadata.sourceTitle || record.title || record.sourceTitle || `Evidence chunk ${index + 1}`).trim();
      return {
        id: String(record.id || record.chunkId || `evidence-chunk-${index + 1}`),
        sourceId: String(record.sourceId || '').trim(),
        title,
        text: compactPromptText(record.text || record.content || record.excerpt || '', 620),
        locator: compactPromptText(record.location || metadata.location || metadata.locator || '', 160),
        relevanceScore: Number.isFinite(Number(record.relevanceScore))
          ? Number(record.relevanceScore)
          : Number.isFinite(Number(metadata.relevanceScore))
            ? Number(metadata.relevanceScore)
            : undefined,
        privacyLevel: String(record.privacyLevel || metadata.privacyLevel || '').trim(),
        metadata,
        provenance: 'database.evidencePack.chunks',
        factEligible: true,
      };
    })
    .filter((item) => item.text || item.title);
}

function buildArticleArgumentDigest(input: {
  topic: string;
  target: string;
  sourcePassages: Array<Record<string, any>>;
  semanticUnits: Array<Record<string, any>>;
  memoryItems: Array<Record<string, any>>;
  literatureItems: Array<Record<string, any>>;
  evidencePackSources: Array<Record<string, any>>;
  evidencePackChunks: Array<Record<string, any>>;
  evidenceCitations: Array<Record<string, any>>;
}): Record<string, any> {
  const anchors = collectArticleDigestAnchors(input);
  const primaryAnchors = anchors.slice(0, 5);
  const backgroundAnchors = anchors.slice(5, 12);
  const topicTokens = tokenizeArticleMaterialText(input.topic)
    .filter((token) => !isWeakArticleMaterialToken(token))
    .slice(0, 4);
  const topicAnchors = buildTopicDigestAnchors(input.topic, topicTokens);
  const mergedPrimaryAnchors = uniqueByDigestAnchorKey([
    ...topicAnchors,
    ...primaryAnchors,
  ]).slice(0, 6);
  const titleLine = mergedPrimaryAnchors.map((item) => item.title).filter(Boolean).join('、') || '本次资料包';
  const centralClaim = compactPromptText(
    `${input.topic}不能写成材料巡游，正文必须先回答题目中的核心问题，再说明${titleLine}怎样共同指向同一个判断，禁止逐条展示资料来源。`,
    180,
  );
  const paragraphRoute = buildArticleDigestParagraphRoute(mergedPrimaryAnchors, input.topic);
  return {
    version: 'article-argument-digest.v1',
    role: 'material_digestion_contract',
    centralClaim,
    primaryAnchors: mergedPrimaryAnchors,
    backgroundAnchors,
    paragraphRoute,
    materialUseRule: '每段最多使用一个主要历史对象或一个理论锚点，先推进关系，再放材料。EvidencePack 是后盾，禁止写成逐项点名的清单。',
    antiPatchworkRules: [
      '不得为了覆盖率轮换书名、文明、人物、地名和理论名词。',
      '不服务 centralClaim 的材料放入背景，正文不前景化。',
      '段落之间必须围绕同一个判断递进，不写成来源摘要串联。',
    ],
  };
}

function buildTopicDigestAnchors(topic: string, tokens: string[]): Array<Record<string, any>> {
  const title = String(topic || '').trim();
  const statement = title
    .replace(/^为什么/, '')
    .replace(/为什么/g, '')
    .replace(/[？?]/g, '')
    .replace(/\s+/g, '')
    .trim();
  const anchors: Array<Record<string, any>> = [];
  if (title) {
    anchors.push({
      id: `topic:${title}`,
      title,
      kind: 'comparison',
      sourceId: '',
      summary: `题目本身作为主判断入口：${title}`,
      provenance: 'topic',
      use: '必须在开篇先回答这个题目，再展开材料判断，不可绕题。',
    });
  }
  if (statement && statement !== title) {
    anchors.push({
      id: `topic-statement:${statement}`,
      title: statement,
      kind: 'comparison',
      sourceId: '',
      summary: `题目陈述句：${statement}`,
      provenance: 'topic',
      use: '必须直接陈述这个判断，不要把题目写成问句。',
    });
  }
  for (const token of tokens.slice(0, 3)) {
    anchors.push({
      id: `topic-token:${token}`,
      title: token,
      kind: 'comparison',
      sourceId: '',
      summary: `题目关键词：${token}`,
      provenance: 'topic',
      use: `这一关键词必须进入判断线，不能只出现在标题里。`,
    });
  }
  return anchors;
}

function uniqueByDigestAnchorKey(items: Array<Record<string, any>>): Array<Record<string, any>> {
  const seen = new Set<string>();
  const result: Array<Record<string, any>> = [];
  for (const item of items) {
    const key = `${String(item?.title || '').trim()}|${String(item?.kind || '').trim()}|${String(item?.use || '').trim()}`;
    if (!key.trim() || seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }
  return result;
}

function collectArticleDigestAnchors(input: {
  topic: string;
  sourcePassages: Array<Record<string, any>>;
  semanticUnits: Array<Record<string, any>>;
  memoryItems: Array<Record<string, any>>;
  literatureItems: Array<Record<string, any>>;
  evidencePackSources: Array<Record<string, any>>;
  evidencePackChunks: Array<Record<string, any>>;
  evidenceCitations: Array<Record<string, any>>;
}): Array<Record<string, any>> {
  const seen = new Set<string>();
  const candidates = [
    ...input.evidencePackChunks.map((item) => ({
      id: item.id || item.sourceId || item.title,
      title: item.title || item.id,
      kind: 'evidence_chunk',
      sourceId: item.sourceId || '',
      summary: item.text || item.excerpt || '',
      provenance: item.provenance || 'database.evidencePack.chunks',
      weight: 120,
    })),
    ...input.evidenceCitations.map((item) => ({
      id: item.id || item.title,
      title: item.title || item.id,
      kind: 'citation',
      sourceId: item.id || '',
      summary: item.excerpt || '',
      provenance: item.provenance || 'database.evidencePack',
      weight: 110,
    })),
    ...input.semanticUnits.map((item) => ({
      id: item.id || item.title,
      title: item.title || item.sourceTitle || item.id,
      kind: item.kind || 'semantic_unit',
      sourceId: item.id || '',
      summary: item.summary || item.excerpt || '',
      provenance: item.provenance || 'database.semantic',
      weight: item.kind === 'theory' ? 95 : 90,
    })),
    ...input.literatureItems.map((item) => ({
      id: item.id || item.title,
      title: item.title || item.id,
      kind: 'literature',
      sourceId: item.id || '',
      summary: item.summary || item.content || '',
      provenance: item.provenance || 'database.literature',
      weight: 75,
    })),
    ...input.memoryItems.map((item) => ({
      id: item.id || item.title,
      title: item.title || item.id,
      kind: 'memory',
      sourceId: item.id || '',
      summary: item.summary || '',
      provenance: item.provenance || item.source || 'database.memory',
      weight: 70,
    })),
    ...input.sourcePassages.map((item) => ({
      id: item.id || item.title,
      title: item.title || item.id,
      kind: item.kind || 'source_passage',
      sourceId: item.id || '',
      summary: item.excerpt || item.summary || '',
      provenance: item.provenance || 'request.sourcePassages',
      weight: item.factEligible ? 100 : 65,
    })),
    ...input.evidencePackSources.map((item) => ({
      id: item.id || item.title,
      title: item.title || item.id,
      kind: 'evidence_source',
      sourceId: item.id || '',
      summary: item.sourceType || item.uri || '',
      provenance: item.provenance || 'database.evidencePack.sources',
      weight: 50,
    })),
  ];
  return candidates
    .map((item) => {
      const title = compactPromptText(String(item.title || '').trim(), 80);
      const summary = compactPromptText(String(item.summary || '').trim(), 220);
      const key = `${title}::${summary.slice(0, 36)}`;
      return {
        ...item,
        title,
        summary,
        score: Number(item.weight || 0) + scoreArticleDigestTopicOverlap(input.topic, `${title} ${summary}`),
        key,
      };
    })
    .filter((item) => item.title || item.summary)
    .sort((a, b) => b.score - a.score)
    .filter((item) => {
      if (seen.has(item.key)) return false;
      seen.add(item.key);
      return true;
    })
    .map((item) => ({
      id: String(item.id || item.title || ''),
      title: item.title || '未命名材料',
      kind: String(item.kind || 'material'),
      sourceId: String(item.sourceId || ''),
      summary: item.summary,
      provenance: String(item.provenance || ''),
      use: resolveArticleDigestAnchorUse(String(item.kind || ''), item.summary),
    }));
}

function scoreArticleDigestTopicOverlap(topic: string, text: string): number {
  const tokens = uniqueStrings(String(text || '').match(/[\u4e00-\u9fa5]{2,6}|[A-Za-z][A-Za-z0-9_-]{2,}/g) || []);
  const topicTokens = uniqueStrings(String(topic || '').match(/[\u4e00-\u9fa5]{2,6}|[A-Za-z][A-Za-z0-9_-]{2,}/g) || []);
  return topicTokens.filter((token) => tokens.includes(token)).length * 8;
}

function resolveArticleDigestAnchorUse(kind: string, summary: string): string {
  if (/theory|literature/.test(kind)) return '只作为解释关系的理论后盾，不在正文里堆书名。';
  if (/citation|chunk|document|source_passage/.test(kind)) return '作为事实或历史对象的主锚点，必须进入判断关系。';
  if (/memory/.test(kind)) return '作为既有上下文，只补足连续性，不抢正文前景。';
  if (/source/.test(kind) && !summary) return '只证明来源边界，不作为段落主体。';
  return '服务主论证线，不单独展示。';
}

function buildArticleDigestParagraphRoute(primaryAnchors: Array<Record<string, any>>, topic: string): Array<Record<string, any>> {
  const anchors = primaryAnchors.length ? primaryAnchors : [{
    title: '本次核心材料',
    kind: 'material',
    use: '服务主论证线。',
  }];
  const opening = anchors[0];
  const explanation = anchors.find((item) => /theory|literature|semantic/.test(String(item.kind || ''))) || anchors[1] || opening;
  const contrast = anchors.find((item) => /citation|chunk|document|source_passage/.test(String(item.kind || '')) && item.title !== opening.title) || anchors[2] || explanation;
  const background = anchors.find((item) => /memory|observer|comparison/.test(String(item.kind || ''))) || anchors[3] || contrast;
  return [{
    paragraphRole: 'opening_pressure',
    purpose: `从题目「${topic}」进入，先回答核心问题，再建立本次事实与判断之间的关系，不概述资料库。`,
    allowedAnchorTitles: [opening.title].filter(Boolean),
  }, {
    paragraphRole: 'relation_explanation',
    purpose: '解释材料之间的关系，建立中心判断，写清主要因果链和利益位置。',
    allowedAnchorTitles: uniqueStrings([opening.title, explanation.title]),
  }, {
    paragraphRole: 'evidence_turn',
    purpose: '用第二个事实锚点推进转折，说明现实约束如何改变行动和后果，避免只换名词。',
    allowedAnchorTitles: uniqueStrings([contrast.title, explanation.title]),
  }, {
    paragraphRole: 'context_deepening',
    purpose: '让背景材料补足连续性，但不扩大成资料巡游；必须把对象、动作、限制或位置差写进判断链。',
    allowedAnchorTitles: uniqueStrings([background.title, contrast.title]),
  }, {
    paragraphRole: 'judgment_close',
    purpose: '回到中心判断，明确写出本题后果和判断依据，并完成收束。',
    allowedAnchorTitles: uniqueStrings(anchors.slice(0, 3).map((item) => item.title)),
  }];
}

function isUsableArticleSemanticUnit(
  unit: RuntimeArticleContext['semantic']['units'][number],
  allowHistoricalRegister: boolean,
): boolean {
  const haystack = [
    unit.id,
    unit.sourceTitle,
    unit.sourceAuthor,
    unit.sourceLocator,
    unit.summary,
    unit.excerpt,
    ...unit.tags,
  ].map((item) => String(item || '')).join(' ');
  if (/smoke|test fixture|debug seed|占位|placeholder/i.test(haystack)) {
    return false;
  }
  return true;
}

// 写作简报负责文体切换和作者投射，正文仍由模型一次性完成。
function buildArticleWritingBrief(input: {
  topic: string;
  target: string;
  context: RuntimeArticleContext;
  plan: ReturnType<typeof buildRuntimeArticlePlan>;
  materialPack?: Record<string, any>;
  acceptanceContract?: Record<string, any>;
  claimBudget?: Record<string, any>;
}): Record<string, any> {
  const policy = input.acceptanceContract?.policy && typeof input.acceptanceContract.policy === 'object'
    ? input.acceptanceContract.policy as Record<string, any>
    : {};
  const taskType = String(input.acceptanceContract?.taskType || input.target || 'commentary');
  const allowHistoricalRegister = isHistoricalRegisterActive({ topic: input.topic, target: input.target } as RuntimeGenerateArticleRequest, input.context);
  const candidateTerms = selectWritingBriefCandidateTerms({
    plan: input.plan,
    materialPack: input.materialPack,
    allowHistoricalRegister,
  });
  const bannedTerms = uniqueStrings([
    ...input.context.styleContract.bannedTerms,
    ...toStringList(policy.bannedTerms),
    ...toStringList(input.acceptanceContract?.globalForbiddenCases),
  ]);
  const agentContracts = buildArticleAgentContractBundle({
    topic: input.topic,
    target: input.target,
    context: input.context,
    plan: input.plan,
    materialPack: input.materialPack,
    acceptanceContract: input.acceptanceContract,
  });

  return {
    version: 'article-writing-brief.v1',
    role: 'model_writing_brief',
    topic: input.topic,
    target: input.target,
    taskType,
    bodyOwner: 'model',
    generationPath: 'runtime.generate.article',
    retrievalPlan: (input.context as any).retrievalPlan || null,
    genreContract: {
      commentary: /article|commentary|draft|myblog|obsidian-video-script/.test(taskType),
      instruction: '按本次 target 和 taskType 组织文体，作者模型只提供跨文体判断习惯，不把小说场面技法强加给论述文章。',
    },
    authorProjection: {
      profileId: input.plan.authorModel.profileId || '',
      stance: input.plan.authorModel.stance || '',
      voice: input.plan.authorModel.voice.slice(0, 8),
      qualityNorthStar: input.plan.authorModel.qualityNorthStar || '',
      executionRules: input.plan.authorModel.executionRules.slice(0, 10),
    },
    materialPolicy: {
      factBoundary: Array.isArray(input.materialPack?.factBoundary) ? input.materialPack?.factBoundary : [],
      sourceUse: '材料服务判断，不按来源摘抄或拼接成文。',
      creativeContractReferenceLibrary: 'style_and_citation_boundary_only',
      sourceGrounding: '类似 NotebookLM 的资料优先合成。只根据本次资料包和 DataBase 检索材料展开，缺材料时承认边界，不借创作合同参考库补事实。',
      argumentDigest: input.materialPack?.argumentDigest || null,
      materialFunctionPlan: input.materialPack?.materialFunctionPlan || null,
      sourceUsePolicy: input.materialPack?.sourceUsePolicy || null,
      contextEngineering: {
        pipeline: 'EvidencePack / StylePack / sourcePassages -> material function plan -> argument digest -> fact atom budget -> paragraph blueprint -> paragraph-scoped model body -> reviewer evidence',
        bodyOwner: 'model',
        runtimeMutation: false,
      },
      evidencePackSources: Array.isArray(input.materialPack?.evidencePackSources) ? input.materialPack.evidencePackSources : [],
      evidencePackChunks: Array.isArray(input.materialPack?.evidencePackChunks) ? input.materialPack.evidencePackChunks : [],
      experienceItems: Array.isArray(input.materialPack?.experienceItems) ? input.materialPack.experienceItems : [],
      evidencePackQueryRun: input.materialPack?.retrievalPolicy?.queryRun || {},
      evidencePackScreening: input.materialPack?.retrievalPolicy?.screening || {},
    },
    lexicalPolicy: {
      candidateTerms: candidateTerms.slice(0, 40),
      bannedTerms: bannedTerms.slice(0, 220),
      rule: '候选词只在语义、语域、对象搭配成立时使用；禁用词只产出观察证据，不由 runtime 替换正文。',
    },
    structurePolicy: {
      paragraphTarget: buildArticleParagraphPlan(Number(input.plan.targetWordCount || 0) || 1800),
      processPlan: buildPromptSafeProcessPlan(input.plan.processPlan, allowHistoricalRegister),
      narrativeProtocol: buildPromptSafeNarrativeProtocol(input.plan.narrativeProtocol, allowHistoricalRegister),
      referenceWeave: buildPromptSafeArticlePlan(input.plan).referenceWeave,
    },
    contextDiscipline: {
      allowHistoricalRegister,
      rule: allowHistoricalRegister
        ? '历史语域可用，但仍须受本次资料包约束。'
        : '本主题不是历史现场叙事。不得把未被本次资料包前景化的历史语域、场景或称谓写入正文。',
    },
    evidencePolicy: {
      sourcesFirst: '先看 EvidencePack sources，再看 chunks，再看 citations。',
      chunkUse: 'chunks 只用于事实和概念化用，不直接复制成正文。',
      citationUse: 'citations 只进写作简报和验收报告，不进正文编号。',
      queryRunUse: 'queryRun 只记录检索轮次、provider 和 query 切换，不允许被当成正文材料。',
      screeningUse: 'screening 只记录筛选强度和来源广度，不允许回流成正文替代材料。',
    },
    argumentDigest: input.materialPack?.argumentDigest || null,
    claimBudget: input.claimBudget || null,
    argumentDiscipline: {
      centralClaimFirst: '先服从材料消化得到的主论证线，再使用 EvidencePack 原始切块。',
      evidencePackUse: 'EvidencePack 是后盾，不是清单。不得为了覆盖率逐一巡游 sources、chunks 或 citations。',
      paragraphRouteUse: '每段只推进 paragraphBlueprint 中的一个关系；不服务该段 claim budget 的材料宁可不用。',
      antiPatchwork: '同一自然段不要轮换多个文明、书名、人物和理论名词来显得资料丰富。',
    },
    agentContracts,
    regenerationPolicy: '质量失败时，只能把观察证据带回 runtime.generate.article 重新生成；不得 polish mutation、AST 正文投影或 runtime 替换。',
  };
}

function buildPromptSafeProcessPlan(
  processPlan: ReturnType<typeof buildRuntimeArticlePlan>['processPlan'],
  allowHistoricalRegister: boolean,
): Record<string, any> {
  if (allowHistoricalRegister) {
    return processPlan;
  }
  return {
    version: processPlan.version,
    required: processPlan.required,
    series: processPlan.series,
    episode: processPlan.episode,
    timeBoundary: '围绕本次主题和资料包展开，不模拟历史现场，不预设历史角色。',
    viewpointBoundary: '论述文章视角。第三人称或作者论述视角均可，但必须围绕资料包和主题判断推进。',
    knowledgeBoundary: '只使用本次请求、DataBase 检索材料、语义单元、记忆、文献和用户材料提供的信息。',
    sceneEntrances: ['从本次主题的核心对象、现实矛盾、可观察后果或资料包中的具体事实切入。'],
    eventSequence: [
      '界定本次主题要解决的问题',
      '用资料包中的事实或概念建立论证入口',
      '解释事实之间的压力传导',
      '把现实风险和材料边界分开处理，再说明判断如何成立',
      '把判断落回现实后果和可观察影响',
      '以一个准确意象收束，不写万能总结',
    ],
    narrativeMoves: [
      '概念入口',
      '资料支撑',
      '结构展开',
      '反例或限制',
      '判断收束',
    ],
    imageMotifs: processPlan.imageMotifs,
    pacingRules: [
      '先判断问题，再使用风格',
      '每段必须推进一个结构判断或限制',
      '不要把历史词库当正文素材',
    ],
    dictionRules: [
      '使用现代论述文章语言，可以保留作者风格中的冷静和制度感',
      '候选词只在语义贴合时使用',
    ],
    forbiddenMoves: [
      '禁止历史角色扮演',
      '禁止虚构历史场面',
      '禁止套用本次资料包之外的历史语域',
      ...processPlan.forbiddenMoves,
    ],
    endingHook: processPlan.endingHook || '落回本次资料包支持的具体意象。',
  };
}

function buildPromptSafeNarrativeProtocol(
  protocol: ReturnType<typeof buildRuntimeArticlePlan>['narrativeProtocol'],
  allowHistoricalRegister: boolean,
): Record<string, any> {
  if (allowHistoricalRegister) {
    return protocol;
  }
  return {
    version: protocol.version,
    required: protocol.required,
    perspective: {
      mode: 'commentary',
      rules: [
        '论述文章视角。模型可以综合资料形成判断，但必须把事实、推论和修辞分开。',
        '不进行历史现场角色扮演，不借后设历史语域替代本题资料。',
      ],
      prohibitions: [
        '禁止历史现场 cosplay',
        '禁止把创作合同参考库当事实来源',
        ...protocol.perspective.prohibitions,
      ],
    },
    ideologicalBlend: [],
    characterMotivationEngine: [],
    narrativeGoal: '用资料包和作者模型完成清晰、有判断、有证据边界的论述文章。',
    narrativeDevices: protocol.narrativeDevices.filter((item) => !/历史|闪回|角色|现场|物哀|上帝|宏观战略|微观/.test(item)),
    persuasionStrategy: [
      '先定义问题，再展开结构和关系',
      '用资料包支撑判断',
      '明确哪些只是类比，哪些是事实',
      '缺少事实时不虚构场景补齐',
    ],
    ironyMethods: [],
    structureLogic: {
      opening: '从本题核心矛盾或资料包事实切入。',
      development: '围绕概念、结构、资料和现实接口推进。',
      ending: '回到本题判断和现实后果，不做历史场景悬置。',
    },
    lexicalSystem: {
      prioritySource: 'DataBase 作者模型、候选词库和本次资料包。',
      preferredVocabulary: protocol.lexicalSystem.preferredVocabulary,
      contextualVocabulary: protocol.lexicalSystem.contextualVocabulary,
      contextualRules: protocol.lexicalSystem.contextualRules,
      bannedTerms: protocol.lexicalSystem.bannedTerms,
    },
    rhetoricalSystem: {
      metaphorSources: protocol.rhetoricalSystem.metaphorSources,
      metaphorStyle: '服务论证，不用历史场景装饰。',
      bannedMetaphors: protocol.rhetoricalSystem.bannedMetaphors,
    },
    sourceUse: {
      quotationSources: [],
      referenceAnchors: [],
      citationRules: protocol.sourceUse.citationRules,
    },
    corePrinciples: [
      '资料优先',
      '判断必须受事实边界约束',
      '作者风格服务主题，不覆盖主题',
    ],
    formatProhibitions: protocol.formatProhibitions,
  };
}

function selectWritingBriefCandidateTerms(input: {
  plan: ReturnType<typeof buildRuntimeArticlePlan>;
  materialPack?: Record<string, any>;
  allowHistoricalRegister: boolean;
}): string[] {
  const sections = getRuntimeArticlePlanSections(input.plan);
  const materialTerms = [
    ...toStringList(input.materialPack?.sourcePassages?.flatMap?.((item: any) => [item.title, item.kind]) || []),
    ...toStringList(input.materialPack?.semanticUnits?.flatMap?.((item: any) => [item.title, item.summary]) || []),
    ...toStringList(input.materialPack?.memoryItems?.flatMap?.((item: any) => [item.title, item.summary]) || []),
    ...toStringList(input.materialPack?.literatureItems?.flatMap?.((item: any) => [item.title, item.summary]) || []),
  ];
  const topicTerms = extractCandidateTermsFromText([
    input.plan.topic,
    ...materialTerms,
  ].join(' '));
  const plannedTerms = uniqueStrings(sections.flatMap((section) => section.requiredTerms || []));
  return uniqueStrings([...topicTerms, ...plannedTerms])
    .filter((item) => item.length >= 2 && item.length <= 14)
    .slice(0, 40);
}

function extractCandidateTermsFromText(value: string): string[] {
  const text = String(value || '');
  return uniqueStrings(Array.from(text.matchAll(/[“《]?([\u4e00-\u9fa5A-Za-z0-9]{2,14})[”》]?/g))
    .map((match) => match[1])
    .filter((item) => item.length >= 2 && item.length <= 14));
}

function renderPromptJson(value: unknown): string {
  return JSON.stringify(value || {}, null, 2)
    .split(/\r?\n/)
    .map((line) => sanitizePromptSurfaceText(line))
    .filter(Boolean)
    .join('\n');
}

function renderArticlePlanPromptSummary(plan: ReturnType<typeof buildRuntimeArticlePlan>): string {
  const sections = Array.isArray(plan.sections) ? plan.sections : [];
  return [
    sanitizePromptSurfaceText(`主题 ${plan.topic || ''}`),
    sanitizePromptSurfaceText(`目标 ${plan.target || ''}`),
    sanitizePromptSurfaceText(`篇幅 ${Number(plan.targetWordCount || 0) || 0}`),
    ...sections.slice(0, 8).map((section, index) => sanitizePromptSurfaceText([
      `${index + 1}. ${section.title || ''}`,
      section.intent ? `任务 ${section.intent}` : '',
      Array.isArray(section.requiredTerms) && section.requiredTerms.length ? `词 ${section.requiredTerms.join('、')}` : '',
      Array.isArray(section.evidenceTitles) && section.evidenceTitles.length ? `证据 ${section.evidenceTitles.join('、')}` : '',
    ].filter(Boolean).join('。'))),
  ].filter(Boolean).join('\n') || '无';
}

function renderMaterialPackPromptSummary(value: unknown): string {
  const pack = value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, any>
    : {};
  const sources = Array.isArray(pack.evidencePackSources) ? pack.evidencePackSources : [];
  const chunks = Array.isArray(pack.evidencePackChunks) ? pack.evidencePackChunks : [];
  const semanticUnits = Array.isArray(pack.semanticUnits) ? pack.semanticUnits : [];
  const memoryItems = Array.isArray(pack.memoryItems) ? pack.memoryItems : [];
  const experienceItems = Array.isArray(pack.experienceItems) ? pack.experienceItems : [];
  const argumentDigest = pack.argumentDigest && typeof pack.argumentDigest === 'object'
    ? pack.argumentDigest as Record<string, any>
    : {};
  const materialFunctionPlan = pack.materialFunctionPlan && typeof pack.materialFunctionPlan === 'object'
    ? pack.materialFunctionPlan as Record<string, any>
    : {};
  const primaryAnchors = Array.isArray(argumentDigest.primaryAnchors) ? argumentDigest.primaryAnchors : [];
  const functionItems = Array.isArray(materialFunctionPlan.items) ? materialFunctionPlan.items : [];
  return [
    sanitizePromptSurfaceText(`资料来源 ${sources.length} 个，切块 ${chunks.length} 个，语义单元 ${semanticUnits.length} 个，记忆 ${memoryItems.length} 个`),
    sanitizePromptSurfaceText(`经验记录 ${experienceItems.length} 个`),
    sanitizePromptSurfaceText(`材料消化主线 ${argumentDigest.centralClaim || ''}`),
    sanitizePromptSurfaceText(`主锚点 ${primaryAnchors.slice(0, 5).map((item: any) => item.title || item.id).filter(Boolean).join('、')}`),
    sanitizePromptSurfaceText(`材料功能分工 ${functionItems.slice(0, 8).map((item: any) => `${item.title || item.id}:${item.function || ''}:${item.bodyUse || ''}`).filter(Boolean).join('、')}`),
    ...sources.slice(0, 8).map((item: any, index: number) => sanitizePromptSurfaceText([
      `${index + 1}. ${item.title || item.name || item.id || ''}`,
      item.sourceType ? `来源 ${item.sourceType}` : '',
    ].filter(Boolean).join('。'))),
    ...chunks.slice(0, 10).map((item: any, index: number) => sanitizePromptSurfaceText([
      `${index + 1}. ${item.title || item.id || ''}`,
      item.text ? `材料 ${compactPromptText(item.text, 220)}` : '',
    ].filter(Boolean).join('。'))),
    ...semanticUnits.slice(0, 10).map((item: any, index: number) => sanitizePromptSurfaceText([
      `${index + 1}. ${item.title || item.sourceTitle || ''}`,
      item.summary ? `摘要 ${compactPromptText(item.summary, 220)}` : '',
    ].filter(Boolean).join('。'))),
    ...experienceItems.slice(0, 8).map((item: any, index: number) => sanitizePromptSurfaceText([
      `${index + 1}. ${item.title || item.id || ''}`,
      item.summary ? `经验 ${compactPromptText(item.summary, 220)}` : '',
      Number.isFinite(Number(item.score)) ? `相关 ${Number(item.score)}` : '',
      Array.isArray(item.reasons) && item.reasons.length ? `命中 ${item.reasons.join('、')}` : '',
      item.passed === true ? '结果 通过' : item.passed === false ? '结果 未通过' : '',
    ].filter(Boolean).join('。'))),
  ].filter(Boolean).join('\n') || '无';
}

function renderWritingBriefPromptSummary(value: unknown): string {
  const brief = value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, any>
    : {};
  const authorProjection = brief.authorProjection && typeof brief.authorProjection === 'object'
    ? brief.authorProjection as Record<string, any>
    : {};
  const lexicalPolicy = brief.lexicalPolicy && typeof brief.lexicalPolicy === 'object'
    ? brief.lexicalPolicy as Record<string, any>
    : {};
  const materialPolicy = brief.materialPolicy && typeof brief.materialPolicy === 'object'
    ? brief.materialPolicy as Record<string, any>
    : {};
  const argumentDigest = materialPolicy.argumentDigest && typeof materialPolicy.argumentDigest === 'object'
    ? materialPolicy.argumentDigest as Record<string, any>
    : {};
  const materialFunctionPlan = materialPolicy.materialFunctionPlan && typeof materialPolicy.materialFunctionPlan === 'object'
    ? materialPolicy.materialFunctionPlan as Record<string, any>
    : {};
  const functionItems = Array.isArray(materialFunctionPlan.items) ? materialFunctionPlan.items : [];
  return [
    sanitizePromptSurfaceText(`任务 ${brief.taskType || brief.target || ''}`),
    sanitizePromptSurfaceText(`作者立场 ${authorProjection.stance || ''}`),
    sanitizePromptSurfaceText(`作者声音 ${Array.isArray(authorProjection.voice) ? authorProjection.voice.join('、') : ''}`),
    sanitizePromptSurfaceText(`质量准绳 ${authorProjection.qualityNorthStar || ''}`),
    sanitizePromptSurfaceText(`候选词 ${Array.isArray(lexicalPolicy.candidateTerms) ? lexicalPolicy.candidateTerms.slice(0, 20).join('、') : ''}`),
    sanitizePromptSurfaceText(`材料规则 ${materialPolicy.sourceUse || ''}`),
    sanitizePromptSurfaceText(`资料优先 ${materialPolicy.sourceGrounding || ''}`),
    '事实锚点和解释锚点必须在正文里留下可见词面，不能全部退成抽象关系。',
    '至少让一条主锚点和一条解释锚点进入段落判断。',
    sanitizePromptSurfaceText(`经验命中 ${Array.isArray(materialPolicy.experienceItems) ? materialPolicy.experienceItems.slice(0, 8).map((item: any) => item.title || item.id).filter(Boolean).join('、') : ''}`),
    sanitizePromptSurfaceText(`主论证线 ${argumentDigest.centralClaim || ''}`),
    sanitizePromptSurfaceText(`材料分工 ${functionItems.slice(0, 8).map((item: any) => `${item.title || item.id}:${item.function || ''}:${item.bodyUse || ''}`).filter(Boolean).join('、')}`),
    sanitizePromptSurfaceText(`防拼贴规则 ${Array.isArray(argumentDigest.antiPatchworkRules) ? argumentDigest.antiPatchworkRules.join('。') : ''}`),
  ].filter((item) => item && !/^任务\s*$|^作者立场\s*$|^作者声音\s*$|^质量准绳\s*$|^候选词\s*$|^材料规则\s*$|^资料优先\s*$/.test(item)).join('\n') || '无';
}

function renderArgumentDigestPrompt(value: unknown, topic?: string): string {
  const digest = value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, any>
    : {};
  const primaryAnchors = Array.isArray(digest.primaryAnchors) ? digest.primaryAnchors : [];
  const backgroundAnchors = Array.isArray(digest.backgroundAnchors) ? digest.backgroundAnchors : [];
  const paragraphRoute = Array.isArray(digest.paragraphRoute) ? digest.paragraphRoute : [];
  const rules = Array.isArray(digest.antiPatchworkRules) ? digest.antiPatchworkRules : [];
  const caseBindings = Array.isArray(digest.caseBindings) ? digest.caseBindings : [];
  const theorySkeletons = Array.isArray(digest.theorySkeletons) ? digest.theorySkeletons : [];
  const analogyPolicy = digest.analogyPolicy && typeof digest.analogyPolicy === 'object'
    ? digest.analogyPolicy as Record<string, any>
    : {};
  const citationSilenceRules = Array.isArray(digest.citationSilenceRules) ? digest.citationSilenceRules : [];
  return [
    sanitizePromptSurfaceText(`版本 ${digest.version || 'article-argument-digest.v1'}`),
    sanitizePromptSurfaceText(`中心判断 ${digest.centralClaim || ''}`),
    sanitizePromptSurfaceText(`题目锚点 ${String(topic || '').trim()}`),
    sanitizePromptSurfaceText(`题目陈述 ${String(topic || '').replace(/^为什么/, '').replace(/为什么/g, '').replace(/[？?]/g, '').trim()}`),
    sanitizePromptSurfaceText(`材料使用 ${digest.materialUseRule || ''}`),
    ...rules.slice(0, 6).map((item: any, index: number) => sanitizePromptSurfaceText(`防拼贴 ${index + 1}. ${item}`)),
    ...citationSilenceRules.slice(0, 5).map((item: any, index: number) => sanitizePromptSurfaceText(`来源沉默 ${index + 1}. ${item}`)),
    sanitizePromptSurfaceText(`类比规则 ${analogyPolicy.rule || ''}`),
    '主锚点',
    primaryAnchors.slice(0, 5).map((item: any, index: number) => sanitizePromptSurfaceText([
      `${index + 1}. ${item.title || item.id || ''}`,
      item.kind ? `类型 ${item.kind}` : '',
      item.use ? `用法 ${item.use}` : '',
      item.summary ? `摘要 ${compactPromptText(item.summary, 180)}` : '',
    ].filter(Boolean).join('。'))).join('\n') || '无',
    '背景材料',
    backgroundAnchors.slice(0, 5).map((item: any, index: number) => sanitizePromptSurfaceText([
      `${index + 1}. ${item.title || item.id || ''}`,
      item.use ? `边界 ${item.use}` : '',
    ].filter(Boolean).join('。'))).join('\n') || '无',
    '段落路线',
    paragraphRoute.slice(0, 8).map((item: any, index: number) => sanitizePromptSurfaceText([
      `${index + 1}. ${item.paragraphRole || ''}`,
      item.purpose ? `任务 ${item.purpose}` : '',
      Array.isArray(item.allowedAnchorTitles) && item.allowedAnchorTitles.length ? `可用锚点 ${item.allowedAnchorTitles.join('、')}` : '',
    ].filter(Boolean).join('。'))).join('\n') || '无',
    '事实绑定',
    caseBindings.slice(0, 6).map((item: any, index: number) => sanitizePromptSurfaceText(`${index + 1}. ${item.title || ''}。${item.claimBinding || ''}`)).join('\n') || '无',
    '解释锚点',
    theorySkeletons.slice(0, 5).map((item: any, index: number) => sanitizePromptSurfaceText(`${index + 1}. ${item.title || ''}。${item.claimBinding || ''}`)).join('\n') || '无',
  ].filter(Boolean).join('\n') || '无';
}

function buildSourcePassagePrompt(sourcePassages: Array<Record<string, any>>): {
  facts: string;
  theories: string;
  comparisons: string;
  observers: string;
  literary: string;
  factBoundary: string;
} {
  const buckets: Record<SourcePassageMaterialKind, string[]> = {
    document: [],
    theory: [],
    comparison: [],
    observer: [],
    literary: [],
  };
  sourcePassages
    .filter((item) => !isSourcePassageMetaRecovery(
      String(item.title || item.sourceTitle || item.name || item.label || item.sourceId || ''),
      String(item.excerpt || item.text || item.summary || ''),
    ))
    .slice(0, 16)
    .forEach((item, index) => {
    const kind = normalizeSourcePassageKind(item.kind || item.type || item.category || item.sourceType || item.sourceKind);
    const excerpt = compileSourcePassageFactPhrases(String(item.excerpt || item.text || item.summary || '')).trim();
    if (!excerpt) return;
    const line = sanitizePromptSurfaceText(`${index + 1}. ${excerpt}`);
    if (line) buckets[kind].push(line);
  });
  const factBoundary = sanitizePromptSurfaceText([...buckets.document, ...buckets.observer].join('\n') || '无');
  return {
    facts: sanitizePromptSurfaceText(`事实材料：${buckets.document.length ? buckets.document.join('\n') : '无'}`),
    theories: sanitizePromptSurfaceText(`理论来源：${buckets.theory.length ? buckets.theory.join('\n') : '无'}`),
    comparisons: sanitizePromptSurfaceText(`对照材料：${buckets.comparison.length ? buckets.comparison.join('\n') : '无'}`),
    observers: sanitizePromptSurfaceText(`观察材料：${buckets.observer.length ? buckets.observer.join('\n') : '无'}`),
    literary: sanitizePromptSurfaceText(`文献来源：${buckets.literary.length ? buckets.literary.join('\n') : '无'}`),
    factBoundary,
  };
}

function buildSemanticMaterialPrompt(units: RuntimeArticleContext['semantic']['units']): {
  facts: string;
  theories: string;
  comparisons: string;
  observers: string;
  literary: string;
} {
  const buckets: Record<SourcePassageMaterialKind, string[]> = {
    document: [],
    theory: [],
    comparison: [],
    observer: [],
    literary: [],
  };
  units.slice(0, 20).forEach((unit, index) => {
    const kind = unit.materialKind || normalizeSourcePassageKind([
      unit.tags.join(' '),
      unit.sourceTitle,
      unit.summary,
      unit.excerpt,
    ].filter(Boolean).join(' '));
    const excerpt = compactPromptText(unit.summary || unit.excerpt, 420);
    if (!excerpt) return;
    const line = sanitizePromptSurfaceText(`${index + 1}. ${excerpt}`);
    if (line) buckets[kind].push(line);
  });
  return {
    facts: sanitizePromptSurfaceText(`语义事实材料：${buckets.document.length ? buckets.document.join('\n') : '无'}`),
    theories: sanitizePromptSurfaceText(`语义理论来源：${buckets.theory.length ? buckets.theory.join('\n') : '无'}`),
    comparisons: sanitizePromptSurfaceText(`语义对照材料：${buckets.comparison.length ? buckets.comparison.join('\n') : '无'}`),
    observers: sanitizePromptSurfaceText(`语义观察材料：${buckets.observer.length ? buckets.observer.join('\n') : '无'}`),
    literary: sanitizePromptSurfaceText(`语义文献来源：${buckets.literary.length ? buckets.literary.join('\n') : '无'}`),
  };
}

function joinAvailablePromptBlocks(...blocks: string[]): string {
  const available = blocks
    .map((item) => String(item || '').trim())
    .filter((item) => item && !/：无$/.test(item));
  return available.join('\n') || blocks.find((item) => String(item || '').trim()) || '无';
}

async function buildArticleAcceptanceContractInput(
  input: Record<string, any>,
  context: RuntimeArticleContext,
  deps: ContentRuntimeDeps,
  materialPack?: Record<string, any>,
) {
  const raw = input.acceptance && typeof input.acceptance === 'object' && !Array.isArray(input.acceptance)
    ? input.acceptance as Record<string, any>
    : {};
  const policy = raw.policy && typeof raw.policy === 'object' && !Array.isArray(raw.policy)
    ? raw.policy as Record<string, any>
    : {};
  const structure = input.structure && typeof input.structure === 'object' && !Array.isArray(input.structure)
    ? input.structure as Record<string, any>
    : {};
  const minChars = Number(raw.minNonWhitespaceChars || raw.minLength || structure.minNonWhitespaceChars || 0) || 0;
  const parts = Array.isArray(raw.parts)
    ? raw.parts
    : minChars > 0
      ? [{ id: 'body', minNonWhitespaceChars: minChars }]
      : [];
  const requestFactAtoms = [
    ...toFactAtomList(raw.factBoundaryAtoms),
    ...toFactAtomList(policy.factBoundaryAtoms),
  ];
  const materialFactAtoms = buildMaterialFactAtoms({
    topic: String(input.topic || ''),
    context,
    sourcePassages: Array.isArray(input.sourcePassages) ? input.sourcePassages : [],
    materialPack,
  });
  const factBoundaryStrict = raw.factBoundaryStrict === false || policy.factBoundaryStrict === false
    ? false
    : isArticleFactBoundaryRequiredByDefault(input)
      || requestFactAtoms.length > 0
      || materialFactAtoms.length > 0
      || Boolean(raw.factBoundaryStrict || policy.factBoundaryStrict);
  const evidenceFactAtoms = factBoundaryStrict && requestFactAtoms.length === 0
    ? await resolveDataBaseEvidenceFactAtoms(input, deps)
    : [];
  const resolvedFactAtoms = uniqueFactAtoms([
    ...requestFactAtoms,
    ...materialFactAtoms,
    ...evidenceFactAtoms,
  ]);
  if (factBoundaryStrict) {
    assertStrictArticleFactBoundaryWritable({
      topic: String(input.topic || ''),
      targetWordCount: Number(structure.targetWordCount || input.targetWordCount || 0) || 0,
      factAtoms: resolvedFactAtoms,
      materialPack,
    });
  }
  return {
    version: 'article-acceptance-contract.v1',
    id: String(raw.id || `runtime-article-${String(input.topic || 'untitled').slice(0, 48)}`),
    taskType: String(raw.taskType || input.taskType || 'commentary'),
    seamlessInstallments: Boolean(raw.seamlessInstallments || structure.seamlessInstallments),
    parts,
    globalRequiredCases: uniqueStrings([
      ...toStringList(raw.globalRequiredCases),
      ...toStringList(raw.requiredCases),
      ...toStringList(raw.requiredTerms),
      ...toStringList(input.requiredCases),
      ...toStringList(input.requiredTerms),
    ]),
    globalForbiddenCases: uniqueStrings([
      ...toStringList(raw.globalForbiddenCases),
      ...toStringList(raw.forbiddenCases),
      ...toStringList(input.forbiddenCases),
    ]),
    globalRequiredSources: uniqueStrings([
      ...toStringList(raw.globalRequiredSources),
      ...toStringList(raw.requiredSources),
      ...toStringList(input.requiredSources),
    ]),
    policy: {
      ...policy,
      forbidInlineSourceCitations: policy.forbidInlineSourceCitations === false || raw.forbidInlineSourceCitations === false
        ? false
        : true,
      preferredTerms: uniqueStrings([
        ...toStringList(raw.preferredTerms),
        ...toStringList(policy.preferredTerms),
        ...context.styleContract.preferredTerms,
        ...toStringList(input.preferredTerms),
      ]),
      bannedTerms: uniqueStrings([
        ...toStringList(raw.bannedTerms),
        ...toStringList(policy.bannedTerms),
        ...context.styleContract.bannedTerms,
        ...toStringList(input.bannedTerms),
      ]),
      factBoundaryStrict,
      factBoundaryAllowedTerms: uniqueStrings([
        ...toStringList(raw.factBoundaryAllowedTerms),
        ...toStringList(policy.factBoundaryAllowedTerms),
      ]),
      factBoundaryIgnoredTerms: uniqueStrings([
        ...toStringList(raw.factBoundaryIgnoredTerms),
        ...toStringList(policy.factBoundaryIgnoredTerms),
      ]),
      factBoundaryForbiddenTerms: uniqueStrings([
        ...toStringList(raw.factBoundaryForbiddenTerms),
        ...toStringList(policy.factBoundaryForbiddenTerms),
      ]),
      factBoundaryRequiredTerms: uniqueStrings([
        ...toStringList(raw.factBoundaryRequiredTerms),
        ...toStringList(policy.factBoundaryRequiredTerms),
      ]),
      factBoundaryAtoms: resolvedFactAtoms,
      factBoundaryRequiredAtomIds: uniqueStrings([
        ...toStringList(raw.factBoundaryRequiredAtomIds),
        ...toStringList(policy.factBoundaryRequiredAtomIds),
      ]),
      minPreferredTermHits: Number(policy.minPreferredTermHits || raw.minPreferredTermHits || 0) || 0,
    },
  };
}

function assertStrictArticleFactBoundaryWritable(input: {
  topic: string;
  targetWordCount: number;
  factAtoms: Array<Record<string, string>>;
  materialPack?: Record<string, any>;
}): void {
  const targetWordCount = Number(input.targetWordCount || 0) || 1800;
  const paragraphPlan = buildArticleParagraphPlan(targetWordCount);
  const minimumAtoms = Math.max(6, paragraphPlan.paragraphCount);
  if (input.factAtoms.length >= minimumAtoms) return;
  const evidencePackCounts = input.materialPack?.evidencePack?.counts && typeof input.materialPack.evidencePack.counts === 'object'
    ? input.materialPack.evidencePack.counts as Record<string, any>
    : {};
  const screening = input.materialPack?.retrievalPolicy?.screening && typeof input.materialPack.retrievalPolicy.screening === 'object'
    ? input.materialPack.retrievalPolicy.screening as Record<string, any>
    : {};
  const diagnostic: Record<string, any> = {
    version: 'strict-fact-boundary-diagnostic.v1',
    topic: input.topic || '',
    writableFactAtoms: input.factAtoms.length,
    minimumAtoms,
    evidenceCounts: {
      sources: Number(evidencePackCounts.sources || 0),
      chunks: Number(evidencePackCounts.chunks || 0),
      citations: Number(evidencePackCounts.citations || 0),
      webSources: Number(evidencePackCounts.webSources || 0),
      ragflowSources: Number(evidencePackCounts.ragflowSources || 0),
      queryRounds: Number(evidencePackCounts.queryRounds || 0),
    },
    materialCounts: {
      sources: Array.isArray(input.materialPack?.evidencePackSources) ? input.materialPack?.evidencePackSources.length : 0,
      chunks: Array.isArray(input.materialPack?.evidencePackChunks) ? input.materialPack?.evidencePackChunks.length : 0,
      citations: Array.isArray(input.materialPack?.evidenceCitations) ? input.materialPack?.evidenceCitations.length : 0,
      semanticUnits: Array.isArray(input.materialPack?.semanticUnits) ? input.materialPack?.semanticUnits.length : 0,
    },
    screening: {
      selectedChunkCount: Number(screening.selectedChunkCount || 0),
      selectedCitationCount: Number(screening.selectedCitationCount || 0),
      sourceDiversityCount: Number(screening.sourceDiversityCount || 0),
      queryCount: Number(screening.queryCount || 0),
    },
    retrievalPlan: input.materialPack?.retrievalPlan || input.materialPack?.evidencePack?.query || null,
    evidenceQueryRun: input.materialPack?.retrievalPolicy?.queryRun || {},
    factAtoms: input.factAtoms.slice(0, 12),
  };
  const error = new Error([
    'Article generation blocked before Writer: strict FactPack boundary has insufficient writable fact atoms.',
    `topic=${input.topic || ''}.`,
    `writableFactAtoms=${input.factAtoms.length}, minimum=${minimumAtoms}.`,
    `evidence sources=${Number(evidencePackCounts.sources || 0)}, chunks=${Number(evidencePackCounts.chunks || 0)}, citations=${Number(evidencePackCounts.citations || 0)}.`,
    `selected chunks=${Number(screening.selectedChunkCount || 0)}, selected citations=${Number(screening.selectedCitationCount || 0)}.`,
    'Fix DataBase Research/EvidencePack quality or material boundary; ContentBase will not generate article prose from insufficient facts.',
  ].join(' '));
  (error as any).blockers = [{
    ruleId: 'ARTICLE-FACTPACK-WRITABLE-ATOMS-001',
    severity: 'block',
    message: error.message,
    diagnostic,
  }];
  (error as any).acceptance = {
    passed: false,
    blocker: 'ARTICLE-FACTPACK-WRITABLE-ATOMS-001',
    diagnostic,
  };
  throw error;
}

function isArticleFactBoundaryRequiredByDefault(input: Record<string, any>): boolean {
  const target = String(input.target || 'draft').trim();
  const taskType = String(input.acceptance?.taskType || input.taskType || '').trim();
  const evidenceQuery = input.evidenceQuery && typeof input.evidenceQuery === 'object' && !Array.isArray(input.evidenceQuery)
    ? input.evidenceQuery as Record<string, any>
    : {};
  const articleTarget = ['article', 'article_draft', 'commentary', 'draft', 'obsidian-video-script'].includes(target)
    || taskType === 'commentary';
  if (!articleTarget) return false;
  return Boolean(
    evidenceQuery.includeWeb
    || evidenceQuery.includeRagflow
    || String(evidenceQuery.query || '').trim()
    || Array.isArray(input.sourcePassages) && input.sourcePassages.length > 0
  );
}

function assertStrictArticleModelStructuredOutput(input: {
  factBoundaryStrict: boolean;
  outputParseStatus?: string;
  factClaims?: Array<Record<string, any> | { text?: string; atomIds?: string[]; inference?: boolean; paragraphIndex?: number }>;
  paragraphBlueprint?: Record<string, any>;
}): void {
  const problems = inspectStrictArticleModelStructuredOutput(input);
  if (!problems.length) return;
  throw new Error(`Article generation blocked after Writer: ${problems[0]}`);
}

function inspectStrictArticleModelStructuredOutput(input: {
  factBoundaryStrict: boolean;
  outputParseStatus?: string;
  factClaims?: Array<Record<string, any> | { text?: string; atomIds?: string[]; inference?: boolean; paragraphIndex?: number }>;
  paragraphBlueprint?: Record<string, any>;
}): string[] {
  if (!input.factBoundaryStrict) return [];
  const problems: string[] = [];
  if (input.outputParseStatus !== 'parsed') {
    problems.push(`strict FactPack boundary requires structured paragraphs JSON, got outputParseStatus=${input.outputParseStatus || 'unknown'}.`);
  }
  const factClaims = Array.isArray(input.factClaims) ? input.factClaims : [];
  if (!factClaims.length) {
    problems.push('strict FactPack boundary requires paragraph-scoped factClaims, got zero claims.');
  }
  const paragraphs = Array.isArray(input.paragraphBlueprint?.paragraphs)
    ? input.paragraphBlueprint?.paragraphs as Array<Record<string, any>>
    : [];
  if (!paragraphs.length) return uniqueStrings(problems);
  const allowedByParagraph = new Map<number, Set<string>>();
  paragraphs.forEach((paragraph, fallbackIndex) => {
    const index = Number.isInteger(Number(paragraph.index)) ? Number(paragraph.index) : fallbackIndex;
    const allowed = new Set(
      (Array.isArray(paragraph.allowedAtoms) ? paragraph.allowedAtoms : [])
        .map((atom: any) => String(atom?.id || '').trim())
        .filter(Boolean),
    );
    allowedByParagraph.set(index, allowed);
  });
  factClaims.forEach((claim: any, claimIndex) => {
    const paragraphIndex = Number(claim?.paragraphIndex);
    if (!Number.isInteger(paragraphIndex)) {
      problems.push(`factClaim ${claimIndex + 1} is missing a valid paragraphIndex.`);
      return;
    }
    const allowed = allowedByParagraph.get(paragraphIndex);
    if (!allowed) {
      problems.push(`factClaim ${claimIndex + 1} targets paragraph ${paragraphIndex}, but Paragraph Blueprint has no such paragraph.`);
      return;
    }
    const atomIds = Array.isArray(claim?.atomIds) ? claim.atomIds.map(String).filter(Boolean) : [];
    const outsideAtoms = atomIds.filter((atomId: string) => !allowed.has(atomId));
    if (outsideAtoms.length) {
      problems.push(`factClaim ${claimIndex + 1} in paragraph ${paragraphIndex} uses atoms outside paragraph Claim Budget: ${outsideAtoms.slice(0, 6).join(', ')}.`);
    }
  });
  paragraphs.forEach((paragraph, fallbackIndex) => {
    const paragraphIndex = Number.isInteger(Number(paragraph.index)) ? Number(paragraph.index) : fallbackIndex;
    const requiredAtomIds = Array.isArray(paragraph.requiredAtomIds)
      ? paragraph.requiredAtomIds.map(String).filter(Boolean)
      : [];
    if (!requiredAtomIds.length) return;
    const paragraphClaims = factClaims.filter((claim: any) => Number(claim?.paragraphIndex) === paragraphIndex);
    const usedAtomIds = new Set(
      paragraphClaims.flatMap((claim: any) => Array.isArray(claim?.atomIds) ? claim.atomIds.map(String) : []),
    );
    const missingRequiredAtomIds = requiredAtomIds.filter((atomId) => !usedAtomIds.has(atomId));
    if (missingRequiredAtomIds.length) {
      problems.push(`paragraph ${paragraphIndex} did not bind required Claim Budget atoms: ${missingRequiredAtomIds.slice(0, 6).join(', ')}.`);
    }
  });
  return uniqueStrings(problems);
}

function buildStrictArticleWriterStructuredRepairFeedback(input: {
  topic: string;
  target: string;
  rejectedBody: string;
  problems: string[];
  baseUserPrompt: string;
  paragraphBlueprintPrompt: string;
  factBoundaryAtoms: unknown[];
  targetWordCount: number;
}): { system: string; user: string } {
  const problemPrompt = input.problems
    .map((problem, index) => `${index + 1}. ${sanitizePromptSurfaceText(problem)}`)
    .join('\n');
  return {
    system: [
      '你仍然是 ContentBase 唯一 Writer。',
      '本轮不是另起写作链路，也不是事后清洗。任务是在同一作者合同和同一 FactPack 下重新生成结构合格的正文。',
      '必须输出 JSON 对象，且只能使用 paragraphs 数组。JSON 外不得有任何解释。',
      '每个 paragraph item 必须包含 paragraphIndex、body、factClaims。',
      '每段 body 只能写该段 Paragraph Blueprint.allowedAtoms 能支撑的具体事实。',
      '每段 factClaims 只能引用该段 allowedAtoms 中的 atomId。不能把别段 atom 搬到本段，不能使用未列出的 atom。',
      '不能绑定本段 allowedAtoms 的内容，只能写成概括判断，不能写数字、地点、机构、人物、现场动作或市场动作。',
      '不要修补上一稿句子。请按 Paragraph Blueprint 重新生成全篇 paragraphs JSON。',
    ].join('\n'),
    user: [
      input.baseUserPrompt,
      '',
      'Writer 结构化输出被拒绝',
      problemPrompt || '未知结构问题',
      '',
      '本轮硬约束',
      `主题 ${sanitizePromptSurfaceText(input.topic)}`,
      `目标 ${sanitizePromptSurfaceText(input.target)}`,
      `目标长度 至少 ${input.targetWordCount} 个中文字符`,
      '',
      'Paragraph Blueprint',
      input.paragraphBlueprintPrompt,
      '',
      'Typed Fact Atoms',
      sanitizePromptSurfaceText(JSON.stringify(input.factBoundaryAtoms || [], null, 2)),
      '',
      '上一稿只作为被拒绝样本，不得照抄，不得沿用其中无法绑定段落预算的具体事实',
      compactPromptText(sanitizePromptSurfaceText(input.rejectedBody), 2400),
      '',
      '请重新输出严格 JSON，结构必须为 {"paragraphs":[{"paragraphIndex":0,"body":"单个自然段","factClaims":[{"text":"本段具体事实","atomIds":["fact_atom_1"],"inference":false,"paragraphIndex":0}]}]}。',
      '不要输出顶层 body，不要输出顶层 factClaims，不要输出 Markdown。',
    ].join('\n'),
  };
}

async function runStrictArticleWriterStructuredRepairPass(input: {
  body: string;
  parsed: ReturnType<typeof parseArticleModelOutput>;
  problems: string[];
  systemPrompt: string;
  userPrompt: string;
  topic: string;
  target: string;
  paragraphBlueprintPrompt: string;
  factBoundaryAtoms: unknown[];
  targetWordCount: number;
  factBoundaryStrict: boolean;
  styleGuard: RestrictedStyleForegroundGuard;
  invoke: (feedback: { system: string; user: string }) => Promise<{ text: string; provider?: string; model?: string }>;
}): Promise<{
  body: string;
  parsed: ReturnType<typeof parseArticleModelOutput>;
  provider?: string;
  model?: string;
  feedback: { system: string; user: string };
}> {
  const feedback = buildStrictArticleWriterStructuredRepairFeedback({
    topic: input.topic,
    target: input.target,
    rejectedBody: input.body,
    problems: input.problems,
    baseUserPrompt: input.userPrompt,
    paragraphBlueprintPrompt: input.paragraphBlueprintPrompt,
    factBoundaryAtoms: input.factBoundaryAtoms,
    targetWordCount: input.targetWordCount,
  });
  const result = await input.invoke(feedback);
  const parsed = parseArticleModelOutput(result.text, input.factBoundaryStrict);
  const body = finalizeArticleModelBody({ body: parsed.body, styleGuard: input.styleGuard });
  return {
    body,
    parsed,
    provider: result.provider,
    model: result.model,
    feedback,
  };
}

async function resolveDataBaseEvidenceFactAtoms(
  input: Record<string, any>,
  deps: ContentRuntimeDeps,
): Promise<Array<Record<string, string>>> {
  const partId = String(input.partId || input.acceptance?.partId || input.acceptance?.policy?.partId || '').trim();
  if (!partId) {
    return [];
  }

  const limit = Number(input.acceptance?.factBoundaryAtomLimit || input.acceptance?.policy?.factBoundaryAtomLimit || 500) || 500;
  const response = deps.resolveEvidenceFactAtoms
    ? await deps.resolveEvidenceFactAtoms({ partId, limit })
    : await readEvidenceFactAtomsFromDataBaseGateway({ partId, limit });

  return toFactAtomList(response.atoms);
}

async function readEvidenceFactAtomsFromDataBaseGateway(input: {
  partId: string;
  limit: number;
}): Promise<{
  atoms: Array<Record<string, unknown>>;
  sourceBlockIds?: string[];
  requestId?: string;
}> {
  const client = createDataBaseGatewayClient() as unknown as {
    getCanonicalPartEvidenceFactAtoms?: (request: { id: string; limit?: number }) => Promise<{
      atoms?: Array<Record<string, unknown>>;
      sourceBlockIds?: string[];
      requestId?: string;
    }>;
  };
  if (typeof client.getCanonicalPartEvidenceFactAtoms !== 'function') {
    throw new Error('DataBase Gateway generated client is missing getCanonicalPartEvidenceFactAtoms');
  }
  const response = await client.getCanonicalPartEvidenceFactAtoms({
    id: input.partId,
    limit: input.limit,
  });
  if (!response || !Array.isArray(response.atoms)) {
    throw new Error('DataBase Gateway evidence fact atom response is invalid');
  }
  return {
    atoms: response.atoms,
    sourceBlockIds: response.sourceBlockIds,
    requestId: response.requestId,
  };
}

function toStringList(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String).map((item) => item.trim()).filter(Boolean) : [];
}

function toFactAtomList(value: unknown): Array<Record<string, string>> {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => item && typeof item === 'object' && !Array.isArray(item))
    .map((item) => item as Record<string, unknown>)
    .map((item) => ({
      id: String(item.id || '').trim(),
      type: String(item.type || '').trim(),
      value: String(item.value || '').trim(),
      sourceId: String(item.sourceId || '').trim(),
      ...(item.sourceText ? { sourceText: String(item.sourceText).trim() } : {}),
      ...(item.citationId ? { citationId: String(item.citationId).trim() } : {}),
      ...(item.blockId ? { blockId: String(item.blockId).trim() } : {}),
    }))
    .filter((item) => item.id && item.type && item.value && item.sourceId);
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.map((item) => String(item || '').trim()).filter(Boolean)));
}

function isArticlePressureRequired(value: unknown): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return record.required === true
    || Array.isArray(record.contradictions)
    || Array.isArray(record.unresolved_tensions)
    || Array.isArray(record.unresolvedTensions)
    || Array.isArray(record.pressure_vectors)
    || Array.isArray(record.pressureVectors)
    || Array.isArray(record.judgment_candidates)
    || Array.isArray(record.judgmentCandidates);
}

function normalizeNarrativePressureViolations<T extends { severity?: string }>(
  violations: T[],
  required: boolean,
): T[] {
  if (required) return violations;
  return violations.map((item) => (
    item.severity === 'block'
      ? { ...item, severity: 'warn' }
      : item
  ));
}

function rejectLegacyArticleRepairInput(value: unknown): void {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return;
  }
  const mode = String((value as Record<string, unknown>).mode || 'none');
  if (mode === 'dryRun' || mode === 'applySafe') {
    throw new Error('article AST repair is disabled: AST is semantic topology, not prose repair');
  }
}

async function generateArticleBodyWithModel(input: {
  topic: string;
  target: string;
  context: RuntimeArticleContext;
  plan: ReturnType<typeof buildRuntimeArticlePlan>;
  materialPack?: Record<string, any>;
  writingBrief?: Record<string, any>;
  paragraphBlueprint?: Record<string, any>;
  runtimeDraftBody: string;
  runtimeDraftAst?: Record<string, any>;
  acceptanceContract?: Record<string, any>;
  sourcePassages?: Array<Record<string, any>>;
  partBodies?: string[];
  factClaims?: Array<{ text?: string; atomIds?: string[]; inference?: boolean }>;
  model?: string;
  settings?: Record<string, any>;
  deps: ContentRuntimeDeps;
}) {
  const acceptancePolicy = input.acceptanceContract && typeof input.acceptanceContract === 'object'
    ? input.acceptanceContract.policy && typeof input.acceptanceContract.policy === 'object'
      ? input.acceptanceContract.policy as Record<string, any>
      : {}
    : {};
  const requiredCases = Array.isArray(input.acceptanceContract?.globalRequiredCases)
    ? input.acceptanceContract.globalRequiredCases.map(String).filter(Boolean)
    : [];
  const bannedTerms = Array.isArray(acceptancePolicy.bannedTerms)
    ? acceptancePolicy.bannedTerms.map(String).filter(Boolean)
    : [];
  const bannedPunctuation = Array.isArray(acceptancePolicy.bannedPunctuation)
    ? acceptancePolicy.bannedPunctuation.map(String).filter(Boolean)
    : [];
  const factBoundaryStrict = Boolean(acceptancePolicy.factBoundaryStrict);
  const forbidInlineSourceCitations = acceptancePolicy.forbidInlineSourceCitations !== false;
  const factBoundaryAtoms = Array.isArray(acceptancePolicy.factBoundaryAtoms)
    ? acceptancePolicy.factBoundaryAtoms
    : [];
  const targetWordCount = normalizeArticleRequestedTargetChars({
    plan: input.plan,
    acceptanceContract: input.acceptanceContract,
  });
  const configuredRewriteFeedbackMaxAttempts = input.settings?.rewriteFeedbackMaxAttempts ?? input.settings?.rewrite_feedback_max_attempts;
  const rewriteFeedbackMaxAttempts = Math.max(0, Math.min(3, Number(
    configuredRewriteFeedbackMaxAttempts ?? (factBoundaryStrict ? 2 : 1),
  ) || 0));
  const paragraphPlan = buildArticleParagraphPlan(targetWordCount);
  const claimBudgetPrompt = renderClaimBudgetPrompt(input.writingBrief?.claimBudget as Record<string, any> | undefined);
  const paragraphBlueprintPrompt = renderParagraphBlueprintPrompt(input.paragraphBlueprint);
  const sourcePassagePrompt = buildSourcePassagePrompt(input.sourcePassages || []);
  const semanticMaterialPrompt = buildSemanticMaterialPrompt(input.context.semantic.units);
  const evidencePackPrompt = buildEvidencePackPrompt(input.context.evidence.pack);
  const filteredEvidencePrompt = buildFilteredEvidencePrompt(input.materialPack);
  const groundedOpeningContract = buildGroundedOpeningContractPrompt({
    topic: input.topic,
    sourcePassages: input.sourcePassages || [],
    materialPack: input.materialPack,
    context: input.context,
  });
  const stylePackPrompt = buildStylePackPrompt(input.context.stylePack.pack);
  const surfaceSyntaxContract = buildArticleSurfaceSyntaxContractPrompt();
  const argumentDigestPrompt = renderArgumentDigestPrompt(input.materialPack?.argumentDigest);
  const authorProfile = input.context.styleContract.authorProfile;
  const isArticleCommentary = ['article', 'article_draft', 'commentary', 'obsidian-video-script', 'draft']
    .includes(String(input.target || '').trim()) || String(input.acceptanceContract?.taskType || '').trim() === 'commentary';
  const techniqueById = new Map(input.context.styleContract.writingTechniques.map((item) => [item.id, item]));
  const authorTechniquePlan = input.context.styleContract.authorTechniques
    .slice()
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 10)
    .map((item, index) => {
      const technique = techniqueById.get(item.techniqueId);
      const name = technique?.name || item.techniqueId;
      const instruction = technique?.promptInstruction || '';
      const qualityCheck = technique?.qualityCheck || '';
      return isArticleCommentary
        ? [
          `${index + 1}. ${name}`,
          `权重 ${item.weight}`,
          item.trigger ? `触发条件 ${item.trigger}` : '',
          item.constraint ? `约束 ${item.constraint}` : '',
        ].filter(Boolean).join('。')
        : [
        `${index + 1}. ${name}`,
        item.trigger ? `触发 ${item.trigger}` : '',
        item.constraint ? `约束 ${item.constraint}` : '',
        instruction ? `写法 ${instruction}` : '',
        qualityCheck ? `验收 ${qualityCheck}` : '',
      ].filter(Boolean).join('。');
    })
    .join('\n') || '无';
  const writerLiterarySourceBlock = isArticleCommentary
    ? '事实评论模式下，文献和训练来源已从 Writer 事实上下文隔离。这里只保留风格规则，不展开原文、对象、情节、人物、动物、器物、历史口号或场面。'
    : joinAvailablePromptBlocks(sourcePassagePrompt.literary, semanticMaterialPrompt.literary);
  const writerTheorySourceBlock = isArticleCommentary
    ? '事实评论模式下，理论材料不作为可写对象直接进入正文。理论只允许通过 BriefComposer 和 ArgumentDigest 变成论证职责，不展开原文。'
    : joinAvailablePromptBlocks(sourcePassagePrompt.theories, semanticMaterialPrompt.theories);
  const writerComparisonSourceBlock = isArticleCommentary
    ? '事实评论模式下，对照材料不作为正文事实直接进入 Writer。对照只允许通过段落职责影响判断，不展开历史对象、旧称、人物或场面。'
    : joinAvailablePromptBlocks(sourcePassagePrompt.comparisons, semanticMaterialPrompt.comparisons);
  const writerObserverSourceBlock = isArticleCommentary
    ? '事实评论模式下，观察材料不直接展开给 Writer。可写事实只来自 FactPack、Typed Fact Atoms 和 EvidencePack chunks。'
    : joinAvailablePromptBlocks(sourcePassagePrompt.observers, semanticMaterialPrompt.observers);
  const writerFactMaterialBlock = isArticleCommentary
    ? sourcePassagePrompt.facts
    : joinAvailablePromptBlocks(sourcePassagePrompt.facts, semanticMaterialPrompt.facts);
  const writerContextIsolationPrompt = isArticleCommentary
    ? sanitizePromptSurfaceText(JSON.stringify({
      version: 'writer-context-isolation.v1',
      mode: 'fact_commentary',
      allowedWriterInputs: [
        'fact_pack',
        'typed_fact_atoms',
        'claim_budget',
        'paragraph_blueprint',
        'author_contract_rules',
      ],
      hiddenRawInputs: [
        'style_source_raw',
        'training_examples',
        'literary_sources',
        'historical_fragments',
        'memory_items',
        'semantic_units_raw',
      ],
      rule: 'Writer 只能看到事实包和编译后的作者规则。风格来源只保留句法、节奏、抽象度、比喻边界，不提供可写对象、场面、人物、跨域意象、历史口号或原句。',
    }, null, 2))
    : '非事实评论模式仍按对应文体暴露必要上下文。';
  const articleTechniqueBoundary = isArticleCommentary
    ? [
      '本文是事实评论和理论说明，不是小说。',
      '可以使用具体物象、制度残片、数据、场面入口和有限动作来承载判断，但不要写成剧情推进或人物内心戏。',
      '作者技法只能转化为论证节奏、事实边界、概念推进、材料并置和结论收束。',
    ].join('\n')
    : '';
  const hardQualityRules = input.context.styleContract.qualityRules
    .filter((item) => item.severity === 'block')
    .slice(0, 16)
    .map((item, index) => `${index + 1}. ${sanitizePromptSurfaceText(item.ruleText)}${item.checkHint ? `。${sanitizePromptSurfaceText(item.checkHint)}` : ''}`)
    .join('\n') || '无';
  const sourceMaterialBoundaries = input.context.styleContract.sourceMaterials.length
    ? sanitizePromptSurfaceText('DataBase 创作合同含参考文献库。它只限定风格、语域、引用合法性和资料使用边界，不是本次正文事实材料；不得把其中标题、人物、事件、文件、数字、旧历史称谓、动物行为或训练集意象写进正文。')
    : '无';
  const memoryContextBoundaries = isArticleCommentary
    ? '事实评论模式下，记忆上下文只提供作者合同和禁令边界，不提供正文事实，不得把记忆中的人物、历史事件、动物行为、器物、口号、旧称或意象写进正文。'
    : input.context.memory.items
    .slice(0, 8)
    .map((item, index) => sanitizePromptSurfaceText(`${index + 1}. ${item.title}。${item.summary}`))
    .join('\n') || '无';
  const literatureContextBoundaries = isArticleCommentary
    ? '事实评论模式下，文献上下文只允许影响句法节奏和段落推进，不提供正文对象。禁止写入文献中的作品名、人物、历史称谓、跨域意象、器物、场面、口号和叙事情节。'
    : input.context.literature.items
    .slice(0, 8)
    .map((item, index) => {
      const identity = [item.author, item.title].filter(Boolean).join(' ');
      return [
        `${index + 1}. ${identity}`,
        item.category ? `类别 ${item.category}` : '',
        item.summary ? `摘要 ${item.summary}` : '',
        item.content ? `原文材料 ${item.content}` : '',
        item.originalSource ? `来源 ${item.originalSource}` : '',
        item.tags?.length ? `标签 ${item.tags.join('、')}` : '',
      ].filter(Boolean).join('。');
    })
    .map((item) => sanitizePromptSurfaceText(item))
    .join('\n') || '无';
  const learningContextBoundaries = [
    input.context.learning.activeSource ? sanitizePromptSurfaceText(`active 词库来源：${input.context.learning.activeSource}`) : '',
    input.context.learning.promotionRule ? sanitizePromptSurfaceText(`候选晋升规则：${input.context.learning.promotionRule}`) : '',
    input.context.learning.events.length ? sanitizePromptSurfaceText(`学习事件：${input.context.learning.events.join('。')}`) : '',
  ].filter(Boolean).join('\n') || '无';
  const authorModel = input.plan.authorModel;
  const authorialConstitution = input.plan.authorialConstitution;
  const promptCandidateTerms = uniqueStrings(toStringList(input.writingBrief?.lexicalPolicy?.candidateTerms).length
    ? toStringList(input.writingBrief?.lexicalPolicy?.candidateTerms)
    : getRuntimeArticlePlanSections(input.plan).flatMap((section) => section.requiredTerms || []));
  const safeProcessPlan = input.writingBrief?.structurePolicy?.processPlan || input.plan.processPlan;
  const safeNarrativeProtocol = input.writingBrief?.structurePolicy?.narrativeProtocol || input.plan.narrativeProtocol;
  const safeReferenceWeave = input.writingBrief?.structurePolicy?.referenceWeave || input.plan.referenceWeave;
  const authorModelPrompt = sanitizePromptSurfaceText([
    `版本：${authorModel.version}`,
    `来源：${authorModel.source}`,
    `状态：${authorModel.status}`,
    `画像：${authorModel.profileId || '无'}`,
    `立场：${authorModel.stance || '无'}`,
    `声音：${authorModel.voice.join('、') || '无'}`,
    `叙事技法：${authorModel.narrativeTechniques.join('、') || '无'}`,
    `偏好词域：${authorModel.preferredDiction.join('、') || '无'}`,
    `拒绝词域：${authorModel.rejectedDiction.join('、') || '无'}`,
    `质量准绳：${authorModel.qualityNorthStar || '无'}`,
    `执行规则：${authorModel.executionRules.join('。') || '无'}`,
    `验收信号：${authorModel.acceptanceSignals.join('。') || '无'}`,
    `技法计划：${authorModel.techniquePlan.map((item, index) => [
      `${index + 1}. ${item.name}`,
      `权重 ${item.weight}`,
      item.priority ? `优先级 ${item.priority}` : '',
      item.layer ? `层级 ${item.layer}` : '',
      item.trigger ? `触发 ${item.trigger}` : '',
      item.constraint ? `约束 ${item.constraint}` : '',
      item.promptInstruction ? `写法 ${item.promptInstruction}` : '',
      item.qualityCheck ? `验收 ${item.qualityCheck}` : '',
    ].filter(Boolean).join('。')).join('\n') || '无'}`,
  ].join('\n'));
  const authorialConstitutionPrompt = sanitizePromptSurfaceText([
    `版本：${authorialConstitution.version}`,
    `来源：${authorialConstitution.source}`,
    `核心法律：${authorialConstitution.coreLaw}`,
    `不能做：${authorialConstitution.cannotDo.join('、') || '无'}`,
    `阻断项：${authorialConstitution.blockers.join('、') || '无'}`,
  ].join('\n'));
  const processPlan = safeProcessPlan as typeof input.plan.processPlan;
  const processPlanPrompt = sanitizePromptSurfaceText([
    `版本：${processPlan.version}`,
    `系列：${processPlan.series || '无'}`,
    `分期：${processPlan.episode || '无'}`,
    `时间边界：${processPlan.timeBoundary || '无'}`,
    `视角边界：${processPlan.viewpointBoundary || '无'}`,
    `知情边界：${processPlan.knowledgeBoundary || '无'}`,
    `开篇入口：${processPlan.sceneEntrances.join('。') || '无'}`,
    `事件序列：${processPlan.eventSequence.join('。') || '无'}`,
    `叙事推进：${processPlan.narrativeMoves.join('。') || '无'}`,
    `意象母题：${processPlan.imageMotifs.join('。') || '无'}`,
    `节奏规则：${processPlan.pacingRules.join('。') || '无'}`,
    `遣词规则：${processPlan.dictionRules.join('。') || '无'}`,
    `禁止动作：${processPlan.forbiddenMoves.join('。') || '无'}`,
    `收束钩子：${processPlan.endingHook || '无'}`,
  ].join('\n'));
  const narrativeProtocol = safeNarrativeProtocol as typeof input.plan.narrativeProtocol;
  const referenceWeave = safeReferenceWeave as typeof input.plan.referenceWeave;
  const narrativeProtocolPrompt = sanitizePromptSurfaceText([
    `版本：${narrativeProtocol.version}`,
    `必需：${narrativeProtocol.required ? '是' : '否'}`,
    `视角模式：${narrativeProtocol.perspective.mode || '无'}`,
    `视角别名：${articlePerspectiveAlias(narrativeProtocol.perspective.mode) || '无'}`,
    `视角规则：${narrativeProtocol.perspective.rules.join('。') || '无'}`,
    `视角禁令：${narrativeProtocol.perspective.prohibitions.join('。') || '无'}`,
    `思想底色：${narrativeProtocol.ideologicalBlend.map((item) => [
      item.name,
      item.ratio == null ? '' : `${item.ratio}%`,
      item.keywords.length ? item.keywords.join('、') : '',
    ].filter(Boolean).join(' ')).join('。') || '无'}`,
    `动机链：${narrativeProtocol.characterMotivationEngine.join(' -> ') || '无'}`,
    `叙事目标：${narrativeProtocol.narrativeGoal || '无'}`,
    `叙事技法：${narrativeProtocol.narrativeDevices.join('。') || '无'}`,
    `说服策略：${narrativeProtocol.persuasionStrategy.join('。') || '无'}`,
    `反讽生成：${narrativeProtocol.ironyMethods.join('。') || '无'}`,
    `开端逻辑：${narrativeProtocol.structureLogic.opening || '无'}`,
    `主体逻辑：${narrativeProtocol.structureLogic.development || '无'}`,
    `结尾逻辑：${narrativeProtocol.structureLogic.ending || '无'}`,
    `词汇来源：${narrativeProtocol.lexicalSystem.prioritySource || '无'}`,
    `优先词汇：${narrativeProtocol.lexicalSystem.preferredVocabulary.join('、') || '无'}`,
    `语境词汇：${narrativeProtocol.lexicalSystem.contextualVocabulary.map((item) => [
      item.term,
      item.meaning ? `义项 ${item.meaning}` : '',
      item.register ? `语域 ${item.register}` : '',
      item.allowedContexts.length ? `可用 ${item.allowedContexts.join('、')}` : '',
      item.forbiddenContexts.length ? `禁用 ${item.forbiddenContexts.join('、')}` : '',
      item.guidance ? `用法 ${item.guidance}` : '',
    ].filter(Boolean).join(' ')).join('。') || '无'}`,
    `词汇规则：${narrativeProtocol.lexicalSystem.contextualRules.join('。') || '无'}`,
    `协议禁用词：${narrativeProtocol.lexicalSystem.bannedTerms.join('、') || '无'}`,
    `比喻来源：${narrativeProtocol.rhetoricalSystem.metaphorSources.join('、') || '无'}`,
    `比喻风格：${narrativeProtocol.rhetoricalSystem.metaphorStyle || '无'}`,
    `禁用比喻：${narrativeProtocol.rhetoricalSystem.bannedMetaphors.join('、') || '无'}`,
    `引用来源：${narrativeProtocol.sourceUse.quotationSources.length ? '由 DataBase 创作合同约束，只作风格和合法引用边界；本次正文不得自动调用这些来源。' : '无'}`,
    `引用规则：${narrativeProtocol.sourceUse.citationRules.join('。') || '无'}`,
    `核心原则：${narrativeProtocol.corePrinciples.join('。') || '无'}`,
    `格式禁令：${narrativeProtocol.formatProhibitions.join('。') || '无'}`,
  ].join('\n'));
  const referenceWeavePrompt = sanitizePromptSurfaceText([
    `版本：${referenceWeave.version}`,
    `模式：${referenceWeave.mode}`,
    `必需：${referenceWeave.required ? '是' : '否'}`,
    `材料锚点：${referenceWeave.anchors.map((item) => [
      item.kind,
      item.name,
      item.required ? '必用' : '',
      item.sectionHint ? `段落提示 ${item.sectionHint}` : '',
      item.use,
    ].filter(Boolean).join(' ')).join('\n') || '无'}`,
    '段落编织：',
    referenceWeave.sectionPlans.map((item, index) => [
      `${index + 1}. ${item.sectionTitle}`,
      item.anchors.length ? `锚点 ${item.anchors.map((anchor) => `${anchor.kind}:${anchor.name}。${anchor.use}`).join('；')}` : '',
      item.weaveInstruction,
    ].filter(Boolean).join('。')).join('\n') || '无',
  ].join('\n'));
  const bodyBlueprintPrompt = sanitizePromptSurfaceText(buildArticleBodyBlueprintPrompt({
    topic: input.topic,
    plan: input.plan,
    paragraphPlan,
    targetWordCount,
  }));
  const styleContractPrompt = sanitizePromptSurfaceText([
    `协议 ${input.context.styleContract.name || input.context.styleContract.protocolId || '未解析'}`,
    `视角规则 ${input.context.styleContract.perspectiveRule || '无'}`,
    `语气规则 ${input.context.styleContract.toneRule || '无'}`,
    `执行规则 ${input.context.styleContract.executionRule || '无'}`,
    authorProfile ? `作者立场 ${authorProfile.stance || '无'}` : '作者立场 无',
    authorProfile ? `作者声音 ${authorProfile.voice.slice(0, 8).join('、') || '无'}` : '作者声音 无',
    authorProfile ? `叙事手法 ${authorProfile.narrativeTechniques.slice(0, 10).join('、') || '无'}` : '叙事手法 无',
    authorProfile ? `偏好词域 ${authorProfile.preferredDiction.slice(0, 12).join('、') || '无'}` : '偏好词域 无',
    authorProfile ? `拒绝词域 ${authorProfile.rejectedDiction.slice(0, 12).join('、') || '无'}` : '拒绝词域 无',
    authorProfile ? `质量准绳 ${authorProfile.qualityNorthStar || '无'}` : '质量准绳 无',
  ].join('\n'));
  const systemPrompt = [
    '你是 ContentBase 文章生成运行时。',
    '任务是先读本次资料，再综合写出一篇完整中文正文。',
    '正文事实只来自 DataBase EvidencePack，用户材料，语义资料和记忆。',
    '像 NotebookLM 一样处理材料，先理解资料共同指向的问题，再用自己的话成文。',
    '不要展示资料库，不要解释你检索了什么，不要把来源列表写进正文。',
    '不要复写来源标题、报道标题、材料标题或资料段首标签。来源标题只用于定位材料，不是正文句子。',
    '不要把材料逐条排队，不要写成资料摘要，也不要为了覆盖率轮换名词。',
    '作者模型和 StylePack 只影响句法节奏，词汇倾向和段落推进，不允许把作家名，作品名，历史类比对象或来源原句写进正文。',
    '不得写某某式这类风格来源标签。不得把作者训练集、历史材料、风格样本文本里的对象、地点、人物、器物或口号当前景，除非本次 EvidencePack 明确要求。',
    '不得使用伪组织，伪逆，人无分老幼，背后是，新任务这类从历史材料或测试标签泄漏出来的词句。遇到这类材料只保留现实事实关系，不写进正文。',
    '不得把作者训练语料或历史材料里的对象、人物、地名、器物、口号和意象写进正文。正文只能围绕本次 FactPack 和 Typed Fact Atom 明示的对象、事件、关系和后果展开。',
    '本次资料里如果出现定义翻转句、对照句或冒号解释，必须只吸收关系，不得复制句法。',
    '正文可以有判断，有化用，有例子，但例子必须服务论点。例子只能使用本次 FactPack 已命名的材料对象、现实动作和后果关系。',
    '不要让语言先于判断。先写本次资料中已经命名的对象、事件、概念和关系，再让判断从材料里长出来。',
    '句法硬禁令：定义翻转、对照骨架、工具链说明句都不能出现在正文。',
    '第一段必须从本次资料包明示对象起笔，不得自造某人递材料、短信、公示名单、办公室、冷茶、铅笔字、工作人员话语或未给出的组合案例。',
    '不要自造默认场面、默认人物、默认器物、默认文件、默认电话和后台记录，除非本次资料明确出现。',
    '严格事实边界禁止现场小说化。不得写资料未明示的人物动作、器物细节、动物类比、历史遗存、宣传口号、企业反应、操作记录、设备状态、调度细节、现场画面或现场对白，除非本次 Typed Fact Atom 逐字给出。',
    'Authorial Constitution 只作为负约束边界，不提供本体字段，不替代资料判断。',
    '创作合同参考来源不是本次事实材料。只有本次资料包里出现的材料才可以进入事实判断。',
    '正文必须是完整文章，禁止写成提纲，列表，报告，内部流程或系统解释。',
    factBoundaryStrict
      ? '严格事实边界开启时，输出只能是一个 JSON 对象。JSON 外不得有任何解释、Markdown、标题、来源编号或内部字段。'
      : '输出只要正文，不要标题，小标题，Markdown 标记，JSON，来源编号或内部字段。',
    '正文禁用中文冒号、破折号、小括号、英文括号和双连字符。需要解释时拆成短句，用逗号或句号自然承接。',
    '正文禁用定义翻转句、对照句和解释性翻译腔。改成先写具体动作，再写一个短判断。',
    '每段避免抽象定义开头，不要用本质判断词，结构判断词，形成判断词，运行判断词领句。',
    '具体事实权限规则：地点、机构、人物、时间、数字、事件、现场动作、供应链节点、价格、比例和文件名，只有能绑定 Typed Fact Atom 时才可以作为正文事实出现。',
    '段落事实权限规则：每一段只能使用 paragraphBlueprint 为该段分配的 allowedAtoms。其他 atom 可以影响全篇理解，但不得在该段写成具体事实。',
    '不能绑定 Typed Fact Atom 的内容只能写成概括判断，例如影响会落到成本、预期、行动空间和现实约束，不得写成具体地点、公司、设备、时间、倍率或现场动作。',
    '严格事实边界下宁可少写具体细节，也不能补现场。材料里没有逐字出现的实体状态、企业反应、家庭动作、市场报价、机构操作、停留时长和百分比，一律不要写。',
    '不得直接复写联网材料句子。联网来源只提供事实关系，必须改成自己的判断句。不得连续保留来源标题、摘要或正文里的十个以上连续汉字。',
    factBoundaryStrict
      ? '本次采用事实评论模式，不采用现场特写模式。不要写资料未明示的人物、家庭、企业、设备、文件、交易、现场物件或工作对白。只用 Typed Fact Atom 里的对象、动作、约束、后果和可核验关系推进。'
      : '',
    '资料标题、来源名和报道日期不得作为段落开头。段落开头必须是文章自己的判断入口，不是来源索引。',
    surfaceSyntaxContract,
    groundedOpeningContract,
      `目标长度：至少 ${targetWordCount} 个中文字符。低于该长度会被验收判为正文不完整。正文必须充分展开，不得压缩成短评。`,
      `正文段落：至少 ${paragraphPlan.paragraphCount} 个自然段。每段连续成段，不要一句一换行。每段至少 ${paragraphPlan.minParagraphChars} 个中文字符，必须有起承转合和明确收束。`,
    '实际交稿必须明显超过最低验收线。不要写到刚好达标，至少写到两千三百个中文字符以上，避免清洗后变短。',
    '每个自然段至少写够四句，句子之间自然承接。',
    '每段采用材料对象句、后果句、短判断的顺序。材料对象句必须点出资料包中已经命名的对象、事件或概念。后果句写位置差异。短判断只用一句收束。',
    '结尾必须完成判断，不要断尾或停在问题句。',
    '优先词和候选词只在语义合拍时使用，不要硬塞。',
    forbidInlineSourceCitations
      ? '正文不得写 [S01] [S34] 这类可见来源编号。来源编号只进入文末来源列表或 DataBase reference usage report，不进入正文段落。'
      : '',
    '可核验事实必须来自资料，缺材料时写概念判断，不要编造文件，流程，数字，机构和现场细节。',
    '正文禁用词包括闭环，机制，结构性，通过。需要表达时分别改成连续传导，安排，深层，经由。',
    '正文不要写三日，五日，二十日这类精确日期。资料未要求绑定时全部改成当日，此后，多日，一段时间。',
    factBoundaryStrict
      ? '严格事实边界开启。输出必须是 JSON 对象，且只包含 body 和 factClaims。factClaims 必须覆盖正文中每一条具体事实，每项包含 text、atomIds、inference。atomIds 只能使用下方 Typed Fact Atoms 的 id。正文里如果出现 factClaims 没有覆盖的数字、时间、地点、机构、人物、事件、市场动作、实体动作或现场动作，稿件会失败。概括判断可标记 inference true，但不得加入新地点、新机构、新数字或新现场动作。'
      : '',
    factBoundaryStrict
      ? 'factClaims 每项还必须包含 paragraphIndex，从零开始，对应正文自然段。某段 claim 只能引用该段 paragraphBlueprint.allowedAtoms 中的 atomId。'
      : '',
    factBoundaryStrict
      ? '推荐输出结构为 {"paragraphs":[{"paragraphIndex":0,"body":"本段正文","factClaims":[{"text":"本段具体事实","atomIds":["fact_atom_1"],"inference":false}]}]}。每个 paragraphs 项只写一个自然段，factClaims 只绑定本段 allowedAtoms。'
      : '',
    factBoundaryStrict
      ? '严格模式不接受顶层 factClaims。不要输出 {"body":...,"factClaims":[...]}。必须输出 paragraphs 数组，并把每段 factClaims 放在对应 paragraphs 项里。'
      : '',
    factBoundaryStrict
      ? '如果某段没有可绑定 allowedAtoms，只能写概括判断，不能写数字、时间、地点、机构、人物、船舶、公司、价格、库存、费率、航程、天数或现场动作。'
      : '',
    '先把正文写满，再考虑收束，不要提前收口。',
    factBoundaryStrict
      ? '严格事实边界开启时，只输出 JSON 对象，不要输出 Markdown。JSON 必须包含 paragraphs 数组，或包含 body 和 factClaims。优先使用 paragraphs 数组。每段正文与本段 factClaims 必须同项出现。'
      : '只输出正文 Markdown，不要输出 JSON。',
  ].join('\n');
  const userPrompt = [
    `主题 ${input.topic}`,
    `目标 ${input.target}`,
    '',
    '检索计划',
    renderPromptJson((input.context as any).retrievalPlan || input.writingBrief?.retrievalPlan || {}),
    '',
    '文章计划摘要',
    renderArticlePlanPromptSummary(input.plan),
    '',
    '写作简报',
    renderWritingBriefPromptSummary(input.writingBrief),
    '',
    '文章流程规划',
    processPlanPrompt,
    '',
    '叙事协议',
    narrativeProtocolPrompt,
    '',
    '引用编织计划',
    referenceWeavePrompt,
    '',
    '正文骨架',
    bodyBlueprintPrompt,
    '',
    'Claim Budget',
    claimBudgetPrompt,
    '',
    'Paragraph Blueprint',
    paragraphBlueprintPrompt,
    '',
    '资料对象开口合同',
    groundedOpeningContract,
    '',
    '正文表面句法合同',
    surfaceSyntaxContract,
    '',
    '资料摘要',
    renderMaterialPackPromptSummary(input.materialPack),
    '',
    '写作倾向',
    renderWritingBriefPromptSummary(input.writingBrief),
    '',
    '材料消化与主论证线',
    argumentDigestPrompt,
    '',
    'DataBase 创作合同',
    styleContractPrompt,
    '',
    'DataBase 作者技法计划',
    authorTechniquePlan,
    articleTechniqueBoundary,
    '',
    'DataBase 创作硬规则',
    hardQualityRules,
    '',
    'DataBase 创作合同参考边界',
    sourceMaterialBoundaries,
    '',
    'DataBase StylePack 句法参考',
    stylePackPrompt.profiles,
    '',
    'DataBase StylePack 写法约束',
    stylePackPrompt.constraints,
    '',
    'Writer Context 隔离合同',
    writerContextIsolationPrompt,
    '',
    'DataBase 事实材料',
    writerFactMaterialBlock,
    'DataBase 理论来源',
    writerTheorySourceBlock,
    'DataBase 对照材料',
    writerComparisonSourceBlock,
    'DataBase 观察来源',
    writerObserverSourceBlock,
    'DataBase 文献来源',
    writerLiterarySourceBlock,
    '',
    'EvidencePack sources',
    filteredEvidencePrompt.sources,
    '',
    'EvidencePack chunks',
    filteredEvidencePrompt.chunks,
    '',
    'EvidencePack citations',
    filteredEvidencePrompt.citations,
    '',
    'EvidencePack queryRun',
    evidencePackPrompt.queryRun,
    '',
    'EvidencePack screening',
    evidencePackPrompt.screening,
    '',
    'EvidencePack 约束',
    evidencePackPrompt.constraints,
    '',
    ...(isArticleCommentary ? [
      'Context Compiler 隐藏项',
      '记忆、文献、学习事件和语义单元原文不进入 Writer。它们只能经 AuthorContract、ArgumentDigest、ClaimBudget 或 EvidencePack 投影后影响正文。',
      '',
    ] : [
      'DataBase 记忆上下文',
      memoryContextBoundaries,
      '',
      'DataBase 文献上下文',
      literatureContextBoundaries,
      '',
      'DataBase 学习边界',
      learningContextBoundaries,
      '',
    ]),
    '正文要求',
    sanitizePromptSurfaceText(`候选词库 ${promptCandidateTerms.slice(0, 20).join('、') || '无'}。只在语义和语域匹配时使用，不要求逐项出现。`),
    '材料只为论点服务，不在正文里声明材料来源。',
    '禁止把来源机构、报道标题、资料标题或文档标题写成正文标签。可以化用事实，不能展示来源。',
    '写出完整自然段，不要标题，不要列表，不要来源编号。',
    '用普通中文表达运作，结构，规则，沉默，牵扯和积累。不要写抽象套语和技术黑话。',
    sanitizePromptSurfaceText(`必须出现 ${requiredCases.join('、') || '无'}`),
    forbidInlineSourceCitations ? '引用编号：正文禁止出现来源编号。引用、记忆、文献、学习来源只能在结构化引用报告或文末来源列表中标注。' : '',
    factBoundaryStrict ? `Typed Fact Atoms：${JSON.stringify(factBoundaryAtoms, null, 2)}` : '',
    factBoundaryStrict ? '正文每使用一条可核验事实，必须在 factClaims 中用 atomIds 绑定上面的 typed fact atom。不得声明未列出的 atom。推论不绑定事实时必须只写概念判断，不得加入新的可核验对象。factClaims 不是正文，不会展示给读者，但它决定正文能否出厂。先写每段 claim budget 能支撑的事实，再按 paragraphBlueprint 写该段正文，不要先写正文再事后挑事实声明。' : '',
    factBoundaryStrict ? '结构化输出合同：请输出 {"paragraphs":[...]}。paragraphs 的顺序必须等于 Paragraph Blueprint。每个 item 必须有 paragraphIndex、body、factClaims。body 是单个自然段。factClaims 只声明该段 body 里出现的可核验事实。' : '',
    factBoundaryStrict ? '段落预算硬约束：任何段落如果要写具体事实，必须能在该段 allowedAtoms 中找到对应 atomId。不能把别段 atom 搬到本段。不能用一条全局 factClaims 覆盖全文。' : '',
    factBoundaryStrict ? '禁止旧格式：不要返回顶层 factClaims。每条 factClaims 都必须跟随自己的段落 item，并且 paragraphIndex 必须等于该段 index。' : '',
    '',
    ...(isArticleCommentary ? [] : [
      '语义上下文',
      input.context.semantic.units.slice(0, 8).map((unit, index) => sanitizePromptSurfaceText(`${index + 1}. ${unit.summary || unit.excerpt}`)).join('\n') || '无',
      '',
    ]),
    '证据片段',
    input.context.evidence.items.slice(0, 8).map((item, index) => sanitizePromptSurfaceText(`${index + 1}. ${item.excerpt}`)).join('\n') || '无',
    '',
    '唯一可用事实',
    sourcePassagePrompt.factBoundary,
    '',
    factBoundaryStrict
      ? '请严格按 Paragraph Blueprint 的段落顺序扩写为完整文章正文，并返回 JSON。优先返回 paragraphs 数组。不要在段落 body 中写标题、小标题、列表或 JSON 语法。'
      : '请写成完整文章正文。不要写标题、小标题、列表或分节。不要一句一行。每个自然段都必须推进判断，不要只复述材料。',
  ].join('\n');
  const requestedTemperature = Number((input as any).settings?.temperature);
  const temperature = Number.isFinite(requestedTemperature) ? requestedTemperature : 0.2;
  const requestedMaxTokens = Number(input.settings?.maxTokens || input.settings?.max_tokens || 0);
  const maxTokens = normalizeArticleModelMaxTokens({
    requestedMaxTokens,
    targetWordCount,
  });
  const styleGuard = buildRestrictedStyleForegroundGuard({
    stylePack: input.context.stylePack,
    materialPack: input.materialPack,
  });

  if (input.deps.invokeArticleModel) {
    const initialResult = await input.deps.invokeArticleModel({
      systemPrompt,
      userPrompt,
      model: input.model,
      temperature,
      maxTokens,
    });
    let finalResult = initialResult;
    let parsed = parseArticleModelOutput(finalResult.text, factBoundaryStrict);
    let acceptedBody = normalizeGeneratedArticleBody(parsed.body);
    const rewriteFeedbacks: Array<ReturnType<typeof buildArticleModelRewriteFeedback>> = [];
    for (let attempt = 0; attempt < rewriteFeedbackMaxAttempts; attempt += 1) {
      const retryFeedback = buildArticleModelRewriteFeedback({
        body: acceptedBody,
        acceptanceContract: input.acceptanceContract,
        targetWordCount,
        topic: input.topic,
        plan: input.plan,
        context: input.context,
        materialPack: input.materialPack,
        styleGuard,
      });
      if (!retryFeedback) break;
      rewriteFeedbacks.push(retryFeedback);
      const retryResult = await input.deps.invokeArticleModel({
        systemPrompt: retryFeedback.system,
        userPrompt: retryFeedback.user,
        model: input.model,
        temperature: 0.05,
        maxTokens,
      });
      const retryParsed = parseArticleModelOutput(retryResult.text, factBoundaryStrict);
      const retryBody = finalizeArticleModelBody({ body: retryParsed.body, styleGuard });
      const candidateProblems = inspectArticleRewriteCandidateAgainstContract({
        body: retryBody,
        factClaims: retryParsed.factClaims || parsed.factClaims,
        styleGuard,
        input,
      });
      if (candidateProblems.length) {
        continue;
      }
      finalResult = retryResult;
      parsed = retryParsed;
      acceptedBody = retryBody;
    }
    const surfaced = await runSurfaceBlockerRewritePasses({
      body: acceptedBody,
      parsed,
      rewriteFeedbacks,
      styleGuard,
      invoke: async (feedback) => input.deps.invokeArticleModel!({
        systemPrompt: feedback.system,
        userPrompt: feedback.user,
        model: input.model,
        temperature: 0.05,
        maxTokens,
      }),
      input,
      targetWordCount,
      maxAttempts: rewriteFeedbackMaxAttempts,
    });
    let body = finalizeArticleModelBody({ body: surfaced.body, styleGuard });
    let surfacedParsed = surfaced.parsed;
    let factClaims = surfacedParsed.factClaims || parsed.factClaims;
    const strictWriterProblems = inspectStrictArticleModelStructuredOutput({
      factBoundaryStrict,
      outputParseStatus: surfacedParsed.outputParseStatus,
      factClaims,
      paragraphBlueprint: input.paragraphBlueprint,
    });
    let strictRepairProvider: string | undefined;
    let strictRepairModel: string | undefined;
    let strictRepairFeedback: ReturnType<typeof buildStrictArticleWriterStructuredRepairFeedback> | undefined;
    if (strictWriterProblems.length) {
      const repaired = await runStrictArticleWriterStructuredRepairPass({
        body,
        parsed: surfacedParsed,
        problems: strictWriterProblems,
        systemPrompt,
        userPrompt,
        topic: input.topic,
        target: input.target,
        paragraphBlueprintPrompt,
        factBoundaryAtoms,
        targetWordCount,
        factBoundaryStrict,
        styleGuard,
        invoke: async (feedback) => input.deps.invokeArticleModel!({
          systemPrompt: feedback.system,
          userPrompt: feedback.user,
          model: input.model,
          temperature: 0.03,
          maxTokens,
        }),
      });
      body = repaired.body;
      surfacedParsed = repaired.parsed;
      factClaims = surfacedParsed.factClaims || parsed.factClaims;
      strictRepairProvider = repaired.provider;
      strictRepairModel = repaired.model;
      strictRepairFeedback = repaired.feedback;
    }
    assertStrictArticleModelStructuredOutput({
      factBoundaryStrict,
      outputParseStatus: surfacedParsed.outputParseStatus,
      factClaims,
      paragraphBlueprint: input.paragraphBlueprint,
    });
    const coverage = calculateArticleReferenceCoverage({
      body,
      plan: input.plan,
      context: input.context,
      sourcePassages: input.sourcePassages,
    });
    return {
      text: body,
      factClaims,
      outputParseStatus: surfacedParsed.outputParseStatus,
      provider: strictRepairProvider || finalResult.provider,
      model: strictRepairModel || finalResult.model || input.model,
      referenceCoverage: coverage,
      basePrompt: userPrompt,
      systemPrompt,
      rewriteFeedback: [
        ...surfaced.rewriteFeedbacks.filter(Boolean),
        strictRepairFeedback,
      ].filter(Boolean),
    };
  }

  const text = await invokeContentCraftLlm([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ], {
    temperature,
    model: input.model || resolveContentCraftModel(),
    maxTokens,
  });
  let finalText = text;
  let parsed = parseArticleModelOutput(finalText, factBoundaryStrict);
  let acceptedBody = normalizeGeneratedArticleBody(parsed.body);
  const rewriteFeedbacks: Array<ReturnType<typeof buildArticleModelRewriteFeedback>> = [];
  for (let attempt = 0; attempt < rewriteFeedbackMaxAttempts; attempt += 1) {
    const retryFeedback = buildArticleModelRewriteFeedback({
      body: acceptedBody,
      acceptanceContract: input.acceptanceContract,
      targetWordCount,
      topic: input.topic,
      plan: input.plan,
      context: input.context,
      materialPack: input.materialPack,
      styleGuard,
    });
    if (!retryFeedback) break;
    rewriteFeedbacks.push(retryFeedback);
    const retryText = await invokeContentCraftLlm([
      { role: 'system', content: retryFeedback.system },
      { role: 'user', content: retryFeedback.user },
    ], {
      temperature: 0.05,
      model: input.model || resolveContentCraftModel(),
      maxTokens,
    });
    const retryParsed = parseArticleModelOutput(retryText, factBoundaryStrict);
    const retryBody = finalizeArticleModelBody({ body: retryParsed.body, styleGuard });
    const candidateProblems = inspectArticleRewriteCandidateAgainstContract({
      body: retryBody,
      factClaims: retryParsed.factClaims || parsed.factClaims,
      styleGuard,
      input,
    });
    if (candidateProblems.length) {
      continue;
    }
    finalText = retryText;
    parsed = retryParsed;
    acceptedBody = retryBody;
  }
  const surfaced = await runSurfaceBlockerRewritePasses({
    body: acceptedBody,
    parsed,
    rewriteFeedbacks,
    styleGuard,
    invoke: async (feedback) => {
      const retryText = await invokeContentCraftLlm([
        { role: 'system', content: feedback.system },
        { role: 'user', content: feedback.user },
      ], {
        temperature: 0.05,
        model: input.model || resolveContentCraftModel(),
        maxTokens,
      });
      return { text: retryText, provider: getLastInvokeMeta()?.provider, model: getLastInvokeMeta()?.model || input.model };
    },
    input,
    targetWordCount,
    maxAttempts: rewriteFeedbackMaxAttempts,
  });
  const meta = getLastInvokeMeta();
  let body = finalizeArticleModelBody({ body: surfaced.body, styleGuard });
  let surfacedParsed = surfaced.parsed;
  let factClaims = surfacedParsed.factClaims || parsed.factClaims;
  const strictWriterProblems = inspectStrictArticleModelStructuredOutput({
    factBoundaryStrict,
    outputParseStatus: surfacedParsed.outputParseStatus,
    factClaims,
    paragraphBlueprint: input.paragraphBlueprint,
  });
  let strictRepairMeta: { provider?: string; model?: string } | undefined;
  let strictRepairFeedback: ReturnType<typeof buildStrictArticleWriterStructuredRepairFeedback> | undefined;
  if (strictWriterProblems.length) {
    const repaired = await runStrictArticleWriterStructuredRepairPass({
      body,
      parsed: surfacedParsed,
      problems: strictWriterProblems,
      systemPrompt,
      userPrompt,
      topic: input.topic,
      target: input.target,
      paragraphBlueprintPrompt,
      factBoundaryAtoms,
      targetWordCount,
      factBoundaryStrict,
      styleGuard,
      invoke: async (feedback) => {
        const retryText = await invokeContentCraftLlm([
          { role: 'system', content: feedback.system },
          { role: 'user', content: feedback.user },
        ], {
          temperature: 0.03,
          model: input.model || resolveContentCraftModel(),
          maxTokens,
        });
        return { text: retryText, provider: getLastInvokeMeta()?.provider, model: getLastInvokeMeta()?.model || input.model };
      },
    });
    body = repaired.body;
    surfacedParsed = repaired.parsed;
    factClaims = surfacedParsed.factClaims || parsed.factClaims;
    strictRepairMeta = { provider: repaired.provider, model: repaired.model };
    strictRepairFeedback = repaired.feedback;
  }
  assertStrictArticleModelStructuredOutput({
    factBoundaryStrict,
    outputParseStatus: surfacedParsed.outputParseStatus,
    factClaims,
    paragraphBlueprint: input.paragraphBlueprint,
  });
  const coverage = calculateArticleReferenceCoverage({
    body,
    plan: input.plan,
    context: input.context,
    sourcePassages: input.sourcePassages,
  });
  return {
    text: body,
    factClaims,
    outputParseStatus: surfacedParsed.outputParseStatus,
    provider: strictRepairMeta?.provider || meta?.provider,
    model: strictRepairMeta?.model || meta?.model || input.model,
    referenceCoverage: coverage,
    basePrompt: userPrompt,
    systemPrompt,
    rewriteFeedback: [
      ...surfaced.rewriteFeedbacks.filter(Boolean),
      strictRepairFeedback,
    ].filter(Boolean),
  };
}

function shouldRunSurfaceBlockerRewritePasses(input: {
  evaluation: ArticleObservationReport;
  body: string;
  minChars: number;
}): boolean {
  const body = String(input.body || '');
  const nonWhitespaceChars = body.replace(/\s+/g, '').length;
  const paragraphs = splitArticleParagraphs(body);
  const retryableBlockers = input.evaluation.blockers.filter((item) => isWriterRewriteRetryableBlocker(item));
  if (!retryableBlockers.length) {
    return false;
  }
  const nonRetryableBlockers = input.evaluation.blockers.filter((item) => !isWriterRewriteRetryableBlocker(item));
  if (nonRetryableBlockers.length > 0) {
    return false;
  }
  if (nonWhitespaceChars < input.minChars || paragraphs.length < 6 || paragraphs.length > 8) {
    return true;
  }
  return retryableBlockers.length > 0;
}

function isWriterRewriteRetryableBlocker(item: Record<string, any>): boolean {
  const ruleId = String(item.ruleId || '');
  const category = String(item.category || '');
  return /PUNCT|SYNTAX|PROSE-COMPLETENESS|WORDCOUNT|REFERENCE-COVERAGE|FACT-CLAIM-COVERAGE|UNSUPPORTED-SCENE|BANNED-TERM|LEXICON/.test(ruleId)
    || category === 'length'
    || category === 'lexicon'
    || category === 'reference_coverage'
    || category === 'fact_boundary'
    || category === 'prose_completeness'
    || category === 'syntax_ai_tone';
}

function buildArticleLengthCompletionFeedback(input: {
  body: string;
  factClaims?: Array<Record<string, any> | { text?: string; atomIds?: string[]; inference?: boolean; paragraphIndex?: number }>;
  targetWordCount: number;
  minChars: number;
  topic: string;
  plan: ReturnType<typeof buildRuntimeArticlePlan>;
  context: RuntimeArticleContext;
  materialPack?: Record<string, any>;
  acceptanceContract?: Record<string, any>;
  paragraphBlueprint?: Record<string, any>;
}): { system: string; user: string; findings: string[] } {
  const factBoundaryStrict = Boolean(input.acceptanceContract?.policy?.factBoundaryStrict);
  const factBoundaryAtoms = factBoundaryStrict && Array.isArray((input.acceptanceContract?.policy as Record<string, any> | undefined)?.factBoundaryAtoms)
    ? (input.acceptanceContract?.policy as Record<string, any>).factBoundaryAtoms
    : [];
  const materialContract = renderRevisionMaterialContractPrompt(input.materialPack);
  const evidenceAnchors = buildRewriteEvidenceAnchorPrompt(input.context, input.materialPack);
  const currentChars = input.body.replace(/\s+/g, '').length;
  return {
    findings: [`正文篇幅不足，当前约${toChineseNumeral(currentChars)}个中文字符，必须扩展到不少于${toChineseNumeral(input.minChars)}个中文字符。`],
    system: [
      '你是 ContentBase 同一作者补足模型。只做同一篇文章的扩展重写，不得换作者，不得另起文章。',
      factBoundaryStrict
        ? '严格事实边界开启。输出只能是 JSON 对象。优先输出 paragraphs 数组，每个 item 包含 paragraphIndex、body、factClaims。factClaims 每项包含 text、atomIds、inference、paragraphIndex，atomIds 只能使用本段 Paragraph Blueprint 的 allowedAtoms。'
        : '',
      `正文必须不少于${toChineseNumeral(input.minChars)}个中文字符，写成六到八个自然段。`,
      '这不是补写尾巴。必须输出扩展后的整篇正文，短稿只能作为失败样本和论证种子。',
      '每段至少三百个中文字符，至少四句。少于六段或少于目标长度都会被拒绝。',
      '保留原主题和已有判断，但扩展只能来自 Typed Fact Atoms 已明示的影响链、行动约束、利益位置和外溢后果。',
      '禁止为了凑长度新增航程、运费、保险费率、管道运力、库存、港口、船公司动作、军方动作、市场合约或价格波动幅度，除非这些内容逐字存在于 Typed Fact Atoms 并被本段 factClaims 绑定。',
      '不得复制来源标题、报道标题或原文句子。不得新增无证地点、实体、报价、比例、天数和具体动作。',
      '不要输出标题、小标题、列表、解释说明或 Markdown。',
      '最终正文只允许中文汉字、中文逗号、中文句号和自然段换行。',
    ].filter(Boolean).join('\n'),
    user: [
      `主题 ${sanitizePromptSurfaceText(input.topic)}`,
      '',
      '当前短稿',
      sanitizePromptSurfaceText(input.body),
      '',
      '必须补足的资料锚点',
      evidenceAnchors,
      '',
      '材料功能分工和主论证线',
      materialContract,
      '',
      factBoundaryStrict ? 'Paragraph Blueprint' : '',
      factBoundaryStrict ? renderParagraphBlueprintPrompt(input.paragraphBlueprint) : '',
      '',
      factBoundaryStrict ? 'Typed Fact Atoms' : '',
      factBoundaryStrict ? JSON.stringify(factBoundaryAtoms, null, 2) : '',
      factBoundaryStrict ? '输出结构必须为 {"paragraphs":[{"paragraphIndex":0,"body":"单个自然段","factClaims":[{"text":"本段具体事实","atomIds":["fact_atom_1"],"inference":false,"paragraphIndex":0}]}]}。不能绑定本段 allowedAtoms 的内容只能写概括判断。' : '',
      '',
      '请输出扩展后的完整正文，不要只输出新增段落。长度只能靠解释已绑定事实的后果链、限制链和判断链完成，不能靠增加新事实完成。',
    ].filter(Boolean).join('\n'),
  };
}

function buildArticleClaimBudget(input: {
  topic: string;
  target: string;
  plan: ReturnType<typeof buildRuntimeArticlePlan>;
  acceptanceContract?: Record<string, any>;
  materialPack?: Record<string, any>;
}): Record<string, any> {
  const policy = input.acceptanceContract?.policy && typeof input.acceptanceContract.policy === 'object'
    ? input.acceptanceContract.policy as Record<string, any>
    : {};
  const atoms = Array.isArray(policy.factBoundaryAtoms)
    ? policy.factBoundaryAtoms.map((item: any) => ({
      id: String(item.id || '').trim(),
      type: String(item.type || 'source_anchor').trim() || 'source_anchor',
      value: compactPromptText(String(item.value || item.sourceText || ''), 220),
      sourceId: String(item.sourceId || item.citationId || item.blockId || '').trim(),
    })).filter((item) => item.id && item.value)
    : [];
  const paragraphPlan = buildArticleParagraphPlan(Number(input.plan.targetWordCount || 0) || 1800);
  const paragraphCount = Math.max(1, paragraphPlan.paragraphCount);
  const perParagraph = Array.from({ length: paragraphCount }, (_, index) => {
    const primaryAtoms = atoms.length
      ? atoms.filter((_, atomIndex) => atomIndex % paragraphCount === index)
      : [];
    if (!primaryAtoms.length && atoms.length) {
      primaryAtoms.push(atoms[index % atoms.length]);
    }
    const allowed = atoms;
    return {
      paragraphIndex: index,
      requiredAtomIds: primaryAtoms.map((item) => item.id),
      allowedAtoms: allowed,
      maxConcreteClaims: allowed.length,
      rule: '本段必须使用全部 requiredAtomIds 支撑主事实，也可使用本次 typed facts 补充论证。没有 atom 支撑时只写概括判断。',
    };
  });
  return {
    version: 'article-claim-budget.v1',
    topic: input.topic,
    target: input.target,
    strict: Boolean(policy.factBoundaryStrict),
    totalAtoms: atoms.length,
    atoms,
    paragraphCount,
    perParagraph,
    failureRouting: {
      sourceCopy: 'paragraph_writer',
      unsupportedFact: 'claim_budget',
      thinParagraph: 'paragraph_blueprint',
      globalStructure: 'article_plan',
    },
  };
}

function buildArticleParagraphBlueprint(input: {
  topic: string;
  target: string;
  plan: ReturnType<typeof buildRuntimeArticlePlan>;
  materialPack?: Record<string, any>;
  claimBudget?: Record<string, any>;
  writingBrief?: Record<string, any>;
}): Record<string, any> {
  const paragraphPlan = buildArticleParagraphPlan(Number(input.plan.targetWordCount || 0) || 1800);
  const route = Array.isArray((input.materialPack?.argumentDigest as any)?.paragraphRoute)
    ? (input.materialPack?.argumentDigest as any).paragraphRoute
    : [];
  const budgets = Array.isArray(input.claimBudget?.perParagraph) ? input.claimBudget?.perParagraph as Array<Record<string, any>> : [];
  const roles = [
    '现实入口',
    '第一层后果',
    '第二层传导',
    '外部约束',
    '反例或限制',
    '结尾判断',
  ];
  const paragraphs = Array.from({ length: paragraphPlan.paragraphCount }, (_, index) => {
    const routeItem = route[index % Math.max(1, route.length)] || {};
    const budget = budgets[index] || { requiredAtomIds: [], allowedAtoms: [] };
    return {
      index,
      role: String(routeItem.paragraphRole || roles[index] || `第${index + 1}段推进`),
      intent: String(routeItem.purpose || routeItem.intent || roles[index] || '推进一个材料关系'),
      requiredAtomIds: Array.isArray(budget.requiredAtomIds) ? budget.requiredAtomIds : [],
      allowedAtoms: Array.isArray(budget.allowedAtoms) ? budget.allowedAtoms : [],
      minChars: paragraphPlan.minParagraphChars,
      maxChars: paragraphPlan.maxParagraphChars,
      writerRule: '先写本段 requiredAtomIds 支撑的主事实，再用 allowedAtoms 中的本次事实补充后果，最后落一句判断。不得复写来源句，不得使用 allowedAtoms 之外的 atom。',
      verifierRule: '本段出现的数字，时间，地点，机构，人物，事件和具体动作必须能映射到 requiredAtomIds 或 allowedAtoms。',
    };
  });
  return {
    version: 'article-paragraph-blueprint.v1',
    topic: input.topic,
    target: input.target,
    paragraphPlan,
    paragraphs,
    loops: {
      paragraphVerifier: '不合格只回本段 Paragraph Writer 或本段 Blueprint',
      globalCoherence: '结构失败回 Article Plan',
      factBoundary: '事实失败回 Claim Budget',
    },
  };
}

function renderClaimBudgetPrompt(value?: Record<string, any>): string {
  if (!value) return '无';
  return sanitizePromptSurfaceText(JSON.stringify({
    version: value.version,
    strict: value.strict,
    totalAtoms: value.totalAtoms,
    perParagraph: Array.isArray(value.perParagraph)
      ? value.perParagraph.map((item: any) => ({
        paragraphIndex: item.paragraphIndex,
        requiredAtomIds: item.requiredAtomIds,
        allowedAtoms: Array.isArray(item.allowedAtoms)
          ? item.allowedAtoms.map((atom: any) => ({ id: atom.id, type: atom.type, value: atom.value }))
          : [],
        rule: item.rule,
      }))
      : [],
  }, null, 2));
}

function renderParagraphBlueprintPrompt(value?: Record<string, any>): string {
  if (!value) return '无';
  return sanitizePromptSurfaceText(JSON.stringify({
    version: value.version,
    paragraphPlan: value.paragraphPlan,
    paragraphs: Array.isArray(value.paragraphs)
      ? value.paragraphs.map((item: any) => ({
        index: item.index,
        role: item.role,
        intent: item.intent,
        requiredAtomIds: item.requiredAtomIds,
        allowedAtoms: Array.isArray(item.allowedAtoms)
          ? item.allowedAtoms.map((atom: any) => ({ id: atom.id, value: atom.value }))
          : [],
        minChars: item.minChars,
        maxChars: item.maxChars,
        writerRule: item.writerRule,
        verifierRule: item.verifierRule,
      }))
      : [],
    loops: value.loops,
  }, null, 2));
}

function buildTopicJudgmentRewriteFindings(topic: string, body: string): string[] {
  const findings: string[] = [];
  const topicText = String(topic || '').trim();
  if (/为什么|为何|何以/.test(topicText) && !/(为什么|为何|何以)/u.test(body)) {
    findings.push('正文没有明确回答为什么，必须把原因写进段落，不要只描述现象。');
  }
  const topicTokens = tokenizeArticleMaterialText(topicText)
    .filter((token) => !isWeakArticleMaterialToken(token) && token.length >= 2);
  const missingTokens = topicTokens.filter((token) => !body.includes(token));
  if (topicTokens.length >= 2 && missingTokens.length >= Math.max(2, Math.ceil(topicTokens.length * 0.5))) {
    findings.push(`正文还没有把题眼关键词写进判断链：${missingTokens.slice(0, 4).join('、')}。`);
  }
  return findings;
}

async function runSurfaceBlockerRewritePasses(input: {
  body: string;
  parsed: ReturnType<typeof parseArticleModelOutput>;
  rewriteFeedbacks: Array<ReturnType<typeof buildArticleModelRewriteFeedback>>;
  styleGuard: RestrictedStyleForegroundGuard;
  invoke: (feedback: { system: string; user: string }) => Promise<{ text: string; provider?: string; model?: string }>;
  input: {
    topic: string;
    target: string;
    context: RuntimeArticleContext;
    plan: ReturnType<typeof buildRuntimeArticlePlan>;
    materialPack?: Record<string, any>;
    acceptanceContract?: Record<string, any>;
    sourcePassages?: Array<Record<string, any>>;
    partBodies?: string[];
    factClaims?: Array<{ text?: string; atomIds?: string[]; inference?: boolean }>;
    runtimeDraftAst?: Record<string, any>;
    paragraphBlueprint?: Record<string, any>;
  };
  targetWordCount: number;
  maxAttempts: number;
}): Promise<{
  body: string;
  parsed: ReturnType<typeof parseArticleModelOutput>;
  rewriteFeedbacks: Array<ReturnType<typeof buildArticleModelRewriteFeedback>>;
}> {
  let acceptedBody = normalizeGeneratedArticleBody(input.body);
  let parsed = input.parsed;
  const rewriteFeedbacks = [...input.rewriteFeedbacks];
  const factBoundaryStrict = Boolean(input.input.acceptanceContract?.policy?.factBoundaryStrict);
  const minChars = resolveArticleMinimumAcceptedChars({
    targetWordCount: input.targetWordCount,
    acceptanceContract: input.input.acceptanceContract,
  });
  const initialEvaluation = evaluateArticleDraftContract({
    body: acceptedBody,
    draft: { body: acceptedBody, draftAst: input.input.runtimeDraftAst },
    plan: input.input.plan,
    context: input.input.context,
    acceptanceContract: input.input.acceptanceContract,
    sourcePassages: input.input.sourcePassages || [],
    materialPack: input.input.materialPack,
    partBodies: input.input.partBodies,
    factClaims: parsed.factClaims || input.input.factClaims,
    generationMode: 'model',
  });
  if (!shouldRunSurfaceBlockerRewritePasses({
    evaluation: initialEvaluation,
    body: acceptedBody,
    minChars,
  })) {
    return { body: acceptedBody, parsed, rewriteFeedbacks };
  }
  for (let attempt = 0; attempt < input.maxAttempts; attempt += 1) {
    const evaluation = evaluateArticleDraftContract({
      body: acceptedBody,
      draft: { body: acceptedBody, draftAst: input.input.runtimeDraftAst },
      plan: input.input.plan,
      context: input.input.context,
      acceptanceContract: input.input.acceptanceContract,
      sourcePassages: input.input.sourcePassages || [],
      materialPack: input.input.materialPack,
      partBodies: input.input.partBodies,
      factClaims: parsed.factClaims || input.input.factClaims,
      generationMode: 'model',
    });
    const retryableBlockers = evaluation.blockers.filter((item) => isWriterRewriteRetryableBlocker(item));
    const nonRetryableBlockers = evaluation.blockers.filter((item) => !isWriterRewriteRetryableBlocker(item));
    if (!retryableBlockers.length || nonRetryableBlockers.length > 0) {
      break;
    }
    const retryFeedback = buildArticleModelRewriteFeedback({
      body: acceptedBody,
      acceptanceContract: input.input.acceptanceContract,
      targetWordCount: input.targetWordCount,
      topic: input.input.topic,
      plan: input.input.plan,
      context: input.input.context,
      materialPack: input.input.materialPack,
      styleGuard: input.styleGuard,
    });
    if (!retryFeedback) {
      break;
    }
    rewriteFeedbacks.push(retryFeedback);
    const retryResult = await input.invoke(retryFeedback);
    const retryParsed = parseArticleModelOutput(retryResult.text, factBoundaryStrict);
    const retryBody = finalizeArticleModelBody({ body: retryParsed.body, styleGuard: input.styleGuard });
    const candidateProblems = inspectArticleRewriteCandidateAgainstContract({
      body: retryBody,
      factClaims: retryParsed.factClaims || parsed.factClaims || input.input.factClaims,
      styleGuard: input.styleGuard,
      input: input.input,
    });
    if (candidateProblems.length) {
      continue;
    }
    parsed = retryParsed;
    acceptedBody = retryBody;
  }
  const completionEvaluation = evaluateArticleDraftContract({
    body: acceptedBody,
    draft: { body: acceptedBody, draftAst: input.input.runtimeDraftAst },
    plan: input.input.plan,
    context: input.input.context,
    acceptanceContract: input.input.acceptanceContract,
    sourcePassages: input.input.sourcePassages || [],
    materialPack: input.input.materialPack,
    partBodies: input.input.partBodies,
    factClaims: parsed.factClaims || input.input.factClaims,
    generationMode: 'model',
  });
  const stillShort = completionEvaluation.blockers.some((item) => /PROSE-COMPLETENESS|WORDCOUNT/.test(String(item.ruleId || '')))
    || acceptedBody.replace(/\s+/g, '').length < minChars;
  if (stillShort) {
    const completionFeedback = buildArticleLengthCompletionFeedback({
      body: acceptedBody,
      factClaims: parsed.factClaims || input.input.factClaims,
      targetWordCount: input.targetWordCount,
      minChars,
      topic: input.input.topic,
      plan: input.input.plan,
      context: input.input.context,
      materialPack: input.input.materialPack,
      acceptanceContract: input.input.acceptanceContract,
      paragraphBlueprint: (input.input as any).paragraphBlueprint,
    });
    rewriteFeedbacks.push(completionFeedback);
    const completionResult = await input.invoke(completionFeedback);
    const completionParsed = parseArticleModelOutput(completionResult.text, factBoundaryStrict);
    const completionBody = finalizeArticleModelBody({ body: completionParsed.body, styleGuard: input.styleGuard });
    const completionProblems = inspectArticleFeedbackRewriteCandidate({ body: completionBody, styleGuard: input.styleGuard });
    const completionCandidateEvaluation = evaluateArticleDraftContract({
      body: completionBody,
      draft: { body: completionBody, draftAst: input.input.runtimeDraftAst },
      plan: input.input.plan,
      context: input.input.context,
      acceptanceContract: input.input.acceptanceContract,
      sourcePassages: input.input.sourcePassages || [],
      materialPack: input.input.materialPack,
      partBodies: input.input.partBodies,
      factClaims: completionParsed.factClaims || parsed.factClaims || input.input.factClaims,
      generationMode: 'model',
    });
    const completionBlockingRuleIds = completionCandidateEvaluation.blockers.map((item) => String(item.ruleId || ''));
    const completionStillFailsLength = completionBlockingRuleIds.some((ruleId) => /PROSE-COMPLETENESS|WORDCOUNT/.test(ruleId))
      || completionBody.replace(/\s+/g, '').length < minChars;
    const completionStillFailsFactBoundary = completionCandidateEvaluation.blockers.some((item) => {
      const ruleId = String(item.ruleId || '');
      const category = String(item.category || '');
      return /FACT-CLAIM-COVERAGE|UNSUPPORTED-SCENE/.test(ruleId) || category === 'fact_boundary';
    });
    if (
      !completionProblems.length
      && !completionStillFailsLength
      && !completionStillFailsFactBoundary
      && completionBody.replace(/\s+/g, '').length > acceptedBody.replace(/\s+/g, '').length
    ) {
      parsed = completionParsed;
      acceptedBody = completionBody;
    }
  }
  return { body: acceptedBody, parsed, rewriteFeedbacks };
}

async function runArticleLayeredRevisionIfNeeded(input: {
  draft: Record<string, any>;
  evaluation: ArticleObservationReport;
  context: RuntimeArticleContext;
  plan: ReturnType<typeof buildRuntimeArticlePlan>;
  draftAst?: Record<string, any>;
  acceptanceContract?: Record<string, any>;
  sourcePassages: Array<Record<string, any>>;
  materialPack?: Record<string, any>;
  partBodies?: string[];
  factClaims?: Array<Record<string, any> | { text?: string; atomIds?: string[]; inference?: boolean }>;
  paragraphBlueprint?: Record<string, any>;
  model?: string;
  settings?: Record<string, any>;
  deps: ContentRuntimeDeps;
}): Promise<{
  version: 'article-layered-revision.v1';
  strategy: 'none' | 'paragraph' | 'global_required';
  reason: string;
  plan?: ArticleRevisionPlan;
  draft?: Record<string, any>;
  evaluation?: ArticleObservationReport;
  modelInvocation?: Record<string, any>;
} | null> {
  let currentDraft = input.draft;
  let currentEvaluation = input.evaluation;
  const attempts: Array<Record<string, any>> = [];
  const maxRevisionAttempts = readArticleLayeredRevisionAttemptLimit(input.settings);
  for (let attempt = 0; attempt < maxRevisionAttempts; attempt += 1) {
    currentEvaluation = hydrateArticleRevisionEvaluation({
      body: String(currentDraft.body || ''),
      draft: currentDraft,
      evaluation: currentEvaluation,
      input,
    });
    const body = String(currentDraft.body || '');
    const revisionPlan = buildArticleRevisionPlan({
      body,
      evaluation: currentEvaluation,
      plan: input.plan,
      context: input.context,
      materialPack: input.materialPack,
    });
    if (!revisionPlan.required) {
      return attempts.length
        ? {
          version: 'article-layered-revision.v1',
          strategy: attempts.some((item) => item.strategy === 'paragraph') ? 'paragraph' : 'global_required',
          reason: uniqueStrings(attempts.map((item) => String(item.reason || ''))).join('、') || 'revision completed',
          plan: attempts[attempts.length - 1]?.plan,
          draft: currentDraft,
          evaluation: currentEvaluation,
          modelInvocation: attempts[attempts.length - 1]?.modelInvocation,
        }
        : null;
    }
    const revision = revisionPlan.globalRewriteRequired || !revisionPlan.paragraphRewriteRequired
      ? await runArticleGlobalModelRevision({
        body,
        revisionPlan,
        context: input.context,
        plan: input.plan,
        draftAst: currentDraft.draftAst,
        acceptanceContract: input.acceptanceContract,
        sourcePassages: input.sourcePassages,
        materialPack: input.materialPack,
        partBodies: input.partBodies,
        factClaims: Array.isArray((currentDraft as any).factClaims)
          ? (currentDraft as any).factClaims
          : input.factClaims,
        model: input.model,
        settings: input.settings,
        deps: input.deps,
      })
      : await runArticleParagraphModelRevision({
        body,
        revisionPlan,
        context: input.context,
        plan: input.plan,
        materialPack: input.materialPack,
        paragraphBlueprint: input.paragraphBlueprint,
        factClaims: Array.isArray((currentDraft as any).factClaims)
          ? (currentDraft as any).factClaims
          : input.factClaims,
        factBoundaryStrict: Boolean(input.acceptanceContract?.policy?.factBoundaryStrict),
        model: input.model,
        settings: input.settings,
        deps: input.deps,
    });
    if ('accepted' in revision && revision.accepted === false) {
      currentDraft = {
        ...currentDraft,
        body,
        factClaims: (revision as any).factClaims || (currentDraft as any).factClaims,
        modelInvocation: {
          ...(currentDraft.modelInvocation && typeof currentDraft.modelInvocation === 'object' ? currentDraft.modelInvocation : {}),
          layeredRevision: {
            version: 'article-layered-revision.v1',
            strategy: 'global_required',
            provider: revision.provider,
            model: revision.model,
            rejected: true,
            rejectionFeedback: revision.rejectionFeedback,
          },
        },
      };
      currentEvaluation = evaluateArticleDraftContract({
        body,
        draft: currentDraft,
        plan: input.plan,
        context: input.context,
        acceptanceContract: input.acceptanceContract,
        sourcePassages: input.sourcePassages,
        materialPack: input.materialPack,
        partBodies: input.partBodies,
        factClaims: Array.isArray((currentDraft as any).factClaims)
          ? (currentDraft as any).factClaims
          : input.factClaims,
        generationMode: 'model',
      });
      attempts.push({
        strategy: 'global_required',
        reason: revisionPlan.reason,
        plan: revisionPlan,
        materialFunctionPlan: buildRevisionMaterialFunctionSummary(input.materialPack),
        modelInvocation: {
          provider: revision.provider,
          model: revision.model,
          rejected: true,
          rejectionFeedback: revision.rejectionFeedback,
        },
        passed: false,
      });
      break;
    }
    const strategy = revisionPlan.globalRewriteRequired || !revisionPlan.paragraphRewriteRequired
      ? 'global_required'
      : 'paragraph';
    currentDraft = {
      ...currentDraft,
      body: revision.body,
      factClaims: (revision as any).factClaims || (currentDraft as any).factClaims,
      modelInvocation: {
        ...(currentDraft.modelInvocation && typeof currentDraft.modelInvocation === 'object' ? currentDraft.modelInvocation : {}),
        layeredRevision: {
          version: 'article-layered-revision.v1',
          strategy,
          provider: revision.provider,
          model: revision.model,
          revisedParagraphIndexes: (revision as any).revisedParagraphIndexes,
          candidateRejections: (revision as any).candidateRejections,
        },
      },
    };
      currentEvaluation = evaluateArticleDraftContract({
        body: revision.body,
        draft: currentDraft,
        plan: input.plan,
        context: input.context,
      acceptanceContract: input.acceptanceContract,
      sourcePassages: input.sourcePassages,
      materialPack: input.materialPack,
      partBodies: input.partBodies,
      factClaims: Array.isArray((currentDraft as any).factClaims)
        ? (currentDraft as any).factClaims
        : input.factClaims,
      paragraphBlueprint: input.paragraphBlueprint,
      generationMode: 'model',
      });
    attempts.push({
      strategy,
      reason: revisionPlan.reason,
      plan: revisionPlan,
      materialFunctionPlan: buildRevisionMaterialFunctionSummary(input.materialPack),
      modelInvocation: {
        provider: revision.provider,
        model: revision.model,
        revisedParagraphIndexes: (revision as any).revisedParagraphIndexes,
        candidateRejections: (revision as any).candidateRejections,
      },
      passed: currentEvaluation.passed,
    });
    if (currentEvaluation.passed) {
      break;
    }
  }
  if (!attempts.length) return null;
  return {
    version: 'article-layered-revision.v1',
    strategy: attempts.some((item) => item.strategy === 'paragraph') ? 'paragraph' : 'global_required',
    reason: uniqueStrings(attempts.map((item) => String(item.reason || ''))).join('、'),
    plan: attempts[attempts.length - 1]?.plan,
    draft: currentDraft,
    evaluation: currentEvaluation,
    modelInvocation: {
      ...attempts[attempts.length - 1]?.modelInvocation,
      attempts,
    },
  };
}

function readArticleLayeredRevisionAttemptLimit(settings?: Record<string, any>): number {
  const configured = Number(settings?.layeredRevisionMaxAttempts ?? settings?.layered_revision_max_attempts ?? 1);
  if (!Number.isFinite(configured) || configured <= 0) {
    return 1;
  }
  return Math.max(1, Math.min(2, Math.trunc(configured)));
}

function readArticleGlobalRevisionCandidateAttemptLimit(settings?: Record<string, any>): number {
  const configured = Number(settings?.globalRevisionCandidateMaxAttempts ?? settings?.global_revision_candidate_max_attempts ?? 1);
  if (!Number.isFinite(configured) || configured <= 0) {
    return 1;
  }
  return Math.max(1, Math.min(2, Math.trunc(configured)));
}

function hydrateArticleRevisionEvaluation(input: {
  body: string;
  draft: Record<string, any>;
  evaluation: ArticleObservationReport;
  input: {
    context: RuntimeArticleContext;
    plan: ReturnType<typeof buildRuntimeArticlePlan>;
    acceptanceContract?: Record<string, any>;
    sourcePassages: Array<Record<string, any>>;
    materialPack?: Record<string, any>;
    partBodies?: string[];
    factClaims?: Array<Record<string, any> | { text?: string; atomIds?: string[]; inference?: boolean }>;
  };
}): ArticleObservationReport {
  const blockers = Array.isArray(input.evaluation.blockers) ? input.evaluation.blockers : [];
  const warnings = Array.isArray(input.evaluation.warnings) ? input.evaluation.warnings : [];
  const violations = Array.isArray(input.evaluation.violations) ? input.evaluation.violations : [];
  if (blockers.length || warnings.length || violations.length) {
    return input.evaluation;
  }
  if (input.evaluation.passed) {
    return input.evaluation;
  }
  return evaluateArticleDraftContract({
    body: input.body,
    draft: input.draft,
    plan: input.input.plan,
    context: input.input.context,
    acceptanceContract: input.input.acceptanceContract,
    sourcePassages: input.input.sourcePassages,
    materialPack: input.input.materialPack,
    partBodies: input.input.partBodies,
    factClaims: Array.isArray((input.draft as any).factClaims)
      ? (input.draft as any).factClaims
      : input.input.factClaims,
    generationMode: 'model',
  });
}

type ArticleRevisionScope = 'global' | 'section' | 'paragraph';

interface ArticleRevisionIssue {
  ruleId: string;
  severity: string;
  category: string;
  issueType: string;
  scope: ArticleRevisionScope;
  message: string;
  excerpt?: string;
  paragraphIndex?: number;
  sourceEvidence?: Record<string, any>;
  reviewerEvidence?: {
    badReason?: string;
    rewriteActions?: string[];
    forbiddenMoves?: string[];
    targetShape?: string;
  };
}

interface ArticleRevisionPlan {
  version: 'article-revision-plan.v1';
  required: boolean;
  reason: string;
  globalRewriteRequired: boolean;
  sectionRewriteRequired: boolean;
  paragraphRewriteRequired: boolean;
  issues: ArticleRevisionIssue[];
  paragraphTargets: Array<{
    paragraphIndex: number;
    issues: ArticleRevisionIssue[];
    evidenceAnchors: string[];
  }>;
}

function buildArticleRevisionPlan(input: {
  body: string;
  evaluation: ArticleObservationReport;
  plan: ReturnType<typeof buildRuntimeArticlePlan>;
  context: RuntimeArticleContext;
  materialPack?: Record<string, any>;
}): ArticleRevisionPlan {
  const paragraphs = splitArticleParagraphs(input.body);
  const violations = [
    ...Array.isArray(input.evaluation.blockers) ? input.evaluation.blockers : [],
    ...Array.isArray(input.evaluation.warnings)
      ? input.evaluation.warnings.filter(isModelRewriteObservation)
      : [],
  ];
  const issues = violations.map((item) => classifyArticleRevisionIssue({
    violation: item,
    paragraphs,
  }));
  const globalRewriteRequired = issues.some((item) => item.scope === 'global');
  const sectionRewriteRequired = issues.some((item) => item.scope === 'section');
  const paragraphIssues = issues.filter((item) => item.scope === 'paragraph' && Number.isInteger(item.paragraphIndex));
  const paragraphClaimBudgetIssues = paragraphIssues.filter((item) => item.ruleId === 'ARTICLE-PARAGRAPH-CLAIM-BUDGET-001');
  const styleProfileParagraphIssues = paragraphIssues.filter((item) => item.category === 'style_profile');
  const syntaxParagraphIssues = paragraphIssues.filter((item) => item.category === 'syntax_ai_tone');
  const prioritizedParagraphIssues = paragraphClaimBudgetIssues.length
    ? paragraphClaimBudgetIssues
    : styleProfileParagraphIssues.length
    ? styleProfileParagraphIssues
    : syntaxParagraphIssues.length ? syntaxParagraphIssues : paragraphIssues;
  const paragraphTargets = Array.from(new Set(prioritizedParagraphIssues.map((item) => Number(item.paragraphIndex))))
    .slice(0, paragraphClaimBudgetIssues.length || styleProfileParagraphIssues.length || syntaxParagraphIssues.length ? 8 : 3)
    .map((paragraphIndex) => ({
      paragraphIndex,
      issues: prioritizedParagraphIssues.filter((item) => item.paragraphIndex === paragraphIndex),
      evidenceAnchors: buildRewriteEvidenceAnchorList(input.context, input.materialPack).slice(0, 6),
    }))
    .filter((item) => item.issues.length > 0);
  const paragraphFirstRequired = paragraphClaimBudgetIssues.length > 0 || styleProfileParagraphIssues.length > 0 || syntaxParagraphIssues.length > 0;
  const required = issues.length > 0;
  return {
    version: 'article-revision-plan.v1',
    required,
    reason: required
      ? uniqueStrings(issues.map((item) => item.category || item.issueType)).join('、')
      : 'no revision required',
    globalRewriteRequired: paragraphFirstRequired ? false : globalRewriteRequired,
    sectionRewriteRequired: paragraphFirstRequired ? false : sectionRewriteRequired,
    paragraphRewriteRequired: paragraphTargets.length > 0 && (paragraphFirstRequired || (!globalRewriteRequired && !sectionRewriteRequired)),
    issues,
    paragraphTargets,
  };
}

function isModelRewriteObservation(item: Record<string, any>): boolean {
  const ruleId = String(item.ruleId || '');
  const category = String(item.category || '');
  const fixAction = String(item.fixAction || '');
  // 这些问题不作为硬门禁，但必须进入 WriterAgent 的下一轮模型重写反馈；
  // 否则 runtime 只会“观察到问题”，却不会把上下文工程约束传回正文所有者。
  return category === 'style_profile'
    || category === 'material_digestion'
    || ruleId === 'ARTICLE-SOURCE-DISPLAY-001'
    || ruleId === 'ARTICLE-UNSUPPORTED-SCENE-001'
    || ruleId === 'ARTICLE-ANALOGY-RELEVANCE-001'
    || fixAction.startsWith('rewrite_with_source_silence')
    || fixAction.startsWith('rewrite_without_unsupported_scene_detail')
    || fixAction.startsWith('rewrite_without_weak_analogy');
}

function classifyArticleRevisionIssue(input: {
  violation: Record<string, any>;
  paragraphs: string[];
}): ArticleRevisionIssue {
  const ruleId = String(input.violation.ruleId || 'UNKNOWN');
  const category = String(input.violation.category || '');
  const message = String(input.violation.message || '');
  const excerpt = String(input.violation.excerpt || '').trim() || undefined;
  const scope = resolveArticleRevisionScope(ruleId, category);
  return {
    ruleId,
    severity: String(input.violation.severity || 'block'),
    category,
    issueType: resolveRevisionReviewerIssueType(
      input.violation,
      resolveArticleRevisionIssueType(ruleId, category, message),
    ),
    scope,
    message,
    excerpt,
    sourceEvidence: input.violation.sourceEvidence && typeof input.violation.sourceEvidence === 'object'
      ? input.violation.sourceEvidence as Record<string, any>
      : undefined,
    reviewerEvidence: normalizeRevisionReviewerEvidence(input.violation.reviewerEvidence),
    paragraphIndex: scope === 'paragraph'
      ? Number.isInteger(Number(input.violation.sourceEvidence?.paragraphIndex))
        ? Number(input.violation.sourceEvidence.paragraphIndex)
        : findParagraphIndexForViolation(input.paragraphs, excerpt)
      : undefined,
  };
}

function resolveRevisionReviewerIssueType(violation: Record<string, any>, fallback: string): string {
  const sourceEvidence = violation.sourceEvidence && typeof violation.sourceEvidence === 'object'
    ? violation.sourceEvidence as Record<string, any>
    : {};
  return String(sourceEvidence.issueType || violation.issueType || fallback || '').trim() || fallback;
}

function normalizeRevisionReviewerEvidence(value: unknown): ArticleRevisionIssue['reviewerEvidence'] | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }
  const record = value as Record<string, any>;
  const evidence = {
    badReason: String(record.badReason || '').trim() || undefined,
    rewriteActions: Array.isArray(record.rewriteActions) ? record.rewriteActions.map(String).filter(Boolean) : [],
    forbiddenMoves: Array.isArray(record.forbiddenMoves) ? record.forbiddenMoves.map(String).filter(Boolean) : [],
    targetShape: String(record.targetShape || '').trim() || undefined,
  };
  return evidence.badReason || evidence.rewriteActions.length || evidence.forbiddenMoves.length || evidence.targetShape
    ? evidence
    : undefined;
}

function resolveArticleRevisionScope(ruleId: string, category: string): ArticleRevisionScope {
  if (ruleId === 'ARTICLE-PARAGRAPH-CLAIM-BUDGET-001') {
    return 'paragraph';
  }
  if (category === 'style_profile') {
    return 'paragraph';
  }
  if (
    ruleId === 'ARTICLE-PROSE-COMPLETENESS-001'
    || ruleId === 'ARTICLE-PROSE-COMPLETENESS-002'
    || ruleId === 'ARTICLE-PROSE-COMPLETENESS-003'
    || ruleId === 'ARTICLE-REFERENCE-COVERAGE-001'
    || ruleId.startsWith('ARTICLE-FACT-BOUNDARY-STRICT')
    || category === 'fact_boundary'
    || category === 'reference_coverage'
  ) {
    return 'global';
  }
  if (
    category === 'plain_article_format'
    || category === 'language'
    || category === 'syntax_ai_tone'
    || category === 'lexical_context'
    || ruleId.startsWith('LANG-')
    || ruleId.startsWith('ARTICLE-PUNCT')
    || ruleId.startsWith('ARTICLE-AI-PHRASE')
    || ruleId.startsWith('ARTICLE-SYNTAX')
  ) {
    return 'paragraph';
  }
  return 'section';
}

function resolveArticleRevisionIssueType(ruleId: string, category: string, message: string): string {
  if (category === 'style_profile') return 'restricted_style_foreground_leak';
  if (ruleId.includes('ASCII')) return 'ascii_or_technical_token';
  if (ruleId.includes('PUNCT')) return 'banned_punctuation';
  if (ruleId.includes('EURO')) return 'europeanized_sentence';
  if (ruleId.includes('SYNTAX')) return 'syntax_ai_tone';
  if (ruleId.includes('REFERENCE') || category.includes('reference')) return 'material_grounding';
  if (ruleId.includes('COMPLETENESS')) return 'prose_completeness';
  if (/禁用词|拒绝词/.test(message)) return 'banned_term';
  return category || ruleId;
}

function splitArticleParagraphs(body: string): string[] {
  return String(body || '')
    .split(/\n{2,}/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function findParagraphIndexForViolation(paragraphs: string[], excerpt?: string): number | undefined {
  if (!paragraphs.length) return undefined;
  if (!excerpt) return 0;
  const normalizedExcerpt = compactForLocation(excerpt);
  let bestIndex = -1;
  let bestScore = 0;
  for (let index = 0; index < paragraphs.length; index += 1) {
    const normalizedParagraph = compactForLocation(paragraphs[index]);
    if (normalizedParagraph.includes(normalizedExcerpt)) {
      return index;
    }
    const score = scoreParagraphExcerptOverlap(normalizedParagraph, normalizedExcerpt);
    if (score > bestScore) {
      bestIndex = index;
      bestScore = score;
    }
  }
  return bestIndex >= 0 ? bestIndex : 0;
}

function compactForLocation(value: string): string {
  return String(value || '').replace(/\s+/g, '');
}

function scoreParagraphExcerptOverlap(paragraph: string, excerpt: string): number {
  const tokens = uniqueStrings(excerpt.match(/[\u4e00-\u9fa5A-Za-z0-9]{2,}/g) || []);
  if (!tokens.length) return 0;
  return tokens.filter((token) => paragraph.includes(token)).length / tokens.length;
}

async function runArticleParagraphModelRevision(input: {
  body: string;
  revisionPlan: ArticleRevisionPlan;
  context: RuntimeArticleContext;
  plan: ReturnType<typeof buildRuntimeArticlePlan>;
  sourcePassages?: Array<Record<string, any>>;
  materialPack?: Record<string, any>;
  paragraphBlueprint?: Record<string, any>;
  factClaims?: Array<Record<string, any> | { text?: string; atomIds?: string[]; inference?: boolean; paragraphIndex?: number }>;
  factBoundaryStrict?: boolean;
  model?: string;
  settings?: Record<string, any>;
  deps: ContentRuntimeDeps;
}): Promise<{
  body: string;
  provider?: string;
  model?: string;
  factClaims?: Array<{ text?: string; atomIds?: string[]; inference?: boolean; paragraphIndex?: number }>;
  revisedParagraphIndexes: number[];
  candidateRejections: Array<Record<string, any>>;
}> {
  const paragraphs = splitArticleParagraphs(input.body);
  let factClaims = normalizeRevisionFactClaims(input.factClaims);
  let provider: string | undefined;
  let model: string | undefined;
  const revisedParagraphIndexes: number[] = [];
  const candidateRejections: Array<Record<string, any>> = [];
  const maxTokens = normalizeArticleModelMaxTokens({
    requestedMaxTokens: Number(input.settings?.maxTokens || input.settings?.max_tokens || 0),
    targetWordCount: 1200,
  });
  for (const target of input.revisionPlan.paragraphTargets) {
    const current = paragraphs[target.paragraphIndex];
    if (!current) continue;
    const previous = paragraphs[target.paragraphIndex - 1] || '';
    const next = paragraphs[target.paragraphIndex + 1] || '';
    const targetRejections: Array<Record<string, any>> = [];
    const maxCandidateAttempts = readArticleGlobalRevisionCandidateAttemptLimit(input.settings);
    for (let candidateAttempt = 0; candidateAttempt < maxCandidateAttempts; candidateAttempt += 1) {
      const revisionPrompt = buildArticleParagraphRevisionPrompt({
        topic: input.plan.topic,
        paragraphIndex: target.paragraphIndex,
        current,
        previous,
        next,
        issues: target.issues,
        evidenceAnchors: target.evidenceAnchors,
        materialPack: input.materialPack,
        paragraphBlueprint: input.paragraphBlueprint,
        factBoundaryStrict: Boolean(input.factBoundaryStrict),
        previousCandidateRejections: targetRejections,
      });
      const result = input.deps.invokeArticleModel
        ? await input.deps.invokeArticleModel({
          systemPrompt: revisionPrompt.system,
          userPrompt: revisionPrompt.user,
          model: input.model,
          temperature: 0.05,
          maxTokens,
        })
        : {
          text: await invokeContentCraftLlm([
            { role: 'system', content: revisionPrompt.system },
            { role: 'user', content: revisionPrompt.user },
          ], {
            temperature: 0.05,
            model: input.model || resolveContentCraftModel(),
            maxTokens,
          }),
          ...getLastInvokeMeta(),
      };
      const parsed = parseArticleModelOutput(result.text, Boolean(input.factBoundaryStrict));
      const paragraph = normalizeGeneratedArticleBody(parsed.body).trim();
      const paragraphClaimRejection = input.factBoundaryStrict
        ? inspectParagraphRevisionFactClaims({
          factClaims: parsed.factClaims,
          paragraphBlueprint: input.paragraphBlueprint,
          paragraphIndex: target.paragraphIndex,
        })
        : null;
      const rejection = paragraphClaimRejection || inspectParagraphRevisionCandidate(paragraph, current, target.issues);
      if (rejection) {
      const rejectionRecord = {
        paragraphIndex: target.paragraphIndex,
        candidateAttempt: candidateAttempt + 1,
        reasons: rejection.reasons,
          candidateLength: rejection.candidateLength,
          requiredLength: rejection.requiredLength,
          excerpt: compactPromptText(paragraph, 120),
        };
        targetRejections.push(rejectionRecord);
        candidateRejections.push(rejectionRecord);
        continue;
      }
      paragraphs[target.paragraphIndex] = paragraph;
      if (input.factBoundaryStrict && Array.isArray(parsed.factClaims)) {
        const paragraphClaims = parsed.factClaims.map((claim) => ({
          ...claim,
          paragraphIndex: target.paragraphIndex,
        }));
        factClaims = [
          ...factClaims.filter((claim) => Number(claim.paragraphIndex) !== target.paragraphIndex),
          ...paragraphClaims,
        ];
      }
      provider = result.provider || provider;
      model = result.model || input.model || model;
      revisedParagraphIndexes.push(target.paragraphIndex);
      break;
    }
  }
  return {
    body: paragraphs.join('\n\n'),
    provider,
    model,
    factClaims,
    revisedParagraphIndexes,
    candidateRejections,
  };
}

function normalizeRevisionFactClaims(
  values: Array<Record<string, any> | { text?: string; atomIds?: string[]; inference?: boolean; paragraphIndex?: number }> | undefined,
): Array<{ text?: string; atomIds?: string[]; inference?: boolean; paragraphIndex?: number }> {
  if (!Array.isArray(values)) return [];
  return values
    .filter((item) => item && typeof item === 'object' && !Array.isArray(item))
    .map((item: any) => ({
      text: item.text == null ? undefined : String(item.text),
      atomIds: Array.isArray(item.atomIds) ? item.atomIds.map(String).filter(Boolean) : [],
      inference: Boolean(item.inference),
      paragraphIndex: Number.isInteger(Number(item.paragraphIndex)) ? Number(item.paragraphIndex) : undefined,
    }));
}

function inspectParagraphRevisionFactClaims(input: {
  factClaims?: Array<{ text?: string; atomIds?: string[]; inference?: boolean; paragraphIndex?: number }>;
  paragraphBlueprint?: Record<string, any>;
  paragraphIndex: number;
}): { reasons: string[]; candidateLength: number; requiredLength: number } | null {
  const claims = normalizeRevisionFactClaims(input.factClaims);
  const paragraph = readParagraphBlueprintItem(input.paragraphBlueprint, input.paragraphIndex);
  const allowed = new Set(
    Array.isArray(paragraph?.allowedAtoms)
      ? paragraph.allowedAtoms.map((atom: any) => String(atom.id || '')).filter(Boolean)
      : [],
  );
  const reasons: string[] = [];
  if (allowed.size && !claims.length) {
    reasons.push('paragraph_fact_claims_missing');
  }
  if (!allowed.size && claims.length) {
    reasons.push('paragraph_fact_claims_without_allowed_atoms');
  }
  const wrongParagraph = claims.some((claim) => Number.isInteger(Number(claim.paragraphIndex)) && Number(claim.paragraphIndex) !== input.paragraphIndex);
  if (wrongParagraph) {
    reasons.push('paragraph_fact_claims_wrong_index');
  }
  const invalidAtom = claims.some((claim) => (claim.atomIds || []).some((atomId) => !allowed.has(String(atomId))));
  if (invalidAtom) {
    reasons.push('paragraph_fact_claims_outside_allowed_atoms');
  }
  return reasons.length
    ? { reasons: uniqueStrings(reasons), candidateLength: claims.length, requiredLength: 1 }
    : null;
}

function readParagraphBlueprintItem(value: Record<string, any> | undefined, paragraphIndex: number): Record<string, any> | undefined {
  const paragraphs = Array.isArray(value?.paragraphs) ? value?.paragraphs as Array<Record<string, any>> : [];
  return paragraphs.find((paragraph) => Number(paragraph.index) === paragraphIndex) || paragraphs[paragraphIndex];
}

function isAcceptableParagraphRevisionCandidate(candidate: string, original: string): boolean {
  return !inspectParagraphRevisionCandidate(candidate, original, []);
}

function inspectParagraphRevisionCandidate(
  candidate: string,
  original: string,
  issues: ArticleRevisionIssue[],
): { reasons: string[]; candidateLength: number; requiredLength: number } | null {
  const paragraph = String(candidate || '').trim();
  const compact = paragraph.replace(/\s+/g, '');
  const originalCompact = String(original || '').replace(/\s+/g, '');
  const requiredLength = Math.max(180, Math.floor(originalCompact.length * 0.75));
  const reasons: string[] = [];
  if (!paragraph) reasons.push('empty_candidate');
  if (paragraph.includes('\n\n')) reasons.push('multiple_paragraphs');
  if (compact.length < requiredLength) reasons.push('too_short');
  if (/[:：;；“”"‘’'—–\-（）()\[\]【】]/u.test(paragraph)) reasons.push('banned_punctuation');
  if (/[A-Za-z0-9]/u.test(paragraph)) reasons.push('ascii_or_digit');
  if (/(?:这)?(?:问题|关键|差别|要害|核心)?(?:不是|并非)[^。！？\n]{0,120}(?:而是|却是|只是|谁|关于|为了)|不是[^。！？\n]{0,48}也不是[^。！？\n]{0,90}|不(?:靠|在|是)[^。！？\n]{0,100}(?:靠|而在|而是|而靠|而在于)|(?:靠的是|通过这种方式|这说明|提醒我们|材料显示|根据)[^。！？\n]{0,80}|通过[^。！？\n]{0,80}|而靠[^。！？\n]{0,80}|是靠[^。！？\n]{0,80}|完成[^。！？\n]{0,16}(?:征收|筛选|治理|支配|闭合|转化)/u.test(paragraph)) {
    reasons.push('syntax_ai_tone');
  }
  if (/(?:闭环|静默|沉淀|机制|结构性|流程化|系统运转|运行逻辑|治理逻辑)/u.test(paragraph)) {
    reasons.push('abstract_or_banned_register');
  }
  const styleLeakExcerpts = issues
    .filter((item) => item.category === 'style_profile')
    .map((item) => String(item.excerpt || '').trim())
    .filter(Boolean);
  if (styleLeakExcerpts.some((excerpt) => paragraph.includes(excerpt))) {
    reasons.push('restricted_style_foreground_leak');
  }
  return reasons.length
    ? { reasons: uniqueStrings(reasons), candidateLength: compact.length, requiredLength }
    : null;
}

async function runArticleGlobalModelRevision(input: {
  body: string;
  revisionPlan: ArticleRevisionPlan;
  context: RuntimeArticleContext;
  plan: ReturnType<typeof buildRuntimeArticlePlan>;
  draftAst?: Record<string, any>;
  acceptanceContract?: Record<string, any>;
  sourcePassages: Array<Record<string, any>>;
  materialPack?: Record<string, any>;
  partBodies?: string[];
  factClaims?: Array<Record<string, any> | { text?: string; atomIds?: string[]; inference?: boolean }>;
  model?: string;
  settings?: Record<string, any>;
  deps: ContentRuntimeDeps;
}): Promise<{
  body: string;
  provider?: string;
  model?: string;
  accepted: boolean;
  factClaims?: Array<{ text?: string; atomIds?: string[]; inference?: boolean }>;
  rejectionFeedback?: string;
}> {
  const targetWordCount = normalizeArticleRequestedTargetChars({
    plan: input.plan,
    acceptanceContract: input.acceptanceContract,
  });
  const prompt = buildArticleGlobalRevisionPrompt({
    body: input.body,
    revisionPlan: input.revisionPlan,
    context: input.context,
    plan: input.plan,
    acceptanceContract: input.acceptanceContract,
    sourcePassages: input.sourcePassages,
    materialPack: input.materialPack,
    targetWordCount,
  });
  const maxTokens = normalizeArticleModelMaxTokens({
    requestedMaxTokens: Number(input.settings?.maxTokens || input.settings?.max_tokens || 0),
    targetWordCount,
  });
  let provider: string | undefined;
  let model: string | undefined;
  let lastBody = '';
  let lastFactClaims: Array<{ text?: string; atomIds?: string[]; inference?: boolean }> | undefined;
  let rejectionFeedback = '';
  let accepted = false;
  const candidateMaxAttempts = readArticleGlobalRevisionCandidateAttemptLimit(input.settings);
  for (let attempt = 0; attempt < candidateMaxAttempts; attempt += 1) {
    const userPrompt = rejectionFeedback
      ? `${prompt.user}\n\n上一轮全篇重写候选被拒绝\n${rejectionFeedback}\n\n请重新生成完整正文。必须更换段落首句、段落顺序和主要句法。正文只允许中文逗号、中文句号和自然段换行。`
      : prompt.user;
    const result = input.deps.invokeArticleModel
      ? await input.deps.invokeArticleModel({
        systemPrompt: prompt.system,
        userPrompt,
        model: input.model,
        temperature: 0.05,
        maxTokens,
      })
      : {
        text: await invokeContentCraftLlm([
          { role: 'system', content: prompt.system },
          { role: 'user', content: userPrompt },
        ], {
          temperature: 0.05,
          model: input.model || resolveContentCraftModel(),
          maxTokens,
        }),
        ...getLastInvokeMeta(),
      };
    provider = result.provider || provider;
    model = result.model || input.model || model;
    const factBoundaryStrict = Boolean(input.acceptanceContract?.policy?.factBoundaryStrict);
    const parsed = parseArticleModelOutput(result.text, factBoundaryStrict);
    const revisionStyleGuard = buildRestrictedStyleForegroundGuard({
      stylePack: input.context.stylePack,
      materialPack: input.materialPack,
    });
    lastBody = finalizeArticleModelBody({
      body: normalizeGeneratedArticleBody(parsed.body),
      styleGuard: revisionStyleGuard,
    });
    lastFactClaims = parsed.factClaims || input.factClaims as any;
    const candidateProblems = inspectGlobalRevisionCandidate({
      body: lastBody,
      targetWordCount,
      draft: {
        body: lastBody,
        draftAst: input.draftAst,
        modelInvocation: {
          provider,
          model,
        },
      },
      plan: input.plan,
      context: input.context,
      acceptanceContract: input.acceptanceContract,
      sourcePassages: input.sourcePassages,
      materialPack: input.materialPack,
      partBodies: input.partBodies,
      factClaims: lastFactClaims,
    });
    if (!candidateProblems.length) {
      accepted = true;
      break;
    }
    rejectionFeedback = candidateProblems.map((item, index) => `${index + 1}. ${item}`).join('\n');
  }
  return {
    body: lastBody,
    provider,
    model,
    accepted,
    factClaims: lastFactClaims,
    rejectionFeedback: accepted ? undefined : rejectionFeedback,
  };
}

function inspectArticleFeedbackRewriteCandidate(input: {
  body: string;
  styleGuard?: ReturnType<typeof buildRestrictedStyleForegroundGuard>;
}): string[] {
  const body = String(input.body || '');
  const paragraphs = splitArticleParagraphs(body);
  const problems: string[] = [];
  const styleLeak = input.styleGuard
    ? detectRestrictedStyleForegroundLeak(body, input.styleGuard)
    : null;
  if (styleLeak) {
    problems.push(`候选仍把受限风格源题材写进正文（命中 ${styleLeak}），只能保留句法节奏，不得复写风格源人物、地点或标志性意象。`);
  }
  const punctuationHit = body.match(/[:：;；“”"‘’'—–\-（）()\[\]【】]/u)?.[0];
  if (punctuationHit) {
    problems.push('候选仍含禁用标点。只能使用中文逗号、中文句号和自然段换行。');
  }
  const asciiHit = body.match(/[A-Za-z0-9]/u)?.[0];
  if (asciiHit) {
    problems.push('候选仍含英文或数字，必须改成自然中文说法或删除无证精确信息。');
  }
  if (collectArticleForbiddenSyntaxHits(body).length > 0) {
    problems.push('候选仍有机械解释句，必须改成动作句和结果句，不能保留对称定义。');
  }
  if (detectArticleTrainingCorpusLeak(body)) {
    problems.push('候选仍有作者训练集或旧历史材料前景化泄漏。事实评论正文只能写本次 FactPack 支持的对象和后果。');
  }
  const duplicatePairs = findNearDuplicateParagraphPairs(paragraphs);
  if (duplicatePairs.length > 0) {
    problems.push(`候选出现重复段落，第${duplicatePairs.map((pair) => `${toChineseNumeral(pair[0] + 1)}段和第${toChineseNumeral(pair[1] + 1)}段`).join('、')}高度重复。`);
  }
  const numberedParagraph = paragraphs.find((item) => /^([一二三四五六七八九十]+[、.．]|\d+[.)、])/.test(item.replace(/\s+/g, '')));
  if (numberedParagraph) {
    problems.push('候选仍使用编号分点，必须改成连续自然段。');
  }
  if (paragraphs.some((item) => /^(材料|证据|功能|锚点|结论)[:：]/u.test(item.replace(/\s+/g, '')))) {
    problems.push('候选仍含栏目式标签句。');
  }
  return problems;
}

function inspectArticleRewriteCandidateAgainstContract(input: {
  body: string;
  factClaims?: Array<Record<string, any> | { text?: string; atomIds?: string[]; inference?: boolean; paragraphIndex?: number }>;
  styleGuard?: ReturnType<typeof buildRestrictedStyleForegroundGuard>;
  input: {
    topic: string;
    target: string;
    context: RuntimeArticleContext;
    plan: ReturnType<typeof buildRuntimeArticlePlan>;
    materialPack?: Record<string, any>;
    acceptanceContract?: Record<string, any>;
    sourcePassages?: Array<Record<string, any>>;
    partBodies?: string[];
    runtimeDraftAst?: Record<string, any>;
  };
}): string[] {
  const problems = inspectArticleFeedbackRewriteCandidate({
    body: input.body,
    styleGuard: input.styleGuard,
  });
  const evaluation = evaluateArticleDraftContract({
    body: input.body,
    draft: { body: input.body, draftAst: input.input.runtimeDraftAst },
    plan: input.input.plan,
    context: input.input.context,
    acceptanceContract: input.input.acceptanceContract,
    sourcePassages: input.input.sourcePassages || [],
    materialPack: input.input.materialPack,
    partBodies: input.input.partBodies,
    factClaims: input.factClaims,
    generationMode: 'model',
  });
  for (const blocker of evaluation.blockers) {
    const ruleId = String(blocker.ruleId || 'UNKNOWN');
    const category = String(blocker.category || '');
    if (
      /FACT-CLAIM-COVERAGE|UNSUPPORTED-SCENE|PUNCT|SYNTAX/.test(ruleId)
      || category === 'fact_boundary'
      || category === 'syntax_ai_tone'
    ) {
      problems.push(`候选未通过${ruleId}。${String(blocker.message || '正文合同失败')}`);
    }
  }
  return uniqueStrings(problems);
}

function detectArticleTrainingCorpusLeak(body: string): boolean {
  return /(?:伪组织|伪逆|人无分老幼|喋血|千秋骂名|万劫不复)/u.test(String(body || ''));
}

function auditArticleWriterContext(input: {
  modelInvocation?: Record<string, any>;
  target: string;
  stylePack: RuntimeArticleContext['stylePack'];
  memoryItemCount: number;
  literatureItemCount: number;
  factAtomCount: number;
  paragraphBlueprint?: Record<string, any>;
}): Record<string, any> {
  const prompt = [
    String(input.modelInvocation?.systemPrompt || ''),
    String(input.modelInvocation?.basePrompt || ''),
  ].join('\n');
  const isArticleCommentary = ['article', 'article_draft', 'commentary', 'obsidian-video-script', 'draft']
    .includes(String(input.target || '').trim());
  const forbiddenRawStyleSignals = [
    'imageryClusters',
    'progressionMoves',
    'rhetoricalMoves',
    '原文材料',
  ];
  const promptHits = uniqueStrings([
    ...forbiddenRawStyleSignals.filter((item) => prompt.includes(item)),
  ]);
  const paragraphCount = Array.isArray(input.paragraphBlueprint?.paragraphs)
    ? input.paragraphBlueprint?.paragraphs.length
    : 0;
  return {
    version: 'writer-context-audit.v1',
    mode: isArticleCommentary ? 'fact_commentary' : 'general',
    allowedWriterInputs: ['fact_pack', 'claim_budget', 'paragraph_blueprint', 'author_contract_rules'],
    rawStyleSourceVisibleToWriter: false,
    rawTrainingTextVisibleToWriter: false,
    rawLiteratureTextVisibleToWriter: !isArticleCommentary,
    stylePackProfileCount: Array.isArray((input.stylePack.pack as any)?.profiles)
      ? (input.stylePack.pack as any).profiles.length
      : 0,
    memoryItemCount: input.memoryItemCount,
    literatureItemCount: input.literatureItemCount,
    factAtomCount: input.factAtomCount,
    paragraphBlueprintParagraphCount: paragraphCount,
    promptForbiddenSignalHits: promptHits,
    passed: promptHits.length === 0,
  };
}

function finalizeArticleModelBody(input: {
  body: string;
  styleGuard: RestrictedStyleForegroundGuard;
}): string {
  return finalizeArticleDeliveryBody(input.body);
}

function finalizeArticleDeliveryBody(body: string): string {
  return normalizeGeneratedArticleBody(ensureArticleParagraphBreaks(applyArticleSurfaceDeliveryCleanup(body)));
}

function applyStrictFactBoundaryDeliveryCleanup(value: string): string {
  return String(value || '').replace(/\r\n/g, '\n').trim();
}

function buildMaterialFactAtoms(input: {
  topic: string;
  context: RuntimeArticleContext;
  sourcePassages: Array<Record<string, any>>;
  materialPack?: Record<string, any>;
}): Array<Record<string, string>> {
  const materialPack = input.materialPack || {};
  const candidates: Array<{
    type: string;
    value: string;
    sourceId: string;
    sourceText?: string;
    citationId?: string;
    blockId?: string;
  }> = [];
  const pushCandidate = (item: {
    type: string;
    value: unknown;
    sourceId: unknown;
    sourceText?: unknown;
    citationId?: unknown;
    blockId?: unknown;
    factEligible?: unknown;
  }) => {
    const value = compactPromptText(sanitizePromptSurfaceText(String(item.value || '')), 220);
    const sourceText = compactPromptText(sanitizePromptSurfaceText(String(item.sourceText || item.value || '')), 520);
    const sourceId = String(item.sourceId || item.citationId || item.blockId || '').trim();
    if (!value || !sourceId) return;
    if (item.factEligible === false) return;
    if (!isTrustedFactAtomSourceId(sourceId)) return;
    for (const atomValue of splitWritableFactAtomValues({ value, sourceText })) {
      if (!isWritableFactAtomText(atomValue, sourceText)) continue;
      const combined = [sourceId, atomValue, sourceText].join(' ');
      if (isStyleOrBroadCorpusAnchorMaterial(combined)) continue;
      if (!hasSufficientFactAtomTopicOverlap(input.topic, combined)) continue;
      if (input.topic && shouldRejectOffTopicMaterialText(input.topic, combined)) continue;
      candidates.push({
        type: normalizeFactAtomType(item.type),
        value: atomValue,
        sourceId,
        ...(sourceText ? { sourceText } : {}),
        ...(item.citationId ? { citationId: String(item.citationId).trim() } : {}),
        ...(item.blockId ? { blockId: String(item.blockId).trim() } : {}),
      });
    }
  };

  for (const [index, item] of (Array.isArray(input.sourcePassages) ? input.sourcePassages : []).slice(0, 24).entries()) {
    const sourceId = String(item.sourceId || item.id || `source-passage-${index + 1}`).trim();
    pushCandidate({
      type: normalizeFactAtomType(item.kind || item.type || item.category || 'source_passage'),
      value: [item.title || item.sourceTitle || item.name || '', item.excerpt || item.text || item.summary || ''].filter(Boolean).join('。'),
      sourceId,
      sourceText: item.excerpt || item.text || item.summary || item.title || item.sourceTitle,
      factEligible: item.factEligible,
    });
  }

  for (const [index, item] of (Array.isArray(materialPack.sourcePassages) ? materialPack.sourcePassages : []).slice(0, 24).entries()) {
    pushCandidate({
      type: normalizeFactAtomType(item.kind || 'source_passage'),
      value: [item.title || '', item.excerpt || item.summary || ''].filter(Boolean).join('。'),
      sourceId: item.id || item.sourceId || `material-source-${index + 1}`,
      sourceText: item.excerpt || item.summary || item.title,
      factEligible: item.factEligible,
    });
  }

  for (const [index, item] of (Array.isArray(materialPack.evidencePackChunks) ? materialPack.evidencePackChunks : []).slice(0, 32).entries()) {
    pushCandidate({
      type: 'evidence_chunk',
      value: [item.title || '', item.text || item.excerpt || item.summary || ''].filter(Boolean).join('。'),
      sourceId: item.sourceId || item.id || `evidence-chunk-${index + 1}`,
      sourceText: item.text || item.excerpt || item.summary || item.title,
      blockId: item.id || `evidence-chunk-${index + 1}`,
      factEligible: item.factEligible,
    });
  }

  for (const [index, item] of (Array.isArray(materialPack.evidenceCitations) ? materialPack.evidenceCitations : []).slice(0, 24).entries()) {
    pushCandidate({
      type: 'evidence_citation',
      value: [item.title || '', item.excerpt || item.text || item.summary || ''].filter(Boolean).join('。'),
      sourceId: item.sourceId || item.id || item.title || `evidence-citation-${index + 1}`,
      sourceText: item.excerpt || item.text || item.summary || item.title,
      citationId: item.id || item.sourceId || `evidence-citation-${index + 1}`,
      factEligible: item.factEligible,
    });
  }

  for (const [index, item] of (Array.isArray(materialPack.semanticUnits) ? materialPack.semanticUnits : input.context.semantic.units).slice(0, 24).entries()) {
    const kind = normalizeFactAtomType(item.kind || item.materialKind || 'semantic_unit');
    if (!/event|source_anchor/.test(kind)) continue;
    pushCandidate({
      type: kind,
      value: [item.title || item.sourceTitle || '', item.summary || item.excerpt || ''].filter(Boolean).join('。'),
      sourceId: item.id || item.sourceId || `semantic-unit-${index + 1}`,
      sourceText: item.summary || item.excerpt || item.title || item.sourceTitle,
      factEligible: true,
    });
  }

  return uniqueFactAtoms(candidates.map((item, index) => ({
    id: `fact_atom_${index + 1}`,
    type: item.type,
    value: item.value,
    sourceId: item.sourceId,
    ...(item.sourceText ? { sourceText: item.sourceText } : {}),
    ...(item.citationId ? { citationId: item.citationId } : {}),
    ...(item.blockId ? { blockId: item.blockId } : {}),
  }))).slice(0, 80);
}

function isWritableFactAtomText(value: string, sourceText: string): boolean {
  const text = String(sourceText || value || '').replace(/\s+/g, '');
  const atom = String(value || '').replace(/\s+/g, '');
  if (!text || text.length < 18) return false;
  if (/^材料槽/.test(atom) && atom.length < 40) return false;
  if (/^(来源|切块|引文|用户资料|资料引用|语义材料|标题|摘要)\d*[。．、\s]/u.test(atom)) return false;
  if (/新闻网|新闻社|快讯|突发|最新消息|可能方式及后续影响|面临严重冲击|陷入瘫痪第五天/u.test(atom) && text.length < 80) return false;
  if (!/[，。；,.;]/u.test(text) && text.length < 80) return false;
  const hasSourceAction = /(?:估计|称|表示|宣布|通过|警告|指出|披露|发布|记录|显示|涉及|购买|出口|进口|运往|占|约|超过|低于|上调|下降|中断|受阻|暂停|恢复|批准|拒绝|调查|审查|制裁|谈判|签署|撤回|关闭|开放|延迟|取消)/u.test(text);
  const hasNamedActor = /(?:[\u4e00-\u9fa5]{2,12}(?:国|部|委|署|局|院|会|社|公司|集团|政府|机构|组织|银行|大学|法院|港|厂|站|省|市|县|区|岛|湾|河|山|海|湖|路|线|项目|计划|协议|报告|指数|价格|比例|数量|金额|数据|声明|公告|法案|规则|名单|系统|平台|产品|服务|货物|船舶|车辆|设备|用户|企业|行业|市场|供应链|通道|边境|地区|城市|国家|联盟|会议|峰会|条约)|[A-Z][A-Za-z0-9._-]{2,})/u.test(text);
  const hasMeasure = /(?:[一二三四五六七八九十百千万亿零\d]+(?:\.\d+)?\s*(?:%|％|个|家|名|次|天|日|周|月|年|小时|分钟|吨|桶|美元|元|公里|海里|页|项|份|批|艘|辆|架|座|条)|百分之|约|超过|低于|至少|不足|多数|少数|多家|若干)/u.test(text);
  return hasSourceAction || (hasNamedActor && hasMeasure);
}

function splitWritableFactAtomValues(input: { value: string; sourceText: string }): string[] {
  const sourceText = sanitizePromptSurfaceText(String(input.sourceText || input.value || ''));
  const titlePrefix = sanitizePromptSurfaceText(String(input.value || '').split('。')[0] || '');
  const fragments = sourceText
    .replace(/\s+/g, ' ')
    .split(/(?<=[。！？；;])\s*|(?<=\.)\s+/u)
    .map((item) => compactPromptText(item, 180))
    .filter((item) => item.length >= 18)
    .filter((item) => isWritableFactAtomText(item, item));
  const merged = fragments.length
    ? fragments.map((item) => {
      if (!titlePrefix || item.includes(titlePrefix) || titlePrefix.length > 80) return item;
      return compactPromptText(`${titlePrefix}。${item}`, 220);
    })
    : [compactPromptText(input.value, 220)].filter(Boolean);
  return uniqueStrings(merged).slice(0, 8);
}

function isTrustedFactAtomSourceId(sourceId: string): boolean {
  const value = String(sourceId || '').toLowerCase();
  if (!value) return false;
  if (/molihua|telegram|twitter|x_com|youtube|bilibili|weibo|toutiao|zhihu|reddit/.test(value)) return false;
  if (/^(web|ragflow|database|semantic|evidence)__/.test(value)) return true;
  return /bbc|eia|reuters|apnews|afp|chinadaily|chinanews|cztv|gov|edu|org|database|ragflow|semantic|evidence/.test(value);
}

function hasSufficientFactAtomTopicOverlap(topic: string, text: string): boolean {
  const topicTokens = tokenizeArticleMaterialText(topic)
    .filter((token) => !isWeakArticleMaterialToken(token) && token.length >= 2);
  if (!topicTokens.length) return true;
  const normalizedText = String(text || '').replace(/\s+/g, '');
  const hits = uniqueStrings(topicTokens.filter((token) => normalizedText.includes(token)));
  if (hits.length >= Math.min(2, topicTokens.length)) return true;
  return hits.length >= 1 && topicTokens.length <= 3;
}

function normalizeFactAtomType(value: unknown): string {
  const normalized = String(value || '').toLowerCase().replace(/[^a-z0-9_/-]+/g, '_').replace(/^_+|_+$/g, '');
  if (!normalized) return 'source_anchor';
  if (/theory|literature/.test(normalized)) return 'theory_claim';
  if (/relationship|relation|semantic|memory/.test(normalized)) return 'relationship';
  if (/document|observer|event|case/.test(normalized)) return 'event';
  return 'source_anchor';
}

function uniqueFactAtoms(values: Array<Record<string, string>>): Array<Record<string, string>> {
  const seen = new Set<string>();
  const result: Array<Record<string, string>> = [];
  for (const atom of values) {
    const sourceId = String(atom.sourceId || '').trim();
    const value = String(atom.value || '').trim();
    const type = String(atom.type || '').trim() || 'material';
    if (!sourceId || !value) continue;
    const key = `${sourceId}|${type}|${value}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({
      ...atom,
      id: String(atom.id || `fact_atom_${result.length + 1}`).trim() || `fact_atom_${result.length + 1}`,
      type,
      value,
      sourceId,
    });
  }
  return result.map((atom, index) => ({
    ...atom,
    id: atom.id || `fact_atom_${index + 1}`,
  }));
}

function applyArticleSurfaceDeliveryCleanup(value: string): string {
  const cleaned = String(value || '')
    .replace(/[：:]/g, '，')
    .replace(/[;；]/g, '。')
    .replace(/[“”"‘’']/g, '')
    .replace(/[—–]+|--/g, '。')
    .replace(/[（）()\[\]【】]/g, '')
    .replace(/[A-Za-z]+(?:[ \t._/-]+[A-Za-z0-9]+)*/g, ' ')
    .replace(/本质上是/g, '说到底是')
    .replace(/闭环传导链/g, '连续传导链')
    .replace(/闭环/g, '回路')
    .replace(/机制/g, '运作')
    .replace(/结构性重塑/g, '重新改写')
    .replace(/结构性/g, '深层')
    .replace(/在([^。！？\n]{1,24})层面/g, '$1上')
    .replace(/折射出/g, '显出')
    .replace(/得以实现/g, '能够维持')
    .replace(/实现的/g, '维持这一动作的')
    .replace(/具有([^。！？\n]{1,16})性/g, '带着$1')
    .replace(/基于([^。！？\n]{1,24})/g, '从$1出发')
    .replace(/进行([^。！？\n]{1,18})/g, '做$1')
    .replace(/通过/g, '经由')
    .replace(/性张力/g, '牵扯')
    .replace(/张力/g, '牵扯')
    .replace(/背后是/g, '后面有')
    .replace(/背后，是/g, '后面有')
    .replace(/其背后/g, '后面')
    .split(/\n{2,}|\n(?=\s*[\u4e00-\u9fa5])/)
    .map((paragraph) => paragraph
      .replace(/[^。！？\n]{0,80}通过[^。！？\n]{1,80}(?:实现|完成|形成|展示|说明|体现)[^。！？\n]{0,80}[。！？]?/g, '')
      .replace(/在([^。！？\n]{1,24})层面/g, '$1上')
      .replace(/折射出/g, '显出')
      .replace(/得以实现/g, '能够维持')
      .replace(/实现的/g, '维持这一动作的')
      .replace(/具有([^。！？\n]{1,16})性/g, '带着$1')
      .replace(/基于([^。！？\n]{1,24})/g, '从$1出发')
      .replace(/进行([^。！？\n]{1,18})/g, '做$1')
      .replace(/不是([^。！？\n]{1,80})而是([^。！？\n]{1,120})/g, '$2。')
      .replace(/不是([^。！？\n]{1,80})只是([^。！？\n]{1,120})/g, '$2。')
      .replace(/并不是([^。！？\n]{1,80})只是([^。！？\n]{1,120})/g, '$2。')
      .replace(/不是([^。！？\n]{1,80})，只是([^。！？\n]{1,120})/g, '$2。')
      .replace(/并非([^。！？\n]{1,80})而是([^。！？\n]{1,120})/g, '$2。')
      .replace(/不靠([^。！？\n]{1,80})只靠([^。！？\n]{1,120})/g, '$2。')
      .replace(/不靠([^。！？\n]{1,80})靠([^。！？\n]{1,120})/g, '$2。')
      .replace(/不在([^。！？\n]{1,80})而在([^。！？\n]{1,120})/g, '$2。')
      .replace(/不在([^。！？\n]{1,80})，而在([^。！？\n]{1,120})/g, '$2。')
      .replace(/这些数字背后是/g, '这些数目落到')
      .replace(/数字背后是/g, '这些数目落到')
      .replace(/背后是/g, '后面有')
      .replace(/背后，是/g, '后面有')
      .replace(/其背后/g, '后面')
      .replace(/([^。！？\n]{1,80})不再被([^。！？\n]{1,80})所([^。！？\n]{1,80})，而沦为([^。！？\n]{1,100})/g, '$1失去$2的$3，变成$4')
      .replace(/([^。！？\n]{1,80})被([^。！？\n]{1,80})所([^。！？\n]{1,80})/g, '$2$3$1')
      .replace(/([^。！？\n]{1,80})即被打破，而修复它所需的政治能量，远大于维持它所需的沉默默契/g, '$1被打破后，修复更难，维持原状反而更省力')
      .replace(/一旦([^。！？\n]{1,60})被强制重置，所有下游节点都将暴露在([^。！？\n]{1,80})/g, '$1突然改写，下游各处立刻承压')
      .replace(/不仅是([^。！？\n]{1,80})，?更是([^。！？\n]{1,120})/g, '$1被打散。$2也跟着松动')
      .replace(/不仅([^。！？\n]{1,80})，?更是([^。！？\n]{1,120})/g, '$1。$2也跟着浮出水面')
      .replace(/它一场/g, '这是一场')
      .replace(/\s+/g, ' ')
      .replace(/([。！？])\s+/g, '$1')
      .trim())
    .filter(Boolean)
    .join('\n\n');
  return ensureArticleParagraphBreaks(cleaned)
    .replace(/。{2,}/g, '。')
    .replace(/，。/g, '。')
    .replace(/\s+\n/g, '\n')
    .trim();
}

function ensureArticleParagraphBreaks(value: string): string {
  const paragraphs = String(value || '')
    .split(/\n{2,}|\n(?=\s*[\u4e00-\u9fa5])/)
    .map((item) => item.trim())
    .filter(Boolean);
  if (paragraphs.length >= 5) {
    return paragraphs.join('\n\n');
  }
  const sentences = String(value || '')
    .replace(/\n+/g, '')
    .split(/(?<=[。！？])/u)
    .map((item) => item.trim())
    .filter(Boolean);
  if (sentences.length < 10) {
    return paragraphs.join('\n\n') || String(value || '').trim();
  }
  const targetParagraphCount = Math.min(8, Math.max(5, Math.round(sentences.length / 7)));
  const perParagraph = Math.ceil(sentences.length / targetParagraphCount);
  const rebuilt: string[] = [];
  for (let index = 0; index < sentences.length; index += perParagraph) {
    rebuilt.push(sentences.slice(index, index + perParagraph).join(''));
  }
  return rebuilt.join('\n\n');
}

function inspectGlobalRevisionCandidate(input: {
  body: string;
  targetWordCount: number;
  draft: Record<string, any>;
  plan: ReturnType<typeof buildRuntimeArticlePlan>;
  context: RuntimeArticleContext;
  acceptanceContract?: Record<string, any>;
  sourcePassages: Array<Record<string, any>>;
  materialPack?: Record<string, any>;
  partBodies?: string[];
  factClaims?: Array<Record<string, any> | { text?: string; atomIds?: string[]; inference?: boolean }>;
}): string[] {
  const body = input.body;
  const paragraphs = splitArticleParagraphs(body);
  const compactBody = body.replace(/\s+/g, '');
  const minChars = resolveArticleMinimumAcceptedChars({
    targetWordCount: input.targetWordCount,
    acceptanceContract: input.acceptanceContract,
  });
  const problems: string[] = [];
  const styleGuard = buildRestrictedStyleForegroundGuard({
    stylePack: input.context.stylePack,
    materialPack: input.materialPack,
  });
  const styleLeak = detectRestrictedStyleForegroundLeak(body, styleGuard);
  if (styleLeak) {
    problems.push(`候选仍把受限风格源题材写进正文（命中 ${styleLeak}），只能保留句法节奏。`);
  }
  if (compactBody.length < minChars) {
    problems.push(`候选正文过短，当前约${toChineseNumeral(compactBody.length)}个中文字符，必须补足完整论证。`);
  }
  if (paragraphs.length < 5 || paragraphs.length > 9) {
    problems.push(`候选自然段数量为${toChineseNumeral(paragraphs.length)}段，需要五到八个完整自然段。`);
  }
  const duplicatePairs = findNearDuplicateParagraphPairs(paragraphs);
  if (duplicatePairs.length > 0) {
    problems.push(`候选出现重复段落，第${duplicatePairs.map((pair) => `${toChineseNumeral(pair[0] + 1)}段和第${toChineseNumeral(pair[1] + 1)}段`).join('、')}高度重复。每段必须承担不同论证功能。`);
  }
  if (/[.]{3}|…$/.test(compactBody) || !/[。！？]$/.test(compactBody)) {
    problems.push('候选结尾疑似截断或悬置，必须写出完整结尾判断，并以中文句号收束。');
  }
  const punctuationHit = body.match(/[:：;；“”"‘’'—–\-（）()\[\]【】]/u)?.[0];
  if (punctuationHit) {
    problems.push('候选仍含禁用标点。只能使用中文逗号、中文句号和自然段换行。引语改成转述，横向解释符号改成句号。');
  }
  const asciiHit = body.match(/[A-Za-z0-9]/u)?.[0];
  if (asciiHit) {
    problems.push('候选仍含英文或数字。必须改成自然中文说法或删除无证精确信息。');
  }
  const forbiddenSyntax = body.match(/(?:这)?(?:问题|关键|差别|要害|核心)?(?:不是|并非)[^。！？\n]{0,120}(?:而是|却是|只是|谁|关于|为了)|不是[^。！？\n]{0,48}也不是[^。！？\n]{0,90}|不(?:靠|在|是)[^。！？\n]{0,100}(?:靠|而在|而是|而靠|而在于)|(?:靠的是|通过这种方式|这说明|提醒我们|材料显示|根据)[^。！？\n]{0,80}|通过[^。！？\n]{0,80}|基于[^。！？\n]{0,80}|具有[^。！？\n]{0,24}性[^。！？\n]{0,40}|进行[^。！？\n]{0,80}|在[^。！？\n]{1,24}层面[^。！？\n]{0,40}|折射出[^。！？\n]{0,80}|得以实现[^。！？\n]{0,80}|而靠[^。！？\n]{0,80}|是靠[^。！？\n]{0,80}/u)?.[0];
  if (forbiddenSyntax) {
    problems.push('候选仍有机械解释句。必须拆成动作句和结果句，不能保留对称定义，靠字对照和工具链说明。');
  }
  const abstractHit = body.match(/(?:机制|闭环|沉淀|赋能|维度|层面|系统运转|运行逻辑|结构性|技术化|标准化|流程化|副本|静默|场景|围绕|关系网络|开放接口|制度入口|解释框架|治理逻辑|通过|实现|基于|具有|进行|折射出|得以实现)/u)?.[0];
  if (abstractHit) {
    problems.push('候选仍有抽象或禁用词。必须换成可见物件、窗口动作、纸面痕迹或等待后果。');
  }
  if (detectArticleTrainingCorpusLeak(body)) {
    problems.push('候选仍有训练集、历史材料或文献材料前景化泄漏。删除旧历史称谓、跨域意象、器物、口号和无关叙事情节，只保留本次 FactPack 事实关系。');
  }
  const unsupportedPrecisionHit = body.match(/[一二三四五六七八九十百千万零\d]{1,4}(?:小时|天|日|周|月|年|份|次|页|段|组|个|家|名|栏|处)/u)?.[0];
  if (unsupportedPrecisionHit) {
    problems.push('候选含无证精确数量。资料未支撑时改成若干，多处，临近，此前此后。');
  }
  const openingCounts = new Map<string, number>();
  for (const paragraph of paragraphs) {
    const opening = paragraph.replace(/\s+/g, '').slice(0, 12);
    if (!opening) continue;
    openingCounts.set(opening, (openingCounts.get(opening) || 0) + 1);
  }
  const repeatedOpenings = Array.from(openingCounts.entries()).filter(([, count]) => count >= 2);
  if (repeatedOpenings.length > 0) {
    problems.push(`候选段落开头重复，命中${repeatedOpenings.map(([opening]) => opening).join('、')}。每段必须从不同对象或动作起笔。`);
  }
  const candidateEvaluation = evaluateArticleDraftContract({
    body,
    draft: input.draft,
    plan: input.plan,
    context: input.context,
    acceptanceContract: input.acceptanceContract,
    sourcePassages: input.sourcePassages,
    materialPack: input.materialPack,
    partBodies: input.partBodies,
    factClaims: input.factClaims,
    generationMode: 'model',
  });
  const contractProblems = [
    ...candidateEvaluation.blockers,
    ...candidateEvaluation.warnings.filter(isModelRewriteObservation),
  ].slice(0, 10);
  for (const violation of contractProblems) {
    const ruleId = String(violation.ruleId || 'UNKNOWN');
    const message = String(violation.message || '候选未通过正文合同');
    const excerpt = summarizeRevisionIssueExcerpt(classifyArticleRevisionIssue({
      violation,
      paragraphs,
    }));
    problems.push(`候选未通过${ruleId}。${summarizeRevisionViolationForCandidate(ruleId, message)}。${excerpt}`);
  }
  return problems;
}

function summarizeRevisionViolationForCandidate(ruleId: string, message: string): string {
  if (/PUNCT/.test(ruleId)) return '标点不合格，改成逗号句或句号句';
  if (/ASCII/.test(ruleId)) return '含英文数字或技术缩写，改成中文';
  if (/EURO/.test(ruleId)) return '含翻译腔或解释腔，改成动作和结果';
  if (/SYNTAX/.test(ruleId)) return '含机械解释骨架，改成物象先行和判断后置';
  if (/AUTHOR-STYLE/.test(ruleId)) return '作者模型信号不足，增加冷静克制的物象和制度压迫感';
  if (/PROSE-DISTRIBUTION/.test(ruleId)) return '句子开头重复，换不同对象和动作起笔';
  return sanitizePromptSurfaceText(message);
}

function renderFailedDraftSummaryForRevision(body: string): string {
  const compactBody = String(body || '').replace(/\s+/g, '');
  const paragraphs = splitArticleParagraphs(body);
  const signals = [
    body.match(/(?:不是|并非)[^。！？\n]{0,120}(?:而是|却是|只是)/u)?.[0],
    body.match(/不是[^。！？\n]{0,48}也不是[^。！？\n]{0,90}/u)?.[0],
    body.match(/不(?:靠|在|是)[^。！？\n]{0,100}(?:靠|而在|而是|而靠|而在于)/u)?.[0],
    body.match(/(?:靠的是|通过这种方式|这说明|提醒我们|材料显示|根据|而靠|是靠)[^。！？\n]{0,80}/u)?.[0],
    body.match(/[:：;；“”"‘’'—–\-（）()\[\]【】]/u)?.[0],
    body.match(/[A-Za-z0-9]/u)?.[0],
    body.match(/[一二三四五六七八九十百千万零\d]{1,4}(?:小时|天|日|周|月|年|份|次|页|段|组|个|家|名|栏|处)/u)?.[0],
  ].filter(Boolean).map((item) => summarizeRejectedSurfaceSignal(String(item)));
  return sanitizePromptSurfaceText([
    `上一轮约 ${toChineseNumeral(compactBody.length)} 个中文字符，${toChineseNumeral(paragraphs.length)} 个自然段。`,
    signals.length ? `失败信号 ${signals.join('、')}` : '',
    '只保留主题、材料边界和论证任务，不要带回原句、原符号或原句骨架。每次改写都换对象、换动作、换收束。',
  ].filter(Boolean).join(' '));
}

function summarizeRejectedSurfaceSignal(value: string): string {
  if (/[:：;；“”"‘’'—–\-（）()\[\]【】]/u.test(value)) return '禁用解释符号或引语符号';
  if (/[A-Za-z0-9]/u.test(value)) return '英文数字或技术缩写';
  if (/[一二三四五六七八九十百千万零\d]{1,4}(?:小时|天|日|周|月|年|份|次|页|段|组|个|家|名|栏|处)/u.test(value)) return '无证精确数量';
  if (/不是|并非|而是|却是|不靠|不在|而在|靠的是|而靠|是靠/.test(value)) return '定义翻转或对照骨架';
  if (/通过|这说明|提醒我们|材料显示|根据/.test(value)) return '工具链或来源展示句';
  return '审稿命中的坏句法';
}

function findNearDuplicateParagraphPairs(paragraphs: string[]): Array<[number, number]> {
  const result: Array<[number, number]> = [];
  const normalized = paragraphs.map((item) => item.replace(/\s+/g, ''));
  for (let left = 0; left < normalized.length; left += 1) {
    for (let right = left + 1; right < normalized.length; right += 1) {
      const a = normalized[left];
      const b = normalized[right];
      if (a.length < 120 || b.length < 120) continue;
      const prefix = longestCommonPrefixLength(a, b);
      const ratio = prefix / Math.min(a.length, b.length);
      if (ratio >= 0.45 || a.slice(0, 120) === b.slice(0, 120)) {
        result.push([left, right]);
      }
    }
  }
  return result.slice(0, 5);
}

function longestCommonPrefixLength(a: string, b: string): number {
  const limit = Math.min(a.length, b.length);
  let index = 0;
  while (index < limit && a[index] === b[index]) {
    index += 1;
  }
  return index;
}

function buildArticleGlobalRevisionPrompt(input: {
  body: string;
  revisionPlan: ArticleRevisionPlan;
  context: RuntimeArticleContext;
  plan: ReturnType<typeof buildRuntimeArticlePlan>;
  acceptanceContract?: Record<string, any>;
  sourcePassages?: Array<Record<string, any>>;
  materialPack?: Record<string, any>;
  targetWordCount: number;
}): { system: string; user: string } {
  const minChars = resolveArticleMinimumAcceptedChars({
    targetWordCount: input.targetWordCount,
    acceptanceContract: input.acceptanceContract,
  });
  const paragraphPlan = buildArticleParagraphPlan(input.targetWordCount);
  const paragraphContracts = buildRevisionParagraphAnchorContracts({
    plan: input.plan,
    context: input.context,
    materialPack: input.materialPack,
    paragraphCount: Math.max(6, paragraphPlan.paragraphCount),
  });
  const materialContract = renderRevisionMaterialContractPrompt(input.materialPack);
  const openingContracts = renderRevisionOpeningContracts(paragraphContracts);
  const surfaceSyntaxContract = buildArticleSurfaceSyntaxContractPrompt();
  const groundedOpeningContract = buildGroundedOpeningContractPrompt({
    topic: input.plan.topic,
    sourcePassages: input.sourcePassages || [],
    materialPack: input.materialPack,
    context: input.context,
  });
  const factBoundaryStrict = Boolean(input.acceptanceContract?.policy?.factBoundaryStrict);
  const factBoundaryAtoms = factBoundaryStrict && Array.isArray((input.acceptanceContract?.policy as Record<string, any> | undefined)?.factBoundaryAtoms)
    ? (input.acceptanceContract?.policy as Record<string, any>).factBoundaryAtoms
    : [];
  return {
    system: [
      '你是 ContentBase 全篇重写模型。上一轮正文未通过全局验收，你必须整篇重写。',
      '正文所有权归模型。不得局部补丁、不得复制原文后补几句、不得输出修改说明。',
      factBoundaryStrict
        ? '严格事实边界开启。输出必须是 JSON 对象，且只包含 body 和 factClaims。factClaims 每项包含 text、atomIds、inference。atomIds 只能使用本次 Typed Fact Atoms 的 id。'
        : '',
      factBoundaryStrict
        ? '正文里每一条具体事实都必须在 factClaims 中绑定。不能绑定时只能写概括判断，不得新增地点、实体、机构、报价、比例、天数和现场动作。'
        : '',
      `正文不少于${toChineseNumeral(minChars)}个中文字符，低于这个长度就是失败稿。`,
      `写成${toChineseNumeral(paragraphContracts.length)}个自然段，段间用一个空行隔开。不得少写段落，少于这个段数就是失败稿。`,
      '每段至少六句，每段至少三百六十个中文字符。不得用意象短段替代论证段。',
      '每段必须显式写入至少两个本次 FactPack 词面。优先使用资料中已经命名的对象、事件、机构、地点、数字或现实后果，不能只写压力、风险、结构这类空词。',
      '句法硬禁令：定义翻转、对照骨架、工具链说明句和靠字骨架一律不能保留。',
      `全部${toChineseNumeral(paragraphContracts.length)}个自然段必须承担不同功能。第一段写现实入口，第二段写核心对象的变化，第三段写第一层后果，第四段写约束和反应，第五段写外溢影响，后续段落写限制、反例和结尾判断。`,
      '每段采用材料对象句、后果句、短判断的顺序。材料对象句必须点出资料包中已经命名的对象、事件或概念。后果句写现实影响。短判断只用一句收束。',
      '不得让任意两个自然段以同一句或同一组动作开头。不得复制上一段再替换少量名词。',
      '不得复写联网来源原句。来源只给事实关系，必须用自己的句子重写，不得连续保留来源标题或摘要里的十个以上连续汉字。',
      '每段首句必须从段落开口合同指定的材料对象起笔。不得用题目原句、抽象概念、时代判断、某某理论、某某提醒我们开段。',
      '全篇重写不得另造新场面。禁止资料外人物、通讯动作、实体动作、市场报价、文件细节、办公场景和工作人员台词。',
      '全篇不得使用作者训练语料、旧历史材料或未证实现场里的对象、地点、人物、器物、口号和标志性意象。',
      '不得把资料未明示的物件、口号、器具、旧物和仪表当作默认意象。事实评论模式只写 FactPack 支持的对象、动作、后果、限制和现实压力。',
      '不得在每段重复题目原句。题目只能在第一段出现一次，后文直接推进论证。',
      '最终正文只允许中文汉字、中文逗号、中文句号和换行。',
      '不得出现冒号、引号、括号、方括号、英文字母、阿拉伯数字、来源编号、技术缩写或 Markdown。',
      '不得出现禁用抽象词。写资料来源不发声时改成沉默，写审核经过时改成过审或放行，写关系指向时改成转向，写具体入口时改成场面或物件。',
      '必须消化资料锚点，把资料变成论证中的对象、动作、现实影响和风险链条，不得写资料编号。',
      '必须轮流化用多个 FactPack 来源。每一类来源只提供对象、动作和后果关系，不要写来源名，不要复写标题和摘要。',
      '每个自然段必须领取段落材料合同中的至少一个材料锚点。可以改写锚点名称，但必须保留其中的关键对象、动作或制度关系。',
      '不能为增加质感而补材料外细节。资料没有明示时，不得写颜色、材质、分钟、页码、年月、人数、编号、具体位置和工作人员话语。',
      '不要为了沉默来源而抹掉材料。沉默的是来源标签，不是材料关系。',
      '如果锚点是理论材料，不要写理论名，改写成现实压力，利益位置和后果传导。',
      '如果锚点是书籍或长文材料，不要写书名，改写成它提供的历史类比、制度沉积或文明兴衰关系。',
      '必须继续服从材料功能分工。事实材料承担论点压力，理论材料只提供解释结构，受限风格源不得重新写进正文。',
      '不得把来源、书名、理论名和数据库检索过程前景化展示。',
      '前一轮提出的问题、改写动作和禁止动作是重写合同。必须逐条执行，不得只替换几个词。',
      '遇到句法问题时，先保留事实关系，再彻底更换句子骨架。不要把解释句改成另一种解释句。',
      '每句只写一个动作或一个后果，不要先下定义再翻转，也不要把来源标签和工具链说明写进正文。',
      '也不要让资料未明示的物件承接抽象解释骨架。',
      surfaceSyntaxContract,
      '需要表达对照时，写成两到三句材料关系。先写资料包中已经命名的事件或概念，再写后果。',
      '不要写显性判断套话、来源展示套话和工具链套话。',
      '禁止使用抽象套语，尤其是运行名词、营销名词、结构判断词、技术判断词和资料来源展示词。',
      '不得写在某某层面、折射出、得以实现、体系、实现、基于、具有某某性、进行这类翻译腔。遇到这些意思，改成具体对象上、显出、能够维持、整体安排、做到、从某处出发、带着某种后果、直接做某事。',
      '禁止无证精确数量。不要写具体几页、几份、几次、几家、几名、几处。只能写若干、多次、多处、临近、此前此后。',
      '结尾段必须给出完成判断。不得以问题、半句、省略号、未闭合引语或材料残片结束。',
    ].filter(Boolean).join('\n'),
    user: [
      `主题 ${sanitizePromptSurfaceText(input.plan.topic)}`,
      '',
      '全局审稿问题',
      ...input.revisionPlan.issues.map((item, index) => renderRevisionIssuePrompt(item, index)),
      '',
      '上一轮正文失败摘要',
      renderFailedDraftSummaryForRevision(input.body),
      '',
      '必须化用的资料锚点',
      buildRewriteEvidenceAnchorPrompt(input.context, input.materialPack),
      '',
      '段落材料合同',
      paragraphContracts.map((item) => sanitizePromptSurfaceText([
        `第${toChineseNumeral(item.index + 1)}段`,
        item.intent,
        item.role,
        `必须化用 ${item.anchors.join('。')}`,
      ].filter(Boolean).join('。'))).join('\n'),
      '',
      '段落开口合同',
      openingContracts,
      '',
      '资料对象开口合同',
      groundedOpeningContract,
      '',
      '正文表面句法合同',
      surfaceSyntaxContract,
      '',
      factBoundaryStrict ? 'Typed Fact Atoms' : '',
      factBoundaryStrict ? JSON.stringify(factBoundaryAtoms, null, 2) : '',
      factBoundaryStrict ? '每个 factClaims 项只能引用上方 id。不要使用未列出的 atomId。' : '',
      '',
      '材料功能分工和主论证线',
      materialContract,
      '',
      factBoundaryStrict
        ? '请沿用同一资料边界重新写完整正文，并返回 JSON。body 不要写标题，不要分点。factClaims 必须覆盖正文具体事实。'
        : '请沿用同一资料边界重新写完整正文。不要输出标题，不要分点。',
    ].filter(Boolean).join('\n'),
  };
}

function renderRevisionOpeningContracts(contracts: Array<{ index: number; anchors: string[] }>): string {
  return contracts.map((item, index) => sanitizePromptSurfaceText([
    `第${toChineseNumeral(item.index + 1)}段`,
    `首句从本段第${toChineseNumeral((index % Math.max(1, item.anchors.length)) + 1)}个材料锚点里的已有对象起笔`,
    '只写材料明示的对象或制度关系',
    '首句必须和上一段首句换对象或换动作，不得沿用同一组起手词',
    '不要补颜色、编号、时间、页码、具体位置、工作人员台词',
    '第二句再接材料关系和动作后果',
    '段尾才落判断',
    item.anchors.length ? `不得复读锚点标题 ${item.anchors.map((anchor) => compactPromptText(anchor, 42)).join('。')}` : '',
  ].filter(Boolean).join('。'))).join('\n');
}

function buildRevisionParagraphAnchorContracts(input: {
  plan: ReturnType<typeof buildRuntimeArticlePlan>;
  context: RuntimeArticleContext;
  materialPack?: Record<string, any>;
  paragraphCount: number;
}): Array<{ index: number; intent: string; role: string; anchors: string[] }> {
  const anchors = buildRewriteEvidenceAnchorList(input.context, input.materialPack).slice(0, 14);
  const referenceWeave = input.plan?.referenceWeave && typeof input.plan.referenceWeave === 'object'
    ? input.plan.referenceWeave
    : { sectionPlans: [] };
  const sectionPlans = Array.isArray(referenceWeave.sectionPlans)
    ? referenceWeave.sectionPlans
    : [];
  const fallbackAnchors = anchors.length ? anchors : ['本次资料包的核心材料关系'];
  const roles = [
    '功能 开口。只写本次主题的现实入口和第一层压力，不展开全篇结论。第一段先写资料包明示对象，题目陈述句只能放在段末，禁止用对照骨架起笔。',
    '功能 拆概念。说明核心对象的变化怎样先于后果改变现实位置。第二段必须换对象，不得复用第一段首句名词。',
    '功能 承材料。把现实后果写成资料包中已经命名的事件、概念和关系链。第三段必须换对象，不得复用前两段首句名词。',
    '功能 转判断。说明约束条件怎样改变行动预期和后续安排。第四段必须换对象。',
    '功能 加限制。写一个现实约束或反例，防止文章只剩单向判断。第五段必须换对象。',
    '功能 收束。回到题目，给出完整判断，不能悬置成问题。第六段必须换对象。',
    '功能 余波。若有第七段，只写现实后果，不另开新论题。第七段必须换对象。',
    '功能 尾声。若有第八段，只收拢意象和判断，不重复前文。第八段必须换对象。',
  ];
  return Array.from({ length: Math.max(6, input.paragraphCount) }, (_, index) => {
    const sectionPlan = sectionPlans[index % Math.max(1, sectionPlans.length)];
    const planAnchors = Array.isArray(sectionPlan?.anchors)
      ? sectionPlan.anchors.map((item) => sanitizePromptSurfaceText([
        item.name,
        item.use ? compactPromptText(String(item.use), 160) : '',
      ].filter(Boolean).join('。')))
      : [];
    const picked = uniqueStrings([
      ...planAnchors,
      fallbackAnchors[index % fallbackAnchors.length],
      fallbackAnchors[(index + 1) % fallbackAnchors.length],
    ]).slice(0, 3);
    return {
      index,
      intent: sectionPlan?.sectionTitle
        ? `承接 ${sectionPlan.sectionTitle} 的任务`
        : '推进主判断并落到可见材料',
      role: roles[index] || '功能 推进。承接上一段但不得重复上一段句子。',
      anchors: picked.length ? picked : fallbackAnchors.slice(0, 1),
    };
  });
}

function buildArticleParagraphRevisionPrompt(input: {
  topic: string;
  paragraphIndex: number;
  current: string;
  previous: string;
  next: string;
  issues: ArticleRevisionIssue[];
  evidenceAnchors: string[];
  materialPack?: Record<string, any>;
  paragraphBlueprint?: Record<string, any>;
  factBoundaryStrict?: boolean;
  previousCandidateRejections?: Array<Record<string, any>>;
}): { system: string; user: string } {
  const materialContract = renderRevisionMaterialContractPrompt(input.materialPack);
  const paragraphContract = renderTargetParagraphBlueprintContract(input.paragraphBlueprint, input.paragraphIndex);
  const rejectionFeedback = renderParagraphCandidateRejectionFeedback(input.previousCandidateRejections || []);
  return {
    system: [
      '你是 ContentBase 段落级重写模型。只重写指定自然段。',
      '你必须保留全文主题、论点方向和资料边界，只修复审稿指出的段落问题。',
      input.factBoundaryStrict
        ? `严格事实边界开启。输出必须是 JSON 对象，且只包含 body 和 factClaims。body 只能是一段完整中文自然段。factClaims 只声明第${toChineseNumeral(input.paragraphIndex + 1)}段正文里出现的具体事实。`
        : '输出只能是一段完整中文自然段。不得输出标题、解释、编号、列表、JSON、Markdown 或修改说明。',
      input.factBoundaryStrict
        ? `factClaims 每项必须包含 text、atomIds、inference、paragraphIndex。paragraphIndex 必须等于 ${input.paragraphIndex}。atomIds 只能使用本段段落蓝图 allowedAtoms 中的 id。不得引用其他段的 atom。`
        : '',
      '输出段落不得短于二百二十个中文字符，写成六到八个完整句子，否则会被拒收。',
      '这一段只允许中文汉字、中文逗号、中文句号和普通换行。不得出现冒号、引号、括号、方括号、英文字母、阿拉伯数字、来源编号或技术缩写。',
      '不得出现分号、破折号和顿号，所有转折都拆成新的中文句号句。',
      '句法硬禁令：定义翻转、对照骨架、工具链说明句和靠字骨架一律不能保留。',
      '不得把不是而是改成并非而是、并不是而是、不是偶然而是、不是漏洞是、并非偶然失误而是等替身句。',
      '遇到对照判断时必须拆成三句。第一句写材料对象，第二句写现实后果，第三句写短判断。',
      '如果审稿问题包含受限风格源泄漏，必须删除该来源的书名、人物、地点和标志性意象，不得换一种方式继续写它。',
      '这一段首句必须更换对象或动作，不能延续上一段的开头词。',
      '不要直接引用公告、名单、证书或系统字段，把它们改成自然转述。',
      '必须继续服从材料功能分工。只使用允许前景化的事实锚点，理论材料只能化成判断骨架，受限风格源不得进入段落。',
      '不得写某某提醒我们、根据某理论、材料显示、来源指出等来源展示句。',
      '不得出现完成筛选、完成治理、完成支配、完成转化、完成闭合。必须改成 FactPack 支持的对象变化、行动受限、成本上升、关系改写或谈判承压。',
      '不得出现闭环、静默、沉淀、机制、结构性、流程化、系统运转、运行逻辑、治理逻辑。需要表达时换成资料已明示的动作、后果和现实约束。',
      '前一轮提出的问题、改写动作和禁止动作是段落重写合同。必须改变句子骨架，不得保留同构句式。',
      '事实关系不变，表达顺序要变。先写资料包里已有对象，事件和后果，再写判断。',
      '段落必须能接上前一段，也能自然过渡到后一段。',
    ].join('\n'),
    user: [
      `主题 ${sanitizePromptSurfaceText(input.topic)}`,
      `目标段落 第${toChineseNumeral(input.paragraphIndex + 1)}段`,
      '',
      '前一段摘要',
      sanitizePromptSurfaceText(compactPromptText(input.previous, 260) || '无'),
      '',
      '需要重写的段落',
      sanitizePromptSurfaceText(input.current),
      '',
      '后一段摘要',
      sanitizePromptSurfaceText(compactPromptText(input.next, 260) || '无'),
      '',
      '审稿问题',
      ...input.issues.map((item, index) => renderRevisionIssuePrompt(item, index)),
      '',
      '可化用资料锚点',
      input.evidenceAnchors.map((item, index) => sanitizePromptSurfaceText(`${index + 1}. ${item}`)).join('\n') || '无',
      '',
      '材料功能分工和主论证线',
      materialContract,
      '',
      '本段 Paragraph Blueprint',
      paragraphContract,
      '',
      '上一版候选拒收原因',
      rejectionFeedback,
      '',
      input.factBoundaryStrict
        ? `请只输出 JSON。格式为 {"body":"重写后的这一段正文","factClaims":[{"text":"本段具体事实","atomIds":["本段允许的 fact_atom"],"inference":false,"paragraphIndex":${input.paragraphIndex}}]}。如果本段只写概括判断，没有具体事实，factClaims 输出空数组。`
        : '请只输出重写后的这一段正文。',
    ].join('\n'),
  };
}

function renderTargetParagraphBlueprintContract(value: Record<string, any> | undefined, paragraphIndex: number): string {
  const paragraphs = Array.isArray(value?.paragraphs) ? value?.paragraphs as Array<Record<string, any>> : [];
  const item = paragraphs.find((paragraph) => Number(paragraph.index) === paragraphIndex) || paragraphs[paragraphIndex];
  if (!item) return '无';
  return sanitizePromptSurfaceText(JSON.stringify({
    index: item.index,
    role: item.role,
    intent: item.intent,
    requiredAtomIds: item.requiredAtomIds,
    allowedAtoms: Array.isArray(item.allowedAtoms)
      ? item.allowedAtoms.map((atom: any) => ({
        id: atom.id,
        type: atom.type,
        value: compactPromptText(String(atom.value || atom.sourceText || ''), 180),
      }))
      : [],
    writerRule: item.writerRule,
    verifierRule: item.verifierRule,
  }, null, 2));
}

function renderParagraphCandidateRejectionFeedback(rejections: Array<Record<string, any>>): string {
  if (!rejections.length) return '无';
  return rejections.slice(-3).map((item, index) => sanitizePromptSurfaceText([
    `${index + 1}. 候选被拒收`,
    Array.isArray(item.reasons) && item.reasons.length ? `原因 ${item.reasons.join('、')}` : '',
    item.excerpt ? `片段 ${item.excerpt}` : '',
    '下一版必须改换句法，不得换词保留同一骨架',
  ].filter(Boolean).join('。'))).join('\n');
}

function renderRevisionIssuePrompt(item: ArticleRevisionIssue, index: number): string {
  const evidence = item.reviewerEvidence || {};
  return sanitizePromptSurfaceText([
    `${index + 1}. ${item.issueType}`,
    summarizeRevisionViolationForCandidate(item.ruleId, item.message),
    item.excerpt ? `命中类型 ${summarizeRevisionIssueExcerpt(item)}` : '',
    evidence.badReason ? `坏因 ${summarizeRevisionReviewerReason(evidence.badReason)}` : '',
    evidence.rewriteActions?.length ? `改写动作 ${summarizeRevisionRewriteActions(evidence.rewriteActions)}` : '',
    evidence.forbiddenMoves?.length ? `禁止动作 ${summarizeRevisionForbiddenMoves(evidence.forbiddenMoves)}` : '',
    evidence.targetShape ? `目标形态 ${summarizeRevisionTargetShape(evidence.targetShape)}` : '',
  ].filter(Boolean).join('。'));
}

function summarizeRevisionReviewerReason(reason: string): string {
  if (/对称否定|不是|而是|抽象定义/.test(reason)) return '先解释概念后展示材料，显出定义腔';
  if (/机械对照|不靠|靠/.test(reason)) return '判断被压成口号式对照，缺少动作层';
  if (/通过|工具链|翻译腔/.test(reason)) return '动作被写成说明书式工具链';
  if (/抽象|机制|结构|论文/.test(reason)) return '抽象词牵引段落，材料变成概念容器';
  return sanitizePromptSurfaceText(reason);
}

function summarizeRevisionRewriteActions(actions: string[]): string {
  const text = actions.map((item) => String(item || '')).join('。');
  const result: string[] = [];
  if (/删去|骨架|不是|而是|对称/.test(text)) result.push('删去定义骨架');
  if (/物件|动作|手续|等待|退回|盖章|签字|对象|后果|约束|现实/.test(text)) result.push('补入资料对象和现实后果');
  if (/判断|段尾|后半句/.test(text)) result.push('判断后置到段尾');
  if (/拆成|两到三句|每句/.test(text)) result.push('拆成两到三句短动作');
  if (/来源|理论|前景/.test(text)) result.push('隐藏来源标签，保留材料关系');
  return uniqueStrings(result).join('。') || '改变句子骨架，保留事实关系';
}

function summarizeRevisionTargetShape(shape: string): string {
  if (/物件|动作|资格|判断/.test(shape)) return '先写物件或动作，再写后果，段尾落短判断';
  if (/连续短句|动作在前|判断在后/.test(shape)) return '连续短句推进，动作在前，判断在后';
  if (/制度接口|抽象词/.test(shape)) return '现实后果承载判断，抽象判断只作收束';
  return sanitizePromptSurfaceText(shape);
}

function summarizeRevisionForbiddenMoves(moves: string[]): string {
  const normalized = moves.map((item) => String(item || '')).join('。');
  const summaries: string[] = [];
  if (/并非|不是|而是|却是|不只|更/.test(normalized)) {
    summaries.push('不要改成另一种定义翻转骨架');
  }
  if (/不靠|不在|而在|靠/.test(normalized)) {
    summaries.push('不要改成另一种对照骨架');
  }
  if (/形成一种|结构性|运行机制|系统|体系|逻辑/.test(normalized)) {
    summaries.push('不要用抽象结构词补句');
  }
  if (/借由|依托|实现|体现|展示/.test(normalized)) {
    summaries.push('不要用工具链说明句');
  }
  return uniqueStrings(summaries).join('。') || '不要复用审稿指出的坏句法';
}

function summarizeRevisionIssueExcerpt(item: ArticleRevisionIssue): string {
  const issueType = String(item.issueType || '');
  const ruleId = String(item.ruleId || '');
  const category = String(item.category || '');
  if (/punct|PUNCT|banned_punctuation/.test(`${issueType} ${ruleId}`)) {
    return '含禁用符号，改成逗号句或句号句';
  }
  if (/ascii|ASCII/.test(`${issueType} ${ruleId}`)) {
    return '含英文数字或技术缩写，改成自然中文';
  }
  if (/not_but|not_rely|syntax_ai_tone|SYNTAX/.test(`${issueType} ${category} ${ruleId}`)) {
    return '含定义翻转或对照骨架，拆成动作句和结果句';
  }
  if (/source|material_digestion/.test(`${issueType} ${category} ${ruleId}`)) {
    return '来源或理论被前景化，改成沉默支撑';
  }
  if (/plain_format|format/.test(`${issueType} ${category} ${ruleId}`)) {
    return '段首编号或列表格式，改成普通自然段';
  }
  if (/fact_boundary|unsupported/.test(`${issueType} ${category} ${ruleId}`)) {
    return '出现材料外现场或精确细节，删除无证细节';
  }
  return '按审稿规则重写，不复述原句';
}

function buildArticleParagraphPlan(targetWordCount: number): {
  paragraphCount: number;
  minParagraphChars: number;
  maxParagraphChars: number;
} {
  const normalized = Number.isFinite(targetWordCount) && targetWordCount > 0
    ? targetWordCount
    : 1800;
  if (normalized >= 9000) {
    return {
      paragraphCount: 18,
      minParagraphChars: 420,
      maxParagraphChars: 700,
    };
  }
  if (normalized >= 6000) {
    return {
      paragraphCount: 14,
      minParagraphChars: 360,
      maxParagraphChars: 620,
    };
  }
  if (normalized >= 3600) {
    return {
      paragraphCount: 9,
      minParagraphChars: 320,
      maxParagraphChars: 560,
    };
  }
  if (normalized >= 2200) {
    return {
      paragraphCount: 7,
      minParagraphChars: 300,
      maxParagraphChars: 500,
    };
  }
  return {
    paragraphCount: 6,
    minParagraphChars: 240,
    maxParagraphChars: 380,
  };
}

function normalizeArticleRequestedTargetChars(input: {
  plan?: Record<string, any>;
  acceptanceContract?: Record<string, any>;
}): number {
  const planTarget = Number(input.plan?.targetWordCount || 0);
  const acceptanceMin = readArticleAcceptanceMinimumChars(input.acceptanceContract);
  const requested = Number.isFinite(planTarget) && planTarget > 0
    ? planTarget
    : acceptanceMin;
  return Math.max(acceptanceMin || 0, requested || 1800);
}

function readArticleAcceptanceMinimumChars(acceptanceContract?: Record<string, any>): number {
  const parts = Array.isArray(acceptanceContract?.parts) ? acceptanceContract.parts : [];
  const bodyPart = parts.find((item: any) => String(item?.id || '') === 'body') || parts[0];
  const value = Number(bodyPart?.minNonWhitespaceChars || 0);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function resolveArticleMinimumAcceptedChars(input: {
  targetWordCount: number;
  acceptanceContract?: Record<string, any>;
}): number {
  const acceptanceMin = readArticleAcceptanceMinimumChars(input.acceptanceContract);
  const targetMin = Math.floor(Number(input.targetWordCount || 0) * 0.9);
  return Math.max(acceptanceMin || 0, targetMin || 0, 1800);
}

function buildArticleModelRewriteFeedback(input: {
  body: string;
  acceptanceContract?: Record<string, any>;
  targetWordCount: number;
  topic: string;
  plan: ReturnType<typeof buildRuntimeArticlePlan>;
  context: RuntimeArticleContext;
  materialPack?: Record<string, any>;
  styleGuard?: RestrictedStyleForegroundGuard;
}): { system: string; user: string; findings: string[] } | null {
  const body = String(input.body || '');
  const nonWhitespaceChars = body.replace(/\s+/g, '').length;
  const paragraphs = body
    .split(/\n{2,}/)
    .map((item) => item.replace(/\s+/g, '').trim())
    .filter(Boolean);
  const minChars = resolveArticleMinimumAcceptedChars({
    targetWordCount: input.targetWordCount,
    acceptanceContract: input.acceptanceContract,
  });
  const policy = input.acceptanceContract?.policy && typeof input.acceptanceContract.policy === 'object'
    ? input.acceptanceContract.policy as Record<string, any>
    : {};
  const factBoundaryStrict = Boolean(policy.factBoundaryStrict);
  const bannedTerms = Array.isArray(policy.bannedTerms)
    ? policy.bannedTerms.map(String).filter(Boolean)
    : [];
  const bannedPunctuation = Array.isArray(policy.bannedPunctuation)
    ? policy.bannedPunctuation.map(String).filter(Boolean)
    : [];
  const findings: string[] = [];

  const punctuationHit = bannedPunctuation.find((item) => item && body.includes(item));
  const quoteHit = body.match(/[“”"‘’']/u)?.[0];
  if (punctuationHit || /[:：—–-]|--|[()[\]【】]/u.test(body) || quoteHit) {
    findings.push('正文仍有冒号、引号、解释性符号、横线连接句、括号或方括号。不要写公告原文和引语，把它们改成转述。');
  }
  const styleGuard = input.styleGuard || buildRestrictedStyleForegroundGuard({
    stylePack: input.context.stylePack,
    materialPack: input.materialPack,
  });
  const syntaxHits = collectArticleForbiddenSyntaxHits(body, styleGuard).slice(0, 8);
  if (syntaxHits.length) {
    findings.push(`正文仍有禁用句法 ${syntaxHits.map((item) => `「${sanitizePromptSurfaceText(item)}」`).join('、')}。必须删掉这些骨架，改成三句以内的动作链，先写物件或手续，再写后果。`);
  }
  const styleLeak = detectRestrictedStyleForegroundLeak(body, styleGuard);
  if (styleLeak) {
    findings.push(`正文仍出现受限风格源题材「${sanitizePromptSurfaceText(styleLeak)}」。只能保留句法、节奏和段落推进，不得写入风格源人物、地点或标志性意象。`);
  }
  const abstractRegisterHit = body.match(/(?:形成一种|构成一种|系统运转|运行机制|治理逻辑|机制|体系|闭环|沉淀|勾勒|场景|结构性|技术化|标准化|流程化)/u)?.[0];
  if (abstractRegisterHit) {
    findings.push(`正文仍有抽象套语「${sanitizePromptSurfaceText(abstractRegisterHit)}」。必须换成 FactPack 已明示的对象变化、行动受限、成本变化、关系改写或现实后果。`);
  }
  const unsupportedPrecisionHit = body.match(/[一二三四五六七八九十百千万零\d]{1,4}(?:小时|天|日|周|月|年|份|次|页|段|组|个|家|名)/u)?.[0];
  if (unsupportedPrecisionHit) {
    findings.push(`正文出现材料外精确数量或时间「${sanitizePromptSurfaceText(unsupportedPrecisionHit)}」。没有资料逐字支撑时，一律改成若干、多次、临近、此前此后、少数、多家等概括关系。`);
  }
  findings.push(...buildTopicJudgmentRewriteFindings(input.topic, body));
  const duplicatePairs = findNearDuplicateParagraphPairs(paragraphs);
  if (duplicatePairs.length > 0) {
    findings.push(`正文第${duplicatePairs.map((pair) => `${toChineseNumeral(pair[0] + 1)}段和第${toChineseNumeral(pair[1] + 1)}段`).join('、')}高度重复。每段必须承担不同论证功能，不能复述同一段材料关系。`);
  }
  const asciiHit = body.match(/[A-Za-z0-9][A-Za-z0-9._-]*/)?.[0];
  if (asciiHit) {
    findings.push(`正文仍有英文、数字或技术缩写「${sanitizePromptSurfaceText(asciiHit)}」，必须改成自然中文说法。`);
  }
  const termHit = bannedTerms.find((term) => term && body.includes(term));
  if (termHit) {
    findings.push(`正文仍有禁用词「${sanitizePromptSurfaceText(termHit)}」，必须整段换说法，不能保留原句。`);
  }
  if (nonWhitespaceChars < minChars) {
    findings.push(`正文篇幅不足，当前约${toChineseNumeral(nonWhitespaceChars)}个中文字符，需要扩展为不少于${toChineseNumeral(minChars)}个中文字符。`);
  }
  if (paragraphs.length < 6 || paragraphs.length > 8) {
    findings.push(`正文段落数量不合格，当前${toChineseNumeral(paragraphs.length)}段，需要六到八个完整自然段。`);
  }
  const shortParagraphCount = paragraphs.filter((item) => item.length < 240).length;
  if (shortParagraphCount > 0) {
    findings.push(`正文有${toChineseNumeral(shortParagraphCount)}个自然段太薄，每段至少约二百四十个中文字符，需要补入材料对象，现实后果和判断推进。`);
  }
  const numberedParagraph = paragraphs.find((item) => /^([一二三四五六七八九十]+[、.．]|\d+[.)、])/.test(item));
  if (numberedParagraph) {
    findings.push('正文仍有段首编号或分点格式。必须改成普通自然段，不要保留四. 五. 六. 或一、二、三、。');
  }
  const repeatedOpenings = findRepeatedParagraphOpenings(paragraphs);
  if (repeatedOpenings.length > 0) {
    findings.push(`正文存在重复段首 ${repeatedOpenings.map((item) => `「${sanitizePromptSurfaceText(item)}」`).join('、')}。每段首句必须换对象或换动作，不能连续沿用同一组起手词。`);
  }
  const referenceCoverage = calculateArticleReferenceCoverage({
    body,
    plan: input.plan,
    context: input.context,
    sourcePassages: Array.isArray((input as any).sourcePassages) ? (input as any).sourcePassages : undefined,
  });
  if (referenceCoverage.score < referenceCoverage.threshold) {
    findings.push(`正文材料化用不足，当前覆盖约${toChineseNumeral(referenceCoverage.score)}，需要达到${toChineseNumeral(referenceCoverage.threshold)}。必须把资料锚点化入论证，不得只写空泛概念。`);
  }
  if (/(?:通过|具有|进行|基于).{0,18}(?:方式|变化|分析|体系|认证|评估|管理|传染性|资格|拒保|拒承)|在[^。！？\n]{1,24}层面|折射出|得以实现/u.test(body)) {
    findings.push('正文仍有欧化或公文腔句式。必须改成具体人物动作、物件、流程和短判断。');
  }

  if (!findings.length) {
    return null;
  }

  const evidenceAnchors = buildRewriteEvidenceAnchorPrompt(input.context, input.materialPack);
  const materialContract = renderRevisionMaterialContractPrompt(input.materialPack);
  return {
    findings,
    system: [
      '上一轮正文未通过验收。你必须整篇重写正文，不得修补局部句子。',
      `主题是${sanitizePromptSurfaceText(input.topic)}。必须保持同一主题、同一材料边界和同一作者倾向。`,
      `正文不少于${toChineseNumeral(minChars)}个中文字符，写成六到八个自然段。`,
      '每个自然段至少二百四十个中文字符，至少四句，段间用一个空行隔开。不要用一句话占一段。',
      '每一段只推进一个关系。先写一个对象或动作，再写后果，再写短判断。不要把多个对象塞进同一段开头。',
      '若上一轮篇幅不足，必须增加资料包里已有的具体对象，现实后果，材料对照，反例限制和结尾收束，禁止重复同一句判断。',
      '这属于重构正文任务。必须重新组织段落，写成完整中文文章。',
      '最终正文只允许中文汉字、中文逗号、中文句号和换行。',
      '不得出现解释性符号、横向分隔符、括号、方括号、引号、英文字母、阿拉伯数字、代码式编号、来源编号或技术缩写。',
      '句法硬禁令：定义翻转、对照骨架和工具链说明句一律不能保留。',
      '不要直接写联网报道原句，标题，来源名，公告原文或系统字段。需要表达时改成现实关系转述。',
      '不要自造默认场面、默认人物、默认器物、默认文件、默认电话和后台记录，除非资料明示。',
      '不要用问号推进判断。题目里的为什么也要改成陈述句，直接写原因和结果。',
      factBoundaryStrict
        ? '严格模式不接受顶层 factClaims。必须输出 {"paragraphs":[...]}，每段 item 包含 paragraphIndex、body、factClaims。'
        : '',
      '必须显式回答题目里的原因，并把题眼关键词写进判断链，不能只写概念巡游。',
      '不要编造精确统计数、比例、月份和机构数量。可以写多家、少数、许多、接连、临近、此前此后等概括关系。',
      '不得编造资料未明示的现场报告、通信记录、调度动作、设备画面、操作细节、具体实体动作和现场画面。FactPack 只给关系时，只写关系判断。',
      '不要写插入解释句。不要用横线把前后两个判断连起来。需要解释时，先用句号结束前一句，再另写一句。',
      '不要写定义翻转句，也不要写对照句。看到这类骨架必须整句拆掉，改成对象、动作、后果三步。',
      '需要表达现实压力，改写成 FactPack 支持的对象变化、行动受限、成本变化、关系改写或谈判承压。',
      '不得出现靠字骨架或定义翻转骨架。需要表达差异时拆成两三句，每句只写一个动作。',
      '不要使用抽象套语。需要表达时换成资料已明示的动作、后果和现实约束。',
      '尤其不要保留审稿证据中指出的词。若上一轮用了沉默相关表达，本轮改写为无声、悄然、没有声响或不发一言等自然表达。',
      '若资料化用不足，每一段至少嵌入一个本次资料里的具体对象，事件，概念或现实后果。不得在正文里写来源编号。',
      '不得写资料未明示的人物动作、器物细节、历史遗存、口号、企业反应或现场对白。',
      '不要自造默认场面、默认人物、默认器物、默认文件、默认电话和后台记录，除非资料明示。',
      '必须继续服从材料功能分工。事实材料承担论点压力，理论材料只提供解释结构，受限风格源不得重新写进正文。',
      '不得写某某提醒我们、根据某理论、材料显示、来源指出等来源展示句。',
      '不得编造精确天数、小时、份数、家数、人数、次数、周期、比例和金额。资料没有明确支撑时只能写概括关系。',
      '交稿前自检一遍。只要正文里还有解释性符号、定义翻转骨架、对照骨架、抽象套语、精确天数或份数，就必须继续重写，不得输出。',
      '如果任何自然段的开头和上一段共享同一组名词，就必须重写该段首句，改成新的对象或新的动作。',
      '如果段首出现四.、五.、六.、一、二、三、或其他编号格式，必须整段重写成普通自然段。',
    ].join('\n'),
    user: [
      '请直接修正下面的问题，不要复述这些问题本身',
      ...findings.map((item, index) => `${index + 1}. ${item}`),
      '',
      '不能保留的句法',
      '动作必须落到 FactPack 支持的对象变化、现实后果和约束条件。',
      '不得出现定义翻转句。',
      '表达差异时拆成两三句，每句只写一个动作，不写对称口号。',
      '不得出现 机制，闭环，结构性，流程化 这类抽象套语。',
      '',
      '可用资料，只作判断依据，不要写成资料标题',
      evidenceAnchors,
      '',
      '材料关系，只作主论证线，不要写成内部栏目',
      materialContract,
      '',
      `主题 ${sanitizePromptSurfaceText(input.topic)}`,
      '保留上一轮的论点和资料边界，但重新组织句子。',
      '不要用问号推进判断。题目里的为什么也要改成陈述句，直接写原因和结果。',
      '必须显式回答题目里的原因，并把题眼关键词写进判断链，不能只写概念巡游。',
      '第一段只能开入口，后面每段都必须换一个新开头对象或新动作。不要让多个段落以同一组名词连续起笔。',
      '不要出现编号段落标题，不要写四. 五. 六. 这种段首编号。',
      '请沿用同一资料重新写完整正文。不要解释修改过程，不要输出标题，不要分点。',
      factBoundaryStrict ? '输出必须是 paragraphs JSON，不要输出顶层 body 加 factClaims。' : '',
    ].join('\n'),
  };
}

function buildRewriteEvidenceAnchorPrompt(context: RuntimeArticleContext, materialPack?: Record<string, any>): string {
  return buildRewriteEvidenceAnchorList(context, materialPack).slice(0, 10).join('\n') || '无';
}

function collectArticleForbiddenSyntaxHits(body: string, styleGuard?: RestrictedStyleForegroundGuard): string[] {
  const text = String(body || '');
  const styleLeak = styleGuard ? detectRestrictedStyleForegroundLeak(text, styleGuard) : null;
  const patterns = [
    /(?:不是|并非)[^。！？\n]{0,80}(?:而是|却是|只是)[^。！？\n]{0,80}/gu,
    /不(?:靠|在|是)[^。！？\n]{0,80}(?:靠|而靠|而在|而是|而在于)[^。！？\n]{0,80}/gu,
    /(?:靠的是|而靠|是靠)[^。！？\n]{0,80}/gu,
    /通过[^。！？\n]{0,80}/gu,
    /基于[^。！？\n]{0,80}/gu,
    /具有[^。！？\n]{0,24}性[^。！？\n]{0,40}/gu,
    /进行[^。！？\n]{0,80}/gu,
    /在[^。！？\n]{1,24}层面[^。！？\n]{0,40}/gu,
    /折射出[^。！？\n]{0,80}/gu,
    /得以实现[^。！？\n]{0,80}/gu,
    /沉淀[^。！？\n]{0,80}/gu,
    /(?:这说明|提醒我们|材料显示|根据)[^。！？\n]{0,80}/gu,
  ];
  return uniqueStrings([
    ...(styleLeak ? [styleLeak] : []),
    ...patterns.flatMap((pattern) => text.match(pattern) || []),
  ]);
}

function buildRewriteEvidenceAnchorList(context: RuntimeArticleContext, materialPack?: Record<string, any>): string[] {
  const topic = String(materialPack?.topic || context.semantic?.query || '').trim();
  const materialFunctionItems = Array.isArray(materialPack?.materialFunctionPlan?.items)
    ? materialPack?.materialFunctionPlan?.items
    : [];
  const functionalAnchors = materialFunctionItems
    .filter((item: any) => item?.bodyUse === 'foreground' || item?.function === 'theory_skeleton')
    .slice(0, 8)
    .map((item: any, index: number) => sanitizePromptSurfaceText([
      `${index + 1}. ${item.title || item.id || '材料'}`,
      item.function ? `功能 ${item.function}` : '',
      item.claimBinding ? `绑定 ${item.claimBinding}` : '',
      item.summary ? `摘要 ${compactPromptText(String(item.summary), 220)}` : '',
    ].filter(Boolean).join('。')));
  const evidenceChunkAnchors = (Array.isArray(materialPack?.evidencePackChunks) ? materialPack?.evidencePackChunks : [])
    .filter((item: any) => !isStyleOrBroadCorpusAnchorMaterial([
      item.title,
      item.id,
      item.sourceId,
      item.text,
      item.excerpt,
      item.summary,
      ].map((value) => String(value || '')).join(' ')))
    .slice(0, 8)
    .map((item: any, index: number) => sanitizePromptSurfaceText([
      `${index + 1}. ${item.title || item.id || '资料切块'}`,
      item.text ? `材料 ${compactPromptText(String(item.text), 220)}` : '',
    ].filter(Boolean).join('。')));
  const citationAnchors = (Array.isArray(materialPack?.evidenceCitations) ? materialPack?.evidenceCitations : [])
    .filter((item: any) => !isStyleOrBroadCorpusAnchorMaterial([
      item.title,
      item.id,
      item.sourceId,
      item.excerpt,
      item.summary,
    ].map((value) => String(value || '')).join(' ')))
    .slice(0, 6)
    .map((item: any, index: number) => sanitizePromptSurfaceText([
      `${index + 1}. ${item.title || item.id || '资料引用'}`,
      item.excerpt ? `材料 ${compactPromptText(String(item.excerpt), 220)}` : '',
    ].filter(Boolean).join('。')));
  const sourcePassageAnchors = (Array.isArray(materialPack?.sourcePassages) ? materialPack?.sourcePassages : [])
    .slice(0, 8)
    .map((item: any, index: number) => sanitizePromptSurfaceText([
      `${index + 1}. ${item.title || item.id || '用户资料'}`,
      item.excerpt ? `材料 ${compactPromptText(String(item.excerpt), 220)}` : '',
    ].filter(Boolean).join('。')));
  const semanticAnchors = (Array.isArray(materialPack?.semanticUnits) ? materialPack?.semanticUnits : [])
    .filter((unit: any) => !isStyleOrBroadCorpusAnchorMaterial([
      unit.title,
      unit.sourceTitle,
      unit.id,
      unit.summary,
      unit.excerpt,
    ].map((value) => String(value || '')).join(' ')))
    .slice(0, 6)
    .map((unit: any, index: number) => sanitizePromptSurfaceText([
      `${index + 1}. ${unit.title || unit.sourceTitle || '语义材料'}`,
      unit.summary || unit.excerpt || '',
    ].filter(Boolean).join('。')));
  const anchors = uniqueStrings([
    ...functionalAnchors,
    ...evidenceChunkAnchors,
    ...citationAnchors,
    ...sourcePassageAnchors,
    ...semanticAnchors,
  ])
    .filter(Boolean)
    .filter((item) => !topic || !shouldRejectOffTopicMaterialText(topic, item));
  return anchors;
}

export function findRepeatedParagraphOpenings(paragraphs: string[]): string[] {
  const openings = paragraphs
    .map((paragraph) => paragraph.replace(/\s+/g, '').slice(0, 4))
    .filter(Boolean);
  const counts = new Map<string, number>();
  for (const opening of openings) {
    counts.set(opening, (counts.get(opening) || 0) + 1);
  }
  return Array.from(counts.entries())
    .filter(([, count]) => count >= 2)
    .map(([opening]) => opening)
    .slice(0, 8);
}

function renderRevisionMaterialContractPrompt(materialPack?: Record<string, any>): string {
  const argumentDigest = materialPack?.argumentDigest && typeof materialPack.argumentDigest === 'object'
    ? materialPack.argumentDigest as Record<string, any>
    : {};
  const materialFunctionPlan = materialPack?.materialFunctionPlan && typeof materialPack.materialFunctionPlan === 'object'
    ? materialPack.materialFunctionPlan as Record<string, any>
    : {};
  const items = Array.isArray(materialFunctionPlan.items) ? materialFunctionPlan.items : [];
  const rejected = Array.isArray(materialFunctionPlan.rejected) ? materialFunctionPlan.rejected : [];
  const foreground = items.filter((item: any) => item.bodyUse === 'foreground').slice(0, 6);
  const skeletons = items.filter((item: any) => item.function === 'theory_skeleton').slice(0, 4);
  const silent = items.filter((item: any) => item.bodyUse === 'silent').slice(0, 6);
  const rules = Array.isArray(argumentDigest.antiPatchworkRules) ? argumentDigest.antiPatchworkRules : [];
  const citationSilenceRules = Array.isArray(argumentDigest.citationSilenceRules) ? argumentDigest.citationSilenceRules : [];
  return [
    sanitizePromptSurfaceText(`中心判断 ${argumentDigest.centralClaim || ''}`),
    sanitizePromptSurfaceText(`材料规则 ${argumentDigest.materialUseRule || ''}`),
    '事实锚点和解释锚点必须在正文里留下可见词面，不能全部退成抽象关系。',
    '至少让一条主锚点和一条解释锚点进入段落判断。',
    ...rules.slice(0, 5).map((item: any, index: number) => sanitizePromptSurfaceText(`防拼贴 ${index + 1}. ${item}`)),
    ...citationSilenceRules.slice(0, 5).map((item: any, index: number) => sanitizePromptSurfaceText(`来源沉默 ${index + 1}. ${item}`)),
    '允许前景材料',
    foreground.map((item: any, index: number) => sanitizePromptSurfaceText(`${index + 1}. ${item.title || item.id || ''}。功能 ${item.function || ''}。${item.claimBinding || ''}`)).join('\n') || '无',
    '解释锚点',
    skeletons.map((item: any, index: number) => sanitizePromptSurfaceText(`${index + 1}. ${item.title || item.id || ''}。${item.claimBinding || ''}`)).join('\n') || '无',
    '必须沉默或拒绝',
    [...silent, ...rejected].slice(0, 8).map((item: any, index: number) => sanitizePromptSurfaceText(`${index + 1}. ${item.title || item.id || ''}。${item.reason || '不得进入正文前景'}`)).join('\n') || '无',
  ].filter(Boolean).join('\n') || '无';
}

function buildRevisionMaterialFunctionSummary(materialPack?: Record<string, any>): Record<string, any> | null {
  const materialFunctionPlan = materialPack?.materialFunctionPlan && typeof materialPack.materialFunctionPlan === 'object'
    ? materialPack.materialFunctionPlan as Record<string, any>
    : null;
  if (!materialFunctionPlan) return null;
  const items = Array.isArray(materialFunctionPlan.items) ? materialFunctionPlan.items : [];
  return {
    version: String(materialFunctionPlan.version || ''),
    foreground: items
      .filter((item: any) => item.bodyUse === 'foreground')
      .slice(0, 8)
      .map((item: any) => ({
        title: String(item.title || item.id || ''),
        function: String(item.function || ''),
      })),
    silent: items
      .filter((item: any) => item.bodyUse === 'silent')
      .slice(0, 8)
      .map((item: any) => ({
        title: String(item.title || item.id || ''),
        function: String(item.function || ''),
      })),
  };
}

function buildArticleBodyBlueprintPrompt(input: {
  topic: string;
  plan: ReturnType<typeof buildRuntimeArticlePlan>;
  paragraphPlan: ReturnType<typeof buildArticleParagraphPlan>;
  targetWordCount: number;
}): string {
  const sectionBlueprint = getRuntimeArticlePlanSections(input.plan).slice(0, 6).map((section, index) => [
    `${index + 1} ${section.title}`,
    section.intent ? `任务 ${section.intent}` : '',
    section.requiredTerms.length ? `词 ${section.requiredTerms.join('、')}` : '',
    section.evidenceTitles.length ? `证据 ${section.evidenceTitles.join('、')}` : '',
  ].filter(Boolean).join(' '));

  const explicitParagraphs = [
    `第一段 从「${input.topic}」对应的资料对象或现实后果起笔，先写可见事实和第一层压力，题目判断只能放在段末一句，禁止用不是而是、不是靠也不是靠等对照骨架起笔`,
    '第二段 把核心概念拆开，至少承接一个事实锚点的核心词，说明资料明示的对象变化怎样产生影响',
    '第三段 把材料和判断合在一起，至少承接一个案例或事实锚点的核心词，说明现实风险如何传导到行动预期和后续安排',
    '第四段 写出结构差异，把现实威胁和现实反应分开处理，落到资料明示的后果，用具体动作和后果收束，不要写成定义翻转句。',
    '第五段 补一个对照、限制或反例，让判断落稳，不要只重复前文',
    '第六段 把结论收回到现实后果或可观察影响，完成明确收束',
  ];

  return [
    `总长度 至少 ${input.targetWordCount} 个中文字符`,
    `自然段 至少 ${input.paragraphPlan.paragraphCount} 段`,
    `每段长度 至少 ${input.paragraphPlan.minParagraphChars} 个中文字符，理想上不要超过 ${input.paragraphPlan.maxParagraphChars} 个中文字符`,
    '每段至少四句，段内必须有承接、推进和收束，不要一句一行。',
    '每一段首句都必须换对象或换动作，不许连续两段用同一组名词开头。上一段已经用过某个 FactPack 对象时，下一段必须换成别的对象或直接换成后果。',
    '正文不要标题、序号、分点、括号解释、冒号解释、破折号转折或 Markdown。',
    '正文不要先下总结，再补材料。必须先写具体对象，再写判断。',
    ...explicitParagraphs,
    ...sectionBlueprint.length ? ['可执行章节锚点', ...sectionBlueprint] : [],
  ].join('\n');
}

function buildArticleSurfaceSyntaxContractPrompt(): string {
  return [
    '正文表面句法合同。',
    '只允许中文汉字、中文逗号、中文句号和自然段换行进入正文。',
    '正文不得出现冒号、破折号、引号、括号、方括号、英文字母、阿拉伯数字、来源编号、Markdown 标记。',
    '正文不得出现问号。题目中的为什么也必须改成陈述句，不要写成提问。',
    '正文不得出现来源名外显。不要写柯林斯、布迪厄、帕斯隆、韦伯、帕金、诺斯、沃利斯、温加斯特、金阁寺、兴亡的世界史，也不要写第几章、第几条、英文字母占位词或数据库系统名。',
    '理论材料只能变成关系。把材料里的抽象关系改写成资料已明示的对象变化、现实后果和约束条件，不要写理论名。',
    '禁止句法骨架。不要使用定义翻转句、对照句、工具链说明句、来源展示句、双重是否判断和被动式所字结构。',
    '也不要使用抽象套语、流程套语和解释型套语。',
    '不得写在某某层面、折射出、得以实现、体系、实现、基于、具有某某性、进行这类翻译腔。换成具体对象上、显出、能够维持、整体安排、做到、从某处出发、带着某种后果、直接做某事。',
    '允许的写法只保留因果和位置差。先写对象，再写动作，再写后果。需要表达差异时拆成两句，先写资料对象或动作，再写现实后果。',
    '每段首句必须换对象或换动作。不要连续两段用同一组开头词，尤其不要重复同一个 FactPack 对象。',
    '需要解释时不要用冒号。先写物件，再写动作，再用一句短判断收束。不要写是否……是否……这种双重判断句。',
    '第一段先写资料对象或现实后果，题目陈述句只能放在段末一句，禁止在第一段使用不是而是、不是靠也不是靠、不在而在等对照骨架。',
  ].join('\n');
}

function buildGroundedOpeningContractPrompt(input: {
  topic?: string;
  sourcePassages: Array<Record<string, any>>;
  materialPack?: Record<string, any>;
  context: RuntimeArticleContext;
}): string {
  const topic = String(input.topic || input.materialPack?.topic || '').trim();
  const sourceTitles = input.sourcePassages
    .filter((item) => !isSourcePassageMetaRecovery(
      String(item.title || item.sourceTitle || item.name || item.sourceId || ''),
      String(item.excerpt || item.text || item.summary || ''),
    ))
    .map((item) => String(item.title || item.sourceTitle || item.name || item.sourceId || '').trim())
    .filter(Boolean);
  const materialTitles = [
    ...toStringList((input.materialPack?.materialFunctionPlan as any)?.items?.map?.((item: any) => item.title || item.id) || []),
    ...toStringList((input.materialPack?.evidencePackSources as any[])?.map?.((item: any) => item.title || item.sourceTitle || item.id) || []),
    ...toStringList((input.materialPack?.evidencePackChunks as any[])?.map?.((item: any) => item.title || item.sourceTitle || item.id) || []),
    ...toStringList(input.context.evidence.items.map((item) => item.title)),
    ...toStringList(input.context.semantic.units.map((unit) => unit.sourceTitle)),
  ].filter(Boolean);
  const anchors = uniqueStrings([...sourceTitles, ...materialTitles])
    .map((item) => sanitizePromptSurfaceText(item))
    .filter((item) => item && (!topic || !shouldRejectOffTopicMaterialText(topic, item)))
    .slice(0, 12);
  return [
    '第一段只能从下列资料对象或其明示关系起笔。',
    anchors.length ? anchors.map((item, index) => `${index + 1}. ${item}`).join('\n') : '1. 本次资料包的核心材料对象',
    '禁止合成资料外小剧场。不得写资料未明示的人物动作、器物细节、办公对白、交易动作或现场物件。',
    '也不得把资料未明示的物件当作默认开场。只有资料原文明确要求时，才可在后文短暂使用一次。',
    '没有资料明示的数量、时间、机构内部流程和人物身份，一律不能写成事实。',
  ].join('\n');
}

function getRuntimeArticlePlanSections(plan: ReturnType<typeof buildRuntimeArticlePlan>): Array<{
  title?: string;
  intent?: string;
  requiredTerms?: string[];
  evidenceTitles?: string[];
}> {
  if (!plan || !Array.isArray((plan as any).sections)) {
    throw new Error('runtime article plan requires sections before prompt, evaluation, or revision');
  }
  return (plan as any).sections;
}

function sanitizePromptSurfaceText(value: string): string {
  return String(value || '')
    .replace(/\b(?:EvidencePack|StylePack|DataBase)\b/gi, '资料库')
    .replace(/不是[^。！？\n]{1,48}(?:而是|却是|只是)[^。！？\n]{1,60}/g, '这里保留关系判断')
    .replace(/并非[^。！？\n]{1,48}而是[^。！？\n]{1,60}/g, '这里保留关系判断')
    .replace(/不(?:靠|在|是)[^。！？\n]{1,36}(?:靠|而在|而是)[^。！？\n]{1,60}/g, '这里保留动作后果')
    .replace(/(?:可用句式材料|写作接口|可用结构|可用方向|适合解决的问题)/g, '材料说明')
    .replace(/[：:]/g, ' ')
    .replace(/[—–]{1,2}|--/g, ' ')
    .replace(/[A-Za-z]+(?:[\/._-][A-Za-z0-9]+)*/g, ' ')
    .replace(/\d+/g, (match) => toChineseNumeral(Number(match)))
    .replace(/[（）()]/g, ' ')
    .replace(/[【】\[\]{}]/g, ' ')
    .replace(/[\/\\]/g, ' ')
    .replace(/[？?]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/机制/g, '运作')
    .replace(/体系/g, '结构')
    .replace(/算法/g, '规则')
    .replace(/闭环/g, '回路')
    .replace(/静默/g, '沉默')
    .replace(/性张力/g, '牵扯')
    .replace(/张力/g, '牵扯')
    .replace(/沉淀/g, '积累')
    .replace(/适合解决的问题/g, '可用于说明的问题')
    .replace(/正在于此/g, '在这里')
    .trim();
}

function isSourcePassageMetaRecovery(title: string, excerpt: string): boolean {
  const haystack = `${title || ''} ${excerpt || ''}`;
  return /恢复说明|被覆盖文件|逐字还原|来源锚点|runtime evidence|已能读回|结构化恢复|错误当成最终文案投影/i.test(haystack);
}

function compileSourcePassageFactPhrases(value: string): string {
  const text = compactPromptText(sanitizeSourcePassageMaterialText(value), 220);
  if (!text) return '';
  return `材料槽 ${text}。写法 只取对象、动作、关系和后果，不复写原句，不补资料外细节`;
}

function sanitizeSourcePassageMaterialText(value: string): string {
  const lines = String(value || '')
    .split(/\r?\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !/^>/.test(line))
    .filter((line) => !isNoisySourcePassageLine(line))
    .filter((line) => !/^(可用句式材料|写作接口|可用结构|可用方向|适合解决的问题)[：:]/.test(line))
    .filter((line) => !/恢复说明|逐字还原|来源锚点|runtime evidence|已能读回|结构化恢复/i.test(line));
  return lines.join('。')
    .replace(/\|[^。！？\n]{0,240}\|/g, ' ')
    .replace(/（[^）]*[A-Za-z][^）]*）/g, ' ')
    .replace(/\([^)]*[A-Za-z][^)]*\)/g, ' ')
    .replace(/[A-Za-z]+(?:[ \t._/-]+[A-Za-z0-9]+)*/g, ' ')
    .replace(/(?:可用句式材料|写作接口|可用结构|可用方向|适合解决的问题)[：:][\s\S]*?(?=(?:。|$))/g, '')
    .replace(/>\s*[^。！？\n]+/g, '')
    .replace(/不是[^。！？\n]{1,48}(?:而是|却是|只是)[^。！？\n]{1,60}/g, '保留其中的资源支配关系')
    .replace(/并非[^。！？\n]{1,48}而是[^。！？\n]{1,60}/g, '保留其中的资源支配关系')
    .replace(/不(?:靠|在|是)[^。！？\n]{1,36}(?:靠|而在|而是)[^。！？\n]{1,60}/g, '保留其中的动作后果')
    .replace(/这个词可拆成[^。！？\n]{0,80}/g, '这个概念需要从入口、支配、收益和延续四层处理')
    .replace(/传统地主的核心[^。！？\n]{0,80}/g, '旧地租材料只承担类比背景')
    .replace(/单个[^。！？\n]{0,20}可以被处理/g, '个案处理退到背景')
    .replace(/材料关系[：:]/g, '')
    .replace(/材料接口[：:]/g, '')
    .replace(/[：:]/g, ' ')
    .replace(/[—–]{1,2}|--/g, ' ')
    .replace(/\d+/g, (match) => toChineseNumeral(Number(match)))
    .replace(/[|*_#`~<>]/g, ' ')
    .replace(/[()[\]{}【】]/g, ' ')
    .replace(/英语/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isNoisySourcePassageLine(line: string): boolean {
  const text = String(line || '').trim();
  if (!text) return true;
  const pipeCount = (text.match(/\|/g) || []).length;
  if (pipeCount >= 2) return true;
  if (/^\s*[-|: ]{4,}\s*$/.test(text)) return true;
  const asciiCount = (text.match(/[A-Za-z0-9]/g) || []).length;
  if (asciiCount >= 18 && asciiCount > text.length / 3) return true;
  if (/英语[:：]/.test(text) && asciiCount >= 8) return true;
  return false;
}

function toChineseNumeral(value: number): string {
  if (!Number.isFinite(value)) return '';
  const normalized = Math.trunc(Math.abs(value));
  if (normalized === 0) return '零';
  if (normalized > 9999) return '若干';
  const digits = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
  const units = ['', '十', '百', '千'];
  const chars = String(normalized).split('').map(Number).reverse();
  let output = '';
  let zeroPending = false;
  for (let index = chars.length - 1; index >= 0; index -= 1) {
    const digit = chars[index];
    if (digit === 0) {
      zeroPending = output.length > 0;
      continue;
    }
    if (zeroPending) {
      output += '零';
      zeroPending = false;
    }
    output += digits[digit] + units[index];
  }
  return output.replace(/^一十/, '十');
}

function buildEvidencePackPrompt(pack: unknown): {
  sources: string;
  chunks: string;
  citations: string;
  constraints: string;
  queryRun: string;
  screening: string;
} {
  const record = pack && typeof pack === 'object' && !Array.isArray(pack)
    ? pack as Record<string, any>
    : {};
  const sources = Array.isArray(record.sources) ? record.sources : [];
  const chunks = Array.isArray(record.chunks) ? record.chunks : [];
  const citations = Array.isArray(record.citations) ? record.citations : [];
  const queryRun = record.queryRun && typeof record.queryRun === 'object' ? record.queryRun as Record<string, any> : {};
  const rounds = Array.isArray(queryRun.rounds) ? queryRun.rounds : [];
  const screening = record.screening && typeof record.screening === 'object' ? record.screening as Record<string, any> : {};
  return {
    sources: sources.slice(0, 16).map((item: any, index: number) => sanitizePromptSurfaceText([
      `${index + 1}. 来源${index + 1}`,
      item.kind ? `类型 ${String(item.kind)}` : '',
      item.path ? `路径 ${String(item.path)}` : '',
      item.locator ? `位置 ${String(item.locator)}` : '',
      item.summary ? `摘要槽 ${compileSourcePassageFactPhrases(item.summary)}` : '',
    ].filter(Boolean).join('。'))).join('\n') || '无',
    chunks: chunks.slice(0, 20).map((item: any, index: number) => sanitizePromptSurfaceText([
      `${index + 1}. 切块${index + 1}`,
      item.locator ? `定位 ${String(item.locator)}` : '',
      item.text ? `事实槽 ${compileSourcePassageFactPhrases(item.text)}` : '',
      item.privacyLevel ? `隐私 ${String(item.privacyLevel)}` : '',
    ].filter(Boolean).join('。'))).join('\n') || '无',
    citations: citations.slice(0, 16).map((item: any, index: number) => sanitizePromptSurfaceText([
      `${index + 1}. 引文${index + 1}`,
      item.excerpt ? `引文槽 ${compileSourcePassageFactPhrases(item.excerpt)}` : '',
      item.locator ? `定位 ${String(item.locator)}` : '',
    ].filter(Boolean).join('。'))).join('\n') || '无',
    constraints: [
      'EvidencePack 是 NotebookLM 风格资料边界，只做来源、切块、引用三层投影。',
      'sources 负责告诉模型这批资料是什么。',
      'chunks 负责告诉模型可以化用哪些切面，但不能整段复制。',
      'citations 负责写作可追踪性，不能直接变成正文编号。',
    ].join('\n'),
    queryRun: sanitizePromptSurfaceText([
      `provider ${String(queryRun.provider || '无')}`,
      `status ${String(queryRun.status || '无')}`,
      `rounds ${rounds.length}`,
      rounds.slice(0, 8).map((item: any, index: number) => sanitizePromptSurfaceText([
        `${index + 1}. ${String(item.query || '').trim() || '空 query'}`,
        `provider ${String(item.provider || '')}`,
        `tokens ${Number(item.tokenCount || 0)}`,
        `results ${Number(item.resultCount || 0)}`,
      ].filter(Boolean).join('。'))).join('\n') || '无',
    ].join('\n')),
    screening: sanitizePromptSurfaceText([
      `requestedLimit ${Number(screening.requestedLimit || 0)}`,
      `queryCount ${Number(screening.queryCount || 0)}`,
      `selectedChunkCount ${Number(screening.selectedChunkCount || 0)}`,
      `selectedCitationCount ${Number(screening.selectedCitationCount || 0)}`,
      `sourceDiversityCount ${Number(screening.sourceDiversityCount || 0)}`,
      `rankingSignals ${Array.isArray(screening.rankingSignals) ? screening.rankingSignals.map(String).join('、') : '无'}`,
    ].join('\n')),
  };
}

function buildFilteredEvidencePrompt(materialPack: unknown): {
  sources: string;
  chunks: string;
  citations: string;
} {
  const pack = materialPack && typeof materialPack === 'object' && !Array.isArray(materialPack)
    ? materialPack as Record<string, any>
    : {};
  const sources = Array.isArray(pack.evidencePackSources) ? pack.evidencePackSources : [];
  const chunks = Array.isArray(pack.evidencePackChunks) ? pack.evidencePackChunks : [];
  const citations = Array.isArray(pack.evidenceCitations) ? pack.evidenceCitations : [];
  return {
    sources: sources.slice(0, 12).map((item: any, index: number) => sanitizePromptSurfaceText([
      `${index + 1}. 来源${index + 1}`,
      item.sourceType ? `类型 ${String(item.sourceType)}` : '',
      item.uri ? `位置 ${String(item.uri)}` : '',
    ].filter(Boolean).join('。'))).join('\n') || '无',
    chunks: chunks.slice(0, 12).map((item: any, index: number) => sanitizePromptSurfaceText([
      `${index + 1}. 切块${index + 1}`,
      item.locator ? `定位 ${String(item.locator)}` : '',
      item.text ? `事实槽 ${compileSourcePassageFactPhrases(item.text)}` : '',
      item.privacyLevel ? `隐私 ${String(item.privacyLevel)}` : '',
    ].filter(Boolean).join('。'))).join('\n') || '无',
    citations: citations.slice(0, 12).map((item: any, index: number) => sanitizePromptSurfaceText([
      `${index + 1}. 引文${index + 1}`,
      item.excerpt ? `引文槽 ${compileSourcePassageFactPhrases(item.excerpt)}` : '',
      item.locator ? `定位 ${String(item.locator)}` : '',
    ].filter(Boolean).join('。'))).join('\n') || '无',
  };
}

function buildStylePackPrompt(pack: unknown): {
  profiles: string;
  constraints: string;
} {
  const record = pack && typeof pack === 'object' && !Array.isArray(pack)
    ? pack as Record<string, any>
    : {};
  const profiles = Array.isArray(record.profiles) ? record.profiles : [];
  const constraints = Array.isArray(record.constraints) ? record.constraints : [];
  const styleRules = {
    version: 'style-compiler-rules.v1',
    source: 'StylePack compiled to rules only',
    rawStyleSourceVisibleToWriter: false,
    profileCount: profiles.length,
    sentenceLengthBands: uniqueStrings(profiles
      .map((item: any) => String(item?.sentenceLengthBand || '').trim())
      .filter(Boolean)).slice(0, 6),
    paragraphDensityBands: uniqueStrings(profiles
      .map((item: any) => String(item?.paragraphDensity || '').trim())
      .filter(Boolean)).slice(0, 6),
    progressionMoveCount: profiles.reduce((count: number, item: any) => count + (Array.isArray(item?.progressionMoves) ? item.progressionMoves.length : 0), 0),
    rhetoricalMoveCount: profiles.reduce((count: number, item: any) => count + (Array.isArray(item?.rhetoricalMoves) ? item.rhetoricalMoves.length : 0), 0),
    imageryPolicy: {
      rawImageryClustersVisibleToWriter: false,
      allowedDomains: ['maritime', 'energy', 'finance', 'logistics', 'institutional'],
      forbiddenSource: 'style source objects, scenes, characters, animals, corpses, historical slogans, literary plot objects',
      rule: 'metaphor must stay near FactPack domains and must not import objects from style or training sources',
    },
    abstractionPolicy: {
      requireConcreteFactAnchor: true,
      avoidAbstractNounStacks: true,
    },
  };
  return {
    profiles: sanitizePromptSurfaceText(JSON.stringify(styleRules, null, 2)),
    constraints: sanitizePromptSurfaceText([
      'StylePack 已被编译成结构化规则。Writer 不可见原始风格样本，不可见原始意象簇，不可见训练材料对象。',
      'StylePack 只负责句法节奏、段落推进、修辞功能和抽象度约束。',
      '它不提供事实，不提供可复写句子，不提供可写对象，不允许照搬连续措辞，也不得在正文写出风格来源名称。',
      constraints.length ? `原始约束数量 ${constraints.length}。只承认其规则存在，不向 Writer 展开原文。` : '',
    ].filter(Boolean).join('\n')) || '无',
  };
}

function normalizeArticleModelMaxTokens(input: {
  requestedMaxTokens: number;
  targetWordCount: number;
}): number {
  if (Number.isFinite(input.requestedMaxTokens) && input.requestedMaxTokens > 0) {
    return Math.max(1024, Math.min(16000, Math.trunc(input.requestedMaxTokens)));
  }
  if (!Number.isFinite(input.targetWordCount) || input.targetWordCount <= 0) {
    return 8192;
  }
  return Math.max(8192, Math.min(16000, Math.ceil(input.targetWordCount * 3.2)));
}

function articlePerspectiveAlias(mode: string): string {
  if (/limited_third_person|有限上帝视角/i.test(String(mode || ''))) {
    return '有限上帝视角';
  }
  if (/first_person|第一人称/i.test(String(mode || ''))) {
    return '完全第一人称沉浸';
  }
  if (/omniscient|全知上帝视角/i.test(String(mode || ''))) {
    return '全知上帝视角';
  }
  return '';
}
