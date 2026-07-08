"""Export real dataset 1 benchmark results comparing ONLY the ACIS System and ChatGPT."""
import json
import os
import sys
import openpyxl
from openpyxl.styles import Font, Alignment, PatternFill, Border, Side
from openpyxl.utils import get_column_letter

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

# Load dataset 1 detailed results
results_path = "experiment_results/dataset1_video_lens5/detailed_results.json"
summary_path = "experiment_results/dataset1_video_lens5/summary.json"

if not os.path.exists(results_path) or not os.path.exists(summary_path):
    print("Error: Dataset 1 results or summary JSON files not found!")
    exit(1)

with open(results_path, "r", encoding="utf-8") as f:
    detailed_data = json.load(f)

with open(summary_path, "r", encoding="utf-8") as f:
    summary_data = json.load(f)

wb = openpyxl.Workbook()

# Define Color Palette
navy_dark = "1B365D"
accent_ice = "E8F1F5"
gray_border = "D3D3D3"
white = "FFFFFF"
acis_highlight = "D4EDDA"

font_title = Font(name="Arial", size=16, bold=True, color=navy_dark)
font_section = Font(name="Arial", size=12, bold=True, color=navy_dark)
font_header = Font(name="Arial", size=10, bold=True, color=white)
font_data = Font(name="Arial", size=10)
font_bold_data = Font(name="Arial", size=10, bold=True)

fill_header = PatternFill(start_color=navy_dark, end_color=navy_dark, fill_type="solid")
fill_zebra = PatternFill(start_color=accent_ice, end_color=accent_ice, fill_type="solid")
fill_green = PatternFill(start_color="D4EDDA", end_color="D4EDDA", fill_type="solid")
fill_red = PatternFill(start_color="F8D7DA", end_color="F8D7DA", fill_type="solid")
fill_acis = PatternFill(start_color="E8F5E9", end_color="E8F5E9", fill_type="solid")

align_center = Alignment(horizontal="center", vertical="center")
align_left = Alignment(horizontal="left", vertical="center")

thin_side = Side(border_style="thin", color=gray_border)
border_cell = Border(left=thin_side, right=thin_side, top=thin_side, bottom=thin_side)

# ==========================================
# SHEET 1: SUMMARY METRICS (ACIS vs ChatGPT only)
# ==========================================
ws_summary = wb.active
ws_summary.title = "Báo cáo Tổng hợp"

# Title
ws_summary["A1"] = "BÁO CÁO THỰC NGHIỆM SO SÁNH HỆ THỐNG ACIS VỚI CHATGPT"
ws_summary["A1"].font = font_title
ws_summary["A2"] = "Tập dữ liệu: dataset1_video_lens5 — 100 mẫu ảnh gốm sứ thực tế (trích xuất từ video)"
ws_summary["A2"].font = Font(name="Arial", size=11, italic=True)

ws_summary["A4"] = "Bảng so sánh hiệu năng (100 mẫu):"
ws_summary["A4"].font = font_section

# Headers
headers_summary = [
    "Mô hình / Phương pháp",
    "Accuracy (%)",
    "Precision (%)",
    "Recall (%)",
    "F1-score (%)",
    "Thời gian TB (s)",
    "Hallucination (%)"
]
for col_idx, text in enumerate(headers_summary, 1):
    cell = ws_summary.cell(row=5, column=col_idx, value=text)
    cell.font = font_header
    cell.fill = fill_header
    cell.alignment = align_center
    cell.border = border_cell

# Read from summary.json with CORRECT keys
methods_info = [
    ("chatgpt", "ChatGPT (GPT-4o-mini đơn lẻ)"),
    ("acis", "Hệ thống ACIS (Đa tác tử đồng thuận)"),
]

row_idx = 6
for method_key, display_name in methods_info:
    m_data = summary_data.get("methods", {}).get(method_key, {})

    ws_summary.cell(row=row_idx, column=1, value=display_name).font = font_bold_data

    # Accuracy (stored as 58.0 meaning 58%)
    acc = m_data.get("accuracy", 0)
    ws_summary.cell(row=row_idx, column=2, value=f"{acc:.1f}%").alignment = align_center

    # Precision (stored as macro_precision e.g. 53.35)
    prec = m_data.get("macro_precision", 0)
    ws_summary.cell(row=row_idx, column=3, value=f"{prec:.2f}%").alignment = align_center

    # Recall (stored as macro_recall e.g. 41.43)
    rec = m_data.get("macro_recall", 0)
    ws_summary.cell(row=row_idx, column=4, value=f"{rec:.2f}%").alignment = align_center

    # F1 (stored as macro_f1_score e.g. 41.62)
    f1 = m_data.get("macro_f1_score", 0)
    ws_summary.cell(row=row_idx, column=5, value=f"{f1:.2f}%").alignment = align_center

    # Latency (stored as average_latency_s e.g. 8.245)
    lat = m_data.get("average_latency_s", 0)
    ws_summary.cell(row=row_idx, column=6, value=f"{lat:.3f}s").alignment = align_center

    # Hallucination (stored as hallucination_rate e.g. 13.0)
    halluc = m_data.get("hallucination_rate", 0)
    ws_summary.cell(row=row_idx, column=7, value=f"{halluc:.1f}%").alignment = align_center

    # Highlight ACIS row with green
    if method_key == "acis":
        for c in range(1, 8):
            ws_summary.cell(row=row_idx, column=c).fill = fill_acis
    else:
        for c in range(1, 8):
            ws_summary.cell(row=row_idx, column=c).fill = fill_zebra

    # Font and borders
    for c in range(1, 8):
        ws_summary.cell(row=row_idx, column=c).font = font_data
        ws_summary.cell(row=row_idx, column=c).border = border_cell
    ws_summary.cell(row=row_idx, column=1).font = font_bold_data

    row_idx += 1

# Add delta row
row_idx += 1
ws_summary.cell(row=row_idx, column=1, value="Chênh lệch (ACIS - ChatGPT)").font = Font(name="Arial", size=10, bold=True, italic=True)
acis_d = summary_data.get("methods", {}).get("acis", {})
gpt_d = summary_data.get("methods", {}).get("chatgpt", {})

delta_acc = acis_d.get("accuracy", 0) - gpt_d.get("accuracy", 0)
delta_prec = acis_d.get("macro_precision", 0) - gpt_d.get("macro_precision", 0)
delta_rec = acis_d.get("macro_recall", 0) - gpt_d.get("macro_recall", 0)
delta_f1 = acis_d.get("macro_f1_score", 0) - gpt_d.get("macro_f1_score", 0)
delta_halluc = acis_d.get("hallucination_rate", 0) - gpt_d.get("hallucination_rate", 0)

for col_idx, val in [(2, delta_acc), (3, delta_prec), (4, delta_rec), (5, delta_f1), (7, delta_halluc)]:
    sign = "+" if val > 0 else ""
    cell = ws_summary.cell(row=row_idx, column=col_idx, value=f"{sign}{val:.2f}%")
    cell.alignment = align_center
    cell.font = Font(name="Arial", size=10, bold=True, color="006400" if val > 0 else "8B0000")
    cell.border = border_cell

ws_summary.cell(row=row_idx, column=6, value="—").alignment = align_center

# ==========================================
# SHEET 2: DETAILED RESULTS
# ==========================================
ws_detail = wb.create_sheet(title="Kết quả chi tiết")

ws_detail["A1"] = "CHI TIẾT KẾT QUẢ PHÂN LOẠI TỪNG MẪU ẢNH (ACIS vs ChatGPT)"
ws_detail["A1"].font = font_title

headers_detail = [
    "STT", "Tên File", "Nhãn Gốc (Ground Truth)",
    "Dự đoán ACIS", "ACIS Đúng?", "ACIS Ảo ảnh?",
    "Dự đoán ChatGPT", "ChatGPT Đúng?", "ChatGPT Ảo ảnh?"
]

for col_idx, text in enumerate(headers_detail, 1):
    cell = ws_detail.cell(row=3, column=col_idx, value=text)
    cell.font = font_header
    cell.fill = fill_header
    cell.alignment = align_center
    cell.border = border_cell

detail_row_idx = 4
for item in detailed_data:
    ws_detail.cell(row=detail_row_idx, column=1, value=item.get("id")).alignment = align_center
    ws_detail.cell(row=detail_row_idx, column=2, value=item.get("filename")).alignment = align_left
    ws_detail.cell(row=detail_row_idx, column=3, value=item.get("ground_truth")).alignment = align_left

    methods_data = item.get("methods", {})

    # ACIS
    acis = methods_data.get("acis", {})
    ws_detail.cell(row=detail_row_idx, column=4, value=acis.get("predicted_label")).alignment = align_left
    acis_ok_cell = ws_detail.cell(row=detail_row_idx, column=5, value="ĐÚNG" if acis.get("is_correct") else "SAI")
    acis_ok_cell.alignment = align_center
    acis_ok_cell.fill = fill_green if acis.get("is_correct") else fill_red

    acis_halluc_cell = ws_detail.cell(row=detail_row_idx, column=6, value="CÓ" if acis.get("is_hallucinated") else "KHÔNG")
    acis_halluc_cell.alignment = align_center
    if acis.get("is_hallucinated"):
        acis_halluc_cell.fill = fill_red

    # ChatGPT
    chatgpt = methods_data.get("chatgpt", {})
    ws_detail.cell(row=detail_row_idx, column=7, value=chatgpt.get("predicted_label")).alignment = align_left
    cg_ok_cell = ws_detail.cell(row=detail_row_idx, column=8, value="ĐÚNG" if chatgpt.get("is_correct") else "SAI")
    cg_ok_cell.alignment = align_center
    cg_ok_cell.fill = fill_green if chatgpt.get("is_correct") else fill_red

    cg_halluc_cell = ws_detail.cell(row=detail_row_idx, column=9, value="CÓ" if chatgpt.get("is_hallucinated") else "KHÔNG")
    cg_halluc_cell.alignment = align_center
    if chatgpt.get("is_hallucinated"):
        cg_halluc_cell.fill = fill_red

    for c in range(1, 10):
        cell = ws_detail.cell(row=detail_row_idx, column=c)
        cell.font = font_data
        cell.border = border_cell

    detail_row_idx += 1

# ==========================================
# AUTO-FIT COLUMN WIDTHS
# ==========================================
for ws in [ws_summary, ws_detail]:
    for col in ws.columns:
        max_len = 0
        col_letter = get_column_letter(col[0].column)
        for cell in col:
            if cell.coordinate in ["A1", "A2", "A4"]:
                continue
            val_str = str(cell.value or '')
            if len(val_str) > max_len:
                max_len = len(val_str)
        ws.column_dimensions[col_letter].width = max(max_len + 4, 14)

# Save
output_excel = "experiment_results/thuc_nghiem_dataset1_v2.xlsx"
wb.save(output_excel)
print(f"Excel report saved: {output_excel}")

# Print summary for verification
print("\n=== VERIFICATION ===")
for mk, mn in methods_info:
    m = summary_data["methods"][mk]
    print(f"{mn}: Acc={m['accuracy']}%, Prec={m['macro_precision']}%, Rec={m['macro_recall']}%, F1={m['macro_f1_score']}%, Lat={m['average_latency_s']}s, Halluc={m['hallucination_rate']}%")
