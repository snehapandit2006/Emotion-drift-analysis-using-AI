import sys
import os

# Add the current directory to sys.path
sys.path.append(os.getcwd())

from ml.inference import get_bot_response
from ml.llm_bridge import generate_therapeutic_response

# Mock intel
intel = {
    "emotion": "fear",
    "confidence": 0.9,
    "is_safety_risk": False,
    "domain": "general_emotional",
    "context": "test",
    "state": {}
}

user_id = 1 # Use a dummy user ID

print("--- Testing get_bot_response ---")
try:
    # Test with a known "leaky" string if we can bypass the LLM call for a second?
    # Actually, let's test the LLM call first.
    res = get_bot_response("i am feeling panicked right now", intel, user_id)
    print("Response:", res["response"])
    print("Trace:", res["trace"])
except Exception as e:
    print("Error:", e)
