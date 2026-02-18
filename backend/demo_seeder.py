import sys
import os
import argparse
from datetime import datetime, timedelta, timezone
import random

# Add project root to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from db.database import SessionLocal
from db.models import User, EmotionLog, FaceEmotionLog

def seed_data(user_identity, pattern, days=14):
    db = SessionLocal()
    try:
        # Find user
        # Try direct ID
        user = None
        if user_identity.isdigit():
             user = db.query(User).filter(User.id == int(user_identity)).first()
        
        # Try email
        if not user:
            user = db.query(User).filter(User.email == user_identity).first()

        if not user:
            print(f"User '{user_identity}' not found.")
            return

        print(f"Seeding data for user: {user.email} (ID: {user.id})")
        print(f"Pattern: {pattern}")
        
        # Clear existing logs for this period to ensure clean demo?
        # Maybe optional. For now, let's just add. 
        # Actually for a demo, clearing recent might be better to guarantee the result.
        cutoff = datetime.now(timezone.utc) - timedelta(days=days)
        
        deleted_text = db.query(EmotionLog).filter(EmotionLog.user_id == user.id, EmotionLog.created_at >= cutoff).delete()
        deleted_face = db.query(FaceEmotionLog).filter(FaceEmotionLog.user_id == user.id, FaceEmotionLog.timestamp >= cutoff).delete()
        print(f"Cleared {deleted_text} text logs and {deleted_face} face logs from the last {days} days.")

        # Define patterns
        # Format: (emotion, confidence, probability)
        patterns = {
            "depression": {
                "text": [("sadness", 0.9, 0.7), ("neutral", 0.5, 0.2), ("fear", 0.6, 0.1)],
                "face": [("sad", 0.85, 0.8), ("neutral", 0.5, 0.2)]
            },
            "anxiety": {
                "text": [("fear", 0.9, 0.8), ("worry", 0.8, 0.1), ("neutral", 0.5, 0.1)],
                "face": [("fear", 0.85, 0.8), ("surprise", 0.6, 0.2)]
                # Note: volatility is needed for anxiety. We need to switch emotions frequently.
            },
            "stress": {
                "text": [("anger", 0.9, 0.6), ("disgust", 0.7, 0.2), ("neutral", 0.5, 0.2)],
                "face": [("angry", 0.85, 0.7), ("disgust", 0.6, 0.3)]
            },
            "healthy": {
                "text": [("joy", 0.9, 0.4), ("neutral", 0.6, 0.3), ("surprise", 0.7, 0.1), ("happy", 0.9, 0.2)],
                "face": [("happy", 0.9, 0.5), ("neutral", 0.6, 0.4), ("surprise", 0.7, 0.1)]
            }
        }

        if pattern not in patterns:
            print(f"Unknown pattern '{pattern}'. Available: {list(patterns.keys())}")
            return

        selected_pattern = patterns[pattern]
        
        # Generate logs
        start_date = datetime.now(timezone.utc) - timedelta(days=days)
        
        log_count = 0
        current_time = start_date
        
        while current_time < datetime.now(timezone.utc):
            # Add some randomness to time gaps (2-6 hours)
            gap = random.randint(2*60, 6*60)
            current_time += timedelta(minutes=gap)
            if current_time > datetime.now(timezone.utc):
                break

            # Text Log
            # For anxiety, we want standard distribution but also high volatility implies switching.
            # Our detection logic checks frequency + stability.
            
            # Simple weighted choice
            def pick(options):
                r = random.random()
                cumulative = 0
                for emotion, conf, prob in options:
                    cumulative += prob
                    if r <= cumulative:
                        return emotion, conf
                return options[0][0], options[0][1]

            t_emo, t_conf = pick(selected_pattern["text"])
            f_emo, f_conf = pick(selected_pattern["face"])
            
            # Special case for Anxiety volatility: force rapid switches if pattern is anxiety
            # REVISION: Forced flipping reduced fear freq too much. 
            # Instead, we rely on the probabilistic mix defined above (80% fear, 20% other) which creates some natural volatility
            # or we can just flip occasionally, not 50% of the time.
            if pattern == "anxiety" and log_count % 3 == 0: 
                 # Flip every 3rd log instead of every 2nd
                 if t_emo == "fear": t_emo = "neutral"
                 if f_emo == "fear": f_emo = "surprise"
                 
            text_log = EmotionLog(
                user_id=user.id,
                text=f"Demo text entry for {t_emo}",
                emotion=t_emo,
                confidence=t_conf,
                created_at=current_time
            )
            db.add(text_log)
            
            # Face log (maybe slightly different time or same)
            face_log = FaceEmotionLog(
                user_id=user.id,
                emotion=f_emo,
                confidence=f_conf,
                timestamp=current_time
            )
            db.add(face_log)
            log_count += 1
            
        db.commit()
        print(f"Successfully seeded {log_count} pairs of logs for '{pattern}' pattern.")

    except Exception as e:
        print(f"Error seeding data: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed database for demo patterns.")
    parser.add_argument("--user", required=True, help="User ID or Email")
    parser.add_argument("--pattern", required=True, choices=["depression", "anxiety", "stress", "healthy"], help="Pattern type to generate")
    parser.add_argument("--days", type=int, default=14, help="Days of history to generate")

    args = parser.parse_args()
    seed_data(args.user, args.pattern, args.days)
