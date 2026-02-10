# Emotion-drift-analysis-using-AI

A web-based AI system for **emotion analysis and monitoring** that combines **interpersonal text emotion analysis** with **individual facial emotion tracking**, designed for both **internship-level evaluation** and **product-style demos**.

This project is built with a clear separation of concerns, ethical safeguards, and explainable AI principles.

---

## 🚀 Project Overview

Human emotions are complex and rarely expressed through a single channel. Text alone often hides emotional intent, while facial cues reveal affective states but lack context. This system addresses that gap by designing **two parallel emotion pipelines** that meet only at the analytics layer.

### Core Idea

* **Text Emotion** → What is being expressed in conversations
* **Face Emotion** → What the individual is experiencing internally
* **Fusion** → Long-term patterns and alignment, not instant judgments

---

## 🧠 System Architecture

```
Frontend (React)
│
├── ChatAnalyzer
│    └── Text-based emotion analysis of conversations
│
├── SelfEmotionMonitor
│    └── Webcam-based facial emotion capture (individual)
│
├── Dashboard
│    ├── Emotion timelines
│    ├── Distribution graphs
│    ├── Drift & stability analysis
│    └── Fused emotional insights
│
Backend (FastAPI)
│
├── Routes
│    ├── /chat-analysis        (text emotion)
│    └── /self-emotion/capture (face emotion)
│
├── Inference
│    ├── text_emotion.py
│    └── face_emotion.py
│
├── Analysis
│    ├── fusion.py   (late fusion & reasoning)
│    └── trends.py   (drift, volatility, stability)
│
├── Database
│    ├── chat_emotion_logs
│    └── face_emotion_logs
│
└── Analytics Layer
     └── Temporal fusion of text + face emotion histories
```

---

## 🔑 Key Features

### 1. Chat Emotion Analysis

* Text-only emotion detection
* Designed for analyzing conversations with other people
* Handles informal language and mixed sentiment
* Stored for long-term trend analysis

### 2. Self Emotion Monitoring

* Webcam-based **snapshot capture** (not continuous streaming)
* Individual emotion detection using facial cues
* Explicit user consent and camera toggles
* Emotion logs stored with timestamps

### 3. Emotion Dashboard

* Timeline view of emotional states
* Emotion distribution over selected time ranges
* Confidence-weighted trends
* Emotional drift detection

### 4. Late Fusion Analytics

* Text and face emotions are **never fused at capture time**
* Fusion occurs at the analytics layer using historical data
* Enables detection of:

  * Emotional suppression
  * Emotional alignment/misalignment
  * Stability vs volatility

---

## 🧪 Fusion Strategy (Explainable AI)

This system uses **Late Fusion**, not early embedding fusion.

Why?

* Models remain independent and debuggable
* Easier to explain in interviews and evaluations
* Allows re-analysis as models improve

### Example Insight

> Facial sadness increased over time while chat sentiment remained neutral → possible emotional masking detected.

This is presented as an **observed pattern**, not a psychological diagnosis.

---

## 🗄️ Data Storage Design

### Face Emotion Log Schema

```
id | user_id | emotion | confidence | timestamp
```

### Why this matters

* Enables time-series analysis
* Supports drift detection
* Allows future reprocessing with improved models

---

## ⚖️ Ethics & Privacy

* Webcam is **OFF by default**
* Explicit user consent required
* Snapshot-based capture only
* No background recording
* UI uses phrases like:

  * "Observed emotional indicators"
  * "Detected patterns"

This avoids false certainty and ethical overreach.

---

## 🛠️ Tech Stack

**Frontend**

* React (Vite)
* Zustand
* Axios
* Chart.js / Recharts

**Backend**

* FastAPI
* Python
* SQLAlchemy

**ML / AI**

* NLP-based text emotion classifier
* CNN-based facial emotion recognition
* Rule-based + statistical fusion

---

## 🎯 Use Cases

* Academic mini-project evaluation
* Internship / placement interviews
* Emotion analytics demo
* Research-oriented prototypes

---

## 🎬 Demo Flow

1. **Chat Emotion Analysis**

   * Upload or paste a conversation
   * System analyzes text-based emotions
   * Results are logged for trend analysis
   * ![Chat Analysis](screenshots/Screenshot_202026-02-09_20142941.png)

2. **Self Emotion Monitoring**

   * User explicitly enables webcam
   * Snapshot-based facial emotion capture
   * Emotion and confidence displayed instantly
   * Data stored for historical analysis
   * ![Self Emotion Detection](screenshots/Screenshot%2026-02-09%20142855.png)


3. **Dashboard & Insights**

   * Emotion timeline and distribution graphs
   * Drift and stability indicators
   * High-level fused emotional insights
   * ![Dashboard](screenshots/Screenshot%2026-02-09%20142827.png)
   * ![Timeline](screenshots/Screenshot%2026-02-09%20142839.png)

This flow demonstrates **real-time inference**, **ethical design**, and **long-term analytics** in under three minutes.

---


## 🚧 Limitations

* Facial emotion detection is probabilistic and culturally sensitive
* Not a diagnostic or clinical system
* Accuracy depends on lighting and camera quality

---

## 🔮 Future Enhancements

* Multimodal audio emotion analysis
* Personal baseline calibration
* On-device inference
* Cross-cultural emotion modeling

---

## 📄 License

This project is intended for educational and research purposes.
👉 For detailed system rationale, see [DESIGN.md](DESIGN.md)

---

**Built with care, caution, and a healthy distrust of emotion classifiers.**
