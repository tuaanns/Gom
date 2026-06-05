"""Test Browserless /unblock and /content stealth endpoints for Google Lens."""
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

print(f"Token: {token[:15]}...")
print("=" * 60)

# Step 1: Upload a test image to ImgBB
print("\n[Step 1] Uploading test image to ImgBB...")
test_img = None
for f in os.listdir("uploads"):
    if f.endswith((".jpg", ".jpeg", ".png")):
        test_img = f"uploads/{f}"
        break

if not test_img:
    print("  ✗ No test image found in uploads/")
    exit(1)

print(f"  Using: {test_img}")
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

lens_url = f"https://lens.google.com/uploadbyurl?url={quote(public_url, safe='')}"
print(f"\n  Lens URL: {lens_url[:100]}...")

# ======== Test 1: /unblock endpoint ========
print("\n" + "=" * 60)
print("[Test 1] Browserless /unblock endpoint")
print("=" * 60)

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
        "timeout": 20000
    }
}

try:
    resp = requests.post(unblock_url, json=payload, timeout=90)
    print(f"  Status: {resp.status_code}")
    
    if resp.status_code == 200:
        try:
            data = resp.json()
            html = data.get("content", "")
            print(f"  ✓ Got response (content: {len(html)} bytes)")
            
            # Check for CAPTCHA
            if "captcha-form" in html.lower() or "recaptcha" in html.lower():
                print("  ⚠ CAPTCHA detected in response!")
            else:
                print("  ✓ No CAPTCHA detected!")
                
            # Extract links
            href_pattern = re.compile(r'href=["\']([^"\']+)["\']')
            all_hrefs = href_pattern.findall(html)
            blocked = ("google.", "gstatic.", "ggpht.", "googleusercontent.", "schema.org")
            results = []
            
            for href in all_hrefs:
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
                        continue
                if not actual_url.startswith("http"):
                    continue
                url_host = urlparse(actual_url).netloc.lower()
                if any(b in url_host for b in blocked):
                    continue
                if actual_url not in [r["url"] for r in results]:
                    results.append({"title": url_host.replace("www.", ""), "url": actual_url})
            
            print(f"  Found {len(results)} external links:")
            for i, r in enumerate(results[:10]):
                print(f"    {i+1}. {r['title'][:50]} → {r['url'][:80]}")
            
            if not results:
                print("\n  [DEBUG] First 1500 chars of HTML:")
                print(html[:1500])
        except Exception as e:
            # Maybe not JSON
            html = resp.text
            print(f"  Response is text ({len(html)} bytes), not JSON")
            if "captcha" in html.lower():
                print("  ⚠ CAPTCHA detected!")
            print(f"  First 500 chars: {html[:500]}")
    else:
        print(f"  ✗ Error: {resp.text[:300]}")
except Exception as e:
    print(f"  ✗ Request failed: {e}")

# ======== Test 2: /content with stealth ========
print("\n" + "=" * 60)
print("[Test 2] Browserless /content with stealth options")
print("=" * 60)

# Try /chromium/content for stealth
for endpoint in [
    f"https://chrome.browserless.io/chromium/content?token={token}",
    f"https://chrome.browserless.io/content?token={token}&stealth=true",
]:
    print(f"\n  Trying: {endpoint[:80]}...")
    payload2 = {
        "url": lens_url,
        "gotoOptions": {
            "waitUntil": "networkidle2",
            "timeout": 45000
        },
        "waitForSelector": {
            "selector": "a[href]",
            "timeout": 25000
        },
        "bestAttempt": True,
    }
    try:
        resp2 = requests.post(endpoint, json=payload2, timeout=90)
        print(f"  Status: {resp2.status_code}")
        if resp2.status_code == 200:
            html2 = resp2.text
            print(f"  ✓ Got HTML ({len(html2)} bytes)")
            if "captcha-form" in html2.lower() or "recaptcha" in html2.lower():
                print("  ⚠ CAPTCHA detected!")
            elif "sorry" in html2.lower() and "unusual traffic" in html2.lower():
                print("  ⚠ Google 'unusual traffic' block!")
            else:
                print("  ✓ No CAPTCHA! Checking for results...")
                # Quick check for external links
                ext_links = re.findall(r'href=["\']https?://(?!.*google\.)([^"\']+)["\']', html2)
                print(f"  Found {len(ext_links)} potential external links")
                for link in ext_links[:5]:
                    print(f"    → {link[:80]}")
        else:
            print(f"  ✗ Error: {resp2.text[:200]}")
    except Exception as e:
        print(f"  ✗ Request failed: {e}")

# ======== Test 3: WebSocket CDP with solveCaptchas ========
print("\n" + "=" * 60)
print("[Test 3] Check WebSocket endpoint availability")
print("=" * 60)

# Check if we can get a browser WS endpoint
ws_url = f"https://chrome.browserless.io/chromium?token={token}&solveCaptchas=true"
print(f"  WS endpoint would be: wss://chrome.browserless.io/chromium?token={token[:15]}...&solveCaptchas=true")
print("  (This can be used with Playwright/Puppeteer for full browser automation with CAPTCHA solving)")

# Test config endpoint to check account capabilities
print("\n  Checking account config...")
try:
    config_resp = requests.get(f"https://chrome.browserless.io/config?token={token}", timeout=10)
    print(f"  Config status: {config_resp.status_code}")
    if config_resp.status_code == 200:
        config = config_resp.json()
        print(f"  Config: {json.dumps(config, indent=2)[:500]}")
except Exception as e:
    print(f"  Config check failed: {e}")

print("\n" + "=" * 60)
print("Done!")
