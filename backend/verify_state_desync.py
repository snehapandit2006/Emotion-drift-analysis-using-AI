import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from ml.inference import get_sentia_intelligence, get_bot_response
from ml.dialogue_manager import manager as dialogue_manager

def test_desync():
    user_id = 901
    
    def simulate_turn(text):
        print(f"\n--- USER: {text} ---")
        intel = get_sentia_intelligence(text, user_id=user_id)
        bot_payload = get_bot_response(text, intel, user_id=user_id)
        
        state = dialogue_manager.get_state(user_id)
        
        print(f"BOT ({bot_payload['trace']}): {bot_payload['response']}")
        print(f"INTENT: {state.get('last_intent')}")
        print(f"DOMAIN: {state.get('domain')}")
        print(f"LAST_PROBES: {[p.get('type') for p in state.get('last_probes', [])]}")
        print(f"VOLATILITY: {state.get('volatility')}")
        print(f"EMOTION_VECTOR_COUNT: {len(state.get('emotion_vectors', []))}")

    simulate_turn("It is aching and I can't eat.")
    simulate_turn("I had cavity and infection heated the acid. He answered that he will put on a cap day after tomorrow.")

if __name__ == "__main__":
    test_desync()
