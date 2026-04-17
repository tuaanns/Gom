import asyncio
import logging
import json
from agents.vision_agent import VisionAgent
from agents.specialists import GPTAgent, GrokAgent, GeminiAgent
from agents.base_agent import BaseAgent

logger = logging.getLogger("gom-ai.debate.engine")

class DebateEngine:
    def __init__(self):
        self.vision_agent = VisionAgent()
        self.gpt = GPTAgent()
        self.grok = GrokAgent()
        self.gemini = GeminiAgent()
        self.judge = JudgeAgent()

    async def start_debate(self, image_bytes: bytes) -> dict:
        """
        Orchestrate the multi-agent debate from image analysis to final judge report.
        """
        # Phase 0: Vision Analysis
        try:
            visual_features = await self.vision_agent.analyze(image_bytes)
        except Exception as e:
            error_str = str(e)
            logger.error(f"[DebateEngine] Vision analysis failed after retries: {e}")
            return {"error": "API đã hết quota. Vui lòng thử lại sau vài phút."}
        if "error" in visual_features:
            return {"error": visual_features["error"]}
            
        if visual_features.get("is_pottery") is False:
            return {"error": "Rất tiếc, hệ thống không nhận diện được gốm sứ trong bức ảnh này. Vui lòng thử lại với một bức ảnh khác."}

        # Phase 1: Independent Predictions
        logger.info("[DebateEngine] Starting Phase 1: Independent Predictions")
        results = await asyncio.gather(
            self.gpt.predict(visual_features),
            self.grok.predict(visual_features),
            self.gemini.predict(visual_features)
        )
        # Add basic info and validation if missing
        for i, r in enumerate(results): 
            name = ["GPT", "Grok", "Gemini"][i]
            if not r.get("agent_name"): r["agent_name"] = name
            if r.get("confidence") is None: r["confidence"] = 0.5
            # Ensure 'prediction' key exists to avoid crash in Phase 2
            if "prediction" not in r:
                logger.warning(f"Agent {name} failed to provide 'prediction'. Using fallback.")
                r["prediction"] = {
                    "ceramic_line": "Unknown",
                    "country": "Unknown",
                    "era": "Unknown",
                    "style": "Unknown"
                }
                if "error" in r: r["evidence"] = f"Error: {r['error']}"
                else: r["evidence"] = "Failed to parse AI response."

        # Phase 2: The Debate (Attacks/Defenses) - RUNNING IN PARALLEL
        logger.info("[DebateEngine] Starting Phase 2: Concurrent Debate Round")
        
        debate_tasks = []
        for i, agent in enumerate([self.gpt, self.grok, self.gemini]):
            me = results[i]
            others = [results[j] for j in range(3) if j != i]
            debate_tasks.append(agent.debate(me, others))
        
        # All agents think at the same time
        debates = await asyncio.gather(*debate_tasks)

        # Apply confidence adjustments from debate
        for i, d in enumerate(debates):
            if not isinstance(d, dict) or "error" in d:
                results[i]["debate_details"] = d if isinstance(d, dict) else {"error": "Invalid debate result"}
                continue
            adj = d.get("confidence_adjustment", 0)
            # Clip between -0.2 and 0.2
            try:
                adj = max(-0.2, min(0.2, float(adj or 0)))
            except (ValueError, TypeError):
                adj = 0
            results[i]["confidence"] = max(0.0, min(1.0, results[i]["confidence"] + adj))
            results[i]["debate_details"] = d

        # Phase 3: Final Judging
        logger.info("[DebateEngine] Starting Phase 3: Judging")
        final_report = await self.judge.evaluate(results, visual_features)

        return {
            "visual_features": visual_features,
            "agent_predictions": results,
            "final_report": final_report
        }

class JudgeAgent(BaseAgent):
    def __init__(self):
        super().__init__(
            name="Final Judge",
            personality="A neutral, expert arbiter who weighs all evidence and logic. Synthesizes discordant views into a single authoritative conclusion.",
            provider="groq",
            model_id="llama-3.3-70b-versatile"
        )

    async def evaluate(self, predictions: list, visual_features: dict) -> dict:
        """
        Final synthesis and reasoning.
        """
        prompt = (
            f"You are the 'Final Judge'. Personality: {self.personality}\n"
            f"Visual features: {json.dumps(visual_features, indent=2)}\n\n"
            f"Agent predictions and their debate outputs:\n{json.dumps(predictions, indent=2)}\n\n"
            "TASK: Synthesize the final prediction in Vietnamese. You must be HIGHLY CRITICAL AND ANALYTICAL.\n"
            "IMPORTANT RULES:\n"
            "1. DO NOT just vote by majority. Cross-examine the 'visual_features' against the agents' claims. If an agent's claim contradicts the visual evidence, you MUST overrule them.\n"
            "2. AVOID TYPICAL AI CONFUSION between Vietnamese and Chinese/Global ceramics. Explicitly verify differentiating signs: Is the brushwork precise (Global) or rustic/free (Vietnamese)? Is the body eggshell thin (Chinese porcelain) or thick and robust (Vietnamese)? Does the base show Chinese refinement or Vietnamese craftsmanship (e.g. chocolate bottom)? Base your conclusion strictly on these physical facts, not just agent confidence.\n"
            "3. Prioritize concrete visual facts (colors, industrial symmetry vs handmade asymmetry, specific cultural motifs, presence of gold gilding, bone china vs raw clay, etc.) over an agent's self-reported high confidence.\n"
            "4. In your 'reasoning', explicitly point out WHY you chose the final result and WHY the other agents were incorrect or misled.\n"
            "Write the reasoning and summary in Vietnamese with full diacritics.\n\n"
            "Return ONLY JSON in this format:\n"
            "{\n"
            "  \"final_prediction\": \"... (TÊN DÒNG GỐM TIẾNG VIỆT) ...\",\n"
            "  \"final_country\": \"... (TÊN QUỐC GIA) ...\",\n"
            "  \"final_era\": \"... (NIÊN ĐẠI) ...\",\n"
            "  \"certainty\": 0-100,\n"
            "  \"reasoning\": \"... (LẬP LUẬN TỔNG HỢP - TIẾNG VIỆT) ...\",\n"
            "  \"debate_summary\": \"... (TÓM TẮT QUÁ TRÌNH TRANH BIỆN - TIẾNG VIỆT) ...\"\n"
            "}"
        )
        raw_resp = await self._call_llm(prompt)
        return self._extract_json(raw_resp)
