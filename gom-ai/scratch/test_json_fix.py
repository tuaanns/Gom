import asyncio
import os
import sys
from dotenv import load_dotenv

# Ensure we can import from app
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# Load .env
load_dotenv(override=True)

from app.debate.debate_engine import DebateEngine

async def main():
    engine = DebateEngine()
    
    # Let's check some simple model configurations first
    print("Models configuration check:")
    print(f"GPT: {engine.gpt.provider} - {engine.gpt.model_id}")
    print(f"Grok: {engine.grok.provider} - {engine.grok.model_id}")
    print(f"Gemini: {engine.gemini.provider} - {engine.gemini.model_id}")
    
    image_path = os.path.join("uploads", "arita3.jpg")
    if not os.path.exists(image_path):
        print(f"Test image not found at {image_path}")
        return
        
    print(f"Reading image {image_path}...")
    with open(image_path, "rb") as f:
        img_bytes = f.read()
        
    print("Starting debate...")
    result = await engine.start_debate(img_bytes, lang="vi")
    print("\nResult:")
    import pprint
    pprint.pprint(result)

if __name__ == "__main__":
    asyncio.run(main())
