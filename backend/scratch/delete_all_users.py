import sys
import os
sys.path.append(os.getcwd())
from db.database import SessionLocal
from db.models import User, EmotionLog, FaceEmotionLog, DriftAlert, Report, ChatMessage, MedicalRecord, MedicalEntry, SentiaConversation, SentiaMessage, PrescribedTherapy, MeditationLog, CommunityMessage, HealthMetric, VitalAlert

db = SessionLocal()
users = db.query(User).all()
cnt = 0

for u in users:
    print(f"Deleting data for user {u.email}...")
    
    # Delete related records
    db.query(HealthMetric).filter_by(user_id=u.id).delete()
    db.query(VitalAlert).filter_by(user_id=u.id).delete()
    db.query(CommunityMessage).filter_by(user_id=u.id).delete()
    db.query(MeditationLog).filter_by(user_id=u.id).delete()
    db.query(PrescribedTherapy).filter_by(user_id=u.id).delete()
    
    convos = db.query(SentiaConversation).filter_by(user_id=u.id).all()
    for c in convos:
        db.query(SentiaMessage).filter_by(conversation_id=c.id).delete()
        db.delete(c)
        
    db.query(MedicalEntry).filter_by(user_id=u.id).delete()
    db.query(MedicalRecord).filter_by(user_id=u.id).delete()
    db.query(ChatMessage).filter((ChatMessage.sender_id == u.id) | (ChatMessage.receiver_id == u.id)).delete()
    db.query(Report).filter_by(user_id=u.id).delete()
    db.query(DriftAlert).filter_by(user_id=u.id).delete()
    db.query(FaceEmotionLog).filter_by(user_id=u.id).delete()
    db.query(EmotionLog).filter_by(user_id=u.id).delete()
    
    # Update patients of this doctor, if any
    patients = db.query(User).filter_by(doctor_id=u.id).all()
    for p in patients:
        p.doctor_id = None
        
    db.delete(u)
    cnt += 1

db.commit()
print(f"Deleted {cnt} users and their related data successfully.")
db.close()
