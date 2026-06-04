import os
from google import genai as google_genai
from google.genai import types as genai_types
from dotenv import load_dotenv

load_dotenv("c:/Users/Admin/Desktop/Gom/gom-ai/.env")
google_key = os.getenv("GOOGLE_API_KEY", "")
if "," in google_key:
    google_key = google_key.split(",")[0].strip()

print(f"Using Google Key: {google_key[:15]}...")

client = google_genai.Client(api_key=google_key)

img_path = "uploads/gốm bát tràng.jpg"

with open(img_path, "rb") as f:
    image_bytes = f.read()

prompt = (
    "You are simulating Google Lens search results for this ceramic image.\n"
    "Generate 5 highly realistic and accurate reference web pages that would match this image "
    "if searched on Google Lens (e.g. from antique dealer websites, auction house lots, museums).\n"
    "Return ONLY a JSON list of objects, where each object has 'title' and 'url' fields."
)

try:
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=[
            genai_types.Part.from_bytes(data=image_bytes, mime_type="image/jpeg"),
            genai_types.Part.from_text(text=prompt),
        ],
        config=genai_types.GenerateContentConfig(
            response_mime_type="application/json"
        )
    )
    print("Response text:")
    print(response.text)
except Exception as e:
    print("Error:", e)
