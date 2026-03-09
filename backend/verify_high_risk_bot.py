import sys
import os

# Add the current directory to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from db.database import SessionLocal
from ml.llm_bridge import handle_doctor_voice_query

def verify_high_risk():
    db = SessionLocal()
    try:
        # Sneha (ID 1) is assigned to doctor ID 3 (based on previous logs)
        # Let's find the doctor ID for ID 1
        from db.models import User
        patient = db.query(User).filter(User.id == 1).first()
        if not patient:
            print("Patient ID 1 not found.")
            return
            
        doc_id = patient.doctor_id
        print(f"Testing for Doctor ID: {doc_id} (Patient ID 1 is assigned to this doctor)")

        queries = [
            "Are there any high risk patients?",
            "Any high risk alerts?",
            "High risk patients check"
        ]
        
        for q in queries:
            print(f"\nQUERY: {q}")
            response = handle_doctor_voice_query(q, db, doctor_id=doc_id)
            print(f"RESPONSE: {response}")
            
    finally:
        db.close()

if __name__ == "__main__":
    verify_high_risk()
