"""
vital_analyzer.py
Analyzes a newly logged HealthMetric against:
  1. Absolute clinical thresholds (critical / warning)
  2. Rapid fluctuation compared to the previous reading

Returns a list of dicts ready to be stored as VitalAlert rows.
"""

from datetime import datetime
from typing import Optional

# ─────────────────────────────────────────────────────────
# Clinical Threshold Definitions
# ─────────────────────────────────────────────────────────
THRESHOLDS = {
    "heart_rate": {
        "warning":  {"low": 50,  "high": 100},
        "critical": {"low": 40,  "high": 140},
    },
    "spo2": {
        "warning":  {"low": 95},
        "critical": {"low": 90},
    },
    "blood_pressure_systolic": {
        "warning":  {"low": 90,  "high": 140},
        "critical": {"low": 70,  "high": 180},
    },
    "blood_pressure_diastolic": {
        "warning":  {"low": 60,  "high": 90},
        "critical": {"low": 40,  "high": 110},
    },
}

# Maximum allowed change between consecutive readings
FLUCTUATION_THRESHOLDS = {
    "heart_rate": {
        "warning":  30,   # bpm change
        "critical": 50,
    },
    "blood_pressure_systolic": {
        "warning":  25,   # mmHg change
        "critical": 40,
    },
    "blood_pressure_diastolic": {
        "warning":  20,
        "critical": 30,
    },
}

# ─────────────────────────────────────────────────────────
# Recommendation templates
# ─────────────────────────────────────────────────────────
RECOMMENDATIONS = {
    "heart_rate": {
        "critical_high": (
            "🚨 CRITICAL: Sit or lie down immediately. Loosen tight clothing. "
            "If you feel chest pain, dizziness, or difficulty breathing — call 112 (Emergency). "
            "Do not drive. Alert your doctor via the chat NOW."
        ),
        "critical_low": (
            "🚨 CRITICAL: Very low heart rate detected. Lie down and call 112 immediately. "
            "Do not stand up suddenly. Alert your doctor via the chat NOW."
        ),
        "warning_high": (
            "⚠️ WARNING: Elevated heart rate. Rest quietly for 10 minutes. "
            "Avoid caffeine, stress, and exertion. Re-check in 5 minutes. "
            "If it stays high, contact your doctor (Tele-MANAS: 14416)."
        ),
        "warning_low": (
            "⚠️ WARNING: Low resting heart rate. Rest and stay warm. "
            "Avoid sudden movements. If you feel dizzy or short of breath, call 14416."
        ),
        "fluctuation_critical": (
            "🚨 CRITICAL: Heart rate spiked/dropped drastically in a short time. "
            "Sit down, breathe slowly. Call 112 if you feel unwell. Alert your doctor NOW."
        ),
        "fluctuation_warning": (
            "⚠️ WARNING: Rapid heart rate change detected. Rest for at least 10 minutes. "
            "Avoid physical activity. Notify your doctor if it continues."
        ),
    },
    "spo2": {
        "critical_low": (
            "🚨 CRITICAL: Dangerously low blood oxygen! Call 112 immediately. "
            "Sit upright, try pursed-lip breathing (breathe in through nose, out slowly through pursed lips). "
            "Do NOT lie flat. This is a medical emergency."
        ),
        "warning_low": (
            "⚠️ WARNING: Low oxygen saturation. Sit up straight and take slow deep breaths. "
            "Avoid exertion. Re-check in 2 minutes. If still below 95%, call your doctor (14416)."
        ),
    },
    "blood_pressure_systolic": {
        "critical_high": (
            "🚨 CRITICAL: Hypertensive crisis! Call 112 immediately. "
            "Sit quietly, do not exercise or stress. Do NOT take extra medication without doctor guidance. "
            "Loosen tight clothing and stay calm."
        ),
        "critical_low": (
            "🚨 CRITICAL: Dangerously low blood pressure! Lie down with legs elevated. "
            "Drink water slowly. Call 112 if unconscious or very dizzy."
        ),
        "warning_high": (
            "⚠️ WARNING: High blood pressure. Rest quietly. Avoid salt, caffeine, and stress. "
            "Re-check in 5–10 minutes. Alert your doctor if it doesn't come down."
        ),
        "warning_low": (
            "⚠️ WARNING: Low blood pressure. Drink water, avoid sudden standing. "
            "Eat a light salty snack. Sit or lie down. Contact your doctor if persistent."
        ),
        "fluctuation_critical": (
            "🚨 CRITICAL: Blood pressure changed drastically between readings! "
            "Sit down and rest. Call 112 if you feel a headache, vision changes, or chest pain."
        ),
        "fluctuation_warning": (
            "⚠️ WARNING: Noticeable blood pressure fluctuation. Rest and check again in 10 mins. "
            "Alert your doctor if the pattern continues."
        ),
    },
    "blood_pressure_diastolic": {
        "critical_high": (
            "🚨 CRITICAL: High diastolic pressure. Seek immediate medical attention (112). "
            "Sit calmly and avoid physical activity."
        ),
        "critical_low": (
            "🚨 CRITICAL: Very low diastolic pressure. Lie down, elevate legs, call 112."
        ),
        "warning_high": (
            "⚠️ WARNING: Elevated diastolic BP. Rest, avoid sodium and stress. Re-check in 10 min."
        ),
        "warning_low": (
            "⚠️ WARNING: Low diastolic BP. Hydrate and sit down. Notify doctor if persistent."
        ),
        "fluctuation_critical": (
            "🚨 CRITICAL: Diastolic BP changed drastically. Rest immediately and contact doctor."
        ),
        "fluctuation_warning": (
            "⚠️ WARNING: Diastolic BP fluctuating. Monitor closely and notify your doctor."
        ),
    },
}

# ─────────────────────────────────────────────────────────
# Helper: get a recommendation string
# ─────────────────────────────────────────────────────────
def _get_recommendation(metric: str, key: str) -> str:
    return RECOMMENDATIONS.get(metric, {}).get(key, "Please consult your doctor immediately.")


# ─────────────────────────────────────────────────────────
# Main analysis function
# ─────────────────────────────────────────────────────────
def analyze_vitals(new_metric, prev_metric=None) -> list:
    """
    Parameters
    ----------
    new_metric  : HealthMetric SQLAlchemy row (just committed)
    prev_metric : previous HealthMetric row for the same user (or None)

    Returns
    -------
    list of dicts – each dict is ready to be unpacked into a VitalAlert(**dict)
    """
    alerts = []

    metrics_to_check = [
        ("heart_rate",              new_metric.heart_rate),
        ("spo2",                    new_metric.spo2),
        ("blood_pressure_systolic", new_metric.blood_pressure_systolic),
        ("blood_pressure_diastolic",new_metric.blood_pressure_diastolic),
    ]

    prev_values = {}
    if prev_metric:
        prev_values = {
            "heart_rate":               prev_metric.heart_rate,
            "spo2":                     prev_metric.spo2,
            "blood_pressure_systolic":  prev_metric.blood_pressure_systolic,
            "blood_pressure_diastolic": prev_metric.blood_pressure_diastolic,
        }

    for metric_name, value in metrics_to_check:
        if value is None:
            continue

        thresholds = THRESHOLDS.get(metric_name, {})
        prev_val = prev_values.get(metric_name)

        # ── 1. Absolute threshold check ──────────────────
        severity = None
        direction = None  # "high" | "low"

        crit = thresholds.get("critical", {})
        warn = thresholds.get("warning", {})

        if "low" in crit and value <= crit["low"]:
            severity, direction = "critical", "low"
        elif "high" in crit and value >= crit["high"]:
            severity, direction = "critical", "high"
        elif "low" in warn and value <= warn["low"]:
            severity, direction = "warning", "low"
        elif "high" in warn and value >= warn["high"]:
            severity, direction = "warning", "high"

        if severity:
            rec_key = f"{severity}_{direction}"
            label = metric_name.replace("_", " ").title()
            alerts.append({
                "metric":         metric_name,
                "value":          value,
                "prev_value":     prev_val,
                "alert_type":     "critical_threshold",
                "severity":       severity,
                "message":        f"{label} is at {value} — {severity.upper()} threshold breached.",
                "recommendation": _get_recommendation(metric_name, rec_key),
            })

        # ── 2. Rapid fluctuation check ───────────────────
        fluct_def = FLUCTUATION_THRESHOLDS.get(metric_name)
        if fluct_def and prev_val is not None:
            delta = abs(value - prev_val)
            f_severity = None

            if delta >= fluct_def.get("critical", float("inf")):
                f_severity = "critical"
            elif delta >= fluct_def.get("warning", float("inf")):
                f_severity = "warning"

            if f_severity:
                rec_key = f"fluctuation_{f_severity}"
                label = metric_name.replace("_", " ").title()
                alerts.append({
                    "metric":         metric_name,
                    "value":          value,
                    "prev_value":     prev_val,
                    "alert_type":     "rapid_fluctuation",
                    "severity":       f_severity,
                    "message":        (
                        f"{label} changed by {delta:.1f} units (from {prev_val} → {value}) "
                        f"— {f_severity.upper()} fluctuation detected."
                    ),
                    "recommendation": _get_recommendation(metric_name, rec_key),
                })

    return alerts
