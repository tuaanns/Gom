"""Extract links from /unblock HTML - deep analysis."""
import sys
sys.stdout.reconfigure(encoding='utf-8')

import requests
import os
import re
import json
from urllib.parse import quote, parse_qs, unquote, urlparse
from dotenv import load_dotenv

load_dotenv("c:/Users/Admin/Desktop/Gom/gom-ai/.env")
token = os.getenv("BROWSERLESS_TOKEN")
imgbb_key = os.getenv("IMGBB_API_KEY")

# Step 1: Upload image
print("[Step 1] Uploading test image...")
test_img = None
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
public_url = resp.json()["data"]["url"]
print(f"  ✓ {public_url}")

lens_url = f"https://lens.google.com/uploadbyurl?url={quote(public_url, safe='')}"

# Step 2: Get HTML via /unblock
print("\n[Step 2] Fetching via /unblock...")
unblock_url = f"https://chrome.browserless.io/unblock?token={token}"
payload = {
    "url": lens_url,
    "browserWSEndpoint": False,
    "cookies": False,
    "content": True,
    "screenshot": False,
    "ttl": 30000,
    "waitForSelector": {
        "selector": "a[href]",
        "timeout": 25000
    }
}

resp = requests.post(unblock_url, json=payload, timeout=120)
print(f"  Status: {resp.status_code}")

if resp.status_code != 200:
    print(f"  Error: {resp.text[:300]}")
    exit(1)

data = resp.json()
html = data.get("content", "")
print(f"  HTML size: {len(html)} bytes")

# Save HTML for inspection
with open("scratch/unblock_result.html", "w", encoding="utf-8") as f:
    f.write(html)
print("  Saved to scratch/unblock_result.html")

# Step 3: Deep link extraction
print("\n[Step 3] Extracting ALL links...")

# Method 1: All href attributes
href_pattern = re.compile(r'href=["\']([^"\']+)["\']')
all_hrefs = href_pattern.findall(html)
print(f"  Total href links found: {len(all_hrefs)}")

# Method 2: Categorize links
google_redirect_links = []
external_links = []
google_internal_links = []

blocked = ("google.", "gstatic.", "ggpht.", "googleusercontent.", "schema.org", "googleapis.com")

for href in all_hrefs:
    if not href or href.startswith("#") or href.startswith("javascript"):
        continue
    
    parsed = urlparse(href)
    host = parsed.netloc.lower()
    
    # Check if it's a Google redirect link with actual URL
    if "google." in host or href.startswith("/"):
        params = parse_qs(parsed.query)
        for key in ("url", "q", "imgrefurl"):
            values = params.get(key)
            if values:
                candidate = unquote(values[0]).strip()
                if candidate.startswith("http"):
                    url_host = urlparse(candidate).netloc.lower()
                    if not any(b in url_host for b in blocked):
                        google_redirect_links.append({
                            "extracted_url": candidate,
                            "host": url_host,
                            "original_href": href[:100]
                        })
                    break
        else:
            google_internal_links.append(href[:100])
    elif href.startswith("http"):
        url_host = urlparse(href).netloc.lower()
        if not any(b in url_host for b in blocked):
            external_links.append({"url": href, "host": url_host})

print(f"\n  Google redirect links (with real URLs): {len(google_redirect_links)}")
for i, link in enumerate(google_redirect_links[:20]):
    print(f"    {i+1}. [{link['host']}] {link['extracted_url'][:100]}")

print(f"\n  Direct external links: {len(external_links)}")
for i, link in enumerate(external_links[:20]):
    print(f"    {i+1}. [{link['host']}] {link['url'][:100]}")

print(f"\n  Google internal links: {len(google_internal_links)}")
for i, link in enumerate(google_internal_links[:5]):
    print(f"    {i+1}. {link}")

# Method 3: Check for encoded URLs in HTML source
print("\n[Step 4] Checking for encoded URLs in source...")
encoded_urls = re.findall(r'https?%3A%2F%2F[^"\'\&<>\\]+', html)
plain_urls = re.findall(r'https?://[^"\'\s<>\\]+', html)

unique_external = set()
for raw in encoded_urls + plain_urls:
    url = unquote(raw).strip().rstrip('\\",;)')
    parsed = urlparse(url)
    host = parsed.netloc.lower()
    if host and not any(b in host for b in blocked):
        unique_external.add(url[:150])

print(f"  Unique external URLs in source: {len(unique_external)}")
for i, url in enumerate(sorted(unique_external)[:20]):
    print(f"    {i+1}. {url[:100]}")

# Method 4: Check for data-* attributes with URLs
print("\n[Step 5] Checking data attributes...")
data_urls = re.findall(r'data-[a-z-]+=["\']([^"\']*https?://[^"\']+)["\']', html)
for i, url in enumerate(data_urls[:10]):
    decoded = unquote(url)
    host = urlparse(decoded).netloc.lower()
    if not any(b in host for b in blocked):
        print(f"    {i+1}. {decoded[:100]}")

# Method 5: Look for Visual Matches / Similar items sections
print("\n[Step 6] Checking for visual match sections...")
visual_match_markers = [
    "Visual matches", "Kết quả hình ảnh", "Similar items",
    "Related content", "Pages that include", "Exact matches",
    "Lens results", "visually similar"
]
for marker in visual_match_markers:
    if marker.lower() in html.lower():
        print(f"  ✓ Found section: '{marker}'")
        idx = html.lower().find(marker.lower())
        print(f"    Context (200 chars): ...{html[max(0,idx-50):idx+150]}...")

# Method 6: Check what the page title says
title_match = re.search(r'<title>([^<]+)</title>', html)
if title_match:
    print(f"\n  Page title: {title_match.group(1)}")

# Check for specific content types
print(f"\n  Contains 'lens': {'lens' in html.lower()}")
print(f"  Contains 'visual': {'visual' in html.lower()}")
print(f"  Contains 'search': {'search' in html.lower()}")
print(f"  Contains 'ceramic': {'ceramic' in html.lower()}")
print(f"  Contains 'pottery': {'pottery' in html.lower()}")
print(f"  Contains 'agano': {'agano' in html.lower()}")

print("\n" + "=" * 60)
print("Done!")
