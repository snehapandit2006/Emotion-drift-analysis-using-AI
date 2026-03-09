import sys
import os
import json

# Add the current directory to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from db.database import SessionLocal
from db.models import User

# Stable PNG URLs
NEW_LOGOS = {
    "Tetris": "https://upload.wikimedia.org/wikipedia/commons/f/f7/Tetris_logo.png",
    "2048": "https://upload.wikimedia.org/wikipedia/commons/3/30/2048_logo.png",
    "Flow": "https://is1-ssl.mzstatic.com/image/thumb/Purple126/v4/4a/d6/3c/4ad63c1d-19cc-8461-9f93-162808c16d56/AppIcon-0-0-1x_U007emarketing-0-0-0-7-0-0-sRGB-0-0-0-GLES2_U002c0-512MB-85-220-0-0.png/246x0w.webp"
}

def migrate_game_logos():
    db = SessionLocal()
    try:
        users = db.query(User).all()
        updated_count = 0
        for u in users:
            if u.preferred_games:
                try:
                    games = json.loads(u.preferred_games)
                    changed = False
                    for game in games:
                        name = game.get("name")
                        if name in NEW_LOGOS:
                            if game.get("logo") != NEW_LOGOS[name]:
                                print(f"Updating {name} logo for User {u.id}...")
                                game["logo"] = NEW_LOGOS[name]
                                changed = True
                    
                    if changed:
                        u.preferred_games = json.dumps(games)
                        updated_count += 1
                except Exception as e:
                    print(f"Error processing User {u.id}: {e}")
        
        db.commit()
        print(f"Migration complete. Updated {updated_count} users.")
    finally:
        db.close()

if __name__ == "__main__":
    migrate_game_logos()
