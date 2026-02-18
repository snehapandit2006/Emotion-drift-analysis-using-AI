import requests

url = "http://127.0.0.1:8000/analyze/chat"
try:
    # Send a request without file to expect 422 (Validation Error) or 400, not 404
    print(f"Testing POST {url}...")
    response = requests.post(url)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Connection failed: {e}")
