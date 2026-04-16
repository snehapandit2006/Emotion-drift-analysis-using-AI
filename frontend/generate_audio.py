import wave
import random
import struct
import math
import os

out_dir = r"E:\emotion-drift\frontend\public\audio"
if not os.path.exists(out_dir):
    os.makedirs(out_dir)

def generate_noise(filename, duration=10, type='brown'):
    sample_rate = 44100
    num_samples = sample_rate * duration
    
    last_val = 0.0
    f = wave.open(os.path.join(out_dir, filename), 'w')
    f.setnchannels(1)
    f.setsampwidth(2)
    f.setframerate(sample_rate)
    
    for i in range(num_samples):
        white = random.uniform(-1, 1)
        if type == 'brown':
            last_val = (last_val + (0.02 * white)) / 1.02
            val = last_val * 3.5
        elif type == 'pink':
            last_val = (last_val + (0.1 * white)) / 1.1
            val = last_val * 2.0
        else:
            val = white * 0.2
            
        val = max(-1.0, min(1.0, val))
        
        # Audio shaping
        if filename == 'ocean.wav':
            mod = 0.5 + 0.5 * math.sin(i * 2 * math.pi / (sample_rate * 4)) # 4 sec waves
            val *= mod
        elif filename == 'fireplace.wav':
            if random.random() < 0.002: # occasional crackle
                val += random.uniform(0.5, 1.0)
            val = max(-1.0, min(1.0, val))
            val *= 0.5 # quieter
        elif filename == 'forest.wav':
            # crickets/birds high pitch modulation
            mod = 0.5 + 0.5 * math.sin(i * 2 * math.pi * 4000 / sample_rate)
            val = (val * 0.3) + (mod * 0.05 * (1 if random.random() < 0.1 else 0))
            
        value = int(val * 32767.0)
        data = struct.pack('<h', value)
        f.writeframesraw(data)
        
    f.close()
    print(f"Generated {filename}")

generate_noise('ocean.wav', 12, 'brown')
generate_noise('fireplace.wav', 12, 'brown')
generate_noise('forest.wav', 12, 'pink')
