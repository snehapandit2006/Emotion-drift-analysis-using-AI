import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

export default function DriftGraph({ severity }) {
    // Severity is 0.0 to 1.0
    const value = Math.min(Math.max(severity || 0, 0), 1) * 100;
    
    const getStrokeColor = (val) => {
        if (val > 60) return 'var(--emotion-anger)';
        if (val > 30) return 'var(--emotion-surprise)';
        return 'var(--accent-green)';
    };

    const color = getStrokeColor(value);

    // Data for the active arc
    const data = [
        { name: 'Drift', value: value },
        { name: 'Remaining', value: Math.max(0, 100 - value) },
    ];

    return (
        <div style={{ width: '100%', height: 180, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <defs>
                        <linearGradient id="driftGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={color} stopOpacity={1} />
                            <stop offset="100%" stopColor={color} stopOpacity={0.6} />
                        </linearGradient>
                        <filter id="ringGlow" x="-50%" y="-50%" width="200%" height="200%">
                            <feGaussianBlur stdDeviation="6" result="blur" />
                            <feComposite in="SourceGraphic" in2="blur" operator="over" />
                        </filter>
                    </defs>
                    {/* Background Track */}
                    <Pie
                        data={[{ value: 100 }]}
                        cx="50%"
                        cy="50%"
                        innerRadius={68}
                        outerRadius={70}
                        startAngle={225}
                        endAngle={-45}
                        dataKey="value"
                        stroke="none"
                        fill="rgba(255,255,255,0.03)"
                        isAnimationActive={false}
                    />
                    {/* Active Ring */}
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        innerRadius={66}
                        outerRadius={72}
                        startAngle={225}
                        endAngle={-45}
                        paddingAngle={0}
                        dataKey="value"
                        stroke="none"
                        cornerRadius={10}
                        isAnimationActive={true}
                    >
                        <Cell fill="url(#driftGradient)" style={{ filter: 'url(#ringGlow)' }} />
                        <Cell fill="transparent" />
                    </Pie>
                </PieChart>
            </ResponsiveContainer>
            
            <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center'
            }}>
                <div style={{ fontSize: '2.5rem', fontWeight: '900', color: 'var(--text-main)', letterSpacing: '-1.5px', lineHeight: 1 }}>
                    {value.toFixed(0)}<span style={{ fontSize: '1.2rem', opacity: 0.5, marginLeft: '2px' }}>%</span>
                </div>
                <div style={{ 
                    fontSize: '0.65rem', 
                    color: 'var(--text-secondary)', 
                    textTransform: 'uppercase', 
                    letterSpacing: '2.5px', 
                    marginTop: '6px',
                    fontWeight: '700',
                    opacity: 0.8
                }}>
                    Variation
                </div>
            </div>
        </div>
    );
}
