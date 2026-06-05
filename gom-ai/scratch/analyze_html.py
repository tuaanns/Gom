"""Quick HTML analysis of unblock result."""
import sys
sys.stdout.reconfigure(encoding='utf-8')
import re

html = open('scratch/unblock_result.html', 'r', encoding='utf-8').read()
print(f"Total size: {len(html)}")

# Find lens references
for keyword in ['lens', 'visual', 'match', 'similar', 'result', 'ceramic', 'pottery', 'agano', 'aganoyaki']:
    positions = [m.start() for m in re.finditer(keyword, html.lower())]
    if positions:
        print(f"\n'{keyword}' found {len(positions)} times, first at index {positions[0]}")
        idx = positions[0]
        context = html[max(0, idx-80):idx+120].replace('\n', ' ')
        print(f"  Context: ...{context}...")

# Check if JavaScript needs to render content
print("\n\n--- Checking for JS-rendered content markers ---")
markers = ['AF_initDataCallback', 'data:', 'window.WIZ_global_data', 'data-lpage', 'data-action-url']
for m in markers:
    if m in html:
        idx = html.find(m)
        print(f"  Found '{m}' at index {idx}")
        print(f"    Context: {html[idx:idx+200].replace(chr(10), ' ')[:200]}")

# Check noscript content
noscript = re.findall(r'<noscript>(.*?)</noscript>', html, re.DOTALL)
print(f"\n--- Noscript sections: {len(noscript)} ---")
for i, ns in enumerate(noscript):
    print(f"  Noscript {i}: {len(ns)} bytes")
    if len(ns) > 50:
        print(f"    Preview: {ns[:300]}")

# Look for JSON data embedded in scripts
print("\n--- Looking for embedded JSON data ---")
json_patterns = re.findall(r'AF_initDataCallback\(({.*?})\)', html[:50000], re.DOTALL)
print(f"  AF_initDataCallback blocks: {len(json_patterns)}")

# Check for image URLs (indicates results loaded)
img_urls = re.findall(r'src=["\']([^"\']+)["\']', html)
external_imgs = [u for u in img_urls if 'http' in u and 'google' not in u.lower() and 'gstatic' not in u.lower()]
print(f"\n--- External image URLs: {len(external_imgs)} ---")
for u in external_imgs[:10]:
    print(f"  {u[:100]}")

# Check body content (stripped of scripts/styles)  
body_match = re.search(r'<body[^>]*>(.*)</body>', html, re.DOTALL)
if body_match:
    body = body_match.group(1)
    clean_body = re.sub(r'<script[^>]*>.*?</script>', '', body, flags=re.DOTALL)
    clean_body = re.sub(r'<style[^>]*>.*?</style>', '', clean_body, flags=re.DOTALL)
    clean_body = re.sub(r'<[^>]+>', ' ', clean_body)
    clean_body = re.sub(r'\s+', ' ', clean_body).strip()
    print(f"\n--- Visible text content ({len(clean_body)} chars) ---")
    print(clean_body[:1000])

print("\nDone!")
