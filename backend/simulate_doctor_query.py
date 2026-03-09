import sys
import os

# Add the current directory to sys.path so we can import backend modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from ml.llm_bridge import handle_doctor_voice_query
from db.database import SessionLocal
from db.models import User

def simulate():
    db = SessionLocal()
    try:
        # We know patient 1 exists from logs
        # And we need a doctor_id. Let's assume 3 based on logs.
        query = "Summarize patient one."
        print(f"Simulating query: {query}")
        response = handle_doctor_voice_query(query, db, 3, context_patient_id=1)
        print("\n--- FINAL RESPONSE TO UI ---")
        print(response)
        print("----------------------------")
    finally:
        db.close()

if __name__ == "__main__":
    simulate()
