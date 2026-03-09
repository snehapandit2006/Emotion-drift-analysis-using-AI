import requests
import os
import json

env_path = ".env"
if not os.path.exists(env_path):
    env_path = os.path.join("..", ".env")

api_key = ""
model = "sarvam-m"

if os.path.exists(env_path):
    with open(env_path, "r") as f:
        for line in f:
            if line.startswith("LLM_API_KEY="):
                api_key = line.split("=", 1)[1].strip().strip('"\'')
            if line.startswith("LLM_MODEL="):
                model = line.split("=", 1)[1].strip().strip('"\'')

url = "https://api.sarvam.ai/v1/chat/completions"
headers = {
    "api-subscription-key": api_key,
    "Content-Type": "application/json"
}

payload = {
    "model": model,
    "messages": [
        {"role": "system", "content": "You are Sentia Voice, a professional clinical assistant for a psychiatrist. Provide brief, factual summaries in the doctor's language."},
        {"role": "user", "content": "Hello! Please summarize patient 1 stats."}
    ],
    "temperature": 0.1,
    "max_tokens": 150
}

print(f"Testing Sarvam API with EXACT app structure...")
print(f"URL: {url}")
print(f"Model: {model}")
print(f"API Key exists: {bool(api_key)}")

try:
    res = requests.post(url, headers=headers, json=payload, timeout=10)
    print(f"Status: {res.status_code}")
    print(f"Response: {res.text}")
except Exception as e:
    print(f"Error: {e}")
