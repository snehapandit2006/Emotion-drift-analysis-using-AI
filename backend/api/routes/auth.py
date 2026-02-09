from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta
import requests
import secrets

from db.models import User
from core.security import verify_password, get_password_hash, create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES
from api.deps import get_db
from pydantic import BaseModel

class GoogleLoginRequest(BaseModel):
    access_token: str

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/google", response_model=dict)
def google_login(payload: GoogleLoginRequest, db: Session = Depends(get_db)):
    print(f"Received Google login request") # Debug logging
    # Verify token with Google
    try:
        res = requests.get(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            params={"access_token": payload.access_token}
        )
        res.raise_for_status()
        user_info = res.json()
        print("Google user info retrieved")
    except requests.RequestException as e:
        print(f"Google API Error: {e}")
        raise HTTPException(status_code=400, detail="Invalid Google token")
    
    email = user_info.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Google account has no email")
    
    # Check if user exists
    user = db.query(User).filter(User.email == email).first()
    if not user:
        print(f"Creating new user for {email}")
        # Create user with random password
        # bcrypt has a 72 byte limit. 
        # secrets.token_hex(16) produces 32 characters, which is well within the limit.
        random_password = secrets.token_hex(16)
        print(f"Generated password length: {len(random_password)}")
        # bcrypt limit is 72 bytes. secrets.token_hex(16) is 32 bytes.
        # Enforce limit strictly just in case (though it should be fine).
        if len(random_password) > 50:
            random_password = random_password[:50]
            
        try:
            hashed_password = get_password_hash(random_password)
        except Exception as e:
            print(f"Hashing failed: {e}")
            raise HTTPException(status_code=500, detail=f"Hashing failed: {str(e)}")

        user = User(email=email, hashed_password=hashed_password)
        db.add(user)
        db.commit()
        db.refresh(user)
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer", "user_id": user.id, "email": user.email}

class SignupRequest(BaseModel):
    email: str
    password: str

@router.post("/signup", response_model=dict)
def signup(payload: SignupRequest, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == payload.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = get_password_hash(payload.password)
    new_user = User(email=payload.email, hashed_password=hashed_password)
    db.add(new_user)
    db.commit()
    return {"msg": "User created successfully"}

@router.post("/token", response_model=dict)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # --- DEBUGGING ---
    print(f"Login Attempt: username='{form_data.username}', password_len={len(form_data.password)}")
    # -----------------
    
    # --- TEST USER IMPLEMENTATION ---
    if form_data.username == "test@example.com" and form_data.password == "password":
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": "test@example.com"}, expires_delta=access_token_expires
        )
        return {"access_token": access_token, "token_type": "bearer", "user_id": 1, "email": "test@example.com"}
    # --------------------------------

    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer", "user_id": user.id, "email": user.email}

# --- Forgot Password / Reset Implementation ---

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

@router.post("/forgot-password")
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        # Don't reveal if user exists or not for security, but for this app we'll be direct or just pretend success
        # stick to pretending success to prevent enumeration, or just 404 if it's internal tool.
        # Let's return success but log that user wasn't found.
        print(f"Forgot password for non-existent email: {payload.email}")
        return {"msg": "If the email exists, a reset code has been sent."}
    
    # Generate a simple reset code (in production, sign this with a secret)
    # For now, we'll just use a random hex string and NOT save it in DB for simplicity of this task,
    # BUT to make it work 'real time' we need to verify it. 
    # Let's create a temporary token using our existing jwt structure but with a short expiry.
    
    expires = timedelta(minutes=15)
    reset_token = create_access_token(
        data={"sub": user.email, "type": "reset"}, 
        expires_delta=expires
    )
    
    # --- SIMULATED EMAIL ---
    print("\n" + "="*50)
    print(f"PASSWORD RESET REQUEST FOR: {user.email}")
    print(f"RESET TOKEN: {reset_token}")
    print("="*50 + "\n")
    # -----------------------
    
    return {"msg": "Reset code sent to console (simulated email)"}

@router.post("/reset-password")
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    from core.security import verify_token_data # You might need to import or reuse decoding logic
    from jose import jwt, JWTError
    from core.security import SECRET_KEY, ALGORITHM
    
    try:
        # Decode token manually since we put a custom "type" claim in it
        decoded = jwt.decode(payload.token, SECRET_KEY, algorithms=[ALGORITHM])
        email = decoded.get("sub")
        token_type = decoded.get("type")
        
        if email is None or token_type != "reset":
            raise HTTPException(status_code=400, detail="Invalid token")
            
        user = db.query(User).filter(User.email == email).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
            
        # Update password
        user.hashed_password = get_password_hash(payload.new_password)
        db.commit()
        
        return {"msg": "Password updated successfully"}
        
    except JWTError:
        raise HTTPException(status_code=400, detail="Invalid or expired token")
