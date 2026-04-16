import os
import sys
from datetime import datetime
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
    print(f"Sentia Hub: Loading Primary Models...")
    classifier = pipeline("text-classification", model=MODEL_NAME, return_all_scores=True)
    # Blenderbot disabled to prevent resource exhaustion and crash-loops
    chatbot = None 
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
    
    # 0. Quick Keyword Overrides (Lowest Latency - Zero LLM/ML hits)
    # Expanded for Hinglish and common conversational fillers
    text_lower = text.lower().strip(' .!?,')
    hinglish_keywords = [
        "ok", "yes", "yeah", "hmm", "yep", "yup", "sure", "correct", 
        "theek hai", "ji", "haan", "acha", "sahi hai", "thik h", "bilkul"
    ]
    if text_lower in hinglish_keywords:
        return {
            "emotion": "neutral",
            "confidence": 0.9,
            "is_safety_risk": False,
            "domain": "general_emotional",
            "context": "",
            "state": {}
        }

    # 1. PREDICT RAW (PARALLELIZED)
    from concurrent.futures import ThreadPoolExecutor
    
    def get_text_emotion():
        text_res = {"emotion": "neutral", "confidence": 0.5}
        if classifier:
            try:
                translated = text
                if any(ord(c) > 127 for c in text): 
                     translated = GoogleTranslator(source='auto', target='en').translate(text)
                
                import re
                sentences = [s.strip() for s in re.split(r'[.!?\n]+', translated) if len(s.strip()) > 3]
                if not sentences: sentences = [translated]
                
                raw_out = classifier(sentences)
                
                emotions_list = []
                for out in raw_out:
                    if isinstance(out, list):
                        best = max(out, key=lambda x: x.get('score', 0))
                    elif isinstance(out, dict):
                        best = out
                    else: continue
                    emotions_list.append((get_canonical_emotion(best.get('label')), float(best.get('score', 0))))
                
                if emotions_list:
                    drift_seq = []
                    for e, c in emotions_list:
                        if not drift_seq or drift_seq[-1] != e:
                            drift_seq.append(e)
                    drift_str = " → ".join(drift_seq) if drift_seq else emotions_list[-1][0]
                    
                    best_overall = emotions_list[-1]
                    text_res = {
                        "emotion": best_overall[0], 
                        "confidence": best_overall[1], 
                        "drift_string": drift_str if len(drift_seq) > 1 else best_overall[0],
                        "drift_data": emotions_list,
                        "sentences": sentences
                    }

            except Exception as e:
                print(f"Hub Text Error: {e}")
        return text_res

    def get_voice_emotion():
        voice_res = {"emotion": "neutral", "confidence": 0.0}
        if audio_path and os.path.exists(audio_path):
            try:
                raw_voice = predict_voice_emotion(audio_path)
                best_voice = max(raw_voice, key=raw_voice.get)
                voice_res = {"emotion": get_canonical_emotion(best_voice), "confidence": float(raw_voice[best_voice])}
            except Exception as e:
                print(f"Hub Voice Error: {e}")
        return voice_res

    with ThreadPoolExecutor(max_workers=2) as executor:
        future_text = executor.submit(get_text_emotion)
        future_voice = executor.submit(get_voice_emotion)
        text_results = future_text.result()
        voice_results = future_voice.result()

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

    # 3. SAFETY (Lightweight keyword check)
    is_safety_risk = check_safety_intent(text)
    
    # 4. UPDATE DIALOGUE STATE (Minimal first)
    state = dialogue_manager.update_state(user_id, fused_emotion, text, emotion_vector=fused_vector.tolist())
    state["incongruence"] = incongruence
    
    # Detect domain (lightweight keywords)
    domain = detect_domain(text)
    state["domain"] = domain
    
    context = dialogue_manager.get_dialogue_context(user_id)
    
    # 5. ATOMIC LOGGING (Keep but optimize session management if needed)
    from datetime import datetime
    from db.models import EmotionLog
    try:
        from db.database import engine, Base
        Base.metadata.create_all(bind=engine) # Ensure tables exist
        
        db = SessionLocal()
        
        if text_results.get("sentences") and len(text_results["sentences"]) > 1:
            for i, sent in enumerate(text_results["sentences"]):
                if i < len(text_results.get("drift_data", [])):
                    e, c = text_results["drift_data"][i]
                    log = EmotionLog(
                        user_id=user_id, text=sent, emotion=e, confidence=c, 
                        source=source, created_at=datetime.utcnow()
                    )
                    db.add(log)
            db.commit()
        else:
            log = EmotionLog(
                user_id=user_id, text=text, emotion=fused_emotion, 
                confidence=fused_conf, source=source, created_at=datetime.utcnow()
            )
            db.add(log)
            db.commit()
        
    except Exception as e:
        print(f"Hub Logging Error: {e}")
    finally:
        if 'db' in locals(): db.close()

    # 6. CRISIS ESCALATION (moved here to ensure logging happens first)
    if is_safety_risk:
        # Anchor phrase for mirroring
        anchor = f"I hear the weight of this {fused_emotion} you're carrying..." if fused_conf > 0.5 else "I'm listening closely to what you're sharing..."
        try:
            from .utils import escalate_crisis
            escalate_crisis(user_id, text, anchor)
        except ImportError:
            pass # Handle if utility not in same path

    return {
        "emotion": text_results.get("drift_string", fused_emotion),
        "base_emotion": fused_emotion,
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
    """
    Lightweight keyword-based safety check.
    Removed secondary LLM API call to reduce latency by 3-5 seconds.
    Primary safety is now handled by the main Sarvam LLM and this keyword filter.
    """
    risk_keywords = [
        "self-harm", "suicide", "kill myself", "end it all", "end my life",
        "आत्महत्या", "खुदकुशी", "ज़िंदगी खत्म"
    ]
    text_lower = text.lower()
    if any(k in text_lower for k in risk_keywords): 
        return True
    
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
        
    # 2. Heuristic check (Removed Word Frequency to prevent brittle validation)
    # We rely on similarity instead.
    
    # 3. Min Length Check (Relaxed for conversational flow)
    # We just need to ensure the bot actually said something meaningful.
    if not bot_text.strip():
        return False, "empty_response"
    
    # 2 words is a safe bet for a 'sentence', 
    # but let's allow 1 word if it's high confidence.
    if len(bot_text.split()) < 1:
        return False, "too_short"

    return True, "valid"

def get_bot_response(text: str, intel: dict, user_id: int, conversation_id: int = None, ui_lang: str = None) -> dict:
    """
    Resilient response generator with Layered Fallback and Diagnostic Tracing.
    Returns: {"response": str, "trace": str}
    """
    trace = "LLM_OK"
    response_text = ""
    
    # 0. Safety Override
    if intel.get("is_safety_risk", False):
        mirror = f"I hear the weight of this {intel.get('base_emotion', 'neutral')} you're carrying..." if intel.get('confidence', 0) > 0.5 else "I'm listening closely to what you're sharing."
        return {
            "response": f"{mirror} Please reach out to a professional (988 in the US) or visit the nearest emergency room. You don't have to carry this alone.",
            "trace": "SAFETY_OVERRIDE"
        }

    # 1. Primary Path: LLM
    try:
        from .llm_bridge import generate_therapeutic_response
        from db.database import SessionLocal
        from db.models import User, SentiaMessage
        
        db = SessionLocal()
        user = db.query(User).filter(User.id == user_id).first()
        hobbies = user.hobbies if user else None
        games = user.preferred_games if user else None
        
        # Fetch last 5 messages for context (History awareness)
        history = []
        if conversation_id:
            db_history = db.query(SentiaMessage).filter(
                SentiaMessage.conversation_id == conversation_id
            ).order_by(SentiaMessage.timestamp.desc()).offset(1).limit(5).all() # Offset 1 to skip the current msg
            history = [{"role": m.role, "content": m.content} for m in reversed(db_history)]
        
        db.close()

        state = dialogue_manager.get_state(user_id)
        context = dialogue_manager.get_dialogue_context(user_id)
        
        llm_payload = generate_therapeutic_response(text, intel.get("base_emotion", "neutral"), context, hobbies=hobbies, games=games, history=history, ui_lang=ui_lang)
        
        if llm_payload and "text" in llm_payload:
            # 1.5 Handle Game Prescription Persistence
            prescribed_game_name = llm_payload.get("prescribed_game")
            if prescribed_game_name:
                from .llm_bridge import GAME_LIBRARY
                game_info = GAME_LIBRARY.get(prescribed_game_name)
                if game_info:
                    db = SessionLocal()
                    user = db.query(User).filter(User.id == user_id).first()
                    if user:
                        import json
                        current_games = []
                        try:
                            if user.preferred_games:
                                decoded = json.loads(user.preferred_games)
                                current_games = decoded if isinstance(decoded, list) else []
                        except:
                            # Handle legacy plain text
                            pass
                        
                        # Check if game already exists
                        if not any(g.get('name') == prescribed_game_name for g in current_games):
                            current_games.append({
                                "name": prescribed_game_name,
                                "link": game_info["link"],
                                "logo": game_info["logo"],
                                "prescribed_at": datetime.utcnow().isoformat()
                            })
                            user.preferred_games = json.dumps(current_games)
                            db.commit()
                            print(f"[Inference] Prescribed game '{prescribed_game_name}' saved for user {user_id}")
                    db.close()

            # 2. Validate Stability
            is_valid, rejection_reason = validate_response_stability(llm_payload["text"], text)
            
                if is_valid:
                    response_text = llm_payload["text"]
                    new_intent = llm_payload.get("intent", "storytelling")
                    state["last_intent"] = new_intent
                    dialogue_manager.track_probe(user_id, llm_payload.get("type", "general_probe"), response_text)

                    # 3. Resolve game link
                    game_name = llm_payload.get("prescribed_game")
                    game_link = None
                    if game_name and game_name.upper() != "NONE":
                        from .llm_bridge import GAME_LIBRARY
                        ginfo = GAME_LIBRARY.get(game_name)
                        if ginfo:
                            game_link = ginfo.get("link")

                    # 4. Binaural beats recommendation for distress emotions
                    binaural_link = None
                    distress_emotions = ["sadness", "fear", "anger"]
                    if intel.get("base_emotion") in distress_emotions:
                        binaural_link = "https://www.youtube.com/watch?v=WPni755-Krg"  # 432Hz Alpha Waves

                    return {
                        "response": response_text,
                        "trace": "LLM_OK",
                        "emotion": llm_payload.get("emotion"),
                        "prescribed_game": game_name if game_name and game_name.upper() != "NONE" else None,
                        "game_link": game_link,
                        "binaural_link": binaural_link,
                    }
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
        dialogue_manager.track_probe(user_id, "fallback_probe", response_text)
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
