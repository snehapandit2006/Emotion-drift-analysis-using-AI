import pandas as pd
import os

def analyze():
    # Paths
    base_dir = "E:/emotion-drift"
    original_path = os.path.join(base_dir, "backend/docs/Emotion_final.csv")
    new_path = os.path.join(base_dir, "datasets/Training_Data_Google_Play_reviews_6000.csv")

    print(f"--- Analyzing Original Data: {original_path} ---")
    if os.path.exists(original_path):
        df_orig = pd.read_csv(original_path)
        print("Columns:", df_orig.columns.tolist())
        if 'Emotion' in df_orig.columns:
            print("Unique Emotions:", df_orig['Emotion'].unique())
            print("Distribution:\n", df_orig['Emotion'].value_counts())
        else:
            print("ERROR: 'Emotion' column not found.")
    else:
        print("ERROR: Original file not found.")

    print(f"\n--- Analyzing New Data: {new_path} ---")
    if os.path.exists(new_path):
        try:
            df_new = pd.read_csv(new_path)
            print("Columns:", df_new.columns.tolist())
            if 'score' in df_new.columns:
                print("Unique Scores:", df_new['score'].unique())
                print("Distribution:\n", df_new['score'].value_counts())
            else:
                print("ERROR: 'score' column not found.")
        except Exception as e:
            print(f"ERROR reading new CSV: {e}")
    else:
        print("ERROR: New file not found.")

if __name__ == "__main__":
    analyze()
