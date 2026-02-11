import React from 'react';
import { ArrowRight } from 'lucide-react';

export default function TransitionArrows({ previous, current }) {
    if (!previous || !current) return null;

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1rem',
            background: 'var(--bg-panel)',
            padding: '1rem',
            borderRadius: '16px',
            margin: '1rem 0',
            border: '1px solid var(--glass-border)'
        }}>
            <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: '0.8rem', opacity: 0.7, color: 'var(--text-secondary)' }}>Previous</span>
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--text-main)' }}>{previous}</div>
            </div>

            <ArrowRight color="var(--accent-color)" size={24} />

            <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: '0.8rem', opacity: 0.7, color: 'var(--text-secondary)' }}>Current</span>
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--text-main)' }}>{current}</div>
            </div>
        </div>
    );
}
