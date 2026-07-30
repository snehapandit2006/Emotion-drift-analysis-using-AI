from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from collections import Counter
from datetime import datetime, timedelta

from routes import report_routes
from api.routes import auth
from ml.inference import predict_emotion
from db.database import SessionLocal
from db.models import EmotionLog, FaceEmotionLog, DriftAlert, User
from db.init_db import init_db
from analysis.drift import detect_emotion_drift
from api.deps import get_current_user
from api.routes import auth, chat_routes, support_routes, doctor_routes, medical_routes, chat_sentia_routes, therapy_routes, wellness, websocket, fitness, auth_google
from routes import report_routes, self_emotion_routes, fusion_routes, behavioral_routes, cognitive_routes


# -----------------------------
# SINGLE FastAPI APP
# -----------------------------
app = FastAPI(title="Emotion Drift API")
# Force Reload Anchor: 2026-04-17 08:50
from ml.inference import BOT_MODEL_NAME
print(f"Sentia AI: Phase 2 Active - Professional AI Voice Therapist (Model: {BOT_MODEL_NAME})")

from core.config import settings

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_origin_regex=r"https://.*\.vercel\.app|https://.*\.onrender\.com", # Allow Vercel and Render deployments
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(report_routes.router)
app.include_router(auth.router)
app.include_router(auth_google.router)
app.include_router(chat_routes.router)
app.include_router(chat_sentia_routes.router)
app.include_router(self_emotion_routes.router)
app.include_router(fusion_routes.router)
app.include_router(behavioral_routes.router)
app.include_router(cognitive_routes.router)
app.include_router(support_routes.router)
app.include_router(doctor_routes.router)
app.include_router(medical_routes.router)
app.include_router(therapy_routes.router)
app.include_router(wellness.router)
app.include_router(websocket.router)
app.include_router(fitness.router)

from fastapi.staticfiles import StaticFiles
import os
os.makedirs("storage", exist_ok=True)
app.mount("/storage", StaticFiles(directory="storage"), name="storage")


# -----------------------------
# Models
# -----------------------------
class TextRequest(BaseModel):
    text: str


# -----------------------------
# Startup
# Global to store startup error
STARTUP_ERROR = None

@app.on_event("startup")
def startup():
    global STARTUP_ERROR
    try:
        init_db()
        print("Database initialized successfully.")
    except Exception as e:
        STARTUP_ERROR = str(e)
        import traceback
        STARTUP_ERROR += "\n" + traceback.format_exc()
        print(f"CRITICAL STARTUP ERROR in init_db: {e}")

@app.get("/")
def health():
    return {"status": "ok", "db_error": STARTUP_ERROR}


# -----------------------------
# Prediction
# -----------------------------
@app.post("/predict")
def predict(req: TextRequest, current_user: User = Depends(get_current_user)):
    """
    Unified prediction endpoint using the Sentia Intelligence Hub.
    Syncs with Sentia Chat History.
    """
    from ml.inference import get_sentia_intelligence
    from db.models import SentiaConversation, SentiaMessage
    
    result = get_sentia_intelligence(req.text, user_id=current_user.id)
    
    # SYNC WITH SENTIA HISTORY
    db = SessionLocal()
    try:
        from db.models import SentiaConversation, SentiaMessage
        conv = db.query(SentiaConversation).filter(
            SentiaConversation.user_id == current_user.id,
            SentiaConversation.title == "Dashboard Insights"
        ).first()
        
        if not conv:
            conv = SentiaConversation(user_id=current_user.id, title="Dashboard Insights")
            db.add(conv)
            db.commit()
            db.refresh(conv)
            
        msg = SentiaMessage(
            conversation_id=conv.id,
            role="user",
            content=req.text,
            emotion=result["emotion"],
            timestamp=datetime.utcnow()
        )
        db.add(msg)
        # Add automated bot response to history for context
        bot_msg = SentiaMessage(
            conversation_id=conv.id,
            role="bot",
            content=f"Captured emotional insight: {result['emotion']}",
            emotion=result["emotion"],
            timestamp=datetime.utcnow()
        )
        db.add(bot_msg)
        db.commit()
    except Exception as e:
        print(f"Sync error: {e}")
        db.rollback()

    try:
        from analysis.drift import check_and_create_alert
        check_and_create_alert(db, current_user.id)
    except Exception as e:
        print(f"Error checking alerts: {e}")
    finally:
        db.close()

    return {
        "emotion": result["emotion"],
        "confidence": result["confidence"]
    }


# -----------------------------
# Timeline
# -----------------------------
# Helper for normalization
EMOTION_MAP = {
    "angry": "anger",
    "disgust": "disgust",
    "sad": "sadness",
    "joy": "joy",
    "happy": "joy",
    "happines": "joy",
    "love": "joy",
    "worry": "fear",
    "nervousness": "fear",
    "neutral": "neutral"
}

def get_norm_emotion(raw_emotion):
    if not raw_emotion: return "neutral"
    e = raw_emotion.lower()
    return EMOTION_MAP.get(e, e)

@app.get("/visualization/timeline")
def timeline(range: str = "24h", current_user: User = Depends(get_current_user)):
    db = SessionLocal()
    now = datetime.utcnow()

    delta_map = {
        "1h": timedelta(hours=1),
        "24h": timedelta(hours=24),
        "7d": timedelta(days=7),
    }

    delta = delta_map.get(range, timedelta(hours=24))
    start_time = now - delta

    # Text Logs
    text_logs = (
        db.query(EmotionLog)
        .filter(
            EmotionLog.user_id == current_user.id,
            EmotionLog.created_at >= start_time,
            EmotionLog.emotion != "unknown"
        )
        .all()
    )

    # Face Logs
    face_logs = (
        db.query(FaceEmotionLog)
        .filter(
            FaceEmotionLog.user_id == current_user.id,
            FaceEmotionLog.timestamp >= start_time,
            FaceEmotionLog.emotion != "unknown"
        )
        .all()
    )
    
    print(f"DEBUG: Found {len(text_logs)} text logs and {len(face_logs)} face logs for user {current_user.id} in range {range}")
    db.close()

    # Combine
    combined = []
    for l in text_logs:
        e = get_norm_emotion(l.emotion)
        combined.append({
            "timestamp": l.created_at,
            "emotion": e,
            "confidence": l.confidence,
            "source": "text"
        })
    for l in face_logs:
        e = get_norm_emotion(l.emotion)
        combined.append({
            "timestamp": l.timestamp,
            "emotion": e,
            "confidence": l.confidence,
            "source": "face"
        })

    # Sort by timestamp
    combined.sort(key=lambda x: x["timestamp"])

    return {
        "timestamps": [x["timestamp"].isoformat() + "Z" for x in combined],
        "emotions": [x["emotion"] for x in combined],
        "confidences": [x["confidence"] for x in combined],
        "sources": [x["source"] for x in combined]
    }

# -----------------------------
# Distribution
# -----------------------------
@app.get("/visualization/distribution")
def distribution(current_user: User = Depends(get_current_user)):
    db = SessionLocal()
    text_logs = db.query(EmotionLog).filter(EmotionLog.user_id == current_user.id, EmotionLog.emotion != "unknown").all()
    face_logs = db.query(FaceEmotionLog).filter(FaceEmotionLog.user_id == current_user.id, FaceEmotionLog.emotion != "unknown").all()
    db.close()
    print(f"DEBUG: Distribution found {len(text_logs) + len(face_logs)} total logs for user {current_user.id}")

    all_emotions = []
    
    for l in text_logs + face_logs:
        e = l.emotion
        # Apply normalization
        norm_e = EMOTION_MAP.get(e, e)
        all_emotions.append(norm_e)
    
    return dict(Counter(all_emotions))


# -----------------------------
# Drift
# -----------------------------
@app.get("/drift")
def drift(window: int = 5, current_user: User = Depends(get_current_user)):
    db = SessionLocal()
    # Fetch both for holistic drift
    text_logs = db.query(EmotionLog).filter(EmotionLog.user_id == current_user.id, EmotionLog.emotion != "unknown").all()
    face_logs = db.query(FaceEmotionLog).filter(FaceEmotionLog.user_id == current_user.id, FaceEmotionLog.emotion != "unknown").all()
    
    # Combine and Sort
    combined = []
    for l in text_logs:
        e = EMOTION_MAP.get(l.emotion, l.emotion)
        combined.append({"t": l.created_at, "e": e})
    for l in face_logs:
        e = EMOTION_MAP.get(l.emotion, l.emotion)
        combined.append({"t": l.timestamp, "e": e})
    
    combined.sort(key=lambda x: x["t"])

    if len(combined) < window * 2:
        db.close()
        return {
            "drift": False,
            "details": {
                "severity": 0.0,
                "from": None,
                "to": None
            }
        }

    emotions = [x["e"] for x in combined]
    old, new = emotions[:-window], emotions[-window:]
    result = detect_emotion_drift(old, new)

    db.close()
    return {
        "drift": result["drift"],
        "details": {
            "severity": result["severity"],
            "from": result["from"],
            "to": result["to"]
        }
    }


# -----------------------------
# Alerts
# -----------------------------
@app.get("/alerts")
def get_alerts(current_user: User = Depends(get_current_user)):
    db = SessionLocal()
    # Check last 50 logs for significant drift
    # logs is unused but kept for reference if needed later
    # logs = (
    #     db.query(EmotionLog)
    #     .filter(EmotionLog.user_id == current_user.id)
    #     .order_by(EmotionLog.created_at.desc())
    #     .limit(50)
    #     .all()
    # )
    
    alerts = []
    
    try:
         persisted_alerts = (
            db.query(DriftAlert)
            .filter(DriftAlert.user_id == current_user.id)
            .order_by(DriftAlert.created_at.desc())
            .all()
        )
         alerts = [
             {"severity": a.severity, "created_at": a.created_at, "message": "Drift detected"} 
             for a in persisted_alerts
         ]
    except Exception:
        pass

    db.close()
    return alerts


# -----------------------------
# Volatility
# -----------------------------
@app.get("/volatility")
def get_volatility(current_user: User = Depends(get_current_user)):
    """
    Calculates emotional volatility based on the variance of states in the intelligence state.
    """
    from ml.dialogue_manager import manager as dm
    state = dm.get_state(current_user.id)
    return {
        "volatility": state.get("volatility", 0.0),
        "stability_index": 1.0 - state.get("volatility", 0.0)
    }

# -----------------------------
# Comparison
# -----------------------------
@app.get("/compare")
def compare(range: str = "24h", current_user: User = Depends(get_current_user)):
    db = SessionLocal()
    now = datetime.utcnow()
    
    delta_map = {
        "1h": timedelta(hours=1),
        "24h": timedelta(hours=24),
        "7d": timedelta(days=7),
    }
    period = delta_map.get(range, timedelta(hours=24))
    
    # Current period
    start_current = now - period
    current_logs = (
        db.query(EmotionLog)
        .filter(EmotionLog.user_id == current_user.id, EmotionLog.created_at >= start_current)
        .all()
    )
    
    # Previous period
    start_prev = start_current - period
    prev_logs = (
        db.query(EmotionLog)
        .filter(
            EmotionLog.user_id == current_user.id, 
            EmotionLog.created_at >= start_prev,
            EmotionLog.created_at < start_current
        )
        .all()
    )
    
    db.close()
    
    def get_dist(data):
        if not data:
            return {}
        # Apply normalization to ensure parity
        normalized_emotions = [EMOTION_MAP.get(l.emotion.lower(), l.emotion.lower()) for l in data]
        counts = Counter(normalized_emotions)
        total = len(data)
        return {k: v / total for k, v in counts.items()}

    return {
        "current": get_dist(current_logs),
        "previous": get_dist(prev_logs),
        "meta": {
            "current_count": len(current_logs),
            "previous_count": len(prev_logs)
        }
    }

# -----------------------------
# Advanced Analytics (Elite Dashboard)
# -----------------------------
@app.get("/analytics/advanced")
def advanced_analytics(current_user: User = Depends(get_current_user)):
    db = SessionLocal()
    try:
        from ml.dialogue_manager import manager as dm
        state = dm.get_state(current_user.id)
        
        # 1. Hidden Emotion Score (Contradictions)
        # For simplicity in MVP, we look if there's an active contradiction
        has_contradiction = bool(state.get("contradiction"))
        hidden_score = 85 if has_contradiction else 15
        
        # 2. Mood Stability Index
        volatility = state.get("volatility", 0.0)
        stability_index = round((1.0 - volatility) * 100)
        
        # 3. Emotional Recovery Rate (How fast they return to neutral/joy from distress)
        # Approximation based on stability
        recovery_rate = round(min(100, 40 + (stability_index * 0.5)))
        
        # 4. Repeated Topic Cloud
        topics = ["Work Stress", "Relationship", "Sleep Anxiety", "Future", "Overthinking"]
        # In a real app, extracted from ChromaDB/LLM
        import random
        # Just random subset for visual for now
        
        # 5. Most Frequent Trigger
        trigger = "Lack of Sleep" if hidden_score > 50 else "Work Deadlines"
        
        return {
            "recovery_rate": f"{recovery_rate}%",
            "frequent_trigger": trigger,
            "hidden_emotion_score": f"{hidden_score}/100",
            "mood_stability": f"{stability_index}%",
            "topics": topics
        }
    finally:
        db.close()
