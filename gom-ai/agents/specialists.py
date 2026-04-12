from agents.base_agent import BaseAgent

class GPTAgent(BaseAgent):
    def __init__(self):
        # We simulate GPT-Historian using Gemini Pro for better logic if available, 
        # but for this demo using Gemini 1.5/2.0 Flash is fine for speed.
        super().__init__(
            name="GPT Historian",
            personality="A meticulous ceramic historian specializing in eras, global trade routes, and manufacturing evolution. Very logical and focuses on historical evidence.",
            provider="groq", 
            model_id="llama-3.3-70b-versatile" 
        )

class GrokAgent(BaseAgent):
    def __init__(self):
        # Using Llama 3.3 70B on Groq as our "Grok" debater
        super().__init__(
            name="Grok Critic",
            personality="A cynical, sharp-tongued critic who loves finding flaws in others' logic. Challenges assumptions and points out small visual discrepancies.",
            provider="groq",
            model_id="llama-3.3-70b-versatile"
        )

class GeminiAgent(BaseAgent):
    def __init__(self):
        # Moved to Groq to save Google API quota for VisionAgent (image analysis)
        super().__init__(
            name="Global Ceramics Expert",
            personality="A specialist in worldwide ceramics, spanning Asian (Vietnamese, Chinese, Japanese), European (Meissen, Delftware, Wedgwood), and Middle Eastern styles. Understands symbolism, global trade routes, local clays, and regional kiln signatures across different continents.",
            provider="groq",
            model_id="llama-3.3-70b-versatile"
        )
