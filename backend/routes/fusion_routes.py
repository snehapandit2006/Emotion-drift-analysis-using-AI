from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

from db.database import get_db
from db.models import EmotionLog, FaceEmotionLog, User
from api.deps import get_current_user
from analysis.fusion import analyze_fusion

router = APIRouter(
    prefix="/analysis",
    tags=["analysis"]
)

@router.get("/fusion")
def get_fusion_analytics(
    range_days: int = 7,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns fusion analytics (alignment, masking, stability) for the given range.
    """
    # Fetch logs
    cutoff = datetime.utcnow() - timedelta(days=range_days)
    
    text_logs = db.query(EmotionLog).filter(
        EmotionLog.user_id == current_user.id,
        EmotionLog.created_at >= cutoff
    ).all()
    
    face_logs = db.query(FaceEmotionLog).filter(
        FaceEmotionLog.user_id == current_user.id,
        FaceEmotionLog.timestamp >= cutoff
    ).all()
    
    # Analyze
    result = analyze_fusion(text_logs, face_logs, range_days)
    
    return result
