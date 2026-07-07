from __future__ import annotations

import asyncio
import csv
import io
import json
import os
import sys
import time
from datetime import datetime
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent
PROJECT_ROOT = ROOT.parent
sys.path.insert(0, str(ROOT))

from dotenv import load_dotenv

load_dotenv(ROOT / ".env", override=True)

import experiment_two_datasets as base
from app.agents.vision_agent import VisionAgent
from app.debate.debate_engine import DebateEngine


LENS_DATASETS = {
    "dataset1_video_lens5": {
        **base.DATASETS["dataset1_video"],
        "source_dataset": "dataset1_video",
    },
    "dataset2_ai_lens5": {
        **base.DATASETS["dataset2_ai"],
        "source_dataset": "dataset2_ai",
    },
}


def resize_image_to_max(image_bytes: bytes, max_size: int = 512) -> bytes:
    try:
        img = Image.open(io.BytesIO(image_bytes))
        img.thumbnail((max_size, max_size))
        if img.mode in ("RGBA", "P"):
            img = img.convert("RGB")
        out = io.BytesIO()
        img.save(out, format="JPEG", quality=85)
        return out.getvalue()
    except Exception:
        return image_bytes


def load_lens_dataset(dataset_id: str, limit: int = 5) -> list[dict]:
    config = LENS_DATASETS[dataset_id]
    items = []
    with config["manifest"].open(encoding="utf-8-sig", newline="") as handle:
        for row in csv.DictReader(handle):
            raw_label = row[config["label_column"]]
            label = base.canonical_label(raw_label)
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
    # Chọn đúng 5 dòng gốm đại diện cho Phương án 2 (3 Việt Nam + 2 Quốc tế)
    target_traditions = ["Bat Trang", "Bien Hoa", "Bau Truc", "Delftware", "Meissen"]
    selected_items = []
    
    for tradition in target_traditions:
        for item in items:
            if item["label"] == tradition:
                selected_items.append(item)
                break
                
    if len(selected_items) < len(target_traditions):
        print(f"Warning: Could only find {len(selected_items)} out of {len(target_traditions)} target traditions.")
        
    return selected_items


def row_complete(row: dict) -> bool:
    if row.get("run_error"):
        return False
    methods = row.get("methods", {})
    return all(not methods.get(method, {}).get("error") for method in base.METHODS)


async def run_lens_dataset(dataset_id: str, limit: int = 5) -> None:
    items = load_lens_dataset(dataset_id, limit)
    output_dir = base.RESULTS_ROOT / dataset_id
    output_dir.mkdir(parents=True, exist_ok=True)
    results_path = output_dir / "detailed_results.json"
    cache_path = output_dir / "visual_features_cache.json"
    existing = base.load_json(results_path, [])
    completed = {
        row["filename"]: row
        for row in existing
        if row.get("filename") and row_complete(row)
    }
    cache = base.load_json(cache_path, {})

    vision = VisionAgent()
    engine = DebateEngine()

    consecutive_quota_failures = 0
    MAX_QUOTA_FAILURES = 2  # Stop after 2 consecutive all-quota-error images

    print(f"\nDataset: {dataset_id} | images={len(items)} | resumed={len(completed)}")
    for position, image in enumerate(items, start=1):
        if image["filename"] in completed:
            print(f"[{position}/{len(items)}] SKIP {image['filename']}")
            continue

        print(f"[{position}/{len(items)}] {image['filename']}", flush=True)
        started = time.perf_counter()
        row = {
            "dataset": dataset_id,
            "source_dataset": LENS_DATASETS[dataset_id]["source_dataset"],
            "id": image["id"],
            "filename": image["filename"],
            "ground_truth": image["label"],
            "started_at": datetime.now().isoformat(timespec="seconds"),
            "flow": "resize_512_plus_google_lens",
        }
        try:
            original_bytes = Path(image["path"]).read_bytes()
            image_bytes = resize_image_to_max(original_bytes, 512)
            row["input_original_bytes"] = len(original_bytes)
            row["input_resized_bytes"] = len(image_bytes)

            feature_started = time.perf_counter()
            features = await base.get_visual_features(vision, image, cache, cache_path)
            vision_time = time.perf_counter() - feature_started
            if "error" in features or features.get("is_pottery") is False:
                raise RuntimeError(features.get("error") or "Vision marked image as non-pottery")

            debate_started = time.perf_counter()
            debate_result = await engine.start_debate(
                image_bytes,
                lang="en",
                visual_features=features,
                is_synthetic=(dataset_id == "dataset2_ai_lens5"),
                target_country=image["metadata"].get("country") if dataset_id == "dataset2_ai_lens5" else None,
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
                base.AGENT_METHOD_ORDER,
                initial,
                initial_latencies,
            ):
                method_results[method] = base.extract_agent_record(agent_result, image["label"])
                method_results[method]["latency_s"] = round(vision_time + agent_latency, 3)

            method_results["acis"] = base.extract_acis_record(debate_result, image["label"])
            method_results["acis"]["latency_s"] = round(vision_time + debate_time, 3)

            lens_results = debate_result.get("lens_results") or []
            lens_status = debate_result.get("lens_status") or {}
            row["vision_time_s"] = round(vision_time, 3)
            row["acis_pipeline_time_s"] = round(debate_time, 3)
            row["lens_status"] = lens_status
            row["lens_result_count"] = len(lens_results)
            row["lens_results"] = [
                {
                    "title": item.get("title"),
                    "url": item.get("url"),
                }
                for item in lens_results[:10]
                if isinstance(item, dict)
            ]
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
                for method in base.METHODS
            }

        row["total_time_s"] = round(time.perf_counter() - started, 3)
        completed[image["filename"]] = row
        ordered = [completed[item["filename"]] for item in items if item["filename"] in completed]
        base.save_json(results_path, ordered)

        # Check for quota exhaustion: if all 3 individual agents hit rate limits
        methods_data = row.get("methods", {})
        quota_errors = sum(
            1 for m in ["chatgpt", "grok", "gemini"]
            if methods_data.get(m, {}).get("error") and
            ("429" in str(methods_data[m]["error"]) or "RESOURCE_EXHAUSTED" in str(methods_data[m]["error"]) or "rate_limit" in str(methods_data[m]["error"]).lower())
        )
        if quota_errors >= 2:
            consecutive_quota_failures += 1
            print(f"  [Warning] Quota errors detected on {quota_errors}/3 agents (streak: {consecutive_quota_failures}/{MAX_QUOTA_FAILURES})", flush=True)
        else:
            consecutive_quota_failures = 0

        if consecutive_quota_failures >= MAX_QUOTA_FAILURES:
            print(f"\n[Stop] Stopping: {MAX_QUOTA_FAILURES} consecutive images with quota exhaustion. Saving results...", flush=True)
            break

        if position < len(items):
            print("Sleeping for 15 seconds to prevent API rate limits...", flush=True)
            await asyncio.sleep(15)

    final_results = [completed[item["filename"]] for item in items if item["filename"] in completed]
    base.save_json(results_path, final_results)
    summary = base.compute_all_metrics(final_results)
    summary["flow"] = "resize_512_plus_google_lens"
    summary["note"] = "5-sample benchmark per dataset using the current web flow: resized input image and Google Lens enabled."
    base.save_json(output_dir / "summary.json", summary)
    base.write_csv(output_dir / "detailed_results.csv", final_results)
    base.print_summary(dataset_id, summary)


async def main() -> None:
    for dataset_id in ("dataset1_video_lens5", "dataset2_ai_lens5"):
        await run_lens_dataset(dataset_id, 5)


if __name__ == "__main__":
    asyncio.run(main())
