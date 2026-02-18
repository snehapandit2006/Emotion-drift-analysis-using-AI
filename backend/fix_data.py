from sqlalchemy.orm import Session
from db.database import SessionLocal
from db.models import User, DriftAlert, ChatMessage
from datetime import datetime, timedelta

def fix_data():
    db = SessionLocal()
    try:
        # 1. Generate Alert for sneha20061901 (ID 4)
        user = db.query(User).filter(User.email == "sneha20061901@gmail.com").first()
        if user:
            print(f"Creating alert for {user.email} (ID: {user.id})...")
            alert = DriftAlert(
                user_id=user.id,
                severity=0.75,
                from_emotion="happy",
                to_emotion="fear",
                message="High emotional volatility detected (Simulated)",
                created_at=datetime.utcnow()
            )
            db.add(alert)
        else:
            print("User sneha20061901@gmail.com not found!")

        # 2. Seed Chat Messages between ID 4 (Patient) and ID 5 (Doctor)
        doctor = db.query(User).filter(User.email == "doctor@sentia.com").first()
        
        if user and doctor:
            print(f"Seeding chat betwen {user.email} and {doctor.email}...")
            
            # Msg 1: Patient -> Doctor
            msg1 = ChatMessage(
                sender_id=user.id,
                receiver_id=doctor.id,
                message="Hello Dr., I have been feeling anxious lately.",
                timestamp=datetime.utcnow() - timedelta(minutes=5)
            )
            db.add(msg1)
            
            # Msg 2: Doctor -> Patient
            msg2 = ChatMessage(
                sender_id=doctor.id,
                receiver_id=user.id,
                message="Hi Sneha, I see that in your logs. Let's discuss.",
                timestamp=datetime.utcnow() - timedelta(minutes=1)
            )
            db.add(msg2)
        else:
            print("Doctor or Patient not found for chat seeding.")

        db.commit()
        print("Data seeded successfully.")

    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    fix_data()
