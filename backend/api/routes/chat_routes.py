from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict
import json
from datetime import datetime

from db.database import get_db, SessionLocal
from db.models import ChatMessage, User
from api.deps import get_current_user
from core.security import SECRET_KEY, ALGORITHM
from jose import jwt, JWTError

router = APIRouter(tags=["chat"])

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[int, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, user_id: int):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)

    def disconnect(self, websocket: WebSocket, user_id: int):
        if user_id in self.active_connections:
            if websocket in self.active_connections[user_id]:
                self.active_connections[user_id].remove(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]

    async def send_personal_message(self, message: dict, user_id: int):
        if user_id in self.active_connections:
            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_json(message)
                except:
                    # Stale connection
                    pass

manager = ConnectionManager()

def get_user_from_token(token: str, db: Session):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            return None
        user = db.query(User).filter(User.email == email).first()
        return user
    except JWTError:
        return None

@router.websocket("/ws/chat")
async def websocket_endpoint(websocket: WebSocket, token: str = None):
    # Depending on how the client connects, db session management in async WS is manual
    db = SessionLocal()
    user = None
    try:
        if not token:
            await websocket.close(code=1008)
            return
            
        user = get_user_from_token(token, db)
        if not user:
            await websocket.close(code=1008)
            return
            
        await manager.connect(websocket, user.id)
        
        while True:
            data = await websocket.receive_text()
            try:
                msg_data = json.loads(data)
                receiver_id = int(msg_data.get("receiver_id"))
                content = msg_data.get("message")
                
                # Save to DB
                chat_msg = ChatMessage(
                    sender_id=user.id,
                    receiver_id=receiver_id,
                    message=content,
                    timestamp=datetime.utcnow()
                )
                db.add(chat_msg)
                db.commit()
                
                # Prepare message payload
                out_msg = {
                    "sender_id": user.id,
                    "receiver_id": receiver_id,
                    "message": content,
                    "timestamp": chat_msg.timestamp.isoformat(),
                    "sender_email": user.email # Helpful for UI
                }
                
                # Send to receiver
                await manager.send_personal_message(out_msg, receiver_id)
                # Send back to sender (for confirmation/multi-tab sync)
                await manager.send_personal_message(out_msg, user.id)
                
            except Exception as e:
                print(f"WS Msg Processing Error: {e}")
                
    except WebSocketDisconnect:
        if user:
            manager.disconnect(websocket, user.id)
    finally:
        db.close()

from pydantic import BaseModel

class ChatMessageSchema(BaseModel):
    id: int
    sender_id: int
    receiver_id: int
    message: str
    timestamp: datetime

    class Config:
        from_attributes = True

@router.get("/chat/history/{other_user_id}", response_model=List[ChatMessageSchema])
def get_chat_history(
    other_user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    msgs = (
        db.query(ChatMessage)
        .filter(
            ((ChatMessage.sender_id == current_user.id) & (ChatMessage.receiver_id == other_user_id)) |
            ((ChatMessage.sender_id == other_user_id) & (ChatMessage.receiver_id == current_user.id))
        )
        .order_by(ChatMessage.timestamp.asc())
        .all()
    )
    return msgs


# ---------------------------------------------------------
# CHAT ANALYSIS ENDPOINTS (File Upload)
# ---------------------------------------------------------
from fastapi import File, UploadFile, BackgroundTasks
import zipfile
import io
import uuid
from collections import Counter
from ml.inference import predict_emotion, get_bot_response, predict_fused_emotion
from ml.advisor import generate_advice
from fastapi import Form
import shutil
import os

# Simple state guard to prevent duplicate rapid-fire replies
last_user_input_cache = {}

# Simple in-memory job store
analysis_jobs = {}

def process_chat_analysis(job_id: str, file_bytes: bytes):
    try:
        analysis_jobs[job_id]["status"] = "processing"
        analysis_jobs[job_id]["progress"] = 10
        
        messages = []
        
        with zipfile.ZipFile(io.BytesIO(file_bytes)) as z:
            for filename in z.namelist():
                if filename.endswith(".txt") and not filename.startswith("__MACOSX"):
                    with z.open(filename) as f:
                        content = f.read().decode("utf-8", errors="ignore")
                        lines = content.splitlines()
                        for line in lines:
                            if line.strip():
                                messages.append(line.strip())
        
        total = len(messages)
        if total == 0:
            raise Exception("No text messages found in ZIP")
            
        analysis_jobs[job_id]["progress"] = 20
        
        emotions = []
        analyzed_msgs = []
        
        # Analyze each message
        for i, msg in enumerate(messages):
            # Simple heuristic to skip timestamps/names if possible, 
            # but for now we analyze the whole line or just the content if we could parse it.
            # Let's just analyze the raw line for simplicity as 'text'
            res = predict_emotion(msg)
            if res and res["emotion"] and res["emotion"] != "unknown":
                emotions.append(res["emotion"])
                analyzed_msgs.append({
                    "text": msg[:100] + "..." if len(msg) > 100 else msg, # Truncate for display
                    "emotion": res["emotion"]
                })
            
            # Update progress periodically
            if i % 10 == 0:
                prog = 20 + int((i / total) * 60) # 20% to 80%
                analysis_jobs[job_id]["progress"] = prog
                
        if not emotions:
            analysis_jobs[job_id]["status"] = "failed"
            analysis_jobs[job_id]["error"] = "No emotions detected"
            return

        # Statistics
        counts = Counter(emotions)
        total_valid = len(emotions)
        distribution = {k: v / total_valid for k, v in counts.items()}
        dominant = counts.most_common(1)[0][0]
        
        # Advice
        last_msg_emotion = emotions[-1] if emotions else "neutral"
        advice = generate_advice(dominant, last_msg_emotion)
        
        result = {
            "distribution": distribution,
            "dominant_emotion": dominant,
            "recent_context": analyzed_msgs[-5:], # Last 5
            "advice": advice
        }
        
        analysis_jobs[job_id]["result"] = result
        analysis_jobs[job_id]["status"] = "completed"
        analysis_jobs[job_id]["progress"] = 100
        
    except Exception as e:
        print(f"Analysis Job Failed: {e}")
        analysis_jobs[job_id]["status"] = "failed"
        analysis_jobs[job_id]["error"] = str(e)


@router.post("/analyze/chat")
async def analyze_chat_logs(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...)
):
    if not file.filename.endswith(".zip"):
        raise HTTPException(status_code=400, detail="Only .zip files are allowed")
        
    job_id = str(uuid.uuid4())
    analysis_jobs[job_id] = {
        "status": "pending",
        "progress": 0,
        "result": None,
        "error": None
    }
    
    # Read file content safely
    contents = await file.read()
    
    # Run in background
    background_tasks.add_task(process_chat_analysis, job_id, contents)
    
    return {"job_id": job_id, "status": "pending"}

@router.get("/analyze/chat/status/{job_id}")
def get_analysis_status(job_id: str):
    job = analysis_jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
        
    return job

# ---------------------------------------------------------
# BOT CHAT ENDPOINT
# ---------------------------------------------------------
class BotChatRequest(BaseModel):
    text: str
    audio_path: str = None

@router.post("/chat/bot")
def bot_chat(req: BotChatRequest, current_user: User = Depends(get_current_user)):
    """
    Standard text-based chat with Sentia.
    """
    # 1. Duplication Guard
    user_key = current_user.id
    if last_user_input_cache.get(user_key) == req.text.strip():
        return {"response": "", "duplicate": True}
    last_user_input_cache[user_key] = req.text.strip()
    
    # 2. Atomic Intelligence Hub
    # Handles: Predict, Map, Fuse, Safety, State, Log
    from ml.inference import get_sentia_intelligence, get_bot_response
    intel = get_sentia_intelligence(req.text, user_id=current_user.id)
    
    # 3. Generate Response
    bot_payload = get_bot_response(req.text, intel, user_id=current_user.id)
    
    # 4. OVERRIDE EMOTION IN DB
    if bot_payload and bot_payload.get("emotion"):
        from db.database import SessionLocal
        from db.models import EmotionLog
        db = SessionLocal()
        latest_log = db.query(EmotionLog).filter(EmotionLog.user_id == current_user.id).order_by(EmotionLog.created_at.desc()).first()
        if latest_log:
            latest_log.emotion = bot_payload["emotion"]
            db.commit()
        db.close()
        intel["emotion"] = bot_payload["emotion"]
    
    return {
        "response": bot_payload["response"],
        "emotion": intel["emotion"],
        "confidence": intel["confidence"],
        "trace": bot_payload["trace"]
    }

@router.post("/chat/bot/audio")
async def bot_chat_audio(
    text: str = Form(...),
    audio: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """
    Multi-modal chat with Sentia.
    """
    # 1. Save audio file
    storage_dir = "storage/audio"
    os.makedirs(storage_dir, exist_ok=True)
    audio_filename = f"{uuid.uuid4()}_{audio.filename}"
    audio_path = os.path.join(storage_dir, audio_filename)
    
    with open(audio_path, "wb") as buffer:
        shutil.copyfileobj(audio.file, buffer)

    # 2. Atomic Intelligence Hub
    from ml.inference import get_sentia_intelligence, get_bot_response
    intel = get_sentia_intelligence(text, audio_path=audio_path, user_id=current_user.id)
    
    # 3. Generate Response
    bot_payload = get_bot_response(text, intel, user_id=current_user.id)
    
    # 4. OVERRIDE EMOTION IN DB
    if bot_payload and bot_payload.get("emotion"):
        from db.database import SessionLocal
        from db.models import EmotionLog
        db = SessionLocal()
        latest_log = db.query(EmotionLog).filter(EmotionLog.user_id == current_user.id).order_by(EmotionLog.created_at.desc()).first()
        if latest_log:
            latest_log.emotion = bot_payload["emotion"]
            db.commit()
        db.close()
        intel["emotion"] = bot_payload["emotion"]
    
    return {
        "response": bot_payload["response"],
        "emotion": intel["emotion"],
        "confidence": intel["confidence"],
        "audio_path": audio_path,
        "trace": bot_payload["trace"]
    }


# ---------------------------------------------------------
# TEXT TO SPEECH ENDPOINT (Sarvam AI)
# ---------------------------------------------------------
from fastapi import Response
import base64
import requests

class TTSRequest(BaseModel):
    text: str
    target_language_code: str = "en-IN"
    speaker: str = "ishita"
    model: str = "bulbul:v3"

def split_text_into_chunks(text: str, max_chars: int = 450) -> list:
    """
    Split text into chunks of max_chars, trying to break at sentence boundaries.
    """
    if not text:
        return []
    
    # Split by common sentence markers
    import re
    sentences = re.split(r'([.।!?|])', text)
    
    chunks = []
    current_chunk = ""
    
    for i in range(0, len(sentences), 2):
        sentence = sentences[i]
        punctuation = sentences[i+1] if i+1 < len(sentences) else ""
        full_sentence = (sentence + punctuation).strip()
        
        if not full_sentence:
            continue
            
        if len(current_chunk) + len(full_sentence) + 1 <= max_chars:
            current_chunk = (current_chunk + " " + full_sentence).strip()
        else:
            if current_chunk:
                chunks.append(current_chunk)
            
            # If a single sentence is still too long, brute force split it
            if len(full_sentence) > max_chars:
                temp_sentence = full_sentence
                while len(temp_sentence) > max_chars:
                    chunks.append(temp_sentence[:max_chars])
                    temp_sentence = temp_sentence[max_chars:]
                current_chunk = temp_sentence
            else:
                current_chunk = full_sentence
                
    if current_chunk:
        chunks.append(current_chunk)
        
    return chunks

@router.post("/chat/tts")
def generate_sarvam_tts(req: TTSRequest, current_user: User = Depends(get_current_user)):
    from core.config import settings
    import os
    
    print(f"[TTS ENTRY] Received request with text: {repr(req.text)} | Speaker: {req.speaker}")
    
    # SAFEGUARD: Sarvam crashes on empty text. Return empty success if text is missing.
    if not req.text or not str(req.text).strip():
        print("[TTS DEBUG] Empty text caught by safeguard. Returning early.")
        return {"audios": [""], "language_code": req.target_language_code}

    # Supported speakers for bulbul:v3
    SUPPORTED_SPEAKERS = [
        'aditya', 'ritu', 'ashutosh', 'priya', 'neha', 'rahul', 'pooja', 'rohan', 
        'simran', 'kavya', 'amit', 'dev', 'ishita', 'shreya', 'ratan', 'varun', 
        'manan', 'sumit', 'roopa', 'kabir', 'aayan', 'shubh', 'advait', 'amelia', 
        'sophia', 'anand', 'tanya', 'tarun', 'sunny', 'mani', 'gokul', 'vijay', 
        'shruti', 'suhani', 'mohit', 'kavitha', 'rehan', 'soham', 'rupali'
    ]
    
    selected_speaker = req.speaker
    if selected_speaker not in SUPPORTED_SPEAKERS:
        print(f"[TTS ALERT] Falling back from incompatible speaker '{selected_speaker}' to 'ishita'")
        selected_speaker = "ishita"

    api_key = os.environ.get("LLM_API_KEY", settings.LLM_API_KEY)
    if not api_key:
        raise HTTPException(status_code=500, detail="Sarvam TTS API key not configured")
        
    url = "https://api.sarvam.ai/text-to-speech"
    headers = {
        "api-subscription-key": api_key,
        "Content-Type": "application/json"
    }
    
    print(f"[TTS DEBUG] Text sent to Sarvam: {req.text[:50]}... (Len: {len(req.text)}) Speaker: {selected_speaker}")
    
    print(f"[TTS DEBUG] Text length: {len(req.text)}. Splitting into chunks...")
    chunks = split_text_into_chunks(req.text)
    print(f"[TTS DEBUG] Number of chunks: {len(chunks)}")
    
    payload = {
        "inputs": chunks,
        "target_language_code": req.target_language_code,
        "speaker": selected_speaker,
        "model": req.model,
        "pace": 1.0,
        "enable_preprocessing": True
    }
    
    try:
        res = requests.post(url, headers=headers, json=payload, timeout=30)
        if res.status_code != 200:
            print(f"[TTS Error] {res.status_code} - {res.text}")
            raise HTTPException(status_code=502, detail="Failed to generate TTS audio")
            
        data = res.json()
        audios_b64 = data.get("audios", [])
        
        if not audios_b64:
            raise HTTPException(status_code=502, detail="No audio returned from TTS payload")
            
        # Bug 7 Fix: WAV files have a 44-byte header. Concatenating raw WAV bytes
        # produces multiple headers which causes browser audio glitches/silence.
        # Strip the header from all chunks after the first.
        WAV_HEADER_SIZE = 44
        final_audio_bytes = b""
        for i, b64 in enumerate(audios_b64):
            audio_bytes = base64.b64decode(b64)
            if i == 0:
                # Keep full header from first chunk
                final_audio_bytes += audio_bytes
            else:
                # Strip WAV header (44 bytes) from subsequent chunks
                if len(audio_bytes) > WAV_HEADER_SIZE:
                    final_audio_bytes += audio_bytes[WAV_HEADER_SIZE:]
                else:
                    final_audio_bytes += audio_bytes
            
        print(f"[TTS SUCCESS] Voice generated correctly with {len(chunks)} chunks.")
        return Response(content=final_audio_bytes, media_type="audio/wav")
        
    except requests.exceptions.Timeout:
        raise HTTPException(status_code=504, detail="TTS service timeout")
    except HTTPException:
        raise
    except Exception as e:
        print(f"[TTS Exception] {e}")
        raise HTTPException(status_code=500, detail=str(e))
