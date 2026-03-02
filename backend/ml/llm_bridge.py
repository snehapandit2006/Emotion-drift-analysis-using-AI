import os
import requests
import json
import re

from core.config import settings

# LLM Configuration
LLM_API_KEY = settings.LLM_API_KEY
LLM_MODEL = settings.LLM_MODEL

def generate_structured_fallback(user_text: str, state: dict) -> str:
    """
    Smart, State-Aware Reflection + Probing heuristic.
    Uses current emotion, intent, volatility, and probe history.
    """
    domain = state.get("domain", "general_emotional")
    if domain == "physical_distress":
        medical_options = [
            "That sounds physically uncomfortable. Are you managing the pain okay right now?",
            "I'm sorry you're dealing with that physical discomfort. Did the doctor give you specific aftercare instructions?",
            "That sounds like a lot to handle physically. How are your energy levels after the procedure?",
            "I hear you on the physical pain. Is there anything helping you feel more comfortable at the moment?",
            "Medical procedures can be so draining. I'm here to listen while you recover."
        ]
        import random
        return random.choice(medical_options)

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
            "[Storytelling, Avoidance, Direct Request, Emotional Disclosure, Greeting, Clarification, Medical Disclosure]. "
            "Return ONLY the category name. No prose.\n\n"
            f"User: '{user_text}'"
        )
        
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"temperature": 0.1, "maxOutputTokens": 10}
        }
        
        res = requests.post(url, json=payload, timeout=4.0)
        if res.status_code == 200:
            result = res.json()
            try:
                intent = result["candidates"][0]["content"]["parts"][0]["text"].strip().lower()
                return intent
            except (KeyError, IndexError):
                print(f"[Intent Classifier] Parsing Error or Safety Block. Result: {result}")
        else:
            print(f"[Intent Classifier] HTTP Error {res.status_code}")
    except Exception as e:
        print(f"[Intent Classifier] Request Exception: {e}")
    
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
        print("[LLM Bridge] WARNING: LLM_API_KEY is missing. Falling back to heuristic mode.")
        return None

    try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{LLM_MODEL}:generateContent?key={LLM_API_KEY}"
        
        # Structure is key: State first, Personality second
        # Merged Intent + Response + Type pattern for single network trip
        full_system_instructions = (
            f"{dialogue_context}\n\n"
            "SYSTEM INSTRUCTIONS:\n"
            "You are Sentia, a warm, professional, yet deeply human-centric AI Therapist.\n"
            "1. Classify the user turn into one of: [Storytelling, Avoidance, Direct Request, Emotional Disclosure, Greeting, Clarification, Medical Disclosure].\n"
            "2. Respond with empathy and natural conversational flow. Avoid robotic templates. Vary your sentence length.\n"
            "3. If appropriate, include a gentle probe to help the patient explore further.\n\n"
            "EXAMPLE FORMAT:\n"
            "[INTENT: storytelling]\n"
            "I hear how much weight you're carrying right now. It sounds like that clinical experience was physically exhausting. How are you managing the discomfort today?\n"
            "[TYPE: causal_probe]\n\n"
            "MANDATORY RESPONSE FORMAT:\n"
            "[INTENT: category]\n"
            "Your warm, natural response here.\n"
            "[TYPE: probe_type]"
        )
        
        full_prompt = f"{full_system_instructions}\n\nUser: '{user_text}'. Current Emotion Context: {fused_emotion}."
        
        payload = {
            "contents": [{"parts": [{"text": full_prompt}]}],
            "generationConfig": {"temperature": 0.5, "maxOutputTokens": 300}
        }
        
        res = requests.post(url, json=payload, timeout=8)
        
        if res.status_code != 200:
            print(f"[LLM Bridge Error] Status: {res.status_code} - Response: {res.text}")
            return None
            
        result = res.json()
        if "candidates" in result:
            raw_text = result["candidates"][0]["content"]["parts"][0]["text"].strip()
            
            # Extraction logic
            intent = extract_intent_block(raw_text)
            probe_type = extract_probe_type(raw_text)
            
            # Clean response (remove tags)
            clean_resp = re.sub(r"\[INTENT:.*?\]", "", raw_text)
            clean_resp = re.sub(r"\[TYPE:.*?\]", "", clean_resp).strip()
            
            return {"text": clean_resp, "type": probe_type, "intent": intent}
            
        print("[LLM Bridge Error] No candidates found in response:", result)
        return None
        
    except Exception as e:
        print(f"[LLM Bridge Exception]: {e}")
        return None

def extract_probe_type(llm_response: str) -> str:
    match = re.search(r"\[TYPE:\s*(.*?)\]", llm_response, re.IGNORECASE)
    return match.group(1).strip().lower() if match else "general_probe"

def extract_intent_block(llm_response: str) -> str:
    match = re.search(r"\[INTENT:\s*(.*?)\]", llm_response, re.IGNORECASE)
    return match.group(1).strip().lower() if match else "storytelling"

def generate_clinical_summary(structured_history: list) -> str:
    """
    Phase 3: LLM-Based Context Summary
    STRICT POLICY: LLM summarizes. Model decides risk.
    """
    if not LLM_API_KEY:
        return "LLM integration missing. Cannot summarize history."
        
    try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{LLM_MODEL}:generateContent?key={LLM_API_KEY}"
        
        prompt = (
            "You are a clinical summarization assistant.\n"
            "STRICT RULES:\n"
            "1. Summarize the emotional trends from the provided session data.\n"
            "2. DO NOT assess risk level.\n"
            "3. DO NOT give medical advice or diagnosis.\n"
            "4. Produce a concise, objective 2-sentence summary of the trends observed.\n\n"
            f"Session Data JSON:\n{json.dumps(structured_history, indent=2)}"
        )
        
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"temperature": 0.1, "maxOutputTokens": 150}
        }
        
        res = requests.post(url, json=payload, timeout=8)
        if res.status_code == 200:
            result = res.json()
            if "candidates" in result:
                return result["candidates"][0]["content"]["parts"][0]["text"].strip()
                
        return "Failed to generate summary from LLM."
    except Exception as e:
        print(f"[LLM Clinical Summary Error]: {e}")
        return "Error connecting to summarization service."

def handle_doctor_voice_query(query: str, db, doctor_id: int) -> str:
    """
    Deterministic regex-based routing for clinical voice assistant.
    Commands:
    1. "Show emotional trend for patient {id}"
    2. "Any high emotional risk patients?"
    3. "Summarize emotional history [for patient {id}]"
    """
    q_lower = query.lower()
    
    from db.models import DriftAlert, EmotionLog, User
    
    # 1. Any high emotional risk patients?
    if "high" in q_lower and "risk" in q_lower:
        # Find active High alerts for doc's patients
        patients = db.query(User).filter(User.doctor_id == doctor_id).all()
        p_ids = [p.id for p in patients]
        alerts = db.query(DriftAlert).filter(
            DriftAlert.user_id.in_(p_ids),
            DriftAlert.message.like('%"level": "HIGH"%')
        ).all()
        
        if not alerts:
            return "There are currently no patients with HIGH emotional risk alerts."
            
        high_risk_ids = list(set([a.user_id for a in alerts]))
        return f"Yes, you have {len(high_risk_ids)} high emotional risk patients. Patient IDs: {', '.join(map(str, high_risk_ids))}."
        
    # Extract Patient ID if mentioned
    pt_match = re.search(r'patient\s+(\d+)', q_lower)
    patient_id = int(pt_match.group(1)) if pt_match else None
    
    # 2. Summarize emotional history
    if "summarize" in q_lower:
        if not patient_id:
            return "Please specify a patient ID to summarize."
            
        logs = db.query(EmotionLog).filter(EmotionLog.user_id == patient_id).order_by(EmotionLog.created_at.desc()).limit(10).all()
        if not logs:
            return f"No emotional history found for patient {patient_id}."
            
        history_data = [
            {"date": l.created_at.isoformat(), "emotion": l.emotion, "confidence": round(l.confidence, 2)} 
            for l in reversed(logs)
        ]
        summary = generate_clinical_summary(history_data)
        return summary
        
    # 3. Show emotional trend for patient
    if "trend" in q_lower:
        if not patient_id:
            return "Please specify a patient ID to show trends."
            
        # Get last 5 sessions
        logs = db.query(EmotionLog).filter(EmotionLog.user_id == patient_id).order_by(EmotionLog.created_at.desc()).limit(5).all()
        if len(logs) < 2:
            return f"Patient {patient_id} does not have enough sessions to establish a trend."
            
        # Basic slope or diff logic for readout
        # Just mapping the emotions from older to newer
        trend_emotions = [l.emotion for l in reversed(logs)]
        return f"Patient {patient_id} emotional trend over the last {len(logs)} sessions: " + " -> ".join(trend_emotions) + "."

    return "I am your Emotional Risk Assessment assistant. You can ask me to summarize history, show trends, or check for high-risk patients."
