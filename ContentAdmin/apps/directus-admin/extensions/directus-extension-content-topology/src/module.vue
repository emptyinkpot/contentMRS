<script setup lang="ts">
import { computed, ref } from 'vue';
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

const query = ref('通盘掌握时代空间 凯撒 宴会 卢比孔河');
const sourceIds = ref('book_xingwang_world_history_21');
const limit = ref(3);
const loading = ref(false);
const error = ref('');
const evidencePack = ref<EvidencePack | null>(null);
const selectedNodeId = ref<string>('');

function splitCsv(value: string): string[] {
  return value
    .split(/[，,、\s]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function shortText(value: unknown, maxLength = 220): string {
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
    if (nodes.has(sourceNodeId)) {
      edges.set(`edge:${sourceNodeId}:${chunkNodeId}`, {
        id: `edge:${sourceNodeId}:${chunkNodeId}`,
        source: sourceNodeId,
        target: chunkNodeId,
        kind: 'contains',
        label: 'contains chunk',
      });
    } else {
      edges.set(`edge:${rootId}:${chunkNodeId}`, {
        id: `edge:${rootId}:${chunkNodeId}`,
        source: rootId,
        target: chunkNodeId,
        kind: 'supports',
        label: 'returned chunk',
      });
    }
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

function nodeClassName(kind: string): string {
  return `flow-node flow-node-${kind.replace(/[^a-z0-9_-]/gi, '-').toLowerCase()}`;
}

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
    position: {
      x: 40 + column * 310,
      y: 60 + (index % 8) * 96,
    },
    class: nodeClassName(String(node.kind)),
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
    style: {
      stroke: color,
      strokeWidth: 1.8,
    },
    labelStyle: {
      fill: color,
      fontWeight: 600,
    },
  };
}

const flowNodes = computed<Node[]>(() => topology.value?.nodes.map(mapToFlowNode) || []);
const flowEdges = computed<Edge[]>(() => topology.value?.edges.map(mapToFlowEdge) || []);

function selectFlowNode(event: NodeMouseEvent) {
  selectedNodeId.value = event.node.id;
}

const metrics = computed(() => {
  const counts = evidencePack.value?.counts || {};
  return [
    { label: 'Sources', value: counts.sources ?? evidencePack.value?.sources?.length ?? 0 },
    { label: 'Chunks', value: counts.chunks ?? evidencePack.value?.chunks?.length ?? 0 },
    { label: 'Citations', value: counts.citations ?? evidencePack.value?.citations?.length ?? 0 },
    { label: 'Query rounds', value: counts.queryRounds ?? 0 },
  ];
});

async function searchEvidence() {
  const q = query.value.trim();
  if (!q) {
    error.value = 'Query is required.';
    return;
  }

  loading.value = true;
  error.value = '';

  try {
    const params = new URLSearchParams({
      q,
      limit: String(limit.value || 3),
    });

    const selectedSourceIds = splitCsv(sourceIds.value);
    if (selectedSourceIds.length > 0) {
      params.set('sourceIds', selectedSourceIds.join(','));
    }

    const response = await fetch(`/evidence-search/search?${params.toString()}`, {
      headers: { accept: 'application/json' },
    });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload?.error || payload?.errors?.[0]?.message || `Request failed: ${response.status}`);
    }

    evidencePack.value = payload as EvidencePack;
    selectedNodeId.value = '';
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : String(cause);
  } finally {
    loading.value = false;
  }
}

void searchEvidence();
</script>

<template>
  <private-view title="Content Topology">
    <div class="content-topology-shell">
      <section class="query-band">
        <div>
          <h2>Evidence topology</h2>
          <p>Query DataBase EvidencePack through the Directus server endpoint.</p>
        </div>

        <button class="primary-action" type="button" :disabled="loading" @click="searchEvidence">
          {{ loading ? 'Searching...' : 'Search' }}
        </button>
      </section>

      <section class="search-controls" aria-label="EvidencePack search controls">
        <label>
          <span>Query</span>
          <textarea v-model="query" rows="3" />
        </label>

        <label>
          <span>Source IDs</span>
          <input v-model="sourceIds" type="text" />
        </label>

        <label>
          <span>Limit</span>
          <input v-model.number="limit" min="1" max="50" type="number" />
        </label>
      </section>

      <p v-if="error" class="error-line">{{ error }}</p>

      <section v-if="evidencePack" class="metrics-row" aria-label="EvidencePack metrics">
        <div v-for="metric in metrics" :key="metric.label" class="metric">
          <span>{{ metric.label }}</span>
          <strong>{{ metric.value }}</strong>
        </div>
      </section>

      <section v-if="topology" class="workspace">
        <div class="topology-pane">
          <div class="section-heading">
            <h3>Evidence graph</h3>
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
              <Background pattern-color="var(--theme--border-color-subdued)" :gap="18" />
              <Controls position="bottom-left" />
              <MiniMap position="bottom-right" pannable zoomable />
            </VueFlow>
          </div>

          <div v-if="selectedNode" class="selected-node">
            <span class="node-kind">{{ selectedNode.kind }}</span>
            <div>
              <strong>{{ selectedNode.title }}</strong>
              <small v-if="selectedNode.subtitle">{{ selectedNode.subtitle }}</small>
              <small v-if="selectedNode.sourceId">{{ selectedNode.sourceId }}</small>
            </div>
          </div>

          <div class="node-columns">
            <article v-for="node in topology.nodes" :key="node.id" class="node-row">
              <span class="node-kind">{{ node.kind }}</span>
              <div>
                <strong>{{ node.title }}</strong>
                <small v-if="node.subtitle">{{ node.subtitle }}</small>
              </div>
            </article>
          </div>
        </div>

        <aside class="detail-pane">
          <div class="section-heading">
            <h3>Citations</h3>
            <span>{{ evidencePack.citations?.length || 0 }}</span>
          </div>

          <article v-for="citation in evidencePack.citations" :key="citation.id || citation.chunkId" class="citation">
            <strong>{{ citation.locator || citation.title }}</strong>
            <p>{{ shortText(citation.excerpt, 360) }}</p>
            <small>score {{ citation.relevanceScore ?? 0 }} · {{ citation.sourceId }}</small>
          </article>
        </aside>
      </section>

      <section v-if="evidencePack?.screening?.rankingSignals?.length" class="signals">
        <h3>Ranking signals</h3>
        <div>
          <span v-for="signal in evidencePack.screening.rankingSignals" :key="signal">{{ signal }}</span>
        </div>
      </section>
    </div>
  </private-view>
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
.content-topology-shell {
  display: grid;
  gap: 20px;
  padding: 24px;
  color: var(--theme--foreground);
}

.query-band,
.search-controls,
.metrics-row,
.workspace,
.signals {
  border: 1px solid var(--theme--border-color);
  border-radius: 8px;
  background: var(--theme--background-normal);
}

.query-band {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 20px;
}

.query-band h2,
.section-heading h3,
.signals h3 {
  margin: 0;
}

.query-band p {
  margin: 6px 0 0;
  color: var(--theme--foreground-subdued);
}

.primary-action {
  min-width: 112px;
  border: 0;
  border-radius: 6px;
  padding: 10px 16px;
  color: var(--theme--primary-subdued);
  background: var(--theme--primary);
  font-weight: 700;
  cursor: pointer;
}

.primary-action:disabled {
  cursor: wait;
  opacity: 0.72;
}

.search-controls {
  display: grid;
  grid-template-columns: minmax(280px, 1fr) minmax(220px, 360px) 120px;
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

.error-line {
  border-left: 3px solid var(--theme--danger);
  margin: 0;
  padding: 10px 12px;
  color: var(--theme--danger);
  background: var(--theme--danger-background);
}

.metrics-row {
  display: grid;
  grid-template-columns: repeat(4, minmax(120px, 1fr));
}

.metric {
  display: grid;
  gap: 6px;
  padding: 16px;
  border-right: 1px solid var(--theme--border-color);
}

.metric:last-child {
  border-right: 0;
}

.metric span,
.section-heading span,
.citation small,
.node-row small {
  color: var(--theme--foreground-subdued);
}

.metric strong {
  font-size: 24px;
}

.workspace {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(360px, 0.9fr);
  min-height: 520px;
}

.topology-pane,
.detail-pane,
.signals {
  padding: 16px;
}

.detail-pane {
  border-left: 1px solid var(--theme--border-color);
}

.section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
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

.node-columns {
  display: grid;
  gap: 8px;
  margin-top: 14px;
  max-height: 650px;
  overflow: auto;
}

.node-row {
  display: grid;
  grid-template-columns: 126px minmax(0, 1fr);
  gap: 12px;
  align-items: start;
  border-bottom: 1px solid var(--theme--border-color-subdued);
  padding: 10px 0;
}

.node-kind {
  border-radius: 4px;
  padding: 4px 6px;
  color: var(--theme--foreground-subdued);
  background: var(--theme--background-accent);
  font-size: 12px;
  font-weight: 700;
}

.node-row div,
.citation {
  display: grid;
  gap: 6px;
}

.citation {
  border-bottom: 1px solid var(--theme--border-color-subdued);
  padding: 12px 0;
}

.citation p {
  margin: 0;
  line-height: 1.6;
}

.signals {
  display: grid;
  gap: 12px;
}

.signals div {
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

@media (max-width: 960px) {
  .query-band,
  .workspace {
    grid-template-columns: 1fr;
  }

  .query-band {
    display: grid;
  }

  .search-controls,
  .metrics-row,
  .workspace {
    grid-template-columns: 1fr;
  }

  .detail-pane {
    border-left: 0;
    border-top: 1px solid var(--theme--border-color);
  }
}
</style>
