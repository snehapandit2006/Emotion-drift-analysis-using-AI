from collections import Counter
from sqlalchemy.orm import Session
from db.models import EmotionLog, DriftAlert
from datetime import datetime, timedelta


def distribution_distance(dist1, dist2):
    emotions = set(dist1.keys()).union(dist2.keys())
    total = sum(abs(dist1.get(e, 0) - dist2.get(e, 0)) for e in emotions)
    return total / 2


def detect_emotion_drift(emotions_old, emotions_new):
    if not emotions_old or not emotions_new:
        return {
            "drift": False,
            "severity": 0.0,
            "from": None,
            "to": None
        }

    old_count = Counter(emotions_old)
    new_count = Counter(emotions_new)

    old_total = sum(old_count.values())
    new_total = sum(new_count.values())

    old_dist = {k: v / old_total for k, v in old_count.items()}
    new_dist = {k: v / new_total for k, v in new_count.items()}

    dominant_old = max(old_dist, key=old_dist.get)
    dominant_new = max(new_dist, key=new_dist.get)

    severity = distribution_distance(old_dist, new_dist)
    drift = dominant_old != dominant_new or severity > 0.3

    return {
        "drift": drift,
        "from": dominant_old,
        "to": dominant_new,
        "severity": round(severity, 3)
    }


def get_emotion_stats(
    db: Session,
    user_id: str,
    start,
    end
):
    logs = db.query(EmotionLog).filter(
        EmotionLog.user_id == user_id,
        EmotionLog.created_at.between(start, end)
    ).all()

    emotions = [l.emotion for l in logs]
    counts = Counter(emotions)
    
    total_logs = len(logs)
    avg_confidence = sum(l.confidence for l in logs) / total_logs if total_logs > 0 else 0.0

    # Fetch Alerts
    alerts = db.query(DriftAlert).filter(
        DriftAlert.user_id == user_id,
        DriftAlert.created_at.between(start, end)
    ).order_by(DriftAlert.created_at.desc()).all()

    return {
        "distribution": dict(counts),
        "dominant": counts.most_common(1)[0][0] if counts else "N/A",
        "total_logs": total_logs,
        "average_confidence": round(avg_confidence, 2),
        "logs": logs,
        "alerts": alerts
    }


def calculate_stability(emotions):
    """
    Calculates stability score based on emotion switches.
    Range: 0.0 (Volatile) to 1.0 (Stable)
    """
    if len(emotions) < 2:
        return 1.0
    
    switches = 0
    for i in range(1, len(emotions)):
        if emotions[i] != emotions[i-1]:
            switches += 1
            
    switch_rate = switches / (len(emotions) - 1)
    return max(0.0, 1.0 - switch_rate)


def check_and_create_alert(db: Session, user_id: str, window: int = 20):
    """
    Checks recent logs for drift/severity and creates a persistent alert if needed.
    Should be called after adding new logs.
    """
    # 1. Fetch recent logs
    logs = db.query(EmotionLog).filter(
        EmotionLog.user_id == user_id
    ).order_by(EmotionLog.created_at.desc()).limit(window).all()
    
    if len(logs) < 5:
        return None # Not enough data
        
    # 2. Split for drift
    # Sort chronologically for detection
    logs.sort(key=lambda x: x.created_at)
    emotions = [l.emotion for l in logs]
    
    mid = len(emotions) // 2
    old = emotions[:mid]
    new = emotions[mid:]
    
    drift_res = detect_emotion_drift(old, new)
    
    # 3. Check Severity
    stability = calculate_stability(emotions)
    
    # Alert Logic
    # 1. High Drift Severity
    # 2. Low Stability (High Volatility) - Matching condition_detection.py logic (< 0.4 is High Risk)
    
    alert_triggered = False
    alert_msg = ""
    
    if drift_res["severity"] > 0.4:
        alert_triggered = True
        alert_msg = f"Significant emotional drift detected (Severity: {drift_res['severity']})"
        
    elif stability < 0.4:
        alert_triggered = True
        alert_msg = f"High emotional volatility detected (Stability: {round(stability, 2)})"
        
    if alert_triggered:
        # Check if we recently alerted to avoid spam (e.g. last 24h)
        last_alert = db.query(DriftAlert).filter(
            DriftAlert.user_id == user_id
        ).order_by(DriftAlert.created_at.desc()).first()
        
        if last_alert and (datetime.utcnow() - last_alert.created_at) < timedelta(hours=24):
            return None # Already alerted recently
            
        # Create Alert
        alert = DriftAlert(
            user_id=user_id,
            severity=drift_res["severity"], # Keep drift severity as the main metric for now, or use max
            from_emotion=drift_res["from"],
            to_emotion=drift_res["to"],
            message=alert_msg, # Ensure model has this field or we just store severity
            created_at=datetime.utcnow()
        )
        db.add(alert)
        db.commit()
        return alert
    
    return None
