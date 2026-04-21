import React, { useState, useEffect, useRef, useContext, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus, ChevronLeft, ChevronRight, History,
    Trash2, Send, Mic, Volume2, VolumeX, Sparkles, X,
    LogOut, Terminal, MicOff, MonitorPlay, BrainCircuit, Network, Cpu, Activity, RefreshCw, Layers
} from 'lucide-react';
import {
    getSentiaConversations,
    getSentiaHistory,
    postSentiaMessage,
    deleteSentiaConversation,
    postTTS
} from '../api';
import './SentiaChat.css';
import AuthContext from '../context/AuthContext';

const SARVAM_VOICES = ['aditya', 'ritu', 'ashutosh', 'priya', 'neha', 'rahul', 'pooja', 'rohan', 'simran', 'kavya', 'amit', 'dev', 'ishita', 'shreya', 'ratan', 'varun', 'manan', 'sumit', 'roopa', 'kabir', 'aayan', 'shubh', 'advait', 'amelia', 'sophia', 'anand', 'tanya', 'tarun', 'sunny', 'mani', 'gokul', 'vijay', 'shruti', 'suhani', 'mohit', 'kavitha', 'rehan', 'soham', 'rupali'];

const SentiaMascot = ({ active, type = 'neural', mouthVolume = 0 }) => {
    return (
        <div style={{ position: 'relative', width: '200px', height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {/* Pulsing Aura */}
            <motion.div 
                animate={{ 
                    scale: active ? [1, 1.2, 1] : [1, 1.05, 1],
                    opacity: active ? [0.4, 0.7, 0.4] : [0.2, 0.4, 0.2]
                }}
                transition={{ repeat: Infinity, duration: 3 }}
                style={{ 
                    position: 'absolute', width: '250px', height: '250px', 
                    background: 'radial-gradient(circle, var(--accent-purple) 0%, transparent 70%)',
                    borderRadius: '50%', filter: 'blur(40px)', pointerEvents: 'none'
                }}
            />

            {/* Core Orb */}
            <motion.div 
                animate={{ y: [0, -10, 0] }}
                transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                style={{ 
                    width: '120px', height: '120px', borderRadius: '50%',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--glass-highlight)',
                    backdropFilter: 'blur(20px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: 'inset 0 0 20px rgba(255,255,255,0.1)',
                    position: 'relative', zIndex: 2
                }}
            >
                {/* Visualizer Lines */}
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    {[...Array(5)].map((_, i) => (
                        <motion.div 
                            key={i}
                            animate={{ height: active ? [10, 40, 10] : [10, 15, 10] }}
                            transition={{ repeat: Infinity, duration: 0.5, delay: i * 0.1 }}
                            style={{ width: '4px', background: 'var(--accent-purple)', borderRadius: '10px', boxShadow: '0 0 10px var(--accent-purple)' }}
                        />
                    ))}
                </div>
            </motion.div>

            {/* Orbital Rings */}
            {[...Array(3)].map((_, i) => (
                <motion.div 
                    key={i}
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 10 + (i * 5), ease: "linear" }}
                    style={{ 
                        position: 'absolute', width: `${140 + (i * 40)}px`, height: `${140 + (i * 40)}px`,
                        borderRadius: '50%', border: '1px solid rgba(255,255,255,0.05)',
                        pointerEvents: 'none'
                    }}
                >
                    <div style={{ 
                        position: 'absolute', top: '50%', left: '-2px', 
                        width: '4px', height: '4px', borderRadius: '50%', 
                        background: 'white', opacity: 0.5 
                    }} />
                </motion.div>
            ))}
        </div>
    );
};

const SentiaFullScreenChat = ({ onClose }) => {
    const { user } = useContext(AuthContext);
    const [conversations, setConversations] = useState([]);
    const [activeConvId, setActiveConvId] = useState(null);
    const [messages, setMessages] = useState([
        { text: "Neural link established. Interface synchronized. I am Sentia, your personalized cognitive analyst.", isBot: true, timestamp: new Date().toISOString() }
    ]);
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isTtsEnabled, setIsTtsEnabled] = useState(true);
    const [selectedVoice, setSelectedVoice] = useState('ishita');
    const [viewMode, setViewMode] = useState('chat');
    const [showSidebar, setShowSidebar] = useState(false);
    const chatEndRef = useRef(null);
    const audioPlayerRef = useRef(null);

    // Web Speech API
    const recognitionRef = useRef(null);

    useEffect(() => {
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SR) {
            const recognition = new SR();
            recognition.continuous = true;
            recognition.lang = 'en-US';
            recognition.interimResults = true;

            recognition.onresult = (event) => {
                let finalTranscript = '';
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript + ' ';
                    }
                }
                if (finalTranscript) {
                    setInputText(prev => prev + finalTranscript);
                }
            };

            recognition.onerror = (e) => {
                console.error('Speech error:', e.error);
                setIsListening(false);
            };

            recognition.onend = () => setIsListening(false);

            recognitionRef.current = recognition;
        }
    }, []);

    const toggleListening = () => {
        if (!recognitionRef.current) {
            alert("Speech recognition is not supported in your browser.");
            return;
        }
        if (isListening) {
            recognitionRef.current.stop();
        } else {
            setInputText('');
            recognitionRef.current.start();
            setIsListening(true);
        }
    };

    useEffect(() => {
        const init = async () => {
            try {
                const { data } = await getSentiaConversations();
                setConversations(data);
            } catch (err) { console.error('Failed to load conversations:', err); }
        };
        init();
    }, []);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

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
                trace: m.trace,
                gameLink: m.game_link || null,
                prescribedGame: m.prescribed_game || null
            })));
        } finally { setIsLoading(false); }
    };

    const handleNewChat = () => {
        setActiveConvId(null);
        setMessages([{ text: "Neural link established. Interface synchronized. I am Sentia, your personalized cognitive analyst.", isBot: true, timestamp: new Date().toISOString() }]);
        setShowSidebar(false);
    };

    const handleDeleteChat = async (id, e) => {
        e.stopPropagation();
        if (!window.confirm("Initialize memory wipe for this sequence?")) return;
        try {
            await deleteSentiaConversation(id);
            setConversations(prev => prev.filter(c => c.id !== id));
            if (activeConvId === id) {
                handleNewChat();
            }
        } catch (err) { console.error("Failed to delete chat:", err); }
    };

    const handleSend = async () => {
        if (!inputText.trim()) return;

        const currentText = inputText.trim();
        const userMsg = { text: currentText, isBot: false, timestamp: new Date().toISOString() };
        setMessages(prev => [...prev, userMsg]);
        setInputText('');
        setIsLoading(true);

        try {
            const formData = new FormData();
            formData.append('text', currentText);
            if (activeConvId) formData.append('conversation_id', activeConvId);
            formData.append('speaker', selectedVoice);

            const { data } = await postSentiaMessage(formData);

            if (!activeConvId) {
                setActiveConvId(data.conversation_id);
                loadConversations();
            }

            // Update the last user message with the drift analysis
            setMessages(prev => {
                const newMsgs = [...prev];
                for (let i = newMsgs.length - 1; i >= 0; i--) {
                    if (!newMsgs[i].isBot) {
                        newMsgs[i].emotion = data.emotion;
                        break;
                    }
                }
                return newMsgs;
            });

            const botMsg = {
                text: data.response,
                isBot: true,
                trace: data.trace,
                gameLink: data.game_link,
                prescribedGame: data.prescribed_game,
                binauralLink: data.binaural_link,
                timestamp: new Date().toISOString()
            };
            
            setMessages(prev => [...prev, botMsg]);
            window.dispatchEvent(new CustomEvent('refresh-dashboard'));

            if (isTtsEnabled) {
                if (data.first_chunk_b64 || (data.tts_urls && data.tts_urls.length > 0)) {
                    playChunks(data.first_chunk_b64, data.tts_urls);
                } else {
                    speak(data.response);
                }
            }

        } catch (err) {
            setMessages(prev => [...prev, { text: "Neural drift detected. Connection unstable. Please retry sequence.", isBot: true }]);
        } finally {
            setIsLoading(false);
        }
    };

    const playChunks = async (firstChunkB64, ttsUrls) => {
        if (!isTtsEnabled) return;
        
        setIsSpeaking(true);
        const urlsToPlay = [];
        
        if (firstChunkB64) {
            urlsToPlay.push(`data:audio/wav;base64,${firstChunkB64}`);
            if (ttsUrls && ttsUrls.length > 0) {
                const restUrls = ttsUrls.slice(1).map(url => `${import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'}${url}`);
                urlsToPlay.push(...restUrls);
            }
        } else if (ttsUrls && ttsUrls.length > 0) {
            const allUrls = ttsUrls.map(url => `${import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'}${url}`);
            urlsToPlay.push(...allUrls);
        } else {
            setIsSpeaking(false);
            return;
        }

        let currentIndex = 0;

        const playNext = () => {
            if (currentIndex >= urlsToPlay.length) {
                setIsSpeaking(false);
                return;
            }

            const audio = new Audio(urlsToPlay[currentIndex]);
            audioPlayerRef.current = audio;

            audio.onended = () => {
                currentIndex++;
                playNext();
            };

            audio.onerror = () => {
                console.error("Failed to play audio chunk:", urlsToPlay[currentIndex]);
                currentIndex++;
                playNext();
            };

            audio.play().catch(e => {
                console.error("Audio play error:", e);
                currentIndex++;
                playNext();
            });
        };

        playNext();
    };

    const speak = async (text) => {
        if (!isTtsEnabled) return;

        if (audioPlayerRef.current) {
            audioPlayerRef.current.pause();
            audioPlayerRef.current.currentTime = 0;
            setIsSpeaking(false);
        }

        return new Promise(async (resolve) => {
            try {
                const { data } = await postTTS(text, selectedVoice);
                const audioUrl = URL.createObjectURL(data);
                const audio = new Audio(audioUrl);
                audioPlayerRef.current = audio;

                audio.onplay = () => {
                    setIsSpeaking(true);
                    resolve();
                };

                audio.onended = () => {
                    setIsSpeaking(false);
                    URL.revokeObjectURL(audioUrl);
                };

                audio.onerror = () => {
                    setIsSpeaking(false);
                    URL.revokeObjectURL(audioUrl);
                    resolve();
                };

                await audio.play();
            } catch (error) { 
                console.error("TTS failed:", error); 
                resolve();
            }
        });
    };

    return (
        <div 
            className="sentia-fullscreen-overhaul"
            style={{ 
                height: '100vh', width: '100vw', background: '#0F1117', 
                position: 'fixed', top: 0, left: 0, zIndex: 2000, 
                display: 'flex', flexDirection: 'column', color: 'var(--text-main)',
                overflow: 'hidden'
            }}
        >
            {/* Cinematic Header */}
            <header style={{ height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 3rem', borderBottom: '1px solid var(--glass-border)', background: 'rgba(15, 17, 23, 0.8)', backdropFilter: 'blur(20px)', zIndex: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    <button onClick={() => setShowSidebar(true)} className="glass-button" style={{ width: '40px', height: '40px', padding: 0 }}>
                        <History size={18} />
                    </button>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-purple), var(--accent-blue))', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px rgba(160, 132, 232, 0.4)' }}>
                        <BrainCircuit size={20} color="white" />
                    </div>
                    <div>
                        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: '900', letterSpacing: '-0.5px', margin: 0 }}>SENTIA <span style={{ fontWeight: '400', opacity: 0.5 }}>V3.1</span></h2>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.65rem', fontWeight: '800', color: 'var(--accent-green)', letterSpacing: '1px' }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-green)', boxShadow: '0 0 10px var(--accent-green)' }} /> NEURAL LINK ACTIVE
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div className="glass-panel" style={{ display: 'flex', padding: '4px', borderRadius: '100px', background: 'rgba(255,255,255,0.03)' }}>
                        <button 
                            onClick={() => setViewMode('chat')}
                            style={{ padding: '0.6rem 1.5rem', borderRadius: '100px', border: 'none', background: viewMode === 'chat' ? 'rgba(255,255,255,0.08)' : 'none', color: viewMode === 'chat' ? 'white' : 'var(--text-secondary)', fontSize: '0.7rem', fontWeight: '800', cursor: 'pointer', transition: 'all 0.3s' }}
                        >
                            DIALOGUE
                        </button>
                        <button 
                            onClick={() => setViewMode('viz')}
                            style={{ padding: '0.6rem 1.5rem', borderRadius: '100px', border: 'none', background: viewMode === 'viz' ? 'rgba(255,255,255,0.08)' : 'none', color: viewMode === 'viz' ? 'white' : 'var(--text-secondary)', fontSize: '0.7rem', fontWeight: '800', cursor: 'pointer', transition: 'all 0.3s' }}
                        >
                            VISUALIZER
                        </button>
                    </div>

                    {/* TTS Toggle Button */}
                    <button
                        onClick={() => {
                            const next = !isTtsEnabled;
                            setIsTtsEnabled(next);
                            if (!next && audioPlayerRef.current) {
                                audioPlayerRef.current.pause();
                                setIsSpeaking(false);
                            }
                        }}
                        title={isTtsEnabled ? 'Mute Sentia voice' : 'Unmute Sentia voice'}
                        style={{
                            background: isTtsEnabled ? 'rgba(160,132,232,0.15)' : 'rgba(255,255,255,0.03)',
                            border: isTtsEnabled ? '1px solid rgba(160,132,232,0.5)' : '1px solid var(--glass-border)',
                            borderRadius: '12px',
                            color: isTtsEnabled ? 'var(--accent-purple)' : 'var(--text-secondary)',
                            cursor: 'pointer',
                            padding: '0.5rem 1rem',
                            fontSize: '0.7rem',
                            fontWeight: '800',
                            letterSpacing: '1px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            transition: 'all 0.3s'
                        }}
                    >
                        {isTtsEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                        {isTtsEnabled ? 'VOICE ON' : 'VOICE OFF'}
                    </button>
                    
                    <select 
                        value={selectedVoice} 
                        onChange={(e) => setSelectedVoice(e.target.value)}
                        className="glass-panel"
                        style={{ background: 'rgba(255,255,255,0.03)', color: 'var(--text-secondary)', border: 'none', borderRadius: '12px', padding: '0.6rem 1rem', fontSize: '0.75rem', fontWeight: '700', outline: 'none' }}
                    >
                        {SARVAM_VOICES.map(v => <option key={v} value={v}>{v.charAt(0).toUpperCase() + v.slice(1)}</option>)}
                    </select>

                    <button onClick={onClose} className="glass-button" style={{ width: '40px', height: '40px', padding: 0 }}>
                        <X size={20} />
                    </button>
                </div>
            </header>

            {/* Main Area */}
            <main style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                
                {viewMode === 'chat' ? (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '2rem 1rem', minHeight: 0 }}>
                        <div 
                            style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2rem', padding: '0 2rem', maxWidth: '800px', margin: '0 auto', width: '100%' }}
                        >
                            {messages.map((msg, i) => {
                                const prevMsg = i > 0 ? messages[i - 1] : null;
                                const userEmotion = msg.isBot && prevMsg && !prevMsg.isBot ? prevMsg.emotion : null;
                                
                                return (
                                <motion.div 
                                    key={i}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    style={{ 
                                        alignSelf: msg.isBot ? 'flex-start' : 'flex-end',
                                        maxWidth: '85%'
                                    }}
                                >
                                    <div style={{ 
                                        padding: '1.25rem 1.75rem', borderRadius: msg.isBot ? '24px 24px 24px 4px' : '24px 24px 4px 24px',
                                        background: msg.isBot ? 'rgba(255,255,255,0.03)' : 'var(--accent-purple)',
                                        border: msg.isBot ? '1px solid var(--glass-border)' : 'none',
                                        color: msg.isBot ? 'var(--text-main)' : 'white',
                                        backdropFilter: 'blur(10px)',
                                        boxShadow: msg.isBot ? 'none' : '0 10px 30px rgba(160, 132, 232, 0.2)'
                                    }}>
                                        <p style={{ margin: 0, lineHeight: 1.6, fontSize: '0.95rem' }}>{msg.text}</p>
                                        {userEmotion && msg.isBot && (
                                            <div style={{ marginTop: '0.75rem', fontSize: '0.65rem', fontWeight: '900', color: 'var(--accent-purple)', letterSpacing: '1px', background: 'rgba(160, 132, 232, 0.1)', border: '1px solid rgba(160, 132, 232, 0.3)', padding: '6px 10px', borderRadius: '6px', display: 'inline-block' }}>
                                                EMOTION DRIFT: {userEmotion.toUpperCase()}
                                            </div>
                                        )}
                                        {msg.gameLink && msg.isBot && (
                                            <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                <div style={{ fontSize: '0.65rem', color: 'var(--accent-purple)', fontWeight: '800', letterSpacing: '1px', opacity: 0.8 }}>🎮 PRESCRIBED THERAPY</div>
                                                <a
                                                    href={msg.gameLink}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    style={{
                                                        display: 'inline-flex', alignItems: 'center', gap: '8px',
                                                        padding: '0.6rem 1.2rem',
                                                        background: 'linear-gradient(135deg, var(--accent-purple), #6d28d9)',
                                                        color: 'white', textDecoration: 'none', borderRadius: '10px',
                                                        fontSize: '0.82rem', fontWeight: '700',
                                                        boxShadow: '0 4px 16px rgba(139,92,246,0.3)'
                                                    }}
                                                >
                                                    ▶ Play {msg.prescribedGame || 'Game'} Now
                                                </a>
                                            </div>
                                        )}
                                        {msg.binauralLink && msg.isBot && (
                                            <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                <div style={{ fontSize: '0.65rem', color: 'var(--accent-blue)', fontWeight: '800', letterSpacing: '1px', opacity: 0.8 }}>🎵 BINAURAL THERAPY</div>
                                                <a
                                                    href={msg.binauralLink}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    style={{
                                                        display: 'inline-flex', alignItems: 'center', gap: '8px',
                                                        padding: '0.6rem 1.2rem',
                                                        background: 'linear-gradient(135deg, #1e40af, #2563eb)',
                                                        color: 'white', textDecoration: 'none', borderRadius: '10px',
                                                        fontSize: '0.82rem', fontWeight: '700',
                                                        boxShadow: '0 4px 16px rgba(37,99,235,0.3)'
                                                    }}
                                                >
                                                    ♫ Listen to 432Hz Healing Waves
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                    <div style={{ fontSize: '0.6rem', opacity: 0.3, marginTop: '0.5rem', textAlign: msg.isBot ? 'left' : 'right', fontWeight: '700' }}>
                                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </motion.div>
                                );
                            })}
                            {isLoading && (
                                <div style={{ alignSelf: 'flex-start', padding: '1.25rem', display: 'flex', gap: '4px' }}>
                                    <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1 }} style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-purple)' }} />
                                    <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-purple)' }} />
                                    <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-purple)' }} />
                                </div>
                            )}
                            <div ref={chatEndRef} />
                        </div>

                        {/* Input Area */}
                        <div style={{ padding: '2rem', display: 'flex', justifyContent: 'center' }}>
                            <div style={{ width: '100%', maxWidth: '800px', position: 'relative' }}>
                                <div 
                                    className="glass-panel"
                                    style={{ 
                                        display: 'flex', alignItems: 'center', padding: '0.5rem 1rem', 
                                        borderRadius: '20px', background: 'rgba(255,255,255,0.02)',
                                        border: '1px solid var(--glass-highlight)'
                                    }}
                                >
                                    <input 
                                        value={inputText}
                                        onChange={(e) => setInputText(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                        placeholder="Transmit data sequence..."
                                        style={{ flex: 1, background: 'none', border: 'none', color: 'white', padding: '1rem', outline: 'none', fontSize: '1rem' }}
                                    />
                                    <button onClick={toggleListening} style={{ background: 'none', border: 'none', color: isListening ? 'var(--emotion-anger)' : 'var(--text-secondary)', cursor: 'pointer', padding: '0.5rem' }}>
                                        <Mic size={20} />
                                    </button>
                                    <button 
                                        onClick={handleSend}
                                        className="glass-button primary"
                                        style={{ width: '48px', height: '48px', padding: 0, borderRadius: '14px', marginLeft: '0.5rem' }}
                                    >
                                        <Send size={20} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    /* Visualization Mode */
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        <SentiaMascot active={isLoading || isSpeaking} />
                        <div style={{ marginTop: '4rem', textAlign: 'center' }}>
                            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem', fontWeight: '900', letterSpacing: '4px', color: 'var(--accent-purple)' }}>NEURAL CORE</h3>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', opacity: 0.6, letterSpacing: '2px', marginTop: '0.5rem' }}>STABLE COGNITIVE SYNC</p>
                        </div>
                        
                        <div style={{ position: 'absolute', bottom: '3rem', display: 'flex', gap: '3rem' }}>
                             {/* Stats boxes */}
                             {[
                                { label: 'LATENCY', value: '12ms' },
                                { label: 'INFERENCE', value: 'DEEP' },
                                { label: 'LOAD', value: '4%' }
                             ].map(s => (
                                <div key={s.label} className="glass-panel" style={{ padding: '1rem 2rem', textAlign: 'center', borderRadius: '16px' }}>
                                    <div style={{ fontSize: '0.6rem', fontWeight: '800', opacity: 0.4, letterSpacing: '1px', marginBottom: '4px' }}>{s.label}</div>
                                    <div style={{ fontSize: '1.1rem', fontWeight: '900', color: 'var(--text-main)' }}>{s.value}</div>
                                </div>
                             ))}
                        </div>
                    </div>
                )}
            </main>

            {/* Conversation sidebar overlay */}
            <AnimatePresence>
                {showSidebar && (
                    <motion.div 
                        initial={{ x: -320 }} animate={{ x: 0 }} exit={{ x: -320 }} transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: '320px', background: 'rgba(11, 14, 20, 0.98)', borderRight: '1px solid var(--glass-border)', backdropFilter: 'blur(40px)', zIndex: 100, display: 'flex', flexDirection: 'column', padding: '2rem 1.5rem' }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                            <h3 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)', letterSpacing: '2px' }}>NEURAL LOGS</h3>
                            <button onClick={() => setShowSidebar(false)} className="glass-button" style={{ width: '32px', height: '32px', padding: 0 }}>
                                <X size={16} />
                            </button>
                        </div>
                        
                        <button onClick={handleNewChat} className="glass-button" style={{ width: '100%', marginBottom: '2rem', display: 'flex', justifyContent: 'center', gap: '0.5rem', background: 'var(--accent-purple)', color: 'white', border: 'none' }}>
                            <Plus size={18} /> INITIATE NEW SEQUENCE
                        </button>

                        <div style={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--text-secondary)', letterSpacing: '2px', marginBottom: '1rem', opacity: 0.5 }}>HISTORY</div>
                        
                        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingRight: '0.5rem' }}>
                            {conversations.map(conv => (
                                <div 
                                    key={conv.id} 
                                    className="glass-panel"
                                    style={{ 
                                        padding: '1rem', cursor: 'pointer', border: activeConvId === conv.id ? '1px solid var(--accent-purple)' : '1px solid var(--glass-border)',
                                        background: activeConvId === conv.id ? 'rgba(160, 132, 232, 0.1)' : 'rgba(255,255,255,0.02)',
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                    }}
                                    onClick={() => { loadHistory(conv.id); setShowSidebar(false); }}
                                >
                                    <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {conv.title || `Sequence ${conv.id}`}
                                        </div>
                                        <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                            {new Date(conv.created_at).toLocaleDateString()} {new Date(conv.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>
                                    
                                    <button 
                                        onClick={(e) => handleDeleteChat(conv.id, e)}
                                        style={{ background: 'none', border: 'none', color: 'var(--emotion-anger)', cursor: 'pointer', padding: '4px', opacity: 0.8 }}
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                            {conversations.length === 0 && (
                                <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-secondary)', fontSize: '0.8rem', opacity: 0.5 }}>
                                    No logged sequences.
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default SentiaFullScreenChat;
