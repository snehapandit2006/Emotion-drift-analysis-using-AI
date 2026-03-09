import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Mic, Send, Volume2, VolumeX, Bot, Sparkles, MicOff } from 'lucide-react';
import { postBotChat, postBotChatAudio, postTTS } from '../api';
import './FloatingRobot.css';
import SentiaFullScreenChat from './SentiaFullScreenChat';

const RobotCharacter = ({ isListening, isSpeaking }) => {
    return (
        <div className={`robot-character ${isListening ? 'listening' : ''} ${isSpeaking ? 'speaking' : ''}`}>
            <div className="robot-aura"></div>
            <div className="robot-head">
                <div className="robot-eyes">
                    <div className="robot-eye blink"></div>
                    <div className="robot-eye blink"></div>
                </div>
            </div>
        </div>
    );
};

const FloatingRobot = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { text: "Hello! I'm Sentia. I'm here to listen and support you. How are you feeling today?", isBot: true }
    ]);
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isTtsEnabled, setIsTtsEnabled] = useState(true);
    const [isAutoSend, setIsAutoSend] = useState(true);
    const chatEndRef = useRef(null);

    const [audioBlob, setAudioBlob] = useState(null);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const audioPlayerRef = useRef(null);

    // Web Speech API - Recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognitionRef = useRef(null);

    useEffect(() => {
        if (SpeechRecognition) {
            const recognition = new SpeechRecognition();
            recognition.continuous = false;
            recognition.lang = 'en-US';
            recognition.interimResults = true;

            recognition.onresult = (event) => {
                const transcript = Array.from(event.results)
                    .map(result => result[0])
                    .map(result => result.transcript)
                    .join('');

                setInputText(transcript);

                if (event.results[0].isFinal) {
                    setIsListening(false);
                    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
                        mediaRecorderRef.current.stop();
                    }
                    if (isAutoSend) {
                        // Small delay to ensure audioBlob is set before handleSend is called
                        // or better, trigger handleSend in recognition.onend if final
                    }
                }
            };

            recognition.onerror = (event) => {
                console.error("Speech Recognition Error:", event.error);
                setIsListening(false);
                if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
                    mediaRecorderRef.current.stop();
                }
            };

            recognition.onend = () => {
                setIsListening(false);
                if (isAutoSend && inputText.trim()) {
                    // Logic to auto-submit will be triggered here
                    // But we need to wait for audioBlob to be ready
                }
            };

            recognitionRef.current = recognition;
        }
    }, [SpeechRecognition, isAutoSend, inputText]);

    const startAudioRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
                setAudioBlob(blob);
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
        } catch (err) {
            console.error("Error accessing microphone:", err);
        }
    };

    const toggleListening = () => {
        if (!recognitionRef.current) {
            alert("Speech recognition is not supported in your browser.");
            return;
        }
        if (isListening) {
            recognitionRef.current.stop();
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
                mediaRecorderRef.current.stop();
            }
        } else {
            setInputText('');
            recognitionRef.current.start();
            setIsListening(true);
            startAudioRecording();
        }
    };

    // TTS Integration API - Synthesis
    const speak = async (text) => {
        if (!isTtsEnabled) return;

        if (audioPlayerRef.current) {
            audioPlayerRef.current.pause();
            audioPlayerRef.current.currentTime = 0;
            setIsSpeaking(false);
        }

        try {
            const { data } = await postTTS(text);
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
            await audio.play();
        } catch (error) {
            console.error("TTS Audio Failed:", error);
            setIsSpeaking(false);
        }
    };

    const isSubmitting = useRef(false);

    const handleSend = async () => {
        const textToSend = inputText.trim();
        if (!textToSend || isLoading || isSubmitting.current) return;

        isSubmitting.current = true;
        setMessages(prev => [...prev, { text: textToSend, isBot: false }]);
        setInputText('');
        setIsLoading(true);

        try {
            let response;
            // ---------------------------------------------------------
            // PHASE 3: MULTI-MODAL BRIDGE (TEXT + AUDIO)
            // ---------------------------------------------------------
            if (audioBlob) {
                const formData = new FormData();
                formData.append('text', textToSend);
                formData.append('audio', audioBlob, 'voice_input.wav');

                const { data } = await postBotChatAudio(formData);
                response = data;
                setAudioBlob(null); // Reset for next turn
            } else {
                const { data } = await postBotChat(textToSend);
                response = data;
            }

            const botMsg = response.response;
            await speak(botMsg);
            setMessages(prev => [...prev, { text: botMsg, isBot: true }]);
            window.dispatchEvent(new CustomEvent('refresh-dashboard'));
        } catch (error) {
            console.error("Bot chat error:", error);
            const fallbackMsg = "I'm having a little trouble connecting right now, but I'm still here. Could you try sharing that one more time?";
            await speak(fallbackMsg);
            setMessages(prev => [...prev, { text: fallbackMsg, isBot: true }]);
        } finally {
            setIsLoading(false);
            isSubmitting.current = false;
        }
    };

    // Trigger handleSend automatically if auto-send is on and audioBlob is ready
    useEffect(() => {
        if (isAutoSend && audioBlob && !isListening && inputText.trim()) {
            handleSend();
        }
    }, [audioBlob, isListening, isAutoSend]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    return (
        <div className="floating-robot-container" style={{ position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 1000 }}>
            <AnimatePresence>
                {isOpen && (
                    <SentiaFullScreenChat onClose={() => setIsOpen(false)} />
                )}
            </AnimatePresence>

            {/* Floating Toggle Button */}
            <motion.button
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    width: '72px',
                    height: '72px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--primary-blue), #00d4ff)',
                    border: 'none',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 12px 40px rgba(0, 150, 255, 0.4)',
                    position: 'relative',
                    overflow: 'visible'
                }}
            >
                <RobotCharacter isListening={isListening} isSpeaking={isSpeaking} />

                {/* Ping Animation */}
                {!isOpen && (
                    <motion.div
                        animate={{
                            scale: [1, 1.4, 1],
                            opacity: [0.6, 0, 0.6]
                        }}
                        transition={{
                            duration: 2.5,
                            repeat: Infinity,
                            ease: "easeInOut"
                        }}
                        style={{
                            position: 'absolute',
                            top: -10,
                            left: -10,
                            right: -10,
                            bottom: -10,
                            borderRadius: '50%',
                            border: '2px solid var(--primary-blue)',
                            zIndex: -1
                        }}
                    />
                )}
            </motion.button>

            <style>{`
                .header-icon-btn:hover { background: rgba(255,255,255,0.2) !important; }
                .dot-pulse {
                    width: 10px;
                    height: 10px;
                    border-radius: 50%;
                    background-color: var(--primary-blue);
                    animation: pulse 1.5s infinite ease-in-out;
                }
                @keyframes pulse {
                    0%, 100% { transform: scale(0.6); opacity: 0.4; }
                    50% { transform: scale(1); opacity: 1; }
                }
            `}</style>
        </div>
    );
};

export default FloatingRobot;
