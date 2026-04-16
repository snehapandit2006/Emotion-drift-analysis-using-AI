from pydantic_settings import BaseSettings
from typing import List
import os


env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")
override_key = ""
override_model = "sarvam-m"
if os.path.exists(env_path):
    with open(env_path, "r", encoding="utf-8") as f:
        for line in f:
            if line.startswith("LLM_API_KEY="):
                override_key = line.split("=", 1)[1].strip().strip('"\'')
            if line.startswith("LLM_MODEL="):
                override_model = line.split("=", 1)[1].strip().strip('"\'')
    if override_key:
        os.environ["LLM_API_KEY"] = override_key
    if override_model:
        os.environ["LLM_MODEL"] = override_model



class Settings(BaseSettings):
    PROJECT_NAME: str = "Emotion Drift API"
    API_V1_STR: str = "/api/v1"
    
    # SECURITY
    SECRET_KEY: str = os.environ.get("SECRET_KEY", "dummy_secret_key_change_me_in_prod")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440 # 24 hours
    
    # DATABASE
    # On Render, the DATABASE_URL is provided as 'postgres://' but SQLAlchemy needs 'postgresql://'
    _db_url = os.environ.get("DATABASE_URL", "sqlite:///./storage/emotion.db")
    if _db_url.startswith("postgres://"):
        _db_url = _db_url.replace("postgres://", "postgresql://", 1)
    DATABASE_URL: str = _db_url
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://emotion-drift.vercel.app", # Placeholder for user's actual domain
    ]

    # LLM CONFIG
    LLM_API_KEY: str = os.environ.get("LLM_API_KEY", "")
    LLM_MODEL: str = os.environ.get("LLM_MODEL", "sarvam-m")

    class Config:
        env_file = ".env"
        extra = "allow"
        case_sensitive = True

settings = Settings()
