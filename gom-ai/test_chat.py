import asyncio
from dotenv import load_dotenv
from debate.debate_engine import DebateEngine
import re

async def main():
    load_dotenv()
    engine = DebateEngine()
    question = "các loại gốm nổi tiếng trên thế giới"
    wiki_context = ""
    prompt = (
        f"Bạn là Trợ lý AI GOM chuyên giám định gốm sứ toàn cầu.\n"
        f"Người dùng hỏi: {question}\n\n"
        f"Thông tin tham khảo bên ngoài: {wiki_context}\n\n"
        f"Hãy trả lời một cách tự nhiên, thân thiện và cung cấp thông tin hữu ích bằng tiếng Việt. Không trả về định dạng JSON, chỉ trả về văn bản thông thường."
    )
    answer = await engine.gpt._call_llm(prompt)
    print("RAW ANSWER:", repr(answer))
    answer_stripped = re.sub(r'```json|```|\{\s*"agent_name".*\}', '', answer, flags=re.DOTALL).strip()
    print("STRIPPED ANSWER:", repr(answer_stripped))

if __name__ == "__main__":
    asyncio.run(main())
