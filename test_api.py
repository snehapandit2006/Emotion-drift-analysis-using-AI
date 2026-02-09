import requests
import json

url = "http://localhost:8000/auth/signup"
payload = {
    "email": "test_script_user@example.com",
    "password": "password123"
}
headers = {
    "Content-Type": "application/json"
}

try:
    print(f"Sending POST to {url}")
    print(f"Payload: {json.dumps(payload)}")
    response = requests.post(url, json=payload, headers=headers)
    
    print(f"Status Code: {response.status_code}")
    print(f"Response Body: {response.text}")
    
    if response.status_code == 200:
        print("Success!")
    else:
        print("Failed.")
except Exception as e:
    print(f"Error: {e}")
