from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from pydantic import BaseModel
from typing import List, Optional

from db.database import SessionLocal
from db.models import User, HealthMetric
from api.deps import get_current_user

router = APIRouter(prefix="/fitness", tags=["Fitness"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class HealthMetricCreate(BaseModel):
    heart_rate: Optional[float] = None
    spo2: Optional[float] = None
    blood_pressure_systolic: Optional[float] = None
    blood_pressure_diastolic: Optional[float] = None
    source: Optional[str] = "manual"

@router.post("/metrics")
def add_health_metric(
    metric: HealthMetricCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Manually add or sync a health metric entry (heart rate, SpO2, etc).
    """
    new_metric = HealthMetric(
        user_id=current_user.id,
        heart_rate=metric.heart_rate,
        spo2=metric.spo2,
        blood_pressure_systolic=metric.blood_pressure_systolic,
        blood_pressure_diastolic=metric.blood_pressure_diastolic,
        source=metric.source,
        timestamp=datetime.utcnow()
    )
    db.add(new_metric)
    db.commit()
    db.refresh(new_metric)
    return {"status": "success", "id": new_metric.id}

@router.get("/metrics/history")
def get_health_history(
    range: str = "7d",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get the historical health metrics for the dashboard charts.
    """
    now = datetime.utcnow()
    delta_map = {
        "24h": timedelta(hours=24),
        "7d": timedelta(days=7),
        "30d": timedelta(days=30),
    }
    
    delta = delta_map.get(range, timedelta(days=7))
    start_time = now - delta
    
    metrics = (
        db.query(HealthMetric)
        .filter(
            HealthMetric.user_id == current_user.id,
            HealthMetric.timestamp >= start_time
        )
        .order_by(HealthMetric.timestamp.asc())
        .all()
    )
    
    return [
        {
            "id": m.id,
            "heart_rate": m.heart_rate,
            "spo2": m.spo2,
            "blood_pressure_systolic": m.blood_pressure_systolic,
            "blood_pressure_diastolic": m.blood_pressure_diastolic,
            "source": m.source,
            "timestamp": m.timestamp.isoformat() + "Z"
        }
        for m in metrics
    ]

@router.get("/metrics/latest")
def get_latest_metrics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get the most recent health metrics to display on the dashboard summary.
    """
    latest = (
        db.query(HealthMetric)
        .filter(HealthMetric.user_id == current_user.id)
        .order_by(HealthMetric.timestamp.desc())
        .first()
    )
    
    if not latest:
        return None
        
    return {
        "heart_rate": latest.heart_rate,
        "spo2": latest.spo2,
        "blood_pressure_systolic": latest.blood_pressure_systolic,
        "blood_pressure_diastolic": latest.blood_pressure_diastolic,
        "timestamp": latest.timestamp.isoformat() + "Z"
    }

@router.post("/sync/google_fit/mock")
def mock_google_fit_sync(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Simulates fetching data from Google Fit for demonstration purposes.
    Generates realistic looking heart rate data for the last 24 hours.
    """
    import random
    
    # Check if we already have recent mock data
    now = datetime.utcnow()
    recent = db.query(HealthMetric).filter(
        HealthMetric.user_id == current_user.id,
        HealthMetric.source == "google_fit_mock",
        HealthMetric.timestamp >= now - timedelta(hours=1)
    ).first()
    
    if recent:
        return {"status": "success", "message": "Already synced recently."}
        
    # Generate 12 data points over the last 24 hours
    for i in range(12, 0, -1):
        timestamp = now - timedelta(hours=i*2)
        
        # Base resting HR around 65-75, with some variance
        base_hr = random.uniform(65, 80)
        
        # Occasionally spike for stress/exercise
        if random.random() > 0.8:
            base_hr += random.uniform(20, 50)
            
        metric = HealthMetric(
            user_id=current_user.id,
            heart_rate=round(base_hr),
            spo2=random.choice([97, 98, 99]),
            source="google_fit_mock",
            timestamp=timestamp
        )
        db.add(metric)
        
    db.commit()
    return {"status": "success", "message": "Synchronized 12 new data points from Google Fit (Mock)."}
