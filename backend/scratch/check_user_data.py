import sys
import os
sys.path.append(os.getcwd())
from db.database import SessionLocal
from db.models import User, EmotionLog, FaceEmotionLog, DriftAlert, Report, ChatMessage, MedicalRecord, MedicalEntry, SentiaConversation, SentiaMessage, PrescribedTherapy, MeditationLog, CommunityMessage, HealthMetric, VitalAlert

db = SessionLocal()
users = db.query(User).all()

for u in users:
    print(f"User: {u.email} (ID: {u.id})")
    print(f"  EmotionLog: {db.query(EmotionLog).filter_by(user_id=u.id).count()}")
    print(f"  FaceEmotionLog: {db.query(FaceEmotionLog).filter_by(user_id=u.id).count()}")
    print(f"  DriftAlert: {db.query(DriftAlert).filter_by(user_id=u.id).count()}")
    print(f"  Report: {db.query(Report).filter_by(user_id=u.id).count()}")
    print(f"  ChatMessage (Sender): {db.query(ChatMessage).filter_by(sender_id=u.id).count()}")
    print(f"  ChatMessage (Receiver): {db.query(ChatMessage).filter_by(receiver_id=u.id).count()}")
    print(f"  MedicalRecord: {db.query(MedicalRecord).filter_by(user_id=u.id).count()}")
    print(f"  MedicalEntry: {db.query(MedicalEntry).filter_by(user_id=u.id).count()}")
    print(f"  SentiaConversation: {db.query(SentiaConversation).filter_by(user_id=u.id).count()}")
    print(f"  PrescribedTherapy: {db.query(PrescribedTherapy).filter_by(user_id=u.id).count()}")
    print(f"  MeditationLog: {db.query(MeditationLog).filter_by(user_id=u.id).count()}")
    print(f"  CommunityMessage: {db.query(CommunityMessage).filter_by(user_id=u.id).count()}")
    print(f"  HealthMetric: {db.query(HealthMetric).filter_by(user_id=u.id).count()}")
    print(f"  VitalAlert: {db.query(VitalAlert).filter_by(user_id=u.id).count()}")
    print("-" * 20)

db.close()
