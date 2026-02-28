from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List
import shutil
import os
from datetime import datetime
from db.database import get_db
from db.models import User, MedicalRecord
from api.deps import get_current_user
from datetime import datetime, timedelta

router = APIRouter(prefix="/medical", tags=["Medical Records"])

UPLOAD_DIR = "storage/medical_records"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/upload")
async def upload_medical_record(
    patient_id: int = None,
    file: UploadFile = File(...),
    description: str = Form(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Determine target user
    target_user_id = current_user.id
    
    if patient_id and patient_id != current_user.id:
        # Check if current_user is doctor of patient_id
        patient = db.query(User).filter(User.id == patient_id).first()
        if not patient:
            raise HTTPException(status_code=404, detail="Patient not found")
        if patient.doctor_id != current_user.id:
             raise HTTPException(status_code=403, detail="Not authorized to upload for this patient")
        target_user_id = patient_id

    # Create user-specific directory
    user_dir = os.path.join(UPLOAD_DIR, str(target_user_id))
    os.makedirs(user_dir, exist_ok=True)
    
    # Save file
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    filename = f"{timestamp}_{file.filename}"
    file_path = os.path.join(user_dir, filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Create DB entry
    record = MedicalRecord(
        user_id=target_user_id,
        filename=file.filename, # Original name
        file_path=file_path,
        file_type=file.content_type,
        description=description
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    
    return {"message": "File uploaded successfully", "record_id": record.id}

@router.get("/patient/{patient_id}")
def get_patient_records(
    patient_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Check authorization: user can see own, doctor can see assigned paitents
    if current_user.id != patient_id:
        patient = db.query(User).filter(User.id == patient_id).first()
        if not patient or patient.doctor_id != current_user.id:
             raise HTTPException(status_code=403, detail="Not authorized to access these records")

    records = db.query(MedicalRecord).filter(MedicalRecord.user_id == patient_id).order_by(MedicalRecord.uploaded_at.desc()).all()
    return records

# -----------------------------
# Medical Entries (Manual Logs)
# -----------------------------

from schemas import MedicalEntryCreate, MedicalEntry
from db.models import MedicalEntry as MedicalEntryModel

@router.post("/logs", response_model=MedicalEntry)
def create_medical_entry(
    entry: MedicalEntryCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    target_user_id = current_user.id
    
    if entry.patient_id:
        # Check if current user is the doctor of the patient
        # Or if patient_id is self (redundant but safe)
        if entry.patient_id != current_user.id:
            patient = db.query(User).filter(User.id == entry.patient_id).first()
            if not patient:
                 raise HTTPException(status_code=404, detail="Patient not found")
            
            # Verify authorization (Doctor -> Patient)
            if patient.doctor_id != current_user.id:
                 raise HTTPException(status_code=403, detail="Not authorized to prescribe for this patient")
            
            target_user_id = entry.patient_id

    db_entry = MedicalEntryModel(
        user_id=target_user_id,
        medicine=entry.medicine,
        dosage=entry.dosage,
        time=entry.time,
        taken=entry.taken,
        notes=entry.notes,
        frequency=entry.frequency
    )
    db.add(db_entry)
    db.commit()
    db.refresh(db_entry)
    return db_entry

@router.get("/logs", response_model=List[MedicalEntry])
def get_own_medical_entries(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return db.query(MedicalEntryModel).filter(MedicalEntryModel.user_id == current_user.id).order_by(MedicalEntryModel.created_at.desc()).all()

@router.put("/logs/{entry_id}", response_model=MedicalEntry)
def update_medical_entry(
    entry_id: int,
    entry: MedicalEntryCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db_entry = db.query(MedicalEntryModel).filter(MedicalEntryModel.id == entry_id, MedicalEntryModel.user_id == current_user.id).first()
    if not db_entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    
    db_entry.medicine = entry.medicine
    db_entry.dosage = entry.dosage
    db_entry.time = entry.time
    db_entry.taken = entry.taken
    db_entry.notes = entry.notes
    db_entry.frequency = entry.frequency
    
    db.commit()
    db.refresh(db_entry)
    return db_entry

@router.delete("/logs/{entry_id}")
def delete_medical_entry(
    entry_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db_entry = db.query(MedicalEntryModel).filter(MedicalEntryModel.id == entry_id, MedicalEntryModel.user_id == current_user.id).first()
    if not db_entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    
    db.delete(db_entry)
    db.commit()
    return {"message": "Entry deleted"}

@router.get("/patient/{patient_id}/logs", response_model=List[MedicalEntry])
def get_patient_medical_entries(
    patient_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Check authorization
    if current_user.id != patient_id:
        patient = db.query(User).filter(User.id == patient_id).first()
        if not patient or patient.doctor_id != current_user.id:
             raise HTTPException(status_code=403, detail="Not authorized to access these records")
             
    return db.query(MedicalEntryModel).filter(MedicalEntryModel.user_id == patient_id).order_by(MedicalEntryModel.created_at.desc()).all()

@router.get("/adherence/{patient_id}")
def get_adherence(
    patient_id: int,
    days: int = 7,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Calculate medication adherence rate for the last N days."""
    # Authorization: own data or assigned doctor
    if current_user.id != patient_id:
        patient = db.query(User).filter(User.id == patient_id).first()
        if not patient or patient.doctor_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized")

    cutoff = datetime.utcnow() - timedelta(days=days)
    entries = db.query(MedicalEntryModel).filter(
        MedicalEntryModel.user_id == patient_id,
        MedicalEntryModel.created_at >= cutoff
    ).all()

    total = len(entries)
    taken = sum(1 for e in entries if e.taken)
    rate = (taken / total * 100) if total > 0 else 0.0

    # Per-medicine breakdown
    medicine_map = {}
    for e in entries:
        key = e.medicine
        if key not in medicine_map:
            medicine_map[key] = {"total": 0, "taken": 0}
        medicine_map[key]["total"] += 1
        if e.taken:
            medicine_map[key]["taken"] += 1

    breakdown = [
        {
            "medicine": k,
            "total": v["total"],
            "taken": v["taken"],
            "rate": round(v["taken"] / v["total"] * 100, 1) if v["total"] > 0 else 0
        }
        for k, v in medicine_map.items()
    ]

    return {
        "days": days,
        "total_entries": total,
        "taken": taken,
        "adherence_rate": round(rate, 1),
        "breakdown": breakdown
    }
