import sys
import os
from datetime import datetime
# Ensure backend modules are found
sys.path.append(os.getcwd())

from reports.pdf_generator import generate_pdf

# Mock Data
charts = {
    "dominant_emotion": "Joy",
    "total_logs": 150,
    "average_confidence": 0.85,
    "distribution": {"Joy": 80, "Sadness": 20, "Anger": 10, "Fear": 40},
    "alerts": [], # Empty list to test empty case, or add mock objects if needed
    "distribution_chart": "mock_path_that_does_not_exist.png" 
}

# Create a dummy Alert object class for testing if needed
class MockAlert:
    def __init__(self, from_e, to_e, sev, time):
        self.from_emotion = from_e
        self.to_emotion = to_e
        self.severity = sev
        self.created_at = time

charts["alerts"] = [
    MockAlert("Joy", "Sadness", 0.45, datetime.now()),
    MockAlert("Neutral", "Anger", 0.60, datetime.now())
]

try:
    print("Generating PDF...")
    path = generate_pdf("test_user_123", charts, ("2023-01-01", "2023-01-31"), "test_report_001")
    print(f"PDF generated at: {path}")
    if os.path.exists(path):
        print(f"File size: {os.path.getsize(path)} bytes")
    else:
        print("Error: File not found after generation.")
except Exception as e:
    print(f"FAILED: {e}")
    import traceback
    traceback.print_exc()
