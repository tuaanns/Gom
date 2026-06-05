import os
import sys

# Reconfigure stdout to use UTF-8 on Windows terminal
sys.stdout.reconfigure(encoding='utf-8')

from dotenv import load_dotenv
load_dotenv("c:/Users/Admin/Desktop/Gom/gom-ai/.env")

# Set logging to see our prints
import logging
logging.basicConfig(level=logging.INFO)

from app.google_lens_service import search_google_lens

img_path = "uploads/gốm bát tràng.jpg"
print(f"Running search_google_lens for image: {img_path}...")

results = search_google_lens(img_path, max_results=5)
print("\n--- RESULTS RECEIVED ---")
print(results)
if results:
    print("SUCCESS! Received results from Google Lens service.")
    for i, r in enumerate(results):
        print(f"  {i+1}. {r['title']} -> {r['url']}")
else:
    print("FAILED! No results.")
