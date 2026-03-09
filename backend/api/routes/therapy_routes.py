from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

from db.database import get_db
from db.models import User, PrescribedTherapy
from api.deps import get_current_user, get_current_psychiatrist
from schemas import PrescribedTherapySchema, PrescribedTherapyCreate

router = APIRouter(prefix="/therapy", tags=["therapy"])

@router.get("/{patient_id}", response_model=List[PrescribedTherapySchema])
def get_patient_therapies(
    patient_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Ensure current user is the patient or the patient's doctor
    if current_user.role == "patient" and current_user.id != patient_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    if current_user.role == "psychiatrist":
        patient = db.query(User).filter(User.id == patient_id).first()
        if not patient or patient.doctor_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to view this patient")

    therapies = db.query(PrescribedTherapy).filter(
        PrescribedTherapy.user_id == patient_id,
        PrescribedTherapy.is_active == True
    ).order_by(PrescribedTherapy.prescribed_at.desc()).all()
    
    return therapies

@router.post("/prescribe", response_model=PrescribedTherapySchema)
def prescribe_therapy(
    payload: PrescribedTherapyCreate,
    current_doc: User = Depends(get_current_psychiatrist),
    db: Session = Depends(get_db)
):
    patient = db.query(User).filter(User.id == payload.user_id).first()
    if not patient or patient.doctor_id != current_doc.id:
        raise HTTPException(status_code=403, detail="Not authorized to prescribe to this patient")

    new_therapy = PrescribedTherapy(
        user_id=payload.user_id,
        therapy_type=payload.therapy_type,
        name=payload.name,
        description=payload.description,
        duration_minutes=payload.duration_minutes,
        frequency_hz=payload.frequency_hz,
        is_active=True
    )
    db.add(new_therapy)
    db.commit()
    db.refresh(new_therapy)
    return new_therapy
