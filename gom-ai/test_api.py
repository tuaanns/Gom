import os
from google import genai
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv("GOOGLE_API_KEY")
print(f"Testing Gemini with key: {api_key[:10]}...")

try:
    client = genai.Client(api_key=api_key)
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=["Hello, are you online?"]
    )
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")
