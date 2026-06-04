import os
from dotenv import load_dotenv
from google import genai as google_genai
from openai import OpenAI

load_dotenv()

google_key = os.getenv("GOOGLE_API_KEY")
groq_key = os.getenv("GROQ_API_KEY")

print(f"Testing GOOGLE_API_KEY: {google_key[:10]}...")
try:
    client = google_genai.Client(api_key=google_key)
    # List models to verify key
    models = client.models.list()
    print("GOOGLE_API_KEY is VALID!")
except Exception as e:
    print("GOOGLE_API_KEY is INVALID! Error:", e)

print(f"Testing GROQ_API_KEY: {groq_key[:10]}...")
try:
    client = OpenAI(
        base_url="https://api.groq.com/openai/v1",
        api_key=groq_key
    )
    # Simple chat completion
    resp = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": "Ping"}]
    )
    print("GROQ_API_KEY is VALID!")
except Exception as e:
    print("GROQ_API_KEY is INVALID! Error:", e)
