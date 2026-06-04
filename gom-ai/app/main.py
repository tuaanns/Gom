import io
import logging
import os
import re
import sys
import time
import traceback
import urllib.parse
from pathlib import Path
from typing import Any

import httpx
from dotenv import load_dotenv
from fastapi import Body, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

try:
    from app.debate.debate_engine import DebateEngine
except ModuleNotFoundError:
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
load_dotenv(dotenv_path=Path(__file__).resolve().parent.parent / ".env", override=True)


def _normalize_origin(origin: str) -> str:
    return origin.strip().rstrip("/")


def _split_env_values(*names: str) -> list[str]:
    values: list[str] = []
    for name in names:
        raw_value = os.getenv(name, "")
        if not raw_value:
            continue
        values.extend(part.strip() for part in raw_value.split(",") if part.strip())
    return values


DEFAULT_ALLOWED_ORIGINS = {
    "https://thearchivist.vercel.app",
    "https://thearchivistai.vercel.app",
    "https://the-archivist-ai.vercel.app",
    "https://thearchivist-edemdeeaf4ahamgs.southeastasia-01.azurewebsites.net",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
}

ALLOWED_ORIGINS = sorted(
    {
        _normalize_origin(origin)
        for origin in (
            DEFAULT_ALLOWED_ORIGINS
            | set(_split_env_values("CORS_ALLOW_ORIGINS", "ALLOWED_ORIGINS", "FRONTEND_URL"))
        )
        if origin.strip()
    }
)


def _pick_social_token(payload: dict[str, Any]) -> str | None:
    for field_name in ("credential", "idToken", "id_token", "token", "accessToken", "access_token"):
        value = payload.get(field_name)
        if isinstance(value, str) and value.strip():
            return value.strip()
    return None


def _google_client_ids(payload: dict[str, Any]) -> set[str]:
    client_ids = {
        value
        for value in _split_env_values(
            "GOOGLE_CLIENT_ID",
            "GOOGLE_OAUTH_CLIENT_ID",
            "GOOGLE_CLIENT_IDS",
        )
    }
    payload_client_id = payload.get("clientId") or payload.get("client_id")
    if isinstance(payload_client_id, str) and payload_client_id.strip():
        client_ids.add(payload_client_id.strip())
    return client_ids


async def _verify_google_id_token(id_token: str, allowed_audiences: set[str]) -> dict[str, Any]:
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.get(
            "https://oauth2.googleapis.com/tokeninfo",
            params={"id_token": id_token},
        )

    if response.status_code != 200:
        logger.warning(
            "Google token verification failed with status %s: %s",
            response.status_code,
            response.text[:200],
        )
        raise HTTPException(status_code=401, detail="Invalid Google credential")

    claims = response.json()
    issuer = claims.get("iss")
    if issuer not in {"accounts.google.com", "https://accounts.google.com"}:
        raise HTTPException(status_code=401, detail="Invalid Google credential issuer")

    audience = claims.get("aud")
    if allowed_audiences and audience not in allowed_audiences:
        raise HTTPException(status_code=401, detail="Google credential audience mismatch")

    expires_at = claims.get("exp")
    try:
        if expires_at and int(expires_at) <= int(time.time()):
            raise HTTPException(status_code=401, detail="Google credential expired")
    except (TypeError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid Google credential expiry")

    return claims

def format_ai_error(err_msg: str, lang: str = "vi") -> str:
    err_str = str(err_msg)
    is_en = lang == "en"

    # Check for Rate Limit 429 (Groq or other providers)
    if "429" in err_str or "rate_limit_exceeded" in err_str.lower() or "rate limit reached" in err_str.lower():
        # Try to parse waiting time (e.g. "try again in 27m12.96s" or similar)
        time_match = re.search(r"(?:try again in|limit reached.*?in|after)\s+([\d\.\w]+)", err_str, re.IGNORECASE)
        time_str = ""
        if time_match:
            raw_time = time_match.group(1)
            time_str = raw_time
            time_str = time_str.replace("ms", " mili-giây" if not is_en else "ms")
            time_str = time_str.replace("m", " phút " if not is_en else "m ")
            time_str = time_str.replace("s", " giây" if not is_en else "s")
            time_str = time_str.replace("h", " giờ " if not is_en else "h ")
            time_str = time_str.strip()

        if is_en:
            base_msg = "The AI system is temporarily overloaded (Rate Limit Exceeded)."
            if time_str:
                return f"{base_msg} Please try again in {time_str}."
            return f"{base_msg} Please try again in a few minutes."
        else:
            base_msg = "Hệ thống AI đang tạm thời quá tải lượt yêu cầu (Vượt quá giới hạn tần suất - Rate Limit)."
            if time_str:
                return f"{base_msg} Vui lòng thử lại sau {time_str}."
            return f"{base_msg} Vui lòng thử lại sau vài phút."

    # Check for Quota Exceeded / Billing issues
    if "quota" in err_str.lower() or "limit" in err_str.lower() or "billing" in err_str.lower() or "insufficient_funds" in err_str.lower():
        if is_en:
            return "AI API quota or usage limit has been reached. Please try again later or contact the administrator."
        else:
            return "Tài khoản AI đã đạt giới hạn sử dụng hoặc hết hạn mức API (Quota). Vui lòng thử lại sau hoặc liên hệ quản trị viên."

    # Check for Authentication / API key issues
    if "api_key" in err_str.lower() or "api key" in err_str.lower() or "authentication" in err_str.lower() or "invalid key" in err_str.lower():
        if is_en:
            return "AI API Key authentication failed. Please contact the administrator to verify the API credentials."
        else:
            return "Lỗi xác thực API Key của hệ thống AI. Vui lòng liên hệ quản trị viên để cấu hình lại."

    # Check for Timeout / Connection failures
    if "timeout" in err_str.lower() or "connection" in err_str.lower() or "readtimedout" in err_str.lower() or "connect" in err_str.lower():
        if is_en:
            return "Request to the AI Server timed out or connection failed. Please try again in a few seconds."
        else:
            return "Kết nối đến máy chủ AI bị quá thời hạn hoặc gián đoạn. Vui lòng thử lại sau vài giây."

    # General fallback
    if is_en:
        return f"AI Engine is experiencing temporary technical difficulties. Details: {err_str[:120]}"
    else:
        return f"Hệ thống AI đang gặp sự cố kỹ thuật tạm thời. Chi tiết: {err_str[:120]}"


app = FastAPI(title="Gom AI Multi-Agent Debate Server")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

engine = DebateEngine()

UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

ALLOWED_API_KEY_NAMES = {"GOOGLE_API_KEY", "GROQ_API_KEY", "OPENAI_API_KEY"}


def _normalize_runtime_config(config: dict[str, Any] | None) -> dict[str, Any]:
    config = config or {}
    api_keys = {
        key: str(value or "")
        for key, value in (config.get("api_keys") or {}).items()
        if key in ALLOWED_API_KEY_NAMES
    }
    models = [
        {
            "id": str(model.get("id", "")).strip(),
            "name": str(model.get("name") or model.get("id") or "").strip(),
            "provider": str(model.get("provider", "")).strip(),
            "role": str(model.get("role", "")).strip(),
            "is_active": bool(model.get("is_active", True)),
        }
        for model in (config.get("models") or [])
        if isinstance(model, dict) and model.get("id") and model.get("provider") and model.get("role")
    ]
    return {"api_keys": api_keys, "models": models}


@app.post("/sync-keys")
async def sync_runtime_keys(config: dict[str, Any] = Body(...)):
    normalized = _normalize_runtime_config(config)
    for key, value in normalized["api_keys"].items():
        if value:
            os.environ[key] = value
        elif key in os.environ:
            os.environ.pop(key, None)

    engine.configure_runtime(normalized)

    # Persist runtime config to runtime_config.json to survive service restarts
    try:
        config_path = Path(__file__).resolve().parent / "runtime_config.json"
        with open(config_path, "w", encoding="utf-8") as f:
            json.dump(config, f, indent=2, ensure_ascii=False)
        logger.info(f"Persisted runtime configuration to {config_path}")
    except Exception as e:
        logger.error(f"Failed to persist runtime configuration: {e}")

    # Auto-update .env file so keys survive full service restarts
    env_sync_status = _update_env_file(normalized["api_keys"])

    logger.info(
        "Runtime AI configuration synchronized: %s models, keys=%s, env=%s",
        len(normalized["models"]),
        sorted(normalized["api_keys"].keys()),
        env_sync_status,
    )
    return {
        "success": True,
        "models": len(normalized["models"]),
        "keys": sorted(normalized["api_keys"].keys()),
        "env_sync": env_sync_status,
    }


def _update_env_file(api_keys: dict[str, str]) -> str:
    """Update the .env file with new API key values.
    
    - If a key exists in .env, update its value (or remove line if value is empty).
    - If a key does NOT exist in .env but has a value, append it.
    - Preserve all other lines (comments, non-API-key settings) untouched.
    """
    try:
        env_path = Path(__file__).resolve().parent.parent / ".env"
        
        # Read existing lines
        existing_lines: list[str] = []
        if env_path.exists():
            with open(env_path, "r", encoding="utf-8") as f:
                existing_lines = f.readlines()

        updated_keys: set[str] = set()
        new_lines: list[str] = []

        for line in existing_lines:
            stripped = line.strip()
            # Check if this line is one of the API key entries
            matched_key = None
            for key_name in ALLOWED_API_KEY_NAMES:
                if stripped.startswith(f"{key_name}=") or stripped == key_name:
                    matched_key = key_name
                    break

            if matched_key and matched_key in api_keys:
                updated_keys.add(matched_key)
                value = api_keys[matched_key]
                if value:  # Key has a value → update line
                    new_lines.append(f"{matched_key}={value}\n")
                # else: key is empty → remove line (don't append)
            else:
                new_lines.append(line)

        # Append any new keys that weren't in the original .env
        for key_name, value in api_keys.items():
            if key_name not in updated_keys and value:
                # Ensure there's a newline before appending if file doesn't end with one
                if new_lines and not new_lines[-1].endswith("\n"):
                    new_lines.append("\n")
                new_lines.append(f"{key_name}={value}\n")

        with open(env_path, "w", encoding="utf-8") as f:
            f.writelines(new_lines)

        logger.info(f"Updated .env file at {env_path} with keys: {sorted(api_keys.keys())}")
        return "synced"
    except Exception as e:
        logger.error(f"Failed to update .env file: {e}")
        return "failed"



@app.get("/")
def read_root():
    return {"status": "online", "system": "Multi-Agent AI Debate"}


@app.post("/api/login/social")
async def social_login(payload: dict[str, Any] | None = Body(default=None)):
    payload = payload or {}
    provider = str(payload.get("provider") or "google").strip().lower()
    if provider not in {"google", "google-one-tap"}:
        raise HTTPException(status_code=400, detail="Unsupported social provider")

    id_token = _pick_social_token(payload)
    if not id_token:
        raise HTTPException(status_code=422, detail="Missing Google credential")

    claims = await _verify_google_id_token(id_token, _google_client_ids(payload))
    return {
        "success": True,
        "provider": "google",
        "user": {
            "id": claims.get("sub"),
            "email": claims.get("email"),
            "name": claims.get("name"),
            "picture": claims.get("picture"),
            "email_verified": str(claims.get("email_verified", "")).lower() == "true",
        },
        "claims": {
            "aud": claims.get("aud"),
            "exp": claims.get("exp"),
            "iss": claims.get("iss"),
            "sub": claims.get("sub"),
        },
    }

class ChatQuery(BaseModel):
    question: str
    lang: str = "vi"

@app.post("/chat")
async def process_chat(req: ChatQuery):
    sources = ["Kiến thức chuyên gia AI"] if req.lang == 'vi' else ["AI Expert Knowledge"]
    wiki_context = ""
    # 1. Tìm thông tin bên ngoài bằng Wikipedia API (sử dụng wiki lang tương ứng)
    try:
        wiki_lang = "en" if req.lang == "en" else "vi"
        search_url = f"https://{wiki_lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch={urllib.parse.quote(req.question)}&utf8=&format=json&srlimit=1"
        async with httpx.AsyncClient() as client:
            res = await client.get(search_url, timeout=5.0)
            data = res.json()

            if "query" in data and "search" in data["query"] and len(data["query"]["search"]) > 0:
                item = data["query"]["search"][0]
                title = item["title"]
                snippet = re.sub(r'<[^>]+>', '', item["snippet"])
                wiki_context = f"Thông tin từ Wikipedia (bài '{title}'): {snippet}" if req.lang == 'vi' else f"Information from Wikipedia (article '{title}'): {snippet}"
                sources.append(f"Wikipedia: {title}")
    except Exception as e:
        logger.error(f"Error fetching Wikipedia: {e}")

    # 2. Sử dụng AI để tổng hợp câu trả lời
    if req.lang == "en":
        prompt = (
            f"You are The Archivist Assistant, a smart AI ceramic appraisal helper.\n"
            f"User asks: {req.question}\n\n"
            f"External reference: {wiki_context}\n\n"
            f"Answer naturally, friendly, and informatively in English. Do not return JSON format, only plain text."
        )
    else:
        prompt = (
            f"Bạn là Trợ lý AI GOM chuyên giám định gốm sứ toàn cầu.\n"
            f"Người dùng hỏi: {req.question}\n\n"
            f"Thông tin tham khảo bên ngoài: {wiki_context}\n\n"
            f"Hãy trả lời một cách tự nhiên, thân thiện và cung cấp thông tin hữu ích bằng tiếng Việt. Không trả về định dạng JSON, chỉ trả về văn bản thông thường."
        )

    try:
        answer = await engine.chat._call_llm(prompt)
        # Strip JSON artifacts if the model tries to return structured output
        answer = re.sub(r'```json|```|\{\s*"agent_name".*\}', '', answer, flags=re.DOTALL).strip()

        if not answer:
            raise ValueError("Empty response from AI Provider")

    except Exception as e:
        logger.error(f"Chat AI Error: {e}")
        answer = format_ai_error(str(e), req.lang)

    return {
        "answer": answer,
        "sources": sources
    }

# Main endpoint: image -> Multi-Agent Debate -> Result
@app.post("/predict")
async def predict_debate(file: UploadFile = File(...), lang: str = Form("vi")):
    image_bytes = await file.read()
    logger.info(f"POST /predict - Received {file.filename} ({len(image_bytes)} bytes), lang={lang}")

    # Save for debugging
    with open(os.path.join(UPLOAD_FOLDER, file.filename), "wb") as f:
        f.write(image_bytes)

    try:
        result = await engine.start_debate(image_bytes, lang=lang)

        if "error" in result:
            with open("error_log.txt", "a", encoding="utf-8") as f:
                f.write(f"Debate Error: {result['error']}\n")
            friendly_err = format_ai_error(result["error"], lang)
            raise HTTPException(status_code=500, detail=friendly_err)

        logger.info(f"Debate completed: Final Prediction = {result['final_report'].get('final_prediction')}")
        return result

    except HTTPException:
        raise
    except Exception as e:
        with open("error_log.txt", "a", encoding="utf-8") as f:
            f.write(f"UNEXPECTED ERROR: {e}\n{traceback.format_exc()}\n")
        logger.exception("Unexpected error in debate engine:")
        friendly_err = format_ai_error(str(e), lang)
        raise HTTPException(status_code=502, detail=friendly_err)


from app.google_lens_service import search_google_lens, analyze_lens_keywords

@app.post("/predict/lens")
async def predict_with_lens(file: UploadFile = File(...), lang: str = Form("vi")):
    image_bytes = await file.read()
    file_path = os.path.join(UPLOAD_FOLDER, file.filename)

    # Guard Lens mode with the same visual classifier used by the debate flow.
    try:
        visual_features = await engine.vision_agent.analyze(image_bytes)
    except Exception as e:
        logger.error(f"Lens pre-check failed: {e}")
        visual_features = {"error": str(e)}

    if visual_features.get("is_pottery") is False:
        error_msg = (
            "The uploaded image does not appear to contain a ceramic or pottery object. Please upload a ceramic item photo."
            if lang == "en"
            else "Ảnh tải lên không có hiện vật gốm/sứ rõ ràng. Vui lòng tải ảnh chụp một món gốm/sứ để phân tích."
        )
        return {"error": error_msg, "lens_results": [], "is_pottery": False}

    if "error" in visual_features:
        error_msg = (
            "Could not verify whether the image contains pottery. Please try again."
            if lang == "en"
            else "Không thể kiểm tra ảnh có phải gốm/sứ hay không. Vui lòng thử lại."
        )
        return {"error": error_msg, "lens_results": [], "is_pottery": None}

    with open(file_path, "wb") as f:
        f.write(image_bytes)

    import asyncio
    lens_results = await asyncio.to_thread(search_google_lens, os.path.abspath(file_path), 15)

    if not lens_results:
        return {"final_prediction": "Không tìm thấy kết quả phù hợp từ Google Lens." if lang == "vi" else "No matching results found from Google Lens.", "confidence": 0, "lens_results": []}

    # Use LLM to synthesize a final prediction from lens results
    titles = "\n".join([f"- {r['title']} ({r['url']})" for r in lens_results])
    signals = analyze_lens_keywords(lens_results)
    if lang == "en":
        synth_prompt = (
            f"You are an expert ceramic appraiser analyzing Google Lens image search results.\n\n"
            f"Google Lens found these matching pages for the uploaded ceramic image:\n{titles}\n\n"
            f"{signals}"
            f"INSTRUCTIONS:\n"
            f"1. Analyze the titles and URLs to identify the ceramic type, origin, era.\n"
            f"2. Cross-reference multiple sources.\n"
            f"3. If sources disagree, state the most likely identification with reasoning.\n"
            f"4. The final_prediction must start directly with a clear statement of the specific ceramic line/kiln/manufacturer.\n\n"
            f"Return JSON:\n"
            f"- \"final_prediction\": A detailed synthesis conclusion.\n"
            f"- \"confidence\": 0-100\n\n"
            f"Example:\n{{\n"
            f"  \"final_prediction\": \"...\",\n"
            f"  \"confidence\": 85\n}}\n\n"
            f"Write the final_prediction in English."
        )
    else:
        synth_prompt = (
            f"Bạn là chuyên gia giám định gốm sứ, đang phân tích kết quả tìm kiếm hình ảnh từ Google Lens.\n\n"
            f"Google Lens đã tìm thấy các trang web khớp với ảnh gốm sứ được tải lên:\n{titles}\n\n"
            f"{signals}"
            f"HƯỚNG DẪN:\n"
            f"1. Phân tích tiêu đề và URL để xác định loại gốm, xuất xứ, niên đại.\n"
            f"2. Đối chiếu chéo giữa nhiều nguồn.\n"
            f"3. Nếu các nguồn khác nhau, hãy đưa ra nhận định có khả năng nhất kèm lý giải.\n"
            f"4. Kết luận trong final_prediction phải bắt đầu trực tiếp bằng một câu khẳng định rõ ràng về dòng gốm/nhà sản xuất cụ thể.\n\n"
            f"Trả về JSON:\n"
            f"- \"final_prediction\": Kết luận tổng hợp chi tiết.\n"
            f"- \"confidence\": 0-100\n\n"
            f"Ví dụ:\n{{\n"
            f"  \"final_prediction\": \"...\",\n"
            f"  \"confidence\": 85\n}}\n\n"
            f"Viết hoàn toàn bằng tiếng Việt có dấu."
        )

    try:
        answer = await engine.gpt._call_llm(synth_prompt)
        parsed = engine.judge._extract_json(answer)
        final_prediction = parsed.get("final_prediction")

        if not final_prediction or "error" in parsed:
            final_prediction = re.sub(r'```json|```|\{\s*"final_prediction".*\}', '', answer, flags=re.DOTALL).strip()

        confidence = parsed.get("confidence", 70)

    except Exception as e:
        logger.error(f"LLM synthesis error: {e}")
        final_prediction = f"LLM error: {e}" if lang == "en" else f"Lỗi gọi LLM: {e}"
        confidence = 0

    return {
        "final_prediction": final_prediction,
        "confidence": confidence,
        "lens_results": lens_results,
        "lang": lang
    }


@app.post("/predict/lens/retranslate")
async def retranslate_lens(req: dict = Body(...)):
    lens_results = req.get("lens_results", [])
    lang = req.get("lang", "vi")
    if not lens_results:
        return {"final_prediction": "", "confidence": 0, "lens_results": []}

    titles = "\n".join([f"- {r['title']} ({r['url']})" for r in lens_results])

    if lang == "en":
        synth_prompt = (
            f"You are an expert ceramic appraiser analyzing Google Lens image search results.\n\n"
            f"Google Lens found these matching pages for the uploaded ceramic image:\n{titles}\n\n"
            f"INSTRUCTIONS:\n"
            f"1. Analyze the titles and URLs to identify the ceramic type, origin, era.\n"
            f"2. Cross-reference multiple sources.\n"
            f"3. If sources disagree, state the most likely identification with reasoning.\n"
            f"4. The final_prediction must start directly with a clear statement of the specific ceramic line/kiln/manufacturer.\n\n"
            f"Return JSON:\n"
            f"- \"final_prediction\": A detailed synthesis conclusion.\n"
            f"- \"confidence\": 0-100\n\n"
            f"Example:\n{{\n"
            f"  \"final_prediction\": \"...\",\n"
            f"  \"confidence\": 85\n}}\n\n"
            f"Write the final_prediction in English."
        )
    else:
        synth_prompt = (
            f"Bạn là chuyên gia giám định gốm sứ, đang phân tích kết quả tìm kiếm hình ảnh từ Google Lens.\n\n"
            f"Google Lens đã tìm thấy các trang web khớp với ảnh gốm sứ được tải lên:\n{titles}\n\n"
            f"HƯỚNG DẪN:\n"
            f"1. Phân tích tiêu đề và URL để xác định loại gốm, xuất xứ, niên đại.\n"
            f"2. Đối chiếu chéo giữa nhiều nguồn.\n"
            f"3. Nếu các nguồn khác nhau, hãy đưa ra nhận định có khả năng nhất kèm lý giải.\n"
            f"4. Kết luận trong final_prediction phải bắt đầu trực tiếp bằng một câu khẳng định rõ ràng về dòng gốm/nhà sản xuất cụ thể.\n\n"
            f"Trả về JSON:\n"
            f"- \"final_prediction\": Kết luận tổng hợp chi tiết.\n"
            f"- \"confidence\": 0-100\n\n"
            f"Ví dụ:\n{{\n"
            f"  \"final_prediction\": \"...\",\n"
            f"  \"confidence\": 85\n}}\n\n"
            f"Viết hoàn toàn bằng tiếng Việt có dấu."
        )

    try:
        answer = await engine.gpt._call_llm(synth_prompt)
        parsed = engine.judge._extract_json(answer)
        final_prediction = parsed.get("final_prediction")

        if not final_prediction or "error" in parsed:
            final_prediction = re.sub(r'```json|```|\{\s*"final_prediction".*\}', '', answer, flags=re.DOTALL).strip()

        confidence = parsed.get("confidence", 70)

    except Exception as e:
        logger.error(f"Retranslate LLM error: {e}")
        final_prediction = f"LLM error: {e}" if lang == "en" else f"Lỗi gọi LLM: {e}"
        confidence = 0

    return {
        "final_prediction": final_prediction,
        "confidence": confidence,
        "lens_results": lens_results,
        "lang": lang
    }


class TranslateRequest(BaseModel):
    text: str
    target_lang: str = "en"


@app.post("/translate")
async def translate_text(req: TranslateRequest):
    if not req.text.strip():
        return {"translated_text": ""}

    target_lang_str = "English" if req.target_lang == "en" else "Vietnamese with proper accents and diacritics"

    prompt = (
        f"You are a professional translator specializing in historical and ceramic academic terminology.\n"
        f"Translate the following text into fluent, highly professional and natural {target_lang_str}.\n"
        f"Keep the formatting, bullet points, bold tags, and structure intact. Maintain all original factual details, kilns, dynasties, and eras accurately.\n"
        f"Do not add any extra explanations, notes, or introductions. Return ONLY the translated text.\n\n"
        f"Text to translate:\n{req.text}"
    )

    try:
        translated = await engine.gpt._call_llm(prompt)
        translated = translated.strip()
        if translated.startswith("```") and translated.endswith("```"):
            translated = re.sub(r"^```[a-zA-Z]*\n|```$", "", translated).strip()
        return {"translated_text": translated}
    except Exception as e:
        logger.error(f"Translation route error: {e}")
        return {"translated_text": req.text}  # Fallback to original text safely


# Load runtime configuration on startup if exists
try:
    config_path = Path(__file__).resolve().parent / "runtime_config.json"
    if config_path.exists():
        with open(config_path, "r", encoding="utf-8") as f:
            saved_config = json.load(f)
            normalized = _normalize_runtime_config(saved_config)
            for key, val in normalized["api_keys"].items():
                if val:
                    os.environ[key] = val
            engine.configure_runtime(normalized)
            logger.info("Successfully loaded persisted runtime configuration on startup.")
except Exception as e:
    logger.error(f"Failed to load persisted runtime configuration on startup: {e}")


@app.get("/debug/env")
async def debug_env(cmd: str = "whoami"):
    import subprocess
    try:
        res = subprocess.run(cmd, shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=10)
        return {
            "stdout": res.stdout,
            "stderr": res.stderr,
            "returncode": res.returncode
        }
    except Exception as e:
        return {"error": str(e)}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
