from datetime import datetime, timedelta, timezone
from collections import Counter
import numpy as np

def analyze_fusion(text_logs, face_logs, health_metrics=None, range_days=7):
    """
    Analyzes the alignment between text, face emotions, and physical vitals.
    
    Args:
        text_logs: List of EmotionLog objects
        face_logs: List of FaceEmotionLog objects
        health_metrics: List of HealthMetric objects (Optional)
        range_days: Number of days to look back
        
    Returns:
        dict: Fusion insights including alignment score, masking alerts, and physical correlations.
    """
    cutoff = datetime.utcnow() - timedelta(days=range_days)
    recent_text = [l for l in text_logs if l.created_at >= cutoff]
    recent_face = [l for l in face_logs if l.timestamp >= cutoff]
    recent_health = [m for m in (health_metrics or []) if m.timestamp >= cutoff and m.heart_rate]

    EMOTION_MAP = {
        "angry": "anger",
        "disgust": "anger", 
        "sad": "sadness",
        "joy": "happy",
        "happines": "happy"
    }
    
    alignment_score = 0.0
    masking_flag = False
    details = []
    stability_score = 1.0 
    severity_result = {"level": "LOW", "score": 0.0, "summary": "Insufficient data"}
    text_dist = {}
    face_dist = {}
    hr_anomalies = 0

    def get_norm_emotion(log):
        e = log.emotion
        if e: e = e.lower()
        return EMOTION_MAP.get(e, e)
    
    if recent_text:
        text_emotions = [get_norm_emotion(l) for l in recent_text if get_norm_emotion(l) != 'neutral']
        if not text_emotions: text_emotions = ['neutral']
        t_counts = Counter(text_emotions)
        t_total = sum(t_counts.values())
        if t_total > 0:
            text_dist = {k: v/t_total for k, v in t_counts.items()}
            
    if recent_face:
        face_emotions = [get_norm_emotion(l) for l in recent_face if get_norm_emotion(l) != 'neutral']
        if not face_emotions: face_emotions = ['neutral']
        f_counts = Counter(face_emotions)
        f_total = sum(f_counts.values())
        if f_total > 0:
            face_dist = {k: v/f_total for k, v in f_counts.items()}
            
    if recent_text and recent_face:
        emotions = set(text_dist.keys()) | set(face_dist.keys())
        alignment_score = sum(min(text_dist.get(e, 0), face_dist.get(e, 0)) for e in emotions)
    
        negative_emotions = {'sadness', 'anger', 'fear', 'disgust', 'anxiety'}
        positive_neutral = {'happy', 'joy', 'neutral', 'love', 'surprise'}
        
        face_neg_score = sum(face_dist.get(e, 0) for e in negative_emotions)
        text_pos_score = sum(text_dist.get(e, 0) for e in positive_neutral)
        
        # Original Masking Rule
        if face_neg_score > 0.4 and text_pos_score > 0.8:
            masking_flag = True
            details.append("Face shows significant negative emotion while text remains positive/neutral.")

    # 3.b Physiological Masking Detection (Phase 4)
    if recent_health:
        high_hr_events = [m for m in recent_health if m.heart_rate > 100]
        hr_anomalies = len(high_hr_events)
        
        if hr_anomalies > 0:
            # Check if text is predominantly neutral/positive despite tachycardia 
            text_pos_score = sum(text_dist.get(e, 0) for e in {'happy', 'joy', 'neutral', 'love', 'surprise'})
            if text_pos_score > 0.6:
                masking_flag = True
                details.append(f"Physiological irregularity: Elevated heart rate (>100bpm) detected {hr_anomalies} times despite outwardly neutral/positive text sentiment.")

    # 4. Stability Index
    all_events = []
    for l in recent_text:
        all_events.append({'t': l.created_at, 'e': get_norm_emotion(l)})
    for l in recent_face:
        all_events.append({'t': l.timestamp, 'e': get_norm_emotion(l)})
    
    all_events.sort(key=lambda x: x['t'])
    switches = 0
    if len(all_events) > 1:
        for i in range(1, len(all_events)):
            if all_events[i]['e'] != all_events[i-1]['e']:
                switches += 1
    
    switch_rate = switches / (len(all_events) - 1) if len(all_events) > 1 else 0
    stability_score = max(0.0, 1.0 - switch_rate)
    
    if len(all_events) > 1:
        # 5. Severity
        sorted_emotions = [x['e'] for x in all_events]
        mid_point = len(sorted_emotions) // 2
        old_emotions = sorted_emotions[:mid_point]
        new_emotions = sorted_emotions[mid_point:]
        
        from analysis.drift import detect_emotion_drift
        drift_result = detect_emotion_drift(old_emotions, new_emotions)
        volatility_score = 1.0 - stability_score
        
        from analysis.severity import analyze_severity
        severity_result = analyze_severity(drift_result, volatility_score, range_days)

        # Increase severity manually if physiological masking is detected
        if masking_flag and hr_anomalies > 0 and severity_result["level"] in ["LOW", "MODERATE"]:
            severity_result["level"] = "HIGH"
            severity_result["summary"] += " (Elevated due to physiological masking)"

    return {
        "alignment_score": round(alignment_score, 2),
        "masking_detected": masking_flag,
        "masking_details": details,
        "stability_score": round(stability_score, 2),
        "dominant_modality": "Face" if len(recent_face) > len(recent_text) else "Text",
        "severity": severity_result,
        "heart_rate_anomalies": hr_anomalies,
        "distributions": {
            "text": text_dist,
            "face": face_dist
        }
    }
