import uuid
from reports.chart_builder import build_charts
from reports.pdf_generator import generate_pdf
from db.models import Report, EmotionLog, FaceEmotionLog
from analysis.fusion import analyze_fusion
from analysis.condition_detection import detect_conditions
from datetime import datetime, timedelta


def generate_report(db, req):
    report_id = str(uuid.uuid4())

    # Fetch data for condition detection
    # Re-using req.from_date/to_date logic roughly
    try:
        start_dt = datetime.fromisoformat(req.from_date.replace('Z', '+00:00')).replace(tzinfo=None)
        end_dt = datetime.fromisoformat(req.to_date.replace('Z', '+00:00')).replace(tzinfo=None)
    except:
        end_dt = datetime.utcnow()
        start_dt = end_dt - timedelta(days=14)

    # Convert to datetimes for DB queries
    text_logs = db.query(EmotionLog).filter(EmotionLog.user_id == req.user_id, EmotionLog.created_at >= start_dt).all()
    face_logs = db.query(FaceEmotionLog).filter(FaceEmotionLog.user_id == req.user_id, FaceEmotionLog.timestamp >= start_dt).all()
    
    # We need stability score for anxiety detection
    fusion = analyze_fusion(text_logs, face_logs)
    stability = fusion.get("stability_score", 1.0)
    
    conditions = detect_conditions(text_logs, face_logs, stability)

    # Build Charts
    charts = build_charts(db, req.user_id, start_dt, end_dt, report_id)

    pdf_path = generate_pdf(
        user_id=req.user_id,
        charts=charts,
        date_range=(req.from_date, req.to_date),
        report_id=report_id,
        conditions=conditions
    )

    report = Report(
        report_id=report_id,
        user_id=req.user_id,
        report_type=req.report_type,
        from_date=req.from_date,
        to_date=req.to_date,
        file_path=pdf_path
    )

    db.add(report)
    db.commit()

    return report_id, pdf_path
