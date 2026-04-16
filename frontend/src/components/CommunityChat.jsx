import React, { useState, useEffect, useRef, useContext } from 'react';
import { getChatRooms, getCommunityMessages, getWebSocketUrl, getMatchedRoom } from '../api';
import AuthContext from '../context/AuthContext';
import { Send, User as UserIcon, Shield, Hash, Sparkles, MessageSquare, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
    const [wsStatus, setWsStatus] = useState('connecting'); // 'connecting', 'open', 'closed', 'error'

    useEffect(() => {
        getChatRooms().then(res => {
            setRooms(res.data);
            if (res.data.length > 0) setActiveRoom(res.data[0].id);
        }).catch(err => console.error(err));
    }, []);

    useEffect(() => {
        if (!activeRoom) return;
        getCommunityMessages(activeRoom).then(res => {
            setMessages(res.data);
            scrollToBottom();
        }).catch(console.error);

        const token = localStorage.getItem('token');
        if (!token) {
            console.error("No token found for WS connection");
            setWsStatus('error');
            return;
        }
        const baseUrl = getWebSocketUrl();
        const wsUrl = `${baseUrl}/ws/chat/${activeRoom}?token=${token}`;
        console.log("Connecting to WS:", wsUrl);
        ws.current = new WebSocket(wsUrl);
        ws.current.onopen = () => {
            console.log("WS Connected to room:", activeRoom);
            setWsStatus('open');
        };
        ws.current.onerror = (e) => {
            console.error("WS Error:", e);
            setWsStatus('error');
        };
        ws.current.onclose = (e) => {
            console.log("WS Closed:", e.code, e.reason);
            setWsStatus('closed');
        };
        ws.current.onmessage = (e) => {
            setMessages(prev => [...prev, JSON.parse(e.data)]);
            scrollToBottom();
        };
        return () => { if (ws.current) ws.current.close(); };
    }, [activeRoom]);

    const handleMatch = async () => {
        setIsMatching(true);
        try {
            const res = await getMatchedRoom();
            const updatedRoomsRes = await getChatRooms();
            setRooms(updatedRoomsRes.data);
            setActiveRoom(res.data.room_id);
        } catch (error) { console.error(error); }
        finally { setIsMatching(false); }
    };

    const scrollToBottom = () => {
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    };

    const sendMessage = (e) => {
        e.preventDefault();
        if (!input.trim() || !ws.current || ws.current.readyState !== WebSocket.OPEN) return;
        ws.current.send(JSON.stringify({ content: input, is_anonymous: isAnonymous }));
        setInput("");
    };

    if (!activeRoom) return <div className="glass-panel" style={{ padding: '4rem', textAlign: 'center' }}>Initializing Secure Connection...</div>;

    const currentRoom = rooms.find(r => r.id === activeRoom);

    return (
        <div style={{ display: 'flex', height: 'calc(100vh - 160px)', gap: '1.5rem', position: 'relative' }}>
            {/* Sidebar */}
            <div className="glass-panel" style={{ width: '280px', display: 'flex', flexDirection: 'column', padding: '1.5rem', background: 'rgba(255, 255, 255, 0.01)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <h3 className="serif-heading" style={{ fontSize: '0.75rem', fontWeight: '800', letterSpacing: '3px', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '10px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>
                    <Hash size={16} className="text-blue-500" /> Spaces
                </h3>
                
                <button 
                    onClick={handleMatch}
                    disabled={isMatching}
                    className="glass-button primary"
                    style={{ 
                        marginBottom: '2rem', padding: '1rem', width: '100%', borderRadius: '14px', 
                        position: 'relative', overflow: 'hidden',
                        background: 'linear-gradient(135deg, rgba(96, 165, 250, 0.1), rgba(160, 132, 232, 0.1))',
                        border: '1px solid rgba(255,255,255,0.05)'
                    }}
                >
                    <Sparkles size={16} style={{ marginRight: '8px', color: 'var(--accent-blue)' }} />
                    <span style={{ fontWeight: '700', fontSize: '0.85rem' }}>{isMatching ? 'Syncing...' : 'Resonance Match'}</span>
                    {isMatching && (
                        <motion.div 
                            style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)' }}
                            animate={{ x: ['-100%', '100%'] }} transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                        />
                    )}
                </button>

                <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
                    {rooms.map(room => (
                        <button 
                            key={room.id}
                            onClick={() => setActiveRoom(room.id)}
                            style={{
                                textAlign: 'left', padding: '1rem', borderRadius: '14px', 
                                border: '1px solid ' + (activeRoom === room.id ? 'rgba(96, 165, 250, 0.3)' : 'transparent'),
                                background: activeRoom === room.id ? 'rgba(96, 165, 250, 0.05)' : 'transparent',
                                color: activeRoom === room.id ? 'white' : 'var(--text-secondary)',
                                transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)', cursor: 'pointer',
                                fontSize: '0.85rem', fontWeight: activeRoom === room.id ? '800' : '600',
                                display: 'flex', alignItems: 'center', gap: '12px'
                            }}
                        >
                            <div style={{ 
                                width: '32px', height: '32px', borderRadius: '10px', 
                                background: activeRoom === room.id ? 'rgba(96, 165, 250, 0.1)' : 'rgba(255,255,255,0.02)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem',
                                color: activeRoom === room.id ? 'var(--accent-blue)' : 'inherit'
                            }}>
                                <span style={{ opacity: 0.5 }}>#</span>
                            </div>
                            {room.name}
                        </button>
                    ))}
                </div>

                <div style={{ marginTop: 'auto', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--accent-green)', boxShadow: '0 0 10px var(--accent-green)' }} />
                    <span style={{ fontSize: '0.7rem', fontWeight: '800', letterSpacing: '1px', opacity: 0.5 }}>CONNECTED</span>
                </div>
            </div>

            {/* Chat Area */}
            <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 0, position: 'relative' }}>
                {/* Header */}
                <div style={{ padding: '1.5rem 2.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backdropFilter: 'blur(10px)', zIndex: 5 }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <h2 style={{ margin: 0, color: 'white', fontSize: '1.25rem', fontWeight: '900', letterSpacing: '-0.5px' }}>
                                {currentRoom?.name}
                            </h2>
                            <div style={{ padding: '2px 8px', borderRadius: '100px', background: 'rgba(96, 165, 250, 0.1)', border: '1px solid rgba(96, 165, 250, 0.2)', fontSize: '0.6rem', fontWeight: '900', color: 'var(--accent-blue)' }}>SECURE</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginTop: '4px' }}>
                            <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                {wsStatus === 'open' ? 'Resonance active' : 'Establishing link...'}
                            </span>
                        </div>
                    </div>
                    
                    <button 
                        onClick={() => setIsAnonymous(!isAnonymous)}
                        style={{
                            padding: '0.75rem 1.5rem', borderRadius: '100px', fontSize: '0.7rem', fontWeight: '800',
                            letterSpacing: '1px', cursor: 'pointer', transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                            border: '1px solid ' + (isAnonymous ? 'rgba(160, 132, 232, 0.4)' : 'rgba(255,255,255,0.05)'),
                            background: isAnonymous ? 'rgba(160, 132, 232, 0.1)' : 'rgba(255,255,255,0.02)',
                            color: isAnonymous ? 'var(--accent-purple)' : 'rgba(255,255,255,0.5)',
                            display: 'flex', alignItems: 'center', gap: '8px',
                            boxShadow: isAnonymous ? '0 0 20px rgba(160, 132, 232, 0.15)' : 'none'
                        }}
                    >
                        {isAnonymous ? <Shield size={14} /> : <UserIcon size={14} />}
                        {isAnonymous ? 'ANONYMOUS ON' : 'DISPLAY NAME'}
                    </button>
                </div>

                {wsStatus === 'error' && (
                    <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#F87171', padding: '0.75rem', fontSize: '0.75rem', textAlign: 'center', fontWeight: '700' }}>
                        Neural link disconnected. Attempting to restabilize...
                    </div>
                )}

                {/* Messages */}
                <div className="custom-scrollbar" style={{ flex: 1, padding: '2.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <AnimatePresence initial={false}>
                        {messages.map((msg, i) => {
                            const isMe = msg.user_id === user.id;
                            return (
                                <motion.div 
                                    key={i} 
                                    initial={{ opacity: 0, y: 10, filter: 'blur(5px)' }} 
                                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                                    style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '75%', display: 'flex', flexDirection: 'column' }}
                                >
                                    <div style={{
                                        background: isMe ? 'linear-gradient(135deg, #3B82F6, #60A5FA)' : 'rgba(255,255,255,0.03)',
                                        color: isMe ? 'white' : 'rgba(255,255,255,0.85)',
                                        padding: '1.1rem 1.6rem',
                                        borderRadius: isMe ? '24px 24px 4px 24px' : '24px 24px 24px 4px',
                                        border: isMe ? 'none' : '1px solid rgba(255,255,255,0.05)',
                                        boxShadow: isMe ? '0 10px 25px -5px rgba(59, 130, 246, 0.4)' : 'none',
                                        fontSize: '0.95rem', lineHeight: 1.6,
                                        fontWeight: '500'
                                    }}>
                                        {msg.content}
                                    </div>
                                    <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', marginTop: '8px', alignSelf: isMe ? 'flex-end' : 'flex-start', fontWeight: '800', letterSpacing: '0.5px' }}>
                                        {msg.display_name.toUpperCase()} • {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div style={{ padding: '2rem 2.5rem', background: 'rgba(0,0,0,0.2)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <form onSubmit={sendMessage} style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <div style={{ flex: 1, position: 'relative' }}>
                            <input 
                                type="text" value={input} onChange={(e) => setInput(e.target.value)}
                                placeholder={isAnonymous ? "Transmit anonymously..." : "Share your thoughts..."}
                                style={{
                                    width: '100%', padding: '1.25rem 1.75rem', borderRadius: '18px', 
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    background: 'rgba(255,255,255,0.03)', color: 'white', 
                                    outline: 'none', fontSize: '1rem',
                                    transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                                }}
                                className="chat-input-field"
                            />
                            <div style={{ position: 'absolute', right: '1.5rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.3 }}>
                                <MessageSquare size={18} />
                            </div>
                        </div>
                        <button 
                            type="submit" disabled={!input.trim()}
                            className="glass-button primary"
                            style={{ 
                                width: '60px', height: '60px', borderRadius: '18px', padding: 0, 
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: 'linear-gradient(135deg, #3B82F6, #2563EB)',
                                boxShadow: '0 10px 20px rgba(37, 99, 235, 0.2)',
                                cursor: 'pointer'
                            }}
                        >
                            <Send size={22} color="white" />
                        </button>
                    </form>
                    <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'center', opacity: 0.3 }}>
                        <Info size={12} style={{ marginRight: '6px' }} />
                        <span style={{ fontSize: '0.6rem', fontWeight: '800', letterSpacing: '1px' }}>SYNCED WITH NEURAL ENCRYPTION v4.2</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
