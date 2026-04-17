import json
import logging
import re
import os
import httpx
from openai import AsyncOpenAI
import tenacity
from tenacity import retry, wait_exponential, stop_after_attempt, retry_if_exception_type

logger = logging.getLogger("gom-ai.agents.base")

class BaseAgent:
    def __init__(self, name: str, personality: str, provider: str, model_id: str):
        self.name = name
        self.personality = personality
        self.provider = provider
        self.model_id = model_id
        self.api_key = self.get_api_key(provider)

    def get_api_key(self, provider: str):
        if provider == "google": return os.getenv("GOOGLE_API_KEY")
        if provider == "groq": return os.getenv("GROQ_API_KEY")
        if provider == "openai": return os.getenv("OPENAI_API_KEY")
        return None

    def _extract_json(self, text: str) -> dict:
        """
        Extract JSON from LLM response reliably, handling weird formatting.
        """
        if not text: return {"error": "Empty response"}
        
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
    async def _call_llm(self, prompt: str) -> str:
        """
        Call the appropriate provider.
        """
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
                raise e

        elif self.provider in ["groq", "openai"]:
            base_url = "https://api.groq.com/openai/v1" if self.provider == "groq" else None
            async with AsyncOpenAI(api_key=self.api_key, base_url=base_url) as client:
                try:
                    resp = await client.chat.completions.create(
                        model=self.model_id,
                        messages=[{"role": "user", "content": prompt}],
                        temperature=0.7,
                    )
                    return resp.choices[0].message.content or ""
                except Exception as e:
                    logger.error(f"[{self.name}] Openai/Groq Error: {e}")
                    raise e

        return ""

    async def predict(self, visual_features: dict) -> dict:
        """
        Phase 1: Initial prediction based on visual evidence.
        """
        prompt = (
            f"You are the '{self.name}'. Personality: {self.personality}\n"
            f"Based on the following visual evidence:\n{json.dumps(visual_features, indent=2)}\n\n"
            "Predict the ceramic line, country, era, and style. Provide evidence and list visual clues used.\n"
            "CRITICAL DOMAIN KNOWLEDGE: You must balance your expertise perfectly between TWO major groups:\n"
            "1. VIETNAMESE CERAMICS: Notice the robust thicker clay body, slightly imperfect/rustic wheel marks, free-flowing and spirited brushwork, heavier bases, 'chocolate' bottoms (Chu Đậu), crackle glazes (Bát Tràng), and folk motifs.\n"
            "2. GLOBAL CERAMICS: Notice the fine, thin porcelain of Jingdezhen (China), mathematically precise brushwork, flawless clear glazes, bright Ming blue, smooth unglazed bases, Japanese Imari's neat polychrome, or exact European symmetry.\n"
            "CRUCIAL INSTRUCTION TO AVOID CONFUSION: DO NOT confuse them! Look for the defining technical traits. If the brushwork is free flowing and rustic with dark cobalt on a thicker body, lean Vietnamese. If it's razor-sharp, fine porcelain with ultra-thin walls, lean Chinese/Global. Do not force a Vietnamese prediction if it is clearly global, and vice versa. Always evaluate the clay base (trôn gốm), glaze texture, and brush control.\n"
            "IMPORTANT: Response must be in Vietnamese with full diacritics.\n\n"
            "Return ONLY JSON in this format:\n"
            "{\n"
            "  \"agent_name\": \"...\",\n"
            "  \"prediction\": {\n"
            "    \"ceramic_line\": \"... (TÊN DÒNG GỐM, LÒ GỐM HOẶC THƯƠNG HIỆU CỤ THỂ BẰNG ĐỊA PHƯƠNG/TIẾNG VIỆT. VD: Meissen, Wedgwood, Royal Albert, Bát Tràng, Chu Đậu, Cảnh Đức Trấn... TUYỆT ĐỐI KHÔNG DÙNG TỪ CHUNG CHUNG như 'Gốm Châu Âu' hay 'Gốm Châu Á') ...\",\n"
            "    \"country\": \"... (TÊN QUỐC GIA BẰNG TIẾNG VIỆT) ...\",\n"
            "    \"era\": \"... (NIÊN ĐẠI BẰNG TIẾNG VIỆT) ...\",\n"
            "    \"style\": \"... (PHONG CÁCH BẰNG TIẾNG VIỆT) ...\"\n"
            "  },\n"
            "  \"confidence\": 0.0-1.0,\n"
            "  \"evidence\": \"... (BẰNG CHỨNG BẰNG TIẾNG VIỆT) ...\",\n"
            "  \"visual_clues_used\": [\"...\", \"...\"]\n"
            "}"
        )
        raw_resp = await self._call_llm(prompt)
        return self._extract_json(raw_resp)

    async def debate(self, my_prediction: dict, other_predictions: list) -> dict:
        """
        Phase 2: Criticize others and defend self.
        """
        other_data = "\n\n".join([f"Agent {p.get('agent_name', 'Unknown')} said: {json.dumps(p.get('prediction', {}))} (Conf: {p.get('confidence', 0.5)})" for p in other_predictions])
        
        prompt = (
            f"You are the '{self.name}'. Personality: {self.personality}\n"
            f"Your previous prediction was: {json.dumps(my_prediction.get('prediction', {}))}\n\n"
            f"Others' predictions:\n{other_data}\n\n"
            "TASK: Re-evaluate everything in Vietnamese. Criticize others' flaws and defend your position. "
            "Write in Vietnamese with full diacritics.\n\n"
            "Return JSON in this format:\n"
            "{\n"
            "  \"attacks\": [\"(Lý do tại sao X sai - bằng tiếng Việt)\", \"(Lý do tại sao Y sai - bằng tiếng Việt)\"],\n"
            "  \"defense\": \"Tại sao quan điểm của bạn vẫn đúng hoặc cách bạn điều chỉnh (tiếng Việt)\",\n"
            "  \"confidence_adjustment\": -0.2 to 0.2\n"
            "}"
        )
        raw_resp = await self._call_llm(prompt)
        return self._extract_json(raw_resp)
