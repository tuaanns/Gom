import os
import sys

# Reconfigure stdout to use UTF-8 on Windows terminal
sys.stdout.reconfigure(encoding='utf-8')

from dotenv import load_dotenv
load_dotenv("c:/Users/Admin/Desktop/Gom/gom-ai/.env")

# Set BROWSERLESS_TOKEN to an invalid one to force failure
os.environ["BROWSERLESS_TOKEN"] = "expired_or_invalid_token_123"
os.environ["GOOGLE_LENS_REMOTE_ONLY"] = "true" # force remote container mode (simulating production)

# Set logging to see our prints
import logging
logging.basicConfig(level=logging.INFO)

from app.google_lens_service import search_google_lens

img_path = "uploads/gốm bát tràng.jpg"
print(f"Running search_google_lens for image: {img_path} with forced invalid browserless token...")

results = search_google_lens(img_path, max_results=5)
print("\n--- RESULTS RECEIVED ---")
print(results)
if results:
    print("SUCCESS! Received simulated/fallback results.")
else:
    print("FAILED! No results.")
