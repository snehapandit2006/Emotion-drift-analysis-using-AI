from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile, Form
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime, timedelta, timezone
import speech_recognition as sr
import io

from db.database import get_db
from db.models import User, EmotionLog, FaceEmotionLog, MedicalEntry
from api.deps import get_current_psychiatrist
from schemas import PatientList
from analysis.fusion import analyze_fusion
from analysis.condition_detection import detect_conditions
from ml.llm_bridge import handle_doctor_voice_query

router = APIRouter(prefix="/doctor", tags=["doctor"])

class DoctorQueryRequest(BaseModel):
    query: str

from fastapi import Request

@router.post("/bot/query")
async def doctor_bot_query(
    request: Request,
    audio: UploadFile = File(...),
    current_user: User = Depends(get_current_psychiatrist),
    db: Session = Depends(get_db)
):
    """Voice query layer for Doctor dashboard"""
    form_data = await request.form()
    context_patient_id = form_data.get("context_patient_id")
    text = form_data.get("text")

    if not text:
        return {"routing_type": "INFORMATION_RESPONSE", "summary": "Could not understand the audio. Please try again."}
    
    print(f"Doctor Voice Query Transcribed (Client-Side): {text}")
    
    context_patient_id_int = int(context_patient_id) if context_patient_id and context_patient_id != "null" else None

    # Pass the transcribed text to the deterministic logic
    response_text = handle_doctor_voice_query(text, db, current_user.id, context_patient_id=context_patient_id_int)

    # Optional implicit routing: if the response mentions a specific patient, we can route there
    # Quick hack to extract patient ID from query for routing, since logic doesn't return ID explicitly
    import re
    action_payload = None
    routing_type = "INFORMATION_RESPONSE"
    
    pt_match = re.search(r'patient\s+(\d+)', text.lower())
    patient_id = int(pt_match.group(1)) if pt_match else context_patient_id_int
    
    # If the user asks for a trend or history and we have a patient ID, jump to that page.
    if patient_id and ("trend" in text.lower() or "summarize" in text.lower() or "summary" in text.lower() or "history" in text.lower()):
        routing_type = "ACTION_REQUIRED"
        action_payload = {"url": f"/doctor/patient/{patient_id}"}
    
    return {
        "routing_type": routing_type,
        "action_payload": action_payload,
        "summary": response_text
    }

class AssignPatientRequest(BaseModel):
    email: str

@router.get("/patients", response_model=List[PatientList])
def get_patients(
    current_user: User = Depends(get_current_psychiatrist),
    db: Session = Depends(get_db)
):
    patients = db.query(User).filter(User.doctor_id == current_user.id).all()
    
    # Enrich with adherence data
    patient_data = []
    cutoff = datetime.utcnow() - timedelta(days=7)
    
    for p in patients:
        # Calculate missed meds in last 7 days
        entries = db.query(MedicalEntry).filter(
            MedicalEntry.user_id == p.id,
            MedicalEntry.created_at >= cutoff
        ).all()
        
        total = len(entries)
        missed = sum(1 for e in entries if not e.taken)
        taken = total - missed
        adherence = (taken / total * 100) if total > 0 else 100.0 # Default to 100 if no logs? or 0? Let's say 0 if no logs but that might look bad. 
        # Actually if no logs, maybe adherence isn't relevant. Let's use 0.0 but missed_count is the key alert.
        if total == 0:
            adherence = 0.0
            
        # We need to construct a dict/object that matches PatientList schema
        # Since PatientList inherits from User, we can dump the user model and add fields
        p_dict = {
            "id": p.id,
            "email": p.email,
            "role": p.role,
            "is_active": p.is_active,
            "doctor_id": p.doctor_id,
            "created_at": p.created_at,
            "missed_count": missed,
            "adherence_rate": round(adherence, 1)
        }
        patient_data.append(p_dict)
        
    return patient_data

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
        
        # 1. Fetch recent alerts
        from db.models import DriftAlert
        recent_alerts = db.query(DriftAlert).filter(
            DriftAlert.user_id == patient_id, 
            DriftAlert.created_at >= cutoff
        ).order_by(DriftAlert.created_at.desc()).limit(5).all()
        
        # 2. Extract latest instant risk if available
        # Need to parse message JSON
        import json
        alerts_out = []
        for a in recent_alerts:
            try:
                payload = json.loads(a.message)
                alerts_out.append(payload)
            except:
                level = "LOW"
                if a.severity >= 0.6:
                    level = "HIGH"
                elif a.severity >= 0.3:
                    level = "MEDIUM"
                
                alerts_out.append({
                    "type": "LEGACY_ALERT",
                    "score": a.severity,
                    "level": level,
                    "timestamp": a.created_at.isoformat()
                })
                
        # To show the gauge, we can calculate instant_risk of the latest text log
        from analysis.drift import extract_stress, calculate_instant_risk
        latest_text_log = db.query(EmotionLog).filter(EmotionLog.user_id == patient.id).order_by(EmotionLog.created_at.desc()).first()
        current_instant_risk = 0.0
        if latest_text_log:
            st = extract_stress(latest_text_log)
            sa = latest_text_log.confidence if latest_text_log.emotion == 'sadness' else 0.0
            an = latest_text_log.confidence if latest_text_log.emotion == 'anger' else 0.0
            current_instant_risk = calculate_instant_risk(st, sa, an)

        # Fallback: if calculated risk is 0 but we have a severe alert, reflect the alert's severity
        if current_instant_risk == 0.0 and len(alerts_out) > 0:
            current_instant_risk = float(alerts_out[0].get("score", 0.0))
        
        # We also need stress trend (last 5 sessions) for the chart
        stress_trend_logs = db.query(EmotionLog).filter(EmotionLog.user_id == patient.id).order_by(EmotionLog.created_at.desc()).limit(5).all()
        stress_trend = []
        for l in reversed(stress_trend_logs):
            stress_trend.append({
                "time": l.created_at.strftime("%H:%M"),
                "stress": round(extract_stress(l) * 100, 1),
                "emotion": l.emotion
            })
            
        return {
            "patient_email": patient.email,
            "analysis_period_days": days,
            "severity": severity_info,
            "active_alerts": alerts_out,
            "current_instant_risk": round(current_instant_risk, 3),
            "stress_trend": stress_trend,
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
