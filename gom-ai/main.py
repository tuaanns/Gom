import io
import logging
import os
import sys
from pathlib import Path
from dotenv import load_dotenv
from fastapi import FastAPI, File, UploadFile, HTTPException
from debate.debate_engine import DebateEngine

# Logging — force UTF-8 output to avoid UnicodeEncodeError on Windows (gbk)
_utf8_stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace", line_buffering=True)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    handlers=[logging.StreamHandler(_utf8_stdout)],
)
logger = logging.getLogger("gom-ai")

# Environment
load_dotenv(dotenv_path=Path(__file__).resolve().parent / ".env", override=True)

app = FastAPI(title="Gom AI Multi-Agent Debate Server")
engine = DebateEngine()

UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

from pydantic import BaseModel
import httpx

@app.get("/")
def read_root():
    return {"status": "online", "system": "Multi-Agent AI Debate"}

class ChatQuery(BaseModel):
    question: str

@app.post("/chat")
async def process_chat(req: ChatQuery):
    sources = ["Kiến thức chuyên gia AI"]
    wiki_context = ""
    # 1. Tìm thông tin bên ngoài bằng Wikipedia API
    try:
        import urllib.parse
        search_url = f"https://vi.wikipedia.org/w/api.php?action=query&list=search&srsearch={urllib.parse.quote(req.question)}&utf8=&format=json&srlimit=1"
        async with httpx.AsyncClient() as client:
            res = await client.get(search_url, timeout=5.0)
            data = res.json()
            
            if "query" in data and "search" in data["query"] and len(data["query"]["search"]) > 0:
                item = data["query"]["search"][0]
                title = item["title"]
                import re
                # Clean html tags from snippet
                snippet = re.sub(r'<[^>]+>', '', item["snippet"])
                wiki_context = f"Thông tin từ Wikipedia (bài '{title}'): {snippet}"
                sources.append(f"Wikipedia: {title}")
    except Exception as e:
        logger.error(f"Error fetching Wikipedia: {e}")

    # 2. Sử dụng AI để tổng hợp câu trả lời
    prompt = (
        f"Bạn là Trợ lý AI GOM chuyên giám định gốm sứ toàn cầu.\n"
        f"Người dùng hỏi: {req.question}\n\n"
        f"Thông tin tham khảo bên ngoài: {wiki_context}\n\n"
        f"Hãy trả lời một cách tự nhiên, thân thiện và cung cấp thông tin hữu ích bằng tiếng Việt. Không trả về định dạng JSON, chỉ trả về văn bản thông thường."
    )
    
    try:
        # Dùng Groq thay vì Gemini để tiết kiệm quota Gemini
        answer = await engine.gpt._call_llm(prompt)
        # LLM from base_agent always answers directly to prompt
        # We need to clean up if it tries to return JSON
        import re
        answer = re.sub(r'```json|```|\{\s*"agent_name".*\}', '', answer, flags=re.DOTALL).strip()
        
        if not answer:
            raise ValueError("Empty response from AI Provider")
            
    except Exception as e:
        answer = "Xin lỗi, hiện tại AI Engine đang gặp gián đoạn kết nối. Vui lòng thử lại sau vài giây."
        logger.error(f"Chat AI Error: {e}")

    return {
        "answer": answer,
        "sources": sources
    }

@app.post("/predict")
async def predict_debate(file: UploadFile = File(...)):
    """
    Main endpoint: image -> Multi-Agent Debate -> Result
    """
    image_bytes = await file.read()
    logger.info(f"POST /predict - Received {file.filename} ({len(image_bytes)} bytes)")
    
    # Save for debugging
    with open(os.path.join(UPLOAD_FOLDER, file.filename), "wb") as f:
        f.write(image_bytes)
        
    try:
        # Start the debate engine
        result = await engine.start_debate(image_bytes)
        
        if "error" in result:
            with open("error_log.txt", "a", encoding="utf-8") as f:
                f.write(f"Debate Error: {result['error']}\n")
            raise HTTPException(status_code=500, detail=result["error"])
            
        logger.info(f"Debate completed: Final Prediction = {result['final_report'].get('final_prediction')}")
        return result
        
    except HTTPException:
        raise  # Don't re-wrap HTTPException from above
    except Exception as e:
        import traceback
        with open("error_log.txt", "a", encoding="utf-8") as f:
            f.write(f"UNEXPECTED ERROR: {e}\n{traceback.format_exc()}\n")
        logger.exception("Unexpected error in debate engine:")
        raise HTTPException(status_code=502, detail=f"AI Engine Error: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
