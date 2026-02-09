import sys
import os
import joblib
import numpy as np

# Adjust path to import from src
sys.path.append(os.path.join(os.path.dirname(__file__), "src"))
from preprocess import clean_text

# Load artifacts
try:
    model = joblib.load(os.path.join("ml", "emotion_model.pkl"))
    vectorizer = joblib.load(os.path.join("ml", "tfidf_vectorizer.pkl"))
    labels = model.classes_
except Exception as e:
    print(f"Error loading artifacts: {e}")
    sys.exit(1)

text = "he said he loves me"

# 1. Check Preprocessing
cleaned = clean_text(text)
print(f"Original: '{text}'")
print(f"Cleaned:  '{cleaned}'")

# 2. Check Prediction via Inference (Safety Layer)
sys.path.append(os.path.join(os.path.dirname(__file__), "ml"))
from inference import predict_emotion
result = predict_emotion(text)
print(f"Prediction Result: {result}")
