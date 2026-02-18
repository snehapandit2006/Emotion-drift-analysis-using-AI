from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel
from datetime import datetime, timedelta, timezone

from db.database import get_db
from db.models import User, EmotionLog, FaceEmotionLog
from api.deps import get_current_psychiatrist
from schemas import PatientList
from analysis.fusion import analyze_fusion
from analysis.condition_detection import detect_conditions

router = APIRouter(prefix="/doctor", tags=["doctor"])

class AssignPatientRequest(BaseModel):
    email: str

@router.get("/patients", response_model=List[PatientList])
def get_patients(
    current_user: User = Depends(get_current_psychiatrist),
    db: Session = Depends(get_db)
):
    patients = db.query(User).filter(User.doctor_id == current_user.id).all()
    return patients

@router.post("/assign")
def assign_patient(
    payload: AssignPatientRequest,
    current_user: User = Depends(get_current_psychiatrist),
    db: Session = Depends(get_db)
):
    patient = db.query(User).filter(User.email == payload.email).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    if patient.role == "psychiatrist":
         raise HTTPException(status_code=400, detail="Cannot assign another psychiatrist as patient")
    
    # Verify not already assigned to someone else? For now, allow stealing/reassigning or check.
    # if patient.doctor_id and patient.doctor_id != current_user.id:
    #    ...
    
    patient.doctor_id = current_user.id
    db.commit()
    return {"msg": f"Patient {patient.email} assigned to you."}

@router.get("/patient/{patient_id}/insights")
def get_patient_insights(
    patient_id: int,
    days: int = 14,
    current_user: User = Depends(get_current_psychiatrist),
    db: Session = Depends(get_db)
):
    patient = db.query(User).filter(User.id == patient_id).first()
    if not patient:
         print(f"DEBUG: Patient {patient_id} not found")
         raise HTTPException(status_code=404, detail="Patient not found")
    
    print(f"DEBUG: Access check - Patient Doctor: {patient.doctor_id}, Current Doc: {current_user.id}")
    if patient.doctor_id != current_user.id:
         print("DEBUG: Access denied")
         raise HTTPException(status_code=403, detail="Not authorized to view this patient")
         
    # Reuse analysis logic
    # Use naive UTC to match database defaults
    cutoff = datetime.utcnow() - timedelta(days=days)
    
    recent_text = (
        db.query(EmotionLog)
        .filter(EmotionLog.user_id == patient.id, EmotionLog.created_at >= cutoff)
        .all()
    )
    
    recent_face = (
        db.query(FaceEmotionLog)
        .filter(FaceEmotionLog.user_id == patient.id, FaceEmotionLog.timestamp >= cutoff)
        .all()
    )
    
    try:
        fusion_result = analyze_fusion(recent_text, recent_face, range_days=days)
        severity_info = fusion_result.get("severity", {})
        stability = fusion_result.get("stability_score", 1.0)
        detected_conditions = detect_conditions(recent_text, recent_face, stability)
        
        return {
            "patient_email": patient.email,
            "analysis_period_days": days,
            "severity": severity_info,
            "detected_conditions": detected_conditions,
            "fusion": fusion_result,
            "stats": {
                "text_logs_count": len(recent_text),
                "face_logs_count": len(recent_face)
            }
        }
    except Exception as e:
        print(f"DEBUG: Error in analysis: {str(e)}")
        # Raise 500 so frontend knows it failed
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@router.get("/patient/{patient_id}/logs")
def get_patient_logs(
    patient_id: int,
    limit: int = 50,
    current_user: User = Depends(get_current_psychiatrist),
    db: Session = Depends(get_db)
):
    patient = db.query(User).filter(User.id == patient_id).first()
    if not patient:
         raise HTTPException(status_code=404, detail="Patient not found")
    
    if patient.doctor_id != current_user.id:
         raise HTTPException(status_code=403, detail="Not authorized to view this patient")

    text_logs = (
        db.query(EmotionLog)
        .filter(EmotionLog.user_id == patient.id)
        .order_by(EmotionLog.created_at.desc())
        .limit(limit)
        .all()
    )

    face_logs = (
        db.query(FaceEmotionLog)
        .filter(FaceEmotionLog.user_id == patient.id)
        .order_by(FaceEmotionLog.timestamp.desc())
        .limit(limit)
        .all()
    )
    
    return {
        "text_logs": [
            {
                "id": l.id,
                "text": l.text,
                "emotion": l.emotion,
                "confidence": l.confidence,
                "created_at": l.created_at
            }
            for l in text_logs
        ],
        "face_logs": [
            {
                "id": l.id,
                "emotion": l.emotion,
                "confidence": l.confidence,
                "timestamp": l.timestamp
            }
            for l in face_logs
        ]
    }
