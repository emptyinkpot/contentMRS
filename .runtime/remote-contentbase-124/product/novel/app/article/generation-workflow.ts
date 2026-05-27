import { Annotation, END, START, StateGraph } from '@langchain/langgraph';
import type {
  ArticleObservationReport,
} from './observation-report';

export type ArticleGenerationWorkflowStage =
  | 'resolve_context'
  | 'build_material_pack'
  | 'extract_pressure'
  | 'plan_argument'
  | 'build_claim_budget'
  | 'build_writing_brief'
  | 'build_paragraph_blueprint'
  | 'write_article'
  | 'observe_evaluation'
  | 'finalize_article'
  | 'persist_evidence';

export type { ArticleObservationReport };

export interface ArticleGenerationWorkflowState {
  input: Record<string, any>;
  context?: Record<string, any>;
  materialPack?: Record<string, any>;
  pressure?: Record<string, any>;
  plan?: Record<string, any>;
  claimBudget?: Record<string, any>;
  writingBrief?: Record<string, any>;
  paragraphBlueprint?: Record<string, any>;
  draft?: Record<string, any>;
  evaluation?: ArticleObservationReport;
  final?: Record<string, any>;
  generationPolicy?: Record<string, any>;
  stages: ArticleGenerationWorkflowStage[];
}

export interface ArticleGenerationWorkflowNodes {
  resolveContext: (state: ArticleGenerationWorkflowState) => Promise<Partial<ArticleGenerationWorkflowState>> | Partial<ArticleGenerationWorkflowState>;
  buildMaterialPack?: (state: ArticleGenerationWorkflowState) => Promise<Partial<ArticleGenerationWorkflowState>> | Partial<ArticleGenerationWorkflowState>;
  extractPressure?: (state: ArticleGenerationWorkflowState) => Promise<Partial<ArticleGenerationWorkflowState>> | Partial<ArticleGenerationWorkflowState>;
  planArgument: (state: ArticleGenerationWorkflowState) => Promise<Partial<ArticleGenerationWorkflowState>> | Partial<ArticleGenerationWorkflowState>;
  buildClaimBudget?: (state: ArticleGenerationWorkflowState) => Promise<Partial<ArticleGenerationWorkflowState>> | Partial<ArticleGenerationWorkflowState>;
  buildWritingBrief?: (state: ArticleGenerationWorkflowState) => Promise<Partial<ArticleGenerationWorkflowState>> | Partial<ArticleGenerationWorkflowState>;
  buildParagraphBlueprint?: (state: ArticleGenerationWorkflowState) => Promise<Partial<ArticleGenerationWorkflowState>> | Partial<ArticleGenerationWorkflowState>;
  writeArticle: (state: ArticleGenerationWorkflowState) => Promise<Partial<ArticleGenerationWorkflowState>> | Partial<ArticleGenerationWorkflowState>;
  observeEvaluation: (state: ArticleGenerationWorkflowState) => Promise<Partial<ArticleGenerationWorkflowState>> | Partial<ArticleGenerationWorkflowState>;
  finalizeArticle: (state: ArticleGenerationWorkflowState) => Promise<Partial<ArticleGenerationWorkflowState>> | Partial<ArticleGenerationWorkflowState>;
  persistEvidence?: (state: ArticleGenerationWorkflowState) => Promise<Partial<ArticleGenerationWorkflowState>> | Partial<ArticleGenerationWorkflowState>;
}

const ArticleWorkflowAnnotation = Annotation.Root({
  input: Annotation<Record<string, any>>({
    reducer: (_previous, next) => next,
    default: () => ({}),
  }),
  context: Annotation<Record<string, any> | undefined>({
    reducer: (_previous, next) => next,
    default: () => undefined,
  }),
  materialPack: Annotation<Record<string, any> | undefined>({
    reducer: (_previous, next) => next,
    default: () => undefined,
  }),
  pressure: Annotation<Record<string, any> | undefined>({
    reducer: (_previous, next) => next,
    default: () => undefined,
  }),
  plan: Annotation<Record<string, any> | undefined>({
    reducer: (_previous, next) => next,
    default: () => undefined,
  }),
  claimBudget: Annotation<Record<string, any> | undefined>({
    reducer: (_previous, next) => next,
    default: () => undefined,
  }),
  writingBrief: Annotation<Record<string, any> | undefined>({
    reducer: (_previous, next) => next,
    default: () => undefined,
  }),
  paragraphBlueprint: Annotation<Record<string, any> | undefined>({
    reducer: (_previous, next) => next,
    default: () => undefined,
  }),
  draft: Annotation<Record<string, any> | undefined>({
    reducer: (_previous, next) => next,
    default: () => undefined,
  }),
  evaluation: Annotation<ArticleObservationReport | undefined>({
    reducer: (_previous, next) => next,
    default: () => undefined,
  }),
  final: Annotation<Record<string, any> | undefined>({
    reducer: (_previous, next) => next,
    default: () => undefined,
  }),
  generationPolicy: Annotation<Record<string, any> | undefined>({
    reducer: (_previous, next) => next,
    default: () => undefined,
  }),
  stages: Annotation<ArticleGenerationWorkflowStage[]>({
    reducer: (previous, next) => [...(previous || []), ...(next || [])],
    default: () => [],
  }),
});

export function buildArticleGenerationWorkflow(nodes: ArticleGenerationWorkflowNodes) {
  return new StateGraph(ArticleWorkflowAnnotation)
    .addNode('resolve_context', async (state) => ({
      ...(await nodes.resolveContext(state)),
      stages: ['resolve_context'],
    }))
    .addNode('build_material_pack', async (state) => ({
      ...(nodes.buildMaterialPack ? await nodes.buildMaterialPack(state) : {}),
      stages: ['build_material_pack'],
    }))
    .addNode('extract_pressure', async (state) => ({
      ...(nodes.extractPressure ? await nodes.extractPressure(state) : {}),
      stages: ['extract_pressure'],
    }))
    .addNode('plan_argument', async (state) => ({
      ...(await nodes.planArgument(state)),
      stages: ['plan_argument'],
    }))
    .addNode('build_claim_budget', async (state) => ({
      ...(nodes.buildClaimBudget ? await nodes.buildClaimBudget(state) : {}),
      stages: ['build_claim_budget'],
    }))
    .addNode('build_writing_brief', async (state) => ({
      ...(nodes.buildWritingBrief ? await nodes.buildWritingBrief(state) : {}),
      stages: ['build_writing_brief'],
    }))
    .addNode('build_paragraph_blueprint', async (state) => ({
      ...(nodes.buildParagraphBlueprint ? await nodes.buildParagraphBlueprint(state) : {}),
      stages: ['build_paragraph_blueprint'],
    }))
    .addNode('write_article', async (state) => ({
      ...(await nodes.writeArticle(state)),
      stages: ['write_article'],
    }))
    .addNode('observe_evaluation', async (state) => ({
      ...(await nodes.observeEvaluation(state)),
      stages: ['observe_evaluation'],
    }))
    .addNode('finalize_article', async (state) => ({
      ...(await nodes.finalizeArticle(state)),
      stages: ['finalize_article'],
    }))
    .addNode('persist_evidence', async (state) => ({
      ...(nodes.persistEvidence ? await nodes.persistEvidence(state) : {}),
      stages: ['persist_evidence'],
    }))
    .addEdge(START, 'resolve_context')
    .addEdge('resolve_context', 'build_material_pack')
    .addEdge('build_material_pack', 'extract_pressure')
    .addEdge('extract_pressure', 'plan_argument')
    .addEdge('plan_argument', 'build_claim_budget')
    .addEdge('build_claim_budget', 'build_writing_brief')
    .addEdge('build_writing_brief', 'build_paragraph_blueprint')
    .addEdge('build_paragraph_blueprint', 'write_article')
    .addEdge('write_article', 'observe_evaluation')
    .addEdge('observe_evaluation', 'finalize_article')
    .addEdge('finalize_article', 'persist_evidence')
    .addEdge('persist_evidence', END)
    .compile();
}

export async function runArticleGenerationWorkflow(
  nodes: ArticleGenerationWorkflowNodes,
  input: Record<string, any>,
): Promise<ArticleGenerationWorkflowState> {
  return buildArticleGenerationWorkflow(nodes).invoke({
    input,
    stages: [],
  }) as Promise<ArticleGenerationWorkflowState>;
}
