from typing import Dict, List, Optional
import time
import numpy as np

class DialogueManager:
    """
    Advanced state management with Vector Volatility and Semantic Probe Memory.
    """
    def __init__(self):
        self.sessions: Dict[int, Dict] = {}

    def get_state(self, user_id: int) -> Dict:
        if user_id not in self.sessions:
            self.sessions[user_id] = {
                "last_emotion": "neutral",
                "emotion_history": [],
                "emotion_vectors": [], # List of full normalized arrays
                "last_intent": "greeting",
                "last_probes": [], # List of {type, text}
                "turn_count": 0,
                "volatility": 0.0,
                "incongruence": False,
                "domain": "general_emotional"
            }
        return self.sessions[user_id]

    def _normalize_vector(self, vector: List[float]) -> List[float]:
        """L1 Normalization to ensure sum=1.0"""
        total = sum(vector)
        if total == 0: return [0.0] * len(vector)
        return [v / total for v in vector]

    def update_state(self, user_id: int, current_emotion: str, user_text: str, emotion_vector: List[float] = None):
        state = self.get_state(user_id)
        
        # 1. Update Emotion Labels
        state["last_emotion"] = current_emotion
        state["emotion_history"].append(current_emotion)
        
        # 2. Vector-Based Volatility (Euclidean Distance)
        if emotion_vector:
            norm_vec = self._normalize_vector(emotion_vector)
            state["emotion_vectors"].append(norm_vec)
        
        if len(state["emotion_history"]) > 5:
            state["emotion_history"].pop(0)
            if state["emotion_vectors"]: state["emotion_vectors"].pop(0)
            
        # Volatility = Mean distance between consecutive vectors
        if len(state["emotion_vectors"]) > 1:
            distances = []
            for i in range(1, len(state["emotion_vectors"])):
                v1 = np.array(state["emotion_vectors"][i-1])
                v2 = np.array(state["emotion_vectors"][i])
                distances.append(np.linalg.norm(v1 - v2))
            state["volatility"] = float(np.mean(distances))
        else:
            state["volatility"] = 0.0

        # Turn count
        state["turn_count"] += 1
        return state

    def track_probe(self, user_id: int, probe_type: str, probe_text: str):
        state = self.get_state(user_id)
        state["last_probes"].append({"type": probe_type, "text": probe_text})
        if len(state["last_probes"]) > 3:
            state["last_probes"].pop(0)

    def get_dialogue_context(self, user_id: int) -> str:
        state = self.get_state(user_id)
        rules = []
        
        # [Dialogue State] - TOP OF HIERARCHY
        rules.append("[Dialogue State]")
        rules.append(f"- Dominant Emotion: {state['last_emotion']}")
        rules.append(f"- Volatility: {state['volatility']:.2f}")
        rules.append(f"- Incongruence Flag: {state.get('incongruence', False)}")
        rules.append(f"- Intent: {state['last_intent']}")
        
        recent_probe_types = [p["type"] for p in state["last_probes"]]
        if recent_probe_types:
            rules.append(f"- Recent Probes: {', '.join(recent_probe_types)}")

        rules.append("\n[Behavioral Constraints]")
        rules.append("- If user named their emotion, explore the 'Impact' or 'Cause' specifically.")
        
        if "emotion_probe" in recent_probe_types:
            rules.append("- AVOID asking how they feel again. Pivot to situational triggers.")
            
        if state["volatility"] > 0.4:
            rules.append("- High Volatility: Use grounding language. Do not over-analyze.")
            
        if state.get("incongruence"):
            rules.append("- Incongruence detected: Gently explore if there's more they aren't saying.")
            
        if state.get("domain") == "physical_distress":
            rules.append("- CRITICAL: User is discussing physical pain or a medical procedure. DO NOT ask abstract psychological questions (e.g., 'root of this pain'). Instead, offer concrete validation, grounding, and practical concern.")

        return "\n".join(rules)

# Singleton instance
manager = DialogueManager()
