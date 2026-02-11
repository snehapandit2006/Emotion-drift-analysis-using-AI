from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    PROJECT_NAME: str = "Emotion Drift API"
    API_V1_STR: str = "/api/v1"
    
    # SECURITY
    SECRET_KEY: str = "dummy_secret_key_change_me_in_prod"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440 # 24 hours
    
    # DATABASE
    DATABASE_URL: str = "sqlite:///./storage/emotion.db"
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ]

    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
