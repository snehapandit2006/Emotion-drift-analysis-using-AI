import requests
import json
import base64
import time
import os

key = 'sk_zadrdrn9_A4Q26JhScap58Emy8qr6c2wj'
url = 'https://api.sarvam.ai/text-to-speech'
headers = {
    'api-subscription-key': key,
    'Content-Type': 'application/json'
}

text = "Hello! This is a test. I noticed that, sometimes, there are long pauses. Don't you think?"

def get_tts_duration(text, preprocess=True):
    payload = {
        'inputs': [text],
        'target_language_code': 'hi-IN',
        'speaker': 'ishita',
        'model': 'bulbul:v3',
        'pace': 1.1,
        'enable_preprocessing': preprocess
    }
    
    start = time.time()
    try:
        res = requests.post(url, headers=headers, json=payload, timeout=20)
    except Exception as e:
        return None, f"Request failed: {e}"
    end = time.time()
    
    if res.status_code == 200:
        data = res.json()
        audio_b64 = data.get("audios", [""])[0]
        audio_bytes = base64.b64decode(audio_b64)
        # Save to file to check manually if needed
        fname = f"test_preprocess_{preprocess}.wav"
        with open(fname, "wb") as f:
            f.write(audio_bytes)
        
        # Crude duration estimate for WAV (assuming 8kHz or 16kHz mono)
        # Better yet, just report the byte size
        return len(audio_bytes), end - start
    else:
        return None, res.text

log_file = "reproduce_tts.log"
with open(log_file, "w") as lf:
    def log(msg):
        print(msg)
        lf.write(msg + "\n")

    text = "Hello. This is a test."

    try:
        log("Testing with enable_preprocessing=True...")
        size1, latency1 = get_tts_duration(text, True)
        if size1:
            log(f"Size: {size1} bytes, Latency: {latency1:.2f}s")
        else:
            log(f"Error 1: {latency1}")

        log("\nTesting with enable_preprocessing=False...")
        size2, latency2 = get_tts_duration(text, False)
        if size2:
            log(f"Size: {size2} bytes, Latency: {latency2:.2f}s")
        else:
            log(f"Error 2: {latency2}")

        if size1 and size2:
            log(f"\nSize difference: {size1 - size2} bytes")
            if size1 > size2:
                log("Preprocessing produces MORE audio data (likely more silence/pauses).")
            else:
                log("Preprocessing produces LESS audio data.")
    except Exception as e:
        import traceback
        traceback.print_exc(file=lf)
        log(f"Crashed: {e}")
