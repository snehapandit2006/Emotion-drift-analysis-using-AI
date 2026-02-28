import os
import sys
from dotenv import load_dotenv

# Load environment
base_dir = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(base_dir, ".env"))

# Add backend to path
sys.path.append(base_dir)

from ml.inference import get_sentia_intelligence, get_bot_response
from ml.dialogue_manager import manager as dm

def test_gold_digger_scenario():
    print("\n--- Testing Gold Digger Scenario (Intelligence Depth) ---")
    user_id = 999
    
    # Turn 1: Initial accusation
    print("\n[Turn 1] User: 'He called me a gold digger.'")
    intel1 = get_sentia_intelligence("He called me a gold digger.", user_id=user_id)
    resp1 = get_bot_response("He called me a gold digger.", intel1, user_id=user_id)
    print(f"Sentia: {resp1}")
    print(f"Emotion: {intel1['emotion']} | Shift: {intel1['state']['emotion_shift']} | Volatility: {intel1['state']['volatility']}")
    
    # Turn 2: Follow up
    print("\n[Turn 2] User: 'I just feel so misunderstood. It's not about the money.'")
    intel2 = get_sentia_intelligence("I just feel so misunderstood. It's not about the money.", user_id=user_id)
    resp2 = get_bot_response("I just feel so misunderstood. It's not about the money.", intel2, user_id=user_id)
    print(f"Sentia: {resp2}")
    
    # Verify Probe Diversity
    probes = [p["type"] for p in intel2["state"]["last_probes"]]
    print(f"Probe History: {probes}")
    
    assert len(set(probes)) == len(probes), "ERROR: Duplicate probe types detected in history!"
    print("SUCCESS: Probe diversity maintained.")

def test_volatility_tracking():
    print("\n--- Testing Vector-Based Volatility ---")
    user_id = 888
    
    inputs = [
        "I'm so happy today!", 
        "Actually, I'm starting to feel quite sad.",
        "Now I am just furious!",
        "I don't know, I'm just confused.",
        "I feel... neutral."
    ]
    
    for i, text in enumerate(inputs):
        intel = get_sentia_intelligence(text, user_id=user_id)
        print(f"Input {i+1}: {text[:20]}... | Emotion: {intel['emotion']} | Volatility: {intel['state']['volatility']:.2f}")
    
    final_vol = intel["state"]["volatility"]
    assert final_vol > 0.5, f"ERROR: Volatility should be high for rapid shifts, got {final_vol}"
    print(f"SUCCESS: Volatility correctly spiked to {final_vol:.2f}")

if __name__ == "__main__":
    try:
        test_gold_digger_scenario()
        test_volatility_tracking()
        print("\nALL INTELLIGENCE TESTS PASSED.")
    except Exception as e:
        print(f"\nTEST FAILED: {e}")
        sys.exit(1)
