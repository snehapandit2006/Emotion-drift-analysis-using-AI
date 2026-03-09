import re
from ml.llm_bridge import text_to_digit

def test_hindi():
    texts = ["मरीज एक", "मरीज दो", "मरीज तीन"]
    for t in texts:
        print(f"Original: {t}")
        p = text_to_digit(t)
        print(f"Processed: {p}")

if __name__ == "__main__":
    test_hindi()
