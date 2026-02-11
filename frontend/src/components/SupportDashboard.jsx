import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Phone, MapPin, Info, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { fetchSupportInsights } from '../api';

const SupportDashboard = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [consentGiven, setConsentGiven] = useState(false);
    const [nearbyHelp, setNearbyHelp] = useState([]);

    const loadData = async () => {
        try {
            const res = await fetchSupportInsights(14, consentGiven);
            setData(res.data);
            if (consentGiven && res.data.resources?.nearby_help) {
                setNearbyHelp(res.data.resources.nearby_help);
            }
        } catch (e) {
            console.error("Failed to load support insights", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [consentGiven]);

    if (loading) {
        return <div className="flex items-center justify-center min-h-screen text-white">Loading insights...</div>;
    }

    if (!data) return <div className="text-white">Unable to load support data.</div>;

    const { severity, resources } = data;
    const severityLevel = severity.level || "LOW";

    const getSeverityColor = (level) => {
        switch (level) {
            case "LOW": return "#4caf50";
            case "MEDIUM": return "#ff9800";
            case "HIGH": return "#f44336";
            case "CRITICAL": return "#d32f2f";
            default: return "#4caf50";
        }
    };

    const color = getSeverityColor(severityLevel);

    return (
        <div className="dashboard p-8" style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto', color: 'var(--text-main)' }}>
            <button
                onClick={() => navigate('/dashboard')}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', color: 'var(--accent-color)', cursor: 'pointer', marginBottom: '2rem', fontSize: '1rem' }}
            >
                <ArrowLeft size={20} /> Back to Dashboard
            </button>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-panel"
                style={{ padding: '2rem', marginBottom: '2rem', borderLeft: `5px solid ${color}` }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                    <Shield size={32} color={color} />
                    <h1 style={{ margin: 0, fontSize: '2rem' }}>Emotional Support & Safety</h1>
                </div>
                <p style={{ fontSize: '1.1rem', opacity: 0.9 }}>
                    This dashboard helps you understand your emotional patterns over time and connects you with support if needed.
                </p>
            </motion.div>

            {/* Section 1 & 2: Severity & Summary */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
                <motion.div
                    className="glass-panel"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    style={{ padding: '2rem' }}
                >
                    <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <ActivityIcon color={color} /> Pattern Severity
                    </h2>

                    <div style={{ margin: '2rem 0', textAlign: 'center' }}>
                        <div style={{ fontSize: '3rem', fontWeight: 'bold', color: color }}>
                            {severityLevel}
                        </div>
                        <div style={{ fontSize: '0.9rem', opacity: 0.7 }}>Non-Clinical Assessment</div>
                    </div>

                    <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px' }}>
                        <p style={{ margin: 0 }}>{severity.summary}</p>
                    </div>
                </motion.div>

                <motion.div
                    className="glass-panel"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    style={{ padding: '2rem' }}
                >
                    <h2>Guidance</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                        {resources.guidance_text.map((text, i) => (
                            <div key={i} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                                <Info size={20} color="var(--accent-color)" style={{ marginTop: '3px' }} />
                                <p style={{ margin: 0 }}>{text}</p>
                            </div>
                        ))}
                    </div>
                </motion.div>
            </div>

            {/* Section 4: Tele-MANAS */}
            <motion.div
                className="glass-panel"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                style={{ padding: '2rem', marginBottom: '2rem', background: 'linear-gradient(145deg, rgba(33, 150, 243, 0.1), rgba(0,0,0,0))' }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '2rem' }}>
                    <div>
                        <h2 style={{ fontSize: '1.8rem', color: '#2196f3', margin: '0 0 0.5rem 0' }}>{resources.tele_manas.name}</h2>
                        <p style={{ margin: 0, opacity: 0.8 }}>{resources.tele_manas.description}</p>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                            <Phone size={32} color="#2196f3" />
                            <span style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>{resources.tele_manas.phone}</span>
                        </div>
                        <div style={{ background: '#2196f3', color: 'white', padding: '0.2rem 1rem', borderRadius: '20px', display: 'inline-block' }}>
                            Available {resources.tele_manas.hours}
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Section 5: Nearby Help */}
            <motion.div
                className="glass-panel"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                style={{ padding: '2rem' }}
            >
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <MapPin size={24} /> Nearby Professionals
                </h2>

                {!consentGiven ? (
                    <div style={{ textAlign: 'center', padding: '2rem' }}>
                        <p style={{ marginBottom: '1.5rem' }}>To show nearby psychologists, we need your permission to access generalized location data.</p>
                        <button
                            onClick={() => setConsentGiven(true)}
                            style={{ padding: '0.8rem 2rem', background: 'var(--accent-color)', color: 'black', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                        >
                            Show Nearby Help
                        </button>
                    </div>
                ) : (
                    <div style={{ marginTop: '1.5rem' }}>
                        {nearbyHelp.length > 0 ? (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
                                {nearbyHelp.map((help, i) => (
                                    <div key={i} style={{ background: 'rgba(255,255,255,0.05)', padding: '1.5rem', borderRadius: '8px' }}>
                                        <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--accent-color)' }}>{help.name}</h3>
                                        <p style={{ margin: '0 0 0.5rem 0', fontWeight: 'bold' }}>{help.clinic}</p>
                                        <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem' }}>📍 {help.distance}</p>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem' }}>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Phone size={16} /> {help.contact}</span>
                                            <a href={help.map_link} target="_blank" rel="noreferrer" style={{ color: '#2196f3' }}>View Map</a>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p>No nearby data available in mock mode.</p>
                        )}
                        <button
                            onClick={() => setConsentGiven(false)}
                            style={{ marginTop: '2rem', background: 'none', border: '1px solid #555', color: '#aaa', padding: '0.5rem 1rem', borderRadius: '5px', cursor: 'pointer' }}
                        >
                            Revoke Consent
                        </button>
                    </div>
                )}
            </motion.div>
        </div>
    );
};

// Helper for icon (could be in same file or imported)
const ActivityIcon = ({ color }) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
    </svg>
);

export default SupportDashboard;
