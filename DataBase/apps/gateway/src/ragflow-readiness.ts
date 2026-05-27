import type { GatewayConfig } from "./config.js";

type RagflowConfig = GatewayConfig["evidenceRagflow"];

export type RagflowReadinessStatus =
  | "not_configured"
  | "misconfigured"
  | "http_error"
  | "dataset_error"
  | "dataset_missing"
  | "embedding_missing"
  | "document_failed"
  | "retrieval_empty"
  | "retrieval_without_text"
  | "ok";

export interface RagflowReadinessReport {
  ok: boolean;
  status: RagflowReadinessStatus;
  provider: "ragflow.retrieval";
  message: string;
  baseUrl: string | null;
  datasetCount: number;
  documentFilterCount: number;
  visibleDatasetCount?: number;
  missingDatasetIds?: string[];
  datasetsWithoutEmbedding?: string[];
  failedDocuments?: Array<{
    datasetId: string;
    documentId: string;
    documentName: string;
    progressMessage: string;
  }>;
  query?: string;
  chunkCount?: number;
  sample?: Array<{
    id: string;
    datasetId: string;
    documentId: string;
    documentName: string;
    score: number | null;
    textLength: number;
  }>;
}

interface RagflowDataset {
  id?: string;
  embedding_model?: string;
  embd_id?: string;
}

interface RagflowChunk {
  id?: string;
  content?: string;
  content_ltks?: string;
  document_id?: string;
  document_keyword?: string;
  document_name?: string;
  dataset_id?: string;
  kb_id?: string;
  similarity?: number;
}

export async function checkRagflowReadiness(input: {
  config: RagflowConfig;
  query?: string;
  limit?: number;
  timeoutMs?: number;
  requireRetrievalChunks?: boolean;
}): Promise<RagflowReadinessReport> {
  const config = input.config;
  const timeoutMs = clampNumber(input.timeoutMs, 3000, 1000, 120000);
  const limit = clampNumber(input.limit, 10, 1, 50);
  const query = String(input.query || "新地主阶级 通道租").trim();

  if (!config) {
    return report("not_configured", "RAGFlow EvidenceProvider is not configured.", null, 0, 0);
  }

  const baseUrl = config.baseUrl.replace(/\/+$/, "");
  const datasetIds = config.datasetIds;
  const documentIds = config.documentIds;
  if (!baseUrl || !config.apiKey || datasetIds.length === 0) {
    return report(
      "misconfigured",
      "DATABASE_EVIDENCE_RAGFLOW_URL, DATABASE_EVIDENCE_RAGFLOW_API_KEY and DATABASE_EVIDENCE_RAGFLOW_DATASET_IDS are required.",
      baseUrl || null,
      datasetIds.length,
      documentIds.length
    );
  }

  const datasetsResponse = await requestRagflow({
    baseUrl,
    apiKey: config.apiKey,
    path: "/api/v1/datasets",
    timeoutMs,
  });
  if (!datasetsResponse.ok) {
    const status = datasetsResponse.httpStatus === 401 || datasetsResponse.httpStatus === 403
      ? "misconfigured"
      : "dataset_error";
    return report(status, datasetsResponse.message, baseUrl, datasetIds.length, documentIds.length);
  }

  const datasets = normalizeDatasets(datasetsResponse.payload);
  const datasetById = new Map(datasets.map((item) => [String(item.id || ""), item]));
  const missingDatasetIds = datasetIds.filter((id) => !datasetById.has(id));
  if (missingDatasetIds.length > 0) {
    return {
      ...report("dataset_missing", "Configured RAGFlow datasets are not visible to this API key.", baseUrl, datasetIds.length, documentIds.length),
      visibleDatasetCount: datasets.length,
      missingDatasetIds,
    };
  }

  const datasetsWithoutEmbedding = datasetIds.filter((id) => {
    const dataset = datasetById.get(id) || {};
    return !String(dataset.embedding_model || dataset.embd_id || "").trim();
  });
  if (datasetsWithoutEmbedding.length > 0) {
    return {
      ...report("embedding_missing", "RAGFlow datasets have no embedding model configured.", baseUrl, datasetIds.length, documentIds.length),
      visibleDatasetCount: datasets.length,
      datasetsWithoutEmbedding,
    };
  }

  if (!input.requireRetrievalChunks) {
    return {
      ...report("ok", "RAGFlow API, dataset visibility and embedding configuration are ready.", baseUrl, datasetIds.length, documentIds.length),
      visibleDatasetCount: datasets.length,
    };
  }

  const failedDocuments = await collectFailedDocuments({
    baseUrl,
    apiKey: config.apiKey,
    datasetIds,
    timeoutMs,
  });
  if (failedDocuments.length > 0) {
    return {
      ...report("document_failed", "RAGFlow dataset contains failed documents; fix provider/indexing before retrieval can be trusted.", baseUrl, datasetIds.length, documentIds.length),
      visibleDatasetCount: datasets.length,
      failedDocuments,
    };
  }

  const retrieval = await requestRagflow({
    baseUrl,
    apiKey: config.apiKey,
    path: "/api/v1/retrieval",
    method: "POST",
    timeoutMs,
    body: {
      question: query,
      dataset_ids: datasetIds,
      page: 1,
      page_size: limit,
      similarity_threshold: config.similarityThreshold,
      vector_similarity_weight: config.vectorSimilarityWeight,
      top_k: config.topK,
      keyword: true,
      highlight: false,
      use_kg: config.useKg,
      toc_enhance: config.tocEnhance,
      ...(documentIds.length > 0 ? { document_ids: documentIds } : {}),
    },
  });
  if (!retrieval.ok) {
    return report("dataset_error", retrieval.message, baseUrl, datasetIds.length, documentIds.length);
  }

  const chunks = Array.isArray(retrieval.payload?.data?.chunks)
    ? retrieval.payload.data.chunks as RagflowChunk[]
    : [];
  if (chunks.length === 0) {
    return {
      ...report("retrieval_empty", "RAGFlow retrieval returned zero chunks; parse/index source documents first.", baseUrl, datasetIds.length, documentIds.length),
      visibleDatasetCount: datasets.length,
      query,
      chunkCount: 0,
    };
  }

  const textBearingChunks = chunks.filter((item) => String(item.content || item.content_ltks || "").trim());
  if (textBearingChunks.length === 0) {
    return {
      ...report("retrieval_without_text", "RAGFlow retrieval returned chunks, but none contained usable text.", baseUrl, datasetIds.length, documentIds.length),
      visibleDatasetCount: datasets.length,
      query,
      chunkCount: chunks.length,
      sample: sampleChunks(chunks),
    };
  }

  return {
    ...report("ok", "RAGFlow retrieval returned text-bearing chunks.", baseUrl, datasetIds.length, documentIds.length),
    visibleDatasetCount: datasets.length,
    query,
    chunkCount: chunks.length,
    sample: sampleChunks(chunks),
  };
}

async function collectFailedDocuments(input: {
  baseUrl: string;
  apiKey: string;
  datasetIds: string[];
  timeoutMs: number;
}): Promise<NonNullable<RagflowReadinessReport["failedDocuments"]>> {
  const failed: NonNullable<RagflowReadinessReport["failedDocuments"]> = [];
  for (const datasetId of input.datasetIds) {
    const response = await requestRagflow({
      baseUrl: input.baseUrl,
      apiKey: input.apiKey,
      path: `/api/v1/datasets/${datasetId}/documents`,
      timeoutMs: input.timeoutMs,
    });
    if (!response.ok) continue;
    const docs = Array.isArray(response.payload?.data?.docs) ? response.payload.data.docs : [];
    for (const doc of docs) {
      if (String(doc?.run || "").toUpperCase() !== "FAIL") continue;
      failed.push({
        datasetId,
        documentId: String(doc?.id || ""),
        documentName: String(doc?.name || doc?.location || ""),
        progressMessage: String(doc?.progress_msg || "").trim().slice(0, 1200),
      });
    }
  }
  return failed;
}

function report(
  status: RagflowReadinessStatus,
  message: string,
  baseUrl: string | null,
  datasetCount: number,
  documentFilterCount: number
): RagflowReadinessReport {
  return {
    ok: status === "ok",
    status,
    provider: "ragflow.retrieval",
    message,
    baseUrl,
    datasetCount,
    documentFilterCount,
  };
}

async function requestRagflow(input: {
  baseUrl: string;
  apiKey: string;
  path: string;
  method?: "GET" | "POST";
  timeoutMs: number;
  expectJson?: boolean;
  body?: unknown;
}): Promise<{ ok: boolean; message: string; httpStatus?: number; payload?: any }> {
  try {
    const response = await fetch(`${input.baseUrl}${input.path}`, {
      method: input.method || "GET",
      headers: {
        accept: input.expectJson === false ? "text/plain, application/json" : "application/json",
        authorization: `Bearer ${input.apiKey}`,
        ...(input.body ? { "content-type": "application/json" } : {}),
      },
      body: input.body ? JSON.stringify(input.body) : undefined,
      signal: AbortSignal.timeout(input.timeoutMs),
    });
    const text = await response.text();
    const payload = text ? JSON.parse(text) : null;
    if (!response.ok) {
      return {
        ok: false,
        message: `RAGFlow ${input.path} returned HTTP ${response.status}.`,
        httpStatus: response.status,
        payload,
      };
    }
    if (payload?.code !== 0) {
      return {
        ok: false,
        message: `RAGFlow ${input.path} failed: ${String(payload?.message || "unknown error")}.`,
        httpStatus: response.status,
        payload,
      };
    }
    return { ok: true, message: "RAGFlow request succeeded.", httpStatus: response.status, payload };
  } catch (error) {
    const cause = (error as { cause?: unknown }).cause as { code?: string; message?: string } | undefined;
    const code = String(cause?.code || (error as Error).name || "").trim();
    const detail = String(cause?.message || (error as Error).message || "unknown transport error");
    return {
      ok: false,
      message: [
        `RAGFlow API is not reachable at ${input.baseUrl}${input.path}.`,
        code ? `transport=${code}.` : "",
        `detail=${detail}.`,
      ].filter(Boolean).join(" "),
    };
  }
}

function normalizeDatasets(payload: any): RagflowDataset[] {
  const data = payload?.data;
  if (Array.isArray(data)) return data as RagflowDataset[];
  if (Array.isArray(data?.datasets)) return data.datasets as RagflowDataset[];
  return [];
}

function sampleChunks(chunks: RagflowChunk[]) {
  return chunks.slice(0, 3).map((chunk) => ({
    id: chunk.id || "",
    datasetId: chunk.dataset_id || chunk.kb_id || "",
    documentId: chunk.document_id || "",
    documentName: chunk.document_name || chunk.document_keyword || "",
    score: chunk.similarity ?? null,
    textLength: String(chunk.content || chunk.content_ltks || "").length,
  }));
}

function clampNumber(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}
