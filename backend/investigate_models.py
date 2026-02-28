import sys
import os

# Add parent directory to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

try:
    from ml.inference import predict_emotion, get_bot_response, chatbot, classifier
    print("Models status:")
    print(f"Classifier: {'Loaded' if classifier else 'Not Loaded'}")
    print(f"Chatbot: {'Loaded' if chatbot else 'Not Loaded'}")
    
    test_text = "I am feeling a bit low today."
    print(f"\nTesting Emotion Prediction for: '{test_text}'")
    emotion = predict_emotion(test_text)
    print(f"Result: {emotion}")
    
    print(f"\nTesting Bot Response for: '{test_text}'")
    response = get_bot_response(test_text)
    print(f"Result: {response}")

except Exception as e:
    print(f"ERROR: {e}")
