from fastapi import APIRouter, Depends, HTTPException, Form, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional
import uuid
import os
import shutil
from datetime import datetime

from db.database import get_db
from db.models import User, SentiaConversation, SentiaMessage
from api.deps import get_current_user
from ml.inference import get_sentia_intelligence, get_bot_response
from pydantic import BaseModel

router = APIRouter(prefix="/chat/sentia", tags=["sentia-chat"])

class SentiaMessageSchema(BaseModel):
    id: int
    role: str
    content: str
    emotion: Optional[str]
    timestamp: datetime

    class Config:
        from_attributes = True

class SentiaConversationSchema(BaseModel):
    id: int
    title: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

@router.get("/conversations", response_model=List[SentiaConversationSchema])
def get_conversations(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Fetch all sentia conversations for the current user."""
    return db.query(SentiaConversation).filter(
        SentiaConversation.user_id == current_user.id
    ).order_by(SentiaConversation.updated_at.desc()).all()

@router.get("/conversations/{conversation_id}", response_model=List[SentiaMessageSchema])
def get_conversation_history(
    conversation_id: int, 
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    """Fetch message history for a specific conversation."""
    conv = db.query(SentiaConversation).filter(
        SentiaConversation.id == conversation_id,
        SentiaConversation.user_id == current_user.id
    ).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    return db.query(SentiaMessage).filter(
        SentiaMessage.conversation_id == conversation_id
    ).order_by(SentiaMessage.timestamp.asc()).all()

@router.post("/message")
async def chat_with_sentia(
    text: str = Form(...),
    audio: Optional[UploadFile] = File(None),
    conversation_id: Optional[int] = Form(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Unified route for Sentia chat with persistence.
    If conversation_id is missing, a new one is created.
    """
    # 1. Handle Conversation Session
    if conversation_id:
        conv = db.query(SentiaConversation).filter(
            SentiaConversation.id == conversation_id,
            SentiaConversation.user_id == current_user.id
        ).first()
        if not conv:
            raise HTTPException(status_code=404, detail="Conversation not found")
    else:
        # Auto-title from first 30 chars
        title = text[:30] + ("..." if len(text) > 30 else "")
        conv = SentiaConversation(user_id=current_user.id, title=title)
        db.add(conv)
        db.commit()
        db.refresh(conv)

    # 2. Handle Audio if present
    audio_path = None
    if audio:
        storage_dir = "storage/sentia_audio"
        os.makedirs(storage_dir, exist_ok=True)
        audio_filename = f"{uuid.uuid4()}_{audio.filename}"
        audio_path = os.path.join(storage_dir, audio_filename)
        with open(audio_path, "wb") as buffer:
            shutil.copyfileobj(audio.file, buffer)

    # 3. Get Intelligence
    intel = get_sentia_intelligence(text, audio_path=audio_path, user_id=current_user.id)
    
    # 4. Persistence: User Message
    user_msg = SentiaMessage(
        conversation_id=conv.id,
        role="user",
        content=text,
        emotion=intel.get("emotion"), # Text/Fused emotion for user
        timestamp=datetime.utcnow()
    )
    db.add(user_msg)

    # 5. Generate Bot Response
    bot_payload = get_bot_response(text, intel, user_id=current_user.id)
    
    # 6. Persistence: Bot Response
    bot_msg = SentiaMessage(
        conversation_id=conv.id,
        role="bot",
        content=bot_payload["response"],
        emotion="neutral", # Bot usually neutral unless we add expressive response
        trace=bot_payload["trace"],
        timestamp=datetime.utcnow()
    )
    db.add(bot_msg)
    
    # Update conversation timestamp
    conv.updated_at = datetime.utcnow()
    db.commit()

    return {
        "conversation_id": conv.id,
        "response": bot_payload["response"],
        "emotion": intel["emotion"],
        "confidence": intel["confidence"],
        "trace": bot_payload["trace"]
    }

@router.delete("/conversations/{conversation_id}")
def delete_conversation(
    conversation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    conv = db.query(SentiaConversation).filter(
        SentiaConversation.id == conversation_id,
        SentiaConversation.user_id == current_user.id
    ).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    db.delete(conv)
    db.commit()
    return {"status": "deleted"}
