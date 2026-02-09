from collections import Counter
from sqlalchemy.orm import Session
from db.models import EmotionLog, DriftAlert


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
