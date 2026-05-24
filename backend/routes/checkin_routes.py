from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
import pandas as pd
from scipy.stats import pearsonr

# Core database and schema dependencies
from db.database import get_db 
from db.models import DailyCheckIn
import schemas

# Initialize API router for Check-In operations
router = APIRouter(prefix="/api/checkin", tags=["Daily Check-In & Analytics"])

# 1. Endpoint to process and store daily check-in data
@router.post("/", response_model=schemas.DailyCheckInResponse)
def create_checkin(checkin_data: schemas.DailyCheckInCreate, db: Session = Depends(get_db)):
    """
    Persists user's daily check-in metrics (mood, sleep, triggers) into the database.
    Designed to seamlessly handle rapid inputs from the frontend flow.
    """
    try:
        new_checkin = DailyCheckIn(
            user_id=1,  # TODO: Replace hardcoded user_id with dynamic authenticated user session
            date=datetime.utcnow().date(),
            mood_level=checkin_data.mood_level,
            sleep_hours=checkin_data.sleep_hours,
            sleep_quality=checkin_data.sleep_quality,
            triggers=checkin_data.triggers,
            created_at=datetime.utcnow()
        )
        db.add(new_checkin)
        db.commit()
        db.refresh(new_checkin)
        return new_checkin
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

# 2. Analytics Engine: Calculate correlation between sleep and mood
@router.get("/analytics")
def get_correlation_analytics(db: Session = Depends(get_db)):
    """
    Analyzes historical check-in data utilizing SciPy's Pearson correlation 
    to map relationships between physical states (sleep) and emotional baseline shifts.
    """
    # Fetch historical check-in records
    checkins = db.query(DailyCheckIn).all()
    
    if len(checkins) < 2:
        return {"message": "Insufficient data. A minimum of 2 check-ins is required to establish a correlation baseline."}

    # Transform records into a Pandas DataFrame for robust statistical analysis
    data = [{"mood": c.mood_level, "sleep": c.sleep_hours} for c in checkins]
    df = pd.DataFrame(data)

    # Compute Pearson correlation coefficient and p-value
    correlation, p_value = pearsonr(df["sleep"], df["mood"])

    # Generate actionable insights based on correlation variance
    if correlation > 0.5:
        insight = "Strong positive correlation: Adequate sleep duration significantly elevates your emotional baseline."
    elif correlation < -0.5:
        insight = "Strong negative correlation: Fluctuations in sleep drastically impact your mood stability."
    else:
        insight = "Weak correlation: Your emotional shifts appear statistically independent of your sleep duration."

    return {
        "correlation_score": round(correlation, 2),
        "insight": insight,
        "total_data_points": len(df)
    }