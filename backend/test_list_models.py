import os
import requests
import json
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from ml.llm_bridge import LLM_API_KEY

def list_models():
    url = f"https://generativelanguage.googleapis.com/v1beta/models?key={LLM_API_KEY}"
    res = requests.get(url)
    if res.status_code == 200:
        data = res.json()
        print("Available Models:")
        for m in data.get("models", []):
            if "generateContent" in m.get("supportedGenerationMethods", []):
                print(f" - {m.get('name')}")
    else:
        print(f"Failed to list models: {res.status_code} {res.text}")

if __name__ == "__main__":
    list_models()
