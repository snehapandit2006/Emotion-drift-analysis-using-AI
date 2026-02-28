import torch
import torch.nn as nn
import torchaudio
import torchaudio.transforms as T
import os

# CNN Architecture with Instance Normalization for Speaker Generalization
class EmotionCNN(nn.Module):
    def __init__(self, num_classes=4):
        super(EmotionCNN, self).__init__()
        self.conv1 = nn.Conv2d(1, 16, kernel_size=3, stride=1, padding=1)
        self.in1 = nn.InstanceNorm2d(16)
        self.conv2 = nn.Conv2d(16, 32, kernel_size=3, stride=1, padding=1)
        self.in2 = nn.InstanceNorm2d(32)
        self.conv3 = nn.Conv2d(32, 64, kernel_size=3, stride=1, padding=1)
        self.in3 = nn.InstanceNorm2d(64)
        self.pool = nn.MaxPool2d(2, 2)
        # Assuming 128x128 input after preprocessing
        self.fc1 = nn.Linear(64 * 16 * 16, 128)
        self.fc2 = nn.Linear(128, num_classes)
        self.relu = nn.ReLU()

    def forward(self, x):
        x = self.pool(self.relu(self.in1(self.conv1(x))))
        x = self.pool(self.relu(self.in2(self.conv2(x))))
        x = self.pool(self.relu(self.in3(self.conv3(x))))
        x = torch.flatten(x, 1)
        x = self.relu(self.fc1(x))
        x = self.fc2(x)
        return x

def normalize_audio(waveform):
    """
    RMS Normalization: Scales audio to a consistent volume level.
    Ensures multi-channel audio is averaged to mono.
    """
    if waveform.shape[0] > 1:
        waveform = torch.mean(waveform, dim=0, keepdim=True)
    rms = torch.sqrt(torch.mean(waveform**2))
    return waveform / (rms + 1e-8) * 0.1 

def get_mel_spectrogram(waveform, sample_rate):
    # Standardized parameters for speech emotion (n_mels=128 is industry standard)
    spectrogram_transform = T.MelSpectrogram(
        sample_rate=sample_rate,
        n_mels=128,
        n_fft=1024,
        hop_length=512,
        center=True,
        pad_mode="reflect",
        power=2.0,
    )
    mel_spec = spectrogram_transform(waveform)
    return T.AmplitudeToDB()(mel_spec)

# Singleton for Audio Analyzer
_audio_model = None

def load_audio_model():
    global _audio_model
    if _audio_model is None:
        _audio_model = EmotionCNN(num_classes=4)
        model_path = os.path.join(os.path.dirname(__file__), "audio_model.pth")
        if os.path.exists(model_path):
            try:
                print(f"Sentia ML: Loading pre-trained audio model from {model_path}")
                _audio_model.load_state_dict(torch.load(model_path, map_location=torch.device('cpu')))
            except Exception as e:
                print(f"Warning: Could not load audio weights: {e}")
        else:
            print("Sentia ML: audio_model.pth not found. Running with initialized (untrained) weights.")
        _audio_model.eval()
    return _audio_model

def predict_voice_emotion(audio_path: str) -> dict:
    """
    Analyzes an audio file and returns emotion probabilities.
    Standardized to 4 classes: sadness, anger, happy, neutral.
    """
    default_res = {"sadness": 0.1, "anger": 0.1, "happy": 0.1, "neutral": 0.7}
    
    if not audio_path or not os.path.exists(audio_path):
        return default_res

    try:
        waveform, sample_rate = torchaudio.load(audio_path)
        
        # 1. Normalize & Mono-convert
        waveform = normalize_audio(waveform)
        
        # 2. Extract Mel Spectrogram
        mel_spec = get_mel_spectrogram(waveform, sample_rate)
        
        # 3. Shape for CNN (Batch, Channel, Mels, Time)
        # We target a 128x128 grid for the CNN input
        input_tensor = mel_spec.unsqueeze(0) # Add batch dim
        
        if input_tensor.shape[3] > 128:
            input_tensor = input_tensor[:, :, :, :128]
        elif input_tensor.shape[3] < 128:
            input_tensor = torch.nn.functional.pad(input_tensor, (0, 128 - input_tensor.shape[3]))
            
        model = load_audio_model()
        with torch.no_grad():
            output = model(input_tensor)
            probs = torch.softmax(output, dim=1)
            
        labels = ["sadness", "anger", "happy", "neutral"]
        return {labels[i]: float(probs[0][i]) for i in range(len(labels))}
        
    except Exception as e:
        print(f"Audio analysis error: {e}")
        return default_res
