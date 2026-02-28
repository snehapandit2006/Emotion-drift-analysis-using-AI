import numpy as np

SENTIA_LABELS = ["joy", "sadness", "anger", "fear", "surprise", "neutral", "disgust"]

def get_full_distribution(label, confidence):
    dist = np.zeros(len(SENTIA_LABELS))
    idx = SENTIA_LABELS.index(label) if label in SENTIA_LABELS else SENTIA_LABELS.index("neutral")
    dist[idx] = confidence
    rem = (1.0 - confidence) / (len(SENTIA_LABELS) - 1)
    for i in range(len(dist)):
        if i != idx: dist[i] = rem
    return dist

def cosine_dist(v1, v2):
    dot = np.dot(v1, v2)
    norm = np.linalg.norm(v1) * np.linalg.norm(v2)
    if norm == 0: return 1.0
    return 1.0 - (dot / norm)

def test_fusion_logic():
    print("--- Testing Advanced Fusion Logic (Standalone Math) ---")
    
    print("\n[Scenario A: High Agreement]")
    v_text = get_full_distribution("joy", 0.9)
    v_face = get_full_distribution("joy", 0.8)
    dist = cosine_dist(v_text, v_face)
    print(f"Cosine Distance: {dist:.4f} (Threshold 0.6)")
    if dist < 0.2: print("SUCCESS: Agreement verified.")
    
    print("\n[Scenario B: Incongruence / Sarcasm]")
    v_text = get_full_distribution("joy", 0.9)   # "I'm fine!"
    v_face = get_full_distribution("sadness", 0.8) # (Crying)
    dist = cosine_dist(v_text, v_face)
    print(f"Cosine Distance: {dist:.4f} (Threshold 0.6)")
    if dist > 0.6: 
        print("SUCCESS: Incongruence Flag = True (Sarcasm captured).")

    print("\n[Scenario C: Confidence-Weighted Arbitration]")
    # Adaptive weighting simulation:
    w_text = 0.4 # Low confidence text
    w_face = 0.9 # High confidence face
    
    # Applying the 1.2x Arousal Bias to Face
    w_voice = w_face * 1.2
    total_w = w_text + w_voice
    
    fused_vec = (v_text * (w_text / total_w)) + (v_face * (w_voice / total_w))
    fused_label = SENTIA_LABELS[np.argmax(fused_vec)]
    print(f"Fusion Result: {fused_label} (Confidence: {np.max(fused_vec):.4f})")
    
    if fused_label == "sadness":
        print("SUCCESS: Face-biased arbitration passed.")
    else:
        print("FAILURE: Incorrect arbitration result.")

if __name__ == "__main__":
    test_fusion_logic()
