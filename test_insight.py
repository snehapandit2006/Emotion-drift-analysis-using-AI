import os
import sys

# setup path
sys.path.append(os.path.join(os.path.dirname(__file__), "backend"))

from backend.db.database import SessionLocal
from backend.db.models import EmotionLog, User

db = SessionLocal()

user = db.query(User).filter(User.email.like("sneha%")).first()
if user:
    print(f"User found: {user.email}, ID: {user.id}")
    logs = db.query(EmotionLog).filter(EmotionLog.user_id == user.id).order_by(EmotionLog.created_at.desc()).limit(5).all()
    print(f"Text logs count: {len(logs)}")
    for l in logs:
        print(f" - {l.emotion} {l.confidence} {l.created_at}")
        
    from backend.analysis.drift import extract_stress
    print("Stress extraction:")
    for l in logs:
        print(f" - Stress: {extract_stress(l)}")
else:
    print("User not found.")
