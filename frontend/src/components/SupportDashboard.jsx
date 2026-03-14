import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Shield, Phone, MapPin, Info, ArrowLeft, Upload, FileText, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { fetchSupportInsights, getMentalHealthInfo, getAlerts, getMedicalRecords, uploadMedicalRecord } from '../api';
import MedicalLogTable from './MedicalLogTable';
import AuthContext from '../context/AuthContext';
import { useContext } from 'react';

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

    const [conditions, setConditions] = useState([]);
    const [detectedPatterns, setDetectedPatterns] = useState([]);
    const [expandedSymptoms, setExpandedSymptoms] = useState({});

    const toggleSymptoms = (index) => {
        setExpandedSymptoms(prev => ({
            ...prev,
            [index]: !prev[index]
        }));
    };

    const { user } = useContext(AuthContext);
    const [alerts, setAlerts] = useState([]);
    const [records, setRecords] = useState([]);
    const [uploading, setUploading] = useState(false);

    const loadData = useCallback(async (lat = null, lon = null) => {
        try {
            setLoading(true);
            const [res, conditionsRes, alertsRes, recordsRes] = await Promise.all([
                fetchSupportInsights(14, consentGiven, lat, lon),
                getMentalHealthInfo(),
                getAlerts(),
                getMedicalRecords(user.id) // Fetch own records
            ]);

            setData(res.data);
            setConditions(conditionsRes.data);
            setAlerts(alertsRes.data || []);
            setRecords(recordsRes.data || []);

            // New: Set detected pattern conditions
            if (res.data.detected_conditions) {
                setDetectedPatterns(res.data.detected_conditions);
            }

            if (consentGiven && res.data.resources?.nearby_help) {
                setNearbyHelp(res.data.resources.nearby_help);
            }
        } catch (e) {
            console.error("Failed to load support insights", e);
        } finally {
            setLoading(false);
        }
    }, [consentGiven]);

    useEffect(() => {
        // Initial load without location
        loadData();
    }, [loadData]);

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

    const handleFileUpload = async (e) => {
        if (e.target.files[0]) {
            const formData = new FormData();
            formData.append('file', e.target.files[0]);
            formData.append('description', 'Uploaded from Support Dashboard');

            setUploading(true);
            try {
                await uploadMedicalRecord(user.id, formData);
                // Refresh records
                const res = await getMedicalRecords(user.id);
                setRecords(res.data || []);
                alert("File uploaded successfully.");
            } catch (err) {
                console.error("Upload failed", err);
                alert("Failed to upload file.");
            } finally {
                setUploading(false);
            }
        }
    };

    // Helper to get download URL
    const getDownloadUrl = (filePath) => {
        // Assume API is on localhost:8000 for now or use env if available in context
        // Ideally this should use the same base URL as Axios
        const API_BASE = "http://127.0.0.1:8000";
        // Remove backslashes
        const relativePath = filePath.replace(/\\/g, '/');
        return `${API_BASE}/${relativePath}`;
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
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            overflowY: 'auto',
            background: 'transparent',
            zIndex: 1000
        }}>
            <div className="dashboard-container" style={{ padding: '2rem', width: '100%', color: 'var(--text-main)', minHeight: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <button
                        onClick={() => navigate('/dashboard')}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                            background: 'var(--card-bg)', border: '1px solid var(--border-color)',
                            color: 'var(--text-secondary)', cursor: 'pointer',
                            padding: '0.5rem 1rem', borderRadius: '8px',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        <ArrowLeft size={16} /> Back to Dashboard
                    </button>


                </div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-panel"
                    style={{
                        padding: '3rem', marginBottom: '3rem',
                        background: `linear-gradient(135deg, ${color}20 0%, transparent 100%)`,
                        borderLeft: `6px solid ${color}`,
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '1rem' }}>
                        <Shield size={48} color={color} style={{ filter: `drop-shadow(0 0 10px ${color})` }} />
                        <div>
                            <h1 className="serif-heading" style={{ margin: 0, fontSize: '2.5rem', fontWeight: '700', letterSpacing: '-0.02em', color: 'var(--text-main)' }}>Emotional Support & Safety</h1>
                        </div>
                    </div>
                    <p style={{ fontSize: '1.2rem', opacity: 0.8, maxWidth: '600px', lineHeight: '1.6' }}>
                        This dashboard helps you understand your emotional patterns over time and connects you with support if needed.
                    </p>
                </motion.div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem', marginBottom: '3rem' }}>
                    {/* Severity Card */}
                    <motion.div
                        className="glass-panel"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.1 }}
                        style={{
                            padding: '2.5rem',
                        }}
                    >
                        <h2 className="serif-heading" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.5rem', marginBottom: '2rem' }}>
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
                        className="glass-panel"
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
                        <h2 className="serif-heading" style={{ fontSize: '1.5rem', marginBottom: '2rem' }}>Guidance & Insights</h2>
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

                {/* Personalized Analysis */}
                {detectedPatterns.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        style={{
                            marginBottom: '3rem',
                            padding: '2.5rem',
                            background: 'var(--card-bg)',
                            borderRadius: '16px',
                            border: '1px solid var(--border-color)',
                            borderLeft: '6px solid var(--accent-color)'
                        }}
                    >
                        <h2 className="serif-heading" style={{ fontSize: '2rem', marginBottom: '1.5rem', color: 'var(--text-main)' }}>Personal Pattern Analysis (Beta)</h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            {detectedPatterns.map((p, i) => {
                                let badgeColor = '#4caf50'; // Low
                                if (p.level === 'Moderate') badgeColor = '#ff9800';
                                if (p.level === 'High') badgeColor = '#f44336';

                                return (
                                    <div key={i} style={{ background: 'var(--bg-panel)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                            <h3 style={{ margin: 0, fontSize: '1.4rem', color: 'var(--text-main)' }}>{p.name}</h3>
                                            <span style={{ background: badgeColor, color: 'white', padding: '0.3rem 0.8rem', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold' }}>
                                                {p.level} Risk
                                            </span>
                                        </div>

                                        {/* Recent Alerts Section */}
                                        {alerts.length > 0 && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: 0.15 }}
                                                style={{
                                                    marginBottom: '3rem',
                                                    padding: '2rem',
                                                    background: 'rgba(244, 67, 54, 0.1)',
                                                    borderRadius: '16px',
                                                    border: '1px solid rgba(244, 67, 54, 0.3)'
                                                }}
                                            >
                                                <h2 className="serif-heading" style={{ fontSize: '2rem', marginBottom: '1.5rem', color: '#e53935' }}>Recent Alerts</h2>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                                    {alerts.map((alert, i) => (
                                                        <div key={i} style={{
                                                            background: 'var(--bg-card)',
                                                            padding: '1rem',
                                                            borderRadius: '8px',
                                                            borderLeft: '4px solid #e53935',
                                                            display: 'flex',
                                                            justifyContent: 'space-between',
                                                            alignItems: 'center'
                                                        }}>
                                                            <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{alert.message || "Drift Detected"}</span>
                                                            <span style={{ opacity: 0.7, fontSize: '0.9rem' }}>{new Date(alert.created_at).toLocaleDateString()}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </motion.div>
                                        )}
                                        <p style={{ fontSize: '1.05rem', margin: '0 0 1rem 0', opacity: 0.9 }}>{p.description}</p>
                                        <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '1rem', borderRadius: '8px' }}>
                                            <strong style={{ color: 'var(--accent-color)' }}>Recommendation:</strong> {p.recommendation}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </motion.div>
                )}

                {/* Mental Health Conditions Reference */}
                {conditions.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.25 }}
                        style={{
                            marginBottom: '3rem',
                            padding: '2rem',
                            background: 'var(--card-bg)',
                            borderRadius: '16px',
                            border: '1px solid var(--border-color)'
                        }}
                    >
                        <h2 className="serif-heading" style={{ fontSize: '2rem', marginBottom: '1.5rem', color: 'var(--text-main)' }}>Mental Health Conditions & Symptoms</h2>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                            {conditions.map((c, i) => (
                                <div key={i} style={{ background: 'var(--bg-panel)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                                    <h3 style={{ color: 'var(--accent-color)', marginTop: 0 }}>{c.condition}</h3>
                                    <p style={{ fontSize: '0.9rem', opacity: 0.8, marginBottom: '1rem' }}>{c.description}</p>

                                    <h4 style={{ fontSize: '0.9rem', color: 'var(--text-main)', marginBottom: '0.5rem' }}>Symptoms:</h4>
                                    <ul style={{ paddingLeft: '1.2rem', marginBottom: '1rem', fontSize: '0.85rem', opacity: 0.8 }}>
                                        {(expandedSymptoms[i] ? c.symptoms : c.symptoms.slice(0, 4)).map((s, j) => <li key={j}>{s}</li>)}
                                        {c.symptoms.length > 4 && (
                                            <li
                                                onClick={() => toggleSymptoms(i)}
                                                style={{
                                                    color: 'var(--accent-color)',
                                                    cursor: 'pointer',
                                                    fontWeight: 'bold',
                                                    marginTop: '0.5rem',
                                                    listStyle: 'none'
                                                }}
                                                onMouseOver={(e) => e.target.style.textDecoration = 'underline'}
                                                onMouseOut={(e) => e.target.style.textDecoration = 'none'}
                                            >
                                                {expandedSymptoms[i] ? "Show less" : `+ ${c.symptoms.length - 4} more`}
                                            </li>
                                        )}
                                    </ul>

                                    <h4 style={{ fontSize: '0.9rem', color: 'var(--text-main)', marginBottom: '0.5rem' }}>Helpful Strategies:</h4>
                                    <ul style={{ paddingLeft: '1.2rem', fontSize: '0.85rem', opacity: 0.8 }}>
                                        {c.strategies.slice(0, 3).map((s, j) => <li key={j}>{s}</li>)}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}

                {/* Medical Records Section */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem', marginBottom: '3rem' }}>
                    {/* Medical Records Upload */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.28 }}
                        style={{
                            padding: '2.5rem',
                            background: 'var(--card-bg)',
                            borderRadius: '16px',
                            border: '1px solid var(--border-color)',
                            height: '100%'
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h2 className="serif-heading" style={{ fontSize: '2rem', margin: 0, color: 'var(--text-main)' }}>Medical Files</h2>
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                <input
                                    type="file"
                                    id="support-upload"
                                    style={{ display: 'none' }}
                                    onChange={handleFileUpload}
                                    disabled={uploading}
                                />
                                <label
                                    htmlFor="support-upload"
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                                        padding: '0.6rem 1.2rem',
                                        background: 'var(--accent-color)', color: 'var(--accent-text)',
                                        borderRadius: '8px', cursor: uploading ? 'not-allowed' : 'pointer',
                                        fontWeight: 'bold', fontSize: '0.9rem',
                                        opacity: uploading ? 0.7 : 1
                                    }}
                                >
                                    {uploading ? "Uploading..." : <><Upload size={16} /> Upload New</>}
                                </label>
                            </div>
                        </div>

                        {records.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '2rem', opacity: 0.6, border: '1px dashed var(--border-color)', borderRadius: '12px' }}>
                                <FileText size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                                <p>No medical records uploaded yet.</p>
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
                                {records.map((rec) => (
                                    <div key={rec.id} style={{
                                        background: 'var(--bg-panel)', padding: '1rem',
                                        borderRadius: '10px', border: '1px solid var(--border-color)',
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', overflow: 'hidden' }}>
                                            <FileText size={20} color="var(--text-secondary)" />
                                            <div style={{ overflow: 'hidden' }}>
                                                <p style={{ margin: 0, fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-main)' }} title={rec.filename}>
                                                    {rec.filename}
                                                </p>
                                                <p style={{ margin: 0, fontSize: '0.8rem', opacity: 0.6 }}>
                                                    {new Date(rec.uploaded_at).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                        <a
                                            href={getDownloadUrl(rec.file_path)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{
                                                color: 'var(--text-secondary)',
                                                padding: '0.5rem',
                                                borderRadius: '50%',
                                                transition: 'background 0.2s',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                                            }}
                                            title="Download"
                                            onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'var(--text-main)'; }}
                                            onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                                        >
                                            <Download size={18} />
                                        </a>
                                    </div>
                                ))}
                            </div>
                        )}
                    </motion.div>

                    {/* Medical Log Table */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        style={{
                            padding: '2.5rem',
                            background: 'var(--card-bg)',
                            borderRadius: '16px',
                            border: '1px solid var(--border-color)',
                            height: '100%'
                        }}
                    >
                        <h2 className="serif-heading" style={{ fontSize: '2rem', marginBottom: '1.5rem', color: 'var(--text-main)' }}>Medicine Tracker</h2>
                        <MedicalLogTable />
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
                        <h2 className="serif-heading" style={{ fontSize: '2rem', color: 'var(--primary-blue)', margin: '0 0 1rem 0' }}>{resources.tele_manas.name}</h2>
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
                    <h2 className="serif-heading" style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '2rem', marginBottom: '1.5rem' }}>
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
        </div >
    );
};

// Helper for icon (could be in same file or imported)
const ActivityIcon = ({ color }) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
    </svg>
);

export default SupportDashboard;
