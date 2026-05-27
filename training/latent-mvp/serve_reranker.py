#!/usr/bin/env python3
"""Serve latent reranker API for Gateway integration."""
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any, List

import numpy as np
import torch
from fastapi import FastAPI
from pydantic import BaseModel, Field
from sentence_transformers import CrossEncoder


class Chunk(BaseModel):
    id: str
    text: str
    relevanceScore: float | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class RerankRequest(BaseModel):
    centralClaim: str
    chunks: List[Chunk]
    topK: int = 32


class RerankItem(BaseModel):
    id: str
    score: float
    rank: int


class GenerationControl(BaseModel):
    styleWeight: float
    factWeight: float
    modelVersion: str
    reason: str


class RerankResponse(BaseModel):
    ok: bool
    modelVersion: str
    reranked: List[RerankItem]
    generationControl: GenerationControl | None = None


def load_controller(controller_path: str | None) -> dict[str, Any] | None:
    if not controller_path:
        return None
    path = Path(controller_path)
    if not path.exists():
        raise FileNotFoundError(f"controller artifact not found: {controller_path}")
    payload = json.loads(path.read_text(encoding="utf-8"))
    coef = payload.get("coef")
    if not isinstance(coef, list) or len(coef) not in (5, 7):
        raise ValueError("controller artifact must contain 5 or 7 coefficients")
    return {
        "version": str(payload.get("version") or "latent-controller.v1"),
        "coef": np.array([float(item) for item in coef], dtype=np.float32),
        "intercept": float(payload.get("intercept", 0.0)),
    }


def clamp_weight(value: float, fallback: float) -> float:
    if not np.isfinite(value):
        return fallback
    return float(max(0.05, min(0.95, value)))


def chunk_feature_vector(chunks: List[Chunk], scores: List[float]) -> np.ndarray:
    if not chunks:
        return np.zeros((7,), dtype=np.float32)
    vector_similarity = []
    fused_relevance = []
    relevance_score = []
    quality_blocks = []
    coverage_scores = []
    style_signals = []
    fact_signals = []
    for index, chunk in enumerate(chunks):
        meta = chunk.metadata or {}
        source = str(
            meta.get("sourceId")
            or meta.get("source_id")
            or meta.get("documentId")
            or meta.get("document_id")
            or meta.get("provider")
            or ""
        ).lower()
        text = chunk.text or ""
        vector_similarity.append(float(meta.get("vectorSimilarity") or meta.get("vector_similarity") or 0.0))
        fused_relevance.append(float(meta.get("fusedRelevance") or meta.get("fusedRelevanceScore") or meta.get("fused_relevance_score") or 0.0))
        relevance_score.append(float(chunk.relevanceScore or 0.0))
        quality_blocks.append(float(meta.get("qualityBlockCount") or meta.get("quality_block_count") or 0.0))
        coverage_scores.append(float(meta.get("referenceCoverageScore") or meta.get("reference_coverage_score") or 0.0))
        style_signals.append(float(meta.get("styleSignal") or meta.get("style_signal") or infer_style_signal(source, text)))
        fact_signals.append(float(meta.get("factSignal") or meta.get("fact_signal") or infer_fact_signal(source, text)))
    if scores:
        relevance_score.append(float(np.mean(scores)))
    return np.array([
        float(np.mean(vector_similarity)) if vector_similarity else 0.0,
        float(np.mean(fused_relevance)) if fused_relevance else 0.0,
        float(np.mean(relevance_score)) if relevance_score else 0.0,
        float(np.mean(quality_blocks)) if quality_blocks else 0.0,
        float(np.mean(coverage_scores)) if coverage_scores else 0.0,
        float(np.mean(style_signals)) if style_signals else 0.0,
        float(np.mean(fact_signals)) if fact_signals else 0.0,
    ], dtype=np.float32)


def infer_style_signal(source: str, text: str) -> float:
    if "kinkakuji" in source or "restricted_style" in source:
        return 0.95
    if "xingwang" in source or "world_history" in source:
        return 0.35
    value = str(text or "")
    hits = 0
    for pattern in ("光", "影", "身体", "恐惧", "羞耻", "欲望", "沉默", "毁灭"):
        if pattern in value:
            hits += 1
    return min(0.8, hits / 8.0)


def infer_fact_signal(source: str, text: str) -> float:
    if "xingwang" in source or "world_history" in source:
        return 0.9
    if "kinkakuji" in source or "restricted_style" in source:
        return 0.15
    value = str(text or "")
    hits = 0
    for pattern in ("制度", "国家", "社会", "战争", "贸易", "宗教", "阶层", "历史", "结构", "权力"):
        if pattern in value:
            hits += 1
    return min(0.9, hits / 10.0)


def resolve_generation_control(
    controller: dict[str, Any] | None,
    model_path: str,
    chunks: List[Chunk],
    scores: List[float],
) -> GenerationControl | None:
    if not controller:
        return None
    features = chunk_feature_vector(chunks, scores)
    coef = controller["coef"]
    if len(coef) != len(features):
        features = features[:len(coef)]
    style = float(np.dot(features, coef) + controller["intercept"])
    style_weight = clamp_weight(style, 0.4)
    fact_weight = clamp_weight(1.0 - style_weight, 0.6)
    return GenerationControl(
        styleWeight=style_weight,
        factWeight=fact_weight,
        modelVersion=f'{model_path}+{controller["version"]}',
        reason=(
            f'controller={controller["version"]}; '
            f'features=[vector={features[0]:.3f},fused={features[1]:.3f},'
            f'relevance={features[2]:.3f},blocks={features[3]:.3f},coverage={features[4]:.3f}'
            + (f',style={features[5]:.3f},fact={features[6]:.3f}' if len(features) >= 7 else '')
            + ']'
        ),
    )


def create_app(model_path: str, controller_path: str | None = None) -> FastAPI:
    model = CrossEncoder(model_path, num_labels=1, device="cuda" if torch.cuda.is_available() else "cpu")
    controller = load_controller(controller_path)
    app = FastAPI(title="latent-reranker")

    @app.get("/health")
    def health() -> dict[str, Any]:
        return {
            "ok": True,
            "model": model_path,
            "controller": controller["version"] if controller else None,
        }

    @app.post("/rerank", response_model=RerankResponse)
    def rerank(payload: RerankRequest) -> RerankResponse:
        if not payload.chunks:
            return RerankResponse(ok=True, modelVersion=model_path, reranked=[], generationControl=None)
        pairs = [[payload.centralClaim, chunk.text] for chunk in payload.chunks]
        scores = model.predict(pairs)
        ranked = []
        for index, chunk in enumerate(payload.chunks):
            ranked.append((chunk.id, float(scores[index])))
        ranked.sort(key=lambda item: item[1], reverse=True)
        selected = ranked[: max(1, payload.topK)]
        return RerankResponse(
            ok=True,
            modelVersion=model_path,
            reranked=[RerankItem(id=item[0], score=item[1], rank=i + 1) for i, item in enumerate(selected)],
            generationControl=resolve_generation_control(
                controller,
                model_path,
                payload.chunks,
                [float(score) for score in scores],
            ),
        )

    return app


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", required=True)
    parser.add_argument("--controller")
    parser.add_argument("--host", default="0.0.0.0")
    parser.add_argument("--port", type=int, default=8765)
    args = parser.parse_args()

    import uvicorn

    uvicorn.run(create_app(args.model, args.controller), host=args.host, port=args.port)


if __name__ == "__main__":
    main()
