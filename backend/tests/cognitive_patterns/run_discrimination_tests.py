import sys
import os
import json

# Add parent directory to sys.path so we can import backend packages
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from analysis.cognitive_features import calculate_semantic_scores

def run_discrimination_benchmarks():
    print("==========================================================")
    print(" SENTIA COGNITIVE PATTERN DISCRIMINATION VALIDATION SUITE ")
    print("==========================================================\n")
    
    base_dir = os.path.dirname(os.path.abspath(__file__))
    cases_path = os.path.join(base_dir, "discrimination_cases.json")
    
    if not os.path.exists(cases_path):
        print(f"Error: discrimination_cases.json not found at {cases_path}")
        sys.exit(1)
        
    with open(cases_path, "r", encoding="utf-8") as f:
        cases = json.load(f)
        
    print(f"Loaded {len(cases)} validation cases.\n")
    
    # Classification threshold for scaled scores
    THRESHOLD = 0.40
    print(f"Classification Detection Threshold: {THRESHOLD:.2f}\n")
    
    # Track stats by pattern
    patterns = ["catastrophizing", "avoidance", "rumination", "perfectionism", "self_criticism"]
    stats = {
        p: {"TP": 0, "FP": 0, "TN": 0, "FN": 0, "ambiguous": []}
        for p in patterns
    }
    
    print(f"{'Text Snippet':<45} | {'Pattern':<15} | {'Type':<9} | {'Score':<5} | {'Result':<5}")
    print("-" * 90)
    
    for case in cases:
        text = case["text"]
        pattern = case["pattern"]
        case_type = case["type"]
        
        # Calculate semantic score
        scores = calculate_semantic_scores([text])
        got_score = scores.get(pattern, 0.0)
        detected = got_score >= THRESHOLD
        
        snippet = text[:42] + "..." if len(text) > 45 else text
        
        if case_type == "positive":
            expected = True
            if detected:
                result = "TP"
                stats[pattern]["TP"] += 1
            else:
                result = "FN"
                stats[pattern]["FN"] += 1
        elif case_type == "near-miss":
            expected = False
            if detected:
                result = "FP"
                stats[pattern]["FP"] += 1
            else:
                result = "TN"
                stats[pattern]["TN"] += 1
        else: # ambiguous
            expected = None
            result = "AMBIG"
            stats[pattern]["ambiguous"].append((text, got_score))
            
        print(f"{snippet:<45} | {pattern:<15} | {case_type:<9} | {got_score:<5.2f} | {result:<5}")
        
    print("-" * 90)
    print("\nDISCRIMINATION METRICS BY COGNITIVE PATTERN:")
    print(f"{'Pattern':<16} | {'TP':<3} | {'TN':<3} | {'FP':<3} | {'FN':<3} | {'Precision':<9} | {'Recall':<6} | {'FPR':<5} | {'FNR':<5}")
    print("-" * 80)
    
    total_tp = 0
    total_tn = 0
    total_fp = 0
    total_fn = 0
    
    for p in patterns:
        tp = stats[p]["TP"]
        tn = stats[p]["TN"]
        fp = stats[p]["FP"]
        fn = stats[p]["FN"]
        
        total_tp += tp
        total_tn += tn
        total_fp += fp
        total_fn += fn
        
        precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
        recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
        fpr = fp / (fp + tn) if (fp + tn) > 0 else 0.0
        fnr = fn / (fn + tp) if (fn + tp) > 0 else 0.0
        
        print(f"{p:<16} | {tp:<3} | {tn:<3} | {fp:<3} | {fn:<3} | {precision:<9.1%} | {recall:<6.1%} | {fpr:<5.1%} | {fnr:<5.1%}")
        
    print("-" * 80)
    
    overall_precision = total_tp / (total_tp + total_fp) if (total_tp + total_fp) > 0 else 0.0
    overall_recall = total_tp / (total_tp + total_fn) if (total_tp + total_fn) > 0 else 0.0
    overall_fpr = total_fp / (total_fp + total_tn) if (total_fp + total_tn) > 0 else 0.0
    overall_fnr = total_fn / (total_fn + total_tp) if (total_fn + total_tp) > 0 else 0.0
    overall_accuracy = (total_tp + total_tn) / (total_tp + total_tn + total_fp + total_fn) if (total_tp + total_tn + total_fp + total_fn) > 0 else 0.0
    
    print(f"{'OVERALL':<16} | {total_tp:<3} | {total_tn:<3} | {total_fp:<3} | {total_fn:<3} | {overall_precision:<9.1%} | {overall_recall:<6.1%} | {overall_fpr:<5.1%} | {overall_fnr:<5.1%}")
    print(f"\nOverall Discrimination Accuracy: {overall_accuracy:.1%}")
    print("==========================================================")
    
    # If false positives exist or precision is too low, we raise warning
    if overall_fpr > 0.15:
        print("\nWARNING: False Positive Rate exceeds 15%! Sentia may misidentify healthy reflection.")
        # We don't fail yet, but let's exit with 1 to prompt calibration
        sys.exit(1)
    else:
        print("\nSUCCESS: Discrimination criteria satisfied with low False Positive Rate.")
        sys.exit(0)

if __name__ == "__main__":
    run_discrimination_benchmarks()
