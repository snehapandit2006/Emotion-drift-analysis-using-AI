import re
import nltk
from nltk.corpus import stopwords
import emoji

nltk.download('stopwords', quiet=True)
STOP_WORDS = set(stopwords.words('english'))

def clean_text(text: str) -> str:
    # 1. Demojize: Convert emojis to text (e.g. 😂 -> :face_with_tears_of_joy: -> face with tears of joy)
    text = emoji.demojize(text, delimiters=(" ", " ")) 
    
    text = text.lower()
    
    # 2. Remove special chars but keep spaces (now that emojis are words)
    # The previous regex [^a-z\s] will remove the underscores from emoji names, which is good.
    # e.g. "face_with_tears_of_joy" -> "face with tears of joy"
    text = re.sub(r'[^a-z\s]', ' ', text)
    
    tokens = text.split()
    tokens = [t for t in tokens if t not in STOP_WORDS]
    return " ".join(tokens)
