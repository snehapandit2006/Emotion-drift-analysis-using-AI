import cv2
import torch
import torch.nn as nn
from torchvision import transforms, models
import numpy as np
import base64
import os
import json

class FaceEmotionAnalyzer:
    _model = None
    _classes = None
    _device = None
    _transform = None

    @classmethod
    def _load_model(cls):
        if cls._model is not None:
            return

        cls._device = torch.device("cuda:0" if torch.cuda.is_available() else "cpu")
        
        # Load classes
        classes_path = os.path.join(os.path.dirname(__file__), "..", "ml", "face_classes.json")
        if os.path.exists(classes_path):
            with open(classes_path, 'r') as f:
                cls._classes = json.load(f)
        else:
            # Fallback default classes if not trained yet
            cls._classes = ['angry', 'disgust', 'fear', 'happy', 'neutral', 'sad', 'surprise']

        # Load Model
        model_path = os.path.join(os.path.dirname(__file__), "..", "ml", "face_model.pth")
        
        # Initialize Architecture (Must match training script)
        cls._model = models.resnet18(pretrained=False) # No need to download pretrained weights if we load full state, but we need structure
        num_ftrs = cls._model.fc.in_features
        cls._model.fc = nn.Linear(num_ftrs, len(cls._classes))
        
        if os.path.exists(model_path):
            try:
                cls._model.load_state_dict(torch.load(model_path, map_location=cls._device))
                print(f"Loaded custom face model from {model_path}")
            except Exception as e:
                print(f"Failed to load custom model: {e}")
        else:
            print("Custom face model not found. Predictions will be random/untrained.")

        cls._model.to(cls._device)
        cls._model.eval()

        # Transform (Must match training)
        cls._transform = transforms.Compose([
            transforms.ToPILImage(),
            transforms.Resize((48, 48)),
            transforms.Grayscale(num_output_channels=3),
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
        ])

    @staticmethod
    def analyze_face(base64_image: str):
        FaceEmotionAnalyzer._load_model()
        
        try:
            # 1. Decode
            if "," in base64_image:
                base64_image = base64_image.split(",")[1]
            image_bytes = base64.b64decode(base64_image)
            nparr = np.frombuffer(image_bytes, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

            if img is None:
                return {"error": "Failed to decode image"}

            # 2. Detect Face (using OpenCV Haar Cascade as DeepFace is gone)
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
            faces = face_cascade.detectMultiScale(gray, 1.1, 4)

            if len(faces) == 0:
                return {"error": "No face detected"}

            # Take largest face
            (x, y, w, h) = max(faces, key=lambda f: f[2] * f[3])
            face_img = img[y:y+h, x:x+w]

            # 3. Predict
            # Convert BGR to RGB
            face_rgb = cv2.cvtColor(face_img, cv2.COLOR_BGR2RGB)
            
            # Preprocess
            input_tensor = FaceEmotionAnalyzer._transform(face_rgb).unsqueeze(0).to(FaceEmotionAnalyzer._device)

            with torch.no_grad():
                outputs = FaceEmotionAnalyzer._model(input_tensor)
                probs = torch.nn.functional.softmax(outputs, dim=1)
                conf, pred_idx = torch.max(probs, 1)

            emotion = FaceEmotionAnalyzer._classes[pred_idx.item()]
            confidence = conf.item()

            return {
                "emotion": emotion,
                "confidence": confidence
            }

        except Exception as e:
            print(f"Inference Error: {e}")
            return {"error": str(e)}
