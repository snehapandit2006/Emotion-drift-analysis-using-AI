import re
from ml.llm_bridge import text_to_digit

def test_number_extraction():
    test_queries = [
        "What's the emotional log of patient one?",
        "summarize patient 1",
        "summarise patient 1", # UK spelling
        "summarise 1",
        "summarise", # Should rely on context_patient_id
        "mareez 5 summary", # Hindi keyword (mareez)
        "मरीज एक समरी", # Pure Hindi
        "मरीज दो", # Hindi digits
        "id 2 status",
        "tell me about 3 trends",
        "doctor analysis for patient ten"
    ]
    
    expected_digits = ["1", "1", "1", "1", "1", "5", "1", "2", "2", "3", "10"]
    context_id = 1
    
    for query, expected in zip(test_queries, expected_digits):
        q_processed = text_to_digit(query.lower())
        
        # Sync with actual implementation
        patient_id = None
        pt_match = re.search(r'(?:patient|id|number|pt|#|user|मरीज|mareez)\s*[:#-]?\s*(\d+)', q_processed)
        if pt_match:
            patient_id = pt_match.group(1)
        
        if not patient_id and any(w in q_processed for w in ["summarize", "summarise", "summary", "history", "trend", "log", "समरी", "इतिहास", "ट्रेंड"]):
            digit_match = re.search(r'(\d+)', q_processed)
            if digit_match:
                patient_id = digit_match.group(1)
        
        if not patient_id:
            patient_id = str(context_id)
        
        digit = str(patient_id)
        
        print(f"Query: {query}")
        print(f"  Processed: {q_processed}")
        print(f"  Extracted ID: {digit}")
        assert digit == expected, f"Extraction failed for '{query}'! Expected {expected}, got {digit}"
        print("  PASS")

if __name__ == "__main__":
    try:
        test_number_extraction()
        print("\nAll Doctor Assistant robustness tests PASSED.")
    except Exception as e:
        print(f"\nTest FAILED: {e}")
