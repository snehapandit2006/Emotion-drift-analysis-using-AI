import sys
import os
import json

# Add parent directory to sys.path so we can import backend packages
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from analysis.cognitive_features import calculate_semantic_scores

def run_cognitive_benchmarks():
    print("==========================================================")
    print("   SENTIA COGNITIVE PATTERN BENCHMARK VALIDATION SUITE    ")
    print("==========================================================\n")
    
    # Load cases
    base_dir = os.path.dirname(os.path.abspath(__file__))
    cases_path = os.path.join(base_dir, "cases.json")
    
    if not os.path.exists(cases_path):
        print(f"Error: cases.json not found at {cases_path}")
        sys.exit(1)
        
    with open(cases_path, "r", encoding="utf-8") as f:
        cases = json.load(f)
        
    print(f"Loaded {len(cases)} golden test cases.\n")
    print(f"{'Text Snippet':<45} | {'Expected Pattern':<16} | {'Min':<5} | {'Got':<5} | {'Status':<6}")
    print("-" * 90)
    
    passed_count = 0
    failed_count = 0
    results_summary = []
    
    for case in cases:
        text = case["text"]
        expected_pattern = case["expected_pattern"]
        expected_score_min = case["expected_score_min"]
        
        # Run semantic score calculation
        scores = calculate_semantic_scores([text])
        got_score = scores.get(expected_pattern, 0.0)
        
        passed = got_score >= expected_score_min
        status_str = "PASS" if passed else "FAIL"
        
        if passed:
            passed_count += 1
        else:
            failed_count += 1
            
        snippet = text[:42] + "..." if len(text) > 45 else text
        print(f"{snippet:<45} | {expected_pattern:<16} | {expected_score_min:<5.2f} | {got_score:<5.2f} | {status_str:<6}")
        
        results_summary.append({
            "text": text,
            "expected_pattern": expected_pattern,
            "expected_score_min": expected_score_min,
            "got_score": got_score,
            "passed": passed
        })
        
    print("-" * 90)
    total = len(cases)
    accuracy = (passed_count / total) * 100 if total > 0 else 0
    
    print(f"\nBenchmark Summary:")
    print(f"  Total Cases: {total}")
    print(f"  Passed     : {passed_count}")
    print(f"  Failed     : {failed_count}")
    print(f"  Accuracy   : {accuracy:.1f}%")
    print("==========================================================")
    
    if failed_count > 0:
        print("\nResult: BENCHMARK SUITE FAILED!")
        sys.exit(1)
    else:
        print("\nResult: BENCHMARK SUITE PASSED SUCCESSFULLY!")
        sys.exit(0)

if __name__ == "__main__":
    run_cognitive_benchmarks()
