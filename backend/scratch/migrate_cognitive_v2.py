import sys
import os
import sqlite3

# Add project root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.config import settings
from db.database import engine, Base
from db.models import CognitiveSnapshot, CBTReflection

def run_migration():
    db_url = settings.DATABASE_URL
    print(f"Database URL: {db_url}")
    if db_url.startswith("sqlite:///"):
        db_path = db_url.replace("sqlite:///", "")
        backend_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        if not os.path.isabs(db_path):
            db_path = os.path.normpath(os.path.join(backend_root, db_path))
        
        print(f"Connecting to SQLite database at: {db_path} to drop old tables...")
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Drop old tables to avoid conflicts
        for table in ["cognitive_profiles", "cognitive_snapshots", "cbt_reflections"]:
            try:
                cursor.execute(f"DROP TABLE IF EXISTS {table}")
                print(f"Dropped table: {table}")
            except sqlite3.OperationalError as e:
                print(f"Error dropping {table}: {e}")
        
        conn.commit()
        conn.close()
        
    print("Re-creating all tables using SQLAlchemy metadata...")
    Base.metadata.create_all(bind=engine)
    print("Database migration completed successfully!")

if __name__ == "__main__":
    run_migration()
