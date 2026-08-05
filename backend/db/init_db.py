from db.database import engine, Base, SessionLocal
from db.models import User
from core.security import get_password_hash, verify_password


def init_db():
    """
    Initialize database tables using SQLAlchemy ORM and ensure default demo users exist.
    Safe to run multiple times.
    """
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        default_users = [
            {"email": "sneha20061901@gmail.com", "password": "password123", "role": "patient"},
            {"email": "panditsneha057@gmail.com", "password": "password123", "role": "psychiatrist"},
            {"email": "doctor@sentia.com", "password": "password123", "role": "psychiatrist"},
        ]

        doctor_user = None
        for u_data in default_users:
            user = db.query(User).filter(User.email.ilike(u_data["email"])).first()
            if not user:
                print(f"[init_db] Creating default user: {u_data['email']}")
                hashed = get_password_hash(u_data["password"])
                user = User(email=u_data["email"], hashed_password=hashed, role=u_data["role"])
                db.add(user)
                db.commit()
                db.refresh(user)
            else:
                if not verify_password(u_data["password"], user.hashed_password):
                    print(f"[init_db] Updating password hash for: {u_data['email']}")
                    user.hashed_password = get_password_hash(u_data["password"])
                    user.role = u_data["role"]
                    db.commit()

            if u_data["role"] == "psychiatrist" and not doctor_user:
                doctor_user = user

        # Assign doctor to patient
        patient = db.query(User).filter(User.email.ilike("sneha20061901@gmail.com")).first()
        if patient and doctor_user and not patient.doctor_id:
            patient.doctor_id = doctor_user.id
            db.commit()

    except Exception as e:
        print(f"[init_db] Seeding notice: {e}")
        db.rollback()
    finally:
        db.close()
