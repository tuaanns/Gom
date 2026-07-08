"""Debug: test SerpAPI Google Lens with a real experiment image."""
import os, sys, requests, json
from dotenv import load_dotenv
load_dotenv(".env")

SERPAPI_KEY = os.getenv("SERPAPI_API_KEY", "").strip()
IMGBB_KEY = os.getenv("IMGBB_API_KEY", "").strip()

print(f"SERPAPI_API_KEY: {SERPAPI_KEY[:15]}...")
print(f"IMGBB_API_KEY: {'SET' if IMGBB_KEY else 'NOT SET'}")

# Step 1: Pick a test image
test_img = r"C:\Users\Admin\Desktop\Gom\dataset\video_experiment_100\images\01_bat_trang_vietnam\001_01_bat_trang_vietnam_01.jpg"
if not os.path.exists(test_img):
    print(f"ERROR: Test image not found: {test_img}")
    sys.exit(1)
print(f"\nTest image: {test_img}")
print(f"File size: {os.path.getsize(test_img)} bytes")

# Step 2: Upload to ImgBB
print("\n--- Step 2: Upload to ImgBB ---")
public_url = ""
if IMGBB_KEY:
    with open(test_img, "rb") as f:
        resp = requests.post(
            "https://api.imgbb.com/1/upload",
            params={"key": IMGBB_KEY},
            files={"image": f},
            timeout=30
        )
    print(f"ImgBB status: {resp.status_code}")
    if resp.status_code == 200:
        data = resp.json()
        public_url = data.get("data", {}).get("url", "")
        print(f"ImgBB URL: {public_url}")
    else:
        print(f"ImgBB error: {resp.text[:200]}")

if not public_url:
    # Try catbox
    print("Trying catbox...")
    with open(test_img, "rb") as f:
        resp = requests.post(
            "https://catbox.moe/user/api.php",
            data={"reqtype": "fileupload"},
            files={"fileToUpload": (os.path.basename(test_img), f)},
            timeout=30
        )
    if resp.status_code == 200 and resp.text.startswith("http"):
        public_url = resp.text.strip()
        print(f"Catbox URL: {public_url}")
    else:
        print(f"Catbox error: {resp.status_code} {resp.text[:200]}")

if not public_url:
    print("ERROR: Cannot upload image!")
    sys.exit(1)

# Step 3: Call SerpAPI
print(f"\n--- Step 3: SerpAPI Google Lens ---")
print(f"URL sent to SerpAPI: {public_url}")

params = {
    "engine": "google_lens",
    "url": public_url,
    "api_key": SERPAPI_KEY,
}
resp = requests.get("https://serpapi.com/search.json", params=params, timeout=30)
print(f"SerpAPI status: {resp.status_code}")

if resp.status_code == 200:
    data = resp.json()
    
    # Check all result types
    visual_matches = data.get("visual_matches", [])
    knowledge_graph = data.get("knowledge_graph", [])
    text_results = data.get("text_results", [])
    reverse_image = data.get("reverse_image_search", {})
    
    print(f"\nvisual_matches: {len(visual_matches)}")
    print(f"knowledge_graph: {len(knowledge_graph) if isinstance(knowledge_graph, list) else 'dict'}")
    print(f"text_results: {len(text_results)}")
    print(f"reverse_image_search: {reverse_image}")
    
    if visual_matches:
        print("\n--- Top 3 Visual Matches ---")
        for i, m in enumerate(visual_matches[:3]):
            print(f"  [{i+1}] {m.get('title', '?')[:80]}")
            print(f"      URL: {m.get('link', '?')[:100]}")
            print(f"      Source: {m.get('source', '?')}")
    else:
        print("\nNO visual_matches returned!")
        print(f"\nFull response keys: {list(data.keys())}")
        # Print search_metadata for debugging
        sm = data.get("search_metadata", {})
        print(f"search_metadata.status: {sm.get('status')}")
        print(f"search_metadata.google_lens_url: {sm.get('google_lens_url', '?')[:120]}")
        
        # Print any error info
        if "error" in data:
            print(f"ERROR from SerpAPI: {data['error']}")
        
        # Print raw data sample
        print(f"\nRaw response (first 500 chars): {json.dumps(data, ensure_ascii=False)[:500]}")
else:
    print(f"SerpAPI error response: {resp.text[:300]}")
