from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

from db.models import User, MeditationLog
from db.database import get_db
from api.deps import get_current_user
from schemas import MeditationLogSchema, MeditationLogCreate
from ml.media_expert import get_recommendations
from db.models import EmotionLog

router = APIRouter(prefix="/wellness", tags=["wellness"])

@router.post("/meditation", response_model=MeditationLogSchema)
def log_meditation(
    payload: MeditationLogCreate, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    db_log = MeditationLog(
        user_id=current_user.id,
        duration_seconds=payload.duration_seconds,
        session_type=payload.session_type,
        completed_at=datetime.utcnow()
    )
    db.add(db_log)
    db.commit()
    db.refresh(db_log)
    return db_log

@router.get("/meditation", response_model=List[MeditationLogSchema])
def get_meditation_history(
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    return db.query(MeditationLog).filter(MeditationLog.user_id == current_user.id).all()

@router.get("/media")
def get_media_recommendations(
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    """
    Fetches media recommendations based on the user's latest emotional state.
    """
    # Get last emotion from logs
    latest_log = db.query(EmotionLog).filter(EmotionLog.user_id == current_user.id).order_by(EmotionLog.created_at.desc()).first()
    emotion = latest_log.emotion if latest_log else "neutral"
    
    return get_recommendations(emotion, interests=current_user.music_interests)
