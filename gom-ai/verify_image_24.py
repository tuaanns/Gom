import json
with open("experiment_results/dataset1_video_lens5/detailed_results.json", encoding="utf-8") as f:
    data = json.load(f)

print(f"Total entries: {len(data)}")
target = "images/03_phu_lang_vietnam/024_03_phu_lang_vietnam_04.jpg"
row = next((r for r in data if r["filename"] == target), None)

if row:
    print(f"Found row: {row['filename']}")
    print(f"Lens results count: {row.get('lens_result_count')}")
    print(f"Lens status: {row.get('lens_status')}")
    print(f"First 3 Lens URLs:")
    for idx, item in enumerate(row.get("lens_results", [])[:3]):
        print(f"  [{idx+1}] {item.get('title')} -> {item.get('url')}")
else:
    print(f"Row {target} not found in results yet!")
