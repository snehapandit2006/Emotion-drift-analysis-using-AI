import requests
import json

key = 'sk_zadrdrn9_A4Q26JhScap58Emy8qr6c2wj'
url = 'https://api.sarvam.ai/text-to-speech'
headers = {
    'api-subscription-key': key,
    'Content-Type': 'application/json'
}

payload = {
    'inputs': ['Hello I am Sentia. How are you?'],
    'target_language_code': 'en-IN',
    'speaker': 'Ishita',
    'model': 'bulbul:v3',
    'pace': 1.0,
    'enable_preprocessing': True
}

res = requests.post(url, headers=headers, json=payload, timeout=20)
print('STATUS:', res.status_code)
if res.status_code != 200:
    print('TEXT:', res.text)
else:
    data = res.json()
    print('KEYS:', data.keys())
    if 'aud' in data:
        print('length of aud:', len(data['aud']))
    elif 'audios' in data:
        print('length of audios:', len(data['audios']))
