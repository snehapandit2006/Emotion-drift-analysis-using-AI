import sys
import os

# Add the current directory to sys.path to import local modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from ml.dialogue_manager import DialogueManager
from ml.inference import validate_response_stability

def test_dialogue_manager():
    print("Testing DialogueManager...")
    dm = DialogueManager()
    state = dm.get_state(123)
    assert "emotion_shift" in state, "emotion_shift missing from initial state"
    assert state["emotion_shift"] is False, "emotion_shift should be False initially"
    print("DialogueManager test passed!")

def test_stability_guards():
    print("Testing Stability Guards...")
    # Test echo
    assert validate_response_stability("Hello", "Hello") is False, "Echo test failed"
    # Test repetition
    assert validate_response_stability("Help help help help help help", "I need help") is False, "Repetition test failed"
    # Test valid response
    assert validate_response_stability("I'm sorry you're feeling that way. Can you tell me more?", "I am sad") is True, "Valid response test failed"
    # Test failure tokens
    assert validate_response_stability("@@ some weird gibberish", "Hello") is False, "Failure token test failed"
    print("Stability Guards test passed!")

if __name__ == "__main__":
    try:
        test_dialogue_manager()
        test_stability_guards()
        print("\nAll implemented logic verifications passed!")
    except Exception as e:
        print(f"\nVerification FAILED: {e}")
        sys.exit(1)
