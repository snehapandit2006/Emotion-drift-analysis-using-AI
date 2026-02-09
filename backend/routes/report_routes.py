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
    # Override user_id from token to prevent IDOR
    req.user_id = current_user.id
    report_id, _ = generate_report(db, req)
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
        raise HTTPException(status_code=403, detail="Not authorized to access this report")

    path = f"storage/reports/{report_id}.pdf"
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Report file not found")

    return FileResponse(
        path,
        media_type="application/pdf",
        filename=f"emotion_report_{report_id}.pdf"
    )