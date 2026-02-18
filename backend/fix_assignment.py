from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from db.models import User
from core.config import settings

# Setup DB connection
engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

# Emails
doctor_email = "doctor@sentia.com"
patient_email = "sneha20061901@gmail.com"

# Fetch users
doctor = db.query(User).filter(User.email == doctor_email).first()
patient = db.query(User).filter(User.email == patient_email).first()

if not doctor:
    print(f"Doctor {doctor_email} not found!")
    # Create doctor if missing for some reason (though user said they logged in)
    # ... logic skipped, assuming doctor exists as per prompt
else:
    print(f"Doctor found: ID {doctor.id}")

if not patient:
    print(f"Patient {patient_email} not found!")
else:
    print(f"Patient found: ID {patient.id}, Current Doctor ID: {patient.doctor_id}")
    
    # Assign
    if doctor and patient:
        patient.doctor_id = doctor.id
        db.commit()
        print(f"SUCCESS: Assigned {patient_email} to {doctor_email}")
    else:
        print("Could not assign.")

db.close()
