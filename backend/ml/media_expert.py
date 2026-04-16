import random

# Mapping of Sentia emotions to curated media content
# Using verified Spotify Track IDs and YouTube standard embeds
MOOD_CONTENT_MAP = {
    "joy": {
        "spotify": [
            "https://open.spotify.com/embed/playlist/37i9dQZF1DXdPec7aLTmlC",  # Happy Hits
            "https://open.spotify.com/embed/playlist/37i9dQZF1DX3rxVfibe1L0",  # Mood Booster
        ],
        "youtube": [
            "https://www.youtube.com/embed/Zi8vJ_LwX_M",
            "https://www.youtube.com/embed/8pIDisS_63w"
        ]
    },
    "sadness": {
        "spotify": [
            "https://open.spotify.com/embed/playlist/37i9dQZF1DX7qK8ma5wgG1",  # Sad Songs
            "https://open.spotify.com/embed/playlist/37i9dQZF1DWVFeEut75IAL",  # Life is Beautiful
        ],
        "youtube": [
            "https://www.youtube.com/embed/1_v6QO6B8_E",
            "https://www.youtube.com/embed/DWcUY7t2W_M"
        ]
    },
    "anger": {
        "spotify": [
            "https://open.spotify.com/embed/playlist/37i9dQZF1DWYcDQ1hSjOpY",  # Deep Focus
            "https://open.spotify.com/embed/playlist/37i9dQZF1DX4sWSpwq3LiO",  # Peaceful Piano
        ],
        "youtube": [
            "https://www.youtube.com/embed/i73Hbeun4QU",
            "https://www.youtube.com/embed/1_v6QO6B8_E"
        ]
    },
    "fear": {
        "spotify": [
            "https://open.spotify.com/embed/playlist/37i9dQZF1DX4sWSpwq3LiO",  # Peaceful Piano
            "https://open.spotify.com/embed/playlist/37i9dQZF1DWZqd5JICZI0u",  # Chill Hits
        ],
        "youtube": [
            "https://www.youtube.com/embed/lTRiuFIWM54",
            "https://www.youtube.com/embed/7yO7W8zB6pA"
        ]
    },
    "surprise": {
        "spotify": [
            "https://open.spotify.com/embed/playlist/37i9dQZF1DX2sUQwD7tbmL",  # Feel Good Friday
            "https://open.spotify.com/embed/playlist/37i9dQZF1DXdPec7aLTmlC",  # Happy Hits
        ],
        "youtube": [
            "https://www.youtube.com/embed/6Im668GS1N0",
            "https://www.youtube.com/embed/8pIDisS_63w"
        ]
    },
    "disgust": {
        "spotify": [
            "https://open.spotify.com/embed/playlist/37i9dQZF1DWZqd5JICZI0u",  # Chill Hits
            "https://open.spotify.com/embed/playlist/37i9dQZF1DX4sWSpwq3LiO",  # Peaceful Piano
        ],
        "youtube": [
            "https://www.youtube.com/embed/1_v6QO6B8_E",
            "https://www.youtube.com/embed/3K1nBe-n1Yg"
        ]
    },
    "neutral": {
        "spotify": [
            "https://open.spotify.com/embed/playlist/37i9dQZF1DWZqd5JICZI0u",  # Chill Hits
            "https://open.spotify.com/embed/playlist/37i9dQZF1DX4E3UNjJfo4z",  # Lofi Cafe
        ],
        "youtube": [
            "https://www.youtube.com/embed/5yx6BWlEVcU",
            "https://www.youtube.com/embed/3K1nBe-n1Yg"
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
             spotify_link = "https://open.spotify.com/embed/playlist/37i9dQZF1DX8ntisS0DqrY"  # Classical Essentials
             
    return {
        "spotify": spotify_link,
        "youtube": youtube_link,
        "reason": f"Based on your {emotion} mood, we suggested some content to help you balance."
    }
