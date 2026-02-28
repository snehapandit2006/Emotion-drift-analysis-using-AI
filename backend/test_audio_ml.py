import os
import torch
import torchaudio
# Force soundfile backend
try:
    torchaudio.set_audio_backend("soundfile")
except:
    pass
from ml.audio_analysis import predict_voice_emotion, normalize_audio, get_mel_spectrogram

def test_audio_pipeline():
    audio_dir = "storage/audio"
    if not os.path.exists(audio_dir):
        print("Audio directory not found. Skipping.")
        return
        
    files = os.listdir(audio_dir)
    wav_files = [f for f in files if f.endswith(".wav")]
    
    if not wav_files:
        print("No wav files found in storage/audio. Skipping.")
        return
        
    sample_path = os.path.join(audio_dir, wav_files[0])
    print(f"Testing audio pipeline with: {sample_path}")
    
    # 1. Test Prediction
    probs = predict_voice_emotion(sample_path)
    print(f"Prediction result: {probs}")
    assert isinstance(probs, dict)
    assert all(k in probs for k in ["sadness", "anger", "happy", "neutral"])
    
    # 2. Test Normalization & Spectrogram
    waveform, sr = torchaudio.load(sample_path)
    norm_wave = normalize_audio(waveform)
    assert norm_wave.shape[0] == 1 # Should be mono
    
    mel_spec = get_mel_spectrogram(norm_wave, sr)
    print(f"Mel Spectrogram shape: {mel_spec.shape}")
    assert mel_spec.shape[1] == 128 # n_mels
    
    print("\nAudio pipeline tests passed!")

if __name__ == "__main__":
    try:
        test_audio_pipeline()
    except Exception as e:
        print(f"Tests failed: {e}")
        import sys
        sys.exit(1)
