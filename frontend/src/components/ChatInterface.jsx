import React, { useState, useEffect, useRef, useContext, useCallback } from 'react';
import { API, getChatHistory } from '../api';
import AuthContext from '../context/AuthContext';
import { Send, MessageSquare, X } from 'lucide-react';

const ChatInterface = ({ otherUserId, otherUserEmail, onClose, isEmbedded = false }) => {
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
            position: isEmbedded ? 'relative' : 'fixed',
            top: isEmbedded ? 'auto' : 0,
            left: isEmbedded ? 'auto' : 0,
            width: isEmbedded ? '100%' : '100vw',
            height: isEmbedded ? '100%' : '100vh',
            zIndex: isEmbedded ? 'auto' : 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: isEmbedded ? 'transparent' : 'rgba(0,0,0,0.7)',
            backdropFilter: isEmbedded ? 'none' : 'blur(8px)',
        }}>
            {/* Dark Theme Chat Container */}
            <div style={{
                position: 'relative',
                width: '100%',
                maxWidth: isEmbedded ? '100%' : '600px',
                height: isEmbedded ? '100%' : '85vh',
                background: '#0d1117',
                borderRadius: '20px',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                boxShadow: isEmbedded ? 'none' : '0 20px 60px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.06)',
                animation: 'fadeIn 0.2s ease-out'
            }}>
                {/* Header - Dark Theme */}
                <div style={{
                    padding: '16px 20px',
                    background: 'rgba(13, 17, 23, 0.95)',
                    borderBottom: '1px solid rgba(255,255,255,0.08)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    backdropFilter: 'blur(12px)',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'white' }}>
                        <div style={{ 
                            width: '42px', height: '42px', 
                            borderRadius: '50%', 
                            background: 'linear-gradient(135deg, #6366F1, #D946EF)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <MessageSquare size={20} color="white" />
                        </div>
                        <div>
                            <div style={{ fontWeight: '600', fontSize: '1rem', color: '#f8fafc' }}>
                                {otherUserEmail?.split('@')[0] || 'Doctor'}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#4ADE80', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4ADE80', display: 'inline-block' }}></span>
                                online
                            </div>
                        </div>
                    </div>
                    {!isEmbedded && (
                        <button onClick={onClose} style={{ 
                            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', 
                            cursor: 'pointer', color: '#9ca3af', display: 'flex',
                            padding: '8px', borderRadius: '10px', transition: 'all 0.2s'
                        }}>
                            <X size={20} />
                        </button>
                    )}
                </div>

                {/* Messages Area - Dark Theme */}
                <div style={{ 
                    padding: '20px 16px', 
                    flex: 1, 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '6px',
                    overflowY: 'auto',
                    background: 'linear-gradient(180deg, #0d1117 0%, #111827 100%)',
                }}>
                    {messages.length === 0 && (
                        <div style={{ textAlign: 'center', margin: 'auto', opacity: 0.4, color: '#9ca3af' }}>
                            <MessageSquare size={40} style={{ margin: '0 auto 10px' }} />
                            <p style={{ fontSize: '0.9rem' }}>No messages yet. Start the conversation!</p>
                        </div>
                    )}
                    {messages.map((m, i) => {
                        const isMe = m.senderId === user.id;
                        const isFirstInGroup = i === 0 || messages[i-1].senderId !== m.senderId;

                        return (
                            <div key={i} style={{
                                maxWidth: '75%',
                                padding: '10px 14px',
                                fontSize: '0.95rem',
                                lineHeight: '1.5',
                                position: 'relative',
                                background: isMe 
                                    ? 'linear-gradient(135deg, #6366F1, #4F46E5)' 
                                    : 'rgba(31, 41, 55, 0.9)',
                                color: isMe ? '#fff' : '#e2e8f0',
                                alignSelf: isMe ? 'flex-end' : 'flex-start',
                                borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                                marginTop: isFirstInGroup ? '12px' : '2px',
                                border: isMe ? 'none' : '1px solid rgba(255,255,255,0.08)',
                                boxShadow: isMe 
                                    ? '0 4px 12px rgba(99,102,241,0.3)' 
                                    : '0 2px 8px rgba(0,0,0,0.3)',
                            }}>
                                <span style={{ wordWrap: 'break-word' }}>{m.text}</span>
                                
                                <div style={{ 
                                    display: 'flex', justifyContent: 'flex-end', alignItems: 'center', 
                                    gap: '4px', marginTop: '4px',
                                }}>
                                    <span style={{ fontSize: '0.65rem', color: isMe ? 'rgba(255,255,255,0.6)' : '#6b7280' }}>
                                        {new Date(m.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    {isMe && (
                                         <svg viewBox="0 0 16 15" width="14" height="14" style={{ marginTop: '1px' }}>
                                             <path fill="rgba(255,255,255,0.7)" d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.064-.512zm-4.1 0l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.879a.32.32 0 0 1-.484.033L1.891 7.769a.366.366 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l3.258 3.185c.143.14.361.125.484-.033l6.272-8.048a.365.365 0 0 0-.063-.51z"></path>
                                         </svg>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area - Dark Theme */}
                <form onSubmit={sendMessage} style={{
                    padding: '12px 16px',
                    background: 'rgba(13, 17, 23, 0.95)',
                    borderTop: '1px solid rgba(255,255,255,0.06)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                }}>
                    <input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Type a message..."
                        style={{
                            flex: 1,
                            background: '#1f2937',
                            border: '1px solid rgba(255,255,255,0.1)',
                            padding: '12px 18px',
                            fontSize: '0.95rem',
                            borderRadius: '24px',
                            color: '#f8fafc',
                            outline: 'none',
                        }}
                        autoFocus
                    />
                    <button type="submit" disabled={!input.trim()} style={{
                        background: input.trim() ? 'linear-gradient(135deg, #6366F1, #D946EF)' : '#374151',
                        border: 'none',
                        width: '46px',
                        height: '46px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        cursor: input.trim() ? 'pointer' : 'default',
                        transition: 'all 0.2s',
                        flexShrink: 0,
                        boxShadow: input.trim() ? '0 4px 12px rgba(99,102,241,0.4)' : 'none'
                    }}>
                        <Send size={18} style={{ marginLeft: '-1px' }} />
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ChatInterface;
