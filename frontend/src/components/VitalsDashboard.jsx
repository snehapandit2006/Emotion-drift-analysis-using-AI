import React, { useState, useEffect, useCallback, useRef } from 'react';
import { triggerVitalAlarm, stopAlarm } from '../utils/vitalAlarm';
import {
    getHealthMetricsHistory, getLatestHealthMetrics, syncMockGoogleFit,
    addHealthMetric, getVitalAlerts, acknowledgeVitalAlert
} from '../api';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, AreaChart, Area, ReferenceLine
} from 'recharts';
import { Activity, Heart, Droplet, RefreshCw, Plus, AlertTriangle, X, Phone } from 'lucide-react';

// ─── Severity colour palette ───────────────────────────────────────────────
const SEV = {
    critical: {
        bg:     'rgba(239, 68, 68, 0.12)',
        border: '#ef4444',
        badge:  '#ef4444',
        icon:   '#ef4444',
        label:  '🚨 CRITICAL',
    },
    warning: {
        bg:     'rgba(251, 191, 36, 0.1)',
        border: '#f59e0b',
        badge:  '#f59e0b',
        icon:   '#f59e0b',
        label:  '⚠️ WARNING',
    },
};

const METRIC_LABELS = {
    heart_rate:              'Heart Rate',
    spo2:                    'SpO₂',
    blood_pressure_systolic: 'Systolic BP',
    blood_pressure_diastolic:'Diastolic BP',
};

// ─── Single alert card ──────────────────────────────────────────────────────
function AlertCard({ alert, onAcknowledge }) {
    const s = SEV[alert.severity] || SEV.warning;
    return (
        <div style={{
            background:    s.bg,
            border:        `1px solid ${s.border}`,
            borderRadius:  '12px',
            padding:       '1.2rem 1.5rem',
            marginBottom:  '1rem',
            position:      'relative',
            animation:     'fadeIn 0.4s ease',
        }}>
            {/* dismiss */}
            <button
                onClick={() => onAcknowledge(alert.id)}
                title="Acknowledge & dismiss"
                style={{
                    position:  'absolute', top: '0.8rem', right: '0.8rem',
                    background:'transparent', border: 'none', cursor: 'pointer',
                    color:     '#94a3b8', fontSize: '1.1rem', lineHeight: 1,
                }}
            ><X size={18} /></button>

            {/* header row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', marginBottom: '0.6rem' }}>
                <AlertTriangle size={20} color={s.icon} />
                <span style={{ fontWeight: 700, color: s.badge, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {s.label}
                </span>
                <span style={{ fontSize: '0.78rem', color: '#94a3b8', marginLeft: 'auto', paddingRight: '1.5rem' }}>
                    {new Date(alert.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
            </div>

            {/* metric + value */}
            <p style={{ margin: '0 0 0.5rem', color: 'var(--text-main)', fontWeight: 600 }}>
                {METRIC_LABELS[alert.metric] || alert.metric}
                {' '}&nbsp;
                <span style={{ color: s.badge }}>
                    {alert.value}{alert.metric === 'heart_rate' ? ' bpm' : alert.metric === 'spo2' ? '%' : ' mmHg'}
                </span>
                {alert.prev_value != null && (
                    <span style={{ color: '#94a3b8', fontWeight: 400, fontSize: '0.85rem' }}>
                        {' '}(was {alert.prev_value})
                    </span>
                )}
            </p>

            {/* message */}
            <p style={{ margin: '0 0 0.8rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                {alert.message}
            </p>

            {/* recommendation */}
            <div style={{
                background:   'rgba(0,0,0,0.25)',
                borderLeft:   `3px solid ${s.border}`,
                borderRadius: '6px',
                padding:      '0.8rem 1rem',
                fontSize:     '0.9rem',
                color:        'var(--text-main)',
                lineHeight:   1.55,
                marginBottom: '0.8rem',
            }}>
                {alert.recommendation}
            </div>

            {/* emergency numbers */}
            <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.82rem', color: '#94a3b8' }}>
                <span><Phone size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />Emergency: <strong style={{ color: '#f87171' }}>112</strong></span>
                <span><Phone size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />Tele-MANAS: <strong style={{ color: '#f87171' }}>14416</strong></span>
                <span><Phone size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />Vandrevala: <strong style={{ color: '#f87171' }}>9999 666 555</strong></span>
            </div>
        </div>
    );
}

// ─── Main Dashboard ─────────────────────────────────────────────────────────
export default function VitalsDashboard() {
    const [history,    setHistory]    = useState([]);
    const [latest,     setLatest]     = useState(null);
    const [alerts,     setAlerts]     = useState([]);
    const [loading,    setLoading]    = useState(true);
    const [syncing,    setSyncing]    = useState(false);
    const [timeRange,  setTimeRange]  = useState('7d');
    const [showAddForm,setShowAddForm]= useState(false);
    const [isMuted,    setIsMuted]    = useState(false);
    const isMutedRef = useRef(false);
    const [formData,   setFormData]   = useState({
        heart_rate: '', spo2: '',
        blood_pressure_systolic: '', blood_pressure_diastolic: ''
    });

    // Track which alert IDs we've already fired the alarm for
    const seenAlertIds = useRef(new Set());

    /* ── fetch all three streams ── */
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [histRes, latRes, alertRes] = await Promise.all([
                getHealthMetricsHistory(timeRange),
                getLatestHealthMetrics(),
                getVitalAlerts(),
            ]);
            const fmt = histRes.data.map(item => ({
                ...item,
                timeLabel: new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                dateLabel: new Date(item.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' }),
            }));
            setHistory(fmt);
            setLatest(latRes.data);
            const newAlerts = alertRes.data || [];
            setAlerts(newAlerts);

            // Trigger alarm only for alerts we haven't seen before
            if (!isMutedRef.current) {
                const unseenAlerts = newAlerts.filter(a => !seenAlertIds.current.has(a.id));
                if (unseenAlerts.length > 0) {
                    // Pick the most severe one to announce
                    const top = unseenAlerts.find(a => a.severity === 'critical') || unseenAlerts[0];
                    triggerVitalAlarm(top);
                    // No need to setIsMuted(false) here, as if it was already false, we are here.
                    // If we want new alerts to ALWAYS unmute, we can do it here.
                }
                unseenAlerts.forEach(a => seenAlertIds.current.add(a.id));
            } else {
                // Still track seen IDs even when muted
                (newAlerts).forEach(a => seenAlertIds.current.add(a.id));
            }
        } catch (err) {
            console.error('Failed to fetch health data:', err);
        } finally {
            setLoading(false);
        }
    }, [timeRange]); // Removed isMuted to prevent re-fetch on mute

    useEffect(() => { fetchData(); }, [fetchData]);

    /* ── acknowledge ── */
    const handleAcknowledge = async (id) => {
        stopAlarm();
        try {
            await acknowledgeVitalAlert(id);
            setAlerts(prev => prev.filter(a => a.id !== id));
        } catch (err) {
            console.error('Failed to acknowledge alert:', err);
        }
    };

    /* ── acknowledge all ── */
    const handleAcknowledgeAll = async () => {
        stopAlarm();
        await Promise.allSettled(alerts.map(a => acknowledgeVitalAlert(a.id)));
        setAlerts([]);
    };

    const toggleMute = () => {
        if (isMuted) {
            setIsMuted(false);
            isMutedRef.current = false;
        } else {
            stopAlarm();
            setIsMuted(true);
            isMutedRef.current = true;
        }
    };

    /* ── sync ── */
    const handleSync = async () => {
        setSyncing(true);
        try {
            const res = await syncMockGoogleFit();
            await fetchData();
            alert(res.data.message || 'Google Fit sync complete!');
        } catch {
            alert('Failed to sync with Google Fit.');
        } finally {
            setSyncing(false);
        }
    };

    /* ── manual add ── */
    const handleAddSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                heart_rate:               formData.heart_rate               ? parseFloat(formData.heart_rate)               : null,
                spo2:                     formData.spo2                     ? parseFloat(formData.spo2)                     : null,
                blood_pressure_systolic:  formData.blood_pressure_systolic  ? parseFloat(formData.blood_pressure_systolic)  : null,
                blood_pressure_diastolic: formData.blood_pressure_diastolic ? parseFloat(formData.blood_pressure_diastolic) : null,
                source: 'manual',
            };
            const res = await addHealthMetric(payload);
            setFormData({ heart_rate: '', spo2: '', blood_pressure_systolic: '', blood_pressure_diastolic: '' });
            setShowAddForm(false);
            await fetchData();
            if (res.data.alerts_raised > 0) {
                // alerts already loaded via fetchData, just scroll to top
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        } catch {
            alert('Failed to save metric.');
        }
    };

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    /* ── tooltip ── */
    const CustomTooltip = ({ active, payload }) => {
        if (!active || !payload?.length) return null;
        return (
            <div style={{ background: 'var(--bg-panel)', padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.15)' }}>
                <p style={{ margin: '0 0 0.5rem', color: 'var(--text-secondary)' }}>
                    {payload[0].payload.dateLabel} {payload[0].payload.timeLabel}
                </p>
                {payload.map((entry, i) => (
                    <p key={i} style={{ margin: '0.2rem 0', color: entry.color, fontWeight: 'bold' }}>
                        {entry.name}: {entry.value}
                    </p>
                ))}
                <p style={{ margin: '0.5rem 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Source: {payload[0].payload.source}
                </p>
            </div>
        );
    };

    const criticalAlerts = alerts.filter(a => a.severity === 'critical');
    const warningAlerts  = alerts.filter(a => a.severity === 'warning');

    /* ─────────────────── RENDER ─────────────────── */
    return (
        <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>

            {/* ── Alert Banner Section ──────────────────────────────── */}
            {alerts.length > 0 && (
                <div style={{ marginBottom: '2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h2 style={{
                            margin: 0, color: criticalAlerts.length ? '#ef4444' : '#f59e0b',
                            display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.2rem'
                        }}>
                            <AlertTriangle size={22} />
                            Vital Alerts ({alerts.length})
                        </h2>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                                onClick={toggleMute}
                                title={isMuted ? "Unmute alarm sound" : "Mute alarm sound"}
                                style={{
                                    padding: '0.4rem 0.8rem', borderRadius: '8px', fontSize: '0.82rem',
                                    background: isMuted ? 'rgba(100,116,139,0.3)' : 'transparent',
                                    border: '1px solid #475569', color: isMuted ? '#64748b' : '#94a3b8',
                                    cursor: 'pointer',
                                }}
                            >{isMuted ? '🔕 Muted' : '🔔 Mute'}</button>
                            <button
                                onClick={handleAcknowledgeAll}
                                style={{
                                    padding: '0.4rem 1rem', borderRadius: '8px', fontSize: '0.82rem',
                                    background: 'transparent', border: '1px solid #475569',
                                    color: '#94a3b8', cursor: 'pointer',
                                }}
                            >Dismiss All</button>
                        </div>
                    </div>
                    {/* Critical first, then warnings */}
                    {[...criticalAlerts, ...warningAlerts].map(alert => (
                        <AlertCard key={alert.id} alert={alert} onAcknowledge={handleAcknowledge} />
                    ))}
                </div>
            )}

            {/* ── Header ───────────────────────────────────────────── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 style={{ margin: 0, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Activity size={28} style={{ color: 'var(--emotion-joy)' }} />
                        Physical Vitals Dashboard
                    </h1>
                    <p style={{ margin: '0.5rem 0 0', color: 'var(--text-secondary)' }}>
                        Track your physiological stats. Automatic alerts on critical changes.
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <select
                        value={timeRange}
                        onChange={e => setTimeRange(e.target.value)}
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
                        <RefreshCw size={16} className={syncing ? 'spin-animation' : ''} />
                        {syncing ? 'Syncing...' : 'Sync Google Fit'}
                    </button>
                </div>
            </div>

            {/* ── Quick Stats ───────────────────────────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ padding: '1rem', background: 'rgba(255,107,107,0.1)', borderRadius: '50%', color: '#ff6b6b' }}>
                        <Heart size={32} />
                    </div>
                    <div>
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Latest Heart Rate</div>
                        <div style={{ fontSize: '2rem', fontWeight: 'bold', color: latest?.heart_rate > 100 ? '#ef4444' : latest?.heart_rate < 50 ? '#f59e0b' : 'var(--text-main)' }}>
                            {latest?.heart_rate ? `${latest.heart_rate} bpm` : '--'}
                        </div>
                    </div>
                </div>
                <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ padding: '1rem', background: 'rgba(72,219,251,0.1)', borderRadius: '50%', color: '#48dbfb' }}>
                        <Droplet size={32} />
                    </div>
                    <div>
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Latest SpO₂</div>
                        <div style={{ fontSize: '2rem', fontWeight: 'bold', color: latest?.spo2 < 90 ? '#ef4444' : latest?.spo2 < 95 ? '#f59e0b' : 'var(--text-main)' }}>
                            {latest?.spo2 ? `${latest.spo2}%` : '--'}
                        </div>
                    </div>
                </div>
                <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ padding: '1rem', background: 'rgba(29,209,161,0.1)', borderRadius: '50%', color: '#1dd1a1' }}>
                        <Activity size={32} />
                    </div>
                    <div>
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Blood Pressure</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: latest?.blood_pressure_systolic > 140 ? '#ef4444' : 'var(--text-main)' }}>
                            {latest?.blood_pressure_systolic && latest?.blood_pressure_diastolic
                                ? `${latest.blood_pressure_systolic}/${latest.blood_pressure_diastolic}`
                                : '--/--'}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Manual Add Form ───────────────────────────────────── */}
            {showAddForm && (
                <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem', animation: 'fadeIn 0.3s' }}>
                    <h3 style={{ margin: '0 0 1rem', color: 'var(--text-main)' }}>Submit Manual Vitals</h3>
                    <form onSubmit={handleAddSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'end' }}>
                        {[
                            { label: 'Heart Rate (bpm)', name: 'heart_rate', min: 10, max: 300 },
                            { label: 'SpO₂ (%)',          name: 'spo2',       min: 0,  max: 100 },
                            { label: 'Systolic (mmHg)',   name: 'blood_pressure_systolic',  min: 40, max: 300 },
                            { label: 'Diastolic (mmHg)',  name: 'blood_pressure_diastolic', min: 20, max: 200 },
                        ].map(({ label, name, min, max }) => (
                            <div key={name}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{label}</label>
                                <input
                                    type="number" name={name} value={formData[name]}
                                    onChange={handleChange} min={min} max={max}
                                    style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-main)', boxSizing: 'border-box' }}
                                />
                            </div>
                        ))}
                        <button type="submit" style={{ padding: '0.8rem', borderRadius: '8px', background: 'var(--accent-color)', color: 'var(--accent-text)', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>
                            Save Entry
                        </button>
                    </form>
                </div>
            )}

            {/* ── Charts ───────────────────────────────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>

                {/* Heart Rate with danger reference lines */}
                <div className="glass-panel" style={{ padding: '1.5rem', height: '420px' }}>
                    <h3 style={{ margin: '0 0 0.3rem', color: 'var(--text-main)' }}>Heart Rate Trend</h3>
                    <p style={{ margin: '0 0 1.2rem', fontSize: '0.8rem', color: '#64748b' }}>
                        Normal: 50–100 bpm &nbsp;|&nbsp; <span style={{ color: '#f59e0b' }}>⚠ Warning: &lt;50 or &gt;100</span> &nbsp;|&nbsp; <span style={{ color: '#ef4444' }}>🚨 Critical: &lt;40 or &gt;140</span>
                    </p>
                    {loading ? (
                        <div style={{ height: '80%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>Loading chart data...</div>
                    ) : history.length === 0 ? (
                        <div style={{ height: '80%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>No heart rate data. Click 'Sync Google Fit' to generate demo data.</div>
                    ) : (
                        <ResponsiveContainer width="100%" height="85%">
                            <AreaChart data={history}>
                                <defs>
                                    <linearGradient id="colorHr" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%"  stopColor="#ff6b6b" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#ff6b6b" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                                <XAxis dataKey="timeLabel" stroke="var(--text-secondary)" tick={{ fill: 'var(--text-secondary)' }} />
                                <YAxis domain={['auto', 'auto']} stroke="var(--text-secondary)" tick={{ fill: 'var(--text-secondary)' }} />
                                <Tooltip content={<CustomTooltip />} />
                                {/* Warning lines */}
                                <ReferenceLine y={100} stroke="#f59e0b" strokeDasharray="6 3" label={{ value: '⚠ 100', fill: '#f59e0b', fontSize: 11 }} />
                                <ReferenceLine y={50}  stroke="#f59e0b" strokeDasharray="6 3" label={{ value: '⚠ 50',  fill: '#f59e0b', fontSize: 11 }} />
                                {/* Critical lines */}
                                <ReferenceLine y={140} stroke="#ef4444" strokeDasharray="4 2" label={{ value: '🚨 140', fill: '#ef4444', fontSize: 11 }} />
                                <ReferenceLine y={40}  stroke="#ef4444" strokeDasharray="4 2" label={{ value: '🚨 40',  fill: '#ef4444', fontSize: 11 }} />
                                <Area type="monotone" dataKey="heart_rate" name="Heart Rate (bpm)" stroke="#ff6b6b" strokeWidth={3} fillOpacity={1} fill="url(#colorHr)" connectNulls />
                            </AreaChart>
                        </ResponsiveContainer>
                    )}
                </div>

                {/* SpO2 & BP */}
                <div className="glass-panel" style={{ padding: '1.5rem', height: '340px' }}>
                    <h3 style={{ margin: '0 0 0.3rem', color: 'var(--text-main)' }}>SpO₂ & Blood Pressure</h3>
                    <p style={{ margin: '0 0 1.2rem', fontSize: '0.8rem', color: '#64748b' }}>
                        SpO₂ normal: ≥95% &nbsp;|&nbsp; Systolic normal: 90–140 mmHg
                    </p>
                    {loading ? (
                        <div style={{ height: '80%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>Loading chart data...</div>
                    ) : history.length === 0 ? (
                        <div style={{ height: '80%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>No data available.</div>
                    ) : (
                        <ResponsiveContainer width="100%" height="85%">
                            <LineChart data={history}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                                <XAxis dataKey="timeLabel" stroke="var(--text-secondary)" tick={{ fill: 'var(--text-secondary)' }} />
                                <YAxis yAxisId="left"  domain={[85, 100]} stroke="var(--text-secondary)" />
                                <YAxis yAxisId="right" orientation="right" domain={[50, 200]} stroke="var(--text-secondary)" />
                                <Tooltip content={<CustomTooltip />} />
                                {/* SpO2 critical threshold */}
                                <ReferenceLine yAxisId="left"  y={95} stroke="#f59e0b" strokeDasharray="6 3" />
                                <ReferenceLine yAxisId="left"  y={90} stroke="#ef4444" strokeDasharray="4 2" />
                                {/* BP warning */}
                                <ReferenceLine yAxisId="right" y={140} stroke="#f59e0b" strokeDasharray="6 3" />
                                <ReferenceLine yAxisId="right" y={180} stroke="#ef4444" strokeDasharray="4 2" />
                                <Line yAxisId="left"  type="monotone" dataKey="spo2"                     name="SpO₂ (%)"    stroke="#48dbfb" strokeWidth={3} dot={{ r: 4 }} connectNulls />
                                <Line yAxisId="right" type="monotone" dataKey="blood_pressure_systolic"  name="Systolic BP" stroke="#1dd1a1" strokeWidth={2} connectNulls />
                                <Line yAxisId="right" type="step"     dataKey="blood_pressure_diastolic" name="Diastolic BP" stroke="#ff9f43" strokeWidth={2} connectNulls />
                            </LineChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

            <style>{`
                .spin-animation { animation: spin 1s linear infinite; }
                @keyframes spin   { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
        </div>
    );
}
