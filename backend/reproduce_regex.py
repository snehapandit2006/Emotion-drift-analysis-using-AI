import re

def clean_response(raw_text):
    # 1. Strip Thought Blocks
    clean_resp = raw_text
    clean_resp = re.sub(r"<think>.*?</think>", "", clean_resp, flags=re.DOTALL)
    clean_resp = re.sub(r"<think>.*", "", clean_resp, flags=re.DOTALL)

    # 2. Aggressive multi-tag strip (handles multi-line and various formats)
    tags_to_strip = ["INTENT", "TYPE", "EMOTION", "ACTION", "PRESCRIBE_GAME"]
    for tag in tags_to_strip:
        pattern = rf"\[\s*{tag}\s*[:\-]?\s*.*?\]"
        # print(f"Processing tag {tag} with pattern {pattern}")
        clean_resp = re.sub(pattern, "", clean_resp, flags=re.IGNORECASE | re.DOTALL)
    
    # 3. Catch-all for any remaining square bracket tags at START or END of lines
    clean_resp = re.sub(r"^\s*\[.*?\]\s*", "", clean_resp, flags=re.MULTILINE | re.DOTALL)
    clean_resp = re.sub(r"\s*\[.*?\]\s*$", "", clean_resp, flags=re.MULTILINE | re.DOTALL)
    
    # 4. Final clean up extra newlines and spaces
    clean_resp = clean_resp.strip()
    return clean_resp

# Test cases based on user reports
test_cases = [
    "[EMOTION: fear] I’m here with you—let’s take a breath. How about a quick game to help ground you? [ACTION: PRESCRIBE_GAME: Tetris]",
    "[INTENT: storytelling]\n[EMOTION: sadness]\nI'm so sorry.\n[TYPE: probe]",
    "<think>Thinking...</think>\nHello there!",
    "[EMOTION: fear] Message [ACTION: something]",
]

for i, test in enumerate(test_cases):
    print(f"Test {i+1}:")
    print(f"Raw: '{test}'")
    print(f"Cleaned: '{clean_response(test)}'")
    print("-" * 20)
