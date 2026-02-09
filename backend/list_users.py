import sys
import os
sys.path.append(os.getcwd())
from db.database import SessionLocal
from db.models import User

db = SessionLocal()
users = db.query(User).all()

print(f"Found {len(users)} users:")
for u in users:
    print(f"ID: {u.id}, Email: '{u.email}'")

db.close()
