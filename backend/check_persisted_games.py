import sys
import os
import json

# Add the current directory to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from db.database import SessionLocal
from db.models import User

def check_game_logos():
    db = SessionLocal()
    try:
        users = db.query(User).all()
        for u in users:
            if u.preferred_games:
                print(f"User ID: {u.id} | Email: {u.email}")
                try:
                    games = json.loads(u.preferred_games)
                    print(json.dumps(games, indent=2))
                except:
                    print(f"  Plain text games: {u.preferred_games}")
    finally:
        db.close()

if __name__ == "__main__":
    check_game_logos()
