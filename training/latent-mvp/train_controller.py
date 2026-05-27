#!/usr/bin/env python3
"""Train minimal latent style/fact blend controller."""
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Dict, List, Tuple

import numpy as np
from sklearn.linear_model import Ridge
from sklearn.metrics import mean_absolute_error


def load_rows(path: Path) -> List[Tuple[List[float], float]]:
    rows: List[Tuple[List[float], float]] = []
    with path.open("r", encoding="utf-8") as handle:
        for line in handle:
            line = line.strip()
            if not line:
                continue
            obj = json.loads(line)
            feat = obj.get("features") or {}
            x = [
                float(feat.get("vectorSimilarity", 0.0)),
                float(feat.get("fusedRelevance", 0.0)),
                float(feat.get("relevanceScore", 0.0)),
                float(feat.get("qualityBlockCount", 0.0)),
                float(feat.get("referenceCoverageScore", 0.0)),
                float(feat.get("styleSignal", 0.0)),
                float(feat.get("factSignal", 0.0)),
            ]
            label = int(obj.get("label", 0))
            task_kind = str(obj.get("taskKind") or "")
            if label != 1:
                y = 0.25
            elif task_kind == "style_profile_positive":
                y = 0.75
            elif task_kind == "historical_reasoning_positive":
                y = 0.35
            else:
                y = 0.5
            rows.append((x, y))
    return rows


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--train", required=True)
    parser.add_argument("--val", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    train = load_rows(Path(args.train))
    val = load_rows(Path(args.val))
    if not train:
        raise SystemExit("empty train set")

    x_train = np.array([row[0] for row in train], dtype=np.float32)
    y_train = np.array([row[1] for row in train], dtype=np.float32)
    x_val = np.array([row[0] for row in val], dtype=np.float32) if val else np.zeros((0, 7), dtype=np.float32)
    y_val = np.array([row[1] for row in val], dtype=np.float32) if val else np.zeros((0,), dtype=np.float32)

    model = Ridge(alpha=1.0)
    model.fit(x_train, y_train)

    pred = np.clip(model.predict(x_val), 0.0, 1.0) if len(x_val) else np.array([])
    mae = float(mean_absolute_error(y_val, pred)) if len(pred) else 0.0

    output = Path(args.output)
    output.mkdir(parents=True, exist_ok=True)
    payload: Dict[str, object] = {
        "version": "latent-controller.v1",
        "features": [
            "vectorSimilarity",
            "fusedRelevance",
            "relevanceScore",
            "qualityBlockCount",
            "referenceCoverageScore",
            "styleSignal",
            "factSignal",
        ],
        "coef": model.coef_.tolist(),
        "intercept": float(model.intercept_),
        "valMae": mae,
    }
    (output / "controller.json").write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(json.dumps(payload, indent=2))


if __name__ == "__main__":
    main()
