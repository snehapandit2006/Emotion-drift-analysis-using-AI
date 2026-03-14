import React, { useState, useEffect, useRef, useContext, useCallback } from 'react';
import { API, getChatHistory } from '../api';
import AuthContext from '../context/AuthContext';
import { Send, MessageSquare, X } from 'lucide-react';

const ChatInterface = ({ otherUserId, otherUserEmail, onClose }) => {
    const { user } = useContext(AuthContext);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const ws = useRef(null);
    const messagesEndRef = useRef(null);

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, []);

    const loadHistory = useCallback(async () => {
        console.log("Loading history for:", otherUserId);
        try {
            const res = await getChatHistory(otherUserId);
            console.log("History loaded:", res.data);
            // Format messages
            const formatted = res.data.map(m => ({
                id: m.id,
                text: m.message,
                senderId: m.sender_id,
                time: m.timestamp
            }));
            setMessages(formatted);
            setTimeout(scrollToBottom, 100);
        } catch (err) {
            console.error("Failed to load chat history", err);
        }
    }, [otherUserId, scrollToBottom]);

    const connectWebSocket = useCallback(() => {
        const token = localStorage.getItem('token');
        if (!token) return;

        // Use native WebSocket
        // Determine WS URL
        const apiUrl = API.defaults.baseURL || "http://localhost:8000";
        // Handle https/wss and http/ws
        const wsProtocol = apiUrl.startsWith('https') ? 'wss' : 'ws';
        // Remove http/https scheme to append to wsProtocol
        const urlPart = apiUrl.replace(/^https?:\/\//, '');

        const wsUrl = `${wsProtocol}://${urlPart}/ws/chat?token=${token}`;

        console.log("Connecting to WS:", wsUrl);
        const socket = new WebSocket(wsUrl);

        socket.onopen = () => {
            console.log("WS Connected");
        };

        socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                // Check if message belongs to this conversation
                if (
                    (data.sender_id === otherUserId) ||
                    (data.sender_id === user.id && data.receiver_id === otherUserId)
                ) {
                    setMessages(prev => [...prev, {
                        id: Date.now(), // Temp ID
                        text: data.message,
                        senderId: data.sender_id,
                        time: data.timestamp
                    }]);
                    setTimeout(scrollToBottom, 50);
                }
            } catch (e) {
                console.error("WS Parse Error", e);
            }
        };

        socket.onerror = (error) => console.log("WS Error", error);

        ws.current = socket;
    }, [otherUserId, user.id, scrollToBottom]);

    useEffect(() => {
        if (otherUserId) {
            loadHistory();
            connectWebSocket();
        }
        return () => {
            if (ws.current) ws.current.close();
        };
    }, [otherUserId, loadHistory, connectWebSocket]);

    const sendMessage = async (e) => {
        e.preventDefault();
        if (!input.trim() || !ws.current) return;

        const msg = {
            receiver_id: otherUserId,
            message: input
        };

        // Optimistic UI Update
        const optimisticMsg = {
            id: Date.now(),
            text: input,
            senderId: user.id,
            time: new Date().toISOString()
        };
        setMessages(prev => [...prev, optimisticMsg]);
        setTimeout(scrollToBottom, 50);

        try {
            ws.current.send(JSON.stringify(msg));
            setInput("");
        } catch (e) {
            console.error("Failed to send", e);
            // Optionally revert state here if send fails
        }
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(2, 4, 10, 0.85)',
            backdropFilter: 'blur(16px)',
        }}>
            <div className="chat-window glass-panel" style={{
                position: 'relative',
                width: '100%',
                maxWidth: '900px',
                height: '85vh',
                bottom: 'auto',
                right: 'auto',
                borderRadius: '24px',
                border: '1px solid rgba(167, 139, 250, 0.2)',
                boxShadow: '0 25px 80px rgba(0, 0, 0, 0.8), 0 0 40px rgba(99, 102, 241, 0.1)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                animation: 'bgSelectorFadeIn 0.3s ease-out'
            }}>
                {/* Header */}
                <div className="chat-header" style={{
                    padding: '20px 24px',
                    background: 'linear-gradient(90deg, rgba(79, 70, 229, 0.15) 0%, rgba(124, 58, 237, 0.15) 100%)',
                    borderBottom: '1px solid rgba(255,255,255,0.1)',
                    backdropFilter: 'none',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                }}>
                    <div style={{ fontWeight: '600', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '12px', color: 'white' }}>
                        <div style={{ background: 'var(--accent-color)', padding: '8px', borderRadius: '10px', display: 'flex' }}>
                            <MessageSquare size={20} color="white" strokeWidth={2.5} />
                        </div>
                        Chat with {otherUserEmail.split('@')[0]}
                    </div>
                    <button onClick={onClose} style={{ 
                        background: 'rgba(255, 255, 255, 0.1)', 
                        border: '1px solid rgba(255, 255, 255, 0.2)', 
                        borderRadius: '50%',
                        width: '36px',
                        height: '36px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        color: '#ffffff',
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                        zIndex: 10,
                        padding: 0
                    }}
                    onMouseOver={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)';
                        e.currentTarget.style.transform = 'rotate(90deg) scale(1.1)';
                    }}
                    onMouseOut={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                        e.currentTarget.style.transform = 'rotate(0deg) scale(1)';
                    }}
                    >
                        <X size={20} strokeWidth={2.5} color="white" />
                    </button>
                </div>

                {/* Messages */}
                <div className="chat-messages" style={{ padding: '24px', flex: 1, gap: '16px', display: 'flex', flexDirection: 'column' }}>
                    {messages.map((m, i) => {
                        const isMe = m.senderId === user.id;
                        return (
                            <div key={i} className={`chat-bubble ${isMe ? 'sent' : 'received'}`} style={{
                                maxWidth: '75%',
                                padding: '14px 18px',
                                fontSize: '1.05rem',
                                lineHeight: '1.5',
                                borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                                background: isMe ? 'linear-gradient(135deg, #4f46e5, #7c3aed)' : 'rgba(255,255,255,0.05)',
                                border: isMe ? 'none' : '1px solid rgba(255,255,255,0.1)',
                                alignSelf: isMe ? 'flex-end' : 'flex-start'
                            }}>
                                {m.text}
                            </div>
                        );
                    })}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <form onSubmit={sendMessage} className="chat-input-area" style={{
                    padding: '20px',
                    borderTop: '1px solid rgba(255,255,255,0.05)',
                    background: 'rgba(0,0,0,0.2)'
                }}>
                    <input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Type your message securely..."
                        className="chat-input"
                        style={{
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            padding: '16px 20px',
                            fontSize: '1.05rem',
                            borderRadius: '16px',
                            color: 'white'
                        }}
                        autoFocus
                    />
                    <button type="submit" disabled={!input.trim()} className="chat-send-btn" style={{
                        background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                        border: 'none',
                        width: '52px',
                        height: '52px',
                        borderRadius: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        opacity: input.trim() ? 1 : 0.5,
                        cursor: input.trim() ? 'pointer' : 'default',
                        transition: 'opacity 0.2s',
                        marginLeft: '12px'
                    }}>
                        <Send size={20} style={{ marginLeft: '-2px' }} />
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ChatInterface;
