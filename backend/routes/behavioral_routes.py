from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

from db.database import get_db
from db.models import EmotionLog, User
from api.deps import get_current_user
from analysis.behavioral_analytics import get_behavioral_summary

router = APIRouter(
    prefix="/analysis/behavioral",
    tags=["behavioral"]
)

@router.get("/summary")
def get_behavioral_metrics(
    window: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns advanced clinical metrics: Volatility, Baseline Shift, and Recovery Time.
    """
    cutoff = datetime.utcnow() - timedelta(days=14)
    
    logs = db.query(EmotionLog).filter(
        EmotionLog.user_id == current_user.id,
        EmotionLog.created_at >= cutoff
    ).order_by(EmotionLog.created_at.asc()).all()
    
    # Format for analytics module
    formatted_logs = [
        {"e": l.emotion, "t": l.created_at} for l in logs
    ]
    
    return get_behavioral_summary(formatted_logs, window)
