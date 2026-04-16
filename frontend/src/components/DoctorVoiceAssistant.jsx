import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, MicOff, Loader, X, Volume2, VolumeX } from 'lucide-react';
import { sendDoctorVoiceQuery, postTTS } from '../api';

const SARVAM_VOICES = [
    'ishita', 'priya', 'ritu', 'pooja', 'simran', 'kavya', 'neha', 'shreya',
    'aditya', 'rahul', 'rohan', 'amit', 'dev', 'ratan', 'varun', 'kabir'
];

// Split text into short sentences for sequential TTS
function splitSentences(text) {
    if (!text) return [];
    const parts = text.match(/[^.!?]+[.!?]*/g) || [text];
    return parts.map(s => s.trim()).filter(s => s.length > 2);
}

const DoctorVoiceAssistant = ({ patientId = null }) => {
    const [isListening, setIsListening] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [selectedVoice, setSelectedVoice] = useState('ishita');
    const [lang, setLang] = useState('en-IN');
    const [transcript, setTranscript] = useState('');
    const [botResponse, setBotResponse] = useState(null);

    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const recognitionRef = useRef(null);
    const transcriptRef = useRef('');
    const isListeningRef = useRef(false);
    const stopListeningRef = useRef(null);
    const isSpeakingRef = useRef(false);
    const audioQueueRef = useRef([]);
    const currentAudioRef = useRef(null);
    const navigate = useNavigate();

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    // Init speech recognition on lang change
    useEffect(() => {
        if (SpeechRecognition) {
            const recognition = new SpeechRecognition();
            recognition.continuous = false;
            recognition.lang = lang;
            recognition.interimResults = true;

            recognition.onresult = (event) => {
                const currentTranscript = Array.from(event.results)
                    .map(result => result[0].transcript)
                    .join('');
                transcriptRef.current = currentTranscript;
                setTranscript(currentTranscript);
                if (event.results[0].isFinal) {
                    stopListeningRef.current?.(true);
                }
            };
            recognition.onerror = () => stopListeningRef.current?.(false);
            recognition.onend = () => {
                if (isListeningRef.current) stopListeningRef.current?.(true);
            };
            recognitionRef.current = recognition;
        }
    }, [lang]);

    // Stop all audio playback
    const stopSpeaking = useCallback(() => {
        if (currentAudioRef.current) {
            currentAudioRef.current.pause();
            currentAudioRef.current = null;
        }
        audioQueueRef.current = [];
        isSpeakingRef.current = false;
        setIsSpeaking(false);
    }, []);

    // Play audio queue sequentially with zero-lag chain
    const playQueue = useCallback(async () => {
        if (!isSpeakingRef.current) return;
        if (audioQueueRef.current.length === 0) {
            isSpeakingRef.current = false;
            setIsSpeaking(false);
            return;
        }

        const audioUrl = audioQueueRef.current.shift();
        const audio = new Audio(audioUrl);
        currentAudioRef.current = audio;

        audio.onended = () => {
            URL.revokeObjectURL(audioUrl);
            currentAudioRef.current = null;
            playQueue(); // chain next sentence immediately
        };
        audio.onerror = () => {
            URL.revokeObjectURL(audioUrl);
            currentAudioRef.current = null;
            playQueue(); // skip broken chunk, continue
        };
        try {
            await audio.play();
        } catch (e) {
            currentAudioRef.current = null;
            playQueue();
        }
    }, []);

    // Zero-lag sentence-by-sentence TTS
    const speak = useCallback(async (text) => {
        stopSpeaking();
        if (!text?.trim()) return;

        const sentences = splitSentences(text);
        if (sentences.length === 0) return;

        isSpeakingRef.current = true;
        setIsSpeaking(true);

        // Immediately start fetching the first sentence; fire off the rest in parallel
        try {
            // Fetch first chunk synchronously so voice starts ASAP
            const firstRes = await postTTS(sentences[0], selectedVoice);
            if (!isSpeakingRef.current) return; // aborted
            const firstUrl = URL.createObjectURL(firstRes.data);
            audioQueueRef.current = [firstUrl];

            // Start parallel prefetch for remaining sentences
            const remainingFetches = sentences.slice(1).map(s =>
                postTTS(s, selectedVoice)
                    .then(res => URL.createObjectURL(res.data))
                    .catch(() => null)
            );

            // Begin playing immediately
            playQueue();

            // As remaining URLs resolve, push into queue
            for (const fetchPromise of remainingFetches) {
                const url = await fetchPromise;
                if (!isSpeakingRef.current) break;
                if (url) audioQueueRef.current.push(url);
            }
        } catch (err) {
            console.error('[DoctorVoiceAssistant] TTS error:', err);
            isSpeakingRef.current = false;
            setIsSpeaking(false);
        }
    }, [selectedVoice, stopSpeaking, playQueue]);

    const startListening = async () => {
        setBotResponse(null);
        setIsOpen(true);
        stopSpeaking();
        transcriptRef.current = '';
        setTranscript('');

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);
            mediaRecorder.onstop = async () => {
                const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                stream.getTracks().forEach(t => t.stop());
                await processCommand(blob, transcriptRef.current);
            };

            mediaRecorder.start();
            if (recognitionRef.current) recognitionRef.current.start();
            isListeningRef.current = true;
            setIsListening(true);
        } catch (err) {
            console.error('Mic access denied', err);
            alert('Microphone access is required for the Voice Assistant.');
        }
    };

    const stopListening = useCallback((process = true) => {
        if (recognitionRef.current) recognitionRef.current.stop();
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
        }
        isListeningRef.current = false;
        setIsListening(false);
        if (!process) setIsOpen(false);
    }, []);

    stopListeningRef.current = stopListening;

    const toggleVoice = () => {
        // Resume AudioContext to unlock autoplay policy
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            if (ctx.state === 'suspended') ctx.resume();
        } catch (_) {}

        if (isListening) stopListening(true);
        else startListening();
    };

    const processCommand = async (audioBlob, transcriptText) => {
        setIsProcessing(true);
        try {
            const formData = new FormData();
            formData.append('audio', audioBlob, 'voice_command.wav');
            if (transcriptText) formData.append('text', transcriptText);
            if (patientId) formData.append('context_patient_id', patientId);

            const { data } = await sendDoctorVoiceQuery(formData);

            if (data.routing_type === 'ACTION_REQUIRED' && data.action_payload?.url) {
                navigate(data.action_payload.url);
            }

            const responseText = data.summary || "I'm sorry, I couldn't process that.";
            setBotResponse(responseText);
            await speak(responseText);
        } catch (err) {
            console.error(err);
            const errMsg = "I'm sorry, I couldn't process that command.";
            setBotResponse(errMsg);
            await speak(errMsg);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleClose = () => {
        setIsOpen(false);
        setBotResponse(null);
        stopSpeaking();
    };

    return (
        <div style={{
            position: 'fixed', bottom: '30px', right: '30px',
            zIndex: 9999, display: 'flex', flexDirection: 'column',
            alignItems: 'flex-end', gap: '12px'
        }}>
            {/* Panel */}
            {isOpen && (
                <div style={{
                    background: 'rgba(15, 17, 23, 0.92)',
                    backdropFilter: 'blur(24px)',
                    border: '1px solid rgba(99, 102, 241, 0.3)',
                    boxShadow: '0 8px 40px rgba(99, 102, 241, 0.2)',
                    borderRadius: '20px',
                    padding: '1.25rem',
                    width: '340px',
                    color: 'var(--text-main)',
                    position: 'relative',
                    animation: 'fadeInUp 0.25s ease-out'
                }}>
                    <button onClick={handleClose} style={{
                        position: 'absolute', top: '12px', right: '12px',
                        background: 'none', border: 'none', color: 'var(--text-secondary)',
                        cursor: 'pointer', padding: '4px', borderRadius: '6px',
                        transition: 'color 0.2s'
                    }}>
                        <X size={16} />
                    </button>

                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '10px' }}>
                        <div style={{
                            width: '32px', height: '32px', borderRadius: '50%',
                            background: isListening ? 'rgba(239, 68, 68, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            border: `1px solid ${isListening ? 'rgba(239,68,68,0.4)' : 'rgba(99,102,241,0.4)'}`
                        }}>
                            {isProcessing
                                ? <Loader size={16} style={{ color: '#a78bfa', animation: 'spin 1s linear infinite' }} />
                                : isSpeaking
                                    ? <Volume2 size={16} style={{ color: '#a78bfa' }} />
                                    : <Mic size={16} style={{ color: isListening ? '#ef4444' : '#818cf8' }} />
                            }
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: '700', fontSize: '0.85rem', color: '#a78bfa', letterSpacing: '0.3px' }}>Sentia Voice</div>
                            <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', opacity: 0.7 }}>
                                {isListening ? '🔴 Listening...' : isProcessing ? '⚡ Processing...' : isSpeaking ? '🔊 Speaking...' : 'Ready'}
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '6px' }}>
                            <select value={lang} onChange={(e) => setLang(e.target.value)} style={{
                                background: 'rgba(255,255,255,0.04)', color: 'var(--text-secondary)',
                                border: '1px solid var(--glass-border)', borderRadius: '6px',
                                padding: '2px 5px', fontSize: '10px', cursor: 'pointer', outline: 'none'
                            }}>
                                <option value="en-IN">EN</option>
                                <option value="hi-IN">HI</option>
                            </select>
                            <select value={selectedVoice} onChange={(e) => setSelectedVoice(e.target.value)} style={{
                                background: 'rgba(255,255,255,0.04)', color: 'var(--text-secondary)',
                                border: '1px solid var(--glass-border)', borderRadius: '6px',
                                padding: '2px 5px', fontSize: '10px', cursor: 'pointer', outline: 'none'
                            }}>
                                {SARVAM_VOICES.map(v => <option key={v} value={v}>{v.charAt(0).toUpperCase() + v.slice(1)}</option>)}
                            </select>
                            {isSpeaking && (
                                <button onClick={stopSpeaking} title="Stop Speaking" style={{
                                    background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                                    borderRadius: '6px', padding: '2px 6px', cursor: 'pointer', color: '#f87171'
                                }}>
                                    <VolumeX size={12} />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Content */}
                    <div style={{ fontSize: '0.9rem', lineHeight: '1.6', minHeight: '56px', display: 'flex', alignItems: 'center' }}>
                        {isListening && (
                            <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                                {transcript ? (
                                    <><span style={{ color: 'var(--text-secondary)' }}>Heard: </span><span style={{ color: 'var(--text-main)' }}>{transcript}</span></>
                                ) : 'Speak clearly into your microphone...'}
                            </span>
                        )}
                        {isProcessing && (
                            <span style={{ color: '#a78bfa', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} />
                                Consulting clinical data...
                            </span>
                        )}
                        {!isListening && !isProcessing && botResponse && (
                            <span style={{ color: 'var(--text-main)' }}>{botResponse}</span>
                        )}
                        {!isListening && !isProcessing && !botResponse && (
                            <span style={{ color: 'var(--text-secondary)', opacity: 0.5, fontSize: '0.82rem' }}>
                                Ask about patient data, risk levels, or say hello.
                            </span>
                        )}
                    </div>
                </div>
            )}

            {/* Floating Mic Button */}
            <button
                onClick={toggleVoice}
                title="Sentia Voice Assistant"
                style={{
                    width: '58px', height: '58px', borderRadius: '50%',
                    background: isListening
                        ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                        : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                    color: 'white', border: 'none',
                    boxShadow: isListening
                        ? '0 0 0 4px rgba(239,68,68,0.2), 0 8px 24px rgba(0,0,0,0.4)'
                        : '0 0 0 4px rgba(99,102,241,0.15), 0 8px 24px rgba(0,0,0,0.4)',
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.3s ease',
                    position: 'relative'
                }}
            >
                {isListening ? (
                    <>
                        <MicOff size={26} />
                        <span style={{
                            position: 'absolute', inset: '-4px',
                            borderRadius: '50%',
                            border: '2px solid rgba(239,68,68,0.5)',
                            animation: 'pulsering 1.5s ease-out infinite'
                        }} />
                    </>
                ) : isProcessing ? (
                    <Loader size={26} style={{ animation: 'spin 1s linear infinite' }} />
                ) : (
                    <Mic size={26} />
                )}
            </button>

            <style>{`
                @keyframes pulsering {
                    0% { transform: scale(1); opacity: 0.8; }
                    70% { transform: scale(1.4); opacity: 0; }
                    100% { transform: scale(1.4); opacity: 0; }
                }
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(12px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes spin { 100% { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
};

export default DoctorVoiceAssistant;
