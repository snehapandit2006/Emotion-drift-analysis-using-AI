import sys
import os
import json

# Add the current directory to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from db.database import SessionLocal
from db.models import User, EmotionLog, DriftAlert, FaceEmotionLog

def check_sync():
    db = SessionLocal()
    try:
        # Check all patients
        patients = db.query(User).filter(User.role == "patient").all()
        print(f"Total Patients Found: {len(patients)}")
        
        for p in patients:
            print(f"\n==================================================")
            print(f"PATIENT: {p.email} (ID: {p.id})")
            print(f"==================================================")
            
            # Check logs
            text_logs = db.query(EmotionLog).filter(EmotionLog.user_id == p.id).order_by(EmotionLog.created_at.desc()).limit(3).all()
            print(f"Text Logs Count: {db.query(EmotionLog).filter(EmotionLog.user_id == p.id).count()}")
            for l in text_logs:
                print(f"  - [{l.created_at}] Emotion: {l.emotion} ({l.confidence})")

            # Check Face logs
            face_logs_count = db.query(FaceEmotionLog).filter(FaceEmotionLog.user_id == p.id).count()
            print(f"Face Logs Count: {face_logs_count}")
            
            # Check alerts
            alerts = db.query(DriftAlert).filter(DriftAlert.user_id == p.id).all()
            print(f"Total Alerts: {len(alerts)}")
            for a in alerts:
                # Try to determine level
                level = "UNKNOWN"
                try:
                    pld = json.loads(a.message)
                    level = pld.get("level", "JSON_NO_LEVEL")
                except:
                    if a.severity >= 0.6: level = "HIGH (LEGACY)"
                    elif a.severity >= 0.3: level = "MEDIUM (LEGACY)"
                    else: level = "LOW (LEGACY)"
                
                print(f"  [ALERT] ID: {a.id} | Severity: {a.severity} | Level: {level}")
                print(f"          Message: {repr(a.message)}")
                
    finally:
        db.close()

if __name__ == "__main__":
    check_sync()
