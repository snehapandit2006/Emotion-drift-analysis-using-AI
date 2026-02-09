import uuid
from reports.chart_builder import build_charts
from reports.pdf_generator import generate_pdf
from db.models import Report


def generate_report(db, req):
    report_id = str(uuid.uuid4())

    charts = build_charts(
        db=db,
        user_id=req.user_id,
        start=req.from_date,
        end=req.to_date,
        report_id=report_id
    )

    pdf_path = generate_pdf(
        user_id=req.user_id,
        charts=charts,
        date_range=(req.from_date, req.to_date),
        report_id=report_id
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
