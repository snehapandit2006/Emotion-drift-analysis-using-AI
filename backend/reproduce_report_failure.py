import sys
import os
sys.path.append(os.getcwd())

from db.database import SessionLocal
from db.models import User
from reports.report_service import generate_report
from pydantic import BaseModel

class MockRequest(BaseModel):
    user_id: int
    from_date: str
    to_date: str
    report_type: str = "emotion_summary"

def test_report():
    db = SessionLocal()
    try:
        user = db.query(User).first()
        if not user:
            print("No users found.")
            return

        print(f"Testing report generation for User ID: {user.id}")
        
        req = MockRequest(
            user_id=user.id,
            from_date="2023-01-01T00:00:00Z",
            to_date="2025-12-31T23:59:59Z"
        )
        
        report_id, path = generate_report(db, req)
        print(f"Success! Report ID: {report_id}, Path: {path}")

    except Exception as e:
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    test_report()
