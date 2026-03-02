import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from db.database import SessionLocal, engine, Base
from db.models import User

def check_user():
    # Ensure tables exist
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    user = db.query(User).filter(User.email == "sneha20061901@gmail.com").first()
    if user:
        print(f"User found: {user.email} (ID: {user.id})")
    else:
        print("User NOT found.")
    db.close()

if __name__ == "__main__":
    check_user()
