from analysis.condition_detection import detect_conditions
from collections import namedtuple

# Mock Log Objects
EmotionLog = namedtuple("EmotionLog", ["emotion", "created_at"])
FaceEmotionLog = namedtuple("FaceEmotionLog", ["emotion", "timestamp"])

def test_depression_detection():
    print("Testing Depression Detection...")
    # 90% sadness
    text_logs = [EmotionLog("sadness", None)] * 9
    face_logs = [FaceEmotionLog("sad", None)] * 1
    
    conditions = detect_conditions(text_logs, face_logs, stability_score=1.0)
    
    found = any(c['code'] == 'DEPRESSION_PATTERN' for c in conditions)
    if found:
        print("PASS: Depression pattern detected.")
        for c in conditions:
            if c['code'] == 'DEPRESSION_PATTERN':
                print(f"  Level: {c['level']}")
    else:
        print("FAIL: Depression pattern NOT detected.")

def test_anxiety_detection():
    print("\nTesting Anxiety Detection...")
    # High fear + High Volatility (Low Stability)
    text_logs = [EmotionLog("fear", None)] * 4 + [EmotionLog("neutral", None)] * 6
    face_logs = []
    
    # Stability 0.2 (High Volatility)
    conditions = detect_conditions(text_logs, face_logs, stability_score=0.2)
    
    found = any(c['code'] == 'ANXIETY_PATTERN' for c in conditions)
    if found:
        print("PASS: Anxiety pattern detected.")
        for c in conditions:
            if c['code'] == 'ANXIETY_PATTERN':
                print(f"  Level: {c['level']}")
    else:
        print("FAIL: Anxiety pattern NOT detected.")

if __name__ == "__main__":
    try:
        test_depression_detection()
        test_anxiety_detection()
    except Exception as e:
        print(f"An error occurred: {e}")
