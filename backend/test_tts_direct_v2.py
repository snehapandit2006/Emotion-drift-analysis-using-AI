import requests
import json
import base64

# This script tests the TTS endpoint directly
BASE_URL = "http://127.0.0.1:8000"
API_KEY = "sk_zadrdrn9_A4Q26JhScap58Emy8qr6c2wj" # From .env

def test_tts():
    # 1. Login to get token (using test account)
    login_url = f"{BASE_URL}/auth/token"
    # Note: Using your actual email/pwd if known, or test account
    # For now, let's assume we can bypass or use a test one.
    # Actually, I'll use the LLM_API_KEY to find a user in DB if needed.
    # Better: just try a direct call to the sarvam api to verify key works.
    
    url = "https://api.sarvam.ai/text-to-speech"
    headers = {
        "api-subscription-key": API_KEY,
        "Content-Type": "application/json"
    }
    payload = {
        "inputs": ["Hello, I am Sentia. How are you feeling today?"],
        "target_language_code": "en-IN",
        "speaker": "ishita",
        "model": "bulbul:v3",
        "pace": 1.0,
        "enable_preprocessing": True
    }
    
    print(f"Calling Sarvam AI directly...")
    res = requests.post(url, headers=headers, json=payload)
    print(f"Status: {res.status_code}")
    if res.status_code == 200:
        data = res.json()
        audio = data.get("audios", [""])[0]
        print(f"Success! Audio length: {len(audio)}")
        with open("test_audio.wav", "wb") as f:
            f.write(base64.b64decode(audio))
        print("Written to test_audio.wav")
    else:
        print(f"Error: {res.text}")

if __name__ == "__main__":
    test_tts()
