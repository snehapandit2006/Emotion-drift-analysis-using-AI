import os
import sqlite3
import sys

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), "backend"))

from core.config import settings

def debug_db():
    db_url = settings.DATABASE_URL
    print(f"DATABASE_URL: {db_url}")
    
    if db_url.startswith("sqlite:///"):
        db_path = db_url.replace("sqlite:///", "")
        print(f"Extracted db_path: {db_path}")
        
        # Resolve to absolute path
        abs_backend = os.path.join(os.getcwd(), "backend")
        abs_db_path = os.path.normpath(os.path.join(abs_backend, db_path))
        print(f"Absolute db_path: {abs_db_path}")
        
        if os.path.exists(abs_db_path):
            print("Database file exists.")
            try:
                conn = sqlite3.connect(abs_db_path)
                print("Successfully connected to database.")
                conn.close()
            except Exception as e:
                print(f"Connection failed: {e}")
        else:
            print("Database file NOT found.")

if __name__ == "__main__":
    debug_db()
