import sqlite3
import os

db_path = os.path.join(os.getcwd(), "backend", "storage", "emotion.db")
print(f"Targeting database: {db_path}")

try:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Add music_interests to users
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN music_interests VARCHAR")
        print("Added column: music_interests")
    except sqlite3.OperationalError as e:
        print(f"Column music_interests: {e}")

    # The MeditationLog table should be handled by SQLAlchemy create_all
    # but we can do it here too just in case
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS meditation_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER REFERENCES users(id),
        duration_seconds INTEGER,
        session_type VARCHAR,
        completed_at DATETIME
    )
    """)
    print("Ensured meditation_logs table exists.")
    
    conn.commit()
    conn.close()
    print("Migration successful.")
except Exception as e:
    print(f"Migration failed: {e}")
