import sys
import os
sys.path.append(os.path.join(os.getcwd(), 'backend'))
from ml.inference import predict_emotion, predict_emotions_batch

print("Testing Single Prediction...")
try:
    res = predict_emotion("I am happy")
    print(f"Result for 'I am happy': {res}")
except Exception as e:
    print(f"Error in single: {e}")

print("\nTesting Batch Prediction...")
try:
    res_batch = predict_emotions_batch(["I am sad", "I am angry"])
    print(f"Result for batch: {res_batch}")
except Exception as e:
    print(f"Error in batch: {e}")
