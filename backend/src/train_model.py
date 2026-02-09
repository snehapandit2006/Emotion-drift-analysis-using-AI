from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report
from config import TEST_SIZE, RANDOM_STATE
from features import build_tfidf
import pandas as pd
import joblib
import os

# ---------- SAFE PATH SETUP ----------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(BASE_DIR, "..", "docs", "Emotion_final.csv")
ML_DIR = os.path.join(BASE_DIR, "..", "ml")

# ---------- LOAD TRAINING DATA ----------
df = pd.read_csv(DATA_PATH)

texts = df["Text"]
labels = df["Emotion"]

# ---------- FEATURE EXTRACTION ----------
X, vectorizer = build_tfidf(texts)
y = labels

# ---------- TRAIN FUNCTION ----------
def train_emotion_model(X, y):
    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=TEST_SIZE,
        random_state=RANDOM_STATE,
        stratify=y
    )

    model = LogisticRegression(max_iter=1000)
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)

    metrics = {
        "accuracy": accuracy_score(y_test, y_pred),
        "report": classification_report(y_test, y_pred, output_dict=True)
    }

    return model, metrics

# ---------- TRAIN ----------
trained_model, metrics = train_emotion_model(X, y)

# ---------- SAVE ARTIFACTS ----------
os.makedirs(ML_DIR, exist_ok=True)

joblib.dump(trained_model, os.path.join(ML_DIR, "emotion_model.pkl"))
joblib.dump(vectorizer, os.path.join(ML_DIR, "tfidf_vectorizer.pkl"))

print("✅ Model and vectorizer saved successfully")
