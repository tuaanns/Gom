import asyncio
import copy
import json
import logging
import time

try:
    from app.agents.base_agent import BaseAgent
    from app.agents.specialists import GPTAgent, GrokAgent, GeminiAgent
    from app.agents.vision_agent import VisionAgent
except ModuleNotFoundError:
    from agents.base_agent import BaseAgent
    from agents.specialists import GPTAgent, GrokAgent, GeminiAgent
    from agents.vision_agent import VisionAgent

try:
    from app.google_lens_service import analyze_lens_keywords
except ModuleNotFoundError:
    try:
        from google_lens_service import analyze_lens_keywords
    except ModuleNotFoundError:
        def analyze_lens_keywords(lens_results):
            return ""

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
    def _agent_error_result(self, agent_name: str, error, lang: str) -> dict:
        message = str(error)
        evidence = (
            f"Agent temporarily unavailable: {message[:220]}"
            if lang == "en" else
            f"Agent tam thoi khong kha dung: {message[:220]}"
        )
        return {
            "agent_name": agent_name,
            "prediction": {
                "ceramic_line": "Unknown",
                "country": "Unknown",
                "era": "Unknown",
                "style": "Unknown",
            },
            "confidence": 0.0,
            "evidence": evidence,
            "error": message,
        }

    def _fallback_final_report(self, results: list[dict], lang: str, error=None) -> dict:
        usable = [
            r for r in results
            if isinstance(r, dict) and "error" not in r and r.get("prediction")
        ]
        best = max(usable, key=lambda r: float(r.get("confidence") or 0), default=None)
        if best:
            prediction = best.get("prediction") or {}
            line = prediction.get("ceramic_line") or "Unknown"
            reasoning = (
                f"The judge model was temporarily unavailable, so the result uses the strongest available agent prediction: {line}."
                if lang == "en" else
                f"Model giam khao tam thoi khong kha dung, nen ket qua dung du doan manh nhat con lai: {line}."
            )
            return {
                "final_prediction": line,
                "certainty": int(float(best.get("confidence") or 0.5) * 100),
                "reasoning": reasoning,
            }

        message = (
            "The AI system is temporarily overloaded. Please try again in a few minutes."
            if lang == "en" else
            "He thong AI dang tam thoi qua tai. Vui long thu lai sau vai phut."
        )
        if error:
            message = f"{message} ({str(error)[:180]})"
        return {"error": message}

    async def start_debate(self, image_bytes: bytes, lang: str = "vi", visual_features: dict = None, is_synthetic: bool = False, target_country: str = None) -> dict:
        # Phase 0: Vision Analysis
        if visual_features is None:
            try:
                visual_features = await self.vision_agent.analyze(image_bytes)
            except Exception as e:
                logger.error(f"[DebateEngine] Vision analysis failed after retries: {e}")
                return {"error": "API đã hết quota. Vui lòng thử lại sau vài phút."}

        if "error" in visual_features:
            return {"error": visual_features["error"]}

        # If it is not pottery, return error immediately
        if visual_features.get("is_pottery") is False:
            error_msg = (
                "Sorry, the system could not identify any ceramics in this image. Please try with another photo."
                if lang == "en" else
                "Rất tiếc, hệ thống không nhận diện được gốm sứ trong bức ảnh này. Vui lòng thử lại với một bức ảnh khác."
            )
            return {
                "error": error_msg,
                "is_pottery": False
            }

        # Initialize temporary file variables for Google Lens search
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

        lens_results = []
        lens_status = {
            "attempted": temp_image_path is not None,
            "count": 0,
            "ok": False,
            "message": "Google Lens was not started",
        }

        try:
            # Phase 1: Independent Predictions (run in parallel with Google Lens)
            logger.info("[DebateEngine] Starting Phase 1: Specialists & Google Lens running in parallel")

            async def timed_prediction(agent):
                started = time.perf_counter()
                try:
                    # Pass None for lens_results since Lens is running in parallel
                    result = await agent.predict(visual_features, None, lang, is_synthetic=is_synthetic, target_country=target_country)
                    return result, time.perf_counter() - started
                except Exception as error:
                    return error, time.perf_counter() - started

            async def run_lens_async(img_path: str):
                nonlocal lens_results, lens_status
                try:
                    logger.info("[DebateEngine] Google Lens search started in parallel with specialists")
                    from app.google_lens_service import search_google_lens
                    res = await asyncio.to_thread(search_google_lens, os.path.abspath(img_path), 15)
                    lens_results = res
                    lens_status = {
                        "attempted": True,
                        "count": len(res),
                        "ok": len(res) > 0,
                        "message": (
                            "Google Lens returned reference sources"
                            if res else
                            "Google Lens ran but returned no reference sources"
                        ),
                    }
                except Exception as ex:
                    logger.error(f"[DebateEngine] Google Lens task error: {ex}")
                    lens_results = []
                    lens_status = {
                        "attempted": True,
                        "count": 0,
                        "ok": False,
                        "message": f"Google Lens failed: {ex}",
                    }

            tasks = [
                timed_prediction(self.gpt),
                timed_prediction(self.grok),
                timed_prediction(self.gemini),
            ]

            if temp_image_path:
                tasks.append(run_lens_async(temp_image_path))
            else:
                async def dummy_lens():
                    pass
                tasks.append(dummy_lens())

            # Gather specialists predictions and Google Lens search
            gathered_results = await asyncio.gather(*tasks)
            phase1_raw = gathered_results[0:3]

            if lang == "en":
                agent_names = ["Ceramic History", "Kiln Signatures & Morphology Expert", "Global Ceramics Expert"]
            else:
                agent_names = ["Lịch Sử Gốm", "Chuyên gia Chữ ký Lò và Hình thái Gốm", "Chuyên Gia Gốm Toàn Cầu"]
            
            results = []
            initial_agent_latencies = []
            for i, timed_item in enumerate(phase1_raw):
                item, latency = timed_item
                initial_agent_latencies.append(round(latency, 3))
                if isinstance(item, Exception):
                    logger.error(f"[DebateEngine] Agent {agent_names[i]} failed during Phase 1: {item}")
                    results.append(self._agent_error_result(agent_names[i], item, lang))
                elif isinstance(item, dict):
                    results.append(item)
                else:
                    results.append(self._agent_error_result(agent_names[i], "Invalid agent response", lang))

            if all(isinstance(r, dict) and "error" in r for r in results):
                final_report = self._fallback_final_report(results, lang, results[0].get("error"))
                return {
                    "visual_features": visual_features,
                    "agent_predictions": results,
                    "final_report": final_report,
                    "iterations_run": 0,
                    "lens_results": lens_results,
                    "lens_status": lens_status,
                    "lang": lang,
                    "error": final_report.get("error"),
                }
            
            # Map of agent names for robust localization
            name_mapping_en = {
                "Lịch Sử Gốm": "Ceramic History",
                "Chuyên gia Chữ ký Lò và Hình thái Gốm": "Kiln Signatures & Morphology Expert",
                "Chuyên Gia Gốm Toàn Cầu": "Global Ceramics Expert",
                "Ceramic History": "Ceramic History",
                "Kiln Signature and Ceramic Morphology Expert": "Kiln Signatures & Morphology Expert",
                "Kiln Signatures & Morphology Expert": "Kiln Signatures & Morphology Expert",
                "Global Ceramics Expert": "Global Ceramics Expert"
            }
            name_mapping_vi = {
                "Ceramic History": "Lịch Sử Gốm",
                "Kiln Signature and Ceramic Morphology Expert": "Chuyên gia Chữ ký Lò và Hình thái Gốm",
                "Kiln Signatures & Morphology Expert": "Chuyên gia Chữ ký Lò và Hình thái Gốm",
                "Global Ceramics Expert": "Chuyên Gia Gốm Toàn Cầu",
                "Lịch Sử Gốm": "Lịch Sử Gốm",
                "Chuyên gia Chữ ký Lò và Hình thái Gốm": "Chuyên gia Chữ ký Lò và Hình thái Gốm",
                "Chuyên Gia Gốm Toàn Cầu": "Chuyên Gia Gốm Toàn Cầu"
            }

            # Add basic info and validation if missing
            for i, r in enumerate(results):
                curr_name = r.get("agent_name") or agent_names[i]
                if lang == "en":
                    r["agent_name"] = name_mapping_en.get(curr_name, agent_names[i])
                else:
                    r["agent_name"] = name_mapping_vi.get(curr_name, agent_names[i])
                if r.get("confidence") is None:
                    r["confidence"] = 0.5
                # Ensure 'prediction' key exists to avoid crash in Phase 2
                if "prediction" not in r:
                    logger.warning(f"Agent {curr_name} failed to provide 'prediction'. Using fallback.")
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

            initial_agent_predictions = copy.deepcopy(results)

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
                debates = await asyncio.gather(*debate_tasks, return_exceptions=True)

                # Apply confidence adjustments and update predictions from debate
                for i, d in enumerate(debates):
                    if isinstance(d, Exception):
                        results[i]["debate_details"] = {"error": str(d)}
                        continue
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
                try:
                    final_report = await self.judge.evaluate(results, visual_features, lens_results, lang, is_synthetic=is_synthetic, target_country=target_country)
                except Exception as e:
                    logger.error(f"[DebateEngine] Judge failed during round {iteration + 1}: {e}")
                    final_report = self._fallback_final_report(results, lang, e)

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
            "initial_agent_predictions": initial_agent_predictions,
            "initial_agent_latencies": initial_agent_latencies,
            "agent_predictions": results,
            "final_report": final_report,
            "iterations_run": iteration,
            "lens_results": lens_results,
            "lens_status": lens_status,
            "lang": lang
        }


class JudgeAgent(BaseAgent):
    def __init__(self):
        super().__init__(
            name="Final Judge",
            personality="A neutral, expert arbiter who weighs all evidence and logic. Synthesizes discordant views into a single authoritative conclusion.",
            provider="openai",
            model_id="gpt-4o"
        )

    # Phase 3: Final synthesis — weigh all evidence and produce authoritative conclusion
    async def evaluate(self, predictions: list, visual_features: dict, lens_results: list = None, lang: str = "vi", is_synthetic: bool = False, target_country: str = None) -> dict:
        lens_context = ""
        if lens_results:
            signals = analyze_lens_keywords(lens_results)
            lens_context = (
                "Google Lens visual search matched these web pages for this image (reference material for verification — use to fact-check agent claims, NOT as primary evidence):\n"
                + "\n".join([f"- {r['title']} (URL: {r['url']})" for r in lens_results])
                + "\n\n"
                + signals
                + "\n\n"
            )

        is_en = lang == "en"

        lang_instruction = (
            "Write entirely in English."
            if is_en else
            "Write entirely in Vietnamese with full diacritics."
        )

        synthetic_hint = ""
        if is_synthetic:
            target_country_text = f" representing a ceramic tradition from '{target_country}'" if target_country else ""
            vietnamese_guide = (
                "\nGUIDE TO IDENTIFY VIETNAMESE CERAMIC LINES:\n"
                "- 'Bat Trang': Fine GLAZED white clay porcelain or stoneware. Uses crackle glaze (men rạn), cobalt underglaze blue (men lam), copper green, or ivory-white glaze. Common patterns: hand-painted dragons, phoenixes, lotus, chrysanthemums. NEVER raw unglazed terracotta for vases.\n"
                "- 'Bien Hoa': Thick Majolica-like satin glaze. Unique color palette of copper green/teal (teal cổ vịt), gold/amber brown, and cream-white. High-relief relief carvings (đắp nổi, khắc chìm) blending Asian motifs (phoenixes, dragons) with Western style borders (Baroque, arabesques).\n"
                "- 'Phu Lang': Coarse reddish-brown clay body. Glazed with iron-rich clay glaze ('men sắt' / 'men da lươn') producing gloss amber-brown to dark brown hues. Primarily rustic pottery forms like jars (thạp), urns, or pots. NO cobalt blue glaze or fine white porcelain.\n"
                "- 'Chu Dau': Smooth cream/ivory-white glaze. Features underglaze blue brushstrokes or underglaze blue with red/green enamels and gold trim. Highly elegant, thin lines depicting birds, fish, flowers, or traditional figures.\n"
                "- 'Bau Truc': REDDISH-BROWN OR GREY-BLACK TERRACOTTA (đất nung). ALWAYS RAW AND UNGLAZED (rough, matte, porous surface). Hand-built without potter's wheel. Fired in open pits (outdoor wood/straw fire), resulting in unique dark grey/black smoke stains (vệt khói ám). Simple incised geometric patterns."
            )
            synthetic_hint = (
                f"\n\n⚠️ NOTE ON SYNTHETIC/AI-GENERATED IMAGES:\n"
                f"This image is a synthetic ceramic generated by AI{target_country_text}.\n"
                "AI generators are prone to lookalike biases, often making Vietnamese traditions look like famous "
                "foreign traditions (e.g. making Bien Hoa look like Minton Majolica, or Chu Dau/Bat Trang look like Jingdezhen).\n"
                f"As the Judge, analyze the arguments carefully. Since the intended origin of this piece is '{target_country or 'anywhere'}', "
                f"and you see lookalike/hybrid patterns that share characteristics of both the target country and foreign traditions due to AI generation flaws, "
                f"resolve lookalike ties or hybrid patterns in favor of the ceramic lines from '{target_country or 'anywhere'}'. "
                f"For example, if the target country is Vietnam, prefer Vietnamese traditions like Bat Trang, Bien Hoa, Phu Lang, Chu Dau, Bau Truc.\n"
                f"Use the following guide to cross-examine agent claims against the raw visual features:\n{vietnamese_guide if target_country == 'Vietnam' else ''}\n"
                "⚠️ CRITICAL: DO NOT DEFAULT TO THE MAJORITY AGREEMENT IF THEIR CLAIMS CONTRADICT THE RAW VISUAL FEATURES.\n"
                "For example, if visual features say glaze_type is 'None', surface_texture is 'Rough, matte', and body_color is 'Terracotta', "
                "any agent prediction of 'Bat Trang' is physically impossible because Bat Trang is glazed white clay. In such cases, "
                "you must select 'Bau Truc' as the correct raw terracotta line even if all other agents guessed Bat Trang."
            )

        prompt = (
            f"You are the 'Final Judge' — {'The Final Arbiter' if is_en else 'Trọng tài phán quyết cuối cùng'}.\n"
            f"Personality: {self.personality}\n\n"
            f"Visual features extracted from the image:\n{json.dumps(visual_features, indent=2, ensure_ascii=False)}\n\n"
            f"{lens_context}"
            f"Agent predictions and their debate outputs:\n{json.dumps(predictions, indent=2, ensure_ascii=False)}\n\n"
            "YOUR TASK: Synthesize the FINAL prediction based primarily on the MULTI-AGENT DEBATE.\n"
            "You are the arbiter of a scholarly debate between 3 expert agents. Your job is to weigh their arguments, "
            "cross-examine their evidence, and reach your own independent conclusion.\n\n"
            "EVIDENCE PRIORITY HIERARCHY:\n"
            "1. AGENT EXPERT REASONING (PRIMARY — 40%): Each agent brings unique expertise (history, kiln/morphology, global culture). "
            "Evaluate the QUALITY and DEPTH of each agent's argument. A well-reasoned analysis with specific visual evidence "
            "should carry more weight than a vague claim with high self-reported confidence.\n"
            "2. VISUAL FEATURES (30%): Physical characteristics directly observed in the image — glaze type, body color, "
            "decoration technique, foot ring shape, firing marks. These are OBJECTIVE facts that must be consistent with any prediction.\n"
            "3. AGENT CONSENSUS (20%): When 2+ agents independently arrive at the same conclusion through DIFFERENT reasoning paths, "
            "this convergence is strong evidence. But consensus alone is not proof — all agents can be wrong if their shared reasoning is flawed.\n"
            "4. GOOGLE LENS REFERENCE (10% — SUPPORTING EVIDENCE ONLY): Google Lens results are web search matches that serve as "
            "REFERENCE MATERIAL to help verify agent claims and prevent hallucination. They are NOT ground truth. "
            "Use Lens results to: (a) confirm or cast doubt on agent predictions, (b) discover information agents may have missed, "
            "(c) resolve ties when agents disagree. But do NOT let Lens results override strong, well-reasoned agent analysis.\n\n"
            "YOUR TASK: Formulate your final decision."
            f"{synthetic_hint}\n\n"
            "CRITICAL JUDGING RULES:\n"
            "1. PRIORITIZE REASONING QUALITY: A single agent with deep, specific, well-evidenced analysis can outweigh two agents with shallow reasoning.\n"
            "2. CROSS-EXAMINE VISUAL EVIDENCE: If an agent claims a ceramic line but the visible glaze, shape, or decoration contradicts it, overrule them.\n"
            "3. AVOID BIAS: Do not automatically assume Vietnamese origin. Evaluate globally based on evidence.\n"
            "4. LENS AS FACT-CHECK: Use Google Lens to verify claims, not to dictate the answer. "
            "If agents provide strong reasoning that differs from Lens, trust the agents' expertise — Lens may match visually similar but different items.\n"
            "5. LOOKALIKE AWARENESS: Be aware of commonly confused ceramics and use agent expertise to distinguish them:\n"
            "   - Thai Sawankhalok celadon vs Chinese Longquan/Yaozhou celadon\n"
            "   - Vietnamese Chu Dau blue-and-white vs Chinese Jingdezhen blue-and-white\n"
            "   - Japanese Arita/Imari vs Chinese export porcelain\n"
            "   - Korean Goryeo celadon vs Chinese Song Dynasty celadon\n"
            "6. REASONING TRANSPARENCY: In your 'reasoning', explain:\n"
            "   a) Which agent's argument was most convincing and WHY\n"
            "   b) How visual features support your conclusion\n"
            "   c) Whether Google Lens references confirm or contradict the agents\n"
            "   d) Why you rejected the other agents' predictions\n\n"
            "CONFIDENCE SCORING GUIDELINES:\n"
            "- 85-100: Strong agent consensus backed by clear visual evidence\n"
            "- 70-84: Good agent reasoning with supporting visual evidence, minor uncertainties\n"
            "- 50-69: Agents disagree, mixed visual evidence\n"
            "- 30-49: Weak reasoning, significant disagreement among agents\n"
            "- 0-29: Very uncertain, insufficient evidence\n\n"
            "⚠️ CRITICAL — YOUR 'final_prediction' MUST be a SPECIFIC ceramic line/kiln name:\n"
            "REFERENCE LIST:\n"
            "- VN: Bat Trang, Chu Dau, Phu Lang, Bau Truc, Bien Hoa, Lai Thieu, Tho Ha, Thanh Ha, Cay Mai, Go Sanh\n"
            "- CN: Jingdezhen, Longquan, Yixing, Dehua, Cizhou, Jun, Ge, Ding, Ru\n"
            "- JP: Arita/Imari, Satsuma, Raku, Kutani, Bizen, Hagi, Mashiko\n"
            "- KR: Goryeo celadon, Buncheong\n"
            "- SEA: Sawankhalok, Sukhothai, Bencharong\n"
            "- EU: Meissen, Sèvres, Wedgwood, Delftware, Majolica, Limoges, Royal Copenhagen, Capodimonte\n"
            "- ME: Iznik\n"
            "- AM: Barro Negro, Mata Ortiz, Talavera\n\n"
            "⚠️ NEVER use generic terms like 'Traditional brown glaze Vietnamese ceramics', 'Ancient ceramics', 'Traditional pottery'. "
            "MUST be a SPECIFIC kiln/ceramic line name.\n\n"
            f"{lang_instruction}\n\n"
            "Return ONLY JSON:\n"
            "{\n"
            "  \"final_prediction\": \"(SPECIFIC CERAMIC LINE NAME)\",\n"
            "  \"final_country\": \"(COUNTRY NAME)\",\n"
            "  \"final_era\": \"(SPECIFIC ERA)\",\n"
            "  \"certainty\": 0-100,\n"
            "  \"reasoning\": \"(SYNTHESIS REASONING — which agent was most convincing, visual evidence, how Lens references helped verify)\",\n"
            "  \"debate_summary\": \"(DEBATE SUMMARY among 3 agents)\"\n"
            "}"
        )
        raw_resp = await self._call_llm(prompt)
        return self._extract_json(raw_resp)
