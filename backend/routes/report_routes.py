from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from fastapi.responses import FileResponse
import os
from db.models import Report

from db.database import get_db
from reports.report_service import generate_report

router = APIRouter(prefix="/reports", tags=["Reports"])


class ReportRequest(BaseModel):
    user_id: str
    from_date: str
    to_date: str
    report_type: str = "emotion_summary"


from api.deps import get_current_user
from db.models import User

@router.post("/generate")
def generate_report_api(
    req: ReportRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Determine target user
    if req.user_id:
        target_user_id = req.user_id
    else:
        target_user_id = str(current_user.id) # Fallback
    
    print(f"DEBUG: Generate Report. Current User: {current_user.id}, Target: {target_user_id}")
    
    # IDOR Check
    if str(target_user_id) != str(current_user.id):
        # Check if current_user is doctor of target_user_id
        patient = db.query(User).filter(User.id == target_user_id).first()
        if not patient:
            print(f"DEBUG: Patient {target_user_id} not found")
        elif patient.doctor_id != current_user.id:
            print(f"DEBUG: Authorization failed. Patient Doctor: {patient.doctor_id}, Current: {current_user.id}")
            raise HTTPException(status_code=403, detail="Not authorized to generate report for this user")
            
    req.user_id = target_user_id
    try:
        report_id, _ = generate_report(db, req)
        print(f"DEBUG: Report generated successfully. ID: {report_id}")
    except Exception as e:
        print(f"DEBUG: Report generation failed: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
        
    return {
        "report_id": report_id,
        "download_url": f"/reports/download/{report_id}"
    }


@router.get("/download/{report_id}")
def download_report(
    report_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Verify report existence and ownership
    report = db.query(Report).filter(Report.report_id == report_id).first()
    
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
        
    # Compare IDs as strings to handle potential type mismatches (str vs int)
    if str(report.user_id) != str(current_user.id):
        # Allow doctor to view patient's report
        is_authorized = False
        patient = db.query(User).filter(User.id == report.user_id).first()
        if patient and patient.doctor_id == current_user.id:
            is_authorized = True
            
        if not is_authorized:
            raise HTTPException(status_code=403, detail="Not authorized to access this report")

    path = f"storage/reports/{report_id}.pdf"
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Report file not found")

    return FileResponse(
        path,
        media_type="application/pdf",
        filename=f"emotion_report_{report_id}.pdf"
    )