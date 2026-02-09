import sys
import os
import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Setup path
sys.path.append(os.path.dirname(__file__))

from db.database import Base, get_db
from reports.report_service import generate_report
from db.models import User

# Mock Request
class MockReq:
    def __init__(self, user_id, from_date, to_date):
        self.user_id = user_id
        self.from_date = from_date
        self.to_date = to_date
        self.report_type = "emotion_summary"

def test_pdf():
    # Create a dummy user session or pick existing
    # We need a valid user ID. Let's pick 1 or find one.
    
    # DB Setup
    SQLALCHEMY_DATABASE_URL = "sqlite:///storage/emotion.db"
    engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    try:
        user = db.query(User).first()
        if not user:
            print("No user found. Creating dummy user.")
            user = User(email="debug@example.com", hashed_password="pw")
            db.add(user)
            db.commit()
            db.refresh(user)

        print(f"Testing for user: {user.email} (ID: {user.id})")
        
        now = datetime.datetime.utcnow()
        start = now - datetime.timedelta(days=1)
        
        req = MockReq(
            user_id=user.id,
            from_date=start.isoformat(),
            to_date=now.isoformat()
        )
        
        print("Generating report...")
        report_id, path = generate_report(db, req)
        print(f"Report Generated! ID: {report_id}")
        print(f"Path: {path}")
        
        if os.path.exists(path):
            print("SUCCESS: File exists.")
        else:
            print("FAILURE: File does not exist.")
            
    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    test_pdf()
