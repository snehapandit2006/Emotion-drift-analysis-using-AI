# Sentia — AI-Powered Cognitive Companion & Emotion Drift System

[![Live Demo](https://img.shields.io/badge/Live_Demo-Frontend_App-blueviolet?style=for-the-badge&logo=render)](https://emotion-drift-frontend.onrender.com)
[![API Status](https://img.shields.io/badge/API_Status-FastAPI_Backend-emerald?style=for-the-badge&logo=fastapi)](https://emotion-drift-api.onrender.com)
[![License](https://img.shields.io/badge/License-Educational-orange?style=for-the-badge)](#-license)

> **Sentia** is an AI-powered cognitive companion designed to provide personalized well-being support. Unlike traditional mental wellness tools that analyze interactions in isolation, Sentia builds a structured, longitudinal understanding of users over time using cognitive reasoning, long-term memory, and multimodal emotion fusion.

---

## 🌟 Evolution Story: From Emotion Analysis to Cognitive System

```
Phase 1: Simple Emotion Drift Analyzer
[Chat & Face Inputs] ──> [Independent Classifier] ──> [Basic Volatility / Drift Charts]

                        │
                        ▼  Architecture Redesign
                        │

Phase 2: Sentia Cognitive AI Platform
[Multimodal Inputs] ──> [FastAPI Orchestration] ──> [Cognitive Intelligence Layer] ──> [Long-Term Memory & Personalization]
 (Text, Face, Voice,                                (Traits, States, Attention,             (PostgreSQL Persistence)
  Vitals & SpO₂)                                     Recovery Models & Narrative)
```

1. **Initial Scope:** Sentia began as a baseline **Emotion Drift Analyzer**, classifying chat text and webcam snapshots into discrete emotional categories.
2. **The Insight:** Emotion alone is insufficient for meaningful psychological support. Two users can express identical emotions while having completely different cognitive patterns, stress triggers, and coping mechanisms.
3. **The Architectural Shift:** The system was redesigned around a core **Cognitive Intelligence Layer** that transforms raw, real-time interactions into structured observations, long-term memory profiles, and explainable psychological trait/state analysis.

---

## 🧠 System Architecture

Sentia follows a **layered modular design** with strict separation of concerns across 5 core tiers:

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                                CLIENT LAYER (React)                               │
│  Chat Interface • Voice Assistant • Self-Emotion Monitor • Vitals Hub • Media Hub │
└────────────────────────────────────────┬─────────────────────────────────────────┘
                                         │  HTTP / WebSockets / REST
┌────────────────────────────────────────▼─────────────────────────────────────────┐
│                               FASTAPI BACKEND                                     │
│     API Routing • Authentication • Validation • Rate Limiting • Orchestration    │
└────────────────────────────────────────┬─────────────────────────────────────────┘
                                         │
┌────────────────────────────────────────▼─────────────────────────────────────────┐
│                              AI PROCESSING LAYER                                 │
│  Text NLP Classifier • CNN Facial Emotion • Audio/Voice Model • Vital Analyzer   │
└────────────────────────────────────────┬─────────────────────────────────────────┘
                                         │
┌────────────────────────────────────────▼─────────────────────────────────────────┐
│                         COGNITIVE INTELLIGENCE LAYER                             │
│ Observation Extraction • Memory Store • Cognitive Pattern Engine • Personalization│
└────────────────────────────────────────┬─────────────────────────────────────────┘
                                         │
┌────────────────────────────────────────▼─────────────────────────────────────────┐
│                              PERSISTENCE LAYER                                    │
│   PostgreSQL / SQLite • Cognitive Snapshots • Emotion Logs • Medical Records      │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### Layer Breakdown

1. **Client Layer (React + Vite):** Modern, high-performance UI offering full-screen interactive chat, voice streaming, facial snapshot analysis, real-time vital monitoring, and interactive CBT worksheets.
2. **FastAPI Backend (Orchestration):** Lightweight routes responsible for request validation, security, dependency injection, and coordinating service workflows.
3. **AI Processing Layer:** Independent, modality-specific models processing text, facial expressions, audio acoustic features, and physical vitals (Heart Rate & SpO₂).
4. **Cognitive Intelligence Layer (Core Engine):**
   - **Observation Window:** Converts raw messages into structured psychological signals.
   - **Trait Analysis (Slow-changing):** Evaluates baseline tendencies like Perfectionism, Avoidance, and Rumination.
   - **State Analysis (Fast-changing):** Measures real-time states including Burnout, Motivation Level, Stress Adaptation, and Cognitive Flexibility.
   - **Attention Map:** Tracks relative cognitive focus across Academics, Career, Health, Relationships, Identity, and Family.
   - **Recovery Model:** Learns individual stress triggers, effective coping strategies (*helps* vs *hurts*), and support preferences (*guidance* vs *listening*).
   - **Clinical Narrative Generator:** Synthesizes explainable, human-readable insights using LLM summarization.
5. **Persistence Layer (SQLAlchemy / PostgreSQL / SQLite):** Secure, time-series data storage for cognitive snapshots, emotion logs, and prescription records.

---

## ✨ Key Features & Capabilities

### 💬 1. Sentia Virtual AI Companion
* **Cognitive Memory:** Retains context across sessions to detect recurring themes and emotional trajectories.
* **Voice & Multimodal Support:** Seamless voice-to-voice interaction powered by real-time speech processing.
* **Personalized Response Tuning:** Adapts tone based on user support preferences (e.g., structured guidance vs. empathetic listening).

### 📊 2. Cognitive Pattern & Drift Analysis
* **Statistical Drift Tracking:** Calculates z-score variations across user attention domains (Academics, Career, Health, etc.).
* **Cognitive Distortion Detection:** Identifies catastrophic thinking, rigid perfectionism, and rumination using MiniLM sentence embeddings and clinical NLP filters.
* **CBT Reflection Worksheets:** Interactive cognitive-behavioral therapy tools allowing users to log activating events, thoughts, and restructuring strategies.

### 🎭 3. Self-Emotion Snapshot Monitoring
* **Webcam Snapshot Capture:** Privacy-first, consent-based facial expression sampling (no continuous video streaming).
* **Individual Emotion Detection:** Classifies internal affective states independently from conversational text.

### 💓 4. Vitals & Masking Detection
* **Physical Vital Monitoring:** Tracks Heart Rate and SpO₂ levels as physiological proxies for anxiety and stress.
* **Physiological Masking Alerts:** Detects instances where text/facial sentiment remains neutral while heart rate spikes (>100 bpm), signaling suppressed distress.

### 🧘 5. Media & Wellness Hub
* **Therapeutic Audio:** Integrated binaural beats and custom frequency soundscapes.
* **Relaxation Games:** Built-in Tetris, 2048, and Flow Free for cognitive distraction and emotional regulation.
* **Media Player:** Embedded Spotify and YouTube integration for guided relaxation.

---

## 🛠️ Tech Stack

### Frontend
- **Framework:** React 18 (Vite)
- **State Management:** Zustand & Context API
- **Styling & Motion:** CSS Modules, Framer Motion
- **Visualizations:** Chart.js, Recharts, Three.js (3D Brain Visualization)
- **Icons & UI:** Lucide React, React Icons

### Backend & Orchestration
- **Framework:** FastAPI (Python 3.10+)
- **ORM & DB:** SQLAlchemy (SQLite for development, PostgreSQL for production)
- **Authentication:** JWT tokens, Google OAuth 2.0
- **Server:** Uvicorn / Gunicorn

### Machine Learning & AI
- **NLP & Cognitive Embeddings:** `sentence-transformers/all-MiniLM-L6-v2`, HuggingFace Transformers
- **Text Emotion Classifier:** TF-IDF + Scikit-Learn Ensemble
- **Facial Emotion Recognition:** PyTorch CNN model
- **LLM Synthesis & Voice:** Sarvam AI API for Hinglish & English clinical dialogue

---

## 🔬 Engineering & Design Principles

1. **Separation of Concerns:** API handlers (`backend/routes/`) remain lightweight (~10–20 lines) and delegate all domain computation to dedicated service modules (`backend/analysis/`).
2. **Modality Decoupling:** Text, facial, audio, and physical vital processors operate independently. Any single ML model can be upgraded or swapped without breaking the core application.
3. **Deterministic Scoring + LLM Summarization:** Psychological trait/state scores and confidence metrics are calculated deterministically via rules and semantic similarity matrixes. The LLM is strictly used as a natural language summarizer, eliminating algorithmic hallucinations.
4. **Explainable AI Audit Trails:** Every cognitive score includes transparent source breakdowns and linguistic evidence trails for clinical auditability.

---

## 🚀 Getting Started Locally

### Prerequisites
- Python 3.10+
- Node.js 18+
- npm or yarn

### 1. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create and activate virtual environment
python -m venv venv
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env file with appropriate keys
cp .env.example .env

# Run FastAPI development server
uvicorn api.main:app --reload --port 8000
```

The API documentation will be available at `http://localhost:8000/docs`.

### 2. Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start Vite development server
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## 🛡️ Ethics, Privacy & Safety Safeguards

- **Privacy by Design:** Camera capture requires explicit user permission and operates strictly on explicit snapshot requests.
- **Non-Clinical Boundaries:** System output is presented as *observed indicators* and *behavioral patterns*, never medical diagnoses.
- **Safety Net Integration:** Automatic detection of high severity indicators surfaces non-invasive crisis helpline resources (including Tele-MANAS 14416).

---

## Project Metrics

⭐ 2 Stars
🍴 8 Forks
👥 Multiple Contributors
📌 GSSoC Open Source Project
🔀 Community Pull Requests
📄 Active Issue Tracking
🚀 Production Deployment

---

## 📄 License

This project is built for educational, research, and placement demonstration purposes.

---

**Crafted with care, cognitive engineering, and architectural maintainability by Sneha Pandit.**
