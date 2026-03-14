import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, MicOff, Loader, Activity, X } from 'lucide-react';
import { sendDoctorVoiceQuery, postTTS } from '../api';

const SARVAM_VOICES = ['aditya', 'ritu', 'ashutosh', 'priya', 'neha', 'rahul', 'pooja', 'rohan', 'simran', 'kavya', 'amit', 'dev', 'ishita', 'shreya', 'ratan', 'varun', 'manan', 'sumit', 'roopa', 'kabir', 'aayan', 'shubh', 'advait', 'amelia', 'sophia', 'anand', 'tanya', 'tarun', 'sunny', 'mani', 'gokul', 'vijay', 'shruti', 'suhani', 'mohit', 'kavitha', 'rehan', 'soham', 'rupali'];

const DoctorVoiceAssistant = ({ patientId = null }) => {
    const [isListening, setIsListening] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [botResponse, setBotResponse] = useState(null);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [selectedVoice, setSelectedVoice] = useState('ishita');
    const [lang, setLang] = useState('en-IN'); 
    const [transcript, setTranscript] = useState('');

    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const recognitionRef = useRef(null);
    const audioPlayerRef = useRef(null);
    const transcriptRef = useRef('');
    // Bug 5 Fix: use a ref to track listening state inside closures (avoids stale closure)
    const isListeningRef = useRef(false);
    const navigate = useNavigate();
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    // Bug 4 Fix: Only re-init recognition on language change, NOT on isListening change
    // This prevents destroying the recognition object while it is actively listening.
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
                    stopListeningRef.current(true);
                }
            };

            recognition.onerror = () => stopListeningRef.current(false);
            // Bug 5 Fix: use ref instead of stale closure for isListening
            recognition.onend = () => {
                if (isListeningRef.current) stopListeningRef.current(true);
            };
            recognitionRef.current = recognition;
        }
    }, [lang]); // Re-init ONLY on language change

    // Bug 5 Fix: stable ref to stopListening so it can be called from recognition closures
    const stopListeningRef = useRef(null);

    const startListening = async () => {
        setBotResponse(null);
        setIsOpen(true);
        if (audioPlayerRef.current) audioPlayerRef.current.pause();
        setIsSpeaking(false);
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
                await processAudioCommand(blob, transcriptRef.current);
            };

            mediaRecorder.start();
            if (recognitionRef.current) recognitionRef.current.start();
            isListeningRef.current = true;
            setIsListening(true);
        } catch (err) {
            console.error("Mic access denied", err);
            alert("Microphone access is required for the Voice Assistant.");
        }
    };

    const stopListening = (process = true) => {
        if (recognitionRef.current) recognitionRef.current.stop();
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop(); // This triggers onstop -> processAudioCommand
        }
        isListeningRef.current = false;
        setIsListening(false);
        if (!process) setIsOpen(false);
    };

    // Keep ref always up to date with the latest version of stopListening
    stopListeningRef.current = stopListening;

    const toggleVoice = () => {
        // Resume AudioContext if it exists (for browser autocomplete policies)
        if (window.AudioContext || window.webkitAudioContext) {
            const context = new (window.AudioContext || window.webkitAudioContext)();
            if (context.state === 'suspended') context.resume();
        }
        
        if (isListening) stopListening(true);
        else startListening();
    };

    const processAudioCommand = async (audioBlob, transcript) => {
        setIsProcessing(true);
        try {
            const formData = new FormData();
            formData.append('audio', audioBlob, 'voice_command.wav');
            if (transcript) {
                formData.append('text', transcript);
            }
            if (patientId) {
                formData.append('context_patient_id', patientId);
            }

            const { data } = await sendDoctorVoiceQuery(formData);

            // Handle Routing if requested
            if (data.routing_type === "ACTION_REQUIRED" && data.action_payload && data.action_payload.url) {
                navigate(data.action_payload.url);
            }

            await speak(data.summary);
            setBotResponse(data.summary);

        } catch (err) {
            console.error(err);
            setBotResponse("I'm sorry, I couldn't process that command.");
        } finally {
            setIsProcessing(false);
        }
    };

    const speak = async (text) => {
        if (audioPlayerRef.current) {
            audioPlayerRef.current.pause();
            audioPlayerRef.current.currentTime = 0;
            setIsSpeaking(false);
        }

        try {
            const { data } = await postTTS(text, selectedVoice);
            const audioUrl = URL.createObjectURL(data);
            const audio = new Audio(audioUrl);
            audioPlayerRef.current = audio;

            audio.onended = () => {
                setIsSpeaking(false);
                URL.revokeObjectURL(audioUrl);
            };
            audio.onerror = () => {
                setIsSpeaking(false);
                URL.revokeObjectURL(audioUrl);
            };

            setIsSpeaking(true);
            // Resume AudioContext to unblock autoplay policy
            if (window.AudioContext || window.webkitAudioContext) {
                try {
                    const ctx = new (window.AudioContext || window.webkitAudioContext)();
                    if (ctx.state === 'suspended') await ctx.resume();
                } catch (_) {}
            }
            await audio.play();
        } catch (error) {
            console.error("TTS Audio Failed:", error);
            setIsSpeaking(false);
        }
    };

    const handleClose = () => {
        setIsOpen(false);
        setBotResponse(null);
        if (audioPlayerRef.current) audioPlayerRef.current.pause();
        setIsSpeaking(false);
    };

    return (
        <div style={{
            position: 'fixed',
            bottom: '30px',
            right: '30px',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: '15px'
        }}>

            {/* Chat Bubble Overlay */}
            {isOpen && (
                <div className="glass-panel" style={{
                    background: 'var(--nav-bg)',
                    border: '1px solid var(--primary-blue)',
                    boxShadow: '0 8px 32px rgba(99, 102, 241, 0.2)',
                    borderRadius: '16px',
                    padding: '1.5rem',
                    width: '320px',
                    color: 'var(--text-main)',
                    position: 'relative',
                    animation: 'fadeIn 0.2s ease-out'
                }}>
                    <button
                        onClick={handleClose}
                        style={{ position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                    >
                        <X size={16} />
                    </button>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{
                                background: isListening ? 'rgba(239, 68, 68, 0.2)' : 'rgba(99, 102, 241, 0.2)',
                                color: isListening ? '#ef4444' : 'var(--primary-blue)',
                                padding: '8px',
                                borderRadius: '50%'
                            }}>
                                {isProcessing ? <Activity size={18} className="spin-slow" /> : <Activity size={18} />}
                            </div>
                            <span style={{ fontWeight: 'bold', fontSize: '0.9rem', color: 'var(--primary-blue)' }}>Sentia Voice</span>
                        </div>
                        <div style={{ display: 'flex', gap: '5px', alignItems: 'center', marginRight: '20px' }}>
                            <select 
                                value={lang} 
                                onChange={(e) => setLang(e.target.value)}
                                style={{ background: 'var(--bg-main)', color: 'var(--text-main)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '2px 4px', fontSize: '11px', cursor: 'pointer', outline: 'none' }}
                                title="Recognition Language"
                            >
                                <option value="en-IN">English (IN)</option>
                                <option value="hi-IN">Hindi</option>
                            </select>
                            <select 
                                value={selectedVoice} 
                                onChange={(e) => setSelectedVoice(e.target.value)}
                                style={{ background: 'var(--bg-main)', color: 'var(--text-main)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '2px 4px', fontSize: '11px', cursor: 'pointer', outline: 'none' }}
                                title="Speaker Voice"
                            >
                                {SARVAM_VOICES.map(v => <option key={v} value={v}>{v.charAt(0).toUpperCase() + v.slice(1)}</option>)}
                            </select>
                        </div>
                    </div>

                    <div style={{ fontSize: '0.95rem', lineHeight: '1.5', minHeight: '60px', display: 'flex', alignItems: 'center' }}>
                        {isListening && <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>Listening: <span style={{ color: 'var(--text-main)' }}>{transcript || "Speak clearly into your microphone..."}</span></span>}
                        {isProcessing && <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '8px' }}><Loader size={14} className="spin" /> Analyzing voice...</span>}
                        {!isListening && !isProcessing && botResponse && <span>{botResponse}</span>}
                    </div>
                </div>
            )}

            {/* Floating Action Button */}
            <button
                onClick={toggleVoice}
                style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '30px',
                    background: isListening ? '#ef4444' : 'var(--primary-blue)',
                    color: 'white',
                    border: 'none',
                    boxShadow: isListening ? '0 0 20px rgba(239, 68, 68, 0.5)' : '0 4px 15px rgba(0,0,0,0.3)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.3s ease'
                }}
                title="Ask Sentia (Voice Assistant)"
            >
                {isListening ? (
                    <div style={{ position: 'relative' }}>
                        <MicOff size={28} style={{ position: 'relative', zIndex: 2 }} />
                        <div style={{
                            position: 'absolute', top: '-10px', left: '-10px', right: '-10px', bottom: '-10px',
                            border: '2px solid rgba(255,255,255,0.5)', borderRadius: '50%',
                            animation: 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite'
                        }}></div>
                    </div>
                ) : (
                    <Mic size={28} />
                )}
            </button>
            <style>{`
                @keyframes ping {
                    75%, 100% { transform: scale(1.5); opacity: 0; }
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .spin { animation: spin 1s linear infinite; }
                .spin-slow { animation: spin 3s linear infinite; }
                @keyframes spin { 100% { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
};

export default DoctorVoiceAssistant;
