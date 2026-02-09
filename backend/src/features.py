from sklearn.feature_extraction.text import TfidfVectorizer
from config import TFIDF_MAX_FEATURES, TFIDF_NGRAM_RANGE


def build_tfidf(texts):
    vectorizer = TfidfVectorizer(
        max_features=TFIDF_MAX_FEATURES,
        ngram_range=TFIDF_NGRAM_RANGE
    )
    X = vectorizer.fit_transform(texts)
    return X, vectorizer
