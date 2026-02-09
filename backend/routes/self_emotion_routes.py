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

@router.get("/history", response_model=list[HistoryResponse])
def get_history(
    range: str = "7d",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns the user's emotion history (face only) for the requested range.
    """
    # Simple range logic (default to returning all or last N for now if range parsing is complex)
    # For now, let's just return the last 100 entries to correspond with "recent history"
    # Detailed range filtering can be added in Phase 3 if needed.
    
    logs = db.query(FaceEmotionLog)\
        .filter(FaceEmotionLog.user_id == current_user.id)\
        .order_by(FaceEmotionLog.timestamp.desc())\
        .limit(100)\
        .all()
    
    return logs
