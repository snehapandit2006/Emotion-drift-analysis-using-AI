import sys
import os
from unittest.mock import MagicMock, patch

# Mock some dependencies to run without full environment
sys.modules['preprocess'] = MagicMock()
sys.modules['transformers'] = MagicMock()
sys.modules['deep_translator'] = MagicMock()

# Mock the database
sys.modules['db.database'] = MagicMock()
sys.modules['db.models'] = MagicMock()

from ml.inference import check_safety_intent

def test_safety_keywords():
    print("Testing safety keywords...")
    assert check_safety_intent("I want to kill myself") == True
    assert check_safety_intent("I'm thinking of suicide") == True
    assert check_safety_intent("I am fine and happy") == False
    print("Keyword tests passed!")

@patch('requests.post')
def test_safety_llm(mock_post):
    print("Testing safety LLM nuanced detection...")
    # Mock a "TRUE" response from Gemini
    mock_res = MagicMock()
    mock_res.status_code = 200
    mock_res.json.return_value = {
        "candidates": [{"content": {"parts": [{"text": "TRUE"}]}}]
    }
    mock_post.return_value = mock_res
    
    with patch('ml.llm_bridge.LLM_API_KEY', 'fake_key'):
        assert check_safety_intent("Life doesn't seem worth living anymore, I'm just so tired of everything.") == True
    
    # Mock a "FALSE" response
    mock_res.json.return_value = {
        "candidates": [{"content": {"parts": [{"text": "FALSE"}]}}]
    }
    with patch('ml.llm_bridge.LLM_API_KEY', 'fake_key'):
        assert check_safety_intent("I'm feeling a bit down but I'll be okay.") == False
        
    print("LLM safety tests passed!")

if __name__ == "__main__":
    try:
        test_safety_keywords()
        test_safety_llm()
        print("\nAll safety layer unit tests passed!")
    except Exception as e:
        print(f"\nTests failed: {e}")
        sys.exit(1)
