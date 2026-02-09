import sys
import os
import re
import nltk
from nltk.corpus import stopwords
import emoji

# Mock the parts of preprocess.py I suspect
nltk.download('stopwords', quiet=True)
STOP_WORDS = set(stopwords.words('english'))

print(f"'loves' in STOP_WORDS: {'loves' in STOP_WORDS}")
print(f"'love' in STOP_WORDS: {'love' in STOP_WORDS}")

def clean_text_debug(text):
    text = emoji.demojize(text, delimiters=(" ", " ")) 
    text = text.lower()
    text = re.sub(r'[^a-z\s]', ' ', text)
    tokens = text.split()
    print(f"Tokens before stop removal: {tokens}")
    tokens = [t for t in tokens if t not in STOP_WORDS]
    return " ".join(tokens)

print(f"Result: '{clean_text_debug('he said he loves me')}'")
