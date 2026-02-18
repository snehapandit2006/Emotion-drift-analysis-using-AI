"""
Migration: Add 'notes' and 'frequency' columns to medical_entries table.
Run this once on existing databases to add the new columns.
"""
import sqlite3
import sys
import os

DB_PATH = os.environ.get("DB_PATH", "sql_app.db")

def migrate(db_path=DB_PATH):
    if not os.path.exists(db_path):
        print(f"Database {db_path} not found — will be created on next server start with new schema.")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Check existing columns
    cursor.execute("PRAGMA table_info(medical_entries)")
    columns = [col[1] for col in cursor.fetchall()]

    added = []
    if "notes" not in columns:
        cursor.execute("ALTER TABLE medical_entries ADD COLUMN notes TEXT")
        added.append("notes")

    if "frequency" not in columns:
        cursor.execute("ALTER TABLE medical_entries ADD COLUMN frequency TEXT DEFAULT 'daily'")
        added.append("frequency")

    conn.commit()
    conn.close()

    if added:
        print(f"Migration complete: added columns {added} to medical_entries")
    else:
        print("No migration needed — columns already exist.")

if __name__ == "__main__":
    path = sys.argv[1] if len(sys.argv) > 1 else DB_PATH
    migrate(path)
