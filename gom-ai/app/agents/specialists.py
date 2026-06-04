import json
import logging

try:
    from app.agents.base_agent import BaseAgent
except ModuleNotFoundError:
    from agents.base_agent import BaseAgent

try:
    from app.google_lens_service import analyze_lens_keywords
except ModuleNotFoundError:
    try:
        from google_lens_service import analyze_lens_keywords
    except ModuleNotFoundError:
        def analyze_lens_keywords(lens_results):
            return ""

logger = logging.getLogger("gom-ai.agents.specialists")

# All agents use Groq Llama 3.3-70b for text reasoning
# Each agent has a UNIQUE predict() prompt to ensure genuinely different analyses


class GPTAgent(BaseAgent):
    """Agent 1: Ceramic Historian — focuses on historical periods, trade routes, manufacturing evolution."""
    def __init__(self):
        super().__init__(
            name="Lịch Sử Gốm",
            personality="A meticulous ceramic historian specializing in eras, global trade routes, and manufacturing evolution. Very logical and focuses on historical evidence.",
            provider="openai",
            model_id="gpt-4o-mini",
        )

    async def predict(self, visual_features: dict, lens_results: list = None, lang: str = "vi") -> dict:
        lens_context = ""
        if lens_results:
            signals = analyze_lens_keywords(lens_results)
            lens_context = (
                "Google Lens visual search matched these web pages for this image (reference material to help verify your analysis — NOT a primary source):\n"
                + "\n".join([f"- {r['title']} (URL: {r['url']})" for r in lens_results])
                + "\n\n"
                + signals
            )

        lang_instruction = "IMPORTANT: Response must be entirely in English." if lang == "en" else "IMPORTANT: Response must be entirely in Vietnamese with full diacritics."

        prompt = (
            f"You are '{self.name}' — a ceramic HISTORIAN.\n"
            f"Your expertise: Dating ceramics by era, identifying trade route influences, and recognizing manufacturing evolution across centuries.\n\n"
            f"Visual evidence from the image:\n{json.dumps(visual_features, indent=2, ensure_ascii=False)}\n\n"
            f"{lens_context}"
            "IMPORTANT: You are an INDEPENDENT EXPERT. Analyze the visual evidence FIRST using your own expertise, "
            "then use Google Lens results only as reference material to verify or challenge your initial assessment.\n\n"
            "YOUR UNIQUE ANALYSIS ANGLE — You MUST focus on these historical factors:\n"
            "1. ERA DATING: Based on shape, decoration style, and technique, determine the specific historical period.\n"
            "2. TRADE ROUTE & REGIONAL INFLUENCE: Look for cross-cultural or regional trade influences.\n"
            "3. MANUFACTURING EVOLUTION: Distinguish hand-coiled vs wheel-thrown vs slip-cast.\n"
            "4. CROSS-REFERENCE VERIFICATION: After forming your own expert opinion, check Google Lens results to see if they support or contradict your analysis. If they contradict, explain why you still hold your position or adjust it based on the new evidence.\n\n"
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
            signals = analyze_lens_keywords(lens_results)
            lens_context = (
                "Google Lens visual search matched these web pages for this image (reference material to help verify your analysis — NOT a primary source):\n"
                + "\n".join([f"- {r['title']} (URL: {r['url']})" for r in lens_results])
                + "\n\n"
                + signals
            )

        lang_instruction = "IMPORTANT: Response must be entirely in English." if lang == "en" else "IMPORTANT: Response must be entirely in Vietnamese with full diacritics."

        prompt = (
            f"You are '{self.name}' — a KILN SIGNATURE & MORPHOLOGY expert.\n"
            f"Your expertise: Identifying ceramics by their glaze type, firing marks, and clay body characteristics.\n\n"
            f"Visual evidence from the image:\n{json.dumps(visual_features, indent=2, ensure_ascii=False)}\n\n"
            f"{lens_context}"
            "IMPORTANT: You are an INDEPENDENT EXPERT. Analyze the physical material evidence FIRST using your own expertise, "
            "then use Google Lens results only as reference material to verify or challenge your initial assessment.\n\n"
            "YOUR UNIQUE ANALYSIS ANGLE — You MUST focus on MATERIAL factors:\n"
            "1. GLAZE TYPOLOGY — the #1 fingerprint of ceramic lines. Analyze the glaze independently before checking any references.\n"
            "2. KILN SIGNATURES: firing marks, stacking traces, heat distribution.\n"
            "3. BODY MORPHOLOGY: clay color, wall thickness, foot ring shape, forming technique.\n"
            "4. REFERENCE VERIFICATION: After your own material analysis, check if Google Lens results align with your findings. If they point to a different ware, explain whether the material evidence supports or contradicts the Lens suggestion.\n\n"
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
            provider="google",
            model_id="gemini-2.5-flash",
        )

    async def predict(self, visual_features: dict, lens_results: list = None, lang: str = "vi") -> dict:
        lens_context = ""
        if lens_results:
            signals = analyze_lens_keywords(lens_results)
            lens_context = (
                "Google Lens visual search matched these web pages for this image (reference material to help verify your analysis — NOT a primary source):\n"
                + "\n".join([f"- {r['title']} (URL: {r['url']})" for r in lens_results])
                + "\n\n"
                + signals
            )

        lang_instruction = "IMPORTANT: Response must be entirely in English." if lang == "en" else "IMPORTANT: Response must be entirely in Vietnamese with full diacritics."

        prompt = (
            f"You are '{self.name}' — a GLOBAL CERAMICS & CULTURAL expert.\n"
            f"Your expertise: Comparing ceramics across ALL world cultures, reading cultural symbolism, and identifying regional artistic traditions.\n\n"
            f"Visual evidence from the image:\n{json.dumps(visual_features, indent=2, ensure_ascii=False)}\n\n"
            f"{lens_context}"
            "IMPORTANT: You are an INDEPENDENT EXPERT. Analyze the cultural and stylistic evidence FIRST using your own expertise, "
            "then use Google Lens results only as reference material to verify or challenge your initial assessment.\n\n"
            "YOUR UNIQUE ANALYSIS ANGLE — You MUST focus on CULTURAL & STYLISTIC factors:\n"
            "1. MOTIFS & CULTURAL SYMBOLISM: dragon claws, flower types, geometric patterns, etc.\n"
            "2. REGIONAL CHARACTERISTICS: identify specific regional ceramic traditions (including Southeast Asian styles like Sawankhalok or Sukhothai from Thailand, Bencharong, etc.).\n"
            "3. CROSS-CONTINENTAL & REGIONAL COMPARISON: Compare with AT LEAST 2 other possible origins (e.g. comparing Thai celadon motifs with Chinese Song/Yuan motifs).\n"
            "4. REFERENCE VERIFICATION: After forming your own cultural analysis, check Google Lens results to verify. If Lens points to a specific regional culture, evaluate whether the motifs and cultural style truly match that region based on YOUR expertise. Your analysis should lead, Lens should verify.\n\n"
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
