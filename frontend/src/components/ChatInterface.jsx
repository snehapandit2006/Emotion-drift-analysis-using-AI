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
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
        }}>
            {/* WhatsApp Container */}
            <div style={{
                position: 'relative',
                width: '100%',
                maxWidth: '600px', // More phone-like scale
                height: '85vh',
                background: '#efeae2', // WA chat background tone
                borderRadius: '16px',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
                animation: 'fadeIn 0.2s ease-out'
            }}>
                {/* Header WA Style */}
                <div style={{
                    padding: '12px 16px',
                    background: '#075e54', // WA Dark Green
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    zIndex: 2
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'white' }}>
                        <div style={{ 
                            width: '40px', height: '40px', 
                            borderRadius: '50%', background: '#ccc', 
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            overflow: 'hidden'
                        }}>
                            <MessageSquare size={20} color="#075e54" />
                        </div>
                        <div>
                            <div style={{ fontWeight: '600', fontSize: '1.1rem' }}>
                                {otherUserEmail.split('@')[0]}
                            </div>
                            <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>online</div>
                        </div>
                    </div>
                    <button onClick={onClose} style={{ 
                        background: 'transparent', border: 'none', 
                        cursor: 'pointer', color: 'white', display: 'flex' 
                    }}>
                        <X size={24} />
                    </button>
                </div>

                {/* Messages WhatsApp Pattern */}
                <div style={{ 
                    padding: '24px 16px', 
                    flex: 1, 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '4px', // Tighter WA spacing
                    overflowY: 'auto',
                    backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")', // Abstract WA pattern
                    backgroundSize: 'contain'
                }}>
                    {messages.map((m, i) => {
                        const isMe = m.senderId === user.id;
                        // Determine if previous message was from the same sender to group them
                        const isFirstInGroup = i === 0 || messages[i-1].senderId !== m.senderId;

                        return (
                            <div key={i} style={{
                                maxWidth: '80%',
                                padding: '8px 12px',
                                fontSize: '0.95rem',
                                lineHeight: '1.4',
                                position: 'relative',
                                background: isMe ? '#dcf8c6' : '#ffffff', // WA Green vs White
                                color: '#111b21',
                                alignSelf: isMe ? 'flex-end' : 'flex-start',
                                borderRadius: isMe ? '8px 0px 8px 8px' : '0px 8px 8px 8px',
                                marginTop: isFirstInGroup ? '8px' : '0', // Margin only between different senders
                                boxShadow: '0 1px 0.5px rgba(0,0,0,0.13)'
                            }}>
                                {/* Optional decorative tail for first message in group */}
                                {isFirstInGroup && (
                                   <div style={{
                                       position: 'absolute',
                                       top: 0,
                                       [isMe ? 'right' : 'left']: '-8px',
                                       width: 0, height: 0,
                                       border: '8px solid transparent',
                                       borderTopColor: isMe ? '#dcf8c6' : '#ffffff',
                                       borderRightColor: isMe ? 'transparent' : '#ffffff',
                                       borderLeftColor: isMe ? '#dcf8c6' : 'transparent',
                                       borderBottomColor: 'transparent',
                                       zIndex: -1
                                   }}></div>
                                )}
                                
                                <span style={{ wordWrap: 'break-word' }}>{m.text}</span>
                                
                                <div style={{ 
                                    display: 'flex', justifyContent: 'flex-end', alignItems: 'center', 
                                    gap: '4px', marginTop: '2px', float: 'right', marginLeft: '12px' 
                                }}>
                                    <span style={{ fontSize: '0.65rem', color: '#667781', margin: '4px 0 0 0' }}>
                                        {new Date(m.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    {isMe && (
                                         <svg viewBox="0 0 16 15" width="16" height="15" style={{ marginTop: '3px' }}>
                                             <path fill="#53bdeb" d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.064-.512zm-4.1 0l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.879a.32.32 0 0 1-.484.033L1.891 7.769a.366.366 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l3.258 3.185c.143.14.361.125.484-.033l6.272-8.048a.365.365 0 0 0-.063-.51z"></path>
                                         </svg>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                    <div ref={messagesEndRef} />
                </div>

                {/* WA Input Area */}
                <form onSubmit={sendMessage} style={{
                    padding: '8px 12px',
                    background: '#f0f2f5',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                }}>
                    <input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Type a message"
                        style={{
                            flex: 1,
                            background: '#ffffff',
                            border: 'none',
                            padding: '12px 16px',
                            fontSize: '0.95rem',
                            borderRadius: '24px',
                            color: '#111b21',
                            outline: 'none',
                            boxShadow: '0 1px 1px rgba(0,0,0,0.1)'
                        }}
                        autoFocus
                    />
                    <button type="submit" disabled={!input.trim()} style={{
                        background: input.trim() ? '#00a884' : '#ccc',
                        border: 'none',
                        width: '44px',
                        height: '44px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        cursor: input.trim() ? 'pointer' : 'default',
                        transition: 'background 0.2s',
                        flexShrink: 0
                    }}>
                        <Send size={18} style={{ marginLeft: '-2px' }} />
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ChatInterface;
