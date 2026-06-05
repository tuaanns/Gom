import requests
import os
from dotenv import load_dotenv

load_dotenv("c:/Users/Admin/Desktop/Gom/gom-ai/.env")
token = os.getenv("BROWSERLESS_TOKEN")
print(f"Testing token: {token}")

endpoints = [
    "https://chrome.browserless.io/config",
    "https://chrome.browserless.io/status",
    "https://chrome.browserless.io/sessions",
    "https://us-east.browserless.io/config",
    "https://production-sfo.browserless.io/config",
]

for url in endpoints:
    try:
        resp = requests.get(f"{url}?token={token}", timeout=10)
        print(f"URL: {url}")
        print(f"  Status code: {resp.status_code}")
        print(f"  Response: {resp.text[:200]}")
    except Exception as e:
        print(f"URL: {url} failed: {e}")
