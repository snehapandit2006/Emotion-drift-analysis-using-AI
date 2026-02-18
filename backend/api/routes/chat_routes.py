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
from ml.inference import predict_emotion
from ml.advisor import generate_advice

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
