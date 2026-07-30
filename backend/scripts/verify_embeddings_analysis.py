import sys
import os
from datetime import datetime, timedelta

# Add parent directory to path to enable local backend imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from db.database import SessionLocal
from db.models import User, SentiaMessage, SentiaConversation, CognitiveSnapshot
from analysis.cognitive_features import run_pattern_analysis

def verify_pattern_analysis():
    print("Connecting to database...")
    db = SessionLocal()
    try:
        # 1. Fetch or create a test user
        user = db.query(User).filter(User.email == "test_user_embeddings@example.com").first()
        if not user:
            print("Creating test user...")
            # We use hashed_password since User has hashed_password
            user = User(email="test_user_embeddings@example.com", hashed_password="dummy")
            db.add(user)
            db.commit()
            db.refresh(user)
        
        # Cleanup old messages
        conv_ids = [c.id for c in db.query(SentiaConversation).filter(SentiaConversation.user_id == user.id).all()]
        db.query(SentiaMessage).filter(SentiaMessage.conversation_id.in_(conv_ids)).delete(synchronize_session=False)
        db.query(SentiaConversation).filter(SentiaConversation.user_id == user.id).delete(synchronize_session=False)
        db.query(CognitiveSnapshot).filter(CognitiveSnapshot.user_id == user.id).delete(synchronize_session=False)
        db.commit()

        # Create a conversation
        conv = SentiaConversation(user_id=user.id)
        db.add(conv)
        db.commit()
        db.refresh(conv)

        # 2. Add some test user messages targeting catastrophizing and perfectionism
        messages_text = [
            "Hello, I am feeling very stressed today.",
            "I made a tiny mistake in my presentation and now I feel like everything is completely ruined. My life is over.", # Catastrophizing
            "I must get a perfect score on my exams, otherwise I am not smart enough and am a complete failure.", # Perfectionism
            "I'm skiping the meeting because I'm too anxious to face them, I'd rather cancel and stay home.", # Avoidance
            "Why do I always make these stupid mistakes? Why is everything so hard for me compared to others?" # Rumination
        ]

        print("Inserting sample messages...")
        for i, text in enumerate(messages_text):
            msg = SentiaMessage(
                conversation_id=conv.id,
                role="user",
                content=text,
                timestamp=datetime.utcnow() - timedelta(minutes=10 - i)
            )
            db.add(msg)
        db.commit()

        # 3. Trigger pattern analysis
        print("Running pattern analysis (which computes embedding similarities)...")
        profile = run_pattern_analysis(user.id, db)

        # 4. Print results
        print("\n--- COGNITIVE SNAPSHOT RESULTS ---")
        print(f"Messages Analyzed: {profile.messages_analyzed}")
        print(f"Days Covered: {profile.days_covered}")
        print("\n[TRAITS]")
        print(f"Perfectionism: {profile.perfectionism} (confidence: {profile.perfectionism_confidence})")
        print(f"Avoidance: {profile.avoidance_trait} (confidence: {profile.avoidance_confidence})")
        print(f"Rumination: {profile.rumination_tendency} (confidence: {profile.rumination_confidence})")
        
        print("\n[STATES]")
        print(f"Burnout: {profile.burnout_state} (confidence: {profile.burnout_confidence})")
        print(f"Motivation: {profile.motivation_level} (confidence: {profile.motivation_confidence})")
        print(f"Stress Adaptation: {profile.stress_adaptation} (confidence: {profile.stress_adaptation_confidence})")
        print(f"Cognitive Flexibility: {profile.cognitive_flexibility} (confidence: {profile.cognitive_flexibility_confidence})")

        print("\n[AUDIT SIGNALS]")
        print(f"Catastrophic phrases: {profile.catastrophic_phrases_count}")
        print(f"Self-critical phrases: {profile.self_critical_phrases_count}")
        print(f"Avoidance phrases: {profile.avoidance_phrases_count}")
        print(f"Negative repetition: {profile.negative_repetition_count}")

        # Assertions to verify semantic embedding scoring works
        print("\nRunning assertions...")
        assert profile.perfectionism > 0.4, f"Perfectionism should be high, got {profile.perfectionism}"
        assert profile.rumination_tendency > 0.4, f"Rumination tendency should be high, got {profile.rumination_tendency}"
        assert profile.avoidance_trait > 0.4, f"Avoidance trait should be high, got {profile.avoidance_trait}"
        print("SUCCESS: All embedding-based scoring assertions passed successfully!")

    except Exception as e:
        print(f"Verification FAILED: {e}")
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    verify_pattern_analysis()
