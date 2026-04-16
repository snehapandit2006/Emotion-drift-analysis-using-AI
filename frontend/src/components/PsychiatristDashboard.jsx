import React, { useState, useEffect, useContext, useCallback } from 'react';
import { getPatients, assignPatient, getDoctorVitalAlerts, acknowledgeVitalAlert } from '../api';
import { motion } from 'framer-motion';
import { User, Activity, AlertCircle, Plus, LogOut, Bell, BellOff, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import DoctorVoiceAssistant from './DoctorVoiceAssistant';

const PsychiatristDashboard = () => {
    const { user, logout } = useContext(AuthContext);
    const [patients, setPatients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newPatientEmail, setNewPatientEmail] = useState("");
    const [vitalAlerts, setVitalAlerts] = useState([]);
    const [alertsLoading, setAlertsLoading] = useState(true);
    const [showAlerts, setShowAlerts] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        loadPatients();
        loadVitalAlerts();
        // Poll for new vital alerts every 30 seconds
        const interval = setInterval(loadVitalAlerts, 30000);
        return () => clearInterval(interval);
    }, []);

    const loadPatients = async () => {
        try {
            const res = await getPatients();
            setPatients(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const loadVitalAlerts = async () => {
        try {
            const res = await getDoctorVitalAlerts();
            setVitalAlerts(res.data || []);
        } catch (err) {
            console.error('Failed to load vital alerts:', err);
            setVitalAlerts([]);
        } finally {
            setAlertsLoading(false);
        }
    };

    const handleAcknowledge = async (alertId) => {
        try {
            await acknowledgeVitalAlert(alertId);
            setVitalAlerts(prev => prev.filter(a => a.id !== alertId));
        } catch (err) {
            console.error('Failed to acknowledge alert:', err);
        }
    };

    const handleAssign = async (e) => {
        e.preventDefault();
        try {
            await assignPatient(newPatientEmail);
            setNewPatientEmail("");
            loadPatients();
            alert("Patient assigned successfully!");
        } catch (err) {
            alert(err.response?.data?.detail || "Failed to assign patient");
        }
    };

    const getSeverityColor = (severity) => {
        if (!severity) return 'var(--text-secondary)';
        const s = severity.toLowerCase();
        if (s === 'critical' || s === 'high') return 'var(--emotion-anger)';
        if (s === 'medium' || s === 'moderate') return 'var(--accent-gold)';
        return 'var(--accent-green)';
    };

    const unacknowledgedCount = vitalAlerts.filter(a => !a.acknowledged).length;

    return (
        <div className="pd-container" style={{ background: 'transparent' }}>
            <header className="pd-header" style={{ borderBottom: '1px solid var(--glass-border)', background: 'rgba(15, 17, 23, 0.4)', backdropFilter: 'blur(20px)', padding: '0.75rem 1rem', borderRadius: '0 0 16px 16px', marginBottom: '1rem' }}>
                <div className="pd-title">
                    <h1 className="serif-heading" style={{ fontSize: '0.95rem', letterSpacing: '0.5px', color: 'var(--text-main)', opacity: 1, marginBottom: '0rem' }}>Psychiatrist Hub</h1>
                    <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Monitoring: <span style={{ color: 'var(--accent-purple)', fontWeight: '600' }}>{user?.email}</span></p>
                </div>
                <div className="pd-controls" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <button
                        className="glass-button"
                        onClick={() => setShowAlerts(!showAlerts)}
                        style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '8px', padding: '0.6rem 1.2rem' }}
                    >
                        {unacknowledgedCount > 0 ? <Bell size={18} className="pulse-slow" style={{ color: 'var(--emotion-anger)' }} /> : <BellOff size={18} />}
                        <span style={{ fontSize: '0.9rem' }}>{showAlerts ? 'Hide Insights' : 'Show Insights'}</span>
                        {unacknowledgedCount > 0 && (
                            <span style={{
                                position: 'absolute', top: '-6px', right: '-6px',
                                background: 'var(--emotion-anger)', color: 'white',
                                borderRadius: '50%', width: '18px', height: '18px',
                                fontSize: '0.65rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontWeight: '900', boxShadow: '0 0 10px var(--emotion-anger)'
                            }}>
                                {unacknowledgedCount}
                            </span>
                        )}
                    </button>
                    <button className="glass-button" onClick={logout} title="Logout" style={{ padding: '0.6rem 1.2rem', borderColor: 'rgba(232, 132, 132, 0.2)' }}>
                        <LogOut size={18} style={{ color: 'var(--emotion-anger)' }} /> <span style={{ fontSize: '0.9rem' }}>Logout</span>
                    </button>
                </div>
            </header>

            <div className="pd-main">
                {/* Vital Alerts Panel */}
                {showAlerts && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                    className="glass-panel"
                    style={{ marginBottom: '1rem', padding: '1rem' }}
                >
                    <div className="pd-card-header" style={{ marginBottom: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ padding: '6px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                                <Activity size={16} style={{ color: unacknowledgedCount > 0 ? 'var(--emotion-anger)' : 'var(--accent-blue)' }} />
                            </div>
                            <h2 className="serif-heading" style={{ fontSize: '0.75rem', letterSpacing: '0.5px', opacity: 1, margin: 0 }}>Clinical Alerts</h2>
                        </div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                Live Feedback • 30s Cycle
                            </span>
                        </div>

                        {alertsLoading ? (
                            <div className="pulse-slow" style={{ color: 'var(--text-secondary)', padding: '2rem', textAlign: 'center' }}>Synchronizing clinical data...</div>
                        ) : vitalAlerts.length === 0 ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', color: 'var(--accent-green)', padding: '1.5rem', background: 'rgba(136, 209, 170, 0.03)', borderRadius: '16px', border: '1px solid rgba(136, 209, 170, 0.1)' }}>
                                <CheckCircle size={22} />
                                <p style={{ margin: 0, fontWeight: '500', fontSize: '0.95rem' }}>All clinical parameters are within baseline ranges.</p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '450px', overflowY: 'auto', paddingRight: '8px' }}>
                                {vitalAlerts.map(alert => {
                                    const sevColor = getSeverityColor(alert.severity);
                                    return (
                                        <motion.div
                                            key={alert.id}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            padding: '0.6rem 1rem',
                                            background: `linear-gradient(90deg, ${sevColor}08 0%, transparent 100%)`,
                                            border: '1px solid var(--glass-border)',
                                            borderLeft: `2px solid ${sevColor}`,
                                            borderRadius: '10px',
                                            gap: '0.75rem'
                                        }}
                                        >
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <AlertCircle size={18} style={{ color: sevColor }} />
                                                    <span style={{ fontWeight: '700', color: 'var(--text-main)', fontSize: '1rem', letterSpacing: '0.5px' }}>
                                                        {(alert.alert_type || alert.metric || 'Vital Alert').replace(/_/g, ' ')}
                                                    </span>
                                                    <span style={{
                                                        background: `${sevColor}15`,
                                                        color: sevColor,
                                                        padding: '3px 10px', borderRadius: '100px',
                                                        fontSize: '0.7rem', fontWeight: '800', border: `1px solid ${sevColor}33`
                                                    }}>
                                                        {alert.severity?.toUpperCase()}
                                                    </span>
                                                </div>
                                                <div style={{ display: 'flex', gap: '15px', fontSize: '0.85rem', color: 'var(--text-secondary)', marginLeft: '28px' }}>
                                                    <span>Target: <strong style={{ color: 'var(--text-main)', fontWeight: '600' }}>{alert.patient_email?.split('@')[0]}</strong></span>
                                                    {alert.value && <span>Reading: <strong style={{ color: sevColor, fontWeight: '700' }}>{alert.value}</strong></span>}
                                                    <span style={{ opacity: 0.6 }}>{new Date(alert.created_at || alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleAcknowledge(alert.id)}
                                                className="glass-button"
                                                style={{
                                                    padding: '0.5rem 1rem', borderRadius: '100px', fontSize: '0.8rem',
                                                    borderColor: 'rgba(136, 209, 170, 0.2)', color: 'var(--accent-green)'
                                                }}
                                            >
                                                Resolve
                                            </button>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        )}
                    </motion.div>
                )}

                {/* Add Patient Section */}
                <div className="glass-panel" style={{ marginBottom: '3rem', padding: '2rem' }}>
                    <div className="pd-card-header" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem' }}>
                        <div style={{ padding: '8px', background: 'rgba(160, 132, 232, 0.05)', borderRadius: '10px', color: 'var(--accent-purple)' }}>
                            <Plus size={20} />
                        </div>
                        <h2 className="serif-heading" style={{ fontSize: '1.1rem', letterSpacing: '1px', opacity: 1, margin: 0 }}>Onboard Patient</h2>
                    </div>
                    <form onSubmit={handleAssign} style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        <input
                            type="email"
                            placeholder="Clinical ID / Patient Email..."
                            value={newPatientEmail}
                            onChange={(e) => setNewPatientEmail(e.target.value)}
                            required
                            className="sentia-input"
                            style={{
                                flex: '1 1 auto',
                                minWidth: '280px',
                                background: 'var(--bg-input)',
                                borderRadius: '14px'
                            }}
                        />
                        <button type="submit" className="glass-button primary" style={{ padding: '1rem 2rem', borderRadius: '14px' }}>
                            Establish Link
                        </button>
                    </form>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem' }}>
                    <h2 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', letterSpacing: '2px', textTransform: 'uppercase', margin: 0, fontWeight: '800' }}>
                        Clinical Roster ({patients.length})
                    </h2>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <div className="pulse-slow" style={{ width: '8px', height: '8px', background: 'var(--accent-green)', borderRadius: '50%', boxShadow: '0 0 10px var(--accent-green)' }} />
                        <span style={{ fontSize: '0.7rem', fontWeight: '800', opacity: 0.6 }}>Active Sync</span>
                    </div>
                </div>

                {/* Patient List */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
                    {loading ? (
                        <div className="pulse-slow" style={{ color: 'var(--text-secondary)', padding: '2rem' }}>Retrieving clinical roster...</div>
                    ) : patients.map(p => (
                        <motion.div
                            key={p.id}
                            className="glass-panel"
                            whileHover={{ y: -8, border: '1px solid var(--accent-purple)', boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}
                            style={{
                            cursor: 'pointer',
                            padding: '1rem',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.75rem'
                        }}
                        onClick={() => navigate(`/doctor/patient/${p.id}`)}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{
                                width: '36px', height: '36px',
                                background: 'rgba(255,255,255,0.03)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                borderRadius: '10px',
                                border: '1px solid var(--glass-border)',
                                color: 'var(--accent-purple)'
                            }}>
                                <User size={18} />
                            </div>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-main)', letterSpacing: '-0.2px' }}>{p.email.split('@')[0]}</h3>
                                <p style={{ margin: 0, fontSize: '0.65rem', color: 'var(--text-secondary)', opacity: 0.8 }}>{p.email}</p>
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.75rem', borderTop: '1px solid var(--glass-border)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <div style={{ width: '6px', height: '6px', background: 'var(--accent-blue)', borderRadius: '50%' }} />
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>In Protocol</span>
                                </div>
                                <span style={{ fontSize: '0.9rem', color: 'var(--accent-blue)', fontWeight: '600' }}>View File &rarr;</span>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {!loading && patients.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '3rem', opacity: 0.6 }}>
                        <p>No patients assigned yet.</p>
                    </div>
                )}
            </div>

            {/* Global Voice Assistant */}
            <DoctorVoiceAssistant />
        </div>
    );
};
export default PsychiatristDashboard;
