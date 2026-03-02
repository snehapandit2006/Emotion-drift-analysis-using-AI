import requests
from core.config import settings
def test_models():
    print("Testing models list...")
    url = f"https://generativelanguage.googleapis.com/v1beta/models?key={settings.LLM_API_KEY}"
    res = requests.get(url)
    if res.status_code == 200:
        models = res.json().get("models", [])
        for m in models:
            name = m.get("name")
            if "flash" in name:
                print(name)
    else:
        print(f"Error {res.status_code}")

if __name__ == "__main__":
    test_models()
