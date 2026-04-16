import urllib.request
import os
import time

urls = {
    'ocean.mp3': 'https://cdn.pixabay.com/download/audio/2021/08/09/audio_d19a0aee79.mp3',
    'fireplace.mp3': 'https://cdn.pixabay.com/download/audio/2022/03/10/audio_55a29ca66a.mp3',
    'forest.mp3': 'https://cdn.pixabay.com/download/audio/2022/01/21/audio_14e5ad6bf8.mp3'
}

req_headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Accept': '*/* '
}

out_dir = r"E:\emotion-drift\frontend\public\audio"
if not os.path.exists(out_dir):
    os.makedirs(out_dir)

for filename, url in urls.items():
    try:
        req = urllib.request.Request(url, headers=req_headers)
        with urllib.request.urlopen(req) as response:
            with open(os.path.join(out_dir, filename), 'wb') as f:
                f.write(response.read())
        print(f"Downloaded {filename}")
        time.sleep(5) # Wait to bypass rate limits
    except Exception as e:
        print(f"Failed to download {filename}: {e}")
