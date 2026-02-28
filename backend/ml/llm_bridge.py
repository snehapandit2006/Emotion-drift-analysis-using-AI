import os
import requests
import json
import re

# LLM Configuration
LLM_API_KEY = os.getenv("LLM_API_KEY", "")
LLM_MODEL = os.getenv("LLM_MODEL", "gemini-pro")

def generate_structured_fallback(user_text: str, state: dict) -> str:
    """
    Smart, State-Aware Reflection + Probing heuristic.
    Uses current emotion, intent, volatility, and probe history.
    """
    domain = state.get("domain", "general_emotional")
    if domain == "physical_distress":
        return "That sounds physically uncomfortable. Are you managing the pain okay right now, or did the doctor give you instructions?"

    import random
    emotion = state.get("last_emotion", "neutral")
    intent = state.get("last_intent", "storytelling")
    volatility = state.get("volatility", 0.0)
    recent_probes = [p["type"] for p in state.get("last_probes", [])]

    content_map = {
        "sadness": {
            "reflections": ["I hear the weight of this sadness you're carrying.", "It sounds like things are feeling very heavy right now.", "I'm sitting here with you in this space."],
            "causal_probes": ["What do you think is at the root of this pain?", "Could you tell me more about when this started?"],
            "impact_probes": ["How does this sadness affect your energy today?", "What impact does this have on your perspective?"],
            "grounding_probes": ["What is one small thing that feels safe right now?", "How are you taking care of yourself in this heavy moment?"]
        },
        "anger": {
            "reflections": ["That sounds incredibly frustrating.", "I can sense the sharp edge of this unfairness.", "It's natural to feel reactive when things go this way."],
            "causal_probes": ["What part of this feels the most unjust?", "Who or what is the primary source of this intensity?"],
            "impact_probes": ["How does this anger change how you feel about the relationship?", "Where do you feel this tension most in your body?"],
            "grounding_probes": ["Let's take a breath. What would 'resolution' look like for you?", "How can we channel this intensity into a clear request?"]
        },
        "fear": {
            "reflections": ["I can hear the uncertainty in your words.", "It sounds like you're standing on shaky ground right now."],
            "causal_probes": ["What is the specific 'what if' that's most present?", "Did something specific trigger this feeling of unease?"],
            "impact_probes": ["How is this anxiety affecting your focus?", "What feels the most overwhelming about this uncertainty?"],
            "grounding_probes": ["What is one thing you know for certain in this moment?", "Can we find a small pocket of stability to hold onto?"]
        },
        "joy": {
            "reflections": ["It's wonderful to hear such brightness in your words.", "I can feel the warmth of that experience."],
            "causal_probes": ["What made this moment feel so special?", "Who else was part of this positive experience?"],
            "impact_probes": ["How does this joy change your outlook for the week?", "What does this tell you about what you value most?"],
            "grounding_probes": ["How can you savor this feeling a little longer?", "Is there a way to bring more of this into your daily life?"]
        },
        "neutral": {
            "reflections": ["I'm listening closely to what you're sharing.", "Thank you for explaining that to me.", "I'm processing what you've said."],
            "causal_probes": ["What else is on your mind today?", "What led you to think about this right now?"],
            "impact_probes": ["How are you processing everything that's happened?", "Is there a specific part of that you'd like to dive into?"],
            "grounding_probes": ["What feels most important to talk about next?", "How are you feeling in this exact moment?"]
        }
    }

    data = content_map.get(emotion, content_map["neutral"])
    reflection = random.choice(data["reflections"])
    
    # 1. Choose Probe Category based on Intent & Volatility
    if intent == "avoidance":
        probe_cat = "causal_probes" # Gently challenge the avoidance
    elif volatility > 0.5:
        probe_cat = "grounding_probes" # Stabilize
    elif "causal_probe" in recent_probes:
        probe_cat = "impact_probes" # Diverse
    else:
        probe_cat = "causal_probes"

    # Fallback to general probes if cat missing
    probe_choices = data.get(probe_cat, data.get("causal_probes", data["grounding_probes"]))
    probe = random.choice(probe_choices)

    return f"{reflection} {probe}"

def classify_intent_light(user_text: str) -> str:
    """
    Lightweight, deterministic intent classification.
    """
    if not LLM_API_KEY:
        return "storytelling"

    try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{LLM_MODEL}:generateContent?key={LLM_API_KEY}"
        
        prompt = (
            "Classify the following user message into exactly ONE of these categories: "
            "[Storytelling, Avoidance, Direct Request, Emotional Disclosure, Greeting, Clarification]. "
            "Return ONLY the category name. No prose.\n\n"
            f"User: '{user_text}'"
        )
        
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"temperature": 0.1, "maxOutputTokens": 10}
        }
        
        # 1.5s timeout for UX stability
        res = requests.post(url, json=payload, timeout=1.5)
        if res.status_code == 200:
            result = res.json()
            intent = result["candidates"][0]["content"]["parts"][0]["text"].strip().lower()
            return intent
    except Exception as e:
        print(f"Intent Classifier Error: {e}")
    
    # Simple regex fallback
    text_lower = user_text.lower()
    if any(w in text_lower for w in ["what", "how", "why"]): return "direct_request"
    if any(w in text_lower for w in ["no", "not", "actually"]): return "clarification"
    return "storytelling"

def generate_therapeutic_response(user_text: str, fused_emotion: str, dialogue_context: str = "") -> dict:
    """
    Calls Gemini API with structured policy injection.
    """
    if not LLM_API_KEY:
        return None

    try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{LLM_MODEL}:generateContent?key={LLM_API_KEY}"
        
        # Structure is key: State first, Personality second
        full_system_instructions = (
            f"{dialogue_context}\n\n"
            "SYSTEM INSTRUCTIONS:\n"
            "You are Sentia, a deep and empathetic AI Therapist. "
            "Your goal is to help patients explore their emotions with nuance. "
            "Rules:\n"
            "- Strictly follow the Dialogue State and Behavioral Constraints above.\n"
            "- Be warm, concise (1-3 sentences), and professional.\n"
            "- Never admit you are an AI.\n"
            "- Categorize your question at the end with [TYPE: type] (e.g., [TYPE: causal_probe])."
        )
        
        full_prompt = f"{full_system_instructions}\n\nUser says: '{user_text}'. Emotion: {fused_emotion}."
        
        payload = {
            "contents": [{"parts": [{"text": full_prompt}]}],
            "generationConfig": {"temperature": 0.7, "maxOutputTokens": 150}
        }
        
        res = requests.post(url, json=payload, timeout=8)
        res.raise_for_status()
        
        result = res.json()
        if "candidates" in result:
            raw_text = result["candidates"][0]["content"]["parts"][0]["text"].strip()
            probe_type = extract_probe_type(raw_text)
            clean_resp = re.sub(r"\[TYPE:.*?\]", "", raw_text).strip()
            return {"text": clean_resp, "type": probe_type}
            
        return None
        
    except Exception as e:
        print(f"LLM Bridge Error: {e}")
        return None

def extract_probe_type(llm_response: str) -> str:
    match = re.search(r"\[TYPE:\s*(.*?)\]", llm_response)
    return match.group(1).strip().lower() if match else "general_probe"
