import json
import logging
import os
import re
import threading

from openai import AsyncOpenAI
from tenacity import retry, stop_after_attempt, wait_exponential

logger = logging.getLogger("gom-ai.agents.base")


class APIKeyRotator:
    def __init__(self):
        self._indices = {"google": 0, "groq": 0, "openai": 0, "deepseek": 0}
        self._lock = threading.Lock()

    def _get_all_keys(self, provider: str) -> list[str]:
        env_name = f"{provider.upper()}_API_KEY"
        raw_value = os.getenv(env_name, "")
        keys_list = []
        
        # 1. Comma-separated
        if raw_value:
            parts = [p.strip() for p in raw_value.split(",") if p.strip()]
            keys_list.extend(parts)
            
        # 2. Numbered suffixes
        i = 1
        while True:
            suffixed_val = os.getenv(f"{env_name}_{i}", "") or os.getenv(f"{env_name}{i}", "")
            if not suffixed_val:
                break
            val = suffixed_val.strip()
            if val and val not in keys_list:
                keys_list.append(val)
            i += 1
            
        return keys_list

    def get_key(self, provider: str) -> str | None:
        with self._lock:
            keys = self._get_all_keys(provider)
            if not keys:
                return None
            idx = self._indices.get(provider, 0)
            if idx >= len(keys):
                idx = 0
                self._indices[provider] = 0
            return keys[idx]

    def rotate_key(self, provider: str, failed_key: str):
        with self._lock:
            keys = self._get_all_keys(provider)
            if not keys:
                return
            
            idx = self._indices.get(provider, 0)
            if idx >= len(keys):
                idx = 0
                self._indices[provider] = 0
                
            # If the current key is the failed key, rotate to next
            if keys[idx] == failed_key:
                new_idx = (idx + 1) % len(keys)
                self._indices[provider] = new_idx
                masked_old = failed_key[:10] + "..." if len(failed_key) > 10 else "key"
                new_key = keys[new_idx]
                masked_new = new_key[:10] + "..." if len(new_key) > 10 else "key"
                logger.warning(
                    f"[KeyRotator] Key for provider '{provider}' failed ({masked_old}). "
                    f"Rotated to next key index {new_idx} ({masked_new})."
                )


key_rotator = APIKeyRotator()


class BaseAgent:
    def __init__(self, name: str, personality: str, provider: str, model_id: str):
        self.name = name
        self.personality = personality
        self.provider = provider
        self.model_id = model_id
        self.api_key = self.get_api_key(provider)

    def get_api_key(self, provider: str):
        return key_rotator.get_key(provider)

    # Extract JSON from LLM response, handling various formatting quirks
    def _extract_json(self, text: str) -> dict:
        if not text:
            return {"error": "Empty response"}

        try:
            # 1. Look for JSON between ```json and ```
            match = re.search(r"```(?:json)?\s*(.*?)\s*```", text, re.DOTALL)
            if match:
                raw_json = match.group(1).strip()
            # 2. Look for any curly braces { ... }
            else:
                match = re.search(r"(\{.*\})", text, re.DOTALL)
                raw_json = match.group(1).strip() if match else text.strip()

            # Cleanup potential trailing/leading garbage
            return json.loads(raw_json)

        except Exception as e:
            logger.warning(f"[{self.name}] JSON extract failed ({e}). Text: {text[:200]}...")
            # Emergency attempt: what if it is directly JSON but has extra lines?
            try:
                # Find first { and last }
                start = text.find("{")
                end = text.rfind("}") + 1
                if start != -1 and end != 0:
                    return json.loads(text[start:end])
            except: pass
            return {"error": f"JSON Parse Error: {str(e)}", "raw_text": text}

    @retry(
        wait=wait_exponential(multiplier=1, min=4, max=10),
        stop=stop_after_attempt(3),
        reraise=True
    )
    # Call the appropriate LLM provider (Google Gemini, Groq, OpenAI, or DeepSeek)
    async def _call_llm(self, prompt: str) -> str:
        self.api_key = self.get_api_key(self.provider)
        if not self.api_key:
            return f"{{\"error\": \"API Key missing for {self.provider}\"}}"

        if self.provider == "google":
            from google import genai as google_genai
            from google.genai import types as genai_types
            try:
                client = google_genai.Client(api_key=self.api_key)
                response = await client.aio.models.generate_content(
                    model=self.model_id,
                    contents=[genai_types.Part.from_text(text=prompt)],
                )
                return response.text or ""
            except Exception as e:
                logger.error(f"[{self.name}] Gemini Error: {e}")
                key_rotator.rotate_key(self.provider, self.api_key)
                
                # Fallback to Groq if key is available
                groq_key = self.get_api_key("groq")
                if groq_key:
                    fallback_model = "llama-3.3-70b-versatile"
                    logger.info(f"[{self.name}] Gemini failed. Falling back to Groq ({fallback_model})...")
                    try:
                        base_url = "https://api.groq.com/openai/v1"
                        async with AsyncOpenAI(api_key=groq_key, base_url=base_url) as client_g:
                            resp = await client_g.chat.completions.create(
                                model=fallback_model,
                                messages=[{"role": "user", "content": prompt}],
                                temperature=0.3,
                            )
                            return resp.choices[0].message.content or ""
                    except Exception as groq_err:
                        logger.error(f"[{self.name}] Groq fallback failed: {groq_err}")
                        key_rotator.rotate_key("groq", groq_key)
                        raise e
                else:
                    raise e

        elif self.provider in ["groq", "openai", "deepseek"]:
            base_urls = {
                "groq": "https://api.groq.com/openai/v1",
                "deepseek": "https://api.deepseek.com",
            }
            base_url = base_urls.get(self.provider)  # None for openai (uses default)
            async with AsyncOpenAI(api_key=self.api_key, base_url=base_url) as client:
                try:
                    resp = await client.chat.completions.create(
                        model=self.model_id,
                        messages=[{"role": "user", "content": prompt}],
                        temperature=0.3,
                    )
                    return resp.choices[0].message.content or ""
                except Exception as e:
                    logger.error(f"[{self.name}] {self.provider.capitalize()} Error: {e}")
                    key_rotator.rotate_key(self.provider, self.api_key)
                    
                    # Try fallback to google gemini if key is available
                    google_key = self.get_api_key("google")
                    if google_key:
                        fallback_model = "gemini-2.5-flash"
                        logger.info(f"[{self.name}] {self.provider.capitalize()} failed. Falling back to Gemini ({fallback_model})...")
                        try:
                            from google import genai as google_genai
                            from google.genai import types as genai_types
                            client_g = google_genai.Client(api_key=google_key)
                            response = await client_g.aio.models.generate_content(
                                model=fallback_model,
                                contents=[genai_types.Part.from_text(text=prompt)],
                            )
                            return response.text or ""
                        except Exception as gemini_err:
                            logger.error(f"[{self.name}] Gemini fallback failed: {gemini_err}")
                            key_rotator.rotate_key("google", google_key)
                            raise e
                    else:
                        raise e

        return ""

    # Phase 1: Initial prediction based on visual evidence (FALLBACK — specialists override this)
    async def predict(self, visual_features: dict) -> dict:
        prompt = (
            f"You are the '{self.name}'. Personality: {self.personality}\n"
            f"Based on the following visual evidence:\n{json.dumps(visual_features, indent=2, ensure_ascii=False)}\n\n"
            "CRITICAL: You MUST identify the SPECIFIC ceramic line, kiln, or brand name.\n"
            "DANH SÁCH DÒNG GỐM CỤ THỂ ĐỂ THAM KHẢO:\n"
            "- Việt Nam: Bát Tràng, Chu Đậu, Phù Lãng, Bàu Trúc, Biên Hòa, Lái Thiêu, Thổ Hà, Thanh Hà, Cây Mai\n"
            "- Trung Quốc: Cảnh Đức Trấn, Longquan, Yixing, Dehua, Cizhou, Jun, Ge, Ding, Ru\n"
            "- Nhật Bản: Arita/Imari, Satsuma, Raku, Kutani, Hagi, Bizen, Mashiko, Shigaraki\n"
            "- Hàn Quốc: Goryeo celadon, Buncheong, Joseon white porcelain\n"
            "- Châu Âu: Meissen, Sèvres, Wedgwood, Royal Copenhagen, Delftware, Majolica\n"
            "- Trung Đông: Iznik, Kashi, Lusterware\n"
            "- Châu Mỹ: Barro Negro, Mata Ortiz, Pueblo pottery\n\n"
            "⚠️ TUYỆT ĐỐI KHÔNG dùng tên chung chung như 'Gốm men nâu truyền thống Việt Nam', 'Gốm Châu Á', 'Gốm cổ'. "
            "PHẢI đưa ra tên lò gốm hoặc dòng gốm CỤ THỂ.\n"
            "⚠️ KHÔNG mặc định là gốm Việt Nam. Đánh giá TẤT CẢ khả năng toàn cầu.\n\n"
            "IMPORTANT: Response must be in Vietnamese with full diacritics.\n\n"
            "Return ONLY JSON:\n"
            "{\n"
            "  \"agent_name\": \"...\",\n"
            "  \"prediction\": {\n"
            "    \"ceramic_line\": \"(TÊN DÒNG GỐM CỤ THỂ — VD: Gốm Phù Lãng, Gốm Bát Tràng, Satsuma, Meissen)\",\n"
            "    \"country\": \"(TÊN QUỐC GIA)\",\n"
            "    \"era\": \"(NIÊN ĐẠI CỤ THỂ)\",\n"
            "    \"style\": \"(PHONG CÁCH)\"\n"
            "  },\n"
            "  \"confidence\": 0.0-1.0,\n"
            "  \"evidence\": \"(BẰNG CHỨNG chi tiết)\",\n"
            "  \"visual_clues_used\": [\"...\", \"...\"]\n"
            "}"
        )
        raw_resp = await self._call_llm(prompt)
        return self._extract_json(raw_resp)

    # Phase 2: Debate — each agent argues from their specialized perspective
    async def debate(self, my_prediction: dict, other_predictions: list, lens_results: list = None, lang: str = "vi") -> dict:
        other_data = "\n\n".join([
            f"Agent '{p.get('agent_name', 'Unknown')}' predicted: {json.dumps(p.get('prediction', {}), ensure_ascii=False)}\n"
            f"  Evidence: {p.get('evidence', 'N/A')}\n"
            f"  Confidence: {p.get('confidence', 0.5)}"
            for p in other_predictions
        ])

        lens_context = ""
        if lens_results:
            lens_context = (
                "Google Lens visual search matched these web pages for this image:\n"
                + "\n".join([f"- {r['title']} (URL: {r['url']})" for r in lens_results])
                + "\nUse these search results to verify claims, resolve conflicts, and guide the debate.\n\n"
            )

        is_en = lang == "en"
        lang_instruction = "IMPORTANT: Response must be entirely in English." if is_en else "IMPORTANT: Response must be entirely in Vietnamese with full diacritics."

        attacks_placeholder = "(\"Specific attack against Agent X — pointing out where they are WRONG based on your expertise\")" if is_en else "(\"Phản bác cụ thể Agent X — chỉ ra SAI ở đâu dựa trên chuyên môn của bạn\")"
        defense_placeholder = "(\"Defend your position with specific visual evidence\")" if is_en else "(\"Bảo vệ quan điểm của bạn với bằng chứng thị giác cụ thể\")"
        revised_placeholder = "(\"Specific ceramic line name after debate — can keep the original or change it\")" if is_en else "(\"Tên dòng gốm CỤ THỂ sau tranh biện — có thể giữ nguyên hoặc thay đổi\")"

        prompt = (
            f"You are '{self.name}'. Personality: {self.personality}\n"
            f"Your prediction was: {json.dumps(my_prediction.get('prediction', {}), ensure_ascii=False)}\n"
            f"Your evidence was: {my_prediction.get('evidence', 'N/A')}\n\n"
            f"{lens_context}"
            f"Other agents' predictions:\n{other_data}\n\n"
            "TASK: Re-evaluate from YOUR specialized perspective. You MUST:\n"
            "1. Point out SPECIFIC factual errors in other agents' reasoning using YOUR area of expertise.\n"
            "   For example, if you are the Kiln expert and another agent said 'Gốm Bát Tràng' but the glaze is eel-skin (men da lươn), "
            "point out that eel-skin glaze is characteristic of Phù Lãng, NOT Bát Tràng.\n"
            "2. Defend YOUR prediction with concrete visual evidence from the image.\n"
            "3. If another agent's argument is convincing, you MAY adjust your position — but explain WHY.\n\n"
            f"{lang_instruction}\n\n"
            "Return JSON:\n"
            "{\n"
            f"  \"attacks\": [{attacks_placeholder}, ...],\n"
            f"  \"defense\": {defense_placeholder},\n"
            f"  \"revised_ceramic_line\": {revised_placeholder},\n"
            "  \"confidence_adjustment\": -0.2 to 0.2\n"
            "}"
        )
        raw_resp = await self._call_llm(prompt)
        return self._extract_json(raw_resp)
