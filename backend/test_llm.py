import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from ml.llm_bridge import generate_therapeutic_response

def test_llm():
    print("Testing LLM API Call...")
    result = generate_therapeutic_response("Hi, you know today I went to my dentist and he did RCT", "neutral", "")
    if result:
        print("SUCCESS! LLM returned:")
        print(f"Text: {result.get('text')}")
        print(f"Intent: {result.get('intent')}")
        print(f"Type: {result.get('type')}")
    else:
        print("FAILED! LLM returned None.")

if __name__ == "__main__":
    test_llm()
