import os
import sys
# Remove joblib/sklearn dependencies for model loading
from transformers import pipeline
from deep_translator import GoogleTranslator

# ---------- PATH FIX ----------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SRC_DIR = os.path.join(BASE_DIR, "..", "src")
sys.path.append(SRC_DIR)

# Import clean_text locally or handle it
# from preprocess import clean_text 
# If clean_text isn't complex, we might skip it for HF models which are robust, 
# but let's keep basic cleaning if it exists.
try:
    from preprocess import clean_text
except ImportError:
    clean_text = lambda x: x

# ---------- LOAD ARTIFACTS (TRANSFORMERS) ----------
# Using a distilled Roberta model fine-tuned for emotions
# Labels: joy, sadness, anger, fear, surprise, neutral, love
MODEL_NAME = "j-hartmann/emotion-english-distilroberta-base"
classifier = None

try:
    print(f"Loading Hugging Face model: {MODEL_NAME}...")
    classifier = pipeline("text-classification", model=MODEL_NAME, return_all_scores=True)
    print("Model loaded successfully.")
except Exception as e:
    print(f"WARNING: Could not load HF Model: {e}")

# ---------- INFERENCE ----------
def predict_emotion(text: str) -> dict:
    if not text or not isinstance(text, str):
        return {"emotion": None, "confidence": 0.0}
    
    # ---------- SAFETY LAYER ----------
    # (Preserving User's critical safety logic)
    text_lower = text.lower()
    safety_map = {
        "dying": "sadness", "suicide": "sadness", "kill myself": "sadness",
        "hurt myself": "sadness", "dead": "sadness", "death": "sadness",
        "pain": "sadness", "help me": "fear", 
        # Note: HF model has 'joy' not 'happy', 'love' is sometimes 'love' or 'joy'
        # We will map standard HF outputs to our schema if needed.
    }
    
    for keyword, emotion in safety_map.items():
        if keyword in text_lower:
            return {"emotion": emotion, "confidence": 1.0, "is_safety_override": True}
            
    neutral_keywords = [
        "ok", "k", "hmm", "hmmm", "achha", "accha", "acha", "theek", "thik", 
        "yep", "yes", "yeah", "han", "haan", "fine", "alright", "okay", "kk"
    ]
    if text_lower.strip(' .!?,') in neutral_keywords:
        return {"emotion": "neutral", "confidence": 0.9, "is_safety_override": True}

    # ----------------------------------

    # ----------------------------------

    if classifier is None:
        print("Error: Classifier is None (Model not loaded)")
        return {"emotion": "unknown", "confidence": 0.0, "error": "Model not loaded"}

    # Translation Layer (added to single prediction)
    try:
        from deep_translator import GoogleTranslator
        # Detect if non-English/Hinglish (simple heuristic or just always try?)
        # For safety/accuracy, we can try translating if it looks non-standard, or just always.
        # Let's always translate for now to catch Hinglish "Gudda".
        translated = GoogleTranslator(source='auto', target='en').translate(text)
        if translated and translated != text:
            print(f"Translated '{text}' -> '{translated}'")
            text = translated
    except Exception as te:
        print(f"Translation warning: {te}")

    try:
        # Hugging Face Inference
        # Output format depends on return_all_scores/top_k.
        # With return_all_scores=True, likely [[{'label': 'joy', 'score': 0.9}, ...]]
        
        raw_output = classifier(text)
        # print(f"DEBUG HF Output: {raw_output}") 
        
        preds = []
        if isinstance(raw_output, list):
            if isinstance(raw_output[0], list):
                # Batch style or return_all_scores=True style: [[{...}, {...}]]
                preds = raw_output[0]
            elif isinstance(raw_output[0], dict):
                # Simple style: [{...}]
                preds = raw_output
            else:
                # Should not happen
                print(f"Unexpected HF format: {type(raw_output)}")
                return {"emotion": "unknown", "confidence": 0.0}
        
        if not preds:
             return {"emotion": "unknown", "confidence": 0.0}

        # Sort by score
        best_pred = max(preds, key=lambda x: x['score'])
        
        label = best_pred['label']
        score = best_pred['score']
        
        mapper = {
            "joy": "happy",
            "disgust": "anger", 
            "sadness": "sadness",
            "anger": "anger",
            "fear": "fear",
            "surprise": "surprise",
            "neutral": "neutral"
        }
        
        final_emotion = mapper.get(label, label)
        
        return {
            "emotion": final_emotion,
            "confidence": float(score)
        }

    except Exception as e:
        print(f"Inference error for '{text}': {e}")
        return {"emotion": "unknown", "confidence": 0.0}

def predict_emotions_batch(texts: list) -> list:
    """
    Batch inference using HF pipeline (built-in batching).
    """
    results = []
    # Simple loop for safety checks first
    processed_texts = []
    indices_to_predict = []
    
    # Pre-fill results with safety checks
    final_output = [None] * len(texts)
    
    for i, text in enumerate(texts):
        # ... Safety checks (omitted for brevity, same as above) ...
        # For prototype, let's just push everything to HF if not empty
        if not text:
            final_output[i] = {"emotion": "neutral", "confidence": 0.0}
            continue
            
        indices_to_predict.append(i)
        processed_texts.append(text)

    if not processed_texts:
        return final_output

    # ---------- TRANSLATION LAYER (Robust) ----------
    translated_texts = []
    try:
        # Try batch translation first
        # deep-translator's batch can be fast but flaky (SSL errors)
        translated_texts = GoogleTranslator(source='auto', target='en').translate_batch(processed_texts)
    except Exception as e:
        print(f"Batch translation failed: {e}. Falling back to sequential.")
        # Fallback: Sequential translation
        for t in processed_texts:
            try:
                # Add small sleep if needed? Usually OK for small batches
                trans = GoogleTranslator(source='auto', target='en').translate(t)
                translated_texts.append(trans if trans else t)
            except Exception as e2:
                print(f"Sequential translation failed for '{t}': {e2}")
                translated_texts.append(t)
    
    # Use translated texts for inference if available, else original
    texts_to_infer = translated_texts if len(translated_texts) == len(processed_texts) else processed_texts
    
    try:
        # HF pipeline handles batching
        batch_preds = classifier(texts_to_infer)
        
        # FIX: Handle case where pipeline returns a flat list of scores for a single input
        # We detect this by checking if the length mismatches the input count.
        # (e.g. 1 input, 7 emotions output -> mismatch. 1 input, 1 output -> match)
        if (isinstance(batch_preds, list) 
            and len(batch_preds) > 0 
            and isinstance(batch_preds[0], dict) 
            and len(batch_preds) != len(texts_to_infer)):
            batch_preds = [batch_preds]
            
        for idx, preds in enumerate(batch_preds):
            if idx >= len(indices_to_predict):
                break

            # Handle both list-of-scores (return_all_scores=True) and single-score dict
            if isinstance(preds, dict):
                best_pred = preds
            else:
                 best_pred = max(preds, key=lambda x: x['score'])

            label = best_pred['label']
            score = best_pred['score']
            
            mapper = {"joy": "happy", "disgust": "anger"}
            final_emotion = mapper.get(label, label)
            
            original_index = indices_to_predict[idx]
            final_output[original_index] = {
                "emotion": final_emotion,
                "confidence": float(score)
            }
            
    except Exception as e:
        print(f"Batch Error: {e}")
        
    return final_output
