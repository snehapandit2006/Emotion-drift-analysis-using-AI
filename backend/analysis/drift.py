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


import json

def extract_stress(log) -> float:
    """
    Derives a stress score [0-1] from a log's dominant emotion.
    Maps conceptually to: stress = 0.6*fear + 0.3*nervousness + 0.1*anger
    """
    conf = min(max(log.confidence, 0.0), 1.0)
    if log.emotion == 'fear':
        return conf  # Heavily maps fear to stress
    elif log.emotion == 'anger':
        return 0.5 * conf
    elif log.emotion == 'sadness':
        return 0.3 * conf
    elif log.emotion == 'surprise':
        return 0.4 * conf
    return 0.0


def calculate_instant_risk(stress: float, sadness: float, anger: float) -> float:
    """
    Calculates instant emotional risk.
    Formula: 0.5*stress + 0.3*sadness + 0.2*anger
    """
    # Normalization guard
    stress = min(max(stress, 0.0), 1.0)
    sadness = min(max(sadness, 0.0), 1.0)
    anger = min(max(anger, 0.0), 1.0)
    
    return 0.5 * stress + 0.3 * sadness + 0.2 * anger


def check_and_create_alert(db: Session, user_id: str, window: int = 5):
    """
    Checks recent logs for Instant Emotional Risk and Drift-Based Risk (Slope).
    Creates a structured DriftAlert if threshold is crossed.
    """
    # 1. Fetch recent logs (need at least 1 for instant, 5 for drift)
    logs = db.query(EmotionLog).filter(
        EmotionLog.user_id == user_id
    ).order_by(EmotionLog.created_at.desc()).limit(window).all()
    
    if not logs:
        return None
        
    logs.sort(key=lambda x: x.created_at)
    latest_log = logs[-1]
    
    # 2. Instant Emotional Risk
    stress = extract_stress(latest_log)
    sadness = latest_log.confidence if latest_log.emotion == 'sadness' else 0.0
    anger = latest_log.confidence if latest_log.emotion == 'anger' else 0.0
    
    instant_risk = calculate_instant_risk(stress, sadness, anger)
    
    alert_triggered = False
    alert_type = None
    level = None
    score = 0.0
    
    # Priority System
    if instant_risk > 0.85:
        alert_triggered = True
        alert_type = "INSTANT_EMOTIONAL_ALERT"
        level = "HIGH"
        score = instant_risk
    elif instant_risk > 0.7:
        alert_triggered = True
        alert_type = "INSTANT_EMOTIONAL_ALERT"
        level = "MODERATE"
        score = instant_risk
        
    # 3. Drift-Based Risk (Simple Linear Regression Slope)
    if not alert_triggered and len(logs) >= 5:
        # Get last 5 sessions
        recent_5 = logs[-5:]
        y1 = extract_stress(recent_5[0])
        y5 = extract_stress(recent_5[4])
        
        slope = (y5 - y1) / 4.0
        
        if slope > 0.08:
            alert_triggered = True
            alert_type = "DRIFT_EMOTIONAL_ALERT"
            level = "MODERATE" if slope <= 0.15 else "HIGH"
            score = slope
            
    if alert_triggered:
        # Check if we recently alerted to avoid spam
        last_alert = db.query(DriftAlert).filter(
            DriftAlert.user_id == user_id
        ).order_by(DriftAlert.created_at.desc()).first()
        
        if last_alert and (datetime.utcnow() - last_alert.created_at) < timedelta(hours=2):
            return None # Rate limit alerts
            
        # Structured Logging
        alert_payload = {
            "type": alert_type,
            "patient_id": user_id,
            "score": round(score, 3),
            "level": level,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        print(f"[ALERT ENGINE] {json.dumps(alert_payload)}")
        
        # Save to DB
        alert = DriftAlert(
            user_id=user_id,
            severity=score,
            from_emotion=logs[0].emotion,
            to_emotion=latest_log.emotion,
            message=json.dumps(alert_payload),
            created_at=datetime.utcnow()
        )
        db.add(alert)
        db.commit()
        return alert
        
    return None
