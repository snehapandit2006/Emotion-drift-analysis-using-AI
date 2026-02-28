import os
import sys
import requests
import time
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# Load environment
base_dir = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(base_dir, ".env"))

# Database setup
SQLALCHEMY_DATABASE_URL = "sqlite:///./storage/emotion.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def verify_pipeline_parity():
    print("\n--- Testing Pipeline Parity (Chat -> Dashboard Correlation) ---")
    user_id = 999
    test_text = "I am feeling extremely happy and joyful right now!"
    
    sys.path.append(base_dir)
    from ml.inference import get_sentia_intelligence
    from db.models import EmotionLog
    
    print(f"Triggering hub for: '{test_text}'")
    intel = get_sentia_intelligence(test_text, user_id=user_id)
    detected_e = intel["emotion"]
    print(f"Hub detected: {detected_e}")
    
    # 2. Verify Database Log Parity
    time.sleep(1) 
    db = SessionLocal()
    try:
        # Simplified query to avoid DESC translation issues
        last_log = db.query(EmotionLog).filter(EmotionLog.user_id == user_id).order_by(EmotionLog.id.desc()).first()
        
        if last_log:
            print(f"DB Log Found [ID:{last_log.id}]: '{last_log.text}' -> {last_log.emotion}")
            assert last_log.text == test_text, f"Mismatch: expected {test_text}, got {last_log.text}"
            assert last_log.emotion == detected_e, f"Mismatch: expected {detected_e}, got {last_log.emotion}"
            print("SUCCESS: Pipeline Parity Verified.")
        else:
            print("ERROR: No logs found in DB.")
            sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    verify_pipeline_parity()
