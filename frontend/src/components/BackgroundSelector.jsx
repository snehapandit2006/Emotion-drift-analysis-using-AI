import React, { useState, useEffect, useRef } from 'react';
import { Layers, X, ChevronUp } from 'lucide-react';

const BACKGROUNDS = [
    {
        id: 'neural',
        name: 'Neural Flow',
        description: 'Two-layered neural activity & cognitive data flow',
        emoji: '🧠',
        gradient: 'linear-gradient(135deg, #0a0a2e 0%, #1a1a4e 40%, #0f3460 100%)',
        accentColor: '#6366f1',
    },
    {
        id: 'particles',
        name: 'Cognitive Particles',
        description: 'Floating particle system simulating cognition',
        emoji: '✨',
        gradient: 'linear-gradient(135deg, #02040A 0%, #071428 50%, #0c1f3d 100%)',
        accentColor: '#3b82f6',
    },
    {
        id: 'brain3d',
        name: '3D Neural Brain',
        description: 'Interactive 3D brain assembled from neural points',
        emoji: '⚡',
        gradient: 'linear-gradient(135deg, #050010 0%, #1a0030 50%, #2d0060 100%)',
        accentColor: '#a78bfa',
    },
];

export const BACKGROUND_STORAGE_KEY = 'sentia_background';

export function getStoredBackground() {
    return localStorage.getItem(BACKGROUND_STORAGE_KEY) || 'neural';
}

export default function BackgroundSelector() {
    const [isOpen, setIsOpen] = useState(false);
    const [selected, setSelected] = useState(getStoredBackground);
    const containerRef = useRef(null);

    useEffect(() => {
        function handleClickOutside(e) {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (id) => {
        setSelected(id);
        localStorage.setItem(BACKGROUND_STORAGE_KEY, id);
        // Dispatch a custom event so the parent can react without a page reload
        window.dispatchEvent(new CustomEvent('background-change', { detail: { background: id } }));
        setIsOpen(false);
    };

    const current = BACKGROUNDS.find(b => b.id === selected) || BACKGROUNDS[0];

    return (
        <div
            ref={containerRef}
            style={{
                position: 'fixed',
                bottom: '100px',
                right: '30px',
                zIndex: 9998,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                gap: '10px',
            }}
        >
            {/* Options Panel */}
            {isOpen && (
                <div
                    style={{
                        background: 'rgba(10, 10, 30, 0.95)',
                        border: '1px solid rgba(99, 102, 241, 0.4)',
                        borderRadius: '16px',
                        padding: '14px',
                        width: '270px',
                        backdropFilter: 'blur(20px)',
                        boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
                        animation: 'bgSelectorFadeIn 0.2s ease-out',
                    }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <span style={{ color: '#e2e8f0', fontWeight: '600', fontSize: '0.85rem', letterSpacing: '0.5px' }}>
                            🎨 Background Theme
                        </span>
                        <button
                            onClick={() => setIsOpen(false)}
                            style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', padding: '2px' }}
                        >
                            <X size={14} />
                        </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {BACKGROUNDS.map(bg => (
                            <button
                                key={bg.id}
                                onClick={() => handleSelect(bg.id)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    padding: '10px 12px',
                                    borderRadius: '10px',
                                    border: selected === bg.id
                                        ? `1.5px solid ${bg.accentColor}`
                                        : '1.5px solid rgba(255,255,255,0.06)',
                                    background: selected === bg.id
                                        ? `${bg.accentColor}18`
                                        : 'rgba(255,255,255,0.03)',
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                    transition: 'all 0.2s ease',
                                    width: '100%',
                                }}
                            >
                                {/* Mini preview swatch */}
                                <div style={{
                                    width: '36px',
                                    height: '36px',
                                    borderRadius: '8px',
                                    background: bg.gradient,
                                    flexShrink: 0,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '16px',
                                    boxShadow: selected === bg.id ? `0 0 12px ${bg.accentColor}60` : 'none',
                                    transition: 'box-shadow 0.2s',
                                }}>
                                    {bg.emoji}
                                </div>
                                <div>
                                    <div style={{
                                        color: selected === bg.id ? bg.accentColor : '#e2e8f0',
                                        fontWeight: selected === bg.id ? '600' : '400',
                                        fontSize: '0.85rem',
                                        marginBottom: '2px',
                                    }}>
                                        {bg.name}
                                    </div>
                                    <div style={{
                                        color: '#6b7280',
                                        fontSize: '0.7rem',
                                        lineHeight: '1.3',
                                    }}>
                                        {bg.description}
                                    </div>
                                </div>
                                {selected === bg.id && (
                                    <div style={{
                                        marginLeft: 'auto',
                                        width: '8px',
                                        height: '8px',
                                        borderRadius: '50%',
                                        background: bg.accentColor,
                                        boxShadow: `0 0 8px ${bg.accentColor}`,
                                        flexShrink: 0,
                                    }} />
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                title="Change Background Theme"
                style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '13px',
                    background: isOpen
                        ? `linear-gradient(135deg, ${current.accentColor}, ${current.accentColor}99)`
                        : 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                    border: `1.5px solid ${isOpen ? current.accentColor : 'rgba(167,139,250,0.6)'}`,
                    color: '#ffffff',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backdropFilter: 'blur(10px)',
                    boxShadow: isOpen
                        ? `0 0 24px ${current.accentColor}80`
                        : '0 0 16px rgba(99,102,241,0.5), 0 4px 15px rgba(0,0,0,0.5)',
                    transition: 'all 0.25s ease',
                }}
            >
                <span style={{ fontSize: '20px', lineHeight: 1 }}>🎨</span>
            </button>

            <style>{`
                @keyframes bgSelectorFadeIn {
                    from { opacity: 0; transform: translateY(10px) scale(0.97); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
            `}</style>
        </div>
    );
}
