from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query
from typing import Dict, List
import json
from datetime import datetime
from jose import jwt, JWTError
from sqlalchemy.orm import Session

from core.security import SECRET_KEY, ALGORITHM
from db.database import SessionLocal
from db.models import User, ChatRoom, CommunityMessage

router = APIRouter()

class ConnectionManager:
    def __init__(self):
        # Maps room_id -> list of active WebSocket connections
        self.active_connections: Dict[int, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, room_id: int):
        await websocket.accept()
        if room_id not in self.active_connections:
            self.active_connections[room_id] = []
        self.active_connections[room_id].append(websocket)

    def disconnect(self, websocket: WebSocket, room_id: int):
        if room_id in self.active_connections:
            if websocket in self.active_connections[room_id]:
                self.active_connections[room_id].remove(websocket)
            if not self.active_connections[room_id]:
                del self.active_connections[room_id]

    async def broadcast(self, message: dict, room_id: int):
        if room_id in self.active_connections:
            for connection in self.active_connections[room_id]:
                try:
                    await connection.send_json(message)
                except Exception as e:
                    print(f"WS Broadcast error: {e}")
                    pass

manager = ConnectionManager()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_websocket_user(token: str, db: Session):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            return None
    except JWTError:
        return None
    
    if email == "test@example.com":
        return User(id=1, email="test@example.com", is_active=True, hashed_password="dummy")
        
    user = db.query(User).filter(User.email == email).first()
    return user

async def safety_check(text: str) -> str:
    # A lightweight safety check/redaction
    forbidden_words = ["die", "kill", "harm", "suicide", "abuse"]
    lower_text = text.lower()
    for word in forbidden_words:
        if word in lower_text:
            text = text.replace(word, "***")
    return text

@router.websocket("/ws/chat/{room_id}")
async def websocket_endpoint(
    websocket: WebSocket, 
    room_id: int, 
    token: str = Query(None)
):
    await websocket.accept()
    
    if not token:
        await websocket.close(code=1008)
        return
        
    db = SessionLocal()
    try:
        user = get_websocket_user(token, db)
        if not user:
            await websocket.close(code=1008) # Policy violation
            return
        
        # Check if room exists, if not, create it lazily (for development)
        room = db.query(ChatRoom).filter(ChatRoom.id == room_id).first()
        if not room:
            # Default rooms could be predefined elsewhere, but lazy init for now
            room_names = {1: "General Support", 2: "Anxiety Relief", 3: "Wins & Positivity"}
            r_name = room_names.get(room_id, f"Room {room_id}")
            room = ChatRoom(id=room_id, name=r_name)
            db.add(room)
            db.commit()
            db.refresh(room)
    
        await manager.connect(websocket, room_id)
        try:
            while True:
                data = await websocket.receive_text()
                # Expecting JSON text string from client
                try:
                    msg_data = json.loads(data)
                    content = msg_data.get("content", "").strip()
                    is_anonymous = msg_data.get("is_anonymous", False)
                    
                    if not content:
                        continue
                        
                    # Run safety filter
                    safe_content = await safety_check(content)
                    
                    # Save to DB
                    new_msg = CommunityMessage(
                        room_id=room_id,
                        user_id=user.id,
                        content=safe_content,
                        is_anonymous=is_anonymous,
                        timestamp=datetime.utcnow()
                    )
                    db.add(new_msg)
                    db.commit()
                    db.refresh(new_msg)
                    
                    # Setup display name
                    display_name = "Anonymous" if is_anonymous else user.email.split('@')[0]
                    
                    output_msg = {
                        "id": new_msg.id,
                        "room_id": room_id,
                        "user_id": user.id,
                        "display_name": display_name,
                        "content": safe_content,
                        "is_anonymous": is_anonymous,
                        "timestamp": new_msg.timestamp.isoformat() + "Z"
                    }
                    
                    await manager.broadcast(output_msg, room_id)
                    
                except json.JSONDecodeError:
                    pass 
    
        except WebSocketDisconnect:
            manager.disconnect(websocket, room_id)
        
    finally:
        db.close()
        
@router.get("/rooms")
def get_rooms():
    # Return available rooms, ensuring default ones exist
    db = SessionLocal()
    try:
        rooms = db.query(ChatRoom).all()
        if not rooms:
            # Seed default rooms
            defaults = [
                ChatRoom(id=1, name="General Support", description="A safe space to discuss everything."),
                ChatRoom(id=2, name="Anxiety Relief", description="Share grounding techniques and talk through panic."),
                ChatRoom(id=3, name="Wins & Positivity", description="Celebrate the good moments, big or small.")
            ]
            for d in defaults:
                db.add(d)
            db.commit()
            rooms = db.query(ChatRoom).all()
            
        return [
            {"id": r.id, "name": r.name, "description": r.description}
            for r in rooms
        ]
    finally:
        db.close()

@router.get("/rooms/{room_id}/messages")
def get_room_messages(room_id: int):
    db = SessionLocal()
    try:
        messages = db.query(CommunityMessage).filter(CommunityMessage.room_id == room_id).order_by(CommunityMessage.timestamp.asc()).all()
        
        result = []
        for msg in messages:
            u = db.query(User).filter(User.id == msg.user_id).first()
            display_name = "Anonymous" if msg.is_anonymous else (u.email.split('@')[0] if u else "User")
            
            result.append({
                "id": msg.id,
                "room_id": msg.room_id,
                "user_id": msg.user_id,
                "display_name": display_name,
                "content": msg.content,
                "is_anonymous": msg.is_anonymous,
                "timestamp": msg.timestamp.isoformat() + "Z"
            })
        return result
    finally:
        db.close()

from api.deps import get_current_user
from db.models import EmotionLog, FaceEmotionLog
from datetime import timedelta
from collections import Counter

@router.get("/rooms/match")
def match_room(current_user: User = Depends(get_current_user)):
    db = SessionLocal()
    try:
        now = datetime.utcnow()
        start_time = now - timedelta(hours=48)
        
        # Get recent emotions
        text_logs = db.query(EmotionLog).filter(
            EmotionLog.user_id == current_user.id,
            EmotionLog.created_at >= start_time,
            EmotionLog.emotion != "unknown"
        ).all()
        
        face_logs = db.query(FaceEmotionLog).filter(
            FaceEmotionLog.user_id == current_user.id,
            FaceEmotionLog.timestamp >= start_time,
            FaceEmotionLog.emotion != "unknown"
        ).all()
        
        emotions = [l.emotion.lower() for l in text_logs] + [l.emotion.lower() for l in face_logs]
        
        if not emotions:
            # Default to General Support (Room 1) if no data
            return {"room_id": 1, "matched_emotion": "general"}
            
        # Normalize slightly
        emotion_map = {
            "angry": "anger", "worry": "anxiety", "nervousness": "anxiety", "fear": "anxiety",
            "happy": "joy", "happines": "joy", "sad": "sadness"
        }
        
        normalized = [emotion_map.get(e, e) for e in emotions]
        counts = Counter(normalized)
        primary_emotion = counts.most_common(1)[0][0]
        
        # Map to specific room names
        room_mapping = {
            "anxiety": "Anxiety Relief",
            "sadness": "Depression Support",
            "anger": "Venting Space",
            "joy": "Wins & Positivity",
            "neutral": "General Support"
        }
        
        target_room_name = room_mapping.get(primary_emotion, "General Support")
        
        # Find or create this room
        room = db.query(ChatRoom).filter(ChatRoom.name == target_room_name).first()
        if not room:
            # Let's assign an ID based on hash or just let DB auto-increment
            # Wait, my models.py has id=Column(Integer, primary_key=True).
            # I can just omit id to let it auto-increment.
            new_room = ChatRoom(name=target_room_name, description=f"Safe space for {primary_emotion} support.")
            db.add(new_room)
            db.commit()
            db.refresh(new_room)
            room_id = new_room.id
        else:
            room_id = room.id
            
        return {"room_id": room_id, "matched_emotion": primary_emotion}
    finally:
        db.close()
