from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timedelta
from sqlalchemy import func

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
        from_attributes = True

@router.post("/capture", response_model=EmotionCaptureResponse)
def capture_emotion(
    request: EmotionCaptureRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Unified face capture using the Sentia Hub.
    """
    from ml.inference import get_sentia_intelligence
    # Note: We pass source="face" and let the hub handle the FaceEmotionAnalyzer call internally or via text placeholder if needed.
    # For now, we'll keep the analyst call but force the HUB for mapping and logging parity.
    result = FaceEmotionAnalyzer.analyze_face(request.image)
    
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])

    # 2. Use Hub for Mapping and Parity
    from ml.inference import get_canonical_emotion
    canon_e = get_canonical_emotion(result["emotion"])
    
    # 3. Save to FaceLog (Unified)
    new_log = FaceEmotionLog(
        user_id=current_user.id,
        emotion=canon_e,
        confidence=result["confidence"],
        timestamp=datetime.utcnow()
    )
    db.add(new_log)
    db.commit()
    db.refresh(new_log)
    
    # Check for alerts
    try:
        from analysis.drift import check_and_create_alert
        check_and_create_alert(db, current_user.id)
    except Exception as e:
        print(f"Error checking alerts: {e}")

    return {
        "emotion": new_log.emotion,
        "confidence": new_log.confidence,
        "timestamp": new_log.timestamp
    }

@router.get("/history", response_model=list[HistoryResponse])
def get_history(
    range: str = "7d",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    now = datetime.utcnow()
    cutoff_date = now - timedelta(days=7)
    if range == "1h": cutoff_date = now - timedelta(hours=1)
    elif range == "24h": cutoff_date = now - timedelta(hours=24)
    elif range == "30d": cutoff_date = now - timedelta(days=30)
    elif range == "all": cutoff_date = datetime.min

    logs = db.query(FaceEmotionLog)\
        .filter(FaceEmotionLog.user_id == current_user.id, FaceEmotionLog.timestamp >= cutoff_date)\
        .order_by(FaceEmotionLog.timestamp.asc())\
        .all()
    
    # Parity check: Labels are already canonical in DB
    return [{"timestamp": l.timestamp, "emotion": l.emotion, "confidence": l.confidence} for l in logs]

@router.get("/distribution")
def get_distribution(
    range: str = "7d",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    now = datetime.utcnow()
    cutoff_date = now - timedelta(days=7)
    if range == "1h": cutoff_date = now - timedelta(hours=1)
    elif range == "24h": cutoff_date = now - timedelta(hours=24)
    elif range == "30d": cutoff_date = now - timedelta(days=30)
    elif range == "all": cutoff_date = datetime.min

    results = db.query(FaceEmotionLog.emotion, func.count(FaceEmotionLog.emotion))\
        .filter(FaceEmotionLog.user_id == current_user.id, FaceEmotionLog.timestamp >= cutoff_date)\
        .group_by(FaceEmotionLog.emotion).all()

    counts = {emotion: count for emotion, count in results}
    total = sum(counts.values())
    if total > 0:
        return {k: v / total for k, v in counts.items()}
    return {}
