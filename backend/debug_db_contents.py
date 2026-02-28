import sys
import os

# Add backend to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from db.database import SessionLocal
from db.models import EmotionLog, FaceEmotionLog, User, SentiaConversation

def check_data():
    db = SessionLocal()
    try:
        users = db.query(User).all()
        print(f"--- DB Audit ---")
        print(f"Total Users: {len(users)}")
        for u in users:
            e_logs = db.query(EmotionLog).filter(EmotionLog.user_id == u.id).all()
            f_logs = db.query(FaceEmotionLog).filter(FaceEmotionLog.user_id == u.id).all()
            convs = db.query(SentiaConversation).filter(SentiaConversation.user_id == u.id).all()
            
            print(f"\nUser: {u.email} (ID: {u.id})")
            print(f"  - EmotionLogs: {len(e_logs)}")
            print(f"  - FaceLogs: {len(f_logs)}")
            print(f"  - Conversations: {len(convs)}")
            for c in convs:
                print(f"    - [{c.id}] {c.title}")
            
            if e_logs:
                print(f"  - Latest Emotion: '{e_logs[-1].text}' -> {e_logs[-1].emotion} ({e_logs[-1].created_at})")
    finally:
        db.close()

if __name__ == "__main__":
    check_data()
