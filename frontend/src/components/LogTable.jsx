import React from 'react';

export default function LogTable({ logs }) {
    if (!logs || logs.length === 0) {
        return <div className="p-4 text-center" style={{ color: 'var(--text-sub)' }}>No logs available</div>;
    }

    return (
        <div className="glass-panel" style={{
            overflowX: 'auto',
            padding: '1rem',
            marginTop: '1rem'
        }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', color: 'var(--text-main)' }}>
                <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <th style={{ padding: '12px', textAlign: 'left' }}>Time</th>
                        <th style={{ padding: '12px', textAlign: 'left' }}>Emotion</th>
                        <th style={{ padding: '12px', textAlign: 'left' }}>Confidence</th>
                    </tr>
                </thead>
                <tbody>
                    {logs.slice().reverse().slice(0, 10).map((log, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <td style={{ padding: '12px' }}>{log.time}</td>
                            <td style={{ padding: '12px' }}>
                                <span style={{
                                    background: 'var(--bg-card)',
                                    padding: '4px 8px',
                                    borderRadius: '12px',
                                    fontSize: '0.8rem',
                                    border: '1px solid var(--glass-border)'
                                }}>
                                    {log.emotion}
                                </span>
                            </td>
                            <td style={{ padding: '12px' }}>{(log.confidence * 100).toFixed(1)}%</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
