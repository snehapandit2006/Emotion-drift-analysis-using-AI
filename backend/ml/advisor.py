def generate_advice(dominant_emotion: str, last_message_emotion: str) -> dict:
    """
    Generates advice based on the dominant emotion of the chat and the emotion of the last message.
    """
    
    # Generic strategies based on dominant emotion
    strategies = {
        "anger": {
            "title": "De-escalation Strategy",
            "content": "The conversation seems heated. It's best to take a break and let emotions cool down. Avoid accusatory language ('You always...') and use 'I' statements ('I feel hurt when...'). Validate their feelings even if you disagree with their actions.",
            "tone": "Calm, Patient, Validating"
        },
        "sadness": {
            "title": "Supportive Approach",
            "content": "There is a lot of sadness detected. Focus on showing empathy and understanding. Simple phrases like 'I'm here for you' or 'I understand this is hard' go a long way. Avoid trying to 'fix' the problem immediately; just listening is often enough.",
            "tone": "Empathetic, Gentle, Reassuring"
        },
        "fear": {
            "title": "Reassurance Strategy",
            "content": "Anxiety or fear is present. Try to provide a sense of stability and safety. Ask open-ended questions to understand the root of the fear. Be consistent and reliable in your responses.",
            "tone": "Reassuring, Steady, Protective"
        },
        "happy": {
            "title": "Shared Joy",
            "content": "The vibe is positive! Keep the momentum going by sharing in their happiness. Ask follow-up questions to show you're interested in what makes them happy.",
            "tone": "Enthusiastic, Warm, Engaging"
        },
        "love": {
            "title": "Deepening Connection",
            "content": "There's a lot of affection here. Reciprocate the feelings and express your appreciation. It's a good time to strengthen your bond.",
            "tone": "Affectionate, Appreciative, Open"
        },
        "surprise": {
            "title": "Curiosity Approach",
            "content": "Something unexpected came up. Express curiosity and ask for more details. Avoid jumping to conclusions.",
            "tone": "Curious, Open-minded, Interested"
        },
        "neutral": {
            "title": "Engagement Boost",
            "content": "The conversation is calm but might lack depth. Try introducing a new topic or asking a question about their day to spark more engagement.",
            "tone": "Casual, Friendly, Interested"
        }
    }
    
    # Specific advice for the last message
    last_msg_advice = {
        "anger": "The last message was angry. Do not reply in anger. Wait 10 minutes before responding.",
        "sadness": "They ended on a sad note. A gentle check-in or a comforting message would be appropriate.",
        "fear": "They seem anxious in their last text. Reassure them.",
        "happy": "They ended happily. A thumbs up or a happy sticker is a great way to acknowledge.",
        "love": "A sweet closing. Send a heart or a 'love you' back.",
        "neutral": "A neutral ending. You can reply at your convenience."
    }

    # Default fallback
    base_strategy = strategies.get(dominant_emotion, strategies["neutral"])
    last_tip = last_msg_advice.get(last_message_emotion, "Tailor your reply to their current mood.")

    return {
        "strategy_title": base_strategy["title"],
        "strategy_content": base_strategy["content"],
        "suggested_tone": base_strategy["tone"],
        "reply_tip": last_tip
    }
