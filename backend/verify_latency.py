import sys
import os
import time

# Add backend to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from ml.inference import get_bot_response, dialogue_manager

def test_latency():
    print("--- Testing Sentia Latency Profiling (Target < 300ms for Fallback) ---")
    user_id = 888
    intel = {
        "emotion": "neutral",
        "confidence": 1.0,
        "is_safety_risk": False
    }

    # Test Heuristic (Force it by disabling API key temporarily)
    print("\n[Scenario: Heuristic Fallback Path]")
    # We'll just time the call assuming LLM fails quickly or we force it
    # For a pure local test, we can mock generate_therapeutic_response to be None
    from unittest.mock import patch
    
    start_time = time.time()
    with patch("ml.llm_bridge.generate_therapeutic_response") as mock_llm:
        mock_llm.return_value = None # Force fallback
        get_bot_response("Hello", intel, user_id)
    
    elapsed = (time.time() - start_time) * 1000
    print(f"Heuristic Fallback Time: {elapsed:.2f}ms")
    
    if elapsed < 300:
        print("SUCCESS: Fallback is lightning fast.")
    else:
        print("WARNING: Fallback logic is heavier than expected.")

if __name__ == "__main__":
    test_latency()
