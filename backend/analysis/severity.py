from datetime import datetime, timedelta

def analyze_severity(drift_result, volatility_score, time_window_days=7):
    """
    Analyzes emotional severity based on drift, volatility, and time.
    
    Args:
        drift_result (dict): Output from drift detection (drift boolean, details).
        volatility_score (float): 0.0 (stable) to 1.0 (volatile).
        time_window_days (int): Analysis window in days.
        
    Returns:
        dict: Severity level, score, summary, and support recommendation.
    """
    
    severity_level = "LOW"
    confidence = 0.0
    recommend_support = False
    details = []

    # Factors
    has_drift = drift_result.get("drift", False)
    # Drift result from drift.py returns top-level severity key
    drift_severity = drift_result.get("severity", 0.0)
    
    # 1. Base Score calculation (0.0 to 1.0)
    # Drift contributes 0.6 max, Volatility 0.4 max
    base_score = (drift_severity * 0.6) + (volatility_score * 0.4)
    
    # 2. Level Determination
    if base_score < 0.3:
        severity_level = "LOW"
        details.append("Emotional fluctuations are within normal range.")
    elif base_score < 0.6:
        severity_level = "MEDIUM"
        details.append(f"Sustained emotional drift detected over {time_window_days} days.")
    elif base_score < 0.8:
        severity_level = "HIGH"
        details.append("Significant emotional drift combined with high volatility.")
        recommend_support = True
    else:
        severity_level = "CRITICAL" # Internal label, shown as "High Risk" to user
        details.append("Persistent high-intensity negative patterns detected.")
        recommend_support = True
        
    # 3. Time Decay / Persistence check
    # If the window is short (< 3 days), cap severity at MEDIUM to avoid overreaction
    if time_window_days < 3 and severity_level in ["HIGH", "CRITICAL"]:
        severity_level = "MEDIUM"
        details.append("Short timeframe limits confidence in high severity.")
        recommend_support = False # Require more data for support rec
        base_score *= 0.8

    return {
        "level": severity_level,
        "score": round(base_score, 2),
        "recommend_support": recommend_support,
        "summary": " ".join(details)
    }
