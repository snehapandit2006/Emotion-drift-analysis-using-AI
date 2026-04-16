import sys
import os
import sqlite3

# Add project root to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from core.config import settings
from db.database import engine, Base
from db.models import ChatMessage

def apply_updates():
    print("Applying schema updates...")
    
    # Handle SQLite specific ADD COLUMN
    try:
        db_url = settings.DATABASE_URL
        if db_url.startswith("sqlite:///"):
            db_path = db_url.replace("sqlite:///", "")
            # Resolve to absolute path based on backend root
            backend_root = os.path.dirname(os.path.abspath(__file__))
            if not os.path.isabs(db_path):
                db_path = os.path.normpath(os.path.join(backend_root, db_path))
            
            print(f"Connecting to SQLite database at: {db_path}")
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            
            # 1. Add role column
            try:
                cursor.execute("ALTER TABLE users ADD COLUMN role VARCHAR DEFAULT 'patient'")
                print("Added column: role")
            except sqlite3.OperationalError as e:
                if "duplicate column name" in str(e):
                    print("Column already exists: role")
                else:
                    print(f"Error adding role: {e}")

            # 2. Add doctor_id column
            try:
                cursor.execute("ALTER TABLE users ADD COLUMN doctor_id INTEGER REFERENCES users(id)")
                print("Added column: doctor_id")
            except sqlite3.OperationalError as e:
                if "duplicate column name" in str(e):
                    print("Column already exists: doctor_id")
                else:
                    print(f"Error adding doctor_id: {e}")

            # 3. Add music_interests column
            try:
                cursor.execute("ALTER TABLE users ADD COLUMN music_interests VARCHAR")
                print("Added column: music_interests")
            except sqlite3.OperationalError as e:
                if "duplicate column name" in str(e):
                    print("Column already exists: music_interests")
                else:
                    print(f"Error adding music_interests: {e}")
            # 4. Add google_refresh_token column
            try:
                cursor.execute("ALTER TABLE users ADD COLUMN google_refresh_token VARCHAR")
                print("Added column: google_refresh_token")
            except sqlite3.OperationalError as e:
                if "duplicate column name" in str(e):
                    print("Column already exists: google_refresh_token")
                else:
                    print(f"Error adding google_refresh_token: {e}")
            
            conn.commit()
            conn.close()
            
    except Exception as e:
        print(f"Manual SQL update failed: {e}")
        # Proceed to let SQLAlchemy try its best or at least create new tables

    # 3. Create new tables
    print("Creating new tables (if missing)...")
    Base.metadata.create_all(bind=engine)
    print("Schema update process finished.")

if __name__ == "__main__":
    apply_updates()
