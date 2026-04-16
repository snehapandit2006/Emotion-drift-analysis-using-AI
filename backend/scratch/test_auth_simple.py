import requests
import sqlite3
import os

API_URL = "http://127.0.0.1:8000"
DB_PATH = "backend/storage/emotion.db"

def test_login(email, password):
    print(f"Testing login for {email}...")
    try:
        response = requests.post(
            f"{API_URL}/auth/token",
            data={"username": email, "password": password},
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    if not os.path.exists(DB_PATH):
        print(f"DB not found at {DB_PATH}")
        # Try local path
        DB_PATH = "storage/emotion.db"
        if not os.path.exists(DB_PATH):
            print("DB not found anywhere.")
            exit(1)

    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("SELECT email FROM users LIMIT 1")
        user = cursor.fetchone()
        if user:
            print(f"Found user in DB: {user[0]}")
            test_login(user[0], "wrong_password")
        else:
            print("No users found in DB.")
    except Exception as e:
        print(f"DB Error: {e}")
