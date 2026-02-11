import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Phone, MapPin, Info, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { fetchSupportInsights } from '../api';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet marker icons
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

const SupportDashboard = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [consentGiven, setConsentGiven] = useState(false);
    const [location, setLocation] = useState(null);
    const [locationError, setLocationError] = useState(null);
    const [nearbyHelp, setNearbyHelp] = useState([]);

    const loadData = async (lat = null, lon = null) => {
        try {
            setLoading(true);
            const res = await fetchSupportInsights(14, consentGiven, lat, lon);
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
        // Initial load without location
        loadData();
    }, []);

    const handleGrantConsent = () => {
        if (!navigator.geolocation) {
            setLocationError("Geolocation is not supported by your browser.");
            return;
        }

        setLoading(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                setLocation({ lat: latitude, lon: longitude });
                setConsentGiven(true);
                setLocationError(null);
                // Reload with location
                loadData(latitude, longitude);
            },
            (error) => {
                console.error("Geolocation error:", error);
                setLocationError("Unable to retrieve your location. Please check browser permissions.");
                setLoading(false);
            }
        );
    };

    const handleRevokeConsent = () => {
        setConsentGiven(false);
        setLocation(null);
        setNearbyHelp([]);
        loadData(null, null);
    };

    if (loading && !data) {
        return (
            <div className="flex items-center justify-center min-h-screen text-white">
                <div style={{ textAlign: 'center' }}>
                    <div className="spinner" style={{ border: '4px solid var(--border-color)', borderLeft: '4px solid var(--accent-color)', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }}></div>
                    <p>Loading insights...</p>
                    <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
                </div>
            </div>
        );
    }

    if (!data) return <div className="text-white p-8">Unable to load support data.</div>;

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
        <div style={{ width: '100%', height: '100vh', overflowY: 'auto', background: 'var(--bg-main)' }}>
            <div className="dashboard-container" style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto', color: 'var(--text-main)', minHeight: '100%' }}>
                <button
                    onClick={() => navigate('/dashboard')}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                        background: 'var(--card-bg)', border: '1px solid var(--border-color)',
                        color: 'var(--text-secondary)', cursor: 'pointer',
                        marginBottom: '2rem', padding: '0.5rem 1rem', borderRadius: '8px',
                        transition: 'all 0.2s ease'
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.background = 'var(--border-color)'; e.currentTarget.style.color = 'var(--text-main)'; }}
                    onMouseOut={(e) => { e.currentTarget.style.background = 'var(--card-bg)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                >
                    <ArrowLeft size={18} /> Back to Dashboard
                </button>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-panel-hero"
                    style={{
                        padding: '3rem', marginBottom: '3rem',
                        background: `linear-gradient(135deg, rgba(76, 175, 80, 0.1) 0%, rgba(0,0,0,0) 100%)`,
                        borderLeft: `6px solid ${color}`,
                        borderRadius: '16px',
                        boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid var(--border-color)'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '1rem' }}>
                        <Shield size={48} color={color} style={{ filter: `drop-shadow(0 0 10px ${color})` }} />
                        <div>
                            <h1 style={{ margin: 0, fontSize: '2.5rem', fontWeight: '700', letterSpacing: '-0.02em', color: 'var(--text-main)' }}>Emotional Support & Safety</h1>
                        </div>
                    </div>
                    <p style={{ fontSize: '1.2rem', opacity: 0.8, maxWidth: '600px', lineHeight: '1.6' }}>
                        This dashboard helps you understand your emotional patterns over time and connects you with support if needed.
                    </p>
                </motion.div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem', marginBottom: '3rem' }}>
                    {/* Severity Card */}
                    <motion.div
                        className="glass-card"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.1 }}
                        style={{
                            padding: '2.5rem',
                            background: 'var(--card-bg)',
                            borderRadius: '16px',
                            border: '1px solid var(--border-color)'
                        }}
                    >
                        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.5rem', marginBottom: '2rem' }}>
                            <ActivityIcon color={color} /> Pattern Severity
                        </h2>

                        <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                            <div style={{
                                fontSize: '4rem', fontWeight: '800', color: color,
                                textShadow: `0 0 20px ${color}40`, letterSpacing: '0.05em'
                            }}>
                                {severityLevel}
                            </div>
                            <div style={{
                                fontSize: '1rem', color: color, opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '0.5rem'
                            }}>Non-Clinical Assessment</div>
                        </div>

                        <div style={{
                            background: 'var(--border-color)', padding: '1.5rem', borderRadius: '12px',
                            borderLeft: `4px solid ${color}`,
                            marginTop: '1rem'
                        }}>
                            <p style={{ margin: 0, fontSize: '1.05rem', lineHeight: '1.6' }}>{severity.summary}</p>
                        </div>
                    </motion.div>

                    {/* Guidance Card */}
                    <motion.div
                        className="glass-card"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2 }}
                        style={{
                            padding: '2.5rem',
                            background: 'var(--card-bg)',
                            borderRadius: '16px',
                            border: '1px solid var(--border-color)'
                        }}
                    >
                        <h2 style={{ fontSize: '1.5rem', marginBottom: '2rem' }}>Guidance & Insights</h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            {resources.guidance_text.map((text, i) => (
                                <div key={i} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', background: 'var(--card-bg)', padding: '1rem', borderRadius: '10px' }}>
                                    <Info size={24} color="var(--accent-color)" style={{ minWidth: '24px', marginTop: '2px' }} />
                                    <p style={{ margin: 0, fontSize: '1.05rem', lineHeight: '1.6', opacity: 0.9 }}>{text}</p>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                </div>

                {/* Tele-MANAS Banner */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    style={{
                        padding: '2.5rem', marginBottom: '3rem',
                        background: 'linear-gradient(90deg, rgba(33, 150, 243, 0.15), rgba(33, 150, 243, 0.05))',
                        borderRadius: '16px',
                        border: '1px solid rgba(33, 150, 243, 0.2)',
                        display: 'flex', flexWrap: 'wrap', gap: '2rem', justifyContent: 'space-between', alignItems: 'center'
                    }}
                >
                    <div style={{ flex: 1, minWidth: '300px' }}>
                        <h2 style={{ fontSize: '2rem', color: 'var(--primary-blue)', margin: '0 0 1rem 0' }}>{resources.tele_manas.name}</h2>
                        <p style={{ margin: 0, fontSize: '1.1rem', opacity: 0.9, lineHeight: '1.6' }}>{resources.tele_manas.description}</p>
                    </div>
                    <div style={{ textAlign: 'center', background: 'var(--border-color)', padding: '1.5rem 3rem', borderRadius: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                            <Phone size={36} color="var(--primary-blue)" />
                            <span style={{ fontSize: '3.5rem', fontWeight: '800', letterSpacing: '0.05em', color: 'var(--text-main)' }}>{resources.tele_manas.phone}</span>
                        </div>
                        <div style={{
                            background: '#2196f3', color: 'white', padding: '0.4rem 1.2rem',
                            borderRadius: '20px', display: 'inline-block', fontWeight: 'bold', fontSize: '0.9rem',
                            textTransform: 'uppercase', letterSpacing: '0.1em'
                        }}>
                            Available {resources.tele_manas.hours}
                        </div>
                    </div>
                </motion.div>

                {/* Nearby Professionals */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    style={{
                        padding: '3rem',
                        background: 'var(--card-bg)',
                        borderRadius: '16px',
                        border: '1px solid var(--border-color)'
                    }}
                >
                    <h2 style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '2rem', marginBottom: '1.5rem' }}>
                        <MapPin size={32} color="var(--accent-color)" /> Nearby Professionals
                    </h2>

                    {!consentGiven ? (
                        <div style={{ textAlign: 'center', padding: '4rem 2rem', background: 'var(--border-color)', borderRadius: '12px' }}>
                            <MapPin size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                            <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Find Support Near You</h3>
                            <p style={{ marginBottom: '2rem', fontSize: '1.1rem', opacity: 0.7, maxWidth: '500px', margin: '0 auto 2rem auto' }}>
                                To show real nearby psychologists and clinics, we need permission to interpret the general location of your browser.
                            </p>
                            {locationError && (
                                <div style={{ color: '#f44336', marginBottom: '1.5rem', fontWeight: 'bold' }}>⚠️ {locationError}</div>
                            )}
                            <button
                                onClick={handleGrantConsent}
                                style={{
                                    padding: '1rem 3rem',
                                    background: 'var(--accent-color)', color: 'black',
                                    border: 'none', borderRadius: '50px',
                                    cursor: 'pointer', fontWeight: 'bold', fontSize: '1.1rem',
                                    boxShadow: '0 4px 15px rgba(76, 175, 80, 0.3)',
                                    transition: 'transform 0.2s'
                                }}
                                onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
                                onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
                            >
                                {loading ? "Locating..." : "Show Nearby Help"}
                            </button>
                        </div>
                    ) : (
                        <div style={{ marginTop: '2rem' }}>
                            {location && (
                                <div style={{ height: '400px', borderRadius: '12px', overflow: 'hidden', marginBottom: '2rem', border: '1px solid var(--border-color)' }}>
                                    <MapContainer center={[location.lat, location.lon]} zoom={13} style={{ height: '100%', width: '100%' }}>
                                        <TileLayer
                                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                        />
                                        <Marker position={[location.lat, location.lon]}>
                                            <Popup>You are here</Popup>
                                        </Marker>
                                        {nearbyHelp.map((help, i) => (
                                            help.lat && help.lon && (
                                                <Marker key={i} position={[help.lat, help.lon]}>
                                                    <Popup>
                                                        <b>{help.name}</b><br />
                                                        {help.clinic}<br />
                                                        {help.distance} away
                                                    </Popup>
                                                </Marker>
                                            )
                                        ))}
                                    </MapContainer>
                                </div>
                            )}
                            {nearbyHelp.length > 0 ? (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
                                    {nearbyHelp.map((help, i) => (
                                        <motion.div
                                            key={i}
                                            whileHover={{ y: -5, boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}
                                            style={{
                                                background: 'var(--card-bg)', padding: '2rem', borderRadius: '12px',
                                                border: '1px solid var(--border-color)', transition: 'all 0.3s ease'
                                            }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                                                <h3 style={{ margin: 0, color: 'var(--accent-color)', fontSize: '1.3rem' }}>{help.name}</h3>
                                                <span style={{
                                                    background: 'rgba(76, 175, 80, 0.1)', color: '#81c784',
                                                    padding: '0.3rem 0.8rem', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold'
                                                }}>
                                                    {help.distance}
                                                </span>
                                            </div>
                                            <p style={{ margin: '0 0 1rem 0', fontWeight: '500', opacity: 0.9, fontSize: '1.1rem' }}>{help.clinic}</p>

                                            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: 0.8 }}><Phone size={16} /> {help.contact}</span>
                                                <a
                                                    href={help.map_link}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    style={{
                                                        color: 'var(--primary-blue)', textDecoration: 'none', fontWeight: 'bold',
                                                        display: 'flex', alignItems: 'center', gap: '0.3rem'
                                                    }}
                                                >
                                                    View Map <ArrowLeft size={14} style={{ transform: 'rotate(135deg)' }} />
                                                </a>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            ) : (
                                <div style={{ textAlign: 'center', padding: '3rem', opacity: 0.7 }}>
                                    <p>No professionals found nearby in OpenStreetMap database.</p>
                                </div>
                            )}
                            <div style={{ marginTop: '3rem', textAlign: 'center' }}>
                                <button
                                    onClick={handleRevokeConsent}
                                    style={{
                                        background: 'transparent', border: '1px solid #ef5350', color: '#ef5350',
                                        padding: '0.8rem 2rem', borderRadius: '8px', cursor: 'pointer',
                                        fontSize: '0.9rem', fontWeight: 'bold', letterSpacing: '0.05em',
                                        transition: 'background 0.2s'
                                    }}
                                    onMouseOver={(e) => e.target.style.background = 'rgba(239, 83, 80, 0.1)'}
                                    onMouseOut={(e) => e.target.style.background = 'transparent'}
                                >
                                    Revoke Location Access
                                </button>
                            </div>
                        </div>
                    )}
                </motion.div>
            </div>
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
