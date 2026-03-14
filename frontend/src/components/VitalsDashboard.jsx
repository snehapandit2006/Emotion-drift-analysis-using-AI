import React, { useState, useEffect } from 'react';
import { getHealthMetricsHistory, getLatestHealthMetrics, syncMockGoogleFit, addHealthMetric } from '../api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Activity, Heart, Droplet, RefreshCw, Plus } from 'lucide-react';

export default function VitalsDashboard() {
    const [history, setHistory] = useState([]);
    const [latest, setLatest] = useState(null);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [timeRange, setTimeRange] = useState("7d");
    
    const [showAddForm, setShowAddForm] = useState(false);
    const [formData, setFormData] = useState({ 
        heart_rate: '', 
        spo2: '', 
        blood_pressure_systolic: '', 
        blood_pressure_diastolic: '' 
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            const [historyRes, latestRes] = await Promise.all([
                getHealthMetricsHistory(timeRange),
                getLatestHealthMetrics()
            ]);
            
            // Format timestamps for charts
            const formattedHistory = historyRes.data.map(item => ({
                ...item,
                timeLabel: new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                dateLabel: new Date(item.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })
            }));
            
            setHistory(formattedHistory);
            setLatest(latestRes.data);
        } catch (error) {
            console.error("Failed to fetch health metrics:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [timeRange]);

    const handleSync = async () => {
        setSyncing(true);
        try {
            await syncMockGoogleFit();
            await fetchData();
            alert("Google Fit sync complete! 12 new data points retrieved.");
        } catch (error) {
            console.error("Sync error:", error);
            alert("Failed to sync with Google Fit.");
        } finally {
            setSyncing(false);
        }
    };

    const handleAddSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                heart_rate: formData.heart_rate ? parseFloat(formData.heart_rate) : null,
                spo2: formData.spo2 ? parseFloat(formData.spo2) : null,
                blood_pressure_systolic: formData.blood_pressure_systolic ? parseFloat(formData.blood_pressure_systolic) : null,
                blood_pressure_diastolic: formData.blood_pressure_diastolic ? parseFloat(formData.blood_pressure_diastolic) : null,
                source: "manual"
            };
            
            await addHealthMetric(payload);
            setFormData({ heart_rate: '', spo2: '', blood_pressure_systolic: '', blood_pressure_diastolic: '' });
            setShowAddForm(false);
            await fetchData();
        } catch (error) {
            console.error("Failed to add metric:", error);
            alert("Failed to save metric.");
        }
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div style={{ background: 'var(--bg-panel)', padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                    <p style={{ margin: '0 0 0.5rem 0', color: 'var(--text-secondary)' }}>{payload[0].payload.dateLabel} {payload[0].payload.timeLabel}</p>
                    {payload.map((entry, index) => (
                        <p key={index} style={{ margin: '0.2rem 0', color: entry.color, fontWeight: 'bold' }}>
                            {entry.name}: {entry.value}
                        </p>
                    ))}
                    <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Source: {payload[0].payload.source}</p>
                </div>
            );
        }
        return null;
    };

    return (
        <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ margin: 0, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Activity size={28} style={{ color: 'var(--emotion-joy)' }} />
                        Physical Vitals Dashboard
                    </h1>
                    <p style={{ margin: '0.5rem 0 0', color: 'var(--text-secondary)' }}>
                        Track your physiological stats and see how they correlate with your emotions.
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <select 
                        value={timeRange} 
                        onChange={(e) => setTimeRange(e.target.value)}
                        style={{ padding: '0.5rem 1rem', borderRadius: '8px', background: 'var(--bg-input)', color: 'var(--text-main)', border: '1px solid var(--border-color)' }}
                    >
                        <option value="24h">Last 24 Hours</option>
                        <option value="7d">Last 7 Days</option>
                        <option value="30d">Last 30 Days</option>
                    </select>
                    <button 
                        onClick={() => setShowAddForm(!showAddForm)}
                        style={{ padding: '0.5rem 1rem', borderRadius: '8px', background: 'var(--bg-input)', color: 'var(--text-main)', border: '1px solid var(--border-color)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                        <Plus size={16} /> Add Entry
                    </button>
                    <button 
                        onClick={handleSync}
                        disabled={syncing}
                        style={{ padding: '0.5rem 1rem', borderRadius: '8px', background: 'var(--brand-google)', color: 'white', border: 'none', cursor: syncing ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold' }}
                    >
                        <RefreshCw size={16} className={syncing ? "spin-animation" : ""} />
                        {syncing ? 'Syncing...' : 'Sync Google Fit'}
                    </button>
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ padding: '1rem', background: 'rgba(255, 107, 107, 0.1)', borderRadius: '50%', color: '#ff6b6b' }}>
                        <Heart size={32} />
                    </div>
                    <div>
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Latest Heart Rate</div>
                        <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--text-main)' }}>
                            {latest?.heart_rate ? `${latest.heart_rate} bpm` : '--'}
                        </div>
                    </div>
                </div>

                <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ padding: '1rem', background: 'rgba(72, 219, 251, 0.1)', borderRadius: '50%', color: '#48dbfb' }}>
                        <Droplet size={32} />
                    </div>
                    <div>
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Latest SpO2</div>
                        <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--text-main)' }}>
                            {latest?.spo2 ? `${latest.spo2}%` : '--'}
                        </div>
                    </div>
                </div>

                <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ padding: '1rem', background: 'rgba(29, 209, 161, 0.1)', borderRadius: '50%', color: '#1dd1a1' }}>
                        <Activity size={32} />
                    </div>
                    <div>
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Blood Pressure</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-main)' }}>
                            {latest?.blood_pressure_systolic && latest?.blood_pressure_diastolic
                                ? `${latest.blood_pressure_systolic}/${latest.blood_pressure_diastolic}`
                                : '--/--'}
                        </div>
                    </div>
                </div>
            </div>

            {/* Add Entry Form Dropdown */}
            {showAddForm && (
                <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem', animation: 'fadeIn 0.3s' }}>
                    <h3 style={{ margin: '0 0 1rem 0', color: 'var(--text-main)' }}>Submit Manual Vitals</h3>
                    <form onSubmit={handleAddSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'end' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Heart Rate (bpm)</label>
                            <input type="number" name="heart_rate" value={formData.heart_rate} onChange={handleChange} style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-main)' }} />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>SpO2 (%)</label>
                            <input type="number" name="spo2" value={formData.spo2} onChange={handleChange} max="100" min="0" style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-main)' }} />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Systolic (mmHg)</label>
                            <input type="number" name="blood_pressure_systolic" value={formData.blood_pressure_systolic} onChange={handleChange} style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-main)' }} />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Diastolic (mmHg)</label>
                            <input type="number" name="blood_pressure_diastolic" value={formData.blood_pressure_diastolic} onChange={handleChange} style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-main)' }} />
                        </div>
                        <button type="submit" style={{ padding: '0.8rem', borderRadius: '8px', background: 'var(--accent-color)', color: 'var(--accent-text)', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>
                            Save Entry
                        </button>
                    </form>
                </div>
            )}

            {/* Charts */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>
                <div className="glass-panel" style={{ padding: '1.5rem', height: '400px' }}>
                    <h3 style={{ margin: '0 0 1.5rem 0', color: 'var(--text-main)' }}>Heart Rate Trend</h3>
                    {loading ? (
                        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>Loading chart data...</div>
                    ) : history.length === 0 ? (
                        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>No heart rate data available for this period. Click 'Sync Google Fit' to generate mock data.</div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={history}>
                                <defs>
                                    <linearGradient id="colorHr" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#ff6b6b" stopOpacity={0.8}/>
                                    <stop offset="95%" stopColor="#ff6b6b" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                                <XAxis dataKey="timeLabel" stroke="var(--text-secondary)" tick={{ fill: 'var(--text-secondary)' }} />
                                <YAxis domain={['auto', 'auto']} stroke="var(--text-secondary)" tick={{ fill: 'var(--text-secondary)' }} />
                                <Tooltip content={<CustomTooltip />} />
                                <Area type="monotone" dataKey="heart_rate" name="Heart Rate (bpm)" stroke="#ff6b6b" strokeWidth={3} fillOpacity={1} fill="url(#colorHr)" connectNulls />
                            </AreaChart>
                        </ResponsiveContainer>
                    )}
                </div>

                <div className="glass-panel" style={{ padding: '1.5rem', height: '300px' }}>
                    <h3 style={{ margin: '0 0 1.5rem 0', color: 'var(--text-main)' }}>SpO2 & Blood Pressure</h3>
                    {loading ? (
                        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>Loading chart data...</div>
                    ) : history.length === 0 ? (
                        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>No data available.</div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={history}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                                <XAxis dataKey="timeLabel" stroke="var(--text-secondary)" tick={{ fill: 'var(--text-secondary)' }} />
                                <YAxis yAxisId="left" domain={[90, 100]} stroke="var(--text-secondary)" />
                                <YAxis yAxisId="right" orientation="right" domain={[50, 150]} stroke="var(--text-secondary)" />
                                <Tooltip content={<CustomTooltip />} />
                                <Line yAxisId="left" type="monotone" dataKey="spo2" name="SpO2 (%)" stroke="#48dbfb" strokeWidth={3} dot={{ r: 4 }} connectNulls />
                                <Line yAxisId="right" type="monotone" dataKey="blood_pressure_systolic" name="Systolic BP" stroke="#1dd1a1" strokeWidth={2} connectNulls />
                                <Line yAxisId="right" type="step" dataKey="blood_pressure_diastolic" name="Diastolic BP" stroke="#ff9f43" strokeWidth={2} connectNulls />
                            </LineChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>
            
            <style jsx>{`
                .spin-animation {
                    animation: spin 1s linear infinite;
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}
