import os
import json
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from google_auth_oauthlib.flow import Flow
import google.oauth2.credentials
from google.auth.transport.requests import Request as GoogleRequest

from db.database import SessionLocal
from db.models import User
from core.config import settings
from api.deps import get_current_user

router = APIRouter(prefix="/auth/google", tags=["Google Auth"])

# Scopes for Fitness data
SCOPES = [
    'openid',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/fitness.activity.read',
    'https://www.googleapis.com/auth/fitness.heart_rate.read',
    'https://www.googleapis.com/auth/fitness.blood_pressure.read',
    'https://www.googleapis.com/auth/fitness.body.read'
]

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

from jose import jwt, JWTError

from fastapi import Response
@router.get("/login")
async def login(token: str, db: Session = Depends(get_db)):
    """
    Initial step of Google OAuth flow.
    Redirects user to Google authorization page.
    Requires JWT token passed via query parameter.
    """
    from core.config import settings
    # Manually decode the token
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
        
    current_user = db.query(User).filter(User.email == email).first()
    if not current_user:
        raise HTTPException(status_code=404, detail="User not found")
    # Create client config from settings
    client_config = {
        "web": {
            "client_id": settings.GOOGLE_CLIENT_ID,
            "client_secret": settings.GOOGLE_CLIENT_SECRET,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": [settings.GOOGLE_REDIRECT_URI]
        }
    }
    
    flow = Flow.from_client_config(
        client_config,
        scopes=SCOPES,
        redirect_uri=settings.GOOGLE_REDIRECT_URI
    )
    
    # Generate authorization URL
    auth_url, _ = flow.authorization_url(
        access_type='offline',
        prompt='consent',
        include_granted_scopes='true',
        state=str(current_user.id)
    )
    
    # Store the PKCE verifier in a cookie and redirect
    redirect_res = RedirectResponse(auth_url)
    redirect_res.set_cookie(
        key="code_verifier",
        value=flow.code_verifier,
        httponly=True,
        max_age=600,  # 10 minutes
        samesite="lax"
    )
    return redirect_res

@router.get("/callback")
async def callback(request: Request, db: Session = Depends(get_db)):
    """
    Callback from Google. Exchange authorization code for tokens.
    """
    code = request.query_params.get("code")
    user_id = request.query_params.get("state")
    
    if not code or not user_id:
        raise HTTPException(status_code=400, detail="Missing authorization code or state")
    
    client_config = {
        "web": {
            "client_id": settings.GOOGLE_CLIENT_ID,
            "client_secret": settings.GOOGLE_CLIENT_SECRET,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": [settings.GOOGLE_REDIRECT_URI]
        }
    }
    
    # Retrieve the code verifier from cookie
    code_verifier = request.cookies.get("code_verifier")
    
    flow = Flow.from_client_config(
        client_config,
        scopes=SCOPES,
        redirect_uri=settings.GOOGLE_REDIRECT_URI
    )
    
    # Set the verifier back into the flow before fetching the token
    if code_verifier:
        flow.code_verifier = code_verifier
    
    try:
        flow.fetch_token(code=code)
        credentials = flow.credentials
        
        # Save refresh token to user
        user = db.query(User).filter(User.id == int(user_id)).first()
        if user:
            user.google_refresh_token = credentials.refresh_token
            db.commit()
            
            # Redirect back to the frontend with a success flag
            # Note: Hardcoded to localhost for now, will use env var eventually
            return RedirectResponse(url="http://localhost:5173/dashboard?vitals_connected=true")
        else:
            raise HTTPException(status_code=404, detail="User not found")
            
    except Exception as e:
        print(f"OAuth Callback Error: {e}")
        raise HTTPException(status_code=500, detail=f"Authentication failed: {str(e)}")
