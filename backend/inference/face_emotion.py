import base64
import io

class FaceEmotionAnalyzer:
    _pipeline = None
    _model_name = "dima806/facial_emotions_image_detection"

    @classmethod
    def _load_model(cls):
        if cls._pipeline is not None:
            return

        import os
        # Check for locally trained ViT model first
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        local_model_path = os.path.join(base_dir, "ml", "face_model_vit")
        
        target_model = cls._model_name
        if os.path.exists(local_model_path):
            print(f"Found local ViT model at {local_model_path}")
            target_model = local_model_path
        else:
            print(f"Local model not found. Using HF Hub model: {cls._model_name}")

        print(f"Loading Face Emotion Model: {target_model}...")
        try:
            from transformers import pipeline
            # Initialize the pipeline for image classification
            # Transformers pipeline handles resizing automatically based on model config
            cls._pipeline = pipeline("image-classification", model=target_model)
            print("Face Emotion Model loaded successfully.")
        except Exception as e:
            print(f"Failed to load Face Emotion Model ({target_model}): {e}")
            cls._pipeline = None

    @staticmethod
    def analyze_face(base64_image: str):
        FaceEmotionAnalyzer._load_model()
        
        if FaceEmotionAnalyzer._pipeline is None:
             return {"error": "Model not loaded"}

        try:
            # 1. Decode
            if "," in base64_image:
                base64_image = base64_image.split(",")[1]
            image_bytes = base64.b64decode(base64_image)
            
            # Convert to PIL Image for transformers
            from PIL import Image
            image = Image.open(io.BytesIO(image_bytes)).convert("RGB")

            # 2. Predict using Pipeline
            # The pipeline handles preprocessing
            results = FaceEmotionAnalyzer._pipeline(image)
            
            # results is a list of dicts: [{'label': 'happy', 'score': 0.99}, ...]
            if not results:
                return {"emotion": "neutral", "confidence": 0.0}

            # Get top prediction
            top_result = results[0] # Pipeline sorts by score by default
            
            raw_emotion = top_result['label']
            confidence = top_result['score']

            # 3. Normalize labels
            # Model specific labels need mapping to our schema
            # dima806/facial_emotions_image_detection labels: ['sad', 'disgust', 'angry', 'neutral', 'fear', 'surprise', 'happy']
            normalization_map = {
                "angry": "anger",
                "disgust": "anger", 
                "sad": "sadness",
                "sadness": "sadness", # Just in case
                "happy": "happy",
                "fear": "fear",
                "surprise": "surprise",
                "neutral": "neutral"
            }
            
            # Handle potential case variations or unexpected labels
            emotion_key = raw_emotion.lower()
            emotion = normalization_map.get(emotion_key, "neutral")

            return {
                "emotion": emotion,
                "confidence": float(confidence)
            }

        except Exception as e:
            print(f"Inference Error: {e}")
            return {"error": str(e)}
