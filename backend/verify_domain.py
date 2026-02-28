import sys
import os
import json

# Add backend to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from ml.inference import get_sentia_intelligence
from ml.dialogue_manager import manager as dialogue_manager
from ml.llm_bridge import generate_structured_fallback

def run_test():
    user_id = 999
    
    # 1. Test Physical Distress
    text = "Today I went to doctor and I got an RCT done. It's aching a lot and I am unable to speak."
    
    print("\n--- Physical Distress Test ---")
    intel = get_sentia_intelligence(text, user_id=user_id)
    print(f"Detected Domain: {intel.get('domain')}")
    print(f"Context Rules:\n{intel.get('context')}")
    
    # Test Fallback
    state = dialogue_manager.get_state(user_id)
    fallback_resp = generate_structured_fallback(text, state)
    print(f"\nFallback Response:\n{fallback_resp}")
    
    # 2. Test General Emotion
    user_id = 998
    print("\n--- General Emotional Test ---")
    text_normal = "I feel like I'm failing at everything right now and no one understands."
    intel_normal = get_sentia_intelligence(text_normal, user_id=user_id)
    print(f"Detected Domain: {intel_normal.get('domain')}")
    
    state_normal = dialogue_manager.get_state(user_id)
    fallback_resp_normal = generate_structured_fallback(text_normal, state_normal)
    print(f"Fallback Response:\n{fallback_resp_normal}")

if __name__ == "__main__":
    run_test()
