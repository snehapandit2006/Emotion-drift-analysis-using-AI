import sqlite3

def list_tables():
    conn = sqlite3.connect('sql_app.db')
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = cursor.fetchall()
    print("Tables in database:")
    for table in tables:
        print(f" - {table[0]}")
        cursor.execute(f"PRAGMA table_info({table[0]})")
        cols = cursor.fetchall()
        for col in cols:
            print(f"   * {col[1]} ({col[2]})")
    conn.close()

if __name__ == "__main__":
    list_tables()
