from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, ForeignKey
from datetime import datetime
from .database import Base
from sqlalchemy.orm import relationship

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    role = Column(String, default="patient") # 'patient' or 'psychiatrist'
    doctor_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    hobbies = Column(String, nullable=True)
    preferred_games = Column(String, nullable=True)
    music_interests = Column(String, nullable=True) # JSON or comma-separated string
    google_refresh_token = Column(String, nullable=True)

    logs = relationship("EmotionLog", back_populates="user")
    alerts = relationship("DriftAlert", back_populates="user")
    reports = relationship("Report", back_populates="user")
    face_logs = relationship("FaceEmotionLog", back_populates="user")
    
    # Self-referential relationship
    doctor = relationship("User", remote_side=[id], backref="patients")



class EmotionLog(Base):
    __tablename__ = "emotion_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    text = Column(String)
    emotion = Column(String)
    confidence = Column(Float)
    source = Column(String, default="chat") # 'chat' or 'dashboard'
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="logs")

class FaceEmotionLog(Base):
    __tablename__ = "face_emotion_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    emotion = Column(String)
    confidence = Column(Float)
    timestamp = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="face_logs")

class DriftAlert(Base):
    __tablename__ = "drift_alerts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    from_emotion = Column(String)
    to_emotion = Column(String)
    severity = Column(Float)
    message = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="alerts")

class Report(Base):
    __tablename__ = "reports"

    report_id = Column(String, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    report_type = Column(String)
    from_date = Column(String)
    to_date = Column(String)
    file_path = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="reports")

class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    sender_id = Column(Integer, ForeignKey("users.id"), index=True)
    receiver_id = Column(Integer, ForeignKey("users.id"), index=True)
    message = Column(String)
    timestamp = Column(DateTime, default=datetime.utcnow)
    is_read = Column(Boolean, default=False)

class MedicalRecord(Base):
    __tablename__ = "medical_records"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    filename = Column(String)
    file_path = Column(String)
    file_type = Column(String) # pdf, image, etc.
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    description = Column(String, nullable=True)

    user = relationship("User", back_populates="medical_records")

# Update User relationship
User.medical_records = relationship("MedicalRecord", back_populates="user")
User.medical_logs = relationship("MedicalEntry", back_populates="user")

class MedicalEntry(Base):
    __tablename__ = "medical_entries"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    medicine = Column(String)
    dosage = Column(String)
    time = Column(String)
    taken = Column(Boolean, default=False)
    notes = Column(String, nullable=True)
    frequency = Column(String, default="daily")  # daily, twice_daily, weekly, as_needed
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="medical_logs")

class SentiaConversation(Base):
    __tablename__ = "sentia_conversations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    title = Column(String, default="New Conversation")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="sentia_conversations")
    messages = relationship("SentiaMessage", back_populates="conversation", cascade="all, delete-orphan")

class SentiaMessage(Base):
    __tablename__ = "sentia_messages"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("sentia_conversations.id"), index=True)
    role = Column(String) # 'user' or 'bot'
    content = Column(String)
    emotion = Column(String, nullable=True)
    trace = Column(String, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)

    conversation = relationship("SentiaConversation", back_populates="messages")

# Final User relationship updates
User.sentia_conversations = relationship("SentiaConversation", back_populates="user")
User.prescribed_therapies = relationship("PrescribedTherapy", back_populates="user")

class PrescribedTherapy(Base):
    __tablename__ = "prescribed_therapies"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    therapy_type = Column(String) # 'binaural', 'custom_frequency', 'guided'
    name = Column(String)
    description = Column(String)
    duration_minutes = Column(Integer)
    frequency_hz = Column(Integer, nullable=True) # e.g. 432
    prescribed_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)

    user = relationship("User", back_populates="prescribed_therapies")

class MeditationLog(Base):
    __tablename__ = "meditation_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    duration_seconds = Column(Integer)
    session_type = Column(String, default="breathing") # 'breathing', 'focus', 'guided'
    completed_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="meditation_logs")

User.meditation_logs = relationship("MeditationLog", back_populates="user")

class ChatRoom(Base):
    __tablename__ = "chat_rooms"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    description = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    messages = relationship("CommunityMessage", back_populates="room", cascade="all, delete-orphan")

class CommunityMessage(Base):
    __tablename__ = "community_messages"

    id = Column(Integer, primary_key=True, index=True)
    room_id = Column(Integer, ForeignKey("chat_rooms.id"), index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    is_anonymous = Column(Boolean, default=False)
    content = Column(String)
    timestamp = Column(DateTime, default=datetime.utcnow)

    room = relationship("ChatRoom", back_populates="messages")
    user = relationship("User", backref="community_messages")

class HealthMetric(Base):
    __tablename__ = "health_metrics"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    heart_rate = Column(Float, nullable=True) # bpm
    spo2 = Column(Float, nullable=True)       # percentage
    blood_pressure_systolic = Column(Float, nullable=True)
    blood_pressure_diastolic = Column(Float, nullable=True)
    source = Column(String, default="manual") # 'manual', 'google_fit'
    timestamp = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", backref="health_metrics")


class VitalAlert(Base):
    __tablename__ = "vital_alerts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    metric = Column(String)              # 'heart_rate', 'spo2', 'blood_pressure'
    value = Column(Float)
    prev_value = Column(Float, nullable=True)
    alert_type = Column(String)          # 'critical_threshold' | 'rapid_fluctuation'
    severity = Column(String)            # 'warning' | 'critical'
    message = Column(String)
    recommendation = Column(String)
    acknowledged = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", backref="vital_alerts")


class CognitiveSnapshot(Base):
    __tablename__ = "cognitive_snapshots"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    
    # Observation Window
    messages_analyzed = Column(Integer, default=0)
    days_covered = Column(Integer, default=0)
    
    # 1. Psychological Traits (Slow-changing: 0.0 to 1.0)
    perfectionism = Column(Float, default=0.0)
    perfectionism_confidence = Column(Float, default=0.0)
    
    avoidance_trait = Column(Float, default=0.0)
    avoidance_confidence = Column(Float, default=0.0)
    
    rumination_tendency = Column(Float, default=0.0)
    rumination_confidence = Column(Float, default=0.0)
    
    # 2. Psychological States (Fast-changing: 0.0 to 1.0)
    burnout_state = Column(Float, default=0.0)
    burnout_confidence = Column(Float, default=0.0)
    
    motivation_level = Column(Float, default=0.0)
    motivation_confidence = Column(Float, default=0.0)
    
    stress_adaptation = Column(Float, default=0.0)
    stress_adaptation_confidence = Column(Float, default=0.0)

    cognitive_flexibility = Column(Float, default=0.5)
    cognitive_flexibility_confidence = Column(Float, default=0.0)
    
    # 3. Attention Map (Relative allocation percentages, summing to 1.0)
    attention_academics = Column(Float, default=0.0)
    attention_career = Column(Float, default=0.0)
    attention_health = Column(Float, default=0.0)
    attention_relationships = Column(Float, default=0.0)
    attention_identity = Column(Float, default=0.0)
    attention_family = Column(Float, default=0.0)
    
    # 4. Recovery Model
    stress_trigger = Column(String, nullable=True) # e.g. "uncertainty", "conflict"
    helps = Column(String, default="[]")           # JSON string of coping helps list
    hurts = Column(String, default="[]")           # JSON string of coping hurts list
    recovery_effectiveness = Column(String, default="{}") # JSON dict of activity -> score
    recovery_speed = Column(String, default="medium") # "slow" | "medium" | "fast"
    support_preference = Column(String, default="general") # "guidance" | "listening"
    
    # 5. Explanatory Feature Signals (Audit Trail)
    negative_repetition_count = Column(Integer, default=0)
    avoidance_phrases_count = Column(Integer, default=0)
    catastrophic_phrases_count = Column(Integer, default=0)
    self_critical_phrases_count = Column(Integer, default=0)
    social_mentions_count = Column(Integer, default=0)
    coping_mentions_count = Column(Integer, default=0)
    
    # Explainable source breakdown JSON
    signal_source_breakdown = Column(String, default="{}")
    
    # Narrative
    notes = Column(String, nullable=True) # LLM narrative generator output
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", backref="cognitive_snapshots")


class CBTReflection(Base):
    __tablename__ = "cbt_reflections"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    
    what_happened = Column(String)  # Activating event
    what_thought = Column(String)   # Beliefs / automatic thoughts
    what_felt = Column(String)      # Emotional reactions
    what_done = Column(String)      # Behavioral response
    what_next = Column(String)      # Outcome / cognitive restructuring
    
    # Intensities (1-10)
    thought_intensity = Column(Integer, default=5)
    emotion_intensity = Column(Integer, default=5)
    
    associated_pattern = Column(String, nullable=True) # e.g., "rumination", "avoidance"
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", backref="cbt_reflections")

