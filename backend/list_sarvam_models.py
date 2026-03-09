import requests
import os

env_path = ".env"
if not os.path.exists(env_path):
    env_path = os.path.join("..", ".env")

api_key = ""
if os.path.exists(env_path):
    with open(env_path, "r") as f:
        for line in f:
            if line.startswith("LLM_API_KEY="):
                api_key = line.split("=", 1)[1].strip().strip('"\'')

url = "https://api.sarvam.ai/v1/models"
headers = {
    "api-subscription-key": api_key
}

print(f"Fetching Sarvam models...")
try:
    res = requests.get(url, headers=headers, timeout=10)
    print(f"Status: {res.status_code}")
    print(f"Response: {res.text}")
except Exception as e:
    print(f"Error: {e}")
