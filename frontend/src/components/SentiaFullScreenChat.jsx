import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus, ChevronLeft, ChevronRight, History,
    Trash2, Send, Mic, Volume2, VolumeX, Sparkles, X,
    LogOut, Terminal, Activity, MicOff, MonitorPlay, Music
} from 'lucide-react';
import {
    getSentiaConversations,
    getSentiaHistory,
    postSentiaMessage,
    deleteSentiaConversation,
    postTTS
} from '../api';
import './SentiaChat.css';
import './FloatingRobot.css';

const SARVAM_VOICES = ['aditya', 'ritu', 'ashutosh', 'priya', 'neha', 'rahul', 'pooja', 'rohan', 'simran', 'kavya', 'amit', 'dev', 'ishita', 'shreya', 'ratan', 'varun', 'manan', 'sumit', 'roopa', 'kabir', 'aayan', 'shubh', 'advait', 'amelia', 'sophia', 'anand', 'tanya', 'tarun', 'sunny', 'mani', 'gokul', 'vijay', 'shruti', 'suhani', 'mohit', 'kavitha', 'rehan', 'soham', 'rupali'];

const RobotMascot = ({ isListening, isSpeaking, mouthVolume = 0 }) => {
    const mVol = isSpeaking ? mouthVolume : 0;
    const mHeight = 4 + (mVol * 18); 
    const mWidth = 24 - (mVol * 12); 
    const mRadius = 4 + (mVol * 8); 
    const mY = mVol * 4; 

    return (
        <div className={`robot-character ${isListening ? 'listening' : ''} ${isSpeaking ? 'speaking' : ''}`}
            style={{ transform: 'scale(1.2)' }}>
            <div className="robot-aura"></div>
            <div className="robot-head">
                <div className="robot-eyes">
                    <div className="robot-eye blink"></div>
                    <div className="robot-eye blink"></div>
                </div>
                <div 
                    className="robot-mouth" 
                    style={{ 
                        height: `${mHeight}px`,
                        width: `${mWidth}px`,
                        borderRadius: `${mRadius}px`,
                        transform: `translateX(-50%) translateY(${mY}px)`,
                        boxShadow: isSpeaking && mVol > 0.05 ? `0 0 ${mRadius}px rgba(255, 255, 255, ${0.4 + mVol * 0.5})` : 'none'
                    }} 
                ></div>
            </div>
        </div>
    );
};

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
    const [selectedVoice, setSelectedVoice] = useState('ishita');
    const [isVisualizationEnabled, setIsVisualizationEnabled] = useState(false);
    const [mouthVolume, setMouthVolume] = useState(0);
    const [ambientSound, setAmbientSound] = useState('none');
    const [isPlayingAmbient, setIsPlayingAmbient] = useState(false);
    const [recognitionLang, setRecognitionLang] = useState('en-IN'); 
    const ambientAudioRef = useRef(null);
    const chatEndRef = useRef(null);

    // Audio Refs
    const audioPlayerRef = useRef(null);
    const audioContextRef = useRef(null);
    const analyserRef = useRef(null);
    const sourceNodeRef = useRef(null);
    const animationFrameRef = useRef(null);
    
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const recognitionRef = useRef(null);
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    useEffect(() => {
        loadConversations();
        return () => {
             if (audioContextRef.current) audioContextRef.current.close();
             if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
             if (ambientAudioRef.current) {
                 ambientAudioRef.current.pause();
                 ambientAudioRef.current = null;
             }
        };
    }, []);

    useEffect(() => {
        setupSpeechRecognition(recognitionLang);
    }, [recognitionLang]);

    const setupSpeechRecognition = (lang) => {
        if (SpeechRecognition) {
            console.log("Sentia: Initializing Speech Recognition for", lang);
            if (recognitionRef.current) {
                try { recognitionRef.current.stop(); } catch (e) {}
            }
            const recognition = new SpeechRecognition();
            recognition.continuous = false;
            recognition.lang = lang; 
            recognition.interimResults = true;

            recognition.onresult = (event) => {
                const transcript = Array.from(event.results)
                    .map(result => result[0].transcript)
                    .join('');
                setInputText(transcript);
            };

            recognition.onerror = (e) => {
                console.error("Sentia: Speech Recognition Error", e);
                setIsListening(false);
            };

            recognition.onend = () => {
                console.log("Sentia: Speech Recognition Ended");
                // Only reset if we're not waiting for a manual stop
                if (mediaRecorderRef.current?.state !== 'recording') {
                    setIsListening(false);
                }
            };

            recognitionRef.current = recognition;
        }
    };

    const startListening = async () => {
        if (!recognitionRef.current) {
            setupSpeechRecognition(recognitionLang);
        }
        if (!recognitionRef.current) return alert("Speech recognition not supported.");
        
        try {
            console.log("Sentia: Starting mic record...");
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunksRef.current.push(e.data);
            };

            mediaRecorder.onstop = () => {
                console.log("Sentia: MediaRecorder onstop");
                const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                setAudioBlob(blob);
                // Use the local stream variable directly
                stream.getTracks().forEach(t => t.stop());
                setIsListening(false);
            };

            mediaRecorder.start();
            try {
                recognitionRef.current.start();
            } catch (reconErr) {
                console.warn("Recognition start failed (already started?), continuing recorder:", reconErr);
            }
            setIsListening(true);
        } catch (err) {
            console.error("Sentia: Mic start failed", err);
            setIsListening(false);
            alert("Could not access microphone. Please check permissions.");
        }
    };

    const stopListeningAndRecord = () => {
        return new Promise((resolve) => {
            console.log("Sentia: stopListeningAndRecord called");
            if (recognitionRef.current) recognitionRef.current.stop();
            
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
                // Ensure onstop resolves our promise
                const prevOnStop = mediaRecorderRef.current.onstop;
                mediaRecorderRef.current.onstop = () => {
                    if (prevOnStop) prevOnStop();
                    const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                    resolve(blob);
                };
                mediaRecorderRef.current.stop();
            } else {
                setIsListening(false);
                resolve(null);
            }
        });
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
            let blobToSend = audioBlob;
            
            // If we are still listening, stop and get the blob immediately
            if (isListening) {
                blobToSend = await stopListeningAndRecord();
            }

            if (!inputText.trim() && !blobToSend) return;

            const formData = new FormData();
            formData.append('text', currentText);
            if (blobToSend) formData.append('audio', blobToSend, 'voice.wav');
            if (activeConvId) formData.append('conversation_id', activeConvId);
            formData.append('ui_lang', recognitionLang);

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
            
            // UI First: Show message immediately
            setMessages(prev => [...prev, botMsg]);
            
            // Audio Second: Trigger in background (Optimized Zero-Lag Hybrid Chunking)
            if (isTtsEnabled) {
                if (data.first_chunk_b64 || (data.tts_urls && data.tts_urls.length > 0)) {
                    console.log(`Sentia: Playing hybrid chunks (B64: ${!!data.first_chunk_b64}, URLs: ${data.tts_urls?.length})`);
                    playChunkedAudio(data.tts_urls || [], data.first_chunk_b64);
                } else {
                    speak(data.response); // Fallback to on-demand TTS
                }
            }

            // Sync dashboard visuals
            window.dispatchEvent(new CustomEvent('refresh-dashboard'));

        } catch (err) {
            const errorMsg = "I'm having a brief issue. Try again?";
            await speak(errorMsg);
            setMessages(prev => [...prev, { text: errorMsg, isBot: true }]);
        } finally {
            setIsLoading(false);
            setAudioBlob(null);
        }
    };

    // New Helper: Play an array of audio chunks sequentially (Hybrid: B64 then URLs)
    const playChunkedAudio = async (urls, initialB64 = null, index = 0) => {
        if (index === 0 && initialB64) {
            if (audioPlayerRef.current) audioPlayerRef.current.pause();
        }

        if (!initialB64 && index >= urls.length) {
            setIsSpeaking(false);
            setMouthVolume(0);
            return;
        }

        let audio;
        if (index === 0 && initialB64) {
             const audioBlob = await (await fetch(`data:audio/wav;base64,${initialB64}`)).blob();
             audio = new Audio(URL.createObjectURL(audioBlob));
        } else {
             const url = urls[index];
             // The backend "/chat/sentia/audio/..." endpoint handles internal polling (Smart Waiter)
             const fullUrl = `${import.meta.env.VITE_API_URL || "http://127.0.0.1:8000"}${url}`;
             audio = new Audio(fullUrl);
        }

        audio.crossOrigin = "anonymous";

        const startPlayback = () => {
            audio.play()
                .then(() => {
                    if (audioPlayerRef.current && audioPlayerRef.current !== audio) {
                         audioPlayerRef.current.pause();
                    }
                    audioPlayerRef.current = audio;
                    setIsSpeaking(true);
                    setupAudioAnalysis(audio);
                    
                    // PROACTIVE PRE-BUFFER: Simply load the next one (Smart Waiter handles the rest)
                    const nextIndex = (index === 0 && initialB64) ? 1 : index + 1;
                    if (nextIndex < urls.length) {
                         const nextUrl = `${import.meta.env.VITE_API_URL || "http://127.0.0.1:8000"}${urls[nextIndex]}`;
                         console.log(`Sentia: Submitting request to Smart Waiter for chunk ${nextIndex}...`);
                         const prefetch = new Audio(nextUrl);
                         prefetch.load(); 
                    }

                    audio.onended = () => {
                        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
                        // Trigger next chunk IMMEDIATELY on end
                        playChunkedAudio(urls, null, nextIndex);
                    };
                })
                .catch(e => {
                    console.error("Playback failed:", e);
                    const nextIndex = (index === 0 && initialB64) ? 1 : index + 1;
                    playChunkedAudio(urls, null, nextIndex);
                });
        };

        if (index === 0 && initialB64) {
             startPlayback();
        } else {
             audio.oncanplaythrough = startPlayback;
             audio.onerror = () => {
                  console.error(`Smart Waiter failed for ${urls[index]}`);
                  const nextIndex = (index === 0 && initialB64) ? 1 : index + 1;
                  playChunkedAudio(urls, null, nextIndex);
             };
        }
    };

    // Helper to connect audio element to analyzer
    const setupAudioAnalysis = (audio) => {
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
            analyserRef.current = audioContextRef.current.createAnalyser();
            analyserRef.current.fftSize = 256;
        }

        if (sourceNodeRef.current) sourceNodeRef.current.disconnect();
        
        try {
            sourceNodeRef.current = audioContextRef.current.createMediaElementSource(audio);
            sourceNodeRef.current.connect(analyserRef.current);
            analyserRef.current.connect(audioContextRef.current.destination);
        } catch (e) { console.warn("Audio linking err:", e); }

        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const checkVolume = () => {
            if (!analyserRef.current) return;
            analyserRef.current.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < bufferLength; i++) sum += dataArray[i];
            const average = sum / bufferLength;
            setMouthVolume(Math.min(1, average / 64));
            animationFrameRef.current = requestAnimationFrame(checkVolume);
        };
        checkVolume();
    };

    const speak = async (text) => {
        if (!isTtsEnabled) return;

        if (audioPlayerRef.current) {
            audioPlayerRef.current.pause();
            audioPlayerRef.current.currentTime = 0;
            setIsSpeaking(false);
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
            setMouthVolume(0);
        }

        try {
            const { data } = await postTTS(text, selectedVoice);
            const audioUrl = URL.createObjectURL(data);
            const audio = new Audio(audioUrl);
            audio.crossOrigin = "anonymous";
            audioPlayerRef.current = audio;

            if (!audioContextRef.current) {
                audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
                analyserRef.current = audioContextRef.current.createAnalyser();
                analyserRef.current.fftSize = 256;
            }

            if (sourceNodeRef.current) {
                sourceNodeRef.current.disconnect();
            }

            try {
                sourceNodeRef.current = audioContextRef.current.createMediaElementSource(audio);
                sourceNodeRef.current.connect(analyserRef.current);
                analyserRef.current.connect(audioContextRef.current.destination);
            } catch (e) {
                console.warn("Audio routing error:", e);
            }

            const bufferLength = analyserRef.current.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);

            const checkVolume = () => {
                if (!analyserRef.current) return;
                analyserRef.current.getByteFrequencyData(dataArray);
                let sum = 0;
                for (let i = 0; i < bufferLength; i++) sum += dataArray[i];
                const average = sum / bufferLength;
                const normalized = Math.min(1, average / 64);
                setMouthVolume(normalized);
                animationFrameRef.current = requestAnimationFrame(checkVolume);
            };

            audio.onplay = () => {
                if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
                    audioContextRef.current.resume();
                }
                checkVolume();
            };

            const cleanup = () => {
                setIsSpeaking(false);
                URL.revokeObjectURL(audioUrl);
                if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
                setMouthVolume(0);
            };

            audio.onended = cleanup;
            audio.onerror = cleanup;

            setIsSpeaking(true);
            await audio.play();
        } catch (error) {
            console.error("TTS Audio Failed:", error);
            setIsSpeaking(false);
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
            setMouthVolume(0);
        }
    };

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        if (ambientSound !== 'none') {
            const urls = {
                'rain': 'https://actions.google.com/sounds/v1/weather/rain_heavy_loud.ogg',
                'lofi': 'https://actions.google.com/sounds/v1/ambiences/coffee_shop.ogg',
                'whitenoise': 'https://actions.google.com/sounds/v1/water/waves_crashing_on_rock_beach.ogg'
            };
            
            if (ambientAudioRef.current) {
                ambientAudioRef.current.pause();
            }
            
            const audio = new Audio(urls[ambientSound]);
            audio.loop = true;
            audio.volume = 0.3;
            ambientAudioRef.current = audio;
            
            if (isPlayingAmbient) {
                audio.play().catch(e => console.error("Audio play error:", e));
            }
        } else {
            if (ambientAudioRef.current) {
                ambientAudioRef.current.pause();
                ambientAudioRef.current = null;
            }
            setIsPlayingAmbient(false);
        }
    }, [ambientSound]);

    const handleAmbientChange = (e) => {
        setAmbientSound(e.target.value);
    };
    
    const toggleAmbientPlay = () => {
        if (!ambientAudioRef.current) return;
        
        if (isPlayingAmbient) {
            ambientAudioRef.current.pause();
            setIsPlayingAmbient(false);
        } else {
            ambientAudioRef.current.play().catch(e => console.error("Audio play error:", e));
            setIsPlayingAmbient(true);
        }
    };

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
                                    <button onClick={(e) => { 
                                        e.stopPropagation(); 
                                        if (confirm("Delete?")) {
                                            deleteSentiaConversation(conv.id).then(() => {
                                                loadConversations();
                                                if (conv.id === activeConvId) {
                                                    handleNewChat();
                                                }
                                            });
                                        } 
                                    }} style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer' }}> <Trash2 size={14} /> </button>
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
                        <RobotMascot isListening={isListening} isSpeaking={isSpeaking || isLoading} mouthVolume={mouthVolume} />
                        <div>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: '0' }}>Sentia</h2>
                            <p style={{ fontSize: '10px', color: '#9ca3af', margin: '0' }}>AI EMOTIONAL ANALYST</p>
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', background: '#1f2937', borderRadius: '8px', padding: '2px 8px', border: '1px solid #374151', gap: '5px' }}>
                            <Activity size={14} style={{ color: '#9ca3af' }} />
                            <select 
                                value={recognitionLang} 
                                onChange={(e) => setRecognitionLang(e.target.value)}
                                style={{ background: 'transparent', color: '#9ca3af', border: 'none', fontSize: '12px', cursor: 'pointer', outline: 'none' }}
                                title="Speech Recognition Language"
                            >
                                <option value="en-IN">English (IN)</option>
                                <option value="hi-IN">Hindi (IN)</option>
                                <option value="en-US">English (US)</option>
                            </select>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', background: '#1f2937', borderRadius: '8px', padding: '2px 8px', border: '1px solid #374151' }}>
                            <Music size={14} style={{ color: '#9ca3af', marginRight: '5px' }} />
                            <select 
                                value={ambientSound} 
                                onChange={handleAmbientChange}
                                style={{ background: 'transparent', color: '#9ca3af', border: 'none', fontSize: '12px', cursor: 'pointer', outline: 'none' }}
                            >
                                <option value="none">No Ambient</option>
                                <option value="rain">Light Rain</option>
                                <option value="lofi">Lo-Fi Study</option>
                                <option value="whitenoise">White Noise</option>
                            </select>
                            {ambientSound !== 'none' && (
                                <button 
                                    onClick={toggleAmbientPlay} 
                                    style={{ background: 'none', border: 'none', color: isPlayingAmbient ? '#3b82f6' : '#9ca3af', cursor: 'pointer', marginLeft: '5px', padding: '0' }}
                                >
                                    {isPlayingAmbient ? <Volume2 size={16} /> : <VolumeX size={16} />}
                                </button>
                            )}
                        </div>

                        <select 
                            value={selectedVoice} 
                            onChange={(e) => setSelectedVoice(e.target.value)}
                            style={{ background: '#1f2937', color: '#9ca3af', border: '1px solid #374151', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', outline: 'none' }}
                        >
                            {SARVAM_VOICES.map(v => <option key={v} value={v}>{v.charAt(0).toUpperCase() + v.slice(1)}</option>)}
                        </select>
                        <button onClick={() => setIsVisualizationEnabled(!isVisualizationEnabled)} style={{ background: '#1f2937', border: '1px solid #374151', padding: '10px', borderRadius: '12px', color: isVisualizationEnabled ? '#ec4899' : '#9ca3af', cursor: 'pointer' }} title="Toggle Visualization Mode"> <MonitorPlay size={20} /> </button>
                        <button onClick={() => setIsTtsEnabled(!isTtsEnabled)} style={{ background: '#1f2937', border: '1px solid #374151', padding: '10px', borderRadius: '12px', color: isTtsEnabled ? '#3b82f6' : '#9ca3af', cursor: 'pointer' }} title="Toggle Voice Generator"> {isTtsEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />} </button>
                        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer' }}> <X size={24} /> </button>
                    </div>
                </header>

                {isVisualizationEnabled ? (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', background: 'radial-gradient(circle at center, rgba(59,130,246,0.1) 0%, transparent 60%)' }}>
                        <div style={{ transform: 'scale(4)', marginBottom: '80px' }}>
                            <RobotMascot isListening={isListening} isSpeaking={isSpeaking || isLoading} mouthVolume={mouthVolume} />
                        </div>
                        <h3 style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--primary-blue)', marginBottom: '10px', textShadow: '0 0 20px rgba(59,130,246,0.5)' }}>
                            {isListening ? 'Listening...' : isSpeaking ? 'Sentia is Speaking...' : 'Ready'}
                        </h3>
                        <p style={{ color: '#9ca3af', maxWidth: '400px', textAlign: 'center', padding: '15px', background: 'rgba(31, 41, 55, 0.5)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', fontSize: '15px' }}>
                            {messages.length > 0 ? messages[messages.length - 1].text : "How can I support you today?"}
                        </p>
                    </div>
                ) : (
                    <div className="sentia-messages">
                        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                            {messages.length === 0 && (
                                <div style={{ textAlign: 'center', marginTop: '15vh', opacity: '0.4' }}> <Sparkles size={64} style={{ color: '#3b82f6', marginBottom: '1rem' }} /> <h3>How can I support you today?</h3> </div>
                            )}
                            {messages.map((msg, i) => (
                                <div key={i} className={`sentia-msg-wrapper ${msg.isBot ? 'bot' : 'user'}`}>
                                    <div className={`sentia-msg-bubble ${msg.isBot ? 'bot' : 'user'}`}>
                                        <p style={{ margin: '0', fontSize: '15px' }}>{msg.text}</p>
                                        {msg.isBot && (
                                            <div style={{ display: 'flex', gap: '8px', marginTop: '5px', opacity: 0.8 }}>
                                                {msg.emotion && (
                                                    <span style={{ fontSize: '9px', fontWeight: 'bold', color: '#3b82f6' }}>
                                                        EMOTION: {msg.emotion.toUpperCase()}
                                                    </span>
                                                )}
                                                {msg.trace && (
                                                    <span style={{ fontSize: '9px', color: '#6b7280', fontStyle: 'italic' }}>
                                                        [{msg.trace}]
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {isLoading && (
                                <div className="sentia-msg-wrapper bot">
                                    <div className="sentia-msg-bubble bot" style={{ opacity: 0.6, fontStyle: 'italic' }}>
                                        <p style={{ margin: '0', fontSize: '14px' }}>Sentia is thinking...</p>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div ref={chatEndRef} />
                    </div>
                )}

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
