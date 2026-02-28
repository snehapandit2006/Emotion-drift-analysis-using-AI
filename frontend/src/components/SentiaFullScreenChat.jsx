import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus, ChevronLeft, ChevronRight, History,
    Trash2, Send, Mic, Volume2, VolumeX, Sparkles, X,
    LogOut, Terminal, Activity, MicOff
} from 'lucide-react';
import {
    getSentiaConversations,
    getSentiaHistory,
    postSentiaMessage,
    deleteSentiaConversation
} from '../api';
import './SentiaChat.css';
import './FloatingRobot.css';

const RobotMascot = ({ isListening, isSpeaking }) => (
    <div className={`robot-character ${isListening ? 'listening' : ''} ${isSpeaking ? 'speaking' : ''}`}
        style={{ transform: 'scale(1.2)' }}>
        <div className="robot-aura"></div>
        <div className="robot-head">
            <div className="robot-eyes">
                <div className="robot-eye blink"></div>
                <div className="robot-eye blink"></div>
            </div>
        </div>
    </div>
);

const SentiaFullScreenChat = ({ onClose }) => {
    const [conversations, setConversations] = useState([]);
    const [activeConvId, setActiveConvId] = useState(null);
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [isTtsEnabled, setIsTtsEnabled] = useState(true);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [audioBlob, setAudioBlob] = useState(null);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const chatEndRef = useRef(null);

    // Audio Refs
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const recognitionRef = useRef(null);
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    useEffect(() => {
        loadConversations();
        setupSpeechRecognition();
    }, []);

    const setupSpeechRecognition = () => {
        if (SpeechRecognition) {
            const recognition = new SpeechRecognition();
            recognition.continuous = false;
            recognition.lang = 'en-US';
            recognition.interimResults = true;

            recognition.onresult = (event) => {
                const transcript = Array.from(event.results)
                    .map(result => result[0].transcript)
                    .join('');
                setInputText(transcript);
                if (event.results[0].isFinal) {
                    stopListeningAndRecord();
                }
            };

            recognition.onerror = () => setIsListening(false);
            recognition.onend = () => setIsListening(false);
            recognitionRef.current = recognition;
        }
    };

    const startListening = async () => {
        if (!recognitionRef.current) return alert("Speech recognition not supported.");
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);
            mediaRecorder.onstop = () => {
                const blob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
                setAudioBlob(blob);
                stream.getTracks().forEach(t => t.stop());
            };

            mediaRecorder.start();
            recognitionRef.current.start();
            setIsListening(true);
        } catch (err) {
            console.error("Mic access denied", err);
        }
    };

    const stopListeningAndRecord = () => {
        if (recognitionRef.current) recognitionRef.current.stop();
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
        }
        setIsListening(false);
    };

    const toggleVoice = () => {
        if (isListening) stopListeningAndRecord();
        else startListening();
    };

    const loadConversations = async () => {
        try {
            const { data } = await getSentiaConversations();
            setConversations(data);
        } catch (err) { console.error(err); }
    };

    const loadHistory = async (id) => {
        setActiveConvId(id);
        setIsLoading(true);
        try {
            const { data } = await getSentiaHistory(id);
            setMessages(data.map(m => ({
                text: m.content,
                isBot: m.role === 'bot',
                emotion: m.emotion,
                timestamp: m.timestamp,
                trace: m.trace
            })));
        } finally { setIsLoading(false); }
    };

    const handleNewChat = () => {
        setActiveConvId(null);
        setMessages([]);
        setInputText('');
    };

    const handleSend = async () => {
        if (!inputText.trim() && !audioBlob) return;

        const currentText = inputText;
        const tempMsg = { text: currentText || "Analyzing voice...", isBot: false, timestamp: new Date().toISOString() };
        setMessages(prev => [...prev, tempMsg]);
        setInputText('');
        setIsLoading(true);

        try {
            const formData = new FormData();
            formData.append('text', currentText);
            if (audioBlob) formData.append('audio', audioBlob, 'voice.wav');
            if (activeConvId) formData.append('conversation_id', activeConvId);

            const { data } = await postSentiaMessage(formData);

            if (!activeConvId) {
                setActiveConvId(data.conversation_id);
                loadConversations();
            }

            const botMsg = {
                text: data.response,
                isBot: true,
                emotion: data.emotion,
                trace: data.trace,
                timestamp: new Date().toISOString()
            };
            setMessages(prev => [...prev, botMsg]);
            if (isTtsEnabled) speak(data.response);

            // Sync dashboard visuals
            window.dispatchEvent(new CustomEvent('refresh-dashboard'));

        } catch (err) {
            setMessages(prev => [...prev, { text: "I'm having a brief issue. Try again?", isBot: true }]);
        } finally {
            setIsLoading(false);
            setAudioBlob(null);
        }
    };

    const speak = (text) => {
        if (!isTtsEnabled || !window.speechSynthesis) return;
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);
        window.speechSynthesis.speak(utterance);
    };

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="sentia-fs-container" >
            <AnimatePresence>
                {sidebarOpen && (
                    <motion.div initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }} className="sentia-sidebar" >
                        <button onClick={handleNewChat} className="sentia-new-chat-btn"> <Plus size={18} /> New Conversation </button>
                        <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
                            <div style={{ fontSize: '10px', color: '#6b7280', fontWeight: 'bold', marginBottom: '1rem', letterSpacing: '1px' }}>HISTORY</div>
                            {conversations.map(conv => (
                                <div key={conv.id} onClick={() => loadHistory(conv.id)} className={`sentia-history-item ${activeConvId === conv.id ? 'active' : ''}`} >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                                        <History size={14} style={{ color: '#6b7280' }} />
                                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '14px' }}>{conv.title}</span>
                                    </div>
                                    <button onClick={(e) => { e.stopPropagation(); if (confirm("Delete?")) deleteSentiaConversation(conv.id).then(loadConversations); }} style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer' }}> <Trash2 size={14} /> </button>
                                </div>
                            ))}
                        </div>
                        <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid #1f2937' }}>
                            <button onClick={onClose} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer' }}> <LogOut size={16} /> Exit Sentia </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="sentia-main">
                <header className="sentia-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <RobotMascot isListening={isListening} isSpeaking={isSpeaking || isLoading} />
                        <div>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: '0' }}>Sentia</h2>
                            <p style={{ fontSize: '10px', color: '#9ca3af', margin: '0' }}>AI EMOTIONAL ANALYST</p>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button onClick={() => setIsTtsEnabled(!isTtsEnabled)} style={{ background: '#1f2937', border: '1px solid #374151', padding: '10px', borderRadius: '12px', color: isTtsEnabled ? '#3b82f6' : '#9ca3af', cursor: 'pointer' }}> {isTtsEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />} </button>
                        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer' }}> <X size={24} /> </button>
                    </div>
                </header>

                <div className="sentia-messages">
                    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                        {messages.length === 0 && (
                            <div style={{ textAlign: 'center', marginTop: '15vh', opacity: '0.4' }}> <Sparkles size={64} style={{ color: '#3b82f6', marginBottom: '1rem' }} /> <h3>How can I support you today?</h3> </div>
                        )}
                        {messages.map((msg, i) => (
                            <div key={i} className={`sentia-msg-wrapper ${msg.isBot ? 'bot' : 'user'}`}>
                                <div className={`sentia-msg-bubble ${msg.isBot ? 'bot' : 'user'}`}>
                                    <p style={{ margin: '0', fontSize: '15px' }}>{msg.text}</p>
                                    {msg.isBot && msg.emotion && (<span style={{ fontSize: '9px', fontWeight: 'bold', color: '#3b82f6', display: 'block', marginTop: '5px' }}> EMOTION: {msg.emotion.toUpperCase()} </span>)}
                                </div>
                            </div>
                        ))}
                    </div>
                    <div ref={chatEndRef} />
                </div>

                <div className="sentia-input-area">
                    <div className="sentia-input-container">
                        <button
                            onClick={toggleVoice}
                            style={{ padding: '1rem', background: 'none', border: 'none', color: isListening ? '#ef4444' : '#9ca3af', cursor: 'pointer' }}
                        >
                            {isListening ? <MicOff size={24} /> : <Mic size={24} />}
                        </button>
                        <input
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                            placeholder={isListening ? "Listening..." : "Type a message..."}
                            className="sentia-input"
                        />
                        <button onClick={handleSend} disabled={(!inputText.trim() && !audioBlob) || isLoading} className="sentia-send-btn" >
                            <Send size={24} />
                        </button>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default SentiaFullScreenChat;
