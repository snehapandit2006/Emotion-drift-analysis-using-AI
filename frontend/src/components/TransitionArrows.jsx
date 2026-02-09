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
            background: 'rgba(0,0,0,0.3)',
            padding: '1rem',
            borderRadius: '16px',
            margin: '1rem 0'
        }}>
            <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>Previous</span>
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{previous}</div>
            </div>

            <ArrowRight color="#00e5ff" size={24} />

            <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>Current</span>
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{current}</div>
            </div>
        </div>
    );
}
