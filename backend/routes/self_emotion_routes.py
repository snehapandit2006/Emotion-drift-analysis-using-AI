from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from db.database import get_db
from db.models import FaceEmotionLog, User
from api.deps import get_current_user
from inference.face_emotion import FaceEmotionAnalyzer

router = APIRouter(
    prefix="/self-emotion",
    tags=["self-emotion"]
)

class EmotionCaptureRequest(BaseModel):
    image: str # Base64 string

class EmotionCaptureResponse(BaseModel):
    emotion: str
    confidence: float
    timestamp: datetime

class HistoryResponse(BaseModel):
    timestamp: datetime
    emotion: str
    confidence: float

    class Config:
        orm_mode = True

@router.post("/capture", response_model=EmotionCaptureResponse)
def capture_emotion(
    request: EmotionCaptureRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Receives a webcam snapshot (Base64), runs face emotion inference,
    saves the result to the database, and returns the detected emotion.
    The image itself is NOT stored.
    """
    # 1. Run Inference
    result = FaceEmotionAnalyzer.analyze_face(request.image)
    
    if "error" in result:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result["error"]
        )

    # 2. Save to DB
    new_log = FaceEmotionLog(
        user_id=current_user.id,
        emotion=result["emotion"],
        confidence=result["confidence"],
        timestamp=datetime.utcnow()
    )
    db.add(new_log)
    db.commit()
    db.refresh(new_log)

    return {
        "emotion": new_log.emotion,
        "confidence": new_log.confidence,
        "timestamp": new_log.timestamp
    }

from datetime import datetime, timedelta
from sqlalchemy import func

@router.get("/history", response_model=list[HistoryResponse])
def get_history(
    range: str = "7d",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns the user's emotion history (face only) for the requested range.
    Range options: "1h", "24h", "7d", "30d", "all"
    """
    now = datetime.utcnow()
    cutoff_date = now - timedelta(days=7) # Default

    if range == "1h":
        cutoff_date = now - timedelta(hours=1)
    elif range == "24h":
        cutoff_date = now - timedelta(hours=24)
    elif range == "30d":
        cutoff_date = now - timedelta(days=30)
    elif range == "all":
        cutoff_date = datetime.min

    logs = db.query(FaceEmotionLog)\
        .filter(
            FaceEmotionLog.user_id == current_user.id,
            FaceEmotionLog.timestamp >= cutoff_date
        )\
        .order_by(FaceEmotionLog.timestamp.asc())\
        .all()
    
    # Normalize
    EMOTION_MAP = {
        "angry": "anger",
        "disgust": "anger", 
        "sad": "sadness",
        "joy": "happy",
        "happines": "happy"
    }
    
    normalized_logs = []
    for log in logs:
        # Create a dict or copy to avoiding mutation issues if attached to session
        # Pydantic response model will handle dict conversion
        raw_e = log.emotion
        if raw_e: raw_e = raw_e.lower()
        
        normalized_logs.append({
            "timestamp": log.timestamp,
            "emotion": EMOTION_MAP.get(raw_e, raw_e),
            "confidence": log.confidence
        })

    return normalized_logs

@router.get("/distribution")
def get_distribution(
    range: str = "7d",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns the percentage distribution of emotions for the given timeframe.
    """
    now = datetime.utcnow()
    cutoff_date = now - timedelta(days=7) # Default

    if range == "1h":
        cutoff_date = now - timedelta(hours=1)
    elif range == "24h":
        cutoff_date = now - timedelta(hours=24)
    elif range == "30d":
        cutoff_date = now - timedelta(days=30)
    elif range == "all":
        cutoff_date = datetime.min

    # Query for distribution
    # We can do this with a group_by query for efficiency
    results = db.query(
        FaceEmotionLog.emotion, 
        func.count(FaceEmotionLog.emotion)
    ).filter(
        FaceEmotionLog.user_id == current_user.id,
        FaceEmotionLog.timestamp >= cutoff_date
    ).group_by(FaceEmotionLog.emotion).all()

    # Convert to dictionary and calculate percentages
    # Normalize keys while aggregating
    EMOTION_MAP = {
        "angry": "anger",
        "disgust": "anger", 
        "sad": "sadness",
        "joy": "happy",
        "happines": "happy"
    }

    counts = {}
    for emotion, count in results:
        raw_e = emotion
        if raw_e: raw_e = raw_e.lower()
        
        norm_e = EMOTION_MAP.get(raw_e, raw_e)
        counts[norm_e] = counts.get(norm_e, 0) + count

    total = sum(counts.values())
    
    distribution = {}
    if total > 0:
        distribution = {k: v / total for k, v in counts.items()}
    
    return distribution
