import asyncio
import json
import logging

try:
    from app.agents.base_agent import BaseAgent
    from app.agents.specialists import GPTAgent, GrokAgent, GeminiAgent
    from app.agents.vision_agent import VisionAgent
except ModuleNotFoundError:
    from agents.base_agent import BaseAgent
    from agents.specialists import GPTAgent, GrokAgent, GeminiAgent
    from agents.vision_agent import VisionAgent

logger = logging.getLogger("gom-ai.debate.engine")


class DebateEngine:
    def __init__(self):
        self.vision_agent = VisionAgent()
        self.gpt = GPTAgent()
        self.grok = GrokAgent()
        self.gemini = GeminiAgent()
        self.judge = JudgeAgent()
        self.chat = BaseAgent(
            name="Chatbot",
            personality="A helpful ceramic support assistant.",
            provider="groq",
            model_id="llama-3.3-70b-versatile",
        )

    def configure_runtime(self, config: dict) -> None:
        models = [m for m in config.get("models", []) if m.get("is_active", True)]

        vision_models = [
            m["id"] for m in models
            if m.get("role") == "vision" and m.get("provider") == "google" and m.get("id")
        ]
        if vision_models:
            self.vision_agent.configure(vision_models)
        else:
            self.vision_agent.configure()

        by_role = {m.get("role"): m for m in models if m.get("id") and m.get("provider")}
        default_text = by_role.get("agent_text") or next(
            (m for m in models if m.get("role") != "vision" and m.get("provider") in {"groq", "openai"}),
            None,
        )

        role_targets = {
            "historian": self.gpt,
            "kiln": self.grok,
            "global": self.gemini,
            "judge": self.judge,
            "chat": self.chat,
        }
        for role, agent in role_targets.items():
            model = by_role.get(role) or default_text
            if model:
                agent.provider = model["provider"]
                agent.model_id = model["id"]
                agent.api_key = agent.get_api_key(agent.provider)

    # Orchestrate the full multi-agent debate pipeline: vision → predict → debate → judge + Google Lens in parallel
    async def start_debate(self, image_bytes: bytes, lang: str = "vi") -> dict:
        # Initialize temporary file variables for parallel Google Lens search
        import uuid
        import os

        os.makedirs("uploads", exist_ok=True)
        temp_image_path = os.path.join("uploads", f"debate_temp_{uuid.uuid4().hex}.jpg")

        try:
            with open(temp_image_path, "wb") as f:
                f.write(image_bytes)
        except Exception as e:
            logger.error(f"[DebateEngine] Failed to write temporary file for Lens: {e}")
            temp_image_path = None

        # Start Google Lens search concurrently in a background thread if temp file was successfully created
        lens_task = None
        if temp_image_path:
            from app.google_lens_service import search_google_lens

            async def run_lens_async(img_path: str):
                try:
                    logger.info("[DebateEngine] Google Lens search started in background thread")
                    # run search_google_lens concurrently in a separate OS thread to avoid blocking FastAPI
                    return await asyncio.to_thread(search_google_lens, os.path.abspath(img_path), 15)
                except Exception as ex:
                    logger.error(f"[DebateEngine] Google Lens background task error: {ex}")
                    return []

            lens_task = asyncio.create_task(run_lens_async(temp_image_path))

        # Phase 0: Vision Analysis
        try:
            visual_features = await self.vision_agent.analyze(image_bytes)
        except Exception as e:
            error_str = str(e)
            logger.error(f"[DebateEngine] Vision analysis failed after retries: {e}")
            # Cancel lens task if running
            if lens_task:
                lens_task.cancel()
            return {"error": "API đã hết quota. Vui lòng thử lại sau vài phút."}

        if "error" in visual_features:
            if lens_task:
                lens_task.cancel()
            return {"error": visual_features["error"]}

        # If it is not pottery, cancel the background Lens task and clean up immediately
        if visual_features.get("is_pottery") is False:
            if lens_task:
                lens_task.cancel()
                logger.info("[DebateEngine] Canceled background Google Lens search because image does not contain pottery")

            # Clean up the temporary file immediately
            if temp_image_path and os.path.exists(temp_image_path):
                try:
                    os.remove(temp_image_path)
                except Exception as e:
                    logger.warning(f"[DebateEngine] Could not delete temp file: {e}")

            error_msg = (
                "Sorry, the system could not identify any ceramics in this image. Please try with another photo."
                if lang == "en" else
                "Rất tiếc, hệ thống không nhận diện được gốm sứ trong bức ảnh này. Vui lòng thử lại với một bức ảnh khác."
            )
            return {
                "error": error_msg,
                "is_pottery": False
            }

        lens_results = []
        try:
            # Await the parallel Google Lens task to finish BEFORE starting Phase 1 predictions
            if lens_task:
                try:
                    logger.info("[DebateEngine] Awaiting background Google Lens search to complete...")
                    lens_results = await lens_task
                    logger.info(f"[DebateEngine] Google Lens search completed with {len(lens_results)} results")
                except Exception as e:
                    logger.error(f"[DebateEngine] Error during awaiting Lens background task: {e}")

            # Phase 1: Independent Predictions (injecting lens_results)
            logger.info("[DebateEngine] Starting Phase 1: Independent Predictions with Google Lens results")
            results = await asyncio.gather(
                self.gpt.predict(visual_features, lens_results, lang),
                self.grok.predict(visual_features, lens_results, lang),
                self.gemini.predict(visual_features, lens_results, lang)
            )
            # Add basic info and validation if missing
            for i, r in enumerate(results):
                name = ["Lịch Sử Gốm", "Chuyên gia Chữ ký Lò và Hình thái Gốm", "Chuyên Gia Gốm Toàn Cầu"][i]
                if not r.get("agent_name"):
                    r["agent_name"] = name
                if r.get("confidence") is None:
                    r["confidence"] = 0.5
                # Ensure 'prediction' key exists to avoid crash in Phase 2
                if "prediction" not in r:
                    logger.warning(f"Agent {name} failed to provide 'prediction'. Using fallback.")
                    r["prediction"] = {
                        "ceramic_line": "Unknown",
                        "country": "Unknown",
                        "era": "Unknown",
                        "style": "Unknown"
                    }
                    if "error" in r:
                        r["evidence"] = f"Error: {r['error']}"
                    else:
                        r["evidence"] = "Failed to parse AI response."

            # Phase 2 & 3: The Debate Loop (Attacks/Defenses & Judging)
            MAX_ITER = 2
            iteration = 0
            certainty = 0.0
            final_report = {}

            while certainty < 0.70 and iteration < MAX_ITER:
                logger.info(f"[DebateEngine] Starting Debate Round {iteration + 1}")

                debate_tasks = []
                for i, agent in enumerate([self.gpt, self.grok, self.gemini]):
                    me = results[i]
                    others = [results[j] for j in range(3) if j != i]
                    debate_tasks.append(agent.debate(me, others, lens_results, lang))

                # All agents debate concurrently
                debates = await asyncio.gather(*debate_tasks)

                # Apply confidence adjustments and update predictions from debate
                for i, d in enumerate(debates):
                    if not isinstance(d, dict) or "error" in d:
                        results[i]["debate_details"] = d if isinstance(d, dict) else {"error": "Invalid debate result"}
                        continue

                    adj = d.get("confidence_adjustment", 0)
                    try:
                        adj = max(-0.2, min(0.2, float(adj or 0)))
                    except (ValueError, TypeError):
                        adj = 0
                    results[i]["confidence"] = max(0.0, min(1.0, results[i]["confidence"] + adj))
                    results[i]["debate_details"] = d

                    # Update ceramic line prediction if agent revised its mind
                    revised = d.get("revised_ceramic_line")
                    if revised and isinstance(revised, str) and revised.strip():
                        results[i]["prediction"]["ceramic_line"] = revised.strip()

                # Final Judging for this round (injecting lens_results)
                logger.info(f"[DebateEngine] Judging Debate Round {iteration + 1}")
                final_report = await self.judge.evaluate(results, visual_features, lens_results, lang)

                # Extract certainty from Judge (0-100) and normalize to 0.0-1.0
                try:
                    certainty = float(final_report.get("certainty", 0)) / 100.0
                except (ValueError, TypeError):
                    certainty = 0.5

                iteration += 1

        finally:
            # Clean up the temporary file
            if temp_image_path and os.path.exists(temp_image_path):
                try:
                    os.remove(temp_image_path)
                    logger.info(f"[DebateEngine] Temporary file {temp_image_path} successfully deleted")
                except Exception as e:
                    logger.warning(f"[DebateEngine] Could not delete temp file {temp_image_path}: {e}")

        return {
            "visual_features": visual_features,
            "agent_predictions": results,
            "final_report": final_report,
            "iterations_run": iteration,
            "lens_results": lens_results,
            "lang": lang
        }


class JudgeAgent(BaseAgent):
    def __init__(self):
        super().__init__(
            name="Final Judge",
            personality="A neutral, expert arbiter who weighs all evidence and logic. Synthesizes discordant views into a single authoritative conclusion.",
            provider="groq",
            model_id="llama-3.3-70b-versatile"
        )

    # Phase 3: Final synthesis — weigh all evidence and produce authoritative conclusion
    async def evaluate(self, predictions: list, visual_features: dict, lens_results: list = None, lang: str = "vi") -> dict:
        lens_context = ""
        if lens_results:
            lens_context = (
                "Google Lens visual search matched these web pages for this image (EXTREMELY IMPORTANT source of truth to cross-reference):\n"
                + "\n".join([f"- {r['title']} (URL: {r['url']})" for r in lens_results])
                + "\n\n"
            )

        is_en = lang == "en"

        lang_instruction = (
            "Write entirely in English."
            if is_en else
            "Write entirely in Vietnamese with full diacritics."
        )

        prompt = (
            f"You are the 'Final Judge' — {'The Final Arbiter' if is_en else 'Trọng tài phán quyết cuối cùng'}.\n"
            f"Personality: {self.personality}\n\n"
            f"Visual features extracted from the image:\n{json.dumps(visual_features, indent=2, ensure_ascii=False)}\n\n"
            f"{lens_context}"
            f"Agent predictions and their debate outputs:\n{json.dumps(predictions, indent=2, ensure_ascii=False)}\n\n"
            "YOUR TASK: Synthesize the FINAL prediction. You must be HIGHLY CRITICAL AND ANALYTICAL.\n\n"
            "IMPORTANT RULES:\n"
            "1. DO NOT just vote by majority. Cross-examine the 'visual_features' against each agent's claims. "
            "If an agent claims a ceramic line but the visual evidence contradicts it, you MUST overrule them.\n"
            "2. AVOID BIAS: Do not automatically assume Vietnamese origin. Evaluate globally.\n"
            "3. Prioritize concrete visual facts over an agent's self-reported confidence.\n"
            "4. HIGH INTELLECT LENS INTEGRATION: Google Lens results represent real-world physical image matches (ground truth). "
            "If Google Lens indicates a museum-matched or highly specific catalog identity (e.g., 'Sawankhalok ceramic bowl from Thailand', 'Sukhothai Ware', 'Bao tang Lam Dong', 'Bat Trang antique', etc.), "
            "you MUST strongly favor this identity, provided it is visually plausible. "
            "Do not fall into the trap of confusing lookalikes (e.g., confusing Thai Sawankhalok celadon featuring olive-green glaze and incised lines with Chinese Song Dynasty Yaozhou or Longquan celadon. They look extremely similar, but if Lens points to Sawankhalok/Thailand, prioritize Sawankhalok/Thailand!).\n"
            "5. In your 'reasoning', explicitly explain WHY you chose the final result and WHY others were wrong.\n\n"
            "⚠️ CRITICAL — YOUR 'final_prediction' MUST be a SPECIFIC ceramic line/kiln name:\n"
            "REFERENCE LIST:\n"
            "- VN: Bat Trang, Chu Dau, Phu Lang, Bau Truc, Bien Hoa, Lai Thieu, Tho Ha, Thanh Ha, Cay Mai\n"
            "- CN: Jingdezhen, Longquan, Yixing, Dehua, Cizhou\n"
            "- JP: Arita/Imari, Satsuma, Raku, Kutani, Bizen\n"
            "- KR: Goryeo celadon, Buncheong\n"
            "- SEA: Sawankhalok, Sukhothai, Bencharong\n"
            "- EU: Meissen, Sèvres, Wedgwood, Delftware, Majolica\n"
            "- ME: Iznik\n"
            "- AM: Barro Negro, Mata Ortiz\n\n"
            "⚠️ NEVER use generic terms like 'Traditional brown glaze Vietnamese ceramics', 'Ancient ceramics', 'Traditional pottery'. "
            "MUST be a SPECIFIC kiln/ceramic line name.\n\n"
            f"{lang_instruction}\n\n"
            "Return ONLY JSON:\n"
            "{\n"
            "  \"final_prediction\": \"(SPECIFIC CERAMIC LINE NAME)\",\n"
            "  \"final_country\": \"(COUNTRY NAME)\",\n"
            "  \"final_era\": \"(SPECIFIC ERA)\",\n"
            "  \"certainty\": 0-100,\n"
            "  \"reasoning\": \"(SYNTHESIS REASONING — why this line, why others are wrong)\",\n"
            "  \"debate_summary\": \"(DEBATE SUMMARY among 3 agents)\"\n"
            "}"
        )
        raw_resp = await self._call_llm(prompt)
        return self._extract_json(raw_resp)
