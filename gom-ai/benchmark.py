"""
========================================================================
GOM AI Benchmark — So sánh Multi-Agent Debate vs AI Đơn Lẻ
========================================================================
Chạy:
    python benchmark.py                       # Chạy tất cả methods
    python benchmark.py --methods gpt_solo    # Chỉ chạy GPT đơn lẻ
    python benchmark.py --methods debate_full # Chỉ chạy Full Debate
    python benchmark.py --lens                # Bật Google Lens (chậm hơn)
========================================================================
"""

import argparse
import asyncio
import json
import os
import re
import sys

# Fix Windows encoding (gbk can't handle emoji/Vietnamese)
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass
if hasattr(sys.stderr, "reconfigure"):
    try:
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

import time
import traceback
import unicodedata
from datetime import datetime
from pathlib import Path

# ---------------------------------------------------------------------------
# Path setup
# ---------------------------------------------------------------------------
ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

from dotenv import load_dotenv
load_dotenv(ROOT / ".env", override=True)

from app.agents.vision_agent import VisionAgent
from app.agents.specialists import GPTAgent, GrokAgent, GeminiAgent
from app.agents.base_agent import key_rotator
from app.debate.debate_engine import DebateEngine

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
DATASET_DIR = ROOT.parent / "dataset" / "val"
RESULTS_DIR = ROOT / "benchmark_results"
VISUAL_CACHE_FILE = RESULTS_DIR / "_visual_features_cache.json"

API_DELAY = 8.0          # Seconds between API calls to avoid rate limits (free tier)
VISION_DELAY = 10.0      # Seconds between vision API calls (free tier)
DEBATE_DELAY = 12.0      # Seconds between full debate runs (free tier)

ALL_METHODS = ["gpt_solo", "grok_solo", "gemini_solo", "vision_solo", "debate_full"]

METHOD_DISPLAY = {
    "gpt_solo":     "GPT-4o-mini (Đơn lẻ)",
    "grok_solo":    "Llama-3.3-70b / Groq (Đơn lẻ)",
    "gemini_solo":  "Gemini-2.5-flash (Đơn lẻ)",
    "vision_solo":  "Gemini Vision (Đơn lẻ)",
    "debate_full":  "Multi-Agent Debate (Đề xuất)",
}

# ---------------------------------------------------------------------------
# Label matching utilities
# ---------------------------------------------------------------------------
def _scan_labels() -> list[str]:
    """Auto-detect ceramic class labels from dataset/val/ subdirectories."""
    labels = []
    if DATASET_DIR.exists():
        for d in sorted(DATASET_DIR.iterdir()):
            if d.is_dir():
                # Only include directories that contain at least 1 image
                has_images = any(
                    f.suffix.lower() in (".jpg", ".jpeg", ".png", ".bmp", ".webp")
                    for f in d.iterdir() if f.is_file()
                )
                if has_images:
                    labels.append(d.name)
    return labels

CERAMIC_LABELS = _scan_labels()


def remove_diacritics(text: str) -> str:
    """Remove Vietnamese diacritics for fuzzy matching."""
    nfkd = unicodedata.normalize("NFKD", text)
    return "".join(c for c in nfkd if not unicodedata.combining(c))


def normalize_text(text: str) -> str:
    """Normalize text for comparison: lowercase, strip diacritics, remove filler."""
    if not text:
        return ""
    text = str(text).lower().strip()
    text = remove_diacritics(text)

    # Replace hyphens and slashes with spaces to avoid merging words (e.g. Arita-Imari -> aritaimari)
    text = text.replace("-", " ").replace("/", " ")

    # Remove common prefixes/suffixes
    for filler in [
        "gom ", "gốm ", "ceramics", "ceramic", "pottery", "ware",
        "porcelain", "dong ", "dòng ", "lò ", "lo ", "kiln",
    ]:
        text = text.replace(filler, " ")

    text = re.sub(r"[^a-z0-9 ]", "", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


# Pre-compute normalized labels
_NORM_LABELS = {label: normalize_text(label) for label in CERAMIC_LABELS}


def load_resumable_results(results_file: Path) -> tuple[dict, int]:
    """Load successful records and leave failed records eligible for retry."""
    if not results_file.exists():
        return {}, 0

    try:
        with open(results_file, "r", encoding="utf-8") as f:
            saved_results = json.load(f)
    except Exception:
        return {}, 0

    completed = {
        result["filename"]: result
        for result in saved_results
        if result.get("filename") and not result.get("error")
    }
    retry_count = sum(1 for result in saved_results if result.get("error"))
    return completed, retry_count


def match_prediction(prediction_text: str, ground_truth: str) -> bool:
    """Check if an AI prediction matches the ground truth label."""
    if not prediction_text:
        return False

    pred = normalize_text(prediction_text)
    truth = _NORM_LABELS.get(ground_truth, normalize_text(ground_truth))

    if not pred or not truth:
        return False

    # Exact match
    if pred == truth:
        return True

    # Substring match (either direction)
    if truth in pred or pred in truth:
        return True

    # All words of ground truth found in prediction
    truth_words = truth.split()
    if len(truth_words) >= 2 and all(w in pred for w in truth_words):
        return True

    return False


def find_best_match(prediction_text: str) -> str | None:
    """Find which CERAMIC_LABEL best matches the prediction text."""
    for label in CERAMIC_LABELS:
        if match_prediction(prediction_text, label):
            return label
    return None


# ---------------------------------------------------------------------------
# Dataset loading
# ---------------------------------------------------------------------------
def load_dataset() -> list[dict]:
    """Load images from dataset/val/ with ground truth labels."""
    images = []
    for class_dir in sorted(DATASET_DIR.iterdir()):
        if not class_dir.is_dir():
            continue
        label = class_dir.name
        for img_file in sorted(class_dir.iterdir()):
            if img_file.suffix.lower() in (".jpg", ".jpeg", ".png", ".bmp", ".webp"):
                images.append({
                    "path": str(img_file),
                    "label": label,
                    "filename": f"{label}/{img_file.name}",
                })
    return images


# ---------------------------------------------------------------------------
# Visual features extraction (shared across single-agent methods)
# ---------------------------------------------------------------------------
async def extract_visual_features(images: list[dict]) -> dict:
    """Extract visual features for all images using VisionAgent. Results are cached."""
    cache = {}

    # Load existing cache
    if VISUAL_CACHE_FILE.exists():
        try:
            with open(VISUAL_CACHE_FILE, "r", encoding="utf-8") as f:
                cache = json.load(f)
            print(f"  📦 Loaded {len(cache)} cached visual features")
        except Exception:
            cache = {}

    vision = VisionAgent()
    total = len(images)
    new_count = 0

    for idx, img in enumerate(images):
        key = img["filename"]
        if key in cache and "error" not in cache[key]:
            continue

        new_count += 1
        print(f"  🔍 [{idx+1}/{total}] Extracting features: {key} ...", end=" ", flush=True)

        try:
            with open(img["path"], "rb") as f:
                image_bytes = f.read()
            features = await vision.analyze(image_bytes)
            cache[key] = features
            print("✓")
        except Exception as e:
            print(f"✗ ({e})")
            cache[key] = {"error": str(e)}

        # Save cache after each image (for resume)
        with open(VISUAL_CACHE_FILE, "w", encoding="utf-8") as f:
            json.dump(cache, f, ensure_ascii=False, indent=2)

        if new_count > 0:
            await asyncio.sleep(VISION_DELAY)

    if new_count > 0:
        print(f"  ✅ Extracted {new_count} new features (total cached: {len(cache)})")
    else:
        print(f"  ✅ All {len(cache)} features already cached")

    return cache


# ---------------------------------------------------------------------------
# Single agent benchmark
# ---------------------------------------------------------------------------
async def run_single_agent(method_name: str, agent, images: list[dict],
                           visual_cache: dict) -> list[dict]:
    """Run a single text agent on all images using cached visual features."""
    display = METHOD_DISPLAY[method_name]
    results_file = RESULTS_DIR / f"results_{method_name}.json"

    existing, retry_count = load_resumable_results(results_file)
    if existing or retry_count:
        print(
            f"  Resuming: {len(existing)} completed, "
            f"{retry_count} failed records will be retried"
        )

    results = list(existing.values())
    total = len(images)
    correct = sum(1 for r in results if r.get("is_correct"))

    for idx, img in enumerate(images):
        key = img["filename"]
        if key in existing:
            continue

        features = visual_cache.get(key, {})
        if isinstance(features, list):
            features = features[0] if len(features) > 0 else {}
        if not isinstance(features, dict):
            features = {"error": "Invalid features format"}

        if "error" in features or features.get("is_pottery") is False:
            result = {
                "filename": key,
                "label": img["label"],
                "predicted": None,
                "confidence": 0,
                "is_correct": False,
                "time_s": 0,
                "error": features.get("error", "Not pottery"),
            }
            results.append(result)
            existing[key] = result
            print(f"  [{idx+1}/{total}] {key} → SKIP (vision error)")
            continue

        print(f"  [{idx+1}/{total}] {key} ...", end=" ", flush=True)

        try:
            t0 = time.time()
            pred = await agent.predict(features, [], "vi")
            elapsed = time.time() - t0

            ceramic_line = ""
            confidence = 0.0
            if isinstance(pred, dict):
                p = pred.get("prediction", {})
                if isinstance(p, dict):
                    ceramic_line = p.get("ceramic_line", "")
                confidence = float(pred.get("confidence", 0))

            is_correct = match_prediction(ceramic_line, img["label"])
            if is_correct:
                correct += 1

            result = {
                "filename": key,
                "label": img["label"],
                "predicted": ceramic_line,
                "confidence": confidence,
                "is_correct": is_correct,
                "time_s": round(elapsed, 2),
            }
            results.append(result)
            existing[key] = result

            mark = "✓" if is_correct else "✗"
            running_acc = correct / len(results) * 100
            print(f"{mark}  \"{ceramic_line}\"  (conf={confidence:.2f}, {elapsed:.1f}s) [Acc={running_acc:.1f}%]")

        except Exception as e:
            elapsed = 0
            result = {
                "filename": key,
                "label": img["label"],
                "predicted": None,
                "confidence": 0,
                "is_correct": False,
                "time_s": 0,
                "error": str(e)[:200],
            }
            results.append(result)
            existing[key] = result
            print(f"✗  ERROR: {e}")

        # Save after each image
        with open(results_file, "w", encoding="utf-8") as f:
            json.dump(results, f, ensure_ascii=False, indent=2)

        await asyncio.sleep(API_DELAY)

    return results


# ---------------------------------------------------------------------------
# Vision solo: Gemini Vision does EVERYTHING (analyze + predict in one shot)
# ---------------------------------------------------------------------------
async def run_vision_solo_method(images: list[dict]) -> list[dict]:
    """Gemini Vision directly analyzes image AND predicts ceramic line in one call."""
    method_name = "vision_solo"
    results_file = RESULTS_DIR / f"results_{method_name}.json"

    existing, retry_count = load_resumable_results(results_file)
    if existing or retry_count:
        print(
            f"  Resuming: {len(existing)} completed, "
            f"{retry_count} failed records will be retried"
        )

    results = list(existing.values())
    total = len(images)
    correct = sum(1 for r in results if r.get("is_correct"))

    from google import genai as google_genai
    from google.genai import types as genai_types

    # Build label list dynamically from dataset
    label_list_str = ", ".join(CERAMIC_LABELS)

    # Vision prediction prompt — one-shot analyze + predict
    prompt = (
        "Bạn là chuyên gia giám định gốm sứ hàng đầu thế giới. "
        "Hãy nhìn bức ảnh này và xác định đây là dòng gốm nào.\n\n"
        f"DANH SÁCH DÒNG GỐM CỤ THỂ CÓ THỂ CHỌN:\n{label_list_str}\n\n"
        "Ngoài danh sách trên, bạn cũng có thể nhận diện các dòng gốm khác trên thế giới "
        "(Jingdezhen, Longquan, Yixing, Arita/Imari, Satsuma, Raku, Meissen, Sèvres, "
        "Wedgwood, Delftware, Iznik, Goryeo celadon, Buncheong, Sawankhalok...).\n\n"
        "⚠️ Phải đưa ra tên dòng gốm CỤ THỂ. KHÔNG dùng tên chung chung.\n\n"
        "Trả về JSON duy nhất:\n"
        "{\n"
        '  "ceramic_line": "(TÊN DÒNG GỐM CỤ THỂ)",\n'
        '  "country": "(QUỐC GIA)",\n'
        '  "era": "(NIÊN ĐẠI)",\n'
        '  "confidence": 0.0-1.0,\n'
        '  "evidence": "(BẰNG CHỨNG)"\n'
        "}"
    )

    configured_models = os.getenv(
        "BENCHMARK_VISION_MODELS",
        "gemini-3.1-flash-lite,gemini-2.5-flash,gemini-2.5-flash-lite",
    )
    models_to_try = [
        model.strip()
        for model in configured_models.split(",")
        if model.strip() and model.strip() != "gemini-2.0-flash-exp"
    ]
    if not models_to_try:
        raise RuntimeError("BENCHMARK_VISION_MODELS does not contain a usable model")

    for idx, img in enumerate(images):
        key = img["filename"]
        if key in existing:
            continue

        print(f"  [{idx+1}/{total}] {key} ...", end=" ", flush=True)

        try:
            with open(img["path"], "rb") as f:
                image_bytes = f.read()

            t0 = time.time()
            pred_data = None
            model_errors = []
            for model_id in models_to_try:
                api_key = key_rotator.get_key("google")
                client = google_genai.Client(api_key=api_key)
                try:
                    response = await client.aio.models.generate_content(
                        model=model_id,
                        contents=[
                            genai_types.Part.from_bytes(data=image_bytes, mime_type="image/jpeg"),
                            genai_types.Part.from_text(text=prompt),
                        ],
                        config=genai_types.GenerateContentConfig(
                            response_mime_type="application/json"
                        ),
                    )
                    pred_data = json.loads(response.text)
                    break
                except Exception as model_err:
                    err_str = str(model_err)
                    model_errors.append(f"{model_id}: {model_err}")
                    if any(x in err_str for x in ["429", "RESOURCE_EXHAUSTED", "400", "401", "403", "API_KEY", "API key", "UNAVAILABLE", "503"]):
                        key_rotator.rotate_key("google", api_key)
                    continue

            if pred_data is None:
                raise RuntimeError(
                    "All configured vision models failed: "
                    + " | ".join(model_errors)
                )

            elapsed = time.time() - t0

            ceramic_line = pred_data.get("ceramic_line", "") if pred_data else ""
            confidence = float(pred_data.get("confidence", 0)) if pred_data else 0

            is_correct = match_prediction(ceramic_line, img["label"])
            if is_correct:
                correct += 1

            result = {
                "filename": key,
                "label": img["label"],
                "predicted": ceramic_line,
                "confidence": confidence,
                "is_correct": is_correct,
                "time_s": round(elapsed, 2),
            }
            results.append(result)
            existing[key] = result

            mark = "✓" if is_correct else "✗"
            running_acc = correct / len(results) * 100
            print(f"{mark}  \"{ceramic_line}\"  (conf={confidence:.2f}, {elapsed:.1f}s) [Acc={running_acc:.1f}%]")

        except Exception as e:
            result = {
                "filename": key,
                "label": img["label"],
                "predicted": None,
                "confidence": 0,
                "is_correct": False,
                "time_s": 0,
                "error": str(e)[:200],
            }
            results.append(result)
            existing[key] = result
            print(f"✗  ERROR: {e}")

        with open(results_file, "w", encoding="utf-8") as f:
            json.dump(results, f, ensure_ascii=False, indent=2)

        await asyncio.sleep(VISION_DELAY)

    return results


# ---------------------------------------------------------------------------
# Full debate benchmark
# ---------------------------------------------------------------------------
async def run_debate_method(images: list[dict], enable_lens: bool, visual_cache: dict) -> list[dict]:
    """Run the full Multi-Agent Debate pipeline."""
    method_name = "debate_full"
    results_file = RESULTS_DIR / f"results_{method_name}.json"

    # Disable Google Lens if not requested (monkey-patch for speed)
    if not enable_lens:
        import app.google_lens_service as lens_mod
        lens_mod.search_google_lens = lambda *a, **kw: []

    engine = DebateEngine()
    engine.gpt.disable_fallback = True
    engine.grok.disable_fallback = True
    engine.gemini.disable_fallback = True
    engine.judge.disable_fallback = True

    existing, retry_count = load_resumable_results(results_file)
    if existing or retry_count:
        print(
            f"  Resuming: {len(existing)} completed, "
            f"{retry_count} failed records will be retried"
        )

    results = list(existing.values())
    total = len(images)
    correct = sum(1 for r in results if r.get("is_correct"))

    for idx, img in enumerate(images):
        key = img["filename"]
        if key in existing:
            continue

        features = visual_cache.get(key, {})
        if isinstance(features, list):
            features = features[0] if len(features) > 0 else {}
        if not isinstance(features, dict):
            features = {"error": "Invalid features format"}

        if "error" in features or features.get("is_pottery") is False:
            result = {
                "filename": key,
                "label": img["label"],
                "predicted": None,
                "confidence": 0,
                "is_correct": False,
                "time_s": 0,
                "error": features.get("error", "Not pottery"),
            }
            results.append(result)
            existing[key] = result
            print(f"  [{idx+1}/{total}] {key} → SKIP (vision error)")
            continue

        print(f"  [{idx+1}/{total}] {key} ...", end=" ", flush=True)

        try:
            with open(img["path"], "rb") as f:
                image_bytes = f.read()

            t0 = time.time()
            debate_result = await engine.start_debate(image_bytes, lang="vi", visual_features=features)
            elapsed = time.time() - t0

            # Extract prediction from debate result
            ceramic_line = ""
            confidence = 0.0

            if "error" in debate_result:
                ceramic_line = ""
                confidence = 0
            else:
                fr = debate_result.get("final_report", {})
                ceramic_line = fr.get("final_prediction", "")
                try:
                    confidence = float(fr.get("certainty", 0)) / 100.0
                except (ValueError, TypeError):
                    confidence = 0.5

            is_correct = match_prediction(ceramic_line, img["label"])
            if is_correct:
                correct += 1

            # Save compact version (full debate result is too large)
            agent_preds = []
            for ap in debate_result.get("agent_predictions", []):
                agent_preds.append({
                    "agent": ap.get("agent_name", "?"),
                    "ceramic_line": ap.get("prediction", {}).get("ceramic_line", ""),
                    "confidence": ap.get("confidence", 0),
                })

            result = {
                "filename": key,
                "label": img["label"],
                "predicted": ceramic_line,
                "confidence": confidence,
                "is_correct": is_correct,
                "time_s": round(elapsed, 2),
                "iterations": debate_result.get("iterations_run", 0),
                "agent_predictions": agent_preds,
                "reasoning": debate_result.get("final_report", {}).get("reasoning", "")[:500],
            }
            results.append(result)
            existing[key] = result

            mark = "✓" if is_correct else "✗"
            running_acc = correct / len(results) * 100
            print(f"{mark}  \"{ceramic_line}\"  (conf={confidence:.2f}, {elapsed:.1f}s, {result['iterations']} rounds) [Acc={running_acc:.1f}%]")

        except Exception as e:
            traceback.print_exc()
            result = {
                "filename": key,
                "label": img["label"],
                "predicted": None,
                "confidence": 0,
                "is_correct": False,
                "time_s": 0,
                "error": str(e)[:200],
            }
            results.append(result)
            existing[key] = result
            print(f"✗  ERROR: {e}")

        with open(results_file, "w", encoding="utf-8") as f:
            json.dump(results, f, ensure_ascii=False, indent=2)

        await asyncio.sleep(DEBATE_DELAY)

    return results


# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
def compute_metrics(results: list[dict]) -> dict:
    """Compute success-only quality and end-to-end reliability metrics."""
    if not results:
        return {
            "accuracy": 0,
            "accuracy_on_success": 0,
            "end_to_end_accuracy": 0,
            "coverage": 0,
            "avg_confidence": 0,
            "avg_time": 0,
            "total": 0,
            "successful": 0,
            "correct": 0,
            "errors": 0,
        }

    valid = [r for r in results if "error" not in r]
    correct = sum(1 for r in valid if r.get("is_correct"))
    total = len(results)
    successful = len(valid)

    avg_conf = sum(r.get("confidence", 0) for r in valid) / successful if successful else 0
    avg_time = sum(r.get("time_s", 0) for r in valid) / successful if successful else 0

    # Per-class accuracy
    per_class = {}
    for label in CERAMIC_LABELS:
        class_items = [r for r in results if r["label"] == label]
        class_valid = [r for r in class_items if "error" not in r]
        class_correct = sum(1 for r in class_valid if r.get("is_correct"))
        per_class[label] = {
            "total": len(class_items),
            "successful": len(class_valid),
            "errors": len(class_items) - len(class_valid),
            "correct": class_correct,
            "coverage": round(len(class_valid) / len(class_items) * 100, 1) if class_items else 0,
            "accuracy": round(class_correct / len(class_valid) * 100, 1) if class_valid else 0,
            "end_to_end_accuracy": (
                round(class_correct / len(class_items) * 100, 1) if class_items else 0
            ),
        }

    accuracy_on_success = round(correct / successful * 100, 2) if successful else 0
    return {
        "total": total,
        "successful": successful,
        "correct": correct,
        "errors": total - successful,
        "coverage": round(successful / total * 100, 2) if total else 0,
        "accuracy": accuracy_on_success,
        "accuracy_on_success": accuracy_on_success,
        "end_to_end_accuracy": round(correct / total * 100, 2) if total else 0,
        "avg_confidence": round(avg_conf, 4),
        "avg_time": round(avg_time, 2),
        "per_class": per_class,
    }


def print_summary():
    """Print a comparison table from saved results."""
    print("\n" + "=" * 80)
    print("📊 BẢNG KẾT QUẢ THỰC NGHIỆM")
    print("=" * 80)
    print(
        f"{'Phương pháp':<40} {'Acc(success)':>12} "
        f"{'Coverage':>10} {'E2E Acc':>10} {'Time (s)':>10}"
    )
    print("-" * 80)

    all_metrics = {}
    for method in ALL_METHODS:
        results_file = RESULTS_DIR / f"results_{method}.json"
        if not results_file.exists():
            continue
        with open(results_file, "r", encoding="utf-8") as f:
            results = json.load(f)
        metrics = compute_metrics(results)
        all_metrics[method] = metrics
        display = METHOD_DISPLAY.get(method, method)
        print(
            f"{display:<40} {metrics['accuracy_on_success']:>11.2f}% "
            f"{metrics['coverage']:>9.2f}% "
            f"{metrics['end_to_end_accuracy']:>9.2f}% "
            f"{metrics['avg_time']:>9.2f}s"
        )

    print("-" * 80)

    # Per-class breakdown
    if all_metrics:
        print("\n📋 ACCURACY THEO TỪNG DÒNG GỐM")
        print("-" * 80)

        header = f"{'Dòng gốm':<15}"
        for method in ALL_METHODS:
            if method in all_metrics:
                short = method.replace("_solo", "").replace("_full", "").upper()
                header += f" {short:>10}"
        print(header)
        print("-" * 80)

        for label in CERAMIC_LABELS:
            row = f"{label:<15}"
            for method in ALL_METHODS:
                if method in all_metrics:
                    pc = all_metrics[method]["per_class"].get(label, {})
                    acc = pc.get("accuracy", 0)
                    row += f" {acc:>9.1f}%"
            print(row)

    # Save summary JSON
    summary_file = RESULTS_DIR / "summary.json"
    with open(summary_file, "w", encoding="utf-8") as f:
        json.dump(all_metrics, f, ensure_ascii=False, indent=2)
    print(f"\n💾 Summary saved to {summary_file}")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
async def main(methods: list[str] | None = None, enable_lens: bool = False):
    RESULTS_DIR.mkdir(exist_ok=True)

    if methods is None:
        methods = ALL_METHODS

    print("=" * 80)
    print("🏺 GOM AI BENCHMARK — Multi-Agent Debate vs AI Đơn Lẻ")
    print(f"   Dataset: {DATASET_DIR}")
    print(f"   Methods: {', '.join(methods)}")
    print(f"   Google Lens: {'ON' if enable_lens else 'OFF'}")
    print(f"   Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 80)

    # Load dataset
    images = load_dataset()
    print(f"\n📂 Loaded {len(images)} images from {len(CERAMIC_LABELS)} classes\n")

    if not images:
        print("❌ No images found! Check DATASET_DIR path.")
        return

    # Extract visual features (shared across single-agent and debate methods)
    need_visual = any(m in methods for m in ["gpt_solo", "grok_solo", "gemini_solo", "debate_full"])
    visual_cache = {}
    if need_visual:
        print("🔬 Phase 0: Extracting Visual Features (VisionAgent)...")
        visual_cache = await extract_visual_features(images)
        print()

    # Run each method
    for method in methods:
        print(f"\n{'='*60}")
        print(f"🧪 Running: {METHOD_DISPLAY[method]}")
        print(f"{'='*60}")

        t_start = time.time()

        if method == "gpt_solo":
            agent = GPTAgent()
            agent.disable_fallback = True
            await run_single_agent(method, agent, images, visual_cache)

        elif method == "grok_solo":
            agent = GrokAgent()
            agent.disable_fallback = True
            await run_single_agent(method, agent, images, visual_cache)

        elif method == "gemini_solo":
            agent = GeminiAgent()
            agent.disable_fallback = True
            await run_single_agent(method, agent, images, visual_cache)

        elif method == "vision_solo":
            await run_vision_solo_method(images)

        elif method == "debate_full":
            await run_debate_method(images, enable_lens, visual_cache)

        elapsed = time.time() - t_start
        print(f"\n  ⏱️ {METHOD_DISPLAY[method]} completed in {elapsed:.1f}s")

    # Print summary
    print_summary()
    print(f"\n✅ Benchmark hoàn tất! Chạy 'python benchmark_report.py' để tạo biểu đồ.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="GOM AI Benchmark")
    parser.add_argument(
        "--methods",
        type=str,
        default=None,
        help=f"Comma-separated methods to run. Available: {','.join(ALL_METHODS)}",
    )
    parser.add_argument(
        "--lens",
        action="store_true",
        help="Enable Google Lens in full debate (slower but more accurate)",
    )
    args = parser.parse_args()

    methods_list = args.methods.split(",") if args.methods else None
    asyncio.run(main(methods_list, args.lens))
