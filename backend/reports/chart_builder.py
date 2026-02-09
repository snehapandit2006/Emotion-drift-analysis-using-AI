import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import os
from analysis.drift import get_emotion_stats


def build_charts(db, user_id, start, end, report_id):
    stats = get_emotion_stats(db, user_id, start, end)

    os.makedirs("reports/results", exist_ok=True)
    chart_path = f"reports/results/{report_id}_dist.png"

    plt.figure()
    plt.bar(stats["distribution"].keys(), stats["distribution"].values())
    plt.title("Emotion Distribution")
    plt.savefig(chart_path)
    plt.close()

    return {
        "distribution_chart": chart_path,
        "dominant_emotion": stats["dominant"],
        "total_logs": stats["total_logs"],
        "average_confidence": stats["average_confidence"],
        "distribution": stats["distribution"],
        "alerts": stats["alerts"]
    }
