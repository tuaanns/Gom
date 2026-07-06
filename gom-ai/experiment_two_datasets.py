from __future__ import annotations

import argparse
import asyncio
import copy
import csv
import json
import math
import os
import re
import sys
import time
import unicodedata
from collections import Counter
from datetime import datetime
from pathlib import Path


ROOT = Path(__file__).resolve().parent
PROJECT_ROOT = ROOT.parent
sys.path.insert(0, str(ROOT))

from dotenv import load_dotenv

load_dotenv(ROOT / ".env", override=True)

from app.agents.base_agent import key_rotator
from app.agents.vision_agent import VisionAgent
from app.debate.debate_engine import DebateEngine


DATASETS = {
    "dataset1_video": {
        "root": PROJECT_ROOT / "dataset" / "video_experiment_100",
        "manifest": PROJECT_ROOT / "dataset" / "video_experiment_100" / "manifest.csv",
        "label_column": "ceramic_tradition",
        "filename_column": "filename",
    },
    "dataset2_ai": {
        "root": PROJECT_ROOT / "dataset" / "ai_generated_collection_100",
        "manifest": PROJECT_ROOT / "dataset" / "ai_generated_collection_100" / "manifest.csv",
        "label_column": "tradition",
        "filename_column": "filename",
    },
}

CANONICAL_LABELS = [
    "Bat Trang",
    "Bien Hoa",
    "Phu Lang",
    "Chu Dau",
    "Bau Truc",
    "Goryeo Celadon",
    "Arita Imari",
    "Delftware",
    "Iznik",
    "Meissen",
    "Jingdezhen",
    "Aynsley Pembroke",
    "Noritake",
    "Gien Faience",
]

ALIASES = {
    "Bat Trang": ["bat trang", "gom bat trang", "bat trang ceramics"],
    "Bien Hoa": ["bien hoa", "gom bien hoa", "bien hoa ceramics"],
    "Phu Lang": ["phu lang", "gom phu lang", "phu lang ceramics"],
    "Chu Dau": ["chu dau", "gom chu dau", "chu dau ceramics"],
    "Bau Truc": ["bau truc", "gom bau truc", "bau truc ceramics"],
    "Goryeo Celadon": ["goryeo", "goryeo celadon", "korean celadon", "celadon goryeo"],
    "Arita Imari": ["arita", "imari", "kakiemon", "arita imari", "arita kakiemon"],
    "Delftware": ["delft", "delftware", "delft blue", "royal delft"],
    "Iznik": ["iznik", "iznik pottery", "iznik ware"],
    "Meissen": ["meissen", "meissen porcelain"],
    "Jingdezhen": ["jingdezhen", "canh duc tran", "jingdezhen porcelain", "famille rose", "fencai", "famille verte"],
    "Aynsley Pembroke": ["aynsley", "aynsley pembroke", "pembroke"],
    "Noritake": ["noritake", "noritake floral"],
    "Gien Faience": ["gien", "gien faience", "vieux rouen"],
}

METHODS = ["gemini", "chatgpt", "grok", "acis"]
AGENT_METHOD_ORDER = ["chatgpt", "grok", "gemini"]
RESULTS_ROOT = ROOT / "experiment_results"
FORCE_VISION_FILENAMES: set[str] = set()


def normalize(text: str | None) -> str:
    if not text:
        return ""
    value = unicodedata.normalize("NFKD", str(text).lower())
    value = "".join(char for char in value if not unicodedata.combining(char))
    value = value.replace("đ", "d")
    value = re.sub(r"[^a-z0-9]+", " ", value)
    return re.sub(r"\s+", " ", value).strip()


NORMALIZED_ALIASES = {
    label: [normalize(alias) for alias in aliases]
    for label, aliases in ALIASES.items()
}


def canonical_label(text: str | None) -> str | None:
    value = normalize(text)
    if not value:
        return None
    candidates = []
    for label, aliases in NORMALIZED_ALIASES.items():
        for alias in aliases:
            if value == alias or alias in value:
                candidates.append((len(alias), label))
    if not candidates:
        return None
    return max(candidates)[1]


def load_dataset(dataset_id: str) -> list[dict]:
    config = DATASETS[dataset_id]
    items = []
    with config["manifest"].open(encoding="utf-8-sig", newline="") as handle:
        for row in csv.DictReader(handle):
            raw_label = row[config["label_column"]]
            label = canonical_label(raw_label)
            if label is None:
                raise ValueError(f"Unsupported ground-truth label: {raw_label}")
            relative_path = Path(row[config["filename_column"]])
            path = config["root"] / relative_path
            if not path.exists():
                raise FileNotFoundError(path)
            items.append(
                {
                    "id": int(row["index"]),
                    "filename": relative_path.as_posix(),
                    "path": str(path),
                    "label": label,
                    "metadata": row,
                }
            )
    return items


def load_json(path: Path, default):
    if not path.exists():
        return copy.deepcopy(default)
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return copy.deepcopy(default)


def save_json(path: Path, data) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_suffix(f"{path.suffix}.{os.getpid()}.tmp")
    temp.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    for attempt in range(5):
        try:
            temp.replace(path)
            return
        except PermissionError:
            if attempt == 4:
                raise
            time.sleep(0.2 * (attempt + 1))


async def get_visual_features(
    vision: VisionAgent,
    image: dict,
    cache: dict,
    cache_path: Path,
) -> dict:
    key = image["filename"]
    cached = cache.get(key)
    if isinstance(cached, list):
        cached = next((item for item in cached if isinstance(item, dict)), None)
        if cached is not None:
            cache[key] = cached
            save_json(cache_path, cache)
    if key in FORCE_VISION_FILENAMES:
        cached = None
    if isinstance(cached, dict) and "error" not in cached:
        return cached
    image_bytes = Path(image["path"]).read_bytes()
    features = await vision.analyze(image_bytes)
    if isinstance(features, list):
        features = next((item for item in features if isinstance(item, dict)), {})
    cache[key] = features
    save_json(cache_path, cache)
    return features


def extract_agent_record(agent_result: dict, truth: str) -> dict:
    prediction = agent_result.get("prediction") if isinstance(agent_result, dict) else {}
    if not isinstance(prediction, dict):
        prediction = {}
    raw_label = prediction.get("ceramic_line")
    predicted = canonical_label(raw_label)
    error = agent_result.get("error")
    is_unknown = normalize(raw_label) in {"", "unknown", "khong ro"}
    return {
        "raw_prediction": raw_label,
        "predicted_label": predicted,
        "confidence": float(agent_result.get("confidence") or 0),
        "evidence": str(agent_result.get("evidence") or "")[:1000],
        "is_correct": predicted == truth,
        "is_hallucinated": not error and not is_unknown and predicted is None,
        "error": error,
    }


def extract_acis_record(debate_result: dict, truth: str) -> dict:
    report = debate_result.get("final_report") or {}
    raw_label = report.get("final_prediction")
    predicted = canonical_label(raw_label)
    error = debate_result.get("error") or report.get("error")
    is_unknown = normalize(raw_label) in {"", "unknown", "khong ro"}
    try:
        confidence = float(report.get("certainty") or 0) / 100.0
    except (TypeError, ValueError):
        confidence = 0.0
    return {
        "raw_prediction": raw_label,
        "predicted_label": predicted,
        "confidence": confidence,
        "evidence": str(report.get("reasoning") or "")[:1000],
        "is_correct": predicted == truth,
        "is_hallucinated": not error and not is_unknown and predicted is None,
        "error": error,
        "iterations": debate_result.get("iterations_run", 0),
    }


async def run_dataset(dataset_id: str, limit: int | None = None) -> None:
    all_items = load_dataset(dataset_id)
    items = all_items
    if limit:
        items = items[:limit]

    output_dir = RESULTS_ROOT / dataset_id
    output_dir.mkdir(parents=True, exist_ok=True)
    results_path = output_dir / "detailed_results.json"
    cache_path = output_dir / "visual_features_cache.json"
    results = load_json(results_path, [])
    completed = {
        row["filename"]: row
        for row in results
        if (
            row.get("filename")
            and not row.get("run_error")
            and all(
                not row.get("methods", {}).get(method, {}).get("error")
                for method in METHODS
            )
        )
    }
    cache = load_json(cache_path, {})

    import app.google_lens_service as lens_module

    lens_module.search_google_lens = lambda *args, **kwargs: []

    vision = VisionAgent()
    engine = DebateEngine()
    for agent in (engine.gpt, engine.grok, engine.gemini, engine.judge):
        agent.disable_fallback = True

    print(f"\nDataset: {dataset_id} | images={len(items)} | resumed={len(completed)}")
    for position, image in enumerate(items, start=1):
        if image["filename"] in completed:
            print(f"[{position}/{len(items)}] SKIP {image['filename']}")
            continue

        print(f"[{position}/{len(items)}] {image['filename']}", flush=True)
        started = time.perf_counter()
        row = {
            "dataset": dataset_id,
            "id": image["id"],
            "filename": image["filename"],
            "ground_truth": image["label"],
            "started_at": datetime.now().isoformat(timespec="seconds"),
        }
        try:
            image_bytes = Path(image["path"]).read_bytes()
            feature_started = time.perf_counter()
            features = await get_visual_features(vision, image, cache, cache_path)
            vision_time = time.perf_counter() - feature_started
            if "error" in features or features.get("is_pottery") is False:
                raise RuntimeError(features.get("error") or "Vision marked image as non-pottery")

            debate_started = time.perf_counter()
            debate_result = await engine.start_debate(
                image_bytes,
                lang="en",
                visual_features=features,
            )
            debate_time = time.perf_counter() - debate_started
            initial = debate_result.get("initial_agent_predictions") or []
            initial_latencies = debate_result.get("initial_agent_latencies") or []
            if len(initial) != 3:
                raise RuntimeError("ACIS did not return three initial agent predictions")
            if len(initial_latencies) != 3:
                raise RuntimeError("ACIS did not return three initial agent latencies")

            method_results = {}
            for method, agent_result, agent_latency in zip(
                AGENT_METHOD_ORDER,
                initial,
                initial_latencies,
            ):
                method_results[method] = extract_agent_record(agent_result, image["label"])
                method_results[method]["latency_s"] = round(vision_time + agent_latency, 3)

            method_results["acis"] = extract_acis_record(debate_result, image["label"])
            method_results["acis"]["latency_s"] = round(vision_time + debate_time, 3)
            row["vision_time_s"] = round(vision_time, 3)
            row["acis_pipeline_time_s"] = round(debate_time, 3)
            row["methods"] = method_results
        except Exception as error:
            row["run_error"] = str(error)[:500]
            row["methods"] = {
                method: {
                    "raw_prediction": None,
                    "predicted_label": None,
                    "confidence": 0,
                    "evidence": "",
                    "is_correct": False,
                    "is_hallucinated": False,
                    "error": str(error)[:500],
                    "latency_s": round(time.perf_counter() - started, 3),
                }
                for method in METHODS
            }

        row["total_time_s"] = round(time.perf_counter() - started, 3)
        completed[image["filename"]] = row
        ordered = [
            completed[item["filename"]]
            for item in all_items
            if item["filename"] in completed
        ]
        save_json(results_path, ordered)

        gemini_error = row.get("methods", {}).get("gemini", {}).get("error") or ""
        if "GenerateRequestsPerDayPerProjectPerModel" in gemini_error:
            print("STOP: Gemini daily quota exhausted; checkpoint saved.", flush=True)
            break

    final_results = [
        completed[item["filename"]]
        for item in all_items
        if item["filename"] in completed
    ]
    save_json(results_path, final_results)
    summary = compute_all_metrics(final_results)
    save_json(output_dir / "summary.json", summary)
    write_csv(output_dir / "detailed_results.csv", final_results)
    print_summary(dataset_id, summary)


def safe_div(numerator: float, denominator: float) -> float:
    return numerator / denominator if denominator else 0.0


def compute_method_metrics(rows: list[dict], method: str) -> dict:
    records = [row["methods"][method] for row in rows]
    total = len(records)
    correct = sum(record.get("is_correct", False) for record in records)
    hallucinated = sum(record.get("is_hallucinated", False) for record in records)
    errors = sum(bool(record.get("error")) for record in records)
    per_class = {}
    precisions, recalls, f1_scores = [], [], []

    for label in CANONICAL_LABELS:
        tp = sum(
            record.get("predicted_label") == label and row["ground_truth"] == label
            for row, record in zip(rows, records)
        )
        fp = sum(
            record.get("predicted_label") == label and row["ground_truth"] != label
            for row, record in zip(rows, records)
        )
        fn = sum(
            record.get("predicted_label") != label and row["ground_truth"] == label
            for row, record in zip(rows, records)
        )
        precision = safe_div(tp, tp + fp)
        recall = safe_div(tp, tp + fn)
        f1 = safe_div(2 * precision * recall, precision + recall)
        precisions.append(precision)
        recalls.append(recall)
        f1_scores.append(f1)
        per_class[label] = {
            "tp": tp,
            "fp": fp,
            "fn": fn,
            "precision": round(precision * 100, 2),
            "recall": round(recall * 100, 2),
            "f1_score": round(f1 * 100, 2),
        }

    successful_latency = [
        float(record.get("latency_s") or 0)
        for record in records
        if not record.get("error")
    ]
    return {
        "total": total,
        "correct": correct,
        "errors": errors,
        "accuracy": round(safe_div(correct, total) * 100, 2),
        "macro_precision": round(sum(precisions) / len(precisions) * 100, 2),
        "macro_recall": round(sum(recalls) / len(recalls) * 100, 2),
        "macro_f1_score": round(sum(f1_scores) / len(f1_scores) * 100, 2),
        "average_latency_s": round(
            safe_div(sum(successful_latency), len(successful_latency)),
            3,
        ),
        "hallucinated": hallucinated,
        "hallucination_rate": round(safe_div(hallucinated, total) * 100, 2),
        "per_class": per_class,
    }


def compute_all_metrics(rows: list[dict]) -> dict:
    return {
        "dataset_size": len(rows),
        "formulas": {
            "accuracy": "N_correct / N_total * 100",
            "precision_per_class": "TP / (TP + FP)",
            "recall_per_class": "TP / (TP + FN)",
            "f1_per_class": "2 * Precision * Recall / (Precision + Recall)",
            "reported_precision_recall_f1": "Macro average across 10 classes",
            "hallucination_rate": "N_predictions_outside_supported_10_labels / N_total * 100",
        },
        "methods": {
            method: compute_method_metrics(rows, method)
            for method in METHODS
        },
    }


def write_csv(path: Path, rows: list[dict]) -> None:
    fields = [
        "dataset",
        "id",
        "filename",
        "ground_truth",
        "method",
        "raw_prediction",
        "predicted_label",
        "confidence",
        "is_correct",
        "is_hallucinated",
        "latency_s",
        "error",
    ]
    with path.open("w", newline="", encoding="utf-8-sig") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        for row in rows:
            for method in METHODS:
                result = row["methods"][method]
                writer.writerow(
                    {
                        "dataset": row["dataset"],
                        "id": row["id"],
                        "filename": row["filename"],
                        "ground_truth": row["ground_truth"],
                        "method": method,
                        "raw_prediction": result.get("raw_prediction"),
                        "predicted_label": result.get("predicted_label"),
                        "confidence": result.get("confidence"),
                        "is_correct": result.get("is_correct"),
                        "is_hallucinated": result.get("is_hallucinated"),
                        "latency_s": result.get("latency_s"),
                        "error": result.get("error"),
                    }
                )


def print_summary(dataset_id: str, summary: dict) -> None:
    print(f"\nSummary: {dataset_id}")
    print(
        f"{'Method':<10} {'Accuracy':>10} {'Precision':>10} "
        f"{'Recall':>10} {'F1':>10} {'Latency':>10} {'Halluc.':>10}"
    )
    for method in METHODS:
        metrics = summary["methods"][method]
        print(
            f"{method:<10} {metrics['accuracy']:>9.2f}% "
            f"{metrics['macro_precision']:>9.2f}% "
            f"{metrics['macro_recall']:>9.2f}% "
            f"{metrics['macro_f1_score']:>9.2f}% "
            f"{metrics['average_latency_s']:>9.3f}s "
            f"{metrics['hallucination_rate']:>9.2f}%"
        )


async def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--datasets",
        default="dataset1_video,dataset2_ai",
        help="Comma-separated dataset IDs",
    )
    parser.add_argument("--limit", type=int, default=None)
    parser.add_argument(
        "--force-vision",
        default="",
        help="Comma-separated filenames or numeric IDs whose visual feature cache should be ignored",
    )
    args = parser.parse_args()
    for dataset_id in [value.strip() for value in args.datasets.split(",") if value.strip()]:
        if dataset_id not in DATASETS:
            raise ValueError(f"Unknown dataset: {dataset_id}")
        global FORCE_VISION_FILENAMES
        force_values = {value.strip() for value in args.force_vision.split(",") if value.strip()}
        if force_values:
            by_id = {str(item["id"]): item["filename"] for item in load_dataset(dataset_id)}
            FORCE_VISION_FILENAMES = {
                by_id.get(value, value.replace("\\", "/"))
                for value in force_values
            }
        else:
            FORCE_VISION_FILENAMES = set()
        await run_dataset(dataset_id, args.limit)


if __name__ == "__main__":
    asyncio.run(main())
