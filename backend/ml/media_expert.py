import random

# Mapping of Sentia emotions to curated media content
# Using verified Spotify Track IDs and YouTube standard embeds
MOOD_CONTENT_MAP = {
    "joy": {
        "spotify": [
            "https://open.spotify.com/embed/track/3n3Ppam7vgaRvs1cT5S1X0", # Pharrell Williams - Happy
            "https://open.spotify.com/embed/track/1BxfuPKGuaTgP7aM0Bbdwr"  # Taylor Swift - Cruel Summer
        ],
        "youtube": [
            "https://www.youtube.com/embed/Zi8vJ_LwX_M", # Upbeat acoustic 
            "https://www.youtube.com/embed/8pIDisS_63w"  # After-party
        ]
    },
    "sadness": {
        "spotify": [
            "https://open.spotify.com/embed/track/2OznzDz0GTVwTnbD5n2M6W", # Weightless - Marconi Union (Comfort)
            "https://open.spotify.com/embed/track/0tkV29rGk9cQdZf4B1d2a1"  # Soft instrumental
        ],
        "youtube": [
            "https://www.youtube.com/embed/1_v6QO6B8_E", # Rain Sounds
            "https://www.youtube.com/embed/DWcUY7t2W_M"  # Snowman - Lofi Girl
        ]
    },
    "anger": {
        "spotify": [
            "https://open.spotify.com/embed/track/45BBLZKITqCGZexPUQDOOS", # Deep Focus
            "https://open.spotify.com/embed/track/1v7Lg59Zes0K9RzOON1E8G"  # Calming ambient
        ],
        "youtube": [
            "https://www.youtube.com/embed/i73Hbeun4QU", # Heavy Rain
            "https://www.youtube.com/embed/1_v6QO6B8_E"  # Rain Sounds for grounding
        ]
    },
    "fear": {
        "spotify": [
            "https://open.spotify.com/embed/track/5u0w3JITpYebtQmf5gJm0C", # Anti-anxiety ambient
            "https://open.spotify.com/embed/track/3mXJsqkIfwK6E8oE2yLq79"  # Binaural sleep
        ],
        "youtube": [
            "https://www.youtube.com/embed/lTRiuFIWM54", # Relaxing Music
            "https://www.youtube.com/embed/7yO7W8zB6pA"  # Memories - Lofi Girl
        ]
    },
    "surprise": {
        "spotify": [
            "https://open.spotify.com/embed/track/3GkGgA0p5Fms07XmBv3o1w", # Upbeat Indie
            "https://open.spotify.com/embed/track/6UelLqGlmGQ62pI0S95J7X"  # Groovy
        ],
        "youtube": [
            "https://www.youtube.com/embed/6Im668GS1N0", # Believe - Roa
            "https://www.youtube.com/embed/8pIDisS_63w"  # After-party
        ]
    },
    "disgust": {
        "spotify": [
            "https://open.spotify.com/embed/track/4cOdK2wGLETIGyoO4Dk2r3", # Chill lofi
            "https://open.spotify.com/embed/track/15JINEWe2wzB8A9AIBGkIf"  # Easy acoustic
        ],
        "youtube": [
            "https://www.youtube.com/embed/1_v6QO6B8_E", # Rain Sounds
            "https://www.youtube.com/embed/3K1nBe-n1Yg"  # Beats to sleep/chill
        ]
    },
    "neutral": {
        "spotify": [
            "https://open.spotify.com/embed/track/1zWBAF0aF7n3c8B3M2lOfZ", # Lofi hip hop generic
            "https://open.spotify.com/embed/track/5Gz10q2bEY559cIKvJ0ySg"  # Coffee Shop Chill
        ],
        "youtube": [
            "https://www.youtube.com/embed/5yx6BWlEVcU", # Lofi Radio
            "https://www.youtube.com/embed/3K1nBe-n1Yg"  # Beats to chill
        ]
    }
}


def get_recommendations(emotion: str, interests: str = None):
    """
    Returns a dictionary with recommended Spotify and YouTube links.
    Personalizes based on user interests if keywords match.
    """
    base_options = MOOD_CONTENT_MAP.get(emotion, MOOD_CONTENT_MAP["neutral"])
    
    spotify_link = random.choice(base_options["spotify"])
    youtube_link = random.choice(base_options["youtube"])
    
    # Personalization logic (Basic keyword matching)
    if interests:
        interests_lower = interests.lower()
        if "lofi" in interests_lower or "lo-fi" in interests_lower:
             # Force lofi if it's an interest
             youtube_link = "https://www.youtube.com/embed/3K1nBe-n1Yg"
        elif "classical" in interests_lower:
             spotify_link = "https://open.spotify.com/embed/playlist/37i9dQZF1DX8ntisS0DqrY"
             
    return {
        "spotify": spotify_link,
        "youtube": youtube_link,
        "reason": f"Based on your {emotion} mood, we suggested some content to help you balance."
    }
