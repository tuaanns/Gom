"""Test Browserless REST API /content endpoint to fetch Google Lens results."""
import sys
sys.stdout.reconfigure(encoding='utf-8')

import requests
import os
import re
from urllib.parse import quote, parse_qs, unquote, urlparse
from dotenv import load_dotenv

load_dotenv("c:/Users/Admin/Desktop/Gom/gom-ai/.env")
token = os.getenv("BROWSERLESS_TOKEN")
imgbb_key = os.getenv("IMGBB_API_KEY")

# Step 1: Upload a test image to ImgBB
print("Step 1: Uploading test image to ImgBB...")
test_img = "uploads/gốm bát tràng.jpg"
if not os.path.exists(test_img):
    # Try to find any image in uploads
    for f in os.listdir("uploads"):
        if f.endswith((".jpg", ".jpeg", ".png")):
            test_img = f"uploads/{f}"
            break

with open(test_img, "rb") as f:
    resp = requests.post(
        "https://api.imgbb.com/1/upload",
        params={"key": imgbb_key},
        files={"image": f},
        timeout=30
    )
if resp.status_code == 200:
    public_url = resp.json()["data"]["url"]
    print(f"  ✓ Uploaded: {public_url}")
else:
    print(f"  ✗ Upload failed: {resp.status_code}")
    exit(1)

# Step 2: Use Browserless /content API to fetch Google Lens page
lens_url = f"https://lens.google.com/uploadbyurl?url={quote(public_url, safe='')}"
print(f"\nStep 2: Fetching Google Lens via Browserless REST API...")
print(f"  Lens URL: {lens_url[:80]}...")

browserless_content_url = f"https://chrome.browserless.io/content?token={token}"

payload = {
    "url": lens_url,
    "waitForSelector": {
        "selector": "a[href]",
        "timeout": 20000
    },
    "gotoOptions": {
        "waitUntil": "networkidle2",
        "timeout": 30000
    }
}

resp = requests.post(browserless_content_url, json=payload, timeout=60)
print(f"  Status: {resp.status_code}")

if resp.status_code == 200:
    html = resp.text
    print(f"  ✓ Got HTML ({len(html)} bytes)")
    
    # Step 3: Parse links from HTML
    print(f"\nStep 3: Extracting links from HTML...")
    
    # Find all href links
    href_pattern = re.compile(r'href=["\']([^"\']+)["\']')
    all_hrefs = href_pattern.findall(html)
    
    blocked = ("google.", "gstatic.", "ggpht.", "googleusercontent.", "schema.org")
    results = []
    
    for href in all_hrefs:
        # Normalize Google redirect URLs
        if not href:
            continue
        parsed = urlparse(href)
        host = parsed.netloc.lower()
        
        actual_url = href
        if "google." in host:
            params = parse_qs(parsed.query)
            for key in ("url", "q", "imgrefurl"):
                values = params.get(key)
                if values:
                    candidate = unquote(values[0]).strip()
                    if candidate.startswith("http"):
                        actual_url = candidate
                        break
            else:
                continue  # Skip pure Google links
        
        if not actual_url.startswith("http"):
            continue
            
        url_host = urlparse(actual_url).netloc.lower()
        if any(b in url_host for b in blocked):
            continue
            
        if actual_url not in [r["url"] for r in results]:
            # Try to find a title near this link
            title_match = re.search(
                r'(?:title=["\']([^"\']{3,80})["\']|aria-label=["\']([^"\']{3,80})["\'])',
                html[max(0, html.find(href)-500):html.find(href)+200]
            )
            title = ""
            if title_match:
                title = title_match.group(1) or title_match.group(2) or ""
            if not title:
                title = url_host.replace("www.", "")
            
            results.append({"title": title, "url": actual_url})
    
    print(f"  Found {len(results)} external links:")
    for i, r in enumerate(results[:15]):
        print(f"  {i+1}. {r['title'][:60]} → {r['url'][:80]}")
        
    if not results:
        # Dump some HTML for debugging
        print("\n  [DEBUG] First 2000 chars of HTML:")
        print(html[:2000])
else:
    print(f"  ✗ Failed: {resp.text[:300]}")
