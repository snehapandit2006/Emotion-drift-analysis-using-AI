import numpy as np
from datetime import datetime, timedelta
from typing import List, Dict

# Numerical mapping for intensity calculation
EMOTION_INTENSITY = {
    "anger": 0.9,
    "fear": 0.8,
    "sadness": 0.7,
    "surprise": 0.5,
    "love": 0.4,
    "joy": 0.3,
    "happy": 0.3,
    "neutral": 0.0
}

def calculate_volatility(emotions: List[str]) -> float:
    """
    Computes Emotional Volatility: How often and drastically emotions swing.
    Returns value between 0 (stable) and 1 (highly volatile).
    """
    if len(emotions) < 2:
        return 0.0
    
    intensities = [EMOTION_INTENSITY.get(e, 0.5) for e in emotions]
    diffs = np.diff(intensities)
    volatility = np.mean(np.abs(diffs))
    return float(min(volatility * 2, 1.0)) # Scaling for better resolution

def calculate_baseline_shift(old_emotions: List[str], new_emotions: List[str]) -> Dict:
    """
    Detects a shift in the "normal" emotional state.
    """
    if not old_emotions or not new_emotions:
        return {"shift": 0.0, "direction": "stable"}
    
    old_avg = np.mean([EMOTION_INTENSITY.get(e, 0.5) for e in old_emotions])
    new_avg = np.mean([EMOTION_INTENSITY.get(e, 0.5) for e in new_emotions])
    
    shift = new_avg - old_avg
    return {
        "shift": float(abs(shift)),
        "direction": "negative" if shift > 0.1 else "positive" if shift < -0.1 else "stable"
    }

def calculate_recovery_time(logs: List[Dict]) -> float:
    """
    Computes average time (minutes) to return to 'neutral' or 'happy' 
    after a 'negative' event (anger/sadness/fear).
    """
    if not logs:
        return 0.0
    
    negative_states = {"anger", "sadness", "fear"}
    positive_states = {"neutral", "happy", "joy"}
    
    recovery_durations = []
    current_negative_start = None
    
    for log in logs:
        emotion = log.get("emotion")
        timestamp = log.get("t")
        
        if emotion in negative_states:
            if current_negative_start is None:
                current_negative_start = timestamp
        elif emotion in positive_states:
            if current_negative_start is not None:
                duration = (timestamp - current_negative_start).total_seconds() / 60
                recovery_durations.append(duration)
                current_negative_start = None
                
    if not recovery_durations:
        return 0.0
        
    return float(np.mean(recovery_durations))

def get_behavioral_summary(logs: List[Dict], window: int = 10) -> Dict:
    """
    Returns a comprehensive behavioral audit.
    """
    emotions = [l["e"] for l in logs]
    
    if len(emotions) < window:
        return {"status": "insufficient_data"}
        
    volatility = calculate_volatility(emotions[-window:])
    
    # Split for baseline shift
    mid = len(emotions) // 2
    shift = calculate_baseline_shift(emotions[:mid], emotions[mid:])
    
    recovery = calculate_recovery_time(logs)
    
    return {
        "volatility": volatility,
        "baseline_shift": shift,
        "avg_recovery_minutes": recovery,
        "risk_level": "high" if volatility > 0.7 or shift["direction"] == "negative" else "low"
    }
