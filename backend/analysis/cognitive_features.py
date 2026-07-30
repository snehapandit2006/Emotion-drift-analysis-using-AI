import re
import json
from datetime import datetime
from sqlalchemy.orm import Session
import requests

from core.config import settings
from db.models import CognitiveSnapshot, EmotionLog, SentiaMessage

# Keywords and Phrase lists for Feature Extraction
NEG_REP_KEYWORDS = [
    "should have", "wish i", "regret", "constantly thinking", "can't stop thinking",
    "keeps playing in my head", "over and over", "again and again", "cannot forget",
    "still thinking about", "stuck in my head", "always replay"
]

AVOIDANCE_KEYWORDS = [
    "don't know", "whatever", "doesn't matter", "fine i guess", "skip it", "not sure",
    "don't want to talk", "leave it", "change the topic", "not ready", "skip",
    "no comment", "i don't care", "i dont care", "nevermind", "never mind"
]

CATASTROPHIC_KEYWORDS = [
    "ruined", "worst", "never get better", "hopeless", "doomed", "disaster",
    "end of the world", "all over", "nothing will work", "completely failed",
    "terrible", "worst case", "nothing can help", "everything is ruined"
]

SELF_CRITICAL_KEYWORDS = [
    "always my fault", "useless", "stupid", "should be better", "must succeed",
    "failure", "not good enough", "disappointed in myself", "messed up",
    "have to be perfect", "never get it right", "i'm so bad", "im so bad",
    "i failed", "my mistake", "not perfect"
]

SOCIAL_WITHDRAWAL_KEYWORDS = [
    "alone", "isolated", "no one", "avoiding everyone", "staying inside",
    "don't want to see anyone", "disconnected", "don't care about friends",
    "socializing is exhausting", "withdrawing", "stay home", "by myself"
]

COPING_KEYWORDS = [
    "planning", "exercise", "journaling", "breathing", "talking it out",
    "sketching", "walking", "calming down", "trying to relax", "mindfulness",
    "meditation", "healthy boundaries", "therapy", "structured routine"
]

# Cognitive Flexibility keyword indicators
REFRAMING_KEYWORDS = [
    "maybe", "perhaps", "could be", "alternative", "try again", "next time",
    "learn from", "on the other hand", "different perspective", "not all bad",
    "looking at it differently", "at least", "silver lining", "growth", "challenge"
]

RIGID_KEYWORDS = [
    "always my fault", "never", "ruined", "useless", "impossible", "failed",
    "hate", "must", "should", "ought to", "have to", "completely", "perfect or nothing"
]

# Attention Map keyword definitions
ATTENTION_CATEGORIES = {
    "academics": ["study", "exam", "college", "grades", "class", "assignment", "test", "professor", "school", "homework", "degree"],
    "career": ["job", "interview", "promotion", "resume", "salary", "work", "boss", "career", "office", "employ", "corporate", "hired"],
    "health": ["pain", "sleep", "tired", "illness", "body", "doctor", "healthy", "dentist", "surgery", "medical", "stress", "head", "stomach", "physical"],
    "relationships": ["partner", "friend", "breakup", "dating", "argument", "lonely", "girlfriend", "boyfriend", "husband", "wife", "date", "relationship"],
    "identity": ["who i am", "purpose", "future", "meaning", "self-worth", "grow", "path", "goals", "value", "figure out", "lost", "identity"],
    "family": ["parents", "sister", "brother", "mother", "father", "home", "relatives", "mom", "dad", "cousin", "family", "grandpa", "grandma"]
}

def extract_features(texts: list[str]) -> dict:
    """
    Extracts counts of explanatory psychological markers/signals from text.
    """
    combined_text = " ".join(texts).lower()
    
    features = {
        "negative_repetition_count": 0,
        "avoidance_phrases_count": 0,
        "catastrophic_phrases_count": 0,
        "self_critical_phrases_count": 0,
        "social_mentions_count": 0,
        "coping_mentions_count": 0
    }
    
    for kw in NEG_REP_KEYWORDS:
        features["negative_repetition_count"] += combined_text.count(kw)
        
    for kw in AVOIDANCE_KEYWORDS:
        features["avoidance_phrases_count"] += combined_text.count(kw)
        
    for kw in CATASTROPHIC_KEYWORDS:
        features["catastrophic_phrases_count"] += combined_text.count(kw)
        
    for kw in SELF_CRITICAL_KEYWORDS:
        features["self_critical_phrases_count"] += combined_text.count(kw)
        
    for kw in SOCIAL_WITHDRAWAL_KEYWORDS:
        features["social_mentions_count"] += combined_text.count(kw)
        
    for kw in COPING_KEYWORDS:
        features["coping_mentions_count"] += combined_text.count(kw)
        
    return features

def calculate_attention_map(texts: list[str]) -> dict:
    """
    Maps relative attention allocation percentages across the 6 categories.
    Sums to 1.0.
    """
    combined_text = " ".join(texts).lower()
    counts = {cat: 0 for cat in ATTENTION_CATEGORIES}
    
    for cat, keywords in ATTENTION_CATEGORIES.items():
        for kw in keywords:
            counts[cat] += combined_text.count(kw)
            
    total = sum(counts.values())
    if total > 0:
        return {cat: float(count / total) for cat, count in counts.items()}
    else:
        # Uniform distribution if no keywords matched
        return {cat: 1.0 / len(ATTENTION_CATEGORIES) for cat in ATTENTION_CATEGORIES}

def extract_recovery_model(texts: list[str], recent_emotions: list[str]) -> dict:
    """
    Extracts stress triggers, coping helps/hurts, recovery speed, and preferences.
    """
    combined_text = " ".join(texts).lower()
    
    # Trigger mapping
    trigger = "general stress"
    if any(w in combined_text for w in ["future", "uncertain", "not sure what", "happen next", "what if"]):
        trigger = "uncertainty"
    elif any(w in combined_text for w in ["argument", "fight", "screamed", "said to me", "angry with", "conflict"]):
        trigger = "interpersonal conflict"
    elif any(w in combined_text for w in ["fail", "mistake", "screwed up", "messed up", "wrong"]):
        trigger = "performance failure"
    elif any(w in combined_text for w in ["workload", "deadline", "exams", "finals", "assignments", "too much to"]):
        trigger = "task overload"
        
    # Helps extraction
    helps = []
    if "breathing" in combined_text or "meditat" in combined_text: helps.append("mindfulness")
    if "walk" in combined_text or "run" in combined_text or "gym" in combined_text or "exercis" in combined_text: helps.append("physical activity")
    if "sketch" in combined_text or "draw" in combined_text or "paint" in combined_text or "music" in combined_text: helps.append("creative expression")
    if "plan" in combined_text or "schedul" in combined_text or "list" in combined_text: helps.append("structured planning")
    if "talk" in combined_text or "shar" in combined_text or "friend" in combined_text: helps.append("social support")
    if not helps: helps = ["rest", "reflection"]
    
    # Hurts extraction
    hurts = []
    if "isolat" in combined_text or "alone" in combined_text or "avoid" in combined_text: hurts.append("social isolation")
    if "scroll" in combined_text or "phone" in combined_text or "social media" in combined_text: hurts.append("doomscrolling")
    if "think" in combined_text or "replay" in combined_text or "regret" in combined_text: hurts.append("rumination")
    if "sleep" in combined_text or "awake" in combined_text or "night" in combined_text: hurts.append("sleep disruption")
    if not hurts: hurts = ["avoidant coping"]
    
    # Recovery Speed estimation based on transition from high distress
    recovery_speed = "medium"
    coping_count = sum(combined_text.count(kw) for kw in COPING_KEYWORDS)
    if coping_count >= 3:
        recovery_speed = "fast"
    elif coping_count == 0 and any(emo in ["sadness", "fear", "anger"] for emo in recent_emotions[:5]):
        recovery_speed = "slow"
        
    # Support preference based on query structure
    support_pref = "listening"
    if any(w in combined_text for w in ["how", "what should i", "give me", "suggest", "help me plan"]):
        support_pref = "guidance"
        
    # Recovery Effectiveness mapping (Scientific memory)
    recovery_eff = {}
    for h in helps:
        recovery_eff[h] = round(0.65 + 0.05 * min(4, combined_text.count(h)), 2)
    for hu in hurts:
        recovery_eff[hu] = round(0.15 - 0.02 * min(4, combined_text.count(hu)), 2)
    
    # Ensure baseline standards for critical strategies
    for act, score in [("exercise", 0.75), ("mindfulness", 0.82), ("doomscrolling", 0.08), ("social isolation", 0.12)]:
        if act not in recovery_eff:
            recovery_eff[act] = score

    return {
        "stress_trigger": trigger,
        "helps": helps,
        "hurts": hurts,
        "recovery_speed": recovery_speed,
        "support_preference": support_pref,
        "recovery_effectiveness": recovery_eff
    }

_tokenizer = None
_model = None
_pattern_library_embeddings = {}
_pattern_library_phrases = {}

def get_embedding_model():
    global _tokenizer, _model
    if _tokenizer is None or _model is None:
        from transformers import AutoTokenizer, AutoModel
        import os
        os.environ["HF_HUB_DISABLE_SYMLINKS_WARNING"] = "1"
        _tokenizer = AutoTokenizer.from_pretrained('sentence-transformers/all-MiniLM-L6-v2')
        _model = AutoModel.from_pretrained('sentence-transformers/all-MiniLM-L6-v2')
    return _tokenizer, _model

def mean_pooling(model_output, attention_mask):
    import torch
    token_embeddings = model_output[0]
    input_mask_expanded = attention_mask.unsqueeze(-1).expand(token_embeddings.size()).float()
    return torch.sum(token_embeddings * input_mask_expanded, 1) / torch.clamp(input_mask_expanded.sum(1), min=1e-9)

def load_pattern_library_embeddings():
    global _pattern_library_embeddings, _pattern_library_phrases
    if _pattern_library_embeddings:
        return
    import os
    import json
    import torch
    import torch.nn.functional as F
    
    tokenizer, model = get_embedding_model()
    
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    patterns_dir = os.path.join(base_dir, "patterns")
    if not os.path.exists(patterns_dir):
        patterns_dir = "patterns"
        
    for name in ["catastrophizing", "avoidance", "rumination", "perfectionism", "self_criticism"]:
        filepath = os.path.join(patterns_dir, f"{name}.json")
        if os.path.exists(filepath):
            with open(filepath, "r", encoding="utf-8") as f:
                phrases = json.load(f)
        else:
            phrases = []
        _pattern_library_phrases[name] = phrases
        if phrases:
            encoded = tokenizer(phrases, padding=True, truncation=True, return_tensors='pt')
            with torch.no_grad():
                outputs = model(**encoded)
            embeddings = mean_pooling(outputs, encoded['attention_mask'])
            normalized = F.normalize(embeddings, p=2, dim=1)
            _pattern_library_embeddings[name] = normalized
        else:
            _pattern_library_embeddings[name] = None
def adjust_with_lexical_filters(text: str, score: float, pattern: str) -> float:
    """
    Applies clinical NLP discrimination rules to distinguish distortions from healthy reflection.
    """
    text_lower = text.lower()
    
    # 1. Healthy / Reflective discount keywords
    healthy_markers = [
        "study harder", "study much harder", "study more", "prepare better",
        "healthy boundary", "healthy boundaries", "boundaries at work",
        "book a check-up", "book a doctor", "doctor check", "check-up",
        "learn from", "lessons learned", "next time", "timer to remember",
        "proofread my", "proofread the", "catch spelling", "correct mistakes",
        "reflecting to", "reflecting on", "reflect on", "understand my",
        "boundaries and communication", "to prepare", "trying to learn",
        "to improve", "constructive feedback"
    ]
    
    # 2. Extreme / Distorted boosters
    catastrophizing_boosters = ["ruined", "destroyed", "homeless", "broke", "never find", "die", "terminal", "disaster", "catastrophe", "doomed", "always", "never", "forever"]
    perfectionism_boosters = ["flawless", "garbage", "100%", "trash", "perfect", "idiot", "incompetent", "mistake"]
    rumination_boosters = ["replaying", "overthinking", "stuck in a loop", "analyzing every", "loop of thinking"]
    self_criticism_boosters = ["useless", "incompetent", "stupid", "lazy", "disappointment", "hate myself", "pathetic", "stupid"]
    avoidance_boosters = ["ignoring", "skipping", "avoiding", "ignore", "don't want to think"]

    # Check if healthy markers are in the text
    has_healthy = any(marker in text_lower for marker in healthy_markers)
    
    if has_healthy:
        # Heavily discount the distortion score because it contains healthy coping or active problem-solving
        score = score * 0.3
        
    # Check for boosters based on pattern
    has_booster = False
    if pattern == "catastrophizing":
        has_booster = any(w in text_lower for w in catastrophizing_boosters)
    elif pattern == "perfectionism":
        has_booster = any(w in text_lower for w in perfectionism_boosters)
    elif pattern == "rumination":
        has_booster = any(w in text_lower for w in rumination_boosters)
    elif pattern == "self_criticism":
        has_booster = any(w in text_lower for w in self_criticism_boosters)
    elif pattern == "avoidance":
        has_booster = any(w in text_lower for w in avoidance_boosters)
        
    if not has_booster and score > 0.35:
        # If no explicit booster is found, damp the score slightly to prevent false positives from mild semantic overlap
        score = score * 0.75
    elif has_booster:
        # Boost the score if clinical boosters are explicitly present
        score = min(1.0, score * 1.2)
        
    return round(score, 2)

def calculate_semantic_scores(texts: list[str]) -> dict:
    """
    Calculates semantic scores (0.0 to 1.0) using HuggingFace sentence embeddings.
    Applies lexical discrimination filters to distinguish cognitive distortions from healthy reflections.
    """
    if not texts:
        return {p: 0.0 for p in ["catastrophizing", "avoidance", "rumination", "perfectionism", "self_criticism"]}
        
    import torch
    import torch.nn.functional as F
    
    try:
        load_pattern_library_embeddings()
        tokenizer, model = get_embedding_model()
        
        # Tokenize and embed user texts
        encoded = tokenizer(texts, padding=True, truncation=True, return_tensors='pt')
        with torch.no_grad():
            outputs = model(**encoded)
        user_embeddings = mean_pooling(outputs, encoded['attention_mask'])
        user_embeddings = F.normalize(user_embeddings, p=2, dim=1)
        
        results = {}
        combined_text = " ".join(texts)
        for name, lib_embeddings in _pattern_library_embeddings.items():
            if lib_embeddings is None:
                results[name] = 0.0
                continue
                
            # Compute similarity matrix: [num_user_msgs, num_lib_examples]
            sim_matrix = torch.matmul(user_embeddings, lib_embeddings.t())
            
            # For each user message, get top 1 similarity (best match)
            top_k = min(1, sim_matrix.shape[1])
            if top_k > 0:
                top_values, _ = torch.topk(sim_matrix, top_k, dim=1)
                msg_scores = torch.mean(top_values, dim=1)
                raw_score = torch.max(msg_scores).item()
            else:
                raw_score = 0.0
                
            # Scale to 0.0 - 1.0 with baseline 0.3 and max 0.75
            baseline = 0.30
            max_val = 0.75
            scaled = max(0.0, min(1.0, (raw_score - baseline) / (max_val - baseline)))
            
            # Apply discrimination filter
            filtered = adjust_with_lexical_filters(combined_text, scaled, name)
            results[name] = filtered
            
        return results
    except Exception as e:
        print(f"Error calculating semantic scores: {e}")
        return {p: 0.0 for p in ["catastrophizing", "avoidance", "rumination", "perfectionism", "self_criticism"]}

def get_confidence(signal_weight: float, text_weight: float, signal_count: int, word_count: int) -> float:
    """Computes a confidence score based on keyword density and word volume."""
    conf = (signal_count / 3.0) * signal_weight + (word_count / 150.0) * text_weight
    return round(max(0.1, min(0.95, conf)), 2)

def generate_evidence(texts: list[str], pattern: str, score: float, features: dict) -> list[str]:
    """
    Extracts specific linguistic and semantic evidence to construct audit trails for therapists.
    """
    evidence = []
    combined_text = " ".join(texts).lower()
    
    # 1. Semantic similarity evidence
    if score >= 0.40:
        evidence.append(f"Strong semantic match to clinical anchors (similarity: {int(score * 100)}%)")
        
    # 2. Check for matching boosters or key phrases
    if pattern == "catastrophizing":
        boosters = ["ruined", "destroyed", "homeless", "broke", "never find", "die", "terminal", "disaster", "catastrophe", "doomed", "always", "never"]
        matched_boosters = [w for w in boosters if w in combined_text]
        if matched_boosters:
            evidence.append(f"Catastrophic absolute phrasing: {', '.join(f'\"{w}\"' for w in matched_boosters)}")
        if features.get("catastrophic_phrases_count", 0) > 0:
            evidence.append(f"Linguistic indicators of catastrophe detected ({features['catastrophic_phrases_count']} matches)")
            
    elif pattern == "perfectionism":
        boosters = ["flawless", "garbage", "100%", "trash", "perfect", "idiot", "incompetent", "mistake"]
        matched_boosters = [w for w in boosters if w in combined_text]
        if matched_boosters:
            evidence.append(f"Rigid perfectionist language: {', '.join(f'\"{w}\"' for w in matched_boosters)}")
        if features.get("self_critical_phrases_count", 0) > 0:
            evidence.append("Self-directed high standard demands detected")
            
    elif pattern == "rumination":
        boosters = ["replaying", "overthinking", "stuck in a loop", "analyzing every", "loop of thinking"]
        matched_boosters = [w for w in boosters if w in combined_text]
        if matched_boosters:
            evidence.append(f"Mental loop patterns: {', '.join(f'\"{w}\"' for w in matched_boosters)}")
        if features.get("negative_repetition_count", 0) > 0:
            evidence.append(f"High negative concept repetition rate ({features['negative_repetition_count']} instances)")
            
    elif pattern == "self_criticism":
        boosters = ["useless", "incompetent", "stupid", "lazy", "disappointment", "hate myself", "pathetic"]
        matched_boosters = [w for w in boosters if w in combined_text]
        if matched_boosters:
            evidence.append(f"Self-directed criticism labels: {', '.join(f'\"{w}\"' for w in matched_boosters)}")
        if features.get("self_critical_phrases_count", 0) > 0:
            evidence.append(f"Self-deprecating cognitive patterns ({features['self_critical_phrases_count']} instances)")
            
    elif pattern == "avoidance":
        boosters = ["ignoring", "skipping", "avoiding", "ignore", "don't want to think"]
        matched_boosters = [w for w in boosters if w in combined_text]
        if matched_boosters:
            evidence.append(f"Behavioral withdrawal markers: {', '.join(f'\"{w}\"' for w in matched_boosters)}")
        if features.get("avoidance_phrases_count", 0) > 0:
            evidence.append(f"Linguistic markers of emotional escape/avoidance ({features['avoidance_phrases_count']} matches)")

    elif pattern == "burnout":
        if features.get("self_critical_phrases_count", 0) > 0:
            evidence.append("Elevated fatigue correlates with self-criticism patterns")
        if features.get("coping_mentions_count", 0) == 0:
            evidence.append("Critical deficit in coping strategy mentions")

    elif pattern == "motivation":
        if features.get("coping_mentions_count", 0) > 0:
            evidence.append(f"Active coping mentions detected ({features['coping_mentions_count']} matches)")

    elif pattern == "stress_adaptation":
        if features.get("coping_mentions_count", 0) > 0:
            evidence.append(f"Healthy adaptive coping behaviors present")

    elif pattern == "cognitive_flexibility":
        reframing_count = sum(combined_text.count(kw) for kw in REFRAMING_KEYWORDS)
        if reframing_count > 0:
            evidence.append(f"Cognitive reframing markers detected ({reframing_count} matches)")
            
    if not evidence and score > 0.05:
        evidence.append("Mild semantic correlation to pattern library")
        
    return evidence

def calculate_cognitive_scores(features: dict, texts: list[str], recent_emotions: list[str]) -> dict:
    """
    Computes explainable, deterministic Trait and State scores + confidence markers + cognitive flexibility.
    """
    m_count = max(1, len(texts))
    combined_text = " ".join(texts).lower()
    word_count = sum(len(t.split()) for t in texts)
    
    # Calculate Semantic Similarity scores via local transformers embedding engine
    semantic_scores = calculate_semantic_scores(texts)
    
    # Normalize count metrics relative to message size (bounded to [0, 1])
    neg_rep_rate = min(1.0, features["negative_repetition_count"] / (m_count * 2.0))
    avoidance_rate = min(1.0, features["avoidance_phrases_count"] / (m_count * 1.5))
    catastrophe_rate = min(1.0, features["catastrophic_phrases_count"] / (m_count * 1.5))
    self_critical_rate = min(1.0, features["self_critical_phrases_count"] / (m_count * 1.5))
    social_withdrawal_rate = min(1.0, features["social_mentions_count"] / (m_count * 1.5))
    coping_rate = min(1.0, features["coping_mentions_count"] / (m_count * 1.5))
    
    # Emotion context factors
    sadness_freq = recent_emotions.count("sadness") / max(1, len(recent_emotions))
    anger_freq = recent_emotions.count("anger") / max(1, len(recent_emotions))
    fear_freq = recent_emotions.count("fear") / max(1, len(recent_emotions))
    
    # --- 1. TRAITS (Slow-changing, tendency metrics) ---
    # Perfectionism combines perfectionism semantic similarity with self-critical rate
    perfectionism = 0.7 * semantic_scores["perfectionism"] + 0.3 * self_critical_rate
    perf_conf = get_confidence(0.6, 0.4, features["self_critical_phrases_count"] + int(semantic_scores["perfectionism"] > 0.4), word_count)
    
    # Avoidance combines avoidance semantic similarity with social withdrawal rate
    avoidance_trait = 0.6 * semantic_scores["avoidance"] + 0.4 * social_withdrawal_rate
    avoid_conf = get_confidence(0.6, 0.4, features["avoidance_phrases_count"] + features["social_mentions_count"] + int(semantic_scores["avoidance"] > 0.4), word_count)
    
    # Rumination combines rumination semantic similarity with catastrophizing semantic similarity and sadness
    rumination_tendency = 0.4 * semantic_scores["rumination"] + 0.3 * sadness_freq + 0.3 * semantic_scores["catastrophizing"]
    rumin_conf = get_confidence(0.5, 0.5, features["negative_repetition_count"] + features["catastrophic_phrases_count"] + int(semantic_scores["rumination"] > 0.4), word_count)
    
    # --- 2. STATES (Fast-changing, current markers) ---
    # Burnout state is driven by anger, sadness, high self-criticism similarity, and low coping
    burnout_state = min(1.0, 0.3 * anger_freq + 0.3 * sadness_freq + 0.2 * (1.0 - coping_rate) + 0.2 * semantic_scores["self_criticism"])
    burnout_conf = get_confidence(0.5, 0.5, features["self_critical_phrases_count"] + int(sadness_freq > 0) + int(semantic_scores["self_criticism"] > 0.4), word_count)
    
    # Motivation level is supported by coping and low sadness/avoidance
    motivation_level = 0.4 * coping_rate + 0.4 * (1.0 - sadness_freq) + 0.2 * (1.0 - semantic_scores["avoidance"])
    motivation_conf = get_confidence(0.6, 0.4, features["coping_mentions_count"], word_count)
    
    # Stress adaptation is driven by coping and low catastrophizing/avoidance
    stress_adaptation = 0.5 * coping_rate + 0.3 * (1.0 - semantic_scores["catastrophizing"]) + 0.2 * (1.0 - semantic_scores["avoidance"])
    stress_adaptation_conf = get_confidence(0.6, 0.4, features["coping_mentions_count"] + features["catastrophic_phrases_count"], word_count)
    
    # --- 3. COGNITIVE FLEXIBILITY ---
    reframing_count = sum(combined_text.count(kw) for kw in REFRAMING_KEYWORDS)
    rigid_count = sum(combined_text.count(kw) for kw in RIGID_KEYWORDS)
    
    flexibility = 0.5 + 0.1 * reframing_count - 0.1 * rigid_count
    flexibility = round(max(0.1, min(0.9, flexibility)), 2)
    flexibility_conf = get_confidence(0.6, 0.4, reframing_count + rigid_count, word_count)

    # Compute clean source breakdown components (clamped between 0.0 and 1.0)
    perf_final = round(perfectionism, 2)
    perf_kw = round(max(0.0, min(1.0, 0.3 * self_critical_rate)), 2)
    perf_sem = round(max(0.0, min(1.0, perf_final - perf_kw)), 2)

    avoid_final = round(avoidance_trait, 2)
    avoid_kw = round(max(0.0, min(1.0, 0.4 * social_withdrawal_rate)), 2)
    avoid_sem = round(max(0.0, min(1.0, avoid_final - avoid_kw)), 2)

    rumin_final = round(rumination_tendency, 2)
    rumin_kw = round(max(0.0, min(1.0, 0.3 * sadness_freq)), 2)
    rumin_sem = round(max(0.0, min(1.0, rumin_final - rumin_kw)), 2)

    burn_final = round(burnout_state, 2)
    burn_kw = round(max(0.0, min(1.0, 0.3 * anger_freq + 0.3 * sadness_freq + 0.2 * (1.0 - coping_rate))), 2)
    burn_sem = round(max(0.0, min(1.0, burn_final - burn_kw)), 2)

    mot_final = round(motivation_level, 2)
    mot_kw = round(max(0.0, min(1.0, 0.4 * coping_rate + 0.4 * (1.0 - sadness_freq))), 2)
    mot_sem = round(max(0.0, min(1.0, mot_final - mot_kw)), 2)

    stress_final = round(stress_adaptation, 2)
    stress_kw = round(max(0.0, min(1.0, 0.5 * coping_rate)), 2)
    stress_sem = round(max(0.0, min(1.0, stress_final - stress_kw)), 2)

    signal_source_breakdown = {
        "perfectionism": {
            "score": perf_final,
            "keyword": perf_kw,
            "semantic": perf_sem,
            "evidence": generate_evidence(texts, "perfectionism", perf_final, features)
        },
        "avoidance": {
            "score": avoid_final,
            "keyword": avoid_kw,
            "semantic": avoid_sem,
            "evidence": generate_evidence(texts, "avoidance", avoid_final, features)
        },
        "rumination": {
            "score": rumin_final,
            "keyword": rumin_kw,
            "semantic": rumin_sem,
            "evidence": generate_evidence(texts, "rumination", rumin_final, features)
        },
        "burnout": {
            "score": burn_final,
            "keyword": burn_kw,
            "semantic": burn_sem,
            "evidence": generate_evidence(texts, "burnout", burn_final, features)
        },
        "motivation": {
            "score": mot_final,
            "keyword": mot_kw,
            "semantic": mot_sem,
            "evidence": generate_evidence(texts, "motivation", mot_final, features)
        },
        "stress_adaptation": {
            "score": stress_final,
            "keyword": stress_kw,
            "semantic": stress_sem,
            "evidence": generate_evidence(texts, "stress_adaptation", stress_final, features)
        },
        "cognitive_flexibility": {
            "score": flexibility,
            "keyword": flexibility,
            "semantic": 0.0,
            "evidence": generate_evidence(texts, "cognitive_flexibility", flexibility, features)
        }
    }

    return {
        "perfectionism": perf_final,
        "perfectionism_confidence": perf_conf,
        "avoidance_trait": avoid_final,
        "avoidance_confidence": avoid_conf,
        "rumination_tendency": rumin_final,
        "rumination_confidence": rumin_conf,
        "burnout_state": burn_final,
        "burnout_confidence": burnout_conf,
        "motivation_level": mot_final,
        "motivation_confidence": motivation_conf,
        "stress_adaptation": stress_final,
        "stress_adaptation_confidence": stress_adaptation_conf,
        "cognitive_flexibility": flexibility,
        "cognitive_flexibility_confidence": flexibility_conf,
        "signal_source_breakdown": signal_source_breakdown
    }

def generate_cognitive_narrative(scores: dict, features: dict, recovery: dict) -> str:
    """
    LLM Narrative Generator: Uses the calculated scores to compose a clinical narrative.
    The LLM does NOT calculate the scores. It merely acts as a summarizer.
    """
    if not settings.LLM_API_KEY:
        return (
            f"Cognitive analysis detects high focus on {recovery.get('stress_trigger')}. "
            f"Rumination tendency is scored at {scores.get('rumination_tendency')} (conf: {scores.get('rumination_confidence')}), with a stress adaptation score of {scores.get('stress_adaptation')}."
        )
        
    try:
        url = "https://api.sarvam.ai/v1/chat/completions"
        headers = {
            "api-subscription-key": settings.LLM_API_KEY,
            "Content-Type": "application/json"
        }
        
        prompt = (
            "You are a clinical psychologist analyzing a patient's cognitive scores.\n"
            "Here are the calculated scores (0.0 to 1.0) and extracted metrics:\n\n"
            f"TRAITS:\n"
            f"- Rumination Tendency: {scores['rumination_tendency']} (confidence: {scores['rumination_confidence']})\n"
            f"- Avoidance Trait: {scores['avoidance_trait']} (confidence: {scores['avoidance_confidence']})\n"
            f"- Perfectionism: {scores['perfectionism']} (confidence: {scores['perfectionism_confidence']})\n\n"
            f"STATES:\n"
            f"- Burnout State: {scores['burnout_state']} (confidence: {scores['burnout_confidence']})\n"
            f"- Motivation Level: {scores['motivation_level']} (confidence: {scores['motivation_confidence']})\n"
            f"- Stress Adaptation: {scores['stress_adaptation']} (confidence: {scores['stress_adaptation_confidence']})\n"
            f"- Cognitive Flexibility: {scores['cognitive_flexibility']} (confidence: {scores['cognitive_flexibility_confidence']})\n\n"
            f"RECOVERY MODEL:\n"
            f"- Stress Trigger: {recovery['stress_trigger']}\n"
            f"- Coping Helps: {', '.join(recovery['helps'])}\n"
            f"- Coping Hurts: {', '.join(recovery['hurts'])}\n"
            f"- Support Preference: {recovery['support_preference']}\n\n"
            f"AUDIT TRAIL / SIGNAL COUNTS:\n"
            f"- Catastrophic Phrases: {features['catastrophic_phrases_count']}\n"
            f"- Negative Repetition Phrases: {features['negative_repetition_count']}\n"
            f"- Self Critical Phrases: {features['self_critical_phrases_count']}\n\n"
            "STRICT RULES:\n"
            "1. Output a warm, professional, clinical summary in exactly 2-3 sentences.\n"
            "2. Explain what these patterns mean for their daily life, referencing their primary stress trigger.\n"
            "3. DO NOT output any markdown, JSON, or thought blocks. Provide only pure text.\n"
            "4. NEVER mention that these scores were generated by an algorithm or rule-set. Speak directly to their psychological profile."
        )
        
        payload = {
            "model": settings.LLM_MODEL,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.5,
            "max_tokens": 150
        }
        
        res = requests.post(url, headers=headers, json=payload, timeout=10)
        if res.status_code == 200:
            result = res.json()
            narrative = result["choices"][0]["message"]["content"].strip()
            # Clean think blocks if any
            if "<think>" in narrative:
                narrative = re.sub(r"<think>.*?</think>", "", narrative, flags=re.DOTALL).strip()
            return narrative
    except Exception as e:
        print(f"Error generating narrative: {e}")
        
    return f"Your primary stress trigger is currently {recovery['stress_trigger']}. We observed some tendency towards rumination and perfectionism, while you adapt to stressors using {', '.join(recovery['helps'])}."

def run_pattern_analysis(user_id: int, db: Session) -> CognitiveSnapshot:
    """
    Main pipeline to execute Feature Extraction + Scoring Engine + Narrative.
    Saves and returns the CognitiveSnapshot.
    """
    # 1. Fetch user messages from recent history (last 15 messages)
    recent_msgs = (
        db.query(SentiaMessage)
        .join(SentiaMessage.conversation)
        .filter(SentiaMessage.role == "user", SentiaMessage.conversation.has(user_id=user_id))
        .order_by(SentiaMessage.timestamp.desc())
        .limit(15)
        .all()
    )
    texts = [m.content for m in reversed(recent_msgs)]
    
    messages_analyzed = len(recent_msgs) if recent_msgs else 1
    days_covered = 1
    if recent_msgs and len(recent_msgs) > 1:
        newest_time = recent_msgs[0].timestamp
        oldest_time = recent_msgs[-1].timestamp
        delta = newest_time - oldest_time
        days_covered = max(1, delta.days)

    if not texts:
        # Fallback to general welcome if no history exists yet
        texts = ["I feel fine, but sometimes I get overwhelmed by work and uncertainty."]
        
    # 2. Fetch recent emotion logs
    recent_logs = (
        db.query(EmotionLog)
        .filter(EmotionLog.user_id == user_id)
        .order_by(EmotionLog.created_at.desc())
        .limit(15)
        .all()
    )
    emotions = [l.emotion for l in recent_logs] if recent_logs else ["neutral"]
    
    # 3. Extract Features
    features = extract_features(texts)
    attention = calculate_attention_map(texts)
    recovery = extract_recovery_model(texts, emotions)
    scores = calculate_cognitive_scores(features, texts, emotions)
    
    # 4. Generate Narrative
    notes = generate_cognitive_narrative(scores, features, recovery)
    
    # 5. Build and Save CognitiveSnapshot
    profile = CognitiveSnapshot(
        user_id=user_id,
        messages_analyzed=messages_analyzed,
        days_covered=days_covered,
        
        perfectionism=scores["perfectionism"],
        perfectionism_confidence=scores["perfectionism_confidence"],
        
        avoidance_trait=scores["avoidance_trait"],
        avoidance_confidence=scores["avoidance_confidence"],
        
        rumination_tendency=scores["rumination_tendency"],
        rumination_confidence=scores["rumination_confidence"],
        
        burnout_state=scores["burnout_state"],
        burnout_confidence=scores["burnout_confidence"],
        
        motivation_level=scores["motivation_level"],
        motivation_confidence=scores["motivation_confidence"],
        
        stress_adaptation=scores["stress_adaptation"],
        stress_adaptation_confidence=scores["stress_adaptation_confidence"],

        cognitive_flexibility=scores["cognitive_flexibility"],
        cognitive_flexibility_confidence=scores["cognitive_flexibility_confidence"],
        
        attention_academics=attention["academics"],
        attention_career=attention["career"],
        attention_health=attention["health"],
        attention_relationships=attention["relationships"],
        attention_identity=attention["identity"],
        attention_family=attention["family"],
        
        stress_trigger=recovery["stress_trigger"],
        helps=json.dumps(recovery["helps"]),
        hurts=json.dumps(recovery["hurts"]),
        recovery_effectiveness=json.dumps(recovery["recovery_effectiveness"]),
        recovery_speed=recovery["recovery_speed"],
        support_preference=recovery["support_preference"],
        
        negative_repetition_count=features["negative_repetition_count"],
        avoidance_phrases_count=features["avoidance_phrases_count"],
        catastrophic_phrases_count=features["catastrophic_phrases_count"],
        self_critical_phrases_count=features["self_critical_phrases_count"],
        social_mentions_count=features["social_mentions_count"],
        coping_mentions_count=features["coping_mentions_count"],
        
        signal_source_breakdown=json.dumps(scores["signal_source_breakdown"]),
        
        notes=notes,
        created_at=datetime.utcnow()
    )
    
    db.add(profile)
    db.commit()
    db.refresh(profile)
    
    return profile
