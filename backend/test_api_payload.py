import os
import requests
import json
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from ml.llm_bridge import LLM_API_KEY, LLM_MODEL

def test_api():
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{LLM_MODEL}:generateContent?key={LLM_API_KEY}"
    prompt = "Classify the following user message: 'It is aching and I can't eat.'"
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.1, "maxOutputTokens": 10}
    }
    
    print(f"URL: {url}")
    res = requests.post(url, json=payload)
    print(f"Status: {res.status_code}")
    print(json.dumps(res.json(), indent=2))

if __name__ == "__main__":
    test_api()
