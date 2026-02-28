from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime

class UserBase(BaseModel):
    email: str
    role: str = "patient"

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
