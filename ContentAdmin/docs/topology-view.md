# Topology View

The topology view renders content relationships as nodes and edges.

## Initial Layers

```text
Novel structure:
  Work -> Volume -> Chapter

World structure:
  Work -> WorldSetting -> Location -> Faction

Character usage:
  Character -> Chapter -> Event

Evidence usage:
  SourceMaterial -> EvidenceChunk -> Citation -> Article/Chapter

Generation workflow:
  EvidencePack -> WriterAgent -> ReviewerAgent -> FinalBody
```

## Contract

Topology data should be delivered by DataBase Gateway or generated SDK calls.
The UI expects normalized nodes and edges:

```ts
type ContentTopologyNode = {
  id: string;
  kind: string;
  label: string;
  title?: string;
  subtitle?: string;
  metadata?: Record<string, unknown>;
};

type ContentTopologyEdge = {
  id: string;
  source: string;
  target: string;
  kind: string;
  label?: string;
  metadata?: Record<string, unknown>;
};
```

The Directus module should not assemble topology by querying arbitrary tables in
the browser. It should use SDK/Gateway projections.

## Current Directus Module

`directus-extension-content-topology` currently implements the Evidence usage
slice first:

```text
Directus module
  -> /evidence-search/search
  -> ContentAdmin DataBase SDK adapter
  -> DataBase Gateway /evidence/search
  -> EvidencePack
  -> in-memory ContentTopologyGraph projection
```

The projection is read-only UI state. It is derived from the returned
EvidencePack and is not persisted as a second graph database.

Rendered panes:

- query controls: query text, source IDs, limit
- source catalog: SDK-provided `ContentSourceSummary` records and stable `sourceId` selection
- EvidencePack metrics: sources, chunks, citations, query rounds
- Evidence graph: Vue Flow renders Query -> Source -> Chunk -> Citation
- citation readback: locator, excerpt, relevance score, source ID
- selected node inspector: kind, title, subtitle, source ID
- ranking signals: DataBase screening signals

## Graph Renderer

The graph renderer uses Vue Flow packages:

```text
@vue-flow/core
@vue-flow/background
@vue-flow/controls
@vue-flow/minimap
```

This keeps topology interaction on a mature Vue graph framework while the graph
data remains a read-only projection from DataBase EvidencePack.
