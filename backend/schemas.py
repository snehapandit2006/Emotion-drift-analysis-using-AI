from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime

class UserBase(BaseModel):
    email: str
    role: str = "patient"
    hobbies: Optional[str] = None
    preferred_games: Optional[str] = None
    music_interests: Optional[str] = None

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: int
    is_active: bool
    doctor_id: Optional[int] = None
    created_at: datetime
    
    # We might want to include latest emotion or similar, but let's keep it simple for now
    
    model_config = ConfigDict(from_attributes=True)

class PatientList(User):
    missed_count: int = 0
    adherence_rate: float = 0.0

class ChatMessageBase(BaseModel):
    message: str
    receiver_id: int

class ChatMessage(ChatMessageBase):
    id: int
    sender_id: int
    timestamp: datetime
    is_read: bool

    model_config = ConfigDict(from_attributes=True)

class MedicalEntryBase(BaseModel):
    medicine: str
    dosage: str
    time: str
    taken: bool = False
    notes: Optional[str] = None
    frequency: str = "daily"

class MedicalEntryCreate(MedicalEntryBase):
    patient_id: Optional[int] = None

class MedicalEntry(MedicalEntryBase):
    id: int
    user_id: int
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class PrescribedTherapyBase(BaseModel):
    therapy_type: str
    name: str
    description: str
    duration_minutes: int
    frequency_hz: Optional[int] = None
    is_active: bool = True

class PrescribedTherapyCreate(PrescribedTherapyBase):
    user_id: int

class PrescribedTherapySchema(PrescribedTherapyBase):
    id: int
    user_id: int
    prescribed_at: datetime

    model_config = ConfigDict(from_attributes=True)

class MeditationLogBase(BaseModel):
    duration_seconds: int
    session_type: str = "breathing"

class MeditationLogCreate(MeditationLogBase):
    pass

class MeditationLogSchema(MeditationLogBase):
    id: int
    user_id: int
    completed_at: datetime

    model_config = ConfigDict(from_attributes=True)

class CommunityMessageBase(BaseModel):
    content: str
    is_anonymous: bool = False

class CommunityMessageCreate(CommunityMessageBase):
    room_id: int
    user_id: int

class CommunityMessageSchema(CommunityMessageBase):
    id: int
    room_id: int
    user_id: int
    timestamp: datetime

    model_config = ConfigDict(from_attributes=True)

class ChatRoomBase(BaseModel):
    name: str
    description: Optional[str] = None

class ChatRoomCreate(ChatRoomBase):
    pass

class ChatRoomSchema(ChatRoomBase):
    id: int
    created_at: datetime
    messages: List[CommunityMessageSchema] = []

    model_config = ConfigDict(from_attributes=True)

class DailyCheckInCreate(BaseModel):
    mood_level: int
    sleep_hours: float
    sleep_quality: str
    triggers: List[str]

class DailyCheckInResponse(DailyCheckInCreate):
    id: int
    user_id: int
    date: date
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)