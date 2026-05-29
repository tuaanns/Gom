import json
import logging

try:
    from app.agents.base_agent import BaseAgent
except ModuleNotFoundError:
    from agents.base_agent import BaseAgent

logger = logging.getLogger("gom-ai.agents.specialists")

# All agents use Groq Llama 3.3-70b for text reasoning
# Each agent has a UNIQUE predict() prompt to ensure genuinely different analyses


class GPTAgent(BaseAgent):
    """Agent 1: Ceramic Historian — focuses on historical periods, trade routes, manufacturing evolution."""
    def __init__(self):
        super().__init__(
            name="Lịch Sử Gốm",
            personality="A meticulous ceramic historian specializing in eras, global trade routes, and manufacturing evolution. Very logical and focuses on historical evidence.",
            provider="groq",
            model_id="llama-3.3-70b-versatile",
        )

    async def predict(self, visual_features: dict, lens_results: list = None, lang: str = "vi") -> dict:
        lens_context = ""
        if lens_results:
            lens_context = (
                "Google Lens visual search matched these web pages for this image (VERY IMPORTANT REFERENCE):\n"
                + "\n".join([f"- {r['title']} (URL: {r['url']})" for r in lens_results])
                + "\n\n"
            )

        lang_instruction = "IMPORTANT: Response must be entirely in English." if lang == "en" else "IMPORTANT: Response must be entirely in Vietnamese with full diacritics."

        prompt = (
            f"You are '{self.name}' — a ceramic HISTORIAN.\n"
            f"Your expertise: Dating ceramics by era, identifying trade route influences, and recognizing manufacturing evolution across centuries.\n\n"
            f"Visual evidence from the image:\n{json.dumps(visual_features, indent=2, ensure_ascii=False)}\n\n"
            f"{lens_context}"
            "YOUR UNIQUE ANALYSIS ANGLE — You MUST focus on these historical factors:\n"
            "1. ERA DATING: Based on shape, decoration style, and technique, determine the specific historical period.\n"
            "2. TRADE ROUTE & REGIONAL INFLUENCE: Look for cross-cultural or regional trade influences.\n"
            "3. MANUFACTURING EVOLUTION: Distinguish hand-coiled vs wheel-thrown vs slip-cast.\n"
            "4. REAL-WORLD EVIDENCE HARMONIZATION: Actively analyze the Google Lens context. If Google Lens matches indicate a specific museum artifact or historic ware (such as Sawankhalok from Thailand, Bat Trang antique, Goryeo celadon, etc.), you MUST evaluate its historical possibility. Avoid bias toward over-famous ceramic lines when visual matches strongly point elsewhere (e.g. do not misidentify Thai Sawankhalok celadon with olive-green glaze and incised walls as Song Dynasty Yaozhou celadon if Lens matches Sawankhalok).\n\n"
            "⚠️ CRITICAL: You MUST give a SPECIFIC ceramic line/kiln name (e.g., 'Sawankhalok', 'Yaozhou', 'Bat Trang', 'Longquan', etc.). "
            "NEVER use generic terms. If unsure, give your best specific guess with lower confidence.\n\n"
            "⚠️ DO NOT assume Vietnamese origin. Evaluate ALL global and Southeast Asian possibilities equally.\n\n"
            f"{lang_instruction}\n\n"
            "Return ONLY JSON:\n"
            "{\n"
            "  \"agent_name\": \"" + self.name + "\",\n"
            "  \"prediction\": {\n"
            "    \"ceramic_line\": \"(SPECIFIC CERAMIC LINE/KILN NAME)\",\n"
            "    \"country\": \"(COUNTRY)\",\n"
            "    \"era\": \"(SPECIFIC ERA)\",\n"
            "    \"style\": \"(STYLE)\"\n"
            "  },\n"
            "  \"confidence\": 0.0-1.0,\n"
            "  \"evidence\": \"(DETAILED HISTORICAL ANALYSIS)\",\n"
            "  \"visual_clues_used\": [\"(visual clue 1)\", \"(visual clue 2)\", ...]\n"
            "}"
        )
        raw_resp = await self._call_llm(prompt)
        return self._extract_json(raw_resp)


class GrokAgent(BaseAgent):
    """Agent 2: Kiln Signature & Morphology Expert — focuses on glaze, firing marks, clay body."""
    def __init__(self):
        super().__init__(
            name="Chuyên gia Chữ ký Lò và Hình thái Gốm",
            personality=(
                "A meticulous Kiln Signature & Morphology Expert specializing in 3 core identification factors: "
                "1) Glaze Typology - Reading glazes as the 'fingerprint' of ceramic lines; "
                "2) Kiln Signatures - Identifying firing marks, kiln furniture scars, stacking traces; "
                "3) Ceramic Body Morphology - Analyzing clay color, wall thickness, foot ring shape, and forming technique. "
                "Very methodical and evidence-driven, focuses exclusively on physical material characteristics visible in the image."
            ),
            provider="groq",
            model_id="llama-3.3-70b-versatile",
        )

    async def predict(self, visual_features: dict, lens_results: list = None, lang: str = "vi") -> dict:
        lens_context = ""
        if lens_results:
            lens_context = (
                "Google Lens visual search matched these web pages for this image (VERY IMPORTANT REFERENCE):\n"
                + "\n".join([f"- {r['title']} (URL: {r['url']})" for r in lens_results])
                + "\n\n"
            )

        lang_instruction = "IMPORTANT: Response must be entirely in English." if lang == "en" else "IMPORTANT: Response must be entirely in Vietnamese with full diacritics."

        prompt = (
            f"You are '{self.name}' — a KILN SIGNATURE & MORPHOLOGY expert.\n"
            f"Your expertise: Identifying ceramics by their glaze type, firing marks, and clay body characteristics.\n\n"
            f"Visual evidence from the image:\n{json.dumps(visual_features, indent=2, ensure_ascii=False)}\n\n"
            f"{lens_context}"
            "YOUR UNIQUE ANALYSIS ANGLE — You MUST focus on MATERIAL factors:\n"
            "1. GLAZE TYPOLOGY — the #1 fingerprint of ceramic lines.\n"
            "2. KILN SIGNATURES: firing marks, stacking traces, heat distribution.\n"
            "3. BODY MORPHOLOGY: clay color, wall thickness, foot ring shape, forming technique.\n"
            "4. LENS MATCH CORRELATION: Carefully check the Google Lens results. If the matched titles and descriptions consistently point to a specific ware (like Thai Sawankhalok glaze typologies, which feature thick glassy light green to dark olive-green celadon with fine crazing and dark iron spots/firing scars on the base), analyze whether the physical glaze and foot morphology match that description, rather than assuming it must be a more well-known Chinese counterpart (like Yaozhou or Longquan).\n\n"
            "⚠️ CRITICAL: You MUST give a SPECIFIC ceramic line/kiln name (e.g. 'Sawankhalok', 'Yaozhou', 'Longquan', 'Phu Lang', etc.). "
            "NEVER use generic terms. Based on glaze + body + kiln marks, pin it to a SPECIFIC kiln/line.\n\n"
            "⚠️ DO NOT assume Vietnamese origin. Compare glaze characteristics globally and regionally across Southeast Asia.\n\n"
            f"{lang_instruction}\n\n"
            "Return ONLY JSON:\n"
            "{\n"
            "  \"agent_name\": \"" + self.name + "\",\n"
            "  \"prediction\": {\n"
            "    \"ceramic_line\": \"(SPECIFIC CERAMIC LINE/KILN NAME based on glaze + body analysis)\",\n"
            "    \"country\": \"(COUNTRY)\",\n"
            "    \"era\": \"(ERA)\",\n"
            "    \"style\": \"(STYLE)\"\n"
            "  },\n"
            "  \"confidence\": 0.0-1.0,\n"
            "  \"evidence\": \"(DETAILED MATERIAL ANALYSIS — glaze type, kiln marks, clay body)\",\n"
            "  \"visual_clues_used\": [\"(visual clue 1)\", \"(visual clue 2)\", ...]\n"
            "}"
        )
        raw_resp = await self._call_llm(prompt)
        return self._extract_json(raw_resp)


class GeminiAgent(BaseAgent):
    """Agent 3: Global Ceramics & Cultural Expert — focuses on cultural motifs, symbolism, regional comparison."""
    def __init__(self):
        super().__init__(
            name="Chuyên Gia Gốm Toàn Cầu",
            personality="A specialist in worldwide ceramics, spanning Asian (Vietnamese, Chinese, Japanese), European (Meissen, Delftware, Wedgwood), and Middle Eastern styles. Understands symbolism, global trade routes, local clays, and regional kiln signatures across different continents.",
            provider="groq",
            model_id="llama-3.3-70b-versatile",
        )

    async def predict(self, visual_features: dict, lens_results: list = None, lang: str = "vi") -> dict:
        lens_context = ""
        if lens_results:
            lens_context = (
                "Google Lens visual search matched these web pages for this image (VERY IMPORTANT REFERENCE):\n"
                + "\n".join([f"- {r['title']} (URL: {r['url']})" for r in lens_results])
                + "\n\n"
            )

        lang_instruction = "IMPORTANT: Response must be entirely in English." if lang == "en" else "IMPORTANT: Response must be entirely in Vietnamese with full diacritics."

        prompt = (
            f"You are '{self.name}' — a GLOBAL CERAMICS & CULTURAL expert.\n"
            f"Your expertise: Comparing ceramics across ALL world cultures, reading cultural symbolism, and identifying regional artistic traditions.\n\n"
            f"Visual evidence from the image:\n{json.dumps(visual_features, indent=2, ensure_ascii=False)}\n\n"
            f"{lens_context}"
            "YOUR UNIQUE ANALYSIS ANGLE — You MUST focus on CULTURAL & STYLISTIC factors:\n"
            "1. MOTIFS & CULTURAL SYMBOLISM: dragon claws, flower types, geometric patterns, etc.\n"
            "2. REGIONAL CHARACTERISTICS: identify specific regional ceramic traditions (including Southeast Asian styles like Sawankhalok or Sukhothai from Thailand, Bencharong, etc.).\n"
            "3. CROSS-CONTINENTAL & REGIONAL COMPARISON: Compare with AT LEAST 2 other possible origins (e.g. comparing Thai celadon motifs with Chinese Song/Yuan motifs).\n"
            "4. HIGH-INTELLIGENCE GOOGLE LENS INTEGRATION: Pay extreme attention to Google Lens web page matches. If Google Lens reveals that this specific design/piece belongs to a particular regional culture (e.g. a Sawankhalok fish-motif incised bowl or a specific glaze style), analyze if the motifs and cultural style are characteristic of that specific region. Do not let overrepresented Chinese/Vietnamese categories blindly override specific regional styles found by Lens.\n\n"
            "⚠️ CRITICAL: You MUST give a SPECIFIC ceramic line/kiln name. "
            "NEVER use generic terms. Pin it to the exact kiln/line/brand.\n\n"
            "⚠️ DO NOT assume Vietnamese origin. Evaluate ALL global and Southeast Asian possibilities equally.\n\n"
            f"{lang_instruction}\n\n"
            "Return ONLY JSON:\n"
            "{\n"
            "  \"agent_name\": \"" + self.name + "\",\n"
            "  \"prediction\": {\n"
            "    \"ceramic_line\": \"(SPECIFIC CERAMIC LINE/KILN NAME based on cultural & regional analysis)\",\n"
            "    \"country\": \"(COUNTRY)\",\n"
            "    \"era\": \"(ERA)\",\n"
            "    \"style\": \"(STYLE)\"\n"
            "  },\n"
            "  \"confidence\": 0.0-1.0,\n"
            "  \"evidence\": \"(DETAILED CULTURAL ANALYSIS — motifs, symbolism, regional & international comparison)\",\n"
            "  \"visual_clues_used\": [\"(visual clue 1)\", \"(visual clue 2)\", ...]\n"
            "}"
        )
        raw_resp = await self._call_llm(prompt)
        return self._extract_json(raw_resp)
