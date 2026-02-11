from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from collections import Counter
from datetime import datetime, timedelta

from routes.report_routes import router as report_router
from api.routes import auth
from ml.inference import predict_emotion
from db.database import SessionLocal
from db.models import EmotionLog, FaceEmotionLog, DriftAlert, User
from db.init_db import init_db
from analysis.drift import detect_emotion_drift
from api.deps import get_current_user


# -----------------------------
# SINGLE FastAPI APP
# -----------------------------
app = FastAPI(title="Emotion Drift API")

app.include_router(report_router)
app.include_router(auth.router)
from api.routes import chat_routes
app.include_router(chat_routes.router)
from routes import self_emotion_routes
app.include_router(self_emotion_routes.router)
from routes import fusion_routes
app.include_router(fusion_routes.router)
from api.routes import support_routes
app.include_router(support_routes.router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# -----------------------------
# Models
# -----------------------------
class TextRequest(BaseModel):
    text: str


# -----------------------------
# Startup
# -----------------------------
@app.on_event("startup")
def startup():
    init_db()


# -----------------------------
# Health
# -----------------------------
@app.get("/")
def health():
    return {"status": "ok"}


# -----------------------------
# Prediction
# -----------------------------
@app.post("/predict")
def predict(req: TextRequest, current_user: User = Depends(get_current_user)):
    result = predict_emotion(req.text)

    db = SessionLocal()
    log = EmotionLog(
        user_id=current_user.id,
        text=req.text,
        emotion=result["emotion"],
        confidence=result["confidence"]
    )
    db.add(log)
    db.commit()
    db.close()

    return result


# -----------------------------
# Timeline
# -----------------------------
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
    
    db.close()

    # Combine
    combined = []
    for l in text_logs:
        combined.append({
            "timestamp": l.created_at,
            "emotion": l.emotion,
            "confidence": l.confidence,
            "source": "text"
        })
    for l in face_logs:
        combined.append({
            "timestamp": l.timestamp,
            "emotion": l.emotion,
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

    all_emotions = [l.emotion for l in text_logs] + [l.emotion for l in face_logs]
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
        combined.append({"t": l.created_at, "e": l.emotion})
    for l in face_logs:
        combined.append({"t": l.timestamp, "e": l.emotion})
    
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
    return result


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
        counts = Counter([l.emotion for l in data])
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
