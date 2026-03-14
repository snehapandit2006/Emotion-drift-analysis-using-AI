# Emotion Drift Analysis Using AI: Comprehensive Project Documentation

## 1. Project Overview
A web-based AI system for **emotion analysis and monitoring** that combines **interpersonal text emotion analysis** with **individual facial emotion tracking**. This project is built with a clear separation of concerns, ethical safeguards, and explainable AI principles. 

The core idea revolves around understanding that human emotions are complex. The system uses two parallel emotion pipelines:
* **Text Emotion**: What is being expressed in conversations.
* **Face Emotion**: What the individual is experiencing internally.
* **Fusion**: Long-term patterns and alignment to understand drift.

## 2. Key Features

### 2.1. Chat Emotion Analysis
* Text-only emotion detection designed for analyzing conversations.
* Handles informal language and mixed sentiment.
* Long-term trend analysis storage.

### 2.2. Self Emotion Monitoring
* Webcam-based **snapshot capture** (no continuous streaming).
* Individual emotion detection using facial cues.
* Emotion logs stored with timestamps securely.

### 2.3. Emotion Dashboard
* Timeline view of emotional states.
* Emotion distribution over selected time ranges.
* Confidence-weighted trends and emotional drift detection.

### 2.4. Late Fusion Analytics (Explainable AI)
* Text and face emotions are **never fused at capture time**.
* Fusion occurs at the analytics layer using historical data.
* Enables detection of emotional suppression, alignment/misalignment, and stability vs. volatility.

### 2.5. Physical Health Data Integration
* Correlates physical metrics (Heart Rate, SpO2) along with emotional states.
* Highlights potential instances of masked anxiety using physiological metrics and AI fusion logic.

### 2.6. Support & Safety Insights
* Provides non-clinical severity assessment (Low/Medium/High).
* Direct integration to Tele-MANAS helpline and nearby psychologists via a consent-based model.

## 3. Technology Stack

### Frontend
* **Core**: React (Vite)
* **State Management**: Zustand
* **API Requests**: Axios
* **Visualization**: Chart.js / Recharts

### Backend
* **Framework**: FastAPI (Python)
* **Database / ORM**: SQLAlchemy (SQLite)

### ML / AI
* **Text Emotion**: NLP-based text emotion classifier and Sarvam LLM for Hinglish natural language processing.
* **Face Emotion**: CNN-based facial emotion recognition.
* **Analytics**: Rule-based + statistical temporal fusion.

## 4. Problems Encountered & Solutions Implemented

Throughout the development cycle, several specific technical challenges were overcome:

### 4.1. Language Drift in NLP Generation
* **Problem**: Sentia (the Voice Assistant) was inexplicably responding in Gujarati despite receiving Hinglish inputs and having an English-oriented instruction set.
* **Solution**: Adjusted the LLM prompt instructions and inference logic to strongly constrain output generation, ensuring consistent language output in English and Hinglish. 

### 4.2. Understanding Complex Hinglish Inputs
* **Problem**: The Doctor Voice Assistant struggled to understand heavily accented or mixed conversational Hinglish queries accurately.
* **Solution**: Integrated the Sarvam LLM, replacing previous LLM models, which significantly improved the assistant's ability to process and respond natively to multilinguistic context and Hinglish language structures.

### 4.3. UI Overlaps & Rendering Issues
* **Problem**: The Doctor Voice Assistant UI featured overlapping components particularly with the voice selection dropdown. Furthermore, game logos (Tetris, 2048, Flow Free) were failing to render due to unstable assets.
* **Solution**: Resolved z-index and CSS overlap issues in the voice selection UI. Migrated image URLs for games to use stable PNG assets and executed database migration scripts to update existing database records.

### 4.4. Audio Player UI State Persistence
* **Problem**: Within the Patient Dashboard, the "Stop Audio" button and active therapy visual indicator would disappear after a few seconds while audio playback was still actively ongoing.
* **Solution**: Refactored the UI state management to strictly tie the visual indicators and button visibility directly to the active audio playback event listeners instead of decoupled timers.

### 4.5. Unnatural Text-to-Speech (TTS) Processing
* **Problem**: The TTS engine was producing lengthy, unnatural pauses, specifically surrounding punctuation marks in dynamically generated text.
* **Solution**: Investigated and adjusted the TTS preprocessing pipeline to selectively filter or replace certain punctuation marks before synthesis, making the output significantly more fluid and conversational.

### 4.6. Fusing Vitals with Qualitative Emotional Models
* **Problem**: Needed a way to systematically identify signs of masked anxiety or stress using purely physiological proxies when facial or text inputs were neutral.
* **Solution**: Built backend infrastructure to process and store heart rate and SpO2 metrics (via simulated Google Fit syncing). Wrote custom AI fusion logic to interpret physical vitals alongside qualitative emotion logs to spot physiological stress hiding behind neutral expressions.

---
*Generated for project overview, internal tracking, and developmental records.*
