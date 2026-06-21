# Emotion-drift-analysis-using-AI

🌍 **Live Demo:**
* **Frontend Application:** [https://emotion-drift-frontend.onrender.com](https://emotion-drift-frontend.onrender.com)
* **Backend API (Health Check):** [https://emotion-drift-api.onrender.com](https://emotion-drift-api.onrender.com)

A web-based AI system for **emotion analysis and monitoring** that combines **interpersonal text emotion analysis** with **individual facial emotion tracking**, designed for both **internship-level evaluation** and **product-style demos**.

This project is built with a clear separation of concerns, ethical safeguards, and explainable AI principles.

---

## 🚀 Project Overview

Human emotions are complex and rarely expressed through a single channel. Text alone often hides emotional intent, while facial cues reveal affective states but lack context. This system addresses that gap by designing **two parallel emotion pipelines** that meet only at the analytics layer.

### Core Idea

* **Text Emotion** → What is being expressed in conversations
* **Face Emotion** → What the individual is experiencing internally
* **Sentia Virtual Therapist** → AI-powered emotional companion and support
* **Vital Health** → Physical indicators (Heart Rate, SpO2) as emotional proxies
* **Fusion** → Long-term patterns and alignment, not instant judgments

---

## 🧠 System Architecture

```
Frontend (React)
│
├── ChatAnalyzer
│    └── Text-based emotion analysis of conversations
│
├── Sentia (Virtual Therapist)
│    └── AI-driven chat with voice and emotional support
│
├── SelfEmotionMonitor
│    └── Webcam-based facial emotion capture (individual)
│
├── Vitals & Fitness Dashboard
│    └── Real-time vital monitoring and health data
│
├── Media Hub
│    └── Spotify, YouTube, and Relaxation games (Tetris)
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
│    ├── /sentia-chat          (virtual therapist)
│    ├── /fitness-vitals       (health data)
│    └── /self-emotion/capture (face emotion)
│
├── Inference
│    ├── text_emotion.py
│    ├── face_emotion.py
│    └── vital_analyzer.py
│
├── Analysis
│    ├── fusion.py   (late fusion & reasoning)
│    └── trends.py   (drift, volatility, stability)
│
├── Database
│    ├── chat_emotion_logs
│    ├── face_emotion_logs
│    └── vital_sign_logs
│
└── Analytics Layer
     └── Temporal fusion of text + face + health histories
```

---

## 🔑 Key Features

### 1. Chat Emotion Analysis

* Text-only emotion detection
* Designed for analyzing conversations with other people
* Stored for long-term trend analysis

### 2. Sentia Virtual Therapist

* AI-powered emotional companion with personalized chat
* Integrated voice interaction for more natural support
* Real-time emotional feedback and coping suggestions

### 3. Self Emotion Monitoring

* Webcam-based **snapshot capture** (not continuous streaming)
* Individual emotion detection using facial cues
* Explicit user consent and camera toggles

### 4. Vitals & Health Monitoring

* Real-time monitoring of heart rate and SpO2 levels
* Critical vital alarms and voice alerts
* Integration with fitness data for a holistic view of well-being

### 5. Media & Relaxation Hub

* Embedded Spotify and YouTube players for music/video therapy
* Built-in Tetris game for cognitive distraction and stress relief
* Seamless integration into the therapeutic workflow

### 6. Emotion Dashboard

* Timeline view of emotional states
* Emotion distribution over selected time ranges
* Confidence-weighted trends
* Emotional drift detection

### 7. Late Fusion Analytics

* Text and face emotions are **never fused at capture time**
* Fusion occurs at the analytics layer using historical data
* Enables detection of:
  * Emotional suppression
  * Emotional alignment/misalignment
  * Stability vs volatility


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
* Framer Motion (Animations)
* React Icons
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

1. **Cinematic Landing & Discovery**
   * Experience the "Cinematic Neural" aesthetic with global backgrounds.
   * Access various modules via a modern, gesture-friendly UI.

2. **Sentia: Your AI Therapist**
   * Engage in supportive conversations with voice integration.
   * Receive immediate emotional validation and resources.

3. **Vital Signs & Monitoring**
   * Monitor physical health indicators in real-time.
   * Set up critical alarms for heart rate and SpO2.

4. **Chat & Face Analysis**
   * Parallel analysis of text and facial expressions.
   * Ethical, snapshot-based capture and logging.

5. **Dashboard & Analytics**
   * Explore long-term patterns via intuitive charts.
   * View fused insights across physical and emotional domains.

4. **Support & Safety Insights**
   
   * Access via the shield icon 🛡️ in the dashboard
   * View non-clinical severity assessment (Low/Medium/High)
   * Access Tele-MANAS helpline details directly
   * Find nearby psychologists (requires manual consent)

This flow demonstrates **real-time inference**, **ethical design**, and **long-term analytics** in under three minutes.

---



## 🛡️ Emotional Risk Awareness & Support

This system includes a **Support & Safety Layer** designed to analyze long-term emotional health indicators without making medical diagnoses.

### Pattern Recognition (Not Diagnosis)
The system calculates "Severity Levels" based purely on mathematical drift and volatility:
*   **Low**: Normal emotional fluctuations.
*   **Medium**: Sustained negative drift.
*   **High**: Sustained drift + high volatility.

### Support Resources
If high emotional risk patterns are detected, the system provides:
*   **Tele-MANAS Helpline**: Direct display of India's 24x7 Mental Health Helpline (14416).
*   **Psychologist Finder**: (Optional) Consent-based lookup for nearby professionals.
*   **Coping Guidance**: Static, non-prescriptive suggestions for seeking human support.

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
