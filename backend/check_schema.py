import sqlite3

def check_schema():
    conn = sqlite3.connect('sql_app.db')
    cursor = conn.cursor()
    cursor.execute("PRAGMA table_info(emotion_logs)")
    columns = cursor.fetchall()
    print("Columns in emotion_logs:")
    for col in columns:
        print(f" - {col[1]} ({col[2]})")
    conn.close()

if __name__ == "__main__":
    check_schema()
