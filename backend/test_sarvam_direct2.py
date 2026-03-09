import requests
import json

key = "sk_zadrdrn9_A4Q26JhScap58Emy8qr6c2wj"
model = "sarvam-m"
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
    res = requests.post(url, headers=headers, json=payload, timeout=20)
    print(f"Status Code: {res.status_code}")
    with open("sarvam_response.json", "w", encoding="utf-8") as f:
        json.dump(res.json(), f, indent=2)
except Exception as e:
    with open("sarvam_error.txt", "w", encoding="utf-8") as f:
        f.write(str(e))
