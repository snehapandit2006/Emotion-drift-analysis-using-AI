import os
import sys

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.append(BASE_DIR)

with open("bridge_out.txt", "w", encoding="utf-8") as f:
    sys.stdout = f
    try:
        from ml.llm_bridge import generate_therapeutic_response
        res = generate_therapeutic_response("I feel very sad today.", "sadness", "Context: None")
        print("Final Return:", res)
    except Exception as e:
        print("Exception caught:", e)
