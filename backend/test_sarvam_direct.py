import requests
import json

key = None
model = "sarvam-m"
with open(".env", "r") as f:
    for line in f:
        if line.startswith("LLM_API_KEY="):
            key = line.split("=")[1].strip().strip('"').strip("'")
        if line.startswith("LLM_MODEL="):
            model = line.split("=")[1].strip().strip('"').strip("'")

url = "https://api.sarvam.ai/v1/chat/completions"
headers = {
    "api-subscription-key": key,
    "Content-Type": "application/json"
}

payload = {
    "model": model,
    "messages": [
        {"role": "system", "content": "You are a test assistant."},
        {"role": "user", "content": "Hello, this is a test from Sentia AI. Respond short."}
    ],
    "temperature": 0.5,
    "max_tokens": 50
}

try:
    print(f"Testing model: {model} to {url}")
    print(f"Key length: {len(key) if key else 0}")
    res = requests.post(url, headers=headers, json=payload, timeout=20)
    print(f"Status Code: {res.status_code}")
    print(f"Response: {res.text}")
except Exception as e:
    print(f"Exception: {e}")
