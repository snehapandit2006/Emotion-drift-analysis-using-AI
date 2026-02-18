
import React from 'react';
import './ScrollingMarquee.css';

const ScrollingMarquee = () => {
    const items = [
        "🚀 New Feature: Real-time Emotion Analysis",
        "💡 Insights: Detect hidden sentiments instantly",
        "🔒 Privacy First: Your data is secure with us",
        "📈 Analytics: Track emotional trends over time",
        "✨ AI-Powered: Advanced algorithms for better understanding"
    ];

    return (
        <div className="marquee-container">
            <div className="marquee-content">
                {/* 1st set */}
                {items.map((item, index) => (
                    <span key={`original-${index}`} className="marquee-item">
                        {item}
                    </span>
                ))}
                {/* 2nd set (duplicate) for seamless loop */}
                {items.map((item, index) => (
                    <span key={`dupe-${index}`} className="marquee-item">
                        {item}
                    </span>
                ))}
            </div>
        </div>
    );
};

export default ScrollingMarquee;
