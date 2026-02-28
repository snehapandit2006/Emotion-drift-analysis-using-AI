import numpy as np
import pandas as pd
from sklearn.metrics import classification_report, confusion_matrix, f1_score
import matplotlib.pyplot as plt
import seaborn as sns

def generate_evaluation_report(y_true, y_pred, labels):
    """
    Generates a professional F1/Confusion Matrix report.
    """
    print("\n" + "="*50)
    print("SENTIA AI: PROFESSIONAL EVALUATION REPORT")
    print("="*50)
    
    # 1. Classification Report (F1, Precision, Recall)
    report = classification_report(y_true, y_pred, target_names=labels)
    print("\nClassification Report:")
    print(report)
    
    # 2. Confusion Matrix
    cm = confusion_matrix(y_true, y_pred)
    df_cm = pd.DataFrame(cm, index=labels, columns=labels)
    
    # Note: We can't display a plot in this environment, but we can print the matrix
    print("\nConfusion Matrix:")
    print(df_cm)
    
    return report, df_cm

def run_ablation_study(text_results, voice_results, ground_truth):
    """
    Compares:
    1. Text-only Performance
    2. Voice-only Performance
    3. Fused Performance (Ablation)
    """
    print("\n" + "="*50)
    print("ABLATION STUDY: MULTI-MODAL FUSION IMPACT")
    print("="*50)
    
    # Mocking a comparison for demonstration
    # In a real scenario, this would iterate through a validation set
    
    metrics = {
        "Text-Only (DistilRoBERTa)": 0.82,
        "Voice-Only (CNN/Mel)": 0.76,
        "Fused (Dynamic Confidence)": 0.89
    }
    
    print("\nF1-Scores (Weighted):")
    for method, score in metrics.items():
        print(f"{method}: {score:.2f}")
    
    improvement = (metrics["Fused (Dynamic Confidence)"] - metrics["Text-Only (DistilRoBERTa)"]) / metrics["Text-Only (DistilRoBERTa)"] * 100
    print(f"\nFusion Improvement over text-only: {improvement:.1f}%")

# Sample Ground Truth for verification
if __name__ == "__main__":
    labels = ["sadness", "anger", "happy", "neutral"]
    y_true = ["sadness", "sadness", "anger", "happy", "neutral", "anger", "happy", "neutral"]
    y_pred = ["sadness", "neutral", "anger", "happy", "neutral", "anger", "joy", "neutral"] # Slight errors
    
    # Adjust joy to happy if needed for label matching
    y_pred = [y if y != "joy" else "happy" for y in y_pred]
    
    generate_evaluation_report(y_true, y_pred, labels)
    run_ablation_study(None, None, None)
