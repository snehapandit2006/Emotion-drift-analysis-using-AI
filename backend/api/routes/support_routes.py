from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

from db.database import get_db
from db.models import User, EmotionLog, FaceEmotionLog
from api.deps import get_current_user
from analysis.fusion import analyze_fusion

router = APIRouter(prefix="/support-insights", tags=["support"])

TELE_MANAS_INFO = {
    "name": "Tele-MANAS (Mental Health Helpline)",
    "phone": "14416",
    "hours": "24x7",
    "description": "Free, confidential mental health support from the Govt. of India.",
    "is_emergency": False
}

@router.get("/")
def get_support_insights(
    days: int = 14,
    include_nearby: bool = False,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns emotional severity analysis and support resources.
    Does NOT provide medical diagnosis.
    """
    
    # ... (existing fetching logic)
    cutoff = datetime.utcnow() - timedelta(days=days)
    
    recent_text = (
        db.query(EmotionLog)
        .filter(EmotionLog.user_id == current_user.id, EmotionLog.created_at >= cutoff)
        .all()
    )
    
    recent_face = (
        db.query(FaceEmotionLog)
        .filter(FaceEmotionLog.user_id == current_user.id, FaceEmotionLog.timestamp >= cutoff)
        .all()
    )
    
    # 2. Run Analysis
    fusion_result = analyze_fusion(recent_text, recent_face, range_days=days)
    severity_info = fusion_result.get("severity", {})
    
    nearby_help = []
    if include_nearby:
        # Mock Data for demo purposes
        nearby_help = [
            {
                "name": "Dr. Anjali Sharma, PhD",
                "clinic": "MindWell Clinic",
                "distance": "2.4 km",
                "contact": "011-23456789",
                "map_link": "https://maps.google.com/?q=MindWell+Clinic"
            },
            {
                "name": "City Mental Health Center",
                "clinic": "Govt. Hospital Wing A",
                "distance": "4.1 km",
                "contact": "011-98765432",
                "map_link": "https://maps.google.com/?q=City+Mental+Health+Center"
            }
        ]
    
    # 3. Construct Response
    response = {
        "analysis_period_days": days,
        "severity": severity_info,
        "resources": {
            "tele_manas": TELE_MANAS_INFO,
            "nearby_help": nearby_help,
            "guidance_text": [
                "Speaking to a trained professional can help you navigate difficult emotions.",
                "These insights are based on observed patterns, not a medical diagnosis."
            ]
        }
    }
    
    return response
