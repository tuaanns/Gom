import asyncio
import os
from dotenv import load_dotenv
from agents.specialists import GPTAgent
import logging

logging.basicConfig(level=logging.DEBUG)

async def main():
    load_dotenv()
    agent = GPTAgent()
    print("API Key exists:", bool(agent.api_key))
    print("Model ID:", agent.model_id)
    res = await agent._call_llm("Bạn có thể trả lời tôi một chữ không?")
    print("Result:", repr(res))

if __name__ == "__main__":
    asyncio.run(main())
