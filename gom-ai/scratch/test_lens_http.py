import requests
import urllib.parse
import re

public_url = "https://i.ibb.co/vxs4yQz/lens-8c763d33.jpg" # a sample image URL
lens_url = f"https://lens.google.com/uploadbyurl?url={urllib.parse.quote(public_url, safe='')}"

headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept-Language": "vi,en-US;q=0.9,en;q=0.8",
}

print(f"Requesting: {lens_url}")
try:
    resp = requests.get(lens_url, headers=headers, timeout=15)
    print("Status:", resp.status_code)
    print("Length:", len(resp.text))
    
    # Let's save it to a file with utf-8 encoding
    with open("scratch/lens_response.html", "w", encoding="utf-8") as f:
        f.write(resp.text)
        
    print("Saved response to scratch/lens_response.html")
    
    # Search for links and titles
    # Google Lens data is usually in a script block containing JSON/jsdata, or in HTML tags.
    # Let's see if we can find any external links.
    urls = re.findall(r"https?://[^\s\"'<>]+", resp.text)
    external_urls = [u for u in urls if "google" not in u and "gstatic" not in u]
    print(f"Found {len(urls)} total URLs, {len(external_urls)} external URLs.")
    print("Sample external URLs:")
    for u in external_urls[:10]:
        print("-", u)
except Exception as e:
    print("Error:", e)
