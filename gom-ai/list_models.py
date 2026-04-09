import os
from google import genai
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv("GOOGLE_API_KEY")

try:
    client = genai.Client(api_key=api_key)
    for model in client.models.list():
        print(f"Model: {model.name}")
except Exception as e:
    print(f"Error: {e}")
