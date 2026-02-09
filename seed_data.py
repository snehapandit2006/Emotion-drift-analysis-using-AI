import requests
import random
from datetime import datetime, timedelta

BASE_URL = "http://localhost:8000"
USER_EMAIL = "test@example.com"
USER_PASSWORD = "password"

def seed_data():
    # 1. Login
    login_data = {"username": USER_EMAIL, "password": USER_PASSWORD}
    resp = requests.post(f"{BASE_URL}/auth/token", data=login_data)
    if resp.status_code != 200:
        print(f"Login failed: {resp.text}")
        return

    token = resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    emotions = ["happy", "sadness", "anger", "fear", "love", "surprise"]
    sentences = {
        "happy": ["I feel great today!", "What a wonderful day", "So happy with the news"],
        "sadness": ["I am feeling low", "Everything is going wrong", "Just want to cry"],
        "anger": ["I am furious!", "How dare they do this", "So annoying"],
        "fear": ["I am scared of the future", "What if it fails?", "Anxiety is high"],
        "love": ["I love my family", "Feeling so loved", "My partner is amazing"],
        "surprise": ["Wow, didn't expect that!", "Complete shock", "What a surprise"]
    }

    print("Seeding data...")
    # Generate 50 entries
    for _ in range(50):
        emotion = random.choice(emotions)
        text = random.choice(sentences[emotion])
        
        # Note: /predict saves to DB with current timestamp. 
        # Modifying timestamp is hard via API unless we expose a debug endpoint.
        # But for 'Distribution' and 'Timeline' (real-time), just adding them now is fine.
        # They will appear as 'just now'.
        
        requests.post(f"{BASE_URL}/predict", json={"text": text}, headers=headers)
        
    print("Seeding complete! Refresh dashboard.")

if __name__ == "__main__":
    seed_data()
