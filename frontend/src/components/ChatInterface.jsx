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
        <div className="chat-window glass-panel">
            {/* Header */}
            <div className="chat-header">
                <div style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <MessageSquare size={18} />
                    {otherUserEmail.split('@')[0]}
                </div>
                <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}><X size={18} /></button>
            </div>

            {/* Messages */}
            <div className="chat-messages">
                {messages.map((m, i) => {
                    const isMe = m.senderId === user.id;
                    return (
                        <div key={i} className={`chat-bubble ${isMe ? 'sent' : 'received'}`}>
                            {m.text}
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={sendMessage} className="chat-input-area">
                <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Type a message..."
                    className="chat-input"
                />
                <button type="submit" disabled={!input.trim()} className="chat-send-btn">
                    <Send size={18} />
                </button>
            </form>
        </div>
    );
};

export default ChatInterface;
