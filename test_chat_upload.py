import requests
import zipfile
import io
import time

BASE_URL = "http://localhost:8000"

def test_chat_analysis():
    print("1. Logging in...")
    # 1. Login to get token
    login_data = {"username": "test@example.com", "password": "password"}
    
    try:
        resp = requests.post(f"{BASE_URL}/auth/token", data=login_data)
        if resp.status_code != 200:
            print(f"Login failed: {resp.text}")
            return
        
        token = resp.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        print("   Login successful.")
        
        # 2. Create a dummy ZIP file
        print("2. Creating dummy chat zip...")
        buffer = io.BytesIO()
        with zipfile.ZipFile(buffer, "w") as z:
            z.writestr("chat1.txt", "I am feeling so angry right now!\nEverything is going wrong.\nI hate this situation.")
            z.writestr("chat2.txt", "But maybe it will get better.\nNo, I am still furious.")
        
        buffer.seek(0)
        
        # 3. Upload
        print("3. Uploading file for analysis...")
        files = {"file": ("test_chat.zip", buffer, "application/zip")}
        analyze_resp = requests.post(f"{BASE_URL}/analyze/chat", headers=headers, files=files)
        
        if analyze_resp.status_code != 200:
            print(f"Analysis request failed: {analyze_resp.status_code} - {analyze_resp.text}")
            return
            
        data = analyze_resp.json()
        job_id = data.get("job_id")
        if not job_id:
            print(f"No job_id returned! Response: {data}")
            return
            
        print(f"   Job started. ID: {job_id}")
        
        # 4. Poll for results
        print("4. Polling for results...")
        while True:
            status_resp = requests.get(f"{BASE_URL}/analyze/chat/status/{job_id}", headers=headers)
            if status_resp.status_code != 200:
                print(f"Polling failed: {status_resp.status_code} - {status_resp.text}")
                break
                
            status_data = status_resp.json()
            status = status_data["status"]
            progress = status_data.get("progress", 0)
            
            print(f"   Status: {status} ({progress}%)")
            
            if status == "completed":
                result = status_data["result"]
                print("\nAnalysis Success!")
                print("="*30)
                print(f"Dominant Emotion: {result['dominant_emotion']}")
                print(f"Advice Strategy: {result['advice']['strategy_title']}")
                print(f"Last Message Emotion: {result['last_message_emotion']}")
                print("="*30)
                break
            elif status == "failed":
                print(f"\nAnalysis Failed: {status_data.get('error')}")
                break
            
            time.sleep(1)
            
    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    test_chat_analysis()
