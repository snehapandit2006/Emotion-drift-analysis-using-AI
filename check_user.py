from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from db.models import User
from core.config import settings

# Adjust connection string if needed, assuming default sqlite or similar from settings
# But settings is not imported. Let's look at db/database.py to see how to connect.
from db.database import SessionLocal

db = SessionLocal()
email = "panditsneha057@gmail.com"
user = db.query(User).filter(User.email == email).first()

if user:
    print(f"User found: {user.email}")
    print(f"ID: {user.id}")
    print(f"Hashed Password: {user.hashed_password!r}")
else:
    print(f"User {email} not found.")

db.close()
