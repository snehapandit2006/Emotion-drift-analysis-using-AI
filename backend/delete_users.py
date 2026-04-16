import os, sys
sys.path.append(os.getcwd())
from db.database import SessionLocal
from db.models import User

db = SessionLocal()

emails_to_keep = ['sneha20061901@gmail.com', 'panditsneha057@gmail.com']

users_to_delete = db.query(User).filter(~User.email.in_(emails_to_keep)).all()
cnt = 0

print(f"Planning to delete {len(users_to_delete)} users.")

for u in users_to_delete:
    print(f"Deleting ID: {u.id}, Email: '{u.email}'")
    db.delete(u)
    cnt += 1

db.commit()
print(f"Successfully deleted {cnt} users.")

remaining_users = db.query(User).all()
print("\nRemaining users:")
for u in remaining_users:
    print(f"ID: {u.id}, Email: '{u.email}'")

db.close()
