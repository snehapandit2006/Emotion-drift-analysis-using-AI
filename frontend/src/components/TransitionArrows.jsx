import React from 'react';
import { ArrowRight } from 'lucide-react';

const getEmotionColor = (emotion) => {
    const emotionColors = {
      joy: "var(--emotion-happy)",
      happy: "var(--emotion-happy)",
      fear: "var(--emotion-fear)",
      sadness: "var(--emotion-sadness)",
      anger: "var(--emotion-anger)",
      surprise: "var(--emotion-surprise)",
      neutral: "var(--emotion-neutral)",
      love: "var(--emotion-love)",
      disgust: "var(--emotion-disgust)"
    };
    return emotionColors[emotion?.toLowerCase()] || "var(--text-main)";
};

export default function TransitionArrows({ previous, current }) {
    if (!previous || !current) return null;

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '2.5rem',
            margin: '1.5rem 0',
            position: 'relative'
        }}>
            <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '8px', fontWeight: '700' }}>Initial</div>
                <div style={{ 
                    fontSize: '1rem', 
                    fontWeight: '800', 
                    color: getEmotionColor(previous),
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                }}>
                    {previous}
                </div>
            </div>

            <div style={{ opacity: 0.2, display: 'flex', alignItems: 'center' }}>
                <ArrowRight size={18} strokeWidth={1} />
            </div>

            <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '8px', fontWeight: '700' }}>Current</div>
                <div style={{ 
                    fontSize: '1rem', 
                    fontWeight: '800', 
                    color: getEmotionColor(current),
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                }}>
                    {current}
                </div>
            </div>
        </div>
    );
}
