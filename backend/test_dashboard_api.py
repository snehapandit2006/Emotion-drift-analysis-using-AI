import sys
import os
import json

# Add backend to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from fastapi.testclient import TestClient
from api.main import app
from db.database import SessionLocal
from db.models import User

def test_dashboard_api():
    client = TestClient(app)
    db = SessionLocal()
    user = db.query(User).filter(User.email == "sneha20061901@gmail.com").first()
    db.close()
    
    if not user:
        print("User sneha20061901@gmail.com not found")
        return

    print(f"Simulating dashboard calls for User {user.email} (ID: {user.id})")
    
    # We need to bypass auth or provide a valid token.
    # For simulation, we can use a helper to get a token or modify the route temporarily.
    # Simpler: Call the logic directly or use a mock token.
    from api.deps import get_current_user
    app.dependency_overrides[get_current_user] = lambda: user
    
    try:
        print("--- Timeline ---")
        res = client.get("/visualization/timeline")
        print(f"Status: {res.status_code}")
        print(json.dumps(res.json(), indent=2))
        
        print("\n--- Distribution ---")
        res = client.get("/visualization/distribution")
        print(f"Status: {res.status_code}")
        print(json.dumps(res.json(), indent=2))
        
        print("\n--- Drift ---")
        res = client.get("/drift")
        print(f"Status: {res.status_code}")
        print(json.dumps(res.json(), indent=2))

        print("\n--- Self-Emotion History ---")
        res = client.get("/self-emotion/history")
        print(f"Status: {res.status_code}")
        print(json.dumps(res.json(), indent=2))
        
    finally:
        app.dependency_overrides = {}

if __name__ == "__main__":
    test_dashboard_api()
