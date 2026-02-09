import sys
import os
sys.path.append(os.getcwd()) 

from db.database import SessionLocal
from db.models import User

db = SessionLocal()
email = "sneha20061901@gmail.com"
user = db.query(User).filter(User.email == email).first()

if user:
    print(f"User found: {user.email}")
    print(f"ID: {user.id}")
    print(f"Hashed Password: {user.hashed_password!r}")
    
    from core.security import verify_password
    try:
        # Assuming password is "123456" based on previous context
        is_valid = verify_password("123456", user.hashed_password)
        print(f"Verification result for '123456': {is_valid}")
    except Exception as e:
        print(f"Verification FAILED with error: {e}")
        import traceback
        traceback.print_exc()

else:
    print(f"User {email} not found.")

db.close()
