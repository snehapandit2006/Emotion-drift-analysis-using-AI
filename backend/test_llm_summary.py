import sys
import json
import requests
sys.path.append('e:/emotion-drift/backend')
from core.config import settings

url = f"https://generativelanguage.googleapis.com/v1beta/models/{settings.LLM_MODEL}:generateContent?key={settings.LLM_API_KEY}"

prompt = "Summarize: I am sad."
payload = {
    "contents": [{"parts": [{"text": prompt}]}],
    "generationConfig": {"temperature": 0.1, "maxOutputTokens": 500}
}
try:
    res = requests.post(url, json=payload, timeout=20)
    print("STATUS:", res.status_code)
    print("OUTPUT:\n", json.dumps(res.json(), indent=2))
except Exception as e:
    print(f"ERROR: {e}")
