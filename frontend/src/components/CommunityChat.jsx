import React, { useState, useEffect, useRef, useContext } from 'react';
import { getChatRooms, getCommunityMessages, getWebSocketUrl, getMatchedRoom } from '../api';
import AuthContext from '../context/AuthContext';
import { Send, User as UserIcon, Shield, Hash } from 'lucide-react';

export default function CommunityChat() {
    const { user } = useContext(AuthContext);
    const [rooms, setRooms] = useState([]);
    const [activeRoom, setActiveRoom] = useState(null);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [isAnonymous, setIsAnonymous] = useState(false);
    const ws = useRef(null);
    const messagesEndRef = useRef(null);

    const [isMatching, setIsMatching] = useState(false);

    // Fetch rooms on mount
    useEffect(() => {
        getChatRooms().then(res => {
            setRooms(res.data);
            if (res.data.length > 0) {
                setActiveRoom(res.data[0].id);
            }
        }).catch(err => console.error("Error fetching rooms", err));
    }, []);

    // Handle WebSocket connection when activeRoom changes
    useEffect(() => {
        if (!activeRoom) return;

        // Load past messages
        getCommunityMessages(activeRoom).then(res => {
            setMessages(res.data);
            scrollToBottom();
        }).catch(console.error);

        const token = localStorage.getItem('token');
        const baseUrl = getWebSocketUrl();
        const wsUrl = `${baseUrl}/ws/chat/${activeRoom}?token=${token}`;

        ws.current = new WebSocket(wsUrl);

        ws.current.onopen = () => console.log(`Connected to room ${activeRoom}`);
        
        ws.current.onmessage = (event) => {
            const data = JSON.parse(event.data);
            setMessages(prev => [...prev, data]);
            scrollToBottom();
        };

        ws.current.onerror = (error) => console.error("WebSocket error", error);
        
        ws.current.onclose = () => console.log(`Disconnected from room ${activeRoom}`);

        return () => {
            if (ws.current) ws.current.close();
        };
    }, [activeRoom]);

    const handleMatch = async () => {
        setIsMatching(true);
        try {
            const res = await getMatchedRoom();
            // Optional: You could fetch chat rooms again if a new one was just created dynamically
            // but we'll try to optimisticly set activeRoom. If it's not in the list, we should refetch.
            const updatedRoomsRes = await getChatRooms();
            setRooms(updatedRoomsRes.data);
            setActiveRoom(res.data.room_id);
            
            // Provide explicit feedback on the match
            alert(`Match complete! Based on your recent emotions, you've been placed in the room for: ${res.data.matched_emotion.toUpperCase()}`);
            
        } catch (error) {
            console.error("Match error:", error);
            alert("Could not calculate a match at this time.");
        } finally {
            setIsMatching(false);
        }
    };

    const scrollToBottom = () => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
    };

    const sendMessage = (e) => {
        e.preventDefault();
        if (!input.trim() || !ws.current || ws.current.readyState !== WebSocket.OPEN) return;

        const payload = {
            content: input,
            is_anonymous: isAnonymous
        };

        ws.current.send(JSON.stringify(payload));
        setInput("");
    };

    if (!activeRoom) {
        return <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>Loading Community Chat...</div>;
    }

    return (
        <div className="glass-panel" style={{ display: 'flex', height: '80vh', overflow: 'hidden' }}>
            {/* Sidebar: Rooms List */}
            <div style={{ width: '250px', borderRight: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column', background: 'transparent' }}>
                <div style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)', background: 'rgba(255, 255, 255, 0.02)' }}>
                    <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-main)', marginBottom: '1rem' }}>
                        <Hash size={20} style={{ color: 'var(--accent-color)' }} />
                        Rooms
                    </h3>
                    <button 
                        onClick={handleMatch}
                        disabled={isMatching}
                        style={{
                            width: '100%',
                            padding: '0.8rem',
                            borderRadius: '8px',
                            background: 'var(--accent-color)',
                            color: 'var(--accent-text)',
                            border: 'none',
                            fontWeight: 'bold',
                            cursor: isMatching ? 'not-allowed' : 'pointer',
                            opacity: isMatching ? 0.7 : 1,
                            transition: 'all 0.2s',
                            boxShadow: '0 4px 10px rgba(108, 92, 231, 0.3)'
                        }}
                    >
                        {isMatching ? 'Finding your people...' : 'Match with Similar Users ✨'}
                    </button>
                </div>
                <div style={{ flex: 1, overflowY: 'auto' }}>
                    {rooms.map(room => (
                        <div 
                            key={room.id}
                            onClick={() => setActiveRoom(room.id)}
                            style={{
                                padding: '1rem',
                                cursor: 'pointer',
                                background: activeRoom === room.id ? 'var(--bg-input)' : 'transparent',
                                borderBottom: '1px solid var(--glass-border)',
                                borderLeft: activeRoom === room.id ? '3px solid var(--accent-color)' : '3px solid transparent',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            <div style={{ fontWeight: activeRoom === room.id ? 'bold' : 'normal', color: 'var(--text-main)', marginBottom: '0.2rem' }}>
                                {room.name}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                {room.description?.substring(0, 40) || "Join the conversation"}...
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Main Chat Area */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'transparent' }}>
                {/* Chat Header */}
                <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255, 255, 255, 0.05)' }}>
                    <div>
                        <h2 style={{ margin: 0, color: 'var(--text-main)' }}>
                            {rooms.find(r => r.id === activeRoom)?.name}
                        </h2>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            <Shield size={12} style={{ display: 'inline', marginRight: '4px', color: 'var(--primary-blue)' }}/>
                            Monitored for safety
                        </span>
                    </div>
                    
                    {/* Anonymous Toggle */}
                    <button 
                        onClick={() => setIsAnonymous(!isAnonymous)}
                        style={{
                            padding: '0.5rem 1rem',
                            borderRadius: '20px',
                            border: `1px solid ${isAnonymous ? 'var(--emotion-anger)' : 'var(--primary-blue)'}`,
                            background: isAnonymous ? 'rgba(255, 0, 0, 0.1)' : 'rgba(0, 0, 255, 0.1)',
                            color: isAnonymous ? 'var(--emotion-anger)' : 'var(--primary-blue)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            fontWeight: 'bold',
                            transition: 'all 0.2s'
                        }}
                    >
                        {isAnonymous ? <Shield size={16} /> : <UserIcon size={16} />}
                        {isAnonymous ? 'Anonymous Mode ON' : 'Anonymous Mode OFF'}
                    </button>
                </div>

                {/* Messages Area */}
                <div style={{ flex: 1, padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {messages.length === 0 ? (
                        <div style={{ textAlign: 'center', color: 'var(--text-secondary)', marginTop: '2rem' }}>
                            No messages here yet. Be the first to say hello!
                        </div>
                    ) : (
                        messages.map((msg, i) => {
                            const isMe = msg.user_id === user.id && !msg.is_anonymous; // If we sent it anonymously, treat it like an others message visually or just keep it distinct. Let's say if user_id matches and we aren't enforcing strict anonymity visually to the sender. Actually, backend broadcasts it.
                            // But wait, the backend sends `user_id`. The client can know it's them.
                            const alignSelf = msg.user_id === user.id ? 'flex-end' : 'flex-start';
                            const bg = msg.user_id === user.id ? 'var(--primary-blue)' : 'var(--bg-input)';
                            const color = msg.user_id === user.id ? 'white' : 'var(--text-main)';
                            
                            return (
                                <div key={i} style={{ alignSelf, maxWidth: '70%', display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.2rem', textAlign: msg.user_id === user.id ? 'right' : 'left', alignSelf }}>
                                        {msg.display_name} • {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    <div style={{
                                        background: bg,
                                        color: color,
                                        padding: '0.8rem 1.2rem',
                                        borderRadius: msg.user_id === user.id ? '18px 18px 2px 18px' : '18px 18px 18px 2px',
                                        boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
                                    }}>
                                        {msg.content}
                                    </div>
                                </div>
                            );
                        })
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <form onSubmit={sendMessage} style={{ padding: '1rem', borderTop: '1px solid var(--glass-border)', background: 'rgba(255, 255, 255, 0.02)', display: 'flex', gap: '0.5rem' }}>
                    <input 
                        type="text" 
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder={isAnonymous ? "Type an anonymous message..." : "Type your message..."}
                        style={{
                            flex: 1,
                            padding: '1rem',
                            borderRadius: '24px',
                            border: '1px solid var(--border-color)',
                            background: 'var(--bg-input)',
                            color: 'var(--text-main)',
                            outline: 'none'
                        }}
                    />
                    <button 
                        type="submit" 
                        disabled={!input.trim()}
                        style={{
                            width: '50px',
                            height: '50px',
                            borderRadius: '50%',
                            background: input.trim() ? 'var(--accent-color)' : 'var(--bg-input)',
                            color: input.trim() ? 'var(--accent-text)' : 'var(--text-secondary)',
                            border: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: input.trim() ? 'pointer' : 'not-allowed',
                            transition: 'all 0.2s'
                        }}
                    >
                        <Send size={20} />
                    </button>
                </form>
            </div>
        </div>
    );
}
