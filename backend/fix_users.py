import os, sys
sys.path.append(os.getcwd())
from db.database import SessionLocal
from db.models import User

db = SessionLocal()
users = db.query(User).filter(User.email.in_(['sneha20061901@gmail.com', 'snehapandit2006@gmail.com'])).all()
cnt = 0
for u in users:
    u.doctor_id = 3 # panditsneha057@gmail.com
    cnt += 1
db.commit()
print(f"Updated {cnt} users to doctor 3")
db.close()
