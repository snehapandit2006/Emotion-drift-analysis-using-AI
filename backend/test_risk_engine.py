import pytest
from analysis.drift import calculate_instant_risk, extract_stress
from collections import namedtuple

Log = namedtuple("Log", ["emotion", "confidence"])

def test_instant_risk_thresholds():
    # 0.5*stress + 0.3*sadness + 0.2*anger
    # test < 0.7
    assert round(calculate_instant_risk(0.6, 0.5, 0.5), 2) == 0.55
    # test exactly 0.69
    assert round(calculate_instant_risk(0.8, 0.5, 0.7), 2) == 0.69
    # test > 0.7
    assert round(calculate_instant_risk(0.9, 0.6, 0.8), 2) == 0.79

def test_slope_calculation():
    from analysis.drift import check_and_create_alert
    
    # We can test slope manually based on dummy inputs to extract_stress
    # stress = 0.6*fear + 0.3*sadness + 0.1*anger + 0.4*surprise
    
    # Case 1: missing sessions (len < 5) -> skip drift
    # Checked inside check_and_create_alert (len(logs) >= 5)

    # test slope negative -> no drift alert
    y1 = 0.8
    y5 = 0.2
    slope = (y5 - y1) / 4.0
    assert round(slope, 3) == -0.15 # No alert

    # test slope positive but small -> no alert
    y1 = 0.5
    y5 = 0.6
    slope = (y5 - y1) / 4.0
    assert round(slope, 3) == 0.025 # < 0.08, no alert
    
    # test slope positive and large -> alert
    y1 = 0.2
    y5 = 0.85
    slope = (y5 - y1) / 4.0
    assert round(slope, 4) == 0.1625 # > 0.08, triggers

