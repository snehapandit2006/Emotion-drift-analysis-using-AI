import sys
import os

# Set up paths
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from db.database import SessionLocal
from db.models import User, CognitiveSnapshot, CBTReflection
from analysis.cognitive_features import run_pattern_analysis

def test_run():
    db = SessionLocal()
    try:
        user = db.query(User).first()
        if not user:
            print("No users in database. Create one or run seeder first.")
            return
        
        print(f"Running test analysis for user: {user.email} (ID: {user.id})")
        profile = run_pattern_analysis(user.id, db)
        print("Analysis completed successfully!")
        print(f"Latest perfectionism: {profile.perfectionism} (confidence: {profile.perfectionism_confidence})")
        print(f"Latest avoidance: {profile.avoidance_trait} (confidence: {profile.avoidance_confidence})")
        print(f"Latest rumination: {profile.rumination_tendency} (confidence: {profile.rumination_confidence})")
        print(f"Latest burnout state: {profile.burnout_state} (confidence: {profile.burnout_confidence})")
        print(f"Latest motivation level: {profile.motivation_level} (confidence: {profile.motivation_confidence})")
        print(f"Latest stress adaptation: {profile.stress_adaptation} (confidence: {profile.stress_adaptation_confidence})")
        print(f"Latest cognitive flexibility: {profile.cognitive_flexibility} (confidence: {profile.cognitive_flexibility_confidence})")
        print(f"Recovery effectiveness: {profile.recovery_effectiveness}")
        print(f"Narrative summary: {profile.notes}")
    except Exception as e:
        print(f"Error occurred: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    test_run()
