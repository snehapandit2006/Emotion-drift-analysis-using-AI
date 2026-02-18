import sys
import os
sys.path.append(os.getcwd())

from db.database import SessionLocal
from db.models import User, EmotionLog, DriftAlert
from analysis.drift import check_and_create_alert
from datetime import datetime, timedelta

def verify_alerts():
    db = SessionLocal()
    try:
        user = db.query(User).first()
        if not user:
            print("No users found.")
            return

        print(f"Testing Alert Gen for User: {user.id}")
        
        # 1. Clear existing alerts for clean test
        db.query(DriftAlert).filter(DriftAlert.user_id == user.id).delete()
        db.commit()
        
        # 2. Inject dummy logs to force drift
        # 10 'happy' logs then 10 'sad' logs
        now = datetime.utcnow()
        logs = []
        for i in range(10):
            logs.append(EmotionLog(user_id=user.id, emotion="happy", confidence=0.9, text="happy", created_at=now - timedelta(minutes=20 - i)))
        for i in range(10):
            logs.append(EmotionLog(user_id=user.id, emotion="sad", confidence=0.9, text="sad", created_at=now - timedelta(minutes=10 - i)))
            
        db.add_all(logs)
        db.commit()
        print("Injected 20 dummy logs (Happy -> Sad)")
        
        # 3. Trigger check
        alert = check_and_create_alert(db, user.id)
        
        if alert:
            print(f"SUCCESS: Alert created! ID: {alert.id}, Severity: {alert.severity}")
        else:
            print("FAILURE: No alert created.")
            
    except Exception as e:
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    verify_alerts()
