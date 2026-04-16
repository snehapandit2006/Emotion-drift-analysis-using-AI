from fastapi import APIRouter, Depends, HTTPException, Form, UploadFile, File, BackgroundTasks
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional
import uuid
import os
import shutil
import base64
import requests
import asyncio
from datetime import datetime

from db.database import get_db
from db.models import User, SentiaConversation, SentiaMessage
from api.deps import get_current_user
from ml.inference import get_sentia_intelligence, get_bot_response
from pydantic import BaseModel
from core.config import settings

router = APIRouter(prefix="/chat/sentia", tags=["sentia-chat"])

# Global session for connection pooling
tts_session = requests.Session()

def generate_sarvam_tts_bytes(text, speaker="ishita"):
    """Synchronously gets audio bytes from Sarvam."""
    if not text or not str(text).strip(): return None
    api_key = settings.LLM_API_KEY
    if not api_key: return None
    
    url = "https://api.sarvam.ai/text-to-speech"
    headers = {"api-subscription-key": api_key, "Content-Type": "application/json"}
    payload = {
        "inputs": [text],
        "target_language_code": "en-IN",
        "speaker": speaker,
        "model": "bulbul:v3",
        "pace": 1.0,
        "enable_preprocessing": True
    }
    try:
        res = tts_session.post(url, headers=headers, json=payload, timeout=20)
        if res.status_code == 200:
            data = res.json()
            audio_b64 = data.get("audios", [""])[0]
            if audio_b64:
                return base64.b64decode(audio_b64)
    except Exception as e:
        print(f"[TTS BYTES ERROR] {e}")
    return None

def generate_sarvam_tts_internal(text, output_path, speaker="ishita"):
    """Background helper to save TTS to disk."""
    audio_bytes = generate_sarvam_tts_bytes(text, speaker)
    if audio_bytes:
        try:
            with open(output_path, "wb") as f:
                f.write(audio_bytes)
        except Exception as e:
            print(f"[TTS WRITE ERROR] {e}")

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
    background_tasks: BackgroundTasks,
    text: str = Form(...),
    audio: Optional[UploadFile] = File(None),
    conversation_id: Optional[int] = Form(None),
    ui_lang: Optional[str] = Form(None),
    speaker: Optional[str] = Form("ishita"),
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
    bot_payload = get_bot_response(text, intel, user_id=current_user.id, conversation_id=conv.id, ui_lang=ui_lang)
    bot_text = bot_payload["response"]
    
    # 6. Sentence-Chunking Hybrid Strategy (ZERO LAG RACE-CONDITION FIX)
    import re
    from concurrent.futures import ThreadPoolExecutor
    
    # Global executor for efficient resource reuse and early start
    if not hasattr(router, "tts_executor"):
        router.tts_executor = ThreadPoolExecutor(max_workers=10)

    def split_into_sentences(t):
        sentences = re.split(r'(?<=[.!?])\s+', t)
        return [s.strip() for s in sentences if s.strip()]

    tts_urls = []
    first_chunk_b64 = None
    
    if bot_text:
        sentences = split_into_sentences(bot_text)
        batch_id = str(uuid.uuid4())
        
        # Validate speaker name
        SUPPORTED_SPEAKERS = [
            'aditya', 'ritu', 'ashutosh', 'priya', 'neha', 'rahul', 'pooja', 'rohan',
            'simran', 'kavya', 'amit', 'dev', 'ishita', 'shreya', 'ratan', 'varun',
            'manan', 'sumit', 'roopa', 'kabir', 'aayan', 'shubh', 'advait', 'amelia',
            'sophia', 'anand', 'tanya', 'tarun', 'sunny', 'mani', 'gokul', 'vijay',
            'shruti', 'suhani', 'mohit', 'kavitha', 'rehan', 'soham', 'rupali'
        ]
        active_speaker = speaker if speaker in SUPPORTED_SPEAKERS else "ishita"

        # Part A: Generate FIRST chunk synchronously (Base64) - Gives immediate voice
        if sentences:
            first_sentence = sentences[0]
            if len(first_sentence) >= 2:
                first_bytes = generate_sarvam_tts_bytes(first_sentence, speaker=active_speaker)
                if first_bytes:
                    first_chunk_b64 = base64.b64encode(first_bytes).decode('utf-8')

        # Part B: Submit ALL chunks to global executor IMMEDIATELY
        # This starts the generation process BEFORE the response is sent.
        for i, sentence in enumerate(sentences):
            if len(sentence) < 2: continue
            
            chunk_filename = f"sentia_chunk_{batch_id}_{i}.wav"
            chunk_path = os.path.join("storage/sentia_tts", chunk_filename)
            os.makedirs("storage/sentia_tts", exist_ok=True)
            
            # Submission happens NOW, not in background_tasks (which wait for response end)
            router.tts_executor.submit(generate_sarvam_tts_internal, sentence, chunk_path, active_speaker)
            
            # Point to the Smart Waiter endpoint instead of direct static file
            tts_urls.append(f"/chat/sentia/audio/{chunk_filename}")
        
        print(f"[SENTIA] Pre-Response: Submitted {len(tts_urls)} chunked TTS tasks for batch {batch_id}")

    # 7. Persistence: Bot Response
    bot_msg = SentiaMessage(
        conversation_id=conv.id,
        role="bot",
        content=bot_text,
        emotion="neutral", 
        trace=bot_payload["trace"],
        timestamp=datetime.utcnow()
    )
    db.add(bot_msg)
    
    # Update conversation timestamp
    conv.updated_at = datetime.utcnow()
    db.commit()

    prescribed_game = bot_payload.get("prescribed_game")
    game_link = bot_payload.get("game_link")
    binaural_link = bot_payload.get("binaural_link")

    # Fallback: resolve game link from GAME_LIBRARY if not in bot_payload
    if prescribed_game and not game_link:
        from ml.llm_bridge import GAME_LIBRARY
        if prescribed_game in GAME_LIBRARY:
            game_link = GAME_LIBRARY[prescribed_game].get("link")

    return {
        "conversation_id": conv.id,
        "response": bot_text,
        "emotion": intel["emotion"],
        "confidence": intel["confidence"],
        "trace": bot_payload["trace"],
        "first_chunk_b64": first_chunk_b64,
        "tts_urls": tts_urls,
        "prescribed_game": prescribed_game,
        "game_link": game_link,
        "binaural_link": binaural_link,
    }

@router.get("/audio/{filename}")
async def get_sentia_audio(filename: str):
    """
    Smart Waiter: Instead of 404ing, this route waits for the background 
    TTS generation to finish writing the file to disk.
    """
    path = os.path.join("storage/sentia_tts", filename)
    
    # Wait for up to 8 seconds (40 attempts * 0.2s)
    for _ in range(40):
        if os.path.exists(path):
            return FileResponse(path)
        await asyncio.sleep(0.2)
        
    # If still not found, then it's a real 404
    raise HTTPException(status_code=404, detail="Audio generation timed out or failed")

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
