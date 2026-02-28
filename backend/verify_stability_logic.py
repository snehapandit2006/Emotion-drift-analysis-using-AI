import sys
import os

# Add backend to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from ml.inference import validate_response_stability

def test_stability():
    print("--- Detailed Stability Guard Verification ---")
    
    tests = [
        ("Hello", "Hello", False, "repeats_user"),
        ("", "Hello", False, "empty_response"),
        ("I feel sadness sadness sadness sadness sadness sadness sadness", "I am okay", False, "repetitive_phrasing"),
        ("I am", "Tell me more", False, "too_short"),
        ("That sounds very difficult for you.", "Life is hard", True, "valid"),
    ]
    
    for bot, user, expected_valid, expected_reason in tests:
        valid, reason = validate_response_stability(bot, user)
        status = "PASS" if (valid == expected_valid and reason == expected_reason) else "FAIL"
        print(f"Bot: {bot[:20]}... | User: {user[:20]}... | Result: {reason} | {status}")

if __name__ == "__main__":
    test_stability()
