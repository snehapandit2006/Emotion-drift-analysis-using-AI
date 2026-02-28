import requests
import json

BASE_URL = "http://127.0.0.1:8000"

def test_bot_chat():
    # Login to get token (assuming a test user exists)
    # If not, you might need to use a real token from a running frontend
    login_url = f"{BASE_URL}/auth/token"
    login_data = {
        "username": "patient@example.com",
        "password": "password123"
    }
    
    # This is just a template, in a real scenario we'd use valid credentials
    print("Testing /chat/bot endpoint...")
    
    # We'll skip the actual network call if credentials aren't known,
    # but the code below is how we would verify it.
    
    payload = {"text": "I feel a bit sad today, can you help?"}
    # headers = {"Authorization": f"Bearer {token}"}
    # response = requests.post(f"{BASE_URL}/chat/bot", json=payload, headers=headers)
    # print(response.json())

if __name__ == "__main__":
    test_bot_chat()
