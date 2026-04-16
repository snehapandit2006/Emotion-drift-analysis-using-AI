import os
import requests
import json
import re
from datetime import datetime

from core.config import settings

# Curated library of anti-anxiety games
GAME_LIBRARY = {
    "Tetris": {
        "link": "https://tetris.com/play-tetris",
        "logo": "https://upload.wikimedia.org/wikipedia/commons/f/f7/Tetris_logo.png",
        "description": "Research shows Tetris helps block traumatic memories and reduces anxious spiraling."
    },
    "2048": {
        "link": "https://play2048.co/",
        "logo": "https://upload.wikimedia.org/wikipedia/commons/3/30/2048_logo.png",
        "description": "Math-based puzzle focusing on logic and strategy to ground the mind."
    },
    "Flow": {
        "link": "https://www.agame.com/game/flow-free",
        "logo": "https://is1-ssl.mzstatic.com/image/thumb/Purple126/v4/4a/d6/3c/4ad63c1d-19cc-8461-9f93-162808c16d56/AppIcon-0-0-1x_U007emarketing-0-0-0-7-0-0-sRGB-0-0-0-GLES2_U002c0-512MB-85-220-0-0.png/246x0w.webp",
        "description": "Fluid puzzle game promoting relaxation through color-matching logic."
    }
}

# LLM Configuration
LLM_API_KEY = settings.LLM_API_KEY
LLM_MODEL = settings.LLM_MODEL

def scrub_tech_tags(text: str) -> str:
    """
    Nuclear scrubber to remove <think> blocks, square brackets, and URLs.
    Ensures clean conversational output for both patients and doctors.
    If the model ONLY outputs a <think> block, we extract its content.
    """
    if not text:
        return ""
    
    # 0. Cache original for fallback
    original = text
    
    # 1. Strip Thought Blocks
    clean = re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL)
    clean = re.sub(r"<think>.*", "", clean, flags=re.DOTALL)

    # 2. BRUTE-FORCE TAG REMOVAL
    clean = re.sub(r"\[.*?\]", "", clean, flags=re.DOTALL)
    clean = re.sub(r"［.*?］", "", clean, flags=re.DOTALL)
    
    # 3. URL SCRUBBING
    clean = re.sub(r"http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+", "", clean)
    
    clean = clean.strip()

    # 4. IF EMPTY BUT HAD THINK BLOCK, EXTRACT THINK CONTENT
    if not clean and "<think>" in original:
        think_content = re.search(r"<think>(.*?)(?:</think>|$)", original, flags=re.DOTALL)
        if think_content:
            clean = think_content.group(1).strip()
            # Still apply other scrubbers to the extracted content (except think)
            clean = re.sub(r"\[.*?\]", "", clean, flags=re.DOTALL)
            clean = re.sub(r"http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+", "", clean)
            clean = clean.strip()
            print(f"[SCRUBBER] Extracted content from <think> block as no other text was found.")

    # 5. Final clean up
    clean = re.sub(r"(?i)here's the link:?\s*$", "", clean).strip()
    clean = re.sub(r"(?i)click here:?\s*$", "", clean).strip()
    
    return clean

def strip_markdown(text: str) -> str:
    """Remove markdown formatting characters from text for clean TTS output."""
    if not text:
        return ""
    # Remove bold/italic: ** __ * _
    clean = re.sub(r'\*{1,3}(.*?)\*{1,3}', r'\1', text)
    clean = re.sub(r'_{1,3}(.*?)_{1,3}', r'\1', clean)
    # Remove bullet list characters: * - •
    clean = re.sub(r'^\s*[\*\-•]\s+', '', clean, flags=re.MULTILINE)
    # Remove headers: # ## ###
    clean = re.sub(r'^#{1,6}\s+', '', clean, flags=re.MULTILINE)
    # Remove extra whitespace
    clean = re.sub(r'\n{2,}', '. ', clean)
    clean = re.sub(r'\n', ' ', clean)
    clean = re.sub(r'\s{2,}', ' ', clean)
    return clean.strip()

def contains_hindi(text: str) -> bool:
    """Return True if the text contains a significant amount of Devanagari script."""
    if not text:
        return False
    hindi_chars = sum(1 for c in text if '\u0900' <= c <= '\u097F')
    return hindi_chars > 10  # More than 10 devanagari chars = Hindi response

def text_to_digit(text: str) -> str:
    """
    Converts verbal numbers (one, two, etc.) to digits (1, 2, etc.) for patient ID parsing.
    Handles basic punctuation like 'one?'.
    """
    num_map = {
        "one": "1", "two": "2", "three": "3", "four": "4", "five": "5",
        "six": "6", "seven": "7", "eight": "8", "nine": "9", "ten": "10",
        "एक": "1", "दो": "2", "तीन": "3", "चार": "4", "पाँच": "5",
        "छह": "6", "सात": "7", "आठ": "8", "नौ": "9", "दस": "10"
    }
    # Use regex to replace whole words only, ignoring punctuation
    processed = text.lower()
    for word, digit in num_map.items():
        # Use word boundaries only for English words to avoid partial matches (e.g., "one" in "alone")
        # Hindi characters don't always trigger \b accurately in some regex environments.
        if any(ord(c) > 127 for c in word):
            processed = re.sub(rf'{word}', digit, processed)
        else:
            processed = re.sub(rf'\b{word}\b', digit, processed)
    return processed

def generate_structured_fallback(user_text: str, state: dict) -> str:
    """
    Smart, State-Aware Reflection + Probing heuristic.
    Uses current emotion, intent, volatility, and probe history.
    """
    domain = state.get("domain", "general_emotional")
    if domain == "physical_distress":
        medical_options = [
            "That sounds physically uncomfortable. Are you managing the pain okay right now?",
            "I'm sorry you're dealing with that physical discomfort. Did the doctor give you specific aftercare instructions?",
            "That sounds like a lot to handle physically. How are your energy levels after the procedure?",
            "I hear you on the physical pain. Is there anything helping you feel more comfortable at the moment?",
            "Medical procedures can be so draining. I'm here to listen while you recover."
        ]
        import random
        return random.choice(medical_options)

    import random
    emotion = state.get("last_emotion", "neutral")
    intent = state.get("last_intent", "storytelling")
    volatility = state.get("volatility", 0.0)
    recent_probes = [p["type"] for p in state.get("last_probes", [])]

    content_map = {
        "sadness": {
            "reflections": ["I hear the weight of this sadness you're carrying.", "It sounds like things are feeling very heavy right now.", "I'm sitting here with you in this space."],
            "causal_probes": ["What do you think is at the root of this pain?", "Could you tell me more about when this started?"],
            "impact_probes": ["How does this sadness affect your energy today?", "What impact does this have on your perspective?"],
            "grounding_probes": ["What is one small thing that feels safe right now?", "How are you taking care of yourself in this heavy moment?"]
        },
        "anger": {
            "reflections": ["That sounds incredibly frustrating.", "I can sense the sharp edge of this unfairness.", "It's natural to feel reactive when things go this way."],
            "causal_probes": ["What part of this feels the most unjust?", "Who or what is the primary source of this intensity?"],
            "impact_probes": ["How does this anger change how you feel about the relationship?", "Where do you feel this tension most in your body?"],
            "grounding_probes": ["Let's take a breath. What would 'resolution' look like for you?", "How can we channel this intensity into a clear request?"]
        },
        "fear": {
            "reflections": ["I can hear the uncertainty in your words.", "It sounds like you're standing on shaky ground right now."],
            "causal_probes": ["What is the specific 'what if' that's most present?", "Did something specific trigger this feeling of unease?"],
            "impact_probes": ["How is this anxiety affecting your focus?", "What feels the most overwhelming about this uncertainty?"],
            "grounding_probes": ["What is one thing you know for certain in this moment?", "Can we find a small pocket of stability to hold onto?"]
        },
        "joy": {
            "reflections": ["It's wonderful to hear such brightness in your words.", "I can feel the warmth of that experience."],
            "causal_probes": ["What made this moment feel so special?", "Who else was part of this positive experience?"],
            "impact_probes": ["How does this joy change your outlook for the week?", "What does this tell you about what you value most?"],
            "grounding_probes": ["How can you savor this feeling a little longer?", "Is there a way to bring more of this into your daily life?"]
        },
        "neutral": {
            "reflections": ["I'm listening closely to what you're sharing.", "Thank you for explaining that to me.", "I'm processing what you've said."],
            "causal_probes": ["What else is on your mind today?", "What led you to think about this right now?"],
            "impact_probes": ["How are you processing everything that's happened?", "Is there a specific part of that you'd like to dive into?"],
            "grounding_probes": ["What feels most important to talk about next?", "How are you feeling in this exact moment?"]
        }
    }

    data = content_map.get(emotion, content_map["neutral"])
    reflection = random.choice(data["reflections"])
    
    # 1. Choose Probe Category based on Intent & Volatility
    if intent == "avoidance":
        probe_cat = "causal_probes" # Gently challenge the avoidance
    elif volatility > 0.5:
        probe_cat = "grounding_probes" # Stabilize
    elif "causal_probe" in recent_probes:
        probe_cat = "impact_probes" # Diverse
    else:
        probe_cat = "causal_probes"

    # Fallback to general probes if cat missing
    probe_choices = data.get(probe_cat, data.get("causal_probes", data["grounding_probes"]))
    probe = random.choice(probe_choices)

    return f"{reflection} {probe}"

def classify_intent_light(user_text: str) -> str:
    """
    Lightweight, deterministic intent classification.
    """
    if not LLM_API_KEY:
        return "storytelling"

    try:
        url = "https://api.sarvam.ai/v1/chat/completions"
        headers = {
            "api-subscription-key": LLM_API_KEY,
            "Content-Type": "application/json"
        }
        
        prompt = (
            "Classify the following user message into exactly ONE of these categories: "
            "[Storytelling, Avoidance, Direct Request, Emotional Disclosure, Greeting, Clarification, Medical Disclosure]. "
            "Return ONLY the category name. No prose.\n\n"
            f"User: '{user_text}'"
        )
        
        payload = {
            "model": LLM_MODEL,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.1,
            "max_tokens": 15
        }
        
        res = requests.post(url, headers=headers, json=payload, timeout=4.0)
        if res.status_code == 200:
            result = res.json()
            try:
                intent = result["choices"][0]["message"]["content"].strip().lower()
                return intent
            except (KeyError, IndexError):
                print(f"[Intent Classifier] Parsing Error or Safety Block. Result: {result}")
        else:
            print(f"[Intent Classifier] HTTP Error {res.status_code}")
    except Exception as e:
        print(f"[Intent Classifier] Request Exception: {e}")
    
    # Simple regex fallback
    text_lower = user_text.lower()
    if any(w in text_lower for w in ["what", "how", "why"]): return "direct_request"
    if any(w in text_lower for w in ["no", "not", "actually"]): return "clarification"
    return "storytelling"

def generate_therapeutic_response(user_text: str, fused_emotion: str, dialogue_context: str = "", hobbies: str = None, games: str = None, history: list = None, ui_lang: str = None) -> dict:
    """
    Calls Sarvam API with structured policy injection and history awareness.
    """
    if not LLM_API_KEY:
        print("[LLM Bridge] WARNING: LLM_API_KEY is missing. Falling back to heuristic mode.")
        return None

    try:
        url = "https://api.sarvam.ai/v1/chat/completions"
        headers = {
            "api-subscription-key": LLM_API_KEY,
            "Content-Type": "application/json"
        }
        
        # 0. Format History
        history_str = ""
        if history:
            history_str = "RECENT CONVERSATION HISTORY:\n"
            for msg in history:
                role = "User" if msg["role"] == "user" else "Sentia"
                history_str += f"{role}: {msg['content']}\n"
            history_str += "\n"

        # Personalized Logic
        hobby_str = f"The user enjoys: {hobbies}." if hobbies else ""
        games_str = f"The user plays these for anxiety: {games}." if games else ""

        library_str = "\n".join([f"- {name}: {info['link']} ({info['description']})" for name, info in GAME_LIBRARY.items()])
        
        # Match the UI language if possible
        lang_anchor = f"The user's current interface language is: {ui_lang}." if ui_lang else ""

        # Structure is key: State first, Personality second
        full_system_instructions = (
            f"{dialogue_context}\n\n"
            "SYSTEM INSTRUCTIONS:\n"
            "You are Sentia, a deeply empathetic and naturally conversational human therapist.\n"
            f"{hobby_str} {games_str} {lang_anchor}\n" 
            "GAME LIBRARY (RESEARCH-BACKED):\n"
            f"{library_str}\n\n"
            "CRITICAL RULES:\n"
            "1. LANGUAGE MIRROR: Reply in the EXACT SAME LANGUAGE and SCRIPT as the user.\n"
            "   - If user uses Roman letters (Hinglish/English), you MUST use Roman letters.\n"
            "   - If the user is ambiguous, use the UI language anchor: {ui_lang or 'English (IN)'}.\n"
            "   - IMPORTANT: Do NOT drift into Gujarati or Marathi if the user is speaking Hindi/Hinglish.\n"
            "2. BREVITY: Keep your response short and conversational (MAX 2 sentences).\n"
            "3. NO AI TAGS: NEVER use ANY square brackets [ ] in your output speech. Just talk naturally.\n"
            "4. NO LINKS: NEVER include direct URLs or game links in your spoken text.\n"
            "5. REASONING: If you need to analyze the emotion, ALWAYS wrap your thought process in <think>...</think> tags. Never output thoughts directly.\n"
            "6. FORMAT: [EMOTION: category], [INTENT: category], [TYPE: category].\n"
            "7. GROUNDING PROTOCOL: If panic/anxiety/sadness OR if the user asks for a game/link, pick a game name. Include [ACTION: PRESCRIBE_GAME: GameName] at the end.\n\n"
            "MANDATORY FORMAT:\n"
            "<think>\n"
            "Your internal analysis and reasoning here.\n"
            "</think>\n"
            "[EMOTION: category]\n"
            "[INTENT: category]\n"
            "[TYPE: probe_type]\n"
            "Your warm response text here. (ABSOLUTELY NO BRACKETS OR URLs HERE).\n"
            "[ACTION: PRESCRIBE_GAME: GameName OR NONE]\n\n"
            "EXAMPLE OUTPUT FOR 'hi':\n"
            "<think>\n"
            "The user said 'hi'. Emotion is neutral. I should respond with a brief greeting in English.\n"
            "</think>\n"
            "[EMOTION: neutral]\n"
            "[INTENT: greeting]\n"
            "[TYPE: general_probe]\n"
            "Hello! How can I support you today? Let me know what's on your mind.\n"
            "[ACTION: PRESCRIBE_GAME: NONE]\n\n"
            "EXAMPLE OUTPUT FOR 'provide me a game link':\n"
            "<think>\n"
            "The user asked for a game link. I'll recommend Flow and use the action tag so the UI displays the button.\n"
            "</think>\n"
            "[EMOTION: neutral]\n"
            "[INTENT: request]\n"
            "[TYPE: direct_request]\n"
            "I'd love to share one with you. Try Flow—it's a soothing color-matching puzzle that works wonders.\n"
            "[ACTION: PRESCRIBE_GAME: Flow]"
        )
        
        payload = {
            "model": LLM_MODEL,
            "messages": [
                {"role": "system", "content": full_system_instructions},
                {"role": "user", "content": f"{history_str}Current User Message: '{user_text}'. Current Emotion Context: {fused_emotion}."}
            ],
            "temperature": 0.5,
            "max_tokens": 300
        }
        
        res = requests.post(url, headers=headers, json=payload, timeout=20)
        
        if res.status_code != 200:
            print(f"[LLM Bridge Error] Status: {res.status_code} - Response: {res.text}")
            return None
            
        result = res.json()
        if "choices" in result and len(result["choices"]) > 0:
            raw_text = result["choices"][0]["message"]["content"].strip()
            
            # Extraction logic
            intent = extract_intent_block(raw_text)
            probe_type = extract_probe_type(raw_text)
            emotion_tag = extract_emotion_block(raw_text)
            prescribed_game = extract_action_block(raw_text)
            
            # Clean response using centralized scrubber
            clean_resp = scrub_tech_tags(raw_text)
            
            # Heuristic Fallback: If the LLM failed to include [ACTION...] but mentioned a game
            if not prescribed_game or prescribed_game.upper() == "NONE":
                for g_name in GAME_LIBRARY.keys():
                    if g_name.lower() in clean_resp.lower():
                        prescribed_game = g_name
                        break
            
            # 5. SALVAGE LOGIC: If cleaning destroyed everything, try to find text lines
            if not clean_resp and raw_text:
                lines = [line.strip() for line in raw_text.split('\n') if line.strip() and "[" not in line and "［" not in line and "<" not in line]
                if lines:
                    clean_resp = " ".join(lines)
            
            # 5. PERSISTENT LOGGING for debugging leakage
            print(f"[SENTIA DEBUG] CLEANED: {clean_resp[:50]}...")
            try:
                with open("llm_debug.log", "a", encoding="utf-8") as f:
                    f.write(f"\n--- {datetime.utcnow()} ---\n")
                    f.write(f"RAW: {raw_text}\n")
                    f.write(f"CLEANED: {clean_resp}\n")
                    f.write("-" * 50 + "\n")
            except Exception as e:
                print(f"[SENTIA DEBUG] Logging Failed: {e}")
            
            return {
                "text": clean_resp, 
                "type": probe_type, 
                "intent": intent, 
                "emotion": emotion_tag,
                "prescribed_game": prescribed_game
            }
            
        print("[LLM Bridge Error] No choices found in response:", result)
        return None
        
    except Exception as e:
        print(f"[LLM Bridge Exception]: {e}")
        return None

def extract_probe_type(llm_response: str) -> str:
    match = re.search(r"\[TYPE:\s*(.*?)\]", llm_response, re.IGNORECASE)
    return match.group(1).strip().lower() if match else "general_probe"

def extract_intent_block(llm_response: str) -> str:
    match = re.search(r"\[INTENT:\s*(.*?)\]", llm_response, re.IGNORECASE)
    return match.group(1).strip().lower() if match else "storytelling"

def extract_emotion_block(llm_response: str) -> str:
    match = re.search(r"\[EMOTION:\s*(.*?)\]", llm_response, re.IGNORECASE)
    return match.group(1).strip().lower() if match else None

def extract_action_block(llm_response: str) -> str:
    match = re.search(r"\[ACTION: PRESCRIBE_GAME:\s*(.*?)\]", llm_response, re.IGNORECASE)
    return match.group(1).strip() if match else None

def generate_clinical_summary(structured_history: list) -> str:
    """
    Phase 3: LLM-Based Context Summary
    STRICT POLICY: LLM summarizes. Model decides risk.
    """
    if not LLM_API_KEY:
        return _heuristic_summary(structured_history)
        
    try:
        url = "https://api.sarvam.ai/v1/chat/completions"
        headers = {
            "api-subscription-key": LLM_API_KEY,
            "Content-Type": "application/json"
        }
        
        prompt = (
            "You are a clinical summarization assistant.\n"
            "STRICT RULES:\n"
            "1. Summarize the emotional trends from the provided session data.\n"
            "2. DO NOT assess risk level.\n"
            "3. DO NOT give medical advice or diagnosis.\n"
            "4. Produce a concise, objective 2-sentence summary of the trends observed.\n\n"
            f"Session Data JSON:\n{json.dumps(structured_history, indent=2)}"
        )
        
        payload = {
            "model": LLM_MODEL,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.1,
            "max_tokens": 500
        }
        
        res = requests.post(url, headers=headers, json=payload, timeout=20)
        if res.status_code == 200:
            result = res.json()
            if "choices" in result and len(result["choices"]) > 0:
                raw_text = result["choices"][0]["message"]["content"].strip()
                text = scrub_tech_tags(raw_text)
                if len(text) > 30:
                    return text
                else:
                    print(f"DEBUG LLM SUMMARY WARNING: Generated text too short: '{text}'")
                    return _heuristic_summary(structured_history)
                
        print(f"DEBUG LLM SUMMARY FAILED: Status {res.status_code}, Response {res.text}")
        return _heuristic_summary(structured_history)
        
    except Exception as e:
        print(f"[LLM Clinical Summary Error]: {e}")
        return _heuristic_summary(structured_history)

def _heuristic_summary(history: list) -> str:
    if not history:
        return "No recent emotional data logged for this patient."
    emotions = [h.get("emotion", "neutral") for h in history]
    first = emotions[0]
    last = emotions[-1]
    return f"Based on the last {len(emotions)} sessions, the patient's primary emotion shifted from {first} to {last}."

def handle_doctor_voice_query(query: str, db, doctor_id: int, context_patient_id: int = None) -> str:
    from db.models import DriftAlert, EmotionLog, User
    import json
    import re
    import requests
    
    print(f"[DOCTOR QUERY ENTRY] Query: {repr(query)} | Context ID: {context_patient_id}")
    
    q_lower = text_to_digit(query.lower())
    
    # Nuclear Extraction: Support patient, pt, id, #, number, mareez (Hindi), user, etc.
    patient_id = None
    pt_match = re.search(r'(?:patient|id|number|pt|#|user|मरीज|mareez)\s*[:#-]?\s*(\d+)', q_lower)
    if pt_match:
        patient_id = int(pt_match.group(1))
    
    # Secondary Fallback: If summarizing or trends, grab any first digit
    summary_keywords = ["summarize", "summarise", "summary", "history", "trend", "log", "समरी", "इतिहास", "ट्रेंड"]
    if not patient_id and any(w in q_lower for w in summary_keywords):
        digit_match = re.search(r'(\d+)', q_lower)
        if digit_match:
            patient_id = int(digit_match.group(1))
            
    # CRITICAL: If no number found but we have context_patient_id, use it.
    if not patient_id:
        patient_id = context_patient_id
    
    # Extracted data context mapping
    data_context = "No specific patient data retrieved for this query."
    
    # 1. Look up High Risk
    if "high" in q_lower and "risk" in q_lower:
        from sqlalchemy import or_
        patients = db.query(User).filter(User.doctor_id == doctor_id).all()
        p_ids = [p.id for p in patients]
        alerts = db.query(DriftAlert).filter(
            DriftAlert.user_id.in_(p_ids),
            or_(
                DriftAlert.message.like('%"level": "HIGH"%'),
                DriftAlert.severity >= 0.6
            )
        ).all()
        if not alerts: 
            data_context = "System shows no patients currently with HIGH emotional risk alerts."
        else:
            high_risk_ids = list(set([a.user_id for a in alerts]))
            data_context = f"High Risk Patients found: IDs {', '.join(map(str, high_risk_ids))}."
            
    # 2. Look up Patient specific logs
    elif patient_id:
        logs = db.query(EmotionLog).filter(EmotionLog.user_id == patient_id).order_by(EmotionLog.created_at.desc()).limit(10).all()
        if not logs:
            data_context = f"No recent emotional logs found in database for patient ID {patient_id}."
        else:
            history_data = [{"date": l.created_at.isoformat(), "emotion": l.emotion, "confidence": round(l.confidence, 2)} for l in reversed(logs)]
            data_context = f"Patient ID {patient_id} Recent Logs:\n{json.dumps(history_data, indent=2)}"

    # 3. Call LLM for Conversational Human-like Response
    response_text = ""
    if LLM_API_KEY:
        url = "https://api.sarvam.ai/v1/chat/completions"
        headers = {"api-subscription-key": LLM_API_KEY, "Content-Type": "application/json"}
        prompt = (
            "You are Sentia Voice, an incredibly fast, highly intelligent, and conversational clinical AI assistant specifically designed for psychiatrists.\n"
            f"The doctor just said: '{query}'\n\n"
            "SYSTEM KNOWLEDGE / RETRIEVED DATA FOR THIS QUERY:\n"
            f"{data_context}\n\n"
            "CRITICAL RULES FOR RESPONSE:\n"
            "1. BE CONVERSATIONAL & HUMAN: Speak naturally like a highly competent, warm human assistant (think J.A.R.V.I.S for doctors).\n"
            "2. DIRECT ANSWERS: If the doctor just says 'hello' or a greeting, politely greet back and ask how you can assist. If they ask for data, summarize the provided SYSTEM KNOWLEDGE in 1-2 short sentences.\n"
            "3. NO MARKDOWN: Do not use asterisks, bolding, special characters, or lists. It will be read via TTS.\n"
            "4. KEEP IT BRIEF: Speak in short, concise sentences to minimize voice lag. Don't over-explain.\n"
            "5. NO PREACHING: Never say 'Based on the logs...' or 'The database says...'. Just confidently deliver the insight directly.\n"
            "6. ACTIONABLE: If distress is found (sadness/anxiety), briefly suggest an actionable focus like Music Therapy.\n"
            "7. ALWAYS reply using standard English vocabulary and Latin script."
        )
        
        try:
            payload = {
                "model": LLM_MODEL,
                "messages": [
                    {"role": "system", "content": "You are a brilliant, conversational human-like virtual assistant for doctors. Respond naturally, maximum 2 sentences."},
                    {"role": "user", "content": prompt}
                ],
                "temperature": 0.4,
                "max_tokens": 100
            }
            res = requests.post(url, headers=headers, json=payload, timeout=12)
            if res.status_code == 200:
                result = res.json()
                raw_text = result["choices"][0]["message"]["content"].strip()
                response_text = scrub_tech_tags(raw_text)
                response_text = strip_markdown(response_text)
            else:
                print(f"[DOCTOR LLM DEBUG] Sarvam Error: {res.text}")
        except Exception as e:
            print("[DOCTOR LLM DEBUG] Exception:", e)

    # Fallback Safeguard just in case API fails
    if not response_text or not response_text.strip():
        if patient_id:
            response_text = f"I retrieved the data for patient {patient_id}, but I am having trouble generating a voice summary at the moment. Please check the dashboard."
        else:
            response_text = "I'm sorry, doctor. I encountered a network error while processing your request."
            
    return response_text
