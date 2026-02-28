import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from ml.inference import get_bot_response
    
    tests = [
        "i think my headaches",
        "my stomach hurts",
        "i am so lonely",
        "who are you?"
    ]
    
    for t in tests:
        print(f"Input: {t}")
        # We don't load the full chatbot model in this script for speed unless it's already in memory
        # But for verification of heuristics it's perfect.
        print(f"Bot: {get_bot_response(t)}\n")

except Exception as e:
    print(f"Error: {e}")
