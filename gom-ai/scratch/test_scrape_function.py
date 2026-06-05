"""Test Browserless /scrape and /function endpoints for JS-rendered Google Lens."""
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

# ======== Test 1: /scrape endpoint ========
print("\n" + "=" * 60)
print("[Test 1] /scrape endpoint (extracts data after JS renders)")
print("=" * 60)

scrape_url = f"https://chrome.browserless.io/scrape?token={token}"
payload = {
    "url": lens_url,
    "elements": [
        {
            "selector": "a[href]",
        }
    ],
    "gotoOptions": {
        "waitUntil": "networkidle0",
        "timeout": 45000
    },
    "waitForTimeout": 20000,
}

try:
    resp = requests.post(scrape_url, json=payload, timeout=120)
    print(f"  Status: {resp.status_code}")
    if resp.status_code == 200:
        data = resp.json()
        print(f"  Response keys: {list(data.keys()) if isinstance(data, dict) else 'list'}")
        print(f"  Full response preview: {json.dumps(data, ensure_ascii=False)[:2000]}")
    else:
        print(f"  Error: {resp.text[:500]}")
except Exception as e:
    print(f"  Request failed: {e}")

# ======== Test 2: /function endpoint ========
print("\n" + "=" * 60)
print("[Test 2] /function endpoint (custom Puppeteer script)")
print("=" * 60)

function_url = f"https://chrome.browserless.io/function?token={token}"

# Puppeteer-based function that navigates, waits for JS, extracts links
puppeteer_code = """
export default async function({ page }) {
  const LENS_URL = `""" + lens_url + """`;
  
  // Navigate with stealth
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  await page.goto(LENS_URL, { waitUntil: 'networkidle2', timeout: 45000 });
  
  // Wait for content to render
  await page.waitForTimeout(15000);
  
  // Try to find Lens results
  const results = await page.evaluate(() => {
    const links = [];
    const blocked = ['google.', 'gstatic.', 'ggpht.', 'googleusercontent.', 'schema.org'];
    
    // Get all links
    document.querySelectorAll('a[href]').forEach(a => {
      let href = a.href || '';
      let title = a.textContent?.trim() || a.getAttribute('aria-label') || a.getAttribute('title') || '';
      
      if (!href || href.startsWith('javascript')) return;
      
      // Handle Google redirect URLs
      try {
        const url = new URL(href);
        if (url.hostname.includes('google.')) {
          const redirectUrl = url.searchParams.get('url') || url.searchParams.get('q') || url.searchParams.get('imgrefurl');
          if (redirectUrl && redirectUrl.startsWith('http')) {
            href = redirectUrl;
          } else {
            return; // Skip internal Google links
          }
        }
      } catch(e) {}
      
      if (!href.startsWith('http')) return;
      
      const host = new URL(href).hostname.toLowerCase();
      if (blocked.some(b => host.includes(b))) return;
      
      if (!links.some(l => l.url === href)) {
        links.push({ title: title.substring(0, 200) || host, url: href });
      }
    });
    
    return {
      pageTitle: document.title,
      url: window.location.href,
      linksCount: links.length,
      links: links.slice(0, 15),
      bodyText: document.body?.innerText?.substring(0, 500) || '',
      hasCaptcha: document.body?.innerHTML?.toLowerCase().includes('captcha') || false,
    };
  });
  
  return results;
}
"""

try:
    resp = requests.post(function_url, json={"code": puppeteer_code}, timeout=120)
    print(f"  Status: {resp.status_code}")
    if resp.status_code == 200:
        data = resp.json()
        print(f"  Page title: {data.get('pageTitle', 'N/A')}")
        print(f"  URL: {data.get('url', 'N/A')[:100]}")
        print(f"  Has CAPTCHA: {data.get('hasCaptcha', 'N/A')}")
        print(f"  Links found: {data.get('linksCount', 0)}")
        print(f"  Body text preview: {data.get('bodyText', '')[:300]}")
        links = data.get('links', [])
        if links:
            print(f"\n  External links:")
            for i, link in enumerate(links):
                print(f"    {i+1}. {link.get('title', '')[:60]} -> {link.get('url', '')[:80]}")
        else:
            print("  No external links found.")
    else:
        print(f"  Error: {resp.text[:500]}")
except Exception as e:
    print(f"  Request failed: {e}")

# ======== Test 3: /unblock with browserWSEndpoint ========
print("\n" + "=" * 60)
print("[Test 3] /unblock with browserWSEndpoint (live session)")
print("=" * 60)

unblock_url = f"https://chrome.browserless.io/unblock?token={token}"
payload = {
    "url": lens_url,
    "browserWSEndpoint": True,
    "cookies": False,
    "content": False,
    "screenshot": False,
    "ttl": 60000,
}

try:
    resp = requests.post(unblock_url, json=payload, timeout=120)
    print(f"  Status: {resp.status_code}")
    if resp.status_code == 200:
        data = resp.json()
        ws_endpoint = data.get("browserWSEndpoint", "")
        print(f"  WS endpoint: {ws_endpoint[:100] if ws_endpoint else 'not returned'}")
        print(f"  Response keys: {list(data.keys())}")
        # If we got a WS endpoint, we could connect with Playwright/Puppeteer
        if ws_endpoint:
            print("  ✓ Got live browser session! Can connect with Playwright/CDP.")
    else:
        print(f"  Error: {resp.text[:500]}")
except Exception as e:
    print(f"  Request failed: {e}")

print("\n" + "=" * 60)
print("Done!")
