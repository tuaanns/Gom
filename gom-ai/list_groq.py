import os
from groq import Groq
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv("GROQ_API_KEY")

try:
    client = Groq(api_key=api_key)
    models = client.models.list()
    for m in models.data:
        print(f"Model ID: {m.id}")
except Exception as e:
    print(f"Error: {e}")
