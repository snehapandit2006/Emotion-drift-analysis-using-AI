import sys
import os
import numpy as np

# Add backend to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from ml.dialogue_manager import manager as dm

def test_volatility():
    print("--- Testing Vector-Based Volatility (Mean Euclidean Distance) ---")
    user_id = 999
    
    # Reset session for clean test
    if user_id in dm.sessions: del dm.sessions[user_id]
    
    # 1. Constant label, but intensity shift
    # Turn 1: Sadness 0.5
    v1 = [0.0, 0.5, 0.0, 0.0, 0.0, 0.5, 0.0] # [joy, sadness, anger, fear, surprise, neutral, disgust]
    dm.update_state(user_id, "sadness", "I feel okay.", emotion_vector=v1)
    
    # Turn 2: Sadness 0.9 (Huge intensity boost)
    v2 = [0.0, 0.9, 0.0, 0.0, 0.0, 0.1, 0.0]
    dm.update_state(user_id, "sadness", "I feel awful.", emotion_vector=v2)
    
    state = dm.get_state(user_id)
    print(f"Test 1 (Intensity Shift): Volatility = {state['volatility']:.4f} (Expected > 0.4)")
    
    # 2. Composition shift (Static label, static primary intensity, but redistribution)
    # Turn 3: Sadness 0.9, but fear replaces neutral
    v3 = [0.0, 0.9, 0.0, 0.1, 0.0, 0.0, 0.0]
    dm.update_state(user_id, "sadness", "I am scared.", emotion_vector=v3)
    
    state = dm.get_state(user_id)
    print(f"Test 2 (Composition Shift): Volatility = {state['volatility']:.4f} (Expected > 0.0)")

    # 3. Oscillation
    v4 = [0.9, 0.0, 0.0, 0.0, 0.0, 0.1, 0.0] # Joy
    dm.update_state(user_id, "joy", "Happy!", emotion_vector=v4)
    v5 = [0.0, 0.9, 0.0, 0.0, 0.0, 0.1, 0.0] # Sad
    dm.update_state(user_id, "sadness", "Sad!", emotion_vector=v5)
    
    state = dm.get_state(user_id)
    print(f"Test 3 (Oscillation): Volatility = {state['volatility']:.4f} (Expected High, e.g. > 0.8)")

    if state['volatility'] > 0.8:
        print("\nSUCCESS: Vector Volatility correctly captures complex emotional movement.")
    else:
        print("\nFAILURE: Volatility metric is insensitive.")

if __name__ == "__main__":
    test_volatility()
