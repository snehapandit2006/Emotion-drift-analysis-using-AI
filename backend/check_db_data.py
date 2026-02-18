from sqlalchemy.orm import Session
from db.database import SessionLocal
from db.models import User, DriftAlert, ChatMessage

def check_data():
    db = SessionLocal()
    try:
        print("=== USERS ===")
        users = db.query(User).all()
        for u in users:
            print(f"ID: {u.id} | Email: {u.email} | Role: {u.role} | DoctorID: {u.doctor_id}")
            
        print("\n=== ALERTS ===")
        alerts = db.query(DriftAlert).all()
        for a in alerts:
            print(f"ID: {a.id} | UserID: {a.user_id} | Severity: {a.severity} | Created: {a.created_at} | Msg: {getattr(a, 'message', 'N/A')}")
            
        print("\n=== CHAT MESSAGES (Last 10) ===")
        msgs = db.query(ChatMessage).order_by(ChatMessage.timestamp.desc()).limit(10).all()
        for m in msgs:
            print(f"From: {m.sender_id} -> To: {m.receiver_id} | Msg: {m.message} | Time: {m.timestamp}")
            
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    check_data()
