from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from pydantic import BaseModel
from typing import List, Optional

from db.database import SessionLocal
from db.models import User, HealthMetric, VitalAlert
from api.deps import get_current_user
from analysis.vital_analyzer import analyze_vitals
from core.config import settings
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from google.auth.transport.requests import Request as GoogleRequest

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
    # Fetch previous metric for fluctuation comparison
    prev_metric = (
        db.query(HealthMetric)
        .filter(HealthMetric.user_id == current_user.id)
        .order_by(HealthMetric.timestamp.desc())
        .first()
    )

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

    # Analyze for alerts
    raw_alerts = analyze_vitals(new_metric, prev_metric)
    saved_alerts = []
    for a in raw_alerts:
        alert = VitalAlert(user_id=current_user.id, **a)
        db.add(alert)
        saved_alerts.append(a)
    if raw_alerts:
        db.commit()

    return {"status": "success", "id": new_metric.id, "alerts_raised": len(saved_alerts)}

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

@router.post("/sync/google_fit")
def sync_google_fit(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Fetches real health data from the Google Fit API.
    """
    if not current_user.google_refresh_token:
        raise HTTPException(status_code=400, detail="Google Fit not connected. Please authorize first.")

    # 1. Refresh credentials
    creds = Credentials(
        None, # No access token needed yet, will refresh
        refresh_token=current_user.google_refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=settings.GOOGLE_CLIENT_ID,
        client_secret=settings.GOOGLE_CLIENT_SECRET
    )
    
    try:
        creds.refresh(GoogleRequest())
    except Exception as e:
        print(f"Token refresh failed: {e}")
        raise HTTPException(status_code=401, detail="Google authorization expired. Please reconnect.")

    # 2. Build service
    service = build('fitness', 'v1', credentials=creds)
    
    # Define timeframe (last 24 hours)
    now = datetime.utcnow()
    start_time = now - timedelta(hours=24)
    # Fitness API uses nanoseconds
    start_ns = int(start_time.timestamp() * 1e9)
    end_ns = int(now.timestamp() * 1e9)
    dataset_id = f"{start_ns}-{end_ns}"

    # 3. Fetch Heart Rate
    data_source = "derived:com.google.heart_rate.bpm:com.google.android.gms:merge_heart_rate_bpm"
    new_metrics_count = 0
    
    try:
        dataset = service.users().dataSources().datasets().get(
            userId='me', dataSourceId=data_source, datasetId=dataset_id
        ).execute()
        
        for point in dataset.get('point', []):
            ts = datetime.fromtimestamp(int(point['startTimeNanos']) / 1e9)
            val = point['value'][0]['fpVal']
            
            # Check if exists
            exists = db.query(HealthMetric).filter(
                HealthMetric.user_id == current_user.id,
                HealthMetric.timestamp == ts,
                HealthMetric.heart_rate == val
            ).first()
            
            if not exists:
                metric = HealthMetric(
                    user_id=current_user.id,
                    heart_rate=val,
                    source="google_fit",
                    timestamp=ts
                )
                db.add(metric)
                new_metrics_count += 1
        
        db.commit()
    except Exception as e:
        print(f"Error fetching HR: {e}")

    # 4. Analyze for alerts (similar to mock)
    # ... logic simplified for now ...
    
    return {
        "status": "success", 
        "message": f"Synchronized {new_metrics_count} new heart rate data points from Google Fit."
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

    # Re-query the newly inserted mock records in order, then analyze each one
    new_records = (
        db.query(HealthMetric)
        .filter(
            HealthMetric.user_id == current_user.id,
            HealthMetric.source == "google_fit_mock",
            HealthMetric.timestamp >= now - timedelta(hours=24)
        )
        .order_by(HealthMetric.timestamp.asc())
        .all()
    )
    prev_rec = None
    total_alerts = 0
    for rec in new_records:
        raw_alerts = analyze_vitals(rec, prev_rec)
        for a in raw_alerts:
            db.add(VitalAlert(user_id=current_user.id, **a))
            total_alerts += 1
        prev_rec = rec
    if total_alerts > 0:
        db.commit()

    return {
        "status": "success",
        "message": f"Synchronized 12 new data points from Google Fit (Mock). {total_alerts} vital alert(s) generated."
    }


# ─────────────────────────────────────────────────────────
# Alert Endpoints
# ─────────────────────────────────────────────────────────

@router.get("/alerts")
def get_vital_alerts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Return all unacknowledged vital alerts for the current user (most recent 20).
    """
    alerts = (
        db.query(VitalAlert)
        .filter(
            VitalAlert.user_id == current_user.id,
            VitalAlert.acknowledged == False  # noqa: E712
        )
        .order_by(VitalAlert.created_at.desc())
        .limit(20)
        .all()
    )
    return [
        {
            "id":             a.id,
            "metric":         a.metric,
            "value":          a.value,
            "prev_value":     a.prev_value,
            "alert_type":     a.alert_type,
            "severity":       a.severity,
            "message":        a.message,
            "recommendation": a.recommendation,
            "created_at":     a.created_at.isoformat() + "Z",
        }
        for a in alerts
    ]


@router.post("/alerts/{alert_id}/acknowledge")
def acknowledge_vital_alert(
    alert_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Mark a specific vital alert as acknowledged (dismissed by user).
    """
    alert = db.query(VitalAlert).filter(
        VitalAlert.id == alert_id,
        VitalAlert.user_id == current_user.id
    ).first()

    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    alert.acknowledged = True
    db.commit()
    return {"status": "acknowledged"}


@router.get("/alerts/doctor")
def get_patient_vital_alerts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Doctor-only: returns all unacknowledged vital alerts across assigned patients.
    """
    if current_user.role != "psychiatrist":
        raise HTTPException(status_code=403, detail="Access restricted to doctors.")

    # Get all patient IDs assigned to this doctor
    patient_ids = [p.id for p in current_user.patients]

    if not patient_ids:
        return []

    alerts = (
        db.query(VitalAlert, User)
        .join(User, VitalAlert.user_id == User.id)
        .filter(
            VitalAlert.user_id.in_(patient_ids),
            VitalAlert.acknowledged == False  # noqa: E712
        )
        .order_by(VitalAlert.created_at.desc())
        .limit(50)
        .all()
    )

    return [
        {
            "id":             a.id,
            "patient_email":  u.email,
            "patient_id":     u.id,
            "metric":         a.metric,
            "value":          a.value,
            "prev_value":     a.prev_value,
            "alert_type":     a.alert_type,
            "severity":       a.severity,
            "message":        a.message,
            "recommendation": a.recommendation,
            "created_at":     a.created_at.isoformat() + "Z",
        }
        for a, u in alerts
    ]
