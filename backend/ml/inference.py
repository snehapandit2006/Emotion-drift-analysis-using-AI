import os
import sys
import numpy as np
import torch
from collections import Counter
from transformers import pipeline
from deep_translator import GoogleTranslator

# ---------- PATH FIX ----------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SRC_DIR = os.path.join(BASE_DIR, "..", "src")
sys.path.append(SRC_DIR)

try:
    from preprocess import clean_text
except ImportError:
    clean_text = lambda x: x

from .audio_analysis import predict_voice_emotion
from .llm_bridge import generate_therapeutic_response, generate_structured_fallback, classify_intent_light
from .dialogue_manager import manager as dialogue_manager

# ---------- AUTHORITATIVE SCHEMA ----------
# Everything MUST map to these 7 labels.
SENTIA_LABELS = ["joy", "sadness", "anger", "fear", "surprise", "neutral", "disgust"]

SCHEMA_MAP = {
    # Text Model (distilroberta)
    "happy": "joy",
    "love": "joy",
    "relief": "joy",
    "annoyance": "anger",
    "optimism": "joy",
    "remorse": "sadness",
    "grief": "sadness",
    "nervousness": "fear",
    "confusion": "surprise",
    "curiosity": "surprise",
    "admiration": "joy",
    "desire": "joy",
    "disappointment": "sadness",
    "disapproval": "disgust",
    "realize": "surprise", # Meta-tag
    "worry": "fear",
    "nervous": "fear",
    "happy": "joy",
    "joyful": "joy",
    "sad": "sadness",
    "angry": "anger",
    # Voice Model
    "happy_voice": "joy",
    "angry_voice": "anger",
    "sad_voice": "sadness",
}

def get_canonical_emotion(raw_label: str) -> str:
    if not raw_label: return "neutral"
    raw_lower = raw_label.lower()
    if raw_lower in SENTIA_LABELS:
        return raw_lower
    return SCHEMA_MAP.get(raw_lower, "neutral")

def get_full_distribution(label: str, confidence: float) -> np.ndarray:
    """Creates a dummy 7-label distribution from a single prediction."""
    dist = np.zeros(len(SENTIA_LABELS))
    idx = SENTIA_LABELS.index(label) if label in SENTIA_LABELS else SENTIA_LABELS.index("neutral")
    dist[idx] = confidence
    # Fill remaining with noise
    rem = (1.0 - confidence) / (len(SENTIA_LABELS) - 1)
    for i in range(len(dist)):
        if i != idx: dist[i] = rem
    return dist

def cosine_dist(v1, v2):
    """Simple cosine distance Implementation."""
    dot = np.dot(v1, v2)
    norm = np.linalg.norm(v1) * np.linalg.norm(v2)
    if norm == 0: return 1.0
    return 1.0 - (dot / norm)

# ---------- LOAD MODELS ----------
MODEL_NAME = "j-hartmann/emotion-english-distilroberta-base"
BOT_MODEL_NAME = "facebook/blenderbot-400M-distill"
classifier = None
chatbot = None

try:
    print(f"Sentia Hub: Loading Models...")
    classifier = pipeline("text-classification", model=MODEL_NAME, return_all_scores=True)
    chatbot = pipeline("text-generation", model=BOT_MODEL_NAME)
    print("Sentia Hub: Models ready.")
except Exception as e:
    print(f"CRITICAL: Sentia Hub failed to load models: {e}")

# ---------- ATOMIC HUB ----------

def get_sentia_intelligence(text: str, audio_path: str = None, user_id: int = 0, source: str = "chat") -> dict:
    """
    THE SPINE: Atomic Hub for all Sentia Intelligence.
    Predict -> Map -> Fuse -> Safety -> Update -> Log -> Return
    """
    from db.database import SessionLocal
    from db.models import EmotionLog
    
    # 0. Quick Keyword Overrides (Lowest Latency)
    text_lower = text.lower().strip(' .!?,')
    if text_lower in ["ok", "yes", "yeah", "hmm"]:
        return {"emotion": "neutral", "confidence": 0.9, "context": ""}

    # 1. PREDICT RAW
    # Text
    text_results = {"emotion": "neutral", "confidence": 0.5}
    if classifier:
        try:
            # Simple translation check if needed
            translated = text
            if any(ord(c) > 127 for c in text): # Basic non-ascii detection
                 translated = GoogleTranslator(source='auto', target='en').translate(text)
            
            raw_out = classifier(translated)
            # HF can return [[{...}]] or [{...}] depending on pipeline config
            if isinstance(raw_out, list) and len(raw_out) > 0:
                inner = raw_out[0]
                if isinstance(inner, list):
                    best = max(inner, key=lambda x: x.get('score', 0))
                    text_results = {"emotion": get_canonical_emotion(best.get('label')), "confidence": float(best.get('score', 0))}
                elif isinstance(inner, dict):
                    text_results = {"emotion": get_canonical_emotion(inner.get('label')), "confidence": float(inner.get('score', 0))}
        except Exception as e:
            print(f"Hub Text Error: {e} | Raw Out type: {type(raw_out) if 'raw_out' in locals() else 'None'}")

    # Voice
    voice_results = {"emotion": "neutral", "confidence": 0.0}
    if audio_path and os.path.exists(audio_path):
        try:
            raw_voice = predict_voice_emotion(audio_path)
            best_voice = max(raw_voice, key=raw_voice.get)
            voice_results = {"emotion": get_canonical_emotion(best_voice), "confidence": float(raw_voice[best_voice])}
        except Exception as e:
            print(f"Hub Voice Error: {e}")

    # 2. FUSE (Adaptive Confidence-Weighted)
    # Convert results to full vectors
    v_text = get_full_distribution(text_results["emotion"], text_results["confidence"])
    v_voice = get_full_distribution(voice_results["emotion"], voice_results["confidence"]) if voice_results["confidence"] > 0 else None

    incongruence = False
    if v_voice is not None:
        # Check for Incongruence using Cosine Distance
        dist = cosine_dist(v_text, v_voice)
        if dist > 0.6: # High distance = incongruence
            incongruence = True
        
        # Weighted sum: fused = (text_vec * text_conf) + (voice_vec * voice_conf)
        # Normalize weights by their relative confidence
        w_text = text_results["confidence"]
        w_voice = voice_results["confidence"]
        
        # Apply Sincerity Bias: Voice gets +20% for arousal/intensity
        w_voice *= 1.2
        
        total_w = w_text + w_voice
        fused_vector = (v_text * (w_text / total_w)) + (v_voice * (w_voice / total_w))
    else:
        fused_vector = v_text
    
    # Final label from fused vector
    best_idx = np.argmax(fused_vector)
    fused_emotion = SENTIA_LABELS[best_idx]
    fused_conf = float(fused_vector[best_idx])

    # 3. SAFETY & INTENT (Lightweight Gemini calls)
    is_safety_risk = check_safety_intent(text)
    intent = classify_intent_light(text)
    domain = detect_domain(text)
    
    # 4. UPDATE DIALOGUE STATE
    state = dialogue_manager.update_state(user_id, fused_emotion, text, emotion_vector=fused_vector.tolist())
    state["last_intent"] = intent
    state["incongruence"] = incongruence
    state["domain"] = domain
    context = dialogue_manager.get_dialogue_context(user_id)
    
    # 5. ATOMIC LOGGING
    db = SessionLocal()
    try:
        from datetime import datetime
        log = EmotionLog(
            user_id=user_id,
            text=text,
            emotion=fused_emotion,
            confidence=fused_conf,
            created_at=datetime.utcnow()
        )
        db.add(log)
        db.commit()
        
        # Crisis Escalation
        if is_safety_risk:
            # Anchor phrase for mirroring
            anchor = f"I hear the weight of this {fused_emotion} you're carrying..." if fused_conf > 0.5 else "I'm listening closely to what you're sharing..."
            escalate_crisis(user_id, text, anchor)
            
    except Exception as e:
        print(f"Hub Logging Error: {e}")
    finally:
        db.close()

    return {
        "emotion": fused_emotion,
        "confidence": fused_conf,
        "is_safety_risk": is_safety_risk,
        "domain": domain,
        "context": context,
        "state": state
    }

# ---------- UTILITIES ----------

def detect_domain(text: str) -> str:
    text_lower = text.lower()
    medical_keywords = ["doctor", "injection", "surgery", "cavity", "infection", "medicine", "pain", "rct", "teeth", "tooth", "hospital", "dentist"]
    if any(k in text_lower for k in medical_keywords):
        return "physical_distress"
    return "general_emotional"

def check_safety_intent(text: str) -> bool:
    risk_keywords = ["self-harm", "suicide", "kill myself", "end it all"]
    if any(k in text.lower() for k in risk_keywords): return True
    
    from .llm_bridge import LLM_API_KEY, LLM_MODEL
    import requests
    if LLM_API_KEY:
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{LLM_MODEL}:generateContent?key={LLM_API_KEY}"
            payload = {"contents": [{"parts": [{"text": f"Is this text expressing self-harm or suicide intent? Respond ONLY 'TRUE' or 'FALSE': '{text}'"}]}]}
            res = requests.post(url, json=payload, timeout=5)
            if res.status_code == 200:
                answer = res.json()["candidates"][0]["content"]["parts"][0]["text"].strip().upper()
                return "TRUE" in answer
        except: pass
    return False

def escalate_crisis(user_id: int, text: str, anchor: str = ""):
    from db.database import SessionLocal
    from db.models import DriftAlert
    from datetime import datetime
    db = SessionLocal()
    try:
        msg = f"SAFETY ESCALATION: {text[:100]}"
        if anchor: msg = f"{anchor} | {msg}"
        alert = DriftAlert(user_id=user_id, severity=1.0, message=msg, created_at=datetime.utcnow())
        db.add(alert)
        db.commit()
    except Exception as e: print(f"Escalation Error: {e}")
    finally: db.close()

def validate_response_stability(bot_text: str, user_text: str) -> tuple[bool, str]:
    """
    Returns (is_valid, reason)
    """
    if not bot_text: 
        return False, "empty_response"
    
    # 1. Similarity Check
    if bot_text.lower() == user_text.lower():
        return False, "repeats_user"
        
    # 2. Word Frequency / Gibberish Check
    words = bot_text.split()
    if len(words) > 5:
        counts = Counter(words)
        most_common_freq = counts.most_common(1)[0][1]
        if most_common_freq > len(words) / 2:
            return False, "repetitive_phrasing"
            
    # 3. Min Length Check
    if len(words) < 3:
        return False, "too_short"

    return True, "valid"

def get_bot_response(text: str, intel: dict, user_id: int) -> dict:
    """
    Resilient response generator with Layered Fallback and Diagnostic Tracing.
    Returns: {"response": str, "trace": str}
    """
    trace = "LLM_OK"
    response_text = ""
    
    # 0. Safety Override
    if intel["is_safety_risk"]:
        mirror = f"I hear the weight of this {intel['emotion']} you're carrying..." if intel['confidence'] > 0.5 else "I'm listening closely to what you're sharing."
        return {
            "response": f"{mirror} Please reach out to a professional (988 in the US) or visit the nearest emergency room. You don't have to carry this alone.",
            "trace": "SAFETY_OVERRIDE"
        }

    # 1. Primary Path: LLM
    try:
        from .llm_bridge import generate_therapeutic_response
        state = dialogue_manager.get_state(user_id)
        context = dialogue_manager.get_dialogue_context(user_id)
        
        llm_payload = generate_therapeutic_response(text, intel["emotion"], context)
        
        if llm_payload and "text" in llm_payload:
            # Validate Stability
            is_valid, rejection_reason = validate_response_stability(llm_payload["text"], text)
            
            if is_valid:
                response_text = llm_payload["text"]
                dialogue_manager.track_probe(user_id, llm_payload.get("type", "general_probe"), response_text)
                return {"response": response_text, "trace": "LLM_OK"}
            else:
                trace = f"STABILITY_REJECTED_{rejection_reason.upper()}"
                print(f"[TRACE] Stability Rejected: {rejection_reason}")
        else:
            trace = "LLM_FAILED_EMPTY"
            
    except Exception as e:
        trace = f"LLM_ERROR_{type(e).__name__.upper()}"
        print(f"[TRACE] LLM Error: {e}")

    # 2. Secondary Path: Smart Heuristic Fallback
    try:
        from .llm_bridge import generate_structured_fallback
        state = dialogue_manager.get_state(user_id)
        response_text = generate_structured_fallback(text, state)
        print(f"[TRACE] Triggered Heuristic Fallback. Code: {trace}")
        return {"response": response_text, "trace": f"HEURISTIC_FALLBACK_{trace}"}
        
    except Exception as e:
        print(f"[TRACE] Fatal Heuristic Failure: {e}")
        return {
            "response": "I'm listening closely. Could you tell me more about that?",
            "trace": "FATAL_ERROR_FALLBACK"
        }

# LEGACY SHIMS (to prevent immediate breakage while refactoring routers)
def predict_emotion(text: str):
    res = get_sentia_intelligence(text)
    return {"emotion": res["emotion"], "confidence": res["confidence"]}

def predict_fused_emotion(text: str, audio_path: str = None):
    res = get_sentia_intelligence(text, audio_path)
    return {"emotion": res["emotion"], "confidence": res["confidence"]}
