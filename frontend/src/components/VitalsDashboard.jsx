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
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Heart, Droplet, RefreshCw, Plus, AlertTriangle, X, Phone, Bell, BellOff, Shield } from 'lucide-react';

const SEV = {
    critical: {
        bg:     'rgba(232, 132, 132, 0.05)',
        border: 'var(--emotion-anger)',
        badge:  'var(--emotion-anger)',
        icon:   'var(--emotion-anger)',
        label:  'CRITICAL',
    },
    warning: {
        bg:     'rgba(232, 212, 132, 0.03)',
        border: 'var(--accent-gold)',
        badge:  'var(--accent-gold)',
        icon:   'var(--accent-gold)',
        label:  'WARNING',
    },
};

const METRIC_LABELS = {
    heart_rate:              'Heart Rate',
    spo2:                    'SpO₂',
    blood_pressure_systolic: 'Systolic BP',
    blood_pressure_diastolic:'Diastolic BP',
};

function AlertCard({ alert, onAcknowledge }) {
    const s = SEV[alert.severity] || SEV.warning;
    return (
        <div className="glass-panel" style={{
            background:    s.bg,
            borderColor:   s.border,
            padding:       '0.75rem',
            marginBottom:  '0.75rem',
            position:      'relative',
            animation:     'fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
            boxShadow:     `0 10px 30px -10px ${s.border}22`
        }}>
            <button
                onClick={() => onAcknowledge(alert.id)}
                style={{
                    position:  'absolute', top: '1rem', right: '1rem',
                    background:'none', border: 'none', cursor: 'pointer',
                    color:     'var(--text-secondary)', transition: 'color 0.2s'
                }}
            ><X size={18} /></button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <AlertTriangle size={18} color={s.icon} />
                <span style={{ fontWeight: '800', color: s.badge, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '2px' }}>
                    {s.label}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginLeft: 'auto', opacity: 0.6 }}>
                    {new Date(alert.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
            </div>

            <p style={{ margin: '0 0 0.75rem', color: 'var(--text-main)', fontSize: '1.1rem', fontWeight: '700' }}>
                {METRIC_LABELS[alert.metric] || alert.metric}
                <span style={{ color: s.badge, marginLeft: '10px', fontSize: '1.25rem' }}>
                    {alert.value}{alert.metric === 'heart_rate' ? ' bpm' : alert.metric === 'spo2' ? '%' : ' mmHg'}
                </span>
            </p>

            <p style={{ margin: '0 0 1.25rem', color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.5 }}>
                {alert.message}
            </p>

            <div style={{
                background:   'rgba(255,255,255,0.03)',
                borderLeft:   `3px solid ${s.border}`,
                borderRadius: '8px',
                padding:      '1rem',
                fontSize:     '0.85rem',
                color:        'var(--text-main)',
                lineHeight:   1.6,
                marginBottom: '1.25rem',
            }}>
                <span style={{ fontWeight: '800', color: s.badge, textTransform: 'uppercase', fontSize: '0.7rem', display: 'block', marginBottom: '4px' }}>Recommendation</span>
                {alert.recommendation}
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)', opacity: 0.8 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Phone size={14} />Emergency: <strong style={{ color: 'var(--emotion-anger)' }}>112</strong></span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Phone size={14} />Tele-MANAS: <strong style={{ color: 'var(--emotion-anger)' }}>14416</strong></span>
            </div>
        </div>
    );
}

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

    const seenAlertIds = useRef(new Set());

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

            if (!isMutedRef.current) {
                const unseenAlerts = newAlerts.filter(a => !seenAlertIds.current.has(a.id));
                if (unseenAlerts.length > 0) {
                    const top = unseenAlerts.find(a => a.severity === 'critical') || unseenAlerts[0];
                    triggerVitalAlarm(top);
                    unseenAlerts.forEach(a => seenAlertIds.current.add(a.id));
                }
            } else {
                newAlerts.forEach(a => seenAlertIds.current.add(a.id));
            }
        } catch (err) {
            console.error('Failed to fetch health data:', err);
        } finally {
            setLoading(false);
        }
    }, [timeRange]);

    useEffect(() => { fetchData(); }, [fetchData]);
    
    useEffect(() => {
        const interval = setInterval(() => { fetchData(); }, 30000);
        return () => clearInterval(interval);
    }, [fetchData]);

    const handleAcknowledge = async (id) => {
        stopAlarm();
        try {
            await acknowledgeVitalAlert(id);
            setAlerts(prev => prev.filter(a => a.id !== id));
        } catch (err) { console.error(err); }
    };

    const handleSync = async () => {
        setSyncing(true);
        try {
            await syncMockGoogleFit();
            await fetchData();
        } finally { setSyncing(false); }
    };

    const handleAddSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                heart_rate: formData.heart_rate ? parseFloat(formData.heart_rate) : null,
                spo2: formData.spo2 ? parseFloat(formData.spo2) : null,
                blood_pressure_systolic: formData.blood_pressure_systolic ? parseFloat(formData.blood_pressure_systolic) : null,
                blood_pressure_diastolic: formData.blood_pressure_diastolic ? parseFloat(formData.blood_pressure_diastolic) : null,
                source: 'manual',
            };
            await addHealthMetric(payload);
            setFormData({ heart_rate: '', spo2: '', blood_pressure_systolic: '', blood_pressure_diastolic: '' });
            setShowAddForm(false);
            await fetchData();
        } catch { alert('Failed to save metric.'); }
    };

    const CustomTooltip = ({ active, payload }) => {
        if (!active || !payload?.length) return null;
        return (
            <div className="glass-panel" style={{ padding: '0.75rem', border: '1px solid var(--glass-highlight)' }}>
                <p style={{ margin: '0 0 0.5rem', color: 'var(--text-secondary)', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '800' }}>
                    {payload[0].payload.dateLabel} {payload[0].payload.timeLabel}
                </p>
                {payload.map((entry, i) => (
                    <p key={i} style={{ margin: '0.2rem 0', color: entry.color, fontWeight: '800', fontSize: '0.9rem', display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                        <span>{entry.name}:</span>
                        <span>{entry.value}</span>
                    </p>
                ))}
            </div>
        );
    };

    return (
        <div style={{ padding: '0 2rem', maxWidth: '1200px', margin: '0 auto' }}>
            {/* Header Area */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '3rem', paddingTop: '1rem' }}>
                <div>
                    <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '2.5rem', fontWeight: '900', letterSpacing: '-1.5px', marginBottom: '0.5rem' }}>
                        Vitals <span style={{ color: 'var(--text-secondary)', fontWeight: '400' }}>Hub</span>
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', opacity: 0.8 }}>High-fidelity physiological synchronization.</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button onClick={handleSync} disabled={syncing} className="glass-button primary" style={{ gap: '10px' }}>
                        <RefreshCw size={16} className={syncing ? 'spin' : ''} />
                        {syncing ? 'Synchronizing...' : 'Sync Data'}
                    </button>
                    <button onClick={() => setShowAddForm(!showAddForm)} className="glass-button" style={{ width: '48px', padding: 0 }}>
                        <Plus size={20} />
                    </button>
                </div>
            </div>

            {/* Bento Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gridAutoRows: 'minmax(140px, auto)', gap: '1.5rem' }}>
                
                {/* Real-time Stats */}
                <div className="glass-panel" style={{ gridColumn: 'span 4', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                        <div style={{ padding: '0.75rem', background: 'rgba(232, 132, 132, 0.1)', borderRadius: '12px', color: 'var(--emotion-anger)' }}>
                            <Heart size={20} />
                        </div>
                        <span style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-secondary)', letterSpacing: '1px' }}>HEART RATE</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                        <span style={{ fontSize: '3rem', fontWeight: '900', fontFamily: 'var(--font-heading)' }}>{latest?.heart_rate || '--'}</span>
                        <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: '600' }}>BPM</span>
                    </div>
                </div>

                <div className="glass-panel" style={{ gridColumn: 'span 4', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                        <div style={{ padding: '0.75rem', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '12px', color: 'var(--accent-blue)' }}>
                            <Droplet size={20} />
                        </div>
                        <span style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-secondary)', letterSpacing: '1px' }}>OXYGEN SATURATION</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                        <span style={{ fontSize: '3rem', fontWeight: '900', fontFamily: 'var(--font-heading)' }}>{latest?.spo2 || '--'}</span>
                        <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: '600' }}>%</span>
                    </div>
                </div>

                <div className="glass-panel" style={{ gridColumn: 'span 4', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                        <div style={{ padding: '0.75rem', background: 'rgba(136, 209, 170, 0.1)', borderRadius: '12px', color: 'var(--accent-green)' }}>
                            <Activity size={20} />
                        </div>
                        <span style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-secondary)', letterSpacing: '1px' }}>BLOOD PRESSURE</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                        <span style={{ fontSize: '2.5rem', fontWeight: '900', fontFamily: 'var(--font-heading)' }}>
                            {latest?.blood_pressure_systolic ? `${latest.blood_pressure_systolic}/${latest.blood_pressure_diastolic}` : '--'}
                        </span>
                        <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: '600' }}>mmHg</span>
                    </div>
                </div>

                {/* Main Visualizer (Chart) */}
                <div className="glass-panel" style={{ gridColumn: 'span 8', gridRow: 'span 2', padding: '2.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
                        <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.1rem', fontWeight: '800' }}>NEURAL SYNC ANALYSIS</h3>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            {['24h', '7d', '30d'].map((r) => (
                                <button 
                                    key={r} 
                                    onClick={() => setTimeRange(r)}
                                    style={{
                                        background: 'none', border: 'none', color: timeRange === r ? 'var(--text-main)' : 'var(--text-secondary)',
                                        fontSize: '0.75rem', fontWeight: '800', cursor: 'pointer', transition: 'all 0.3s',
                                        opacity: timeRange === r ? 1 : 0.4
                                    }}
                                >
                                    {r.toUpperCase()}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div style={{ height: '300px', width: '100%' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={history}>
                                <defs>
                                    <linearGradient id="colorHr" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="var(--emotion-anger)" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="var(--emotion-anger)" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                                <XAxis dataKey="timeLabel" hide />
                                <YAxis hide domain={['auto', 'auto']} />
                                <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }} />
                                <Area type="monotone" dataKey="heart_rate" name="Heart Rate" stroke="var(--emotion-anger)" strokeWidth={3} fillOpacity={1} fill="url(#colorHr)" animationDuration={1500} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Alerts/Insights Area */}
                <div className="glass-panel" style={{ gridColumn: 'span 4', gridRow: 'span 2', padding: '2rem', display: 'flex', flexDirection: 'column' }}>
                    <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1rem', fontWeight: '800', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Bell size={18} style={{ color: 'var(--accent-gold)' }} /> DIAGNOSTICS
                    </h3>
                    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {alerts.length === 0 ? (
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.3, textAlign: 'center' }}>
                                <Shield size={48} style={{ marginBottom: '1rem' }} />
                                <p style={{ fontSize: '0.85rem' }}>No anomalies detected in recent cycles.</p>
                            </div>
                        ) : (
                            alerts.map(alert => (
                                <div key={alert.id} style={{ 
                                    padding: '1.25rem', borderRadius: '14px', background: 'rgba(255,255,255,0.03)', 
                                    borderLeft: `3px solid ${alert.severity === 'critical' ? 'var(--emotion-anger)' : 'var(--accent-gold)'}`,
                                    position: 'relative'
                                }}>
                                    <div style={{ fontSize: '0.65rem', fontWeight: '900', color: alert.severity === 'critical' ? 'var(--emotion-anger)' : 'var(--accent-gold)', marginBottom: '0.5rem', letterSpacing: '1px' }}>
                                        {alert.severity.toUpperCase()}
                                    </div>
                                    <p style={{ fontSize: '0.9rem', margin: 0, fontWeight: '700', lineHeight: 1.4 }}>{alert.message}</p>
                                    <button 
                                        onClick={() => handleAcknowledge(alert.id)}
                                        style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', opacity: 0.5 }}
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Manual Entry Form (Overlay or Slide-in feel) */}
                <AnimatePresence>
                {showAddForm && (
                    <>
                     <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', zIndex: 999, backdropFilter: 'blur(4px)' }}
                        onClick={() => setShowAddForm(false)}
                     />
                     <motion.div 
                        initial={{ opacity: 0, x: '-50%', y: '-40%' }} animate={{ opacity: 1, x: '-50%', y: '-50%' }} exit={{ opacity: 0, x: '-50%', y: '-40%' }}
                        className="glass-panel" 
                        style={{ 
                            position: 'fixed', top: '50%', left: '50%', zIndex: 1000,
                            width: '90%', maxWidth: '800px',
                            padding: '2.5rem', background: 'rgba(20,20,30,0.95)', border: '1px solid var(--glass-highlight)',
                            boxShadow: '0 20px 60px rgba(0,0,0,0.8)'
                        }}
                     >
                        <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: '900', marginBottom: '2rem' }}>MANUAL CALIBRATION</h3>
                        <form onSubmit={handleAddSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '2rem' }}>
                            {[
                                { label: 'Heart Rate', name: 'heart_rate' },
                                { label: 'SpO₂ %', name: 'spo2' },
                                { label: 'Systolic BP', name: 'blood_pressure_systolic' },
                                { label: 'Diastolic BP', name: 'blood_pressure_diastolic' },
                            ].map(f => (
                                <div key={f.name}>
                                    <label style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '0.75rem', display: 'block' }}>{f.label.toUpperCase()}</label>
                                    <input 
                                        type="number" value={formData[f.name]}
                                        onChange={(e) => setFormData({...formData, [f.name]: e.target.value})}
                                        style={{ width: '100%', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', padding: '1rem', borderRadius: '12px', color: 'var(--text-main)', outline: 'none' }}
                                    />
                                </div>
                            ))}
                            <div style={{ gridColumn: 'span 4', display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                                <button type="button" onClick={() => setShowAddForm(false)} className="glass-button">Cancel</button>
                                <button type="submit" className="glass-button primary">Register Metrics</button>
                            </div>
                        </form>
                     </motion.div>
                    </>
                )}
                </AnimatePresence>
            </div>
        </div>
    );
}
