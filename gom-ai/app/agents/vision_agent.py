import json
import logging
import os

from google import genai as google_genai
from google.genai import types as genai_types
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

logger = logging.getLogger("gom-ai.agents.vision")


# Raised on 429/503 so tenacity can retry
class _RateLimitError(Exception):
    pass


class VisionAgent:
    # Ordered list of models to try — fallback if primary is unavailable
    # Priority: Gemini 3 > Gemini 2.5 Pro > Gemini 2.5 Flash > Gemini 2.0 Flash
    # All models support vision capabilities
    MODELS = [
        "gemini-3.1-flash-lite",      # Best: Gemini 3 with agentic vision & reasoning
        "gemini-2.5-pro",               # Strongest reasoning & multimodal (1M context)
        "gemini-2.5-flash",             # Fast & efficient with good vision
        "gemini-2.5-flash-lite",        # Cost-effective fallback
        "gemini-2.0-flash-exp",         # Legacy fallback (deprecated soon)
    ]

    def __init__(self):
        self.api_key = os.getenv("GOOGLE_API_KEY")
        self.models = list(self.MODELS)

    def configure(self, models: list[str] | None = None):
        self.api_key = os.getenv("GOOGLE_API_KEY")
        if models:
            self.models = [model for model in models if model]

    @retry(
        retry=retry_if_exception_type(_RateLimitError),
        wait=wait_exponential(multiplier=5, min=10, max=60),
        stop=stop_after_attempt(3),
        reraise=True
    )
    # Analyze pottery image to extract core visual features
    async def analyze(self, image_bytes: bytes) -> dict:
        logger.info("[VisionAgent] Analyzing image...")
        self.api_key = os.getenv("GOOGLE_API_KEY")
        if not self.api_key:
            return {"error": "GOOGLE_API_KEY missing"}

        prompt = (
            "Bạn là chuyên gia giám định gốm sứ toàn cầu. Hãy phân tích ảnh này và trích xuất bằng chứng thị giác thô.\n"
            "QUAN TRỌNG: Đầu tiên, hãy xác định xem trong ảnh có thực sự chứa gốm sứ hay không. "
            "Nếu đó không phải là gốm sứ (ví dụ: ảnh người, động vật, phong cảnh, đồ vật không liên quan), "
            "hãy trả về JSON chỉ chứa một trường {'is_pottery': false}.\n"
            "Nếu là gốm sứ, hãy trả về JSON với 'is_pottery': true và các trường: "
            "color, pattern, material, shape, estimated_era, style_hint, và suspected_origin (ghi rõ quốc gia và tên thương hiệu, lò gốm hoặc dòng gốm CỤ THỂ NHẤT có thể, ví dụ: Meissen, Royal Albert, Bát Tràng, Cảnh Đức Trấn. KHÔNG ghi chung chung như 'Châu Âu' hay 'Gốm ngoại').\n"
            "LƯU Ý ĐẶC BIỆT: Cần đánh giá bao quát cả GỐM VIỆT NAM và GỐM THẾ GIỚI, KHÔNG ĐƯỢC ép buộc một vật phẩm vào gốm Việt Nam nếu nó thuộc về nền văn hóa khác. Một số ví dụ:\n"
            "- Gốm mộc/thô sơ (Rustic/Unglazed): Không chỉ có Bàu Trúc của Việt Nam (vuốt tay, nung ngoài trời), mà còn có Barro Negro (Oaxaca, Mexico - gốm đen bóng hoặc nhám, thường có đục lỗ hoa văn hoa lá/kỷ hà), gốm của người Mỹ bản địa, gốm Châu Phi...\n"
            "- Gốm tráng men truyền thống: Gốm Việt Nam (Bát Tràng, Chu Đậu, Lái Thiêu) thường có nét vẽ tự do, cốt đanh dày. Trong khi gốm Trung Quốc (Cảnh Đức Trấn), Nhật Bản, Châu Âu thường có cốt mỏng (sứ), họa tiết vô cùng chuẩn xác, đối xứng hoặc mang đặc trưng văn hóa đặc thù. Hãy đánh giá khách quan dựa trên mọi chi tiết thị giác nhỏ nhất, tuyệt đối không thiên vị."
        )

        client = google_genai.Client(api_key=self.api_key)
        last_error = None

        for model_id in self.models:
            try:
                logger.info(f"[VisionAgent] Trying model: {model_id}")
                response = await client.aio.models.generate_content(
                    model=model_id,
                    contents=[
                        genai_types.Part.from_bytes(data=image_bytes, mime_type="image/jpeg"),
                        genai_types.Part.from_text(text=prompt),
                    ],
                    config=genai_types.GenerateContentConfig(
                        response_mime_type="application/json"
                    )
                )
                logger.info(f"[VisionAgent] Success with model: {model_id}")
                return json.loads(response.text)
            except Exception as e:
                error_str = str(e)
                last_error = e
                logger.warning(f"[VisionAgent] Model {model_id} failed: {error_str[:200]}")
                if "429" in error_str or "RESOURCE_EXHAUSTED" in error_str:
                    logger.warning(f"[VisionAgent] Rate limited on {model_id} — trying next model...")
                    continue
                if "503" in error_str or "UNAVAILABLE" in error_str:
                    logger.warning(f"[VisionAgent] Model {model_id} unavailable — trying next model...")
                    continue
                # For other errors (auth, invalid request, etc.), no point trying other models
                return {"error": f"Lỗi phân tích hình ảnh: {error_str[:200]}"}

        # All models failed — raise for tenacity retry if it was a rate limit / availability issue
        if last_error:
            error_str = str(last_error)
            if "429" in error_str or "RESOURCE_EXHAUSTED" in error_str or "503" in error_str or "UNAVAILABLE" in error_str:
                logger.warning("[VisionAgent] All models exhausted — will retry with backoff...")
                raise _RateLimitError(error_str) from last_error
        return {"error": "Tất cả model AI đều không khả dụng. Vui lòng thử lại sau."}
