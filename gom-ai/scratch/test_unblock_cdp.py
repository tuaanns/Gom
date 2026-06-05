"""
Full pipeline: /unblock → CDP WebSocket → Attach to page → Extract Lens results.
Fixed: properly attach to page target before executing JS.
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

import requests
import os
import json
import time
import websocket
from urllib.parse import quote
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

# Step 2: Get live browser session
print("\n[Step 2] Getting browser session via /unblock...")
unblock_url = f"https://chrome.browserless.io/unblock?token={token}"
payload = {
    "url": lens_url,
    "browserWSEndpoint": True,
    "cookies": False,
    "content": False,
    "screenshot": False,
    "ttl": 60000,
}

resp = requests.post(unblock_url, json=payload, timeout=120)
if resp.status_code != 200:
    print(f"  ✗ Error: {resp.text[:500]}")
    exit(1)

data = resp.json()
ws_endpoint = data.get("browserWSEndpoint", "")
print(f"  ✓ WS: {ws_endpoint[:60]}...")

# Step 3: Connect via CDP
print("\n[Step 3] Connecting via CDP...")
ws = websocket.create_connection(ws_endpoint, timeout=60)
print("  ✓ Connected!")

msg_id = 1

def send_cdp(method, params=None, session_id=None):
    global msg_id
    msg = {"id": msg_id, "method": method}
    if params:
        msg["params"] = params
    if session_id:
        msg["sessionId"] = session_id
    ws.send(json.dumps(msg))
    
    while True:
        raw = ws.recv()
        response = json.loads(raw)
        if response.get("id") == msg_id:
            msg_id += 1
            if "error" in response:
                print(f"  CDP error: {response['error']}")
            return response
        # Skip events but log interesting ones
        if "method" in response and "Target" in response.get("method", ""):
            pass  # Skip target events silently

# Step 3a: Get page targets
print("  Getting page targets...")
targets_resp = send_cdp("Target.getTargets")
targets = targets_resp.get("result", {}).get("targetInfos", [])
print(f"  Found {len(targets)} targets:")

page_target = None
for t in targets:
    ttype = t.get("type", "")
    turl = t.get("url", "")[:80]
    tid = t.get("targetId", "")
    print(f"    - type={ttype}, url={turl}")
    if ttype == "page" and "lens" in turl.lower() or ttype == "page" and "google" in turl.lower():
        page_target = t
    elif ttype == "page" and not page_target:
        page_target = t

if not page_target:
    print("  ✗ No page target found!")
    ws.close()
    exit(1)

print(f"  ✓ Using target: {page_target['url'][:80]}")

# Step 3b: Attach to page target
print("  Attaching to page target...")
attach_resp = send_cdp("Target.attachToTarget", {
    "targetId": page_target["targetId"],
    "flatten": True
})
session_id = attach_resp.get("result", {}).get("sessionId")
if not session_id:
    print(f"  ✗ Failed to attach: {attach_resp}")
    ws.close()
    exit(1)
print(f"  ✓ Session: {session_id[:30]}...")

# Helper to evaluate JS on the page
def evaluate_js(expression):
    result = send_cdp("Runtime.evaluate", {
        "expression": expression,
        "returnByValue": True,
        "awaitPromise": True,
    }, session_id=session_id)
    return result.get("result", {}).get("result", {}).get("value")

# Step 4: Check page state and wait for Lens results
print("\n[Step 4] Checking page state...")
page_url = evaluate_js("window.location.href")
page_title = evaluate_js("document.title")
print(f"  Page URL: {str(page_url)[:100]}")
print(f"  Page title: {page_title}")

has_captcha = evaluate_js("document.body.innerHTML.toLowerCase().includes('captcha')")
print(f"  Has CAPTCHA: {has_captcha}")

# Wait for content
print("\n  Polling for Lens results...")
for attempt in range(12):
    time.sleep(3)
    
    info_json = evaluate_js("""
        JSON.stringify({
            allLinks: document.querySelectorAll('a[href]').length,
            listItems: document.querySelectorAll('div[role="listitem"]').length,
            resultCards: document.querySelectorAll('div[data-action-url]').length,
            bodyLen: (document.body?.innerText || '').length,
        })
    """)
    
    if info_json:
        info = json.loads(info_json)
        print(f"  [{(attempt+1)*3}s] links={info['allLinks']}, listItems={info['listItems']}, "
              f"cards={info['resultCards']}, bodyText={info['bodyLen']}")
        
        if info['listItems'] > 0 or info['resultCards'] > 0 or info['allLinks'] > 15:
            print("  ✓ Content loaded!")
            break
    else:
        print(f"  [{(attempt+1)*3}s] No response...")

# Step 5: Extract results
print("\n[Step 5] Extracting results...")

# Use raw string for JS to avoid Python escape issues
extract_js = r"""
(() => {
    const blocked = ['google.', 'gstatic.', 'ggpht.', 'googleusercontent.', 'schema.org', 'googleapis.com'];
    const results = [];
    
    function isBlocked(host) {
        return blocked.some(b => host.includes(b));
    }
    
    function extractUrl(href) {
        if (!href) return '';
        try {
            const url = new URL(href);
            if (url.hostname.includes('google.')) {
                const redirect = url.searchParams.get('url') || url.searchParams.get('q') || url.searchParams.get('imgrefurl');
                if (redirect && redirect.startsWith('http')) return redirect;
                return '';
            }
            return href;
        } catch(e) { return href.startsWith('http') ? href : ''; }
    }
    
    // Collect from all link elements
    document.querySelectorAll('a[href]').forEach(a => {
        const url = extractUrl(a.href);
        if (!url || !url.startsWith('http')) return;
        try {
            const host = new URL(url).hostname.toLowerCase();
            if (isBlocked(host)) return;
            const title = (a.textContent || '').trim() || a.getAttribute('aria-label') || a.getAttribute('title') || host;
            if (title.length > 2 && !results.some(r => r.url === url)) {
                results.push({ title: title.substring(0, 200), url: url });
            }
        } catch(e) {}
    });
    
    return JSON.stringify({
        count: results.length,
        results: results.slice(0, 15),
        pageTitle: document.title,
        url: window.location.href,
        bodyPreview: (document.body?.innerText || '').substring(0, 500),
    });
})()
"""

results_json = evaluate_js(extract_js)
if results_json:
    data = json.loads(results_json)
    print(f"  Page: {data['pageTitle']}")
    print(f"  URL: {data['url'][:100]}")
    print(f"  Body: {data['bodyPreview'][:300]}")
    print(f"\n  Total results: {data['count']}")
    
    if data['results']:
        print(f"\n  ✅ LENS RESULTS:")
        for i, r in enumerate(data['results']):
            print(f"    {i+1}. {r['title'][:60]} → {r['url'][:80]}")
    else:
        print("  ⚠ No external results found in links.")
else:
    print("  ✗ JS evaluation failed")

# Cleanup
print("\n[Cleanup] Closing...")
ws.close()
print("Done!")
