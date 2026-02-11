import React, { useState } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { Upload, FileText, AlertCircle, MessageSquare } from 'lucide-react';
import { API } from '../api';

const emotionColors = {
    happy: "var(--emotion-happy)",
    fear: "var(--emotion-fear)",
    sadness: "var(--emotion-sadness)",
    anger: "var(--emotion-anger)",
    surprise: "var(--emotion-surprise)",
    neutral: "var(--emotion-neutral)",
    love: "var(--emotion-love)"
};

const ChatAnalyzer = () => {
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [results, setResults] = useState(null);
    const [error, setError] = useState(null);

    const handleFileChange = (e) => {
        if (e.target.files) {
            setFile(e.target.files[0]);
            setError(null);
            setResults(null);
            setProgress(0);
        }
    };

    const pollStatus = async (jobId) => {
        try {
            const statusResponse = await API.get(`/analyze/chat/status/${jobId}`);
            const data = statusResponse.data;

            setProgress(data.progress || 10); // Ensure at least some progress shown

            if (data.status === 'completed') {
                setResults(data.result);
                setLoading(false);
                setProgress(100);
            } else if (data.status === 'failed') {
                throw new Error(data.error || "Analysis failed");
            } else {
                // Continue polling
                setTimeout(() => pollStatus(jobId), 1000);
            }
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.detail || err.message || "Failed to get status.");
            setLoading(false);
        }
    };

    const handleUpload = async () => {
        if (!file) return;

        setLoading(true);
        setError(null);
        setResults(null);
        setProgress(0);

        const formData = new FormData();
        formData.append('file', file);

        try {
            // Initiate analysis
            const response = await API.post('/analyze/chat', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            const jobId = response.data.job_id;
            // Start polling
            pollStatus(jobId);

        } catch (err) {
            console.error(err);
            setError(err.response?.data?.detail || "Failed to start analysis.");
            setLoading(false);
        }
    };

    const pieData = results ? Object.entries(results.distribution).map(([name, value]) => ({ name, value })) : [];

    return (
        <div className="card full" style={{ minHeight: '80vh' }}>
            <h1>Chat Analysis & Advice</h1>
            <p style={{ color: 'var(--text-sub)', marginBottom: '2rem' }}>
                Upload a .zip file containing your chat logs (.txt) to analyze the emotional tone and get advice.
            </p>

            {/* Upload Section */}
            <div
                className="glass-panel"
                style={{
                    border: '2px dashed var(--glass-border)',
                    padding: '3rem',
                    textAlign: 'center',
                    marginBottom: '2rem',
                    cursor: 'pointer',
                    position: 'relative'
                }}
                onClick={() => document.getElementById('chat-upload').click()}
            >
                <input
                    id="chat-upload"
                    type="file"
                    accept=".zip"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                />
                <Upload size={48} style={{ color: 'var(--accent-color)', marginBottom: '1rem' }} />
                <p style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
                    {file ? file.name : "Click to upload ZIP file"}
                </p>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-sub)' }}>Only .zip containing .txt files</p>
            </div>

            {/* Progress Bar */}
            {loading && (
                <div style={{ marginBottom: '2rem', width: '100%', maxWidth: '600px', margin: '0 auto 2rem auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: 'var(--text-sub)' }}>
                        <span>Analyzing conversation...</span>
                        <span>{progress}%</span>
                    </div>
                    <div style={{ width: '100%', height: '10px', background: 'var(--bg-panel)', borderRadius: '5px', overflow: 'hidden' }}>
                        <div
                            style={{
                                width: `${progress}%`,
                                height: '100%',
                                background: 'var(--accent-color)',
                                transition: 'width 0.5s ease'
                            }}
                        />
                    </div>
                </div>
            )}

            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <button
                    className="sentia-btn"
                    disabled={!file || loading}
                    onClick={handleUpload}
                    style={{ padding: '1rem 3rem', fontSize: '1.1rem' }}
                >
                    {loading ? "Processing..." : "Analyze Conversation"}
                </button>
            </div>

            {error && (
                <div style={{ background: 'rgba(244, 67, 54, 0.1)', border: '1px solid var(--emotion-anger)', padding: '1rem', borderRadius: '8px', color: 'var(--emotion-anger)', display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
                    <AlertCircle /> {error}
                </div>
            )}

            {/* Results Section */}
            {results && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>

                    {/* Left: Stats */}
                    <div className="glass-panel" style={{ padding: '2rem' }}>
                        <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><div className="dot" style={{ background: emotionColors[results.dominant_emotion] || 'var(--text-main)' }}></div> Dominant Emotion: {results.dominant_emotion.toUpperCase()}</h2>

                        <div style={{ height: '300px', marginTop: '1rem' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={pieData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={100}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {pieData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={emotionColors[entry.name] || '#777'} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '4px' }} itemStyle={{ color: 'var(--text-main)' }} formatter={(value) => `${(value * 100).toFixed(1)}%`} />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>

                        <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                            <h3>Recent Context (Last 5 Messages)</h3>
                            <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {results.recent_context && results.recent_context.map((msg, i) => (
                                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.2rem' }}>
                                        <span style={{ fontStyle: 'italic', color: 'var(--text-secondary)', flex: 1, marginRight: '1rem' }}>"{msg.text}"</span>
                                        <span style={{ color: emotionColors[msg.emotion] || 'var(--text-main)', fontWeight: 'bold' }}>{msg.emotion.toUpperCase()}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Right: Advice */}
                    <div>
                        <div className="glass-panel" style={{ padding: '2rem', height: '100%', borderTop: `4px solid ${emotionColors[results.dominant_emotion]}` }}>
                            <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}><MessageSquare /> Advice</h2>

                            <div style={{ marginBottom: '2rem' }}>
                                <h3 style={{ color: 'var(--accent-color)' }}>{results.advice.strategy_title}</h3>
                                <p style={{ lineHeight: '1.6' }}>{results.advice.strategy_content}</p>
                            </div>

                            <div style={{ marginBottom: '2rem' }}>
                                <h4>Suggested Tone</h4>
                                <div style={{ display: 'inline-block', padding: '0.5rem 1rem', background: 'var(--bg-input)', borderRadius: '20px', marginTop: '0.5rem' }}>
                                    {results.advice.suggested_tone}
                                </div>
                            </div>

                            <div style={{ background: 'var(--bg-panel)', padding: '1.5rem', borderRadius: '8px', borderLeft: '4px solid var(--primary-blue)' }}>
                                <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--primary-blue)' }}>Reply Tip</h4>
                                <p style={{ margin: 0 }}>{results.advice.reply_tip}</p>
                            </div>
                        </div>
                    </div>

                </div>
            )}
        </div>
    );
};

export default ChatAnalyzer;
