import os
from dotenv import load_dotenv
from google import genai as google_genai
from openai import OpenAI

load_dotenv()

def get_keys(env_name):
    raw = os.getenv(env_name, "")
    return [k.strip() for k in raw.split(",") if k.strip()]

google_keys = get_keys("GOOGLE_API_KEY")
groq_keys = get_keys("GROQ_API_KEY")

print(f"Found {len(google_keys)} Google API keys:")
for idx, key in enumerate(google_keys):
    print(f"Testing Google Key {idx+1}: {key[:10]}...")
    try:
        client = google_genai.Client(api_key=key)
        # List models to verify key
        models = client.models.list()
        print(f"  -> Google Key {idx+1} is VALID!")
    except Exception as e:
        print(f"  -> Google Key {idx+1} is INVALID! Error:", e)

print(f"\nFound {len(groq_keys)} Groq API keys:")
for idx, key in enumerate(groq_keys):
    print(f"Testing Groq Key {idx+1}: {key[:10]}...")
    try:
        client = OpenAI(
            base_url="https://api.groq.com/openai/v1",
            api_key=key
        )
        # Simple chat completion
        resp = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": "Ping"}]
        )
        print(f"  -> Groq Key {idx+1} is VALID!")
    except Exception as e:
        print(f"  -> Groq Key {idx+1} is INVALID! Error:", e)

openai_key = os.getenv("OPENAI_API_KEY")
print(f"\nTesting OPENAI_API_KEY: {openai_key[:10] if openai_key else 'None'}...")
if openai_key:
    try:
        client = OpenAI(api_key=openai_key)
        resp = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": "Ping"}]
        )
        print("  -> OPENAI_API_KEY is VALID!")
    except Exception as e:
        print("  -> OPENAI_API_KEY is INVALID! Error:", e)
else:
    print("  -> OPENAI_API_KEY is missing!")


