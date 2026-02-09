import sys
import os

# Allow importing from backend
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from backend.ml.inference import predict_emotion

text = "i feel like dying"
result = predict_emotion(text)
print(f"Input: '{text}'")
print(f"Prediction: {result}")
