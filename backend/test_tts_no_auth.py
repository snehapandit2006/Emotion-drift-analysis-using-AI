import requests
import json

BASE_URL = "http://127.0.0.1:8000"

def test_no_auth():
    url = f"{BASE_URL}/chat/tts"
    payload = {
        "text": "This is a test of the non-authenticated endpoint.",
        "speaker": "ishita"
    }
    print(f"Calling {url} without authHeader...")
    res = requests.post(url, json=payload)
    print(f"Status: {res.status_code}")
    if res.status_code == 200:
        print(f"Success! Audio received. Length: {len(res.content)}")
    else:
        print(f"Failed: {res.text}")

if __name__ == "__main__":
    test_no_auth()
