from collections import Counter
from datetime import datetime

def detect_conditions(text_logs, face_logs, stability_score=1.0):
    """
    Analyzes emotion logs to detect patterns indicative of mental health conditions.
    
    Args:
        text_logs: List of EmotionLog objects.
        face_logs: List of FaceEmotionLog objects.
        stability_score: Float from 0.0 (volatile) to 1.0 (stable).
        
    Returns:
        list: List of detected condition dictionaries with 'name', 'level', 'description', 'recommendation'.
    """
    
    # 1. Aggregate Emotions
    all_emotions = []
    
    # Normalize
    EMOTION_MAP = {
        "angry": "anger",
        "disgust": "anger", 
        "sad": "sadness",
        "joy": "happy",
        "happines": "happy",
        "fear": "fear",
        "neutral": "neutral",
        "surprise": "surprise",
        "love": "happy",
        "worry": "fear",
        "nervous": "fear",
        "anxious": "fear",
        "panic": "fear",
        "stressed": "anger" # or fear? Stressed often correlates with anger/irritability in this model
    }
    
    def get_norm(e):
        return EMOTION_MAP.get(e.lower(), e.lower()) if e else "neutral"

    for l in text_logs:
        all_emotions.append(get_norm(l.emotion))
    for l in face_logs:
        all_emotions.append(get_norm(l.emotion))
        
    if not all_emotions:
        return []
        
    total = len(all_emotions)
    counts = Counter(all_emotions)
    
    def get_freq(e):
        return counts.get(e, 0) / total
        
    # frequencies
    sadness_freq = get_freq("sadness")
    fear_freq = get_freq("fear")
    anger_freq = get_freq("anger")
    happy_freq = get_freq("happy")
    
    detected = []
    
    # --- Logic Rules ---
    
    # 1. Depression Patterns
    # High persistent sadness, low happiness
    if sadness_freq > 0.4:
        level = "Low"
        desc = "Frequent feelings of sadness detected."
        
        if sadness_freq > 0.6:
            level = "Moderate"
            desc = "Persistent sadness and low mood detected."
        if sadness_freq > 0.8:
            level = "High"
            desc = "Dominant and persistent pattern of sadness."
            
        detected.append({
            "code": "DEPRESSION_PATTERN",
            "name": "Depressive Pattern",
            "level": level,
            "description": desc,
            "recommendation": "Consider tracking your mood daily and speaking with a therapist about these persistent feelings."
        })
        
    # 2. Anxiety Patterns
    # High fear + High Volatility (Low Stability)
    # Volatility is 1.0 - stability
    volatility = 1.0 - stability_score
    
    if fear_freq > 0.3 or (fear_freq > 0.2 and volatility > 0.6):
        level = "Low"
        desc = "Notable frequency of fear or anxiety."
        
        if fear_freq > 0.5 or (fear_freq > 0.3 and volatility > 0.7):
            level = "Moderate"
            desc = "Significant anxiety and emotional instability detected."
        if fear_freq > 0.7:
            level = "High"
            desc = "Dominant pattern of fear and high anxiety."
            
        detected.append({
            "code": "ANXIETY_PATTERN",
            "name": "Anxiety Pattern",
            "level": level,
            "description": desc,
            "recommendation": "Breathing exercises and mindfulness can help. Professional support is recommended for managing anxiety."
        })

    # 3. Stress / Burnout Patterns
    # High Anger + Volatility
    if anger_freq > 0.3:
        level = "Low"
        desc = "Signs of irritability and potential stress."
        
        if anger_freq > 0.5:
            level = "Moderate"
            desc = "Frequent anger indicating high stress or burnout."
        if anger_freq > 0.7:
            level = "High"
            desc = "Dominant pattern of anger/irritability."
            
        detected.append({
            "code": "STRESS_PATTERN",
            "name": "High Stress / Burnout",
            "level": level,
            "description": desc,
            "recommendation": "Review your workload and stressors. Stress management techniques may be beneficial."
        })
        
    # 4. Stability Risk (Matches Dashboard "High Risk")
    # If stability is very low (< 0.4), flag it even if specific emotion patterns aren't met
    if stability_score < 0.6:
        level = "Moderate"
        desc = "Emotional stability is lower than average."
        
        if stability_score < 0.4:
            level = "High"
            desc = "Significant emotional instability detected (High Volatility)."
            
        detected.append({
            "code": "STABILITY_RISK",
            "name": "Stability Risk",
            "level": level,
            "description": desc,
            "recommendation": "High volatility can indicate underlying distress. Regular monitoring is advised."
        })
        
    return detected
