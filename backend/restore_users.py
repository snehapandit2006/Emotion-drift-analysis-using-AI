import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from db.database import SessionLocal, engine, Base
from db.models import User
from core.security import get_password_hash

def restore_users():
    # Ensure tables exist
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    
    users_to_create = [
        {"email": "sneha20061901@gmail.com", "password": "password123", "role": "patient"},
        {"email": "test@example.com", "password": "password", "role": "patient"}
    ]
    
    for u_data in users_to_create:
        existing = db.query(User).filter(User.email == u_data["email"]).first()
        if not existing:
            print(f"Creating user: {u_data['email']}")
            hashed = get_password_hash(u_data["password"])
            new_user = User(email=u_data["email"], hashed_password=hashed, role=u_data["role"])
            db.add(new_user)
            db.commit()
            print(f"Successfully created {u_data['email']}")
        else:
            print(f"User {u_data['email']} already exists.")
            
    db.close()

if __name__ == "__main__":
    restore_users()
