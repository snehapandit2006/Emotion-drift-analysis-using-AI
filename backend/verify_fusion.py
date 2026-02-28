import sys
import os
import numpy as np

# Add backend to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Import logic in isolation to avoid heavy model loads if possible
from ml.inference import get_full_distribution, cosine_dist, SENTIA_LABELS

def test_fusion():
    print("--- Testing Advanced Fusion (Cosine-Distance Incongruence) ---")
    
    print("\n[Scenario A: High Agreement]")
    v_text = get_full_distribution("joy", 0.9)
    v_face = get_full_distribution("joy", 0.8)
    dist = cosine_dist(v_text, v_face)
    print(f"Cosine Distance: {dist:.4f} (Threshold 0.6)")
    if dist < 0.2:
        print("SUCCESS: High agreement correctly results in low distance.")
    
    print("\n[Scenario B: The Sarcasm Test (Extreme Disagreement)]")
    v_text = get_full_distribution("joy", 0.9)   # "Best day ever!"
    v_face = get_full_distribution("sadness", 0.8) # (Visible weeping)
    dist = cosine_dist(v_text, v_face)
    print(f"Cosine Distance: {dist:.4f} (Threshold 0.6)")
    
    if dist > 0.6:
        print("SUCCESS: Incongruence flag would be TRIGGERED (Sarcasm detected).")
    else:
        print("FAILURE: Threshold too high or mapping failed.")

    print("\n[Scenario C: Confidence-Weighted Arbitration with Sincerity Bias]")
    # High confidence face (sadness), low confidence text (joy)
    text_conf = 0.4 
    face_conf = 0.9 
    
    # Weight logic from inference.py:
    # w_voice *= 1.2
    w_text = text_conf
    w_voice = face_conf * 1.2
    total_w = w_text + w_voice
    
    fused_vec = (v_text * (w_text / total_w)) + (v_face * (w_voice / total_w))
    fused_label = SENTIA_LABELS[np.argmax(fused_vec)]
    print(f"Fusion Outcome: {fused_label} (Expected: sadness)")
    
    if fused_label == "sadness":
        print("SUCCESS: Fusion prioritized high-confidence/biased face modality.")
    else:
        print(f"FAILURE: Arbitration yielded {fused_label} instead of sadness.")

if __name__ == "__main__":
    test_fusion()
