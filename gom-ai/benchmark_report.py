"""
========================================================================
GOM AI Benchmark Report — Tạo báo cáo + biểu đồ từ kết quả benchmark
========================================================================
Chạy:  python benchmark_report.py
========================================================================
"""

import json
import os
import sys
from pathlib import Path

# Configure stdout/stderr to use UTF-8 to prevent encoding errors on Windows
if sys.stdout and hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass
if sys.stderr and hasattr(sys.stderr, "reconfigure"):
    try:
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

ROOT = Path(__file__).resolve().parent
RESULTS_DIR = ROOT / "benchmark_results"
CHARTS_DIR = RESULTS_DIR / "charts"

ALL_METHODS = ["gpt_solo", "grok_solo", "gemini_solo", "vision_solo", "debate_full"]

METHOD_DISPLAY = {
    "gpt_solo":     "GPT-4o-mini\n(Đơn lẻ)",
    "grok_solo":    "Llama-3.3-70b\nGroq (Đơn lẻ)",
    "gemini_solo":  "Gemini-2.5-flash\n(Đơn lẻ)",
    "vision_solo":  "Gemini Vision\n(Đơn lẻ)",
    "debate_full":  "Multi-Agent\nDebate (Đề xuất)",
}

METHOD_SHORT = {
    "gpt_solo":     "GPT-4o-mini",
    "grok_solo":    "Llama-3.3-70b",
    "gemini_solo":  "Gemini-2.5-flash",
    "vision_solo":  "Gemini Vision",
    "debate_full":  "Multi-Agent Debate",
}

DATASET_DIR = ROOT.parent / "dataset" / "val"

def _scan_labels() -> list[str]:
    """Auto-detect ceramic class labels from dataset/val/ subdirectories."""
    labels = []
    if DATASET_DIR.exists():
        for d in sorted(DATASET_DIR.iterdir()):
            if d.is_dir():
                has_images = any(
                    f.suffix.lower() in (".jpg", ".jpeg", ".png", ".bmp", ".webp")
                    for f in d.iterdir() if f.is_file()
                )
                if has_images:
                    labels.append(d.name)
    return labels

CERAMIC_LABELS = _scan_labels()

COLORS = {
    "gpt_solo":     "#6366f1",   # indigo
    "grok_solo":    "#f59e0b",   # amber
    "gemini_solo":  "#10b981",   # emerald
    "vision_solo":  "#8b5cf6",   # violet
    "debate_full":  "#ef4444",   # red (highlight)
}


def load_results() -> dict:
    """Load all results files."""
    data = {}
    for method in ALL_METHODS:
        fpath = RESULTS_DIR / f"results_{method}.json"
        if fpath.exists():
            with open(fpath, "r", encoding="utf-8") as f:
                data[method] = json.load(f)
    return data


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

    per_class = {}
    for label in CERAMIC_LABELS:
        items = [r for r in results if r["label"] == label]
        valid_items = [r for r in items if "error" not in r]
        c = sum(1 for r in valid_items if r.get("is_correct"))
        per_class[label] = {
            "total": len(items),
            "successful": len(valid_items),
            "errors": len(items) - len(valid_items),
            "correct": c,
            "coverage": round(len(valid_items) / len(items) * 100, 1) if items else 0,
            "accuracy": round(c / len(valid_items) * 100, 1) if valid_items else 0,
            "end_to_end_accuracy": round(c / len(items) * 100, 1) if items else 0,
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


def generate_confusion_matrix(results: list[dict]) -> dict:
    """Generate confusion matrix data."""
    matrix = {label: {l: 0 for l in CERAMIC_LABELS} for label in CERAMIC_LABELS}
    unmatched = {label: 0 for label in CERAMIC_LABELS}

    # Need the matching function
    import unicodedata, re
    def normalize_text(text):
        if not text: return ""
        text = str(text).lower().strip()
        nfkd = unicodedata.normalize("NFKD", text)
        text = "".join(c for c in nfkd if not unicodedata.combining(c))
        for filler in ["gom ", "ceramics", "ceramic", "pottery", "ware", "porcelain", "dong ", "lo ", "kiln"]:
            text = text.replace(filler, " ")
        text = re.sub(r"[^a-z0-9 ]", "", text)
        return re.sub(r"\s+", " ", text).strip()

    norm_labels = {label: normalize_text(label) for label in CERAMIC_LABELS}

    def find_predicted_label(pred_text):
        if not pred_text: return None
        pred = normalize_text(pred_text)
        for label, norm in norm_labels.items():
            if norm in pred or pred in norm:
                return label
            words = norm.split()
            if len(words) >= 2 and all(w in pred for w in words):
                return label
        return None

    for r in results:
        true_label = r["label"]
        pred_label = find_predicted_label(r.get("predicted", ""))
        if pred_label and pred_label in matrix.get(true_label, {}):
            matrix[true_label][pred_label] += 1
        else:
            unmatched[true_label] += 1

    return {"matrix": matrix, "unmatched": unmatched}


def plot_accuracy_comparison(all_metrics: dict):
    """Bar chart comparing accuracy across methods."""
    import matplotlib.pyplot as plt
    import matplotlib
    matplotlib.rcParams["font.family"] = "DejaVu Sans"

    methods = [m for m in ALL_METHODS if m in all_metrics]
    labels = [METHOD_DISPLAY[m] for m in methods]
    accs = [all_metrics[m]["accuracy"] for m in methods]
    colors = [COLORS[m] for m in methods]

    fig, ax = plt.subplots(figsize=(10, 6))

    bars = ax.bar(range(len(methods)), accs, color=colors, width=0.6, edgecolor="white", linewidth=1.5)

    # Add value labels on bars
    for bar, acc in zip(bars, accs):
        ax.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 1,
                f"{acc:.1f}%", ha="center", va="bottom", fontsize=13, fontweight="bold")

    # Highlight the debate bar
    if "debate_full" in methods:
        idx = methods.index("debate_full")
        bars[idx].set_edgecolor("#b91c1c")
        bars[idx].set_linewidth(3)

    ax.set_xticks(range(len(methods)))
    ax.set_xticklabels(labels, fontsize=10)
    ax.set_ylabel("Accuracy (%)", fontsize=12)
    ax.set_title("So sánh Accuracy: Multi-Agent Debate vs AI Đơn Lẻ", fontsize=14, fontweight="bold")
    ax.set_ylim(0, max(accs) + 15 if accs else 100)
    ax.grid(axis="y", alpha=0.3)
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)

    plt.tight_layout()
    plt.savefig(CHARTS_DIR / "accuracy_comparison.png", dpi=150, bbox_inches="tight")
    plt.close()
    print("  ✅ accuracy_comparison.png")


def plot_confidence_comparison(all_metrics: dict):
    """Bar chart comparing average confidence."""
    import matplotlib.pyplot as plt

    methods = [m for m in ALL_METHODS if m in all_metrics]
    labels = [METHOD_DISPLAY[m] for m in methods]
    confs = [all_metrics[m]["avg_confidence"] for m in methods]
    colors = [COLORS[m] for m in methods]

    fig, ax = plt.subplots(figsize=(10, 6))
    bars = ax.bar(range(len(methods)), confs, color=colors, width=0.6, edgecolor="white", linewidth=1.5)

    for bar, conf in zip(bars, confs):
        ax.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.01,
                f"{conf:.3f}", ha="center", va="bottom", fontsize=12, fontweight="bold")

    ax.set_xticks(range(len(methods)))
    ax.set_xticklabels(labels, fontsize=10)
    ax.set_ylabel("Avg Confidence", fontsize=12)
    ax.set_title("So sánh Confidence trung bình", fontsize=14, fontweight="bold")
    ax.set_ylim(0, 1.1)
    ax.grid(axis="y", alpha=0.3)
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)

    plt.tight_layout()
    plt.savefig(CHARTS_DIR / "confidence_comparison.png", dpi=150, bbox_inches="tight")
    plt.close()
    print("  ✅ confidence_comparison.png")


def plot_time_comparison(all_metrics: dict):
    """Bar chart comparing average time."""
    import matplotlib.pyplot as plt

    methods = [m for m in ALL_METHODS if m in all_metrics]
    labels = [METHOD_DISPLAY[m] for m in methods]
    times = [all_metrics[m]["avg_time"] for m in methods]
    colors = [COLORS[m] for m in methods]

    fig, ax = plt.subplots(figsize=(10, 6))
    bars = ax.bar(range(len(methods)), times, color=colors, width=0.6, edgecolor="white", linewidth=1.5)

    for bar, t in zip(bars, times):
        ax.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.3,
                f"{t:.1f}s", ha="center", va="bottom", fontsize=12, fontweight="bold")

    ax.set_xticks(range(len(methods)))
    ax.set_xticklabels(labels, fontsize=10)
    ax.set_ylabel("Avg Time (seconds)", fontsize=12)
    ax.set_title("So sánh Thời gian xử lý trung bình", fontsize=14, fontweight="bold")
    ax.grid(axis="y", alpha=0.3)
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)

    plt.tight_layout()
    plt.savefig(CHARTS_DIR / "time_comparison.png", dpi=150, bbox_inches="tight")
    plt.close()
    print("  ✅ time_comparison.png")


def plot_per_class_accuracy(all_metrics: dict):
    """Grouped bar chart: accuracy per ceramic class per method."""
    import matplotlib.pyplot as plt
    import numpy as np

    methods = [m for m in ALL_METHODS if m in all_metrics]
    n_methods = len(methods)
    n_labels = len(CERAMIC_LABELS)

    fig, ax = plt.subplots(figsize=(14, 7))

    bar_width = 0.15
    x = np.arange(n_labels)

    for i, method in enumerate(methods):
        pc = all_metrics[method].get("per_class", {})
        accs = [pc.get(label, {}).get("accuracy", 0) for label in CERAMIC_LABELS]
        offset = (i - n_methods / 2 + 0.5) * bar_width
        bars = ax.bar(x + offset, accs, bar_width, label=METHOD_SHORT[method],
                      color=COLORS[method], edgecolor="white", linewidth=0.5)

    ax.set_xticks(x)
    ax.set_xticklabels(CERAMIC_LABELS, rotation=30, ha="right", fontsize=10)
    ax.set_ylabel("Accuracy (%)", fontsize=12)
    ax.set_title("Accuracy theo từng dòng gốm", fontsize=14, fontweight="bold")
    ax.legend(fontsize=9, loc="upper right")
    ax.grid(axis="y", alpha=0.3)
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)

    plt.tight_layout()
    plt.savefig(CHARTS_DIR / "per_class_accuracy.png", dpi=150, bbox_inches="tight")
    plt.close()
    print("  ✅ per_class_accuracy.png")


def plot_confusion_matrix(method: str, results: list[dict]):
    """Plot confusion matrix for a specific method."""
    import matplotlib.pyplot as plt
    import numpy as np

    cm_data = generate_confusion_matrix(results)
    matrix = cm_data["matrix"]

    labels = CERAMIC_LABELS
    n = len(labels)
    cm = np.zeros((n, n), dtype=int)
    for i, true_l in enumerate(labels):
        for j, pred_l in enumerate(labels):
            cm[i][j] = matrix[true_l][pred_l]

    fig, ax = plt.subplots(figsize=(10, 8))
    im = ax.imshow(cm, interpolation="nearest", cmap="Blues")

    ax.set_xticks(np.arange(n))
    ax.set_yticks(np.arange(n))
    ax.set_xticklabels(labels, rotation=45, ha="right", fontsize=9)
    ax.set_yticklabels(labels, fontsize=9)

    # Add text annotations
    thresh = cm.max() / 2.0
    for i in range(n):
        for j in range(n):
            ax.text(j, i, str(cm[i, j]),
                    ha="center", va="center", fontsize=10,
                    color="white" if cm[i, j] > thresh else "black")

    ax.set_xlabel("Predicted", fontsize=12)
    ax.set_ylabel("Actual", fontsize=12)
    ax.set_title(f"Confusion Matrix — {METHOD_SHORT.get(method, method)}", fontsize=13, fontweight="bold")
    fig.colorbar(im, ax=ax, shrink=0.8)

    plt.tight_layout()
    plt.savefig(CHARTS_DIR / f"confusion_{method}.png", dpi=150, bbox_inches="tight")
    plt.close()
    print(f"  ✅ confusion_{method}.png")


def generate_markdown_report(all_metrics: dict):
    """Generate a markdown report file."""
    lines = [
        "# 📊 Kết Quả Thực Nghiệm: Multi-Agent Debate vs AI Đơn Lẻ\n",
        f"*Generated: {__import__('datetime').datetime.now().strftime('%Y-%m-%d %H:%M:%S')}*\n",
        "## 1. Bảng So Sánh Tổng Hợp\n",
        "| Phương pháp | Accuracy on success (%) | Coverage (%) | End-to-end accuracy (%) | Avg Confidence | Avg Time (s) | Correct/Successful |",
        "|-------------|:-----------------------:|:------------:|:-----------------------:|:--------------:|:------------:|:------------------:|",
    ]

    for method in ALL_METHODS:
        if method not in all_metrics:
            continue
        m = all_metrics[method]
        display = METHOD_SHORT[method]
        if method == "debate_full":
            display = f"**{display}**"
        lines.append(
            f"| {display} | {m['accuracy_on_success']:.2f} | {m['coverage']:.2f} | "
            f"{m['end_to_end_accuracy']:.2f} | {m['avg_confidence']:.4f} | "
            f"{m['avg_time']:.2f} | {m['correct']}/{m['successful']} |"
        )

    lines.append("\n## 2. Accuracy Theo Từng Dòng Gốm\n")

    header = "| Dòng gốm |"
    sep = "|----------|"
    for method in ALL_METHODS:
        if method in all_metrics:
            header += f" {METHOD_SHORT[method]} |"
            sep += ":---------:|"
    lines.append(header)
    lines.append(sep)

    for label in CERAMIC_LABELS:
        row = f"| {label} |"
        for method in ALL_METHODS:
            if method in all_metrics:
                pc = all_metrics[method].get("per_class", {}).get(label, {})
                acc = pc.get("accuracy", 0)
                row += f" {acc:.1f}% |"
        lines.append(row)

    lines.append("\n## 3. Biểu Đồ\n")
    lines.append("### 3.1. So sánh Accuracy")
    lines.append("![Accuracy Comparison](charts/accuracy_comparison.png)\n")
    lines.append("### 3.2. So sánh Confidence")
    lines.append("![Confidence Comparison](charts/confidence_comparison.png)\n")
    lines.append("### 3.3. So sánh Thời gian")
    lines.append("![Time Comparison](charts/time_comparison.png)\n")
    lines.append("### 3.4. Accuracy theo dòng gốm")
    lines.append("![Per Class Accuracy](charts/per_class_accuracy.png)\n")

    for method in ALL_METHODS:
        if method in all_metrics:
            lines.append(f"### Confusion Matrix — {METHOD_SHORT[method]}")
            lines.append(f"![Confusion {method}](charts/confusion_{method}.png)\n")

    report_path = RESULTS_DIR / "report.md"
    with open(report_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    print(f"  ✅ report.md")
    return report_path


def main():
    CHARTS_DIR.mkdir(parents=True, exist_ok=True)

    print("=" * 60)
    print("📊 GOM AI — Generating Benchmark Report")
    print("=" * 60)

    # Load results
    all_data = load_results()
    if not all_data:
        print("❌ No results found! Run benchmark.py first.")
        return

    print(f"\n📂 Found results for: {', '.join(all_data.keys())}\n")

    # Compute metrics
    all_metrics = {}
    for method, results in all_data.items():
        all_metrics[method] = compute_metrics(results)

    # Generate charts
    print("📈 Generating charts...")
    try:
        plot_accuracy_comparison(all_metrics)
        plot_confidence_comparison(all_metrics)
        plot_time_comparison(all_metrics)
        plot_per_class_accuracy(all_metrics)

        for method, results in all_data.items():
            plot_confusion_matrix(method, results)

    except ImportError:
        print("  ⚠️ matplotlib not installed. Skipping charts.")
        print("  💡 Install: pip install matplotlib")

    # Generate markdown report
    print("\n📝 Generating report...")
    report_path = generate_markdown_report(all_metrics)

    # Print summary table
    print("\n" + "=" * 80)
    print("📊 BẢNG KẾT QUẢ THỰC NGHIỆM")
    print("=" * 80)
    print(
        f"{'Phương pháp':<30} {'Acc(success)':>12} {'Coverage':>10} "
        f"{'E2E Acc':>10} {'Time (s)':>10} {'Correct':>12}"
    )
    print("-" * 80)
    for method in ALL_METHODS:
        if method not in all_metrics:
            continue
        m = all_metrics[method]
        display = METHOD_SHORT[method]
        marker = " ★" if method == "debate_full" else ""
        print(
            f"{display + marker:<30} {m['accuracy_on_success']:>11.2f}% "
            f"{m['coverage']:>9.2f}% {m['end_to_end_accuracy']:>9.2f}% "
            f"{m['avg_time']:>9.2f}s {m['correct']:>5}/{m['successful']}"
        )
    print("-" * 80)

    print(f"\n✅ Report saved: {report_path}")
    print(f"📁 Charts saved: {CHARTS_DIR}")


if __name__ == "__main__":
    main()
