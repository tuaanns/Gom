import os, requests
from dotenv import load_dotenv
load_dotenv(".env")

k = os.getenv("SERPAPI_API_KEY", "")
if not k:
    print("SERPAPI_API_KEY not set!")
    exit(1)

print(f"Key: {k[:15]}...")

r = requests.get("https://serpapi.com/account.json", params={"api_key": k}, timeout=10)
print(f"Status: {r.status_code}")

if r.status_code == 200:
    d = r.json()
    print(f"Plan: {d.get('plan_name', '?')}")
    print(f"Searches left: {d.get('total_searches_left', '?')}")
    print(f"This month: {d.get('this_month_usage', '?')}")
else:
    print(f"Error: {r.text[:200]}")
