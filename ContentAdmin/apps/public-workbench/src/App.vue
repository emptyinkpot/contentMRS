<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { VueFlow, type Edge, type Node, type NodeMouseEvent } from '@vue-flow/core';
import { Background } from '@vue-flow/background';
import { Controls } from '@vue-flow/controls';
import { MiniMap } from '@vue-flow/minimap';
import type {
  ContentTopologyEdge,
  ContentTopologyGraph,
  ContentTopologyNode,
} from '@emptyinkpot/content-admin-topology-contracts';

interface EvidencePackCitation {
  id?: string;
  sourceId?: string;
  chunkId?: string;
  title?: string;
  excerpt?: string;
  locator?: string;
  relevanceScore?: number;
  metadata?: Record<string, unknown>;
}

interface EvidencePackSource {
  id?: string;
  title?: string;
  sourceType?: string;
  sourceId?: string;
  source?: string;
  metadata?: Record<string, unknown>;
}

interface EvidencePackChunk {
  id?: string;
  sourceId?: string;
  chunkIndex?: number;
  text?: string;
  relevanceScore?: number;
  location?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

interface EvidencePack {
  version: string;
  query: string;
  mode?: string;
  sources?: EvidencePackSource[];
  chunks?: EvidencePackChunk[];
  citations?: EvidencePackCitation[];
  counts?: {
    sources?: number;
    chunks?: number;
    citations?: number;
    webSources?: number;
    queryRounds?: number;
  };
  screening?: {
    sourceFilterIds?: string[];
    rankingSignals?: string[];
  };
  requestId?: string;
}

interface ContentSourceSummary {
  id: string;
  sourceId: string;
  title: string;
  kind: string;
  author?: string | null;
  category?: string | null;
  source?: string | null;
  chunkCount: number;
  semanticUnitCount: number;
  preview?: string | null;
}

interface ContentSourcesResponse {
  version: 'content-sources.v1';
  count: number;
  sources: ContentSourceSummary[];
  requestId: string;
}

interface RuntimeJobRecord {
  id: string;
  capabilityId: string;
  status: string;
  runtime?: string;
  requestedBy?: string;
  createdAt?: string;
  updatedAt?: string;
  startedAt?: string;
  finishedAt?: string;
  input?: Record<string, unknown>;
  result?: Record<string, unknown>;
  error?: string;
  cancelReason?: string;
  workflow?: Record<string, unknown>;
}

interface RuntimeJobResponse {
  ok: boolean;
  data: RuntimeJobRecord;
}

interface ContentAdminRuntimeArticleResponse {
  runtimeVersion?: string;
  draft?: {
    title?: string;
    target?: string;
    topic?: string;
    body?: string;
    summary?: string;
    referenceCoverage?: Record<string, unknown>;
    frontmatter?: Record<string, unknown>;
  };
  plan?: Record<string, unknown>;
  quality?: Record<string, unknown>;
  acceptance?: Record<string, unknown>;
  context?: Record<string, unknown>;
  trace?: Record<string, unknown>;
  persisted?: Record<string, unknown> | null;
  acceptancePersisted?: Record<string, unknown> | null;
  referenceUsagePersisted?: Record<string, unknown> | null;
  styleRevisionPairsPersisted?: Record<string, unknown> | null;
  experiencePersisted?: Record<string, unknown> | null;
}

interface ResearchTopicEntry {
  id: string;
  label?: string;
  defaultSourceIds?: string[];
  defaultStyleSourceIds?: string[];
  defaultStyleProfileId?: string | null;
  defaultRounds?: number;
  defaultLimit?: number;
  suggestIncludeWeb?: boolean;
  forbiddenLexiconTags?: string[];
  pressureTransitions?: string[];
  narrativePerspectiveMode?: string | null;
}

interface ResearchTopicsResponse {
  version?: string;
  count?: number;
  topics?: ResearchTopicEntry[];
}

interface GenerationResultView {
  runtimeVersion?: string;
  title: string;
  topic: string;
  body: string;
  summary?: string;
  trace: Record<string, unknown> | null;
  quality: Record<string, unknown> | null;
  acceptance: Record<string, unknown> | null;
  persisted: Record<string, unknown> | null;
  acceptancePersisted: Record<string, unknown> | null;
  referenceUsagePersisted: Record<string, unknown> | null;
  styleRevisionPairsPersisted: Record<string, unknown> | null;
  experiencePersisted: Record<string, unknown> | null;
  referenceCoverage: Record<string, unknown> | null;
  modelInvocation: Record<string, unknown> | null;
}

const query = ref('新地主阶级：从地租到通道租');
const sourceSearch = ref('');
const selectedSourceIds = ref<string[]>([]);
const limit = ref(16);
const searchRounds = ref(6);
const includeWeb = ref(false);
const includeRagflow = ref(false);
const useResearchApi = ref(true);
const topicId = ref('zhenghe-voyages');
const researchTopics = ref<ResearchTopicEntry[]>([]);
const loadingTopics = ref(false);
const researchSessionId = ref('');
const researchPlan = ref<Record<string, unknown> | null>(null);
const loading = ref(false);
const loadingSources = ref(false);
const loadingGenerate = ref(false);
const loadingJob = ref(false);
const error = ref('');
const sourceError = ref('');
const evidencePack = ref<EvidencePack | null>(null);
const sourceCatalog = ref<ContentSourceSummary[]>([]);
const selectedNodeId = ref('');
const runtimeJob = ref<RuntimeJobRecord | null>(null);
const runtimeJobPoll = ref<number | null>(null);
const runtimeArticle = ref<GenerationResultView | null>(null);
const runtimeJobId = ref('');
const runtimePersist = ref(true);
const runtimeWorkId = ref(12);
const runtimeChapterNumber = ref(1);
const runtimeTopic = ref('新地主阶级事件与理论资料聚合');
const runtimeTarget = ref('article');
const runtimeRequestedBy = ref('content-admin-public-workbench');
const novelAccountId = ref('');
const novelBookId = ref('');
const novelTitle = computed(() => runtimeTopic.value.trim() || `Chapter ${runtimeChapterNumber.value}`);
const novelWorkflowEndpoint = computed(() => '/webhook/novel-factory-generate-quality-publish');
const novelPayloadPreview = computed(() => ({
  topic: runtimeTopic.value.trim(),
  title: novelTitle.value,
  target: runtimeTarget.value.trim() || 'novel-chapter',
  genre: 'narrative',
  wordCount: 2400,
  workId: runtimeWorkId.value,
  chapterNumber: runtimeChapterNumber.value,
  accountId: novelAccountId.value.trim() || undefined,
  bookId: novelBookId.value.trim() || undefined,
  dryRun: true,
  persist: runtimePersist.value,
  evidenceQuery: {
    query: query.value.trim(),
    limit: limit.value,
    rounds: searchRounds.value,
    includeWeb: includeWeb.value,
    includeRagflow: includeRagflow.value,
  },
}));

const activeTopicPreset = computed(() =>
  researchTopics.value.find((entry) => entry.id === topicId.value.trim()) || null,
);

const topicPresetSummary = computed(() => {
  const entry = activeTopicPreset.value;
  if (!entry) return '';
  const parts = [
    entry.defaultSourceIds?.length ? `sources: ${entry.defaultSourceIds.join(', ')}` : '',
    entry.defaultStyleSourceIds?.length ? `style: ${entry.defaultStyleSourceIds.join(', ')}` : '',
    entry.forbiddenLexiconTags?.length ? `forbidden tags: ${entry.forbiddenLexiconTags.join(', ')}` : '',
    entry.narrativePerspectiveMode ? `perspective: ${entry.narrativePerspectiveMode}` : '',
  ].filter(Boolean);
  return parts.join(' | ');
});

function applyTopicPresetToForm(entry: ResearchTopicEntry | null) {
  if (!entry) return;
  if (entry.label) runtimeTopic.value = entry.label;
  if (entry.defaultLimit) limit.value = entry.defaultLimit;
  if (entry.defaultRounds) searchRounds.value = entry.defaultRounds;
  includeWeb.value = Boolean(entry.suggestIncludeWeb);
  useResearchApi.value = true;
  if (Array.isArray(entry.defaultSourceIds) && entry.defaultSourceIds.length) {
    selectedSourceIds.value = [...entry.defaultSourceIds];
  }
}

function shortText(value: unknown, maxLength = 240): string {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}

function buildEvidenceTopology(pack: EvidencePack): ContentTopologyGraph {
  const nodes = new Map<string, ContentTopologyNode>();
  const edges = new Map<string, ContentTopologyEdge>();
  const rootId = `query:${pack.requestId || pack.query}`;

  nodes.set(rootId, {
    id: rootId,
    kind: 'collection',
    label: 'Query',
    title: pack.query,
    subtitle: pack.mode,
    metadata: {
      requestId: pack.requestId,
      sourceFilterIds: pack.screening?.sourceFilterIds || [],
    },
  });

  for (const source of pack.sources || []) {
    const sourceNodeId = `source:${source.id || source.sourceId || source.title}`;
    nodes.set(sourceNodeId, {
      id: sourceNodeId,
      kind: 'sourceMaterial',
      label: 'Source',
      title: source.title || source.sourceId || 'Untitled source',
      subtitle: source.metadata?.sourceLocator ? String(source.metadata.sourceLocator) : source.sourceType,
      sourceId: source.sourceId,
      metadata: source.metadata,
    });
    edges.set(`edge:${rootId}:${sourceNodeId}`, {
      id: `edge:${rootId}:${sourceNodeId}`,
      source: rootId,
      target: sourceNodeId,
      kind: 'supports',
      label: 'returned source',
    });
  }

  for (const chunk of pack.chunks || []) {
    const chunkNodeId = `chunk:${chunk.id || chunk.chunkIndex}`;
    nodes.set(chunkNodeId, {
      id: chunkNodeId,
      kind: 'evidenceChunk',
      label: 'Chunk',
      title: shortText(chunk.location?.locator || chunk.id || `chunk ${chunk.chunkIndex}`, 96),
      subtitle: `score ${chunk.relevanceScore ?? 0}`,
      sourceId: chunk.sourceId,
      metadata: {
        ...chunk.metadata,
        chunkIndex: chunk.chunkIndex,
        location: chunk.location,
      },
    });

    const sourceNodeId = `source:${chunk.sourceId}`;
    edges.set(`edge:${nodes.has(sourceNodeId) ? sourceNodeId : rootId}:${chunkNodeId}`, {
      id: `edge:${nodes.has(sourceNodeId) ? sourceNodeId : rootId}:${chunkNodeId}`,
      source: nodes.has(sourceNodeId) ? sourceNodeId : rootId,
      target: chunkNodeId,
      kind: nodes.has(sourceNodeId) ? 'contains' : 'supports',
      label: nodes.has(sourceNodeId) ? 'contains chunk' : 'returned chunk',
    });
  }

  for (const citation of pack.citations || []) {
    const citationNodeId = `citation:${citation.id || citation.chunkId || citation.locator}`;
    nodes.set(citationNodeId, {
      id: citationNodeId,
      kind: 'citation',
      label: 'Citation',
      title: citation.locator || citation.title || 'Citation',
      subtitle: `score ${citation.relevanceScore ?? 0}`,
      sourceId: citation.sourceId,
      metadata: citation.metadata,
    });

    const chunkNodeId = `chunk:${citation.chunkId}`;
    edges.set(`edge:${nodes.has(chunkNodeId) ? chunkNodeId : rootId}:${citationNodeId}`, {
      id: `edge:${nodes.has(chunkNodeId) ? chunkNodeId : rootId}:${citationNodeId}`,
      source: nodes.has(chunkNodeId) ? chunkNodeId : rootId,
      target: citationNodeId,
      kind: 'cites',
      label: 'citation',
    });
  }

  return {
    version: 'content-topology.v1',
    generatedAt: new Date().toISOString(),
    scope: {
      query: pack.query,
      sourceId: pack.screening?.sourceFilterIds?.[0],
    },
    nodes: Array.from(nodes.values()),
    edges: Array.from(edges.values()),
  };
}

const topology = computed(() => (evidencePack.value ? buildEvidenceTopology(evidencePack.value) : null));
const selectedNode = computed(() => {
  if (!topology.value) return null;
  return topology.value.nodes.find((node) => node.id === selectedNodeId.value) || topology.value.nodes[0] || null;
});
const metrics = computed(() => {
  const counts = evidencePack.value?.counts || {};
  return [
    { label: 'Sources', value: counts.sources ?? evidencePack.value?.sources?.length ?? 0 },
    { label: 'Chunks', value: counts.chunks ?? evidencePack.value?.chunks?.length ?? 0 },
    { label: 'Citations', value: counts.citations ?? evidencePack.value?.citations?.length ?? 0 },
    { label: 'Rounds', value: counts.queryRounds ?? 0 },
    { label: 'Web sources', value: counts.webSources ?? 0 },
  ];
});
const citations = computed(() => evidencePack.value?.citations || []);
const rankingSignals = computed(() => evidencePack.value?.screening?.rankingSignals || []);
const selectedSourceIdText = computed(() => selectedSourceIds.value.join(', '));
const runtimeJobSummary = computed(() => runtimeJob.value ? [
  { label: 'Job', value: runtimeJob.value.id },
  { label: 'Status', value: runtimeJob.value.status },
  { label: 'Runtime', value: runtimeJob.value.runtime || 'file' },
  { label: 'Capability', value: runtimeJob.value.capabilityId },
] : []);
const articleBody = computed(() => runtimeArticle.value?.body || '');
const articleTrace = computed(() => runtimeArticle.value?.trace || null);
const articleQuality = computed(() => runtimeArticle.value?.quality || null);
const articleAcceptance = computed(() => runtimeArticle.value?.acceptance || null);
const articleReadback = computed(() => {
  const persisted = runtimeArticle.value?.persisted || null;
  if (!persisted) return null;
  const item = persisted.item || persisted.record || persisted.result || persisted;
  if (!item || typeof item !== 'object') return persisted;
  return item as Record<string, unknown>;
});

function nodeColumn(kind: string): number {
  if (kind === 'collection') return 0;
  if (kind === 'sourceMaterial') return 1;
  if (kind === 'evidenceChunk') return 2;
  if (kind === 'citation') return 3;
  return 4;
}

function mapToFlowNode(node: ContentTopologyNode, index: number): Node {
  const column = nodeColumn(String(node.kind));
  return {
    id: node.id,
    type: column === 0 ? 'input' : column === 3 ? 'output' : 'default',
    label: node.title || node.label,
    position: { x: 32 + column * 300, y: 48 + (index % 8) * 94 },
    class: `flow-node flow-node-${String(node.kind).replace(/[^a-z0-9_-]/gi, '-').toLowerCase()}`,
    data: {
      kind: node.kind,
      subtitle: node.subtitle,
      sourceId: node.sourceId,
    },
  };
}

function edgeColor(kind: string): string {
  if (kind === 'contains') return '#64748b';
  if (kind === 'cites') return '#0f766e';
  if (kind === 'supports') return '#7c3aed';
  return '#475569';
}

function mapToFlowEdge(edge: ContentTopologyEdge): Edge {
  const color = edgeColor(String(edge.kind));
  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    label: edge.label,
    animated: edge.kind === 'supports',
    style: { stroke: color, strokeWidth: 1.8 },
    labelStyle: { fill: color, fontWeight: 700 },
  };
}

const flowNodes = computed<Node[]>(() => topology.value?.nodes.map(mapToFlowNode) || []);
const flowEdges = computed<Edge[]>(() => topology.value?.edges.map(mapToFlowEdge) || []);

function selectFlowNode(event: NodeMouseEvent) {
  selectedNodeId.value = event.node.id;
}

function toggleSource(sourceId: string) {
  selectedSourceIds.value = selectedSourceIds.value.includes(sourceId)
    ? selectedSourceIds.value.filter((item) => item !== sourceId)
    : [...selectedSourceIds.value, sourceId];
}

function normalizeRuntimeArticleResponse(payload: ContentAdminRuntimeArticleResponse): GenerationResultView {
  const draft = payload.draft || {};
  return {
    runtimeVersion: payload.runtimeVersion,
    title: String(draft.title || ''),
    topic: String(draft.topic || ''),
    body: String(draft.body || ''),
    summary: String(draft.summary || ''),
    trace: payload.trace || null,
    quality: payload.quality || null,
    acceptance: payload.acceptance || null,
    persisted: payload.persisted || null,
    acceptancePersisted: payload.acceptancePersisted || null,
    referenceUsagePersisted: payload.referenceUsagePersisted || null,
    styleRevisionPairsPersisted: payload.styleRevisionPairsPersisted || null,
    experiencePersisted: payload.experiencePersisted || null,
    referenceCoverage: draft.referenceCoverage || null,
    modelInvocation: readModelInvocation(payload.trace || null, payload) || null,
  };
}

function readModelInvocation(trace: Record<string, unknown> | null, payload: ContentAdminRuntimeArticleResponse) {
  const fromTrace = trace?.modelInvocation as Record<string, unknown> | undefined;
  if (fromTrace) return fromTrace;
  const fromWorkflow = trace?.workflow as Record<string, unknown> | undefined;
  if (fromWorkflow && fromWorkflow.draft && typeof fromWorkflow.draft === 'object') {
    const draft = fromWorkflow.draft as Record<string, unknown>;
    if (draft.modelInvocation && typeof draft.modelInvocation === 'object') {
      return draft.modelInvocation as Record<string, unknown>;
    }
  }
  if (payload.draft?.frontmatter && typeof payload.draft.frontmatter === 'object') {
    return null;
  }
  return null;
}

async function loadResearchTopics() {
  loadingTopics.value = true;
  try {
    const response = await fetch('/evidence-search/research/topics', {
      headers: { accept: 'application/json' },
    });
    const payload = await response.json() as ResearchTopicsResponse;
    if (!response.ok) {
      throw new Error((payload as { error?: string })?.error || `Request failed: ${response.status}`);
    }
    researchTopics.value = Array.isArray(payload.topics) ? payload.topics : [];
    applyTopicPresetToForm(activeTopicPreset.value);
  } catch (cause) {
    sourceError.value = cause instanceof Error ? cause.message : String(cause);
  } finally {
    loadingTopics.value = false;
  }
}

async function loadSources() {
  loadingSources.value = true;
  sourceError.value = '';

  try {
    const params = new URLSearchParams({ limit: '100' });
    const search = sourceSearch.value.trim();
    if (search) params.set('search', search);

    const response = await fetch(`/evidence-search/sources?${params.toString()}`, {
      headers: { accept: 'application/json' },
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload?.error || payload?.errors?.[0]?.message || `Request failed: ${response.status}`);
    }

    const catalog = payload as ContentSourcesResponse;
    sourceCatalog.value = catalog.sources || [];
    if (selectedSourceIds.value.length === 0) {
      const preferred = sourceCatalog.value.find((source) => source.sourceId === 'book_xingwang_world_history_21')
        || sourceCatalog.value[0];
      if (preferred?.sourceId) selectedSourceIds.value = [preferred.sourceId];
    }
  } catch (cause) {
    sourceError.value = cause instanceof Error ? cause.message : String(cause);
  } finally {
    loadingSources.value = false;
  }
}

async function searchEvidence() {
  const q = query.value.trim();
  if (!q) {
    error.value = 'Query is required.';
    return;
  }

  loading.value = true;
  error.value = '';

  try {
    const sourceIds = selectedSourceIds.value.length ? selectedSourceIds.value : [];
    let payload: Record<string, unknown>;

    if (useResearchApi.value) {
      const modes = ['corpus'];
      if (includeWeb.value) modes.push('web');
      if (includeRagflow.value) modes.push('ragflow');

      const response = await fetch('/evidence-search/research/query', {
        method: 'POST',
        headers: { accept: 'application/json', 'content-type': 'application/json' },
        body: JSON.stringify({
          query: q,
          topicId: topicId.value.trim() || undefined,
          topic: runtimeTopic.value.trim() || undefined,
          sourceIds,
          modes,
          limit: limit.value || 16,
          rounds: searchRounds.value || 6,
          planner: 'rules',
        }),
      });
      payload = await response.json();
      if (!response.ok) {
        throw new Error((payload as { error?: string; message?: string })?.error
          || (payload as { message?: string })?.message
          || `Request failed: ${response.status}`);
      }
      researchSessionId.value = String((payload as { sessionId?: string }).sessionId || '');
      researchPlan.value = ((payload as { plan?: Record<string, unknown> }).plan || null);
      evidencePack.value = ((payload as { pack?: EvidencePack }).pack || null);
    } else {
      const params = new URLSearchParams({
        q,
        limit: String(limit.value || 16),
        rounds: String(searchRounds.value || 6),
      });
      if (sourceIds.length > 0) params.set('sourceIds', sourceIds.join(','));
      if (includeWeb.value) params.set('includeWeb', 'true');
      if (includeRagflow.value) params.set('includeRagflow', 'true');
      if (runtimeTopic.value.trim()) params.set('topic', runtimeTopic.value.trim());

      const response = await fetch(`/evidence-search/search?${params.toString()}`, {
        headers: { accept: 'application/json' },
      });
      payload = await response.json();
      if (!response.ok) {
        throw new Error((payload as { error?: string })?.error || `Request failed: ${response.status}`);
      }
      evidencePack.value = payload as unknown as EvidencePack;
      researchSessionId.value = '';
      researchPlan.value = null;
    }

    selectedNodeId.value = '';
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : String(cause);
  } finally {
    loading.value = false;
  }
}

async function generateArticleJob() {
  loadingGenerate.value = true;
  error.value = '';

  try {
    const response = await fetch('/evidence-search/runtime/jobs', {
      method: 'POST',
      headers: { accept: 'application/json', 'content-type': 'application/json' },
      body: JSON.stringify({
        capabilityId: 'runtime.generate.article',
        requestedBy: runtimeRequestedBy.value || 'content-admin-public-workbench',
        input: {
          topic: runtimeTopic.value.trim(),
          topicId: topicId.value.trim() || undefined,
          target: runtimeTarget.value.trim() || 'article',
          persist: runtimePersist.value,
          workId: runtimeWorkId.value,
          chapterNumber: runtimeChapterNumber.value,
          genre: runtimeTarget.value.trim() === 'novel-chapter' ? 'narrative' : undefined,
          evidenceQuery: {
            query: query.value.trim(),
            limit: limit.value,
            rounds: searchRounds.value,
            includeWeb: includeWeb.value,
            includeRagflow: includeRagflow.value,
            ...(topicId.value.trim()
              ? {}
              : { sourceIds: selectedSourceIds.value }),
          },
          styleQuery: topicId.value.trim()
            ? { query: query.value.trim() }
            : undefined,
          researchSessionId: researchSessionId.value || undefined,
        },
      }),
    });
    const payload = await response.json() as RuntimeJobResponse;
    if (!response.ok || payload?.ok === false) {
      throw new Error((payload as any)?.error || `Request failed: ${response.status}`);
    }
    runtimeJob.value = payload.data;
    runtimeJobId.value = payload.data.id;
    runtimeArticle.value = null;
    await refreshRuntimeJob();
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : String(cause);
  } finally {
    loadingGenerate.value = false;
  }
}

async function refreshRuntimeJob() {
  if (!runtimeJobId.value) return;
  loadingJob.value = true;
  try {
    const response = await fetch(`/evidence-search/runtime/jobs/${encodeURIComponent(runtimeJobId.value)}`, {
      headers: { accept: 'application/json' },
    });
    const payload = await response.json() as RuntimeJobResponse;
    if (!response.ok || payload?.ok === false) {
      throw new Error((payload as any)?.error || `Request failed: ${response.status}`);
    }
    runtimeJob.value = payload.data;
    if (payload.data.status === 'succeeded' && payload.data.result) {
      runtimeArticle.value = normalizeRuntimeArticleResponse(payload.data.result as ContentAdminRuntimeArticleResponse);
    }
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : String(cause);
  } finally {
    loadingJob.value = false;
  }
}

async function cancelRuntimeJob() {
  if (!runtimeJobId.value) return;
  try {
    const response = await fetch(`/evidence-search/runtime/jobs/${encodeURIComponent(runtimeJobId.value)}/cancel`, {
      method: 'POST',
      headers: { accept: 'application/json', 'content-type': 'application/json' },
      body: JSON.stringify({ reason: 'cancelled_by_workbench' }),
    });
    const payload = await response.json() as RuntimeJobResponse;
    if (!response.ok || payload?.ok === false) {
      throw new Error((payload as any)?.error || `Request failed: ${response.status}`);
    }
    runtimeJob.value = payload.data;
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : String(cause);
  }
}

function startPollingJob() {
  if (runtimeJobPoll.value) {
    window.clearInterval(runtimeJobPoll.value);
  }
  runtimeJobPoll.value = window.setInterval(() => {
    if (runtimeJobId.value) {
      void refreshRuntimeJob();
    }
  }, 2500);
}

watch(topicId, () => {
  applyTopicPresetToForm(activeTopicPreset.value);
});

void loadResearchTopics();
void loadSources();
void searchEvidence();
startPollingJob();
</script>

<template>
  <main class="workbench">
    <header class="topbar">
      <div>
        <p class="eyebrow">ContentAdmin Research Console</p>
        <h1>Research + Writing</h1>
      </div>
      <div class="topbar-actions">
        <button :disabled="loading" @click="searchEvidence">{{ loading ? 'Searching...' : 'Search Evidence' }}</button>
        <button :disabled="loadingGenerate" @click="generateArticleJob">{{ loadingGenerate ? 'Generating...' : 'Generate Article' }}</button>
      </div>
    </header>

    <section class="novel-manager">
      <div class="panel-heading">
        <div>
          <h2>Novel Management</h2>
          <p>ContentBase runs as the novel-factory service; n8n owns generate → quality check → publish orchestration.</p>
        </div>
        <span>{{ novelWorkflowEndpoint }}</span>
      </div>
      <div class="novel-grid">
        <label>
          <span>Work ID</span>
          <input v-model.number="runtimeWorkId" type="number" min="1" />
        </label>
        <label>
          <span>Chapter</span>
          <input v-model.number="runtimeChapterNumber" type="number" min="1" />
        </label>
        <label>
          <span>Fanqie account</span>
          <input v-model="novelAccountId" type="text" placeholder="accountId" />
        </label>
        <label>
          <span>Fanqie book</span>
          <input v-model="novelBookId" type="text" placeholder="bookId" />
        </label>
        <label class="novel-topic">
          <span>Chapter brief</span>
          <textarea v-model="runtimeTopic" rows="3" />
        </label>
        <label class="novel-topic">
          <span>Writing target</span>
          <textarea v-model="runtimeTarget" rows="3" />
        </label>
      </div>
      <div class="runtime-actions">
        <button :disabled="loadingGenerate" @click="generateArticleJob">
          {{ loadingGenerate ? 'Generating...' : 'Generate Novel Draft' }}
        </button>
        <button disabled>n8n Publish Dry Run</button>
      </div>
      <details class="payload-preview">
        <summary>n8n webhook payload</summary>
        <pre>{{ JSON.stringify(novelPayloadPreview, null, 2) }}</pre>
      </details>
    </section>

    <section class="controls">
      <label>
        <span>Query</span>
        <textarea v-model="query" rows="3" />
      </label>
      <label>
        <span>Selected sources</span>
        <input :value="selectedSourceIdText" readonly />
      </label>
      <label>
        <span>Limit</span>
        <input v-model.number="limit" type="number" min="1" max="50" />
      </label>
      <label>
        <span>Rounds</span>
        <input v-model.number="searchRounds" type="number" min="1" max="12" />
      </label>
      <label class="checkbox-row">
        <span>Include web (Tavily)</span>
        <input v-model="includeWeb" type="checkbox" />
      </label>
      <label class="checkbox-row">
        <span>Include RAGFlow</span>
        <input v-model="includeRagflow" type="checkbox" />
      </label>
      <label class="checkbox-row">
        <span>Use /research/query</span>
        <input v-model="useResearchApi" type="checkbox" />
      </label>
      <label>
        <span>Topic preset</span>
        <select v-model="topicId" :disabled="loadingTopics">
          <option v-for="entry in researchTopics" :key="entry.id" :value="entry.id">
            {{ entry.label || entry.id }}
          </option>
        </select>
      </label>
      <p v-if="topicPresetSummary" class="topic-preset-summary">{{ topicPresetSummary }}</p>
      <label>
        <span>Topic</span>
        <input v-model="runtimeTopic" type="text" />
      </label>
      <label v-if="researchSessionId">
        <span>Research session</span>
        <input :value="researchSessionId" readonly />
      </label>
      <label>
        <span>Persist</span>
        <input v-model="runtimePersist" type="checkbox" />
      </label>
      <label>
        <span>Requested by</span>
        <input v-model="runtimeRequestedBy" type="text" />
      </label>
    </section>

    <section class="source-layout">
      <aside class="source-panel">
        <div class="panel-heading">
          <h2>Sources</h2>
          <span>{{ loadingSources ? 'loading' : `${sourceCatalog.length} items` }}</span>
        </div>
        <div class="source-search">
          <input v-model="sourceSearch" placeholder="Search source catalog" @keydown.enter="loadSources" />
          <button :disabled="loadingSources" @click="loadSources">Load</button>
        </div>
        <p v-if="sourceError" class="error">{{ sourceError }}</p>
        <div class="source-list">
          <button
            v-for="source in sourceCatalog"
            :key="source.id"
            class="source-item"
            :class="{ selected: selectedSourceIds.includes(source.sourceId) }"
            @click="toggleSource(source.sourceId)"
          >
            <strong>{{ source.title }}</strong>
            <small>{{ source.sourceId }}</small>
            <span>{{ source.kind }} · chunks {{ source.chunkCount }} · semantic {{ source.semanticUnitCount }}</span>
            <p v-if="source.preview">{{ shortText(source.preview, 140) }}</p>
          </button>
        </div>
      </aside>

      <div class="source-note">
        <strong>SDK boundary</strong>
        <p>Source catalog and EvidencePack both come through the Directus endpoint backed by the DataBase SDK. The browser only sees sourceId contracts.</p>
      </div>
    </section>

    <p v-if="error" class="error">{{ error }}</p>

    <section v-if="evidencePack" class="metrics">
      <div v-for="metric in metrics" :key="metric.label">
        <span>{{ metric.label }}</span>
        <strong>{{ metric.value }}</strong>
      </div>
    </section>

    <section v-if="topology" class="workspace">
      <div class="graph-panel">
        <div class="panel-heading">
          <h2>Evidence graph</h2>
          <span>{{ topology.nodes.length }} nodes / {{ topology.edges.length }} edges</span>
        </div>
        <div class="flow-shell">
          <VueFlow
            :nodes="flowNodes"
            :edges="flowEdges"
            :fit-view-on-init="true"
            :min-zoom="0.25"
            :max-zoom="1.6"
            @node-click="selectFlowNode"
          >
            <Background pattern-color="#d9dee7" :gap="18" />
            <Controls position="bottom-left" />
            <MiniMap position="bottom-right" pannable zoomable />
          </VueFlow>
        </div>
      </div>

      <aside class="inspector">
        <div class="panel-heading">
          <h2>Inspector</h2>
          <span>{{ selectedNode?.kind || 'none' }}</span>
        </div>
        <div v-if="selectedNode" class="selected-node">
          <strong>{{ selectedNode.title }}</strong>
          <small v-if="selectedNode.subtitle">{{ selectedNode.subtitle }}</small>
          <small v-if="selectedNode.sourceId">{{ selectedNode.sourceId }}</small>
        </div>

        <div class="citations">
          <h3>Citations</h3>
          <article v-for="citation in citations" :key="citation.id || citation.chunkId">
            <strong>{{ citation.locator || citation.title }}</strong>
            <p>{{ shortText(citation.excerpt, 320) }}</p>
            <small>score {{ citation.relevanceScore ?? 0 }} · {{ citation.sourceId }}</small>
          </article>
        </div>
      </aside>
    </section>

    <section v-if="rankingSignals.length" class="signals">
      <span v-for="signal in rankingSignals" :key="signal">{{ signal }}</span>
    </section>

    <section class="runtime-panel">
      <div class="panel-heading">
        <h2>Runtime job</h2>
        <span>{{ runtimeJob?.id || 'idle' }}</span>
      </div>
      <div class="runtime-actions">
        <button :disabled="loadingJob || !runtimeJobId" @click="refreshRuntimeJob">Refresh job</button>
        <button :disabled="!runtimeJobId" @click="cancelRuntimeJob">Cancel job</button>
      </div>
      <div v-if="runtimeJobSummary.length" class="metrics metrics-inline">
        <div v-for="metric in runtimeJobSummary" :key="metric.label">
          <span>{{ metric.label }}</span>
          <strong>{{ metric.value }}</strong>
        </div>
      </div>
      <article v-if="runtimeArticle" class="runtime-article">
        <div class="runtime-article-grid">
          <div>
            <h3>Body</h3>
            <pre>{{ articleBody }}</pre>
          </div>
          <div>
            <h3>Readback</h3>
            <pre>{{ JSON.stringify(articleReadback, null, 2) }}</pre>
          </div>
          <div>
            <h3>Trace</h3>
            <pre>{{ JSON.stringify(articleTrace, null, 2) }}</pre>
          </div>
          <div>
            <h3>Quality</h3>
            <pre>{{ JSON.stringify(articleQuality, null, 2) }}</pre>
          </div>
          <div>
            <h3>Acceptance</h3>
            <pre>{{ JSON.stringify(articleAcceptance, null, 2) }}</pre>
          </div>
          <div>
            <h3>Persistence</h3>
            <pre>{{ JSON.stringify({
              persisted: runtimeArticle.persisted,
              acceptancePersisted: runtimeArticle.acceptancePersisted,
              referenceUsagePersisted: runtimeArticle.referenceUsagePersisted,
              styleRevisionPairsPersisted: runtimeArticle.styleRevisionPairsPersisted,
              experiencePersisted: runtimeArticle.experiencePersisted,
            }, null, 2) }}</pre>
          </div>
        </div>
      </article>
      <article v-else-if="runtimeJob?.result" class="runtime-article">
        <pre>{{ JSON.stringify(runtimeJob.result, null, 2) }}</pre>
      </article>
    </section>
  </main>
</template>

<style>
@import '@vue-flow/core/dist/style.css';
@import '@vue-flow/core/dist/theme-default.css';
@import '@vue-flow/controls/dist/style.css';
@import '@vue-flow/minimap/dist/style.css';

.vue-flow__node.flow-node {
  width: 230px;
  border: 1px solid var(--theme--border-color);
  border-radius: 6px;
  padding: 10px 12px;
  color: var(--theme--foreground);
  background: var(--theme--background-normal);
  box-shadow: 0 6px 18px rgb(15 23 42 / 10%);
  font-size: 12px;
}

.vue-flow__node.flow-node-sourceMaterial {
  border-color: #7c3aed;
}

.vue-flow__node.flow-node-evidenceChunk {
  border-color: #64748b;
}

.vue-flow__node.flow-node-citation {
  border-color: #0f766e;
}

.vue-flow__node.selected {
  box-shadow:
    0 0 0 2px var(--theme--primary),
    0 8px 24px rgb(15 23 42 / 14%);
}

.vue-flow__controls,
.vue-flow__minimap {
  border: 1px solid var(--theme--border-color);
  border-radius: 6px;
  overflow: hidden;
}
</style>

<style scoped>
.workbench {
  display: grid;
  gap: 20px;
  padding: 24px;
  color: var(--theme--foreground);
}

.topbar,
.controls,
.novel-manager,
.source-layout,
.metrics,
.workspace,
.signals,
.runtime-panel {
  border: 1px solid var(--theme--border-color);
  border-radius: 8px;
  background: var(--theme--background-normal);
}

.topbar,
.novel-manager,
.runtime-panel {
  padding: 20px;
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.topbar h1,
.panel-heading h2,
.signals h3,
.runtime-article h3 {
  margin: 0;
}

.eyebrow {
  margin: 0 0 4px;
  color: var(--theme--foreground-subdued);
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0;
}

.topbar-actions,
.runtime-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

button {
  border: 0;
  border-radius: 6px;
  padding: 10px 14px;
  color: var(--theme--primary-subdued);
  background: var(--theme--primary);
  font-weight: 700;
  cursor: pointer;
}

button:disabled {
  cursor: wait;
  opacity: 0.72;
}

.topic-preset-summary {
  grid-column: 1 / -1;
  margin: 0;
  font-size: 0.85rem;
  color: #5b6472;
}

.novel-manager {
  display: grid;
  gap: 16px;
  border: 1px solid var(--theme--border-color);
  border-radius: 8px;
  background: var(--theme--background-normal);
}

.novel-manager .panel-heading {
  align-items: flex-start;
}

.novel-manager .panel-heading p {
  margin: 6px 0 0;
  color: var(--theme--foreground-subdued);
  line-height: 1.5;
}

.novel-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(160px, 1fr));
  gap: 14px;
}

.novel-topic {
  grid-column: span 2;
}

.payload-preview {
  border: 1px solid var(--theme--border-color-subdued);
  border-radius: 6px;
  padding: 12px;
  background: var(--theme--background);
}

.payload-preview summary {
  cursor: pointer;
  color: var(--theme--foreground-subdued);
  font-weight: 700;
}

.payload-preview pre {
  margin: 12px 0 0;
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.6;
}

.controls {
  display: grid;
  grid-template-columns: repeat(4, minmax(180px, 1fr));
  gap: 16px;
  padding: 16px;
}

label {
  display: grid;
  gap: 8px;
  color: var(--theme--foreground-subdued);
  font-size: 13px;
  font-weight: 700;
}

label.checkbox-row {
  grid-template-columns: 1fr auto;
  align-items: center;
}

label.checkbox-row input[type='checkbox'] {
  width: auto;
}

textarea,
input {
  width: 100%;
  border: 1px solid var(--theme--border-color);
  border-radius: 6px;
  padding: 10px 12px;
  color: var(--theme--foreground);
  background: var(--theme--background);
  font: inherit;
}

.source-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(280px, 0.8fr);
}

.source-panel,
.source-note,
.graph-panel,
.inspector,
.runtime-article,
.signals {
  padding: 16px;
}

.source-note {
  border-left: 1px solid var(--theme--border-color);
}

.panel-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.source-search {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 120px;
  gap: 8px;
  margin-bottom: 12px;
}

.source-list {
  display: grid;
  gap: 10px;
  max-height: 420px;
  overflow: auto;
}

.source-item {
  display: grid;
  gap: 6px;
  text-align: left;
  border: 1px solid var(--theme--border-color-subdued);
  background: var(--theme--background);
  color: var(--theme--foreground);
}

.source-item.selected {
  border-color: var(--theme--primary);
}

.error {
  border-left: 3px solid var(--theme--danger);
  margin: 0;
  padding: 10px 12px;
  color: var(--theme--danger);
  background: var(--theme--danger-background);
}

.metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(120px, 1fr));
}

.metrics-inline {
  margin-top: 12px;
}

.metrics div {
  display: grid;
  gap: 6px;
  padding: 16px;
  border-right: 1px solid var(--theme--border-color);
}

.metrics div:last-child {
  border-right: 0;
}

.metrics span,
.source-item small,
.panel-heading span,
.selected-node small,
.citations small {
  color: var(--theme--foreground-subdued);
}

.metrics strong {
  font-size: 24px;
}

.workspace {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(360px, 0.9fr);
  min-height: 520px;
}

.detail-pane,
.graph-panel,
.signals {
  padding: 16px;
}

.inspector {
  border-left: 1px solid var(--theme--border-color);
}

.flow-shell {
  height: 520px;
  border: 1px solid var(--theme--border-color-subdued);
  border-radius: 8px;
  overflow: hidden;
  background: var(--theme--background);
}

.selected-node {
  display: grid;
  grid-template-columns: 126px minmax(0, 1fr);
  gap: 12px;
  align-items: start;
  border: 1px solid var(--theme--border-color-subdued);
  border-radius: 8px;
  margin-top: 12px;
  padding: 12px;
  background: var(--theme--background);
}

.citations {
  display: grid;
  gap: 8px;
  margin-top: 14px;
}

.citations article {
  border-bottom: 1px solid var(--theme--border-color-subdued);
  padding: 12px 0;
}

.citations p {
  margin: 0;
  line-height: 1.6;
}

.signals {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.signals span {
  border-radius: 4px;
  padding: 6px 8px;
  color: var(--theme--foreground-subdued);
  background: var(--theme--background-accent);
  font-size: 12px;
}

.runtime-article {
  display: grid;
  gap: 16px;
  border-top: 1px solid var(--theme--border-color-subdued);
  margin-top: 16px;
}

.runtime-article-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.runtime-article pre {
  margin: 0;
  padding: 12px;
  overflow: auto;
  border: 1px solid var(--theme--border-color-subdued);
  border-radius: 6px;
  background: var(--theme--background);
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.7;
}

@media (max-width: 960px) {
  .topbar,
  .novel-grid,
  .source-layout,
  .workspace,
  .runtime-article-grid,
  .topic-preset-summary {
  grid-column: 1 / -1;
  margin: 0;
  font-size: 0.85rem;
  color: #5b6472;
}

.controls {
    grid-template-columns: 1fr;
  }

  .topbar {
    display: grid;
  }

  .source-note,
  .inspector {
    border-left: 0;
    border-top: 1px solid var(--theme--border-color);
  }
}
</style>
