import logging

def calculate_final_score(agents_results: list) -> float:
    """
    Weighted scoring based on consistency and individual confidence.
    """
    weights = [0.35, 0.35, 0.3] # GPT, Grok, Gemini
    total = sum(weights)
    
    score = 0
    for i, res in enumerate(agents_results):
        conf = float(res.get("confidence", 0.5))
        score += conf * weights[i]
        
    return score / total
