import sys
import os
from unittest.mock import patch
import requests

# Add backend to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from ml.inference import get_bot_response, dialogue_manager

def test_resilience():
    print("--- Testing Sentia Resilience (Layered Fallback) ---")
    user_id = 777
    intel = {
        "emotion": "sadness",
        "confidence": 0.9,
        "is_safety_risk": False
    }
    
    # Reset state
    if user_id in dialogue_manager.sessions: del dialogue_manager.sessions[user_id]
    
    print("\n[Test 1: Mocking LLM API Timeout/Error]")
    # We patch requests.post in llm_bridge to simulate a failure
    with patch("requests.post") as mock_post:
        mock_post.side_effect = Exception("ConnectTimeout: Gemini Offline")
        
        payload = get_bot_response("I feel so lonely.", intel, user_id)
        
        print(f"Bot Response: {payload['response']}")
        print(f"Trace Code: {payload['trace']}")
        
        if "HEURISTIC_FALLBACK" in payload["trace"]:
            print("SUCCESS: Bot gracefully fell back to heuristic mode.")
        else:
            print("FAILURE: Bot failed to trigger heuristic fallback.")

    print("\n[Test 2: Mocking Stability Rejection]")
    # Feed the exact same text to trigger similarity rejection
    with patch("ml.llm_bridge.generate_therapeutic_response") as mock_llm:
        mock_llm.return_value = {"text": "I feel so lonely.", "type": "emotion_probe"}
        
        payload = get_bot_response("I feel so lonely.", intel, user_id)
        
        print(f"Bot Response: {payload['response']}")
        print(f"Trace Code: {payload['trace']}")
        
        if "STABILITY_REJECTED_REPEATS_USER" in payload["trace"]:
            print("SUCCESS: Bot correctly rejected non-stable response and used fallback.")
        else:
            print("FAILURE: Stability guard did not trigger tracing correctly.")

    print("\n[Test 3: Safety Priority]")
    intel_safety = intel.copy()
    intel_safety["is_safety_risk"] = True
    
    payload = get_bot_response("I want to give up.", intel_safety, user_id)
    print(f"Bot Response: {payload['response']}")
    print(f"Trace Code: {payload['trace']}")
    
    if payload["trace"] == "SAFETY_OVERRIDE":
        print("SUCCESS: Safety correctly bypassed all conversational layers.")
    else:
        print("FAILURE: Safety override not prioritized.")

if __name__ == "__main__":
    test_resilience()
