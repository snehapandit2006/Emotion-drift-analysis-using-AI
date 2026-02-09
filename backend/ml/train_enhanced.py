import pandas as pd
import numpy as np
import os
import joblib
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.metrics import classification_report, accuracy_score
import shutil
import re

# Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ORIGINAL_DATA_PATH = os.path.join(BASE_DIR, "../docs/Emotion_final.csv")
NEW_DATA_PATH = "E:/emotion-drift/datasets/Training_Data_Google_Play_reviews_6000.csv"
MODEL_PATH = os.path.join(BASE_DIR, "emotion_model.pkl")
VECTORIZER_PATH = os.path.join(BASE_DIR, "tfidf_vectorizer.pkl")

# Backup existing models
if os.path.exists(MODEL_PATH):
    shutil.copy(MODEL_PATH, MODEL_PATH + ".bak")
if os.path.exists(VECTORIZER_PATH):
    shutil.copy(VECTORIZER_PATH, VECTORIZER_PATH + ".bak")

def clean_text(text):
    if not isinstance(text, str):
        return ""
    text = text.lower()
    text = re.sub(r'[^a-zA-Z0-9\s]', '', text)
    return text.strip()

def load_and_merge_data():
    print("Loading datasets...")
    
    # 1. Load Original Data
    df_orig = pd.read_csv(ORIGINAL_DATA_PATH)
    # Expected columns: Text, Emotion
    df_orig = df_orig[['Text', 'Emotion']].rename(columns={'Text': 'text', 'Emotion': 'emotion'})
    print(f"Original dataset size: {len(df_orig)}")

    # 2. Load New Data
    df_new = pd.read_csv(NEW_DATA_PATH)
    # Expected: content, score
    # Map Score to Emotion
    # 1->anger, 2->sadness, 3->neutral, 4->happy, 5->love
    score_map = {
        1: 'anger',
        2: 'sadness',
        3: 'neutral',
        4: 'happy',
        5: 'love'
    }
    
    # Filter and map
    df_new['emotion'] = df_new['score'].map(score_map)
    df_new = df_new.dropna(subset=['emotion']) # Drop if any scores didn't match (unlikely)
    df_new['text'] = df_new['content']
    df_new = df_new[['text', 'emotion']]
    print(f"New dataset size (mapped): {len(df_new)}")

    # 3. Merge
    df_final = pd.concat([df_orig, df_new], ignore_index=True)
    
    # Clean text
    df_final['clean_text'] = df_final['text'].apply(clean_text)
    df_final = df_final[df_final['clean_text'].str.len() > 1] # Remove empty after cleaning
    
    print(f"Combined dataset size: {len(df_final)}")
    print("Emotion distribution:\n", df_final['emotion'].value_counts())
    
    return df_final

def train_model(df):
    print("\nTraining model...")
    X = df['clean_text']
    y = df['emotion']

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    # Pipeline
    # Using existing parameters logic if known, otherwise standard TF-IDF + LogReg
    vectorizer = TfidfVectorizer(max_features=5000)
    model = LogisticRegression(max_iter=1000)

    # Fit ID-IDF first
    X_train_vec = vectorizer.fit_transform(X_train)
    X_test_vec = vectorizer.transform(X_test)

    # Train Model
    model.fit(X_train_vec, y_train)

    # Evaluate
    y_pred = model.predict(X_test_vec)
    acc = accuracy_score(y_test, y_pred)
    print(f"Model Accuracy: {acc:.4f}")
    print("\nClassification Report:\n", classification_report(y_test, y_pred))

    # Save
    print(f"Saving artifacts to {BASE_DIR}...")
    joblib.dump(model, MODEL_PATH)
    joblib.dump(vectorizer, VECTORIZER_PATH)
    print("Done!")

if __name__ == "__main__":
    try:
        df = load_and_merge_data()
        train_model(df)
    except Exception as e:
        print(f"An error occurred: {e}")
