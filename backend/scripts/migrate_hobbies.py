import sqlite3
import os

db_path = os.path.join("storage", "emotion.db")

if not os.path.exists(db_path):
    print(f"Database not found at {db_path}")
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    print("Adding 'hobbies' column...")
    cursor.execute("ALTER TABLE users ADD COLUMN hobbies TEXT")
    print("'hobbies' column added.")
except sqlite3.OperationalError:
    print("'hobbies' column already exists.")

try:
    print("Adding 'preferred_games' column...")
    cursor.execute("ALTER TABLE users ADD COLUMN preferred_games TEXT")
    print("'preferred_games' column added.")
except sqlite3.OperationalError:
    print("'preferred_games' column already exists.")

conn.commit()
conn.close()
print("Migration completed.")
