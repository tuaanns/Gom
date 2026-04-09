import logging
import os
from google import genai as google_genai
from google.genai import types as genai_types
from tenacity import retry, wait_exponential, stop_after_attempt, retry_if_exception_type

logger = logging.getLogger("gom-ai.agents.vision")


class _RateLimitError(Exception):
    """Raised on 429 so tenacity can retry."""
    pass


class VisionAgent:
    def __init__(self):
        self.api_key = os.getenv("GOOGLE_API_KEY")
        self.model_id = "gemini-3.1-flash-lite-preview"

    @retry(
        retry=retry_if_exception_type(_RateLimitError),
        wait=wait_exponential(multiplier=5, min=10, max=60),
        stop=stop_after_attempt(3),
        reraise=True
    )
    async def analyze(self, image_bytes: bytes) -> dict:
        """
        Analyze pottery image to extract core visual features.
        """
        logger.info("[VisionAgent] Analyzing image...")
        if not self.api_key:
            return {"error": "GOOGLE_API_KEY missing"}

        prompt = (
            "Bạn là chuyên gia giám định gốm sứ toàn cầu. Hãy phân tích ảnh này và trích xuất bằng chứng thị giác thô. "
            "TRỌNG TÂM: Sử dụng kiến thức thị giác của bạn để nhận diện trực tiếp quốc gia và dòng gốm cụ thể nếu có thể (VD: Oribe Nhật Bản, Hagi Nhật Bản, Kiến Trản Tống, Bát Tràng...). "
            "Trả về JSON với các trường: color, pattern, material, shape, estimated_era, style_hint, và suspected_origin (ghi rõ quốc gia và dòng gốm bạn nghi ngờ nhất)."
        )

        try:
            client = google_genai.Client(api_key=self.api_key)
            response = await client.aio.models.generate_content(
                model=self.model_id,
                contents=[
                    genai_types.Part.from_bytes(data=image_bytes, mime_type="image/jpeg"),
                    genai_types.Part.from_text(text=prompt),
                ],
                config=genai_types.GenerateContentConfig(
                    response_mime_type="application/json"
                )
            )
            import json
            return json.loads(response.text)
        except _RateLimitError:
            raise  # Let tenacity handle retries
        except Exception as e:
            error_str = str(e)
            logger.error(f"[VisionAgent] Error: {e}")
            if "429" in error_str or "RESOURCE_EXHAUSTED" in error_str:
                logger.warning("[VisionAgent] Rate limited — will retry with backoff...")
                raise _RateLimitError(error_str) from e
            if "503" in error_str or "UNAVAILABLE" in error_str:
                return {"error": "AI Server đang quá tải. Vui lòng thử lại sau."}
            return {"error": f"Lỗi phân tích hình ảnh: {error_str[:200]}"}
