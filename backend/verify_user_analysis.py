import sys
import os

# Add the backend directory to sys.path so we can import app modules
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from sqlalchemy.orm import Session
from db.database import SessionLocal
from db.models import User, EmotionLog, FaceEmotionLog
from analysis.fusion import analyze_fusion
from analysis.condition_detection import detect_conditions
from datetime import datetime, timedelta, timezone

def verify_user_analysis(username_or_email):
    # Override DB URL to ensure it works from any CWD
    # Assumes script is in backend/ and db is in backend/storage/emotion.db
    base_dir = os.path.dirname(os.path.abspath(__file__))
    db_path = os.path.join(base_dir, "storage", "emotion.db")
    
    # Check if storage is inside backend or root?
    # Based on list_dir, backend/storage/emotion.db exists.
    # Script is in backend/verify_user_analysis.py.
    # So base_dir is .../backend.
    # So os.path.join(base_dir, "storage", "emotion.db") is correct.

    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    
    # db_url = f"sqlite:///{db_path}"
    # Use the one from config but path patched? 
    # Actually simpler to just create a new engine here for verification script
    
    engine = create_engine(f"sqlite:///{db_path}", connect_args={"check_same_thread": False})
    SessionLocalOverride = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    
    db: Session = SessionLocalOverride()
    try:
        # Assuming input is part of email since no username field
        user = db.query(User).filter(User.email.like(f"%{username_or_email}%")).first()
        if not user:
            print(f"User matching '{username_or_email}' not found.")
            return

        print(f"--- Verification for User: {user.email} (ID: {user.id}) ---")

        days = 14
        cutoff = datetime.now(timezone.utc) - timedelta(days=days)
        print(f"Analysis Period: Last {days} days (since {cutoff.isoformat()})")

        # Fetch Logs
        recent_text = (
            db.query(EmotionLog)
            .filter(EmotionLog.user_id == user.id, EmotionLog.created_at >= cutoff)
            .all()
        )
        recent_face = (
            db.query(FaceEmotionLog)
            .filter(FaceEmotionLog.user_id == user.id, FaceEmotionLog.timestamp >= cutoff)
            .all()
        )

        print(f"\n[Data Fetched]")
        print(f"Text Logs: {len(recent_text)}")
        print(f"Face Logs: {len(recent_face)}")

        if not recent_text and not recent_face:
            print("No data found for this period.")
            return

        # Show break down of emotions
        from collections import Counter
        text_emotions = [l.emotion for l in recent_text]
        face_emotions = [l.emotion for l in recent_face]
        
        print("\n[Input Data Emotion Counts]")
        print(f"Text: {Counter(text_emotions)}")
        print(f"Face: {Counter(face_emotions)}")

        # Run Analysis
        fusion_result = analyze_fusion(recent_text, recent_face, range_days=days)
        severity_info = fusion_result.get("severity", {})
        stability = fusion_result.get("stability_score", 1.0)
        
        detected_conditions = detect_conditions(recent_text, recent_face, stability)

        print("\n[Analysis Results]")
        print(f"Stability Score: {stability}")
        print(f"Calculated Severity: {severity_info}")
        print(f"Detected Conditions: {len(detected_conditions)}")
        for c in detected_conditions:
            print(f" - {c['name']} ({c['level']}): {c['description']}")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    verify_user_analysis("sneha20061901")
