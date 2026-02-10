from datetime import datetime, timedelta
from collections import Counter
import numpy as np

def analyze_fusion(text_logs, face_logs, range_days=7):
    """
    Analyzes the alignment between text and face emotions.
    
    Args:
        text_logs: List of EmotionLog objects (from DB)
        face_logs: List of FaceEmotionLog objects (from DB)
        range_days: Number of days to look back
        
    Returns:
        dict: Fusion insights including alignment score, masking alerts, and stability index.
    """
    
    # 1. Preprocess and align by time buckets (e.g., daily or hourly)
    # For simplicity, we'll look at aggregate distribution first, then specific timestamp overlaps if high density.
    # Given the likely sparsity, we'll compare distributions and nearest neighbors.
    
    # Filter logs by range
    cutoff = datetime.utcnow() - timedelta(days=range_days)
    recent_text = [l for l in text_logs if l.created_at >= cutoff]
    recent_face = [l for l in face_logs if l.timestamp >= cutoff]
    
    if not recent_text or not recent_face:
        return {
            "alignment_score": 0.0,
            "masking_detected": False,
            "stability_score": 0.0,
            "message": "Not enough data for fusion analysis."
        }
        
    # 2. Emotional Alignment Score
    # Compare the top emotions in both modalities
    text_emotions = [l.emotion for l in recent_text if l.emotion != 'neutral'] # Exclude neutral for alignment check? Or keep?
    face_emotions = [l.emotion for l in recent_face if l.emotion != 'neutral']
    
    # Fallback if only neutral
    if not text_emotions: text_emotions = ['neutral']
    if not face_emotions: face_emotions = ['neutral']
    
    text_counts = Counter(text_emotions)
    face_counts = Counter(face_emotions)
    
    # Get distributions
    def get_dist(counts):
        total = sum(counts.values())
        return {k: v/total for k, v in counts.items()}
        
    text_dist = get_dist(text_counts)
    face_dist = get_dist(face_counts)
    
    # Calculate overlap (Bhattacharyya coefficient or simple intersection)
    # Simple overlap: sum of min(p1, p2)
    emotions = set(text_dist.keys()) | set(face_dist.keys())
    alignment_score = sum(min(text_dist.get(e, 0), face_dist.get(e, 0)) for e in emotions)
    
    # 3. Masking Detection
    # Logic: High frequency of "Sad/Anger/Fear" in Face but "Happy/Neutral" in Text
    # or vice versa (Latent distress)
    
    masking_flag = False
    details = []
    
    negative_emotions = {'sadness', 'anger', 'fear', 'disgust'}
    positive_neutral = {'happy', 'joy', 'neutral', 'love', 'surprise'}
    
    face_neg_score = sum(face_dist.get(e, 0) for e in negative_emotions)
    text_pos_score = sum(text_dist.get(e, 0) for e in positive_neutral)
    
    # If face is > 40% negative but text is > 80% positive/neutral -> Masking?
    if face_neg_score > 0.4 and text_pos_score > 0.8:
        masking_flag = True
        details.append("Face shows significant negative emotion while text remains positive/neutral.")
        
    # 4. Stability Index
    # Combined volatility. 1.0 = stable, 0.0 = volatile
    # We can measure how often the dominant emotion switches in the combined stream
    
    all_events = []
    for l in recent_text:
        all_events.append({'t': l.created_at, 'e': l.emotion})
    for l in recent_face:
        all_events.append({'t': l.timestamp, 'e': l.emotion})
    
    all_events.sort(key=lambda x: x['t'])
    
    switches = 0
    if len(all_events) > 1:
        for i in range(1, len(all_events)):
            if all_events[i]['e'] != all_events[i-1]['e']:
                switches += 1
                
    # Normalize switches by number of events (switch rate)
    switch_rate = switches / (len(all_events) - 1) if len(all_events) > 1 else 0
    stability_score = max(0.0, 1.0 - switch_rate)
    
    return {
        "alignment_score": round(alignment_score, 2),
        "masking_detected": masking_flag,
        "masking_details": details,
        "stability_score": round(stability_score, 2),
        "dominant_modality": "Face" if len(recent_face) > len(recent_text) else "Text"
    }
