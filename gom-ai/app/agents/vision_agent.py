import json
import logging
import os

from google import genai as google_genai
from google.genai import types as genai_types
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

logger = logging.getLogger("gom-ai.agents.vision")

try:
    from app.agents.base_agent import key_rotator
except ModuleNotFoundError:
    from agents.base_agent import key_rotator


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
        self.api_key = key_rotator.get_key("google")
        if not self.api_key:
            return {"error": "GOOGLE_API_KEY missing"}

        prompt = (
            "Bạn là chuyên gia giám định gốm sứ toàn cầu hàng đầu thế giới với hơn 30 năm kinh nghiệm. "
            "Hãy phân tích ảnh này cực kỳ chi tiết và trích xuất MỌI bằng chứng thị giác.\n"
            "QUAN TRỌNG: Đầu tiên, hãy xác định xem trong ảnh có thực sự chứa gốm sứ hay không. "
            "Nếu đó không phải là gốm sứ (ví dụ: ảnh người, động vật, phong cảnh, đồ vật không liên quan), "
            "hãy trả về JSON chỉ chứa một trường {'is_pottery': false}.\n"
            "Nếu là gốm sứ, hãy trả về JSON với 'is_pottery': true và các trường chi tiết sau:\n"
            "- color: Màu sắc chính và phụ, bao gồm sắc thái chính xác (ví dụ: 'xanh ngọc olive đậm' thay vì 'xanh')\n"
            "- glaze_type: Loại men (celadon/men ngọc, men trắng, men nâu da lươn, men rạn, men lam, men tam thái, không men/gốm mộc, men chảy, men hỏa biến, majolica, tin-glaze, salt-glaze...)\n"
            "- glaze_details: Mô tả chi tiết bề mặt men (độ bóng, độ dày, vết rạn nứt, bọt khí, vết chảy men, crazing pattern...)\n"
            "- pattern: Họa tiết/hoa văn chi tiết (rồng mấy móng, hoa cúc/sen/mẫu đơn, cá, chim phượng, hoa văn hình học, arabesque...)\n"
            "- decoration_technique: Kỹ thuật trang trí (vẽ dưới men, vẽ trên men, khắc chìm/incised, đắp nổi/relief, in khuôn, chạm lộng, sgraffito, underglaze blue, overglaze enamel...)\n"
            "- material: Chất liệu (sứ/porcelain, gốm/stoneware, sành/earthenware, đất nung/terracotta...)\n"
            "- body_color: Màu cốt/xương gốm nếu nhìn thấy được (trắng ngà, xám, nâu đỏ, đen...)\n"
            "- shape: Hình dáng chi tiết (bình, tô, đĩa, lọ, ấm, chén, tượng... kèm đặc điểm: cổ cao/thấp, miệng loe/khum, vai xuôi/phẳng...)\n"
            "- foot_ring: Đặc điểm chân đế nếu nhìn thấy (tròn, vuông, có vết cát dính, vết kê lò, unglazed foot ring, vết cắt dây...)\n"
            "- firing_marks: Vết nung (vết kê lò/kiln spur marks, vết cát/sand marks, vết lửa/fire clouds, vết oxy hóa...)\n"
            "- estimated_era: Niên đại ước lượng càng cụ thể càng tốt\n"
            "- style_hint: Phong cách nghệ thuật nhận diện được\n"
            "- suspected_origin: Ghi rõ quốc gia VÀ tên thương hiệu/lò gốm/dòng gốm CỤ THỂ NHẤT có thể. "
            "Ví dụ: 'Meissen, Đức' hoặc 'Bát Tràng, Việt Nam' hoặc 'Sawankhalok, Thái Lan'. KHÔNG ghi chung chung.\n"
            "- size_estimate: Ước lượng kích thước nếu có thể (nhỏ/vừa/lên, hoặc cm)\n"
            "- condition: Tình trạng bảo quản (nguyên vẹn, có nứt, sứt mẻ, phục chế...)\n\n"
            "LƯU Ý ĐẶC BIỆT: Cần đánh giá bao quát cả GỐM VIỆT NAM và GỐM THẾ GIỚI, KHÔNG ĐƯỢC ép buộc một vật phẩm vào gốm Việt Nam nếu nó thuộc về nền văn hóa khác. "
            "Hãy đánh giá khách quan dựa trên MỌI chi tiết thị giác nhỏ nhất, tuyệt đối không thiên vị."
        )

        last_error = None

        for model_id in self.models:
            # Refresh client with active key from rotator
            current_key = key_rotator.get_key("google")
            if not current_key:
                return {"error": "GOOGLE_API_KEY missing during model evaluation"}
            client = google_genai.Client(api_key=current_key)
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
                    logger.warning(f"[VisionAgent] Rate limited on {model_id} — rotating key and trying next model...")
                    key_rotator.rotate_key("google", current_key)
                    continue
                if "503" in error_str or "UNAVAILABLE" in error_str:
                    logger.warning(f"[VisionAgent] Model {model_id} unavailable — trying next model...")
                    continue
                # For auth/API key errors, rotate key before failing
                if any(x in error_str for x in ["API_KEY", "API key", "INVALID_ARGUMENT", "400", "401", "403"]):
                    logger.warning(f"[VisionAgent] Key error detected — rotating key: {error_str[:200]}")
                    key_rotator.rotate_key("google", current_key)
                return {"error": f"Lỗi phân tích hình ảnh: {error_str[:200]}"}

        # All models failed — raise for tenacity retry if it was a rate limit / availability issue
        if last_error:
            error_str = str(last_error)
            if "429" in error_str or "RESOURCE_EXHAUSTED" in error_str or "503" in error_str or "UNAVAILABLE" in error_str:
                logger.warning("[VisionAgent] All models exhausted — will retry with backoff...")
                raise _RateLimitError(error_str) from last_error
        return {"error": "Tất cả model AI đều không khả dụng. Vui lòng thử lại sau."}
