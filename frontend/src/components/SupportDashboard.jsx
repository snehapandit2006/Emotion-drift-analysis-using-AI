import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Phone, MapPin, Info, ArrowLeft, Upload, FileText, Download, Activity, AlertCircle, HeartPulse, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { fetchSupportInsights, getMentalHealthInfo, getAlerts, getMedicalRecords, uploadMedicalRecord } from '../api';
import MedicalLogTable from './MedicalLogTable';
import AuthContext from '../context/AuthContext';
import { useContext } from 'react';

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon, shadowUrl: iconShadow, iconSize: [25, 41], iconAnchor: [12, 41]
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

    const { user } = useContext(AuthContext);
    const [alerts, setAlerts] = useState([]);
    const [records, setRecords] = useState([]);
    const [uploading, setUploading] = useState(false);

    const toggleSymptoms = (i) => setExpandedSymptoms(prev => ({ ...prev, [i]: !prev[i] }));

    const loadData = useCallback(async (lat = null, lon = null) => {
        try {
            setLoading(true);
            const [res, conditionsRes, alertsRes, recordsRes] = await Promise.all([
                fetchSupportInsights(14, consentGiven, lat, lon),
                getMentalHealthInfo(),
                getAlerts(),
                getMedicalRecords(user.id)
            ]);
            setData(res.data);
            setConditions(conditionsRes.data);
            setAlerts(alertsRes.data || []);
            setRecords(recordsRes.data || []);
            if (res.data.detected_conditions) setDetectedPatterns(res.data.detected_conditions);
            if (consentGiven && res.data.resources?.nearby_help) setNearbyHelp(res.data.resources.nearby_help);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [consentGiven, user.id]);

    useEffect(() => { loadData(); }, [loadData]);

    const handleGrantConsent = () => {
        if (!navigator.geolocation) { setLocationError("Geolocation not supported."); return; }
        setLoading(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const { latitude, longitude } = pos.coords;
                setLocation({ lat: latitude, lon: longitude });
                setConsentGiven(true);
                setLocationError(null);
                loadData(latitude, longitude);
            },
            () => { setLocationError("Access denied."); setLoading(false); }
        );
    };

    const handleRevokeConsent = () => {
        setConsentGiven(false); setLocation(null); setNearbyHelp([]); loadData(null, null);
    };

    const handleFileUpload = async (e) => {
        if (e.target.files[0]) {
            const formData = new FormData();
            formData.append('file', e.target.files[0]);
            formData.append('description', 'Manual Upload');
            setUploading(true);
            try {
                await uploadMedicalRecord(user.id, formData);
                const res = await getMedicalRecords(user.id);
                setRecords(res.data || []);
            } catch (err) { alert("Upload failed."); }
            finally { setUploading(false); }
        }
    };

    if (loading && !data) return <div className="glass-panel" style={{ margin: '4rem auto', padding: '4rem', maxWidth: '400px', textAlign: 'center' }}>Syncing Clinical Data...</div>;
    if (!data) return <div className="glass-panel" style={{ margin: '4rem auto', padding: '2rem' }}>Connection issues.</div>;

    const { severity, resources } = data;
    const severityLevel = severity.level || "LOW";

    const getSeverityDetails = (level) => {
        switch (level) {
            case "LOW": return { color: 'var(--emotion-happy)', bg: 'rgba(136, 209, 170, 0.03)' };
            case "MEDIUM": return { color: 'var(--accent-gold)', bg: 'rgba(232, 200, 132, 0.03)' };
            case "HIGH": return { color: 'var(--emotion-anger)', bg: 'rgba(232, 132, 132, 0.03)' };
            case "CRITICAL": return { color: 'var(--emotion-anger)', bg: 'rgba(232, 132, 132, 0.08)' };
            default: return { color: 'var(--emotion-happy)', bg: 'rgba(136, 209, 170, 0.03)' };
        }
    };

    const sev = getSeverityDetails(severityLevel);

    return (
        <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
            <div style={{ marginBottom: '3rem' }}>
                <button onClick={() => navigate('/dashboard')} className="glass-button" style={{ padding: '0.6rem 1.25rem', fontSize: '0.85rem' }}>
                    <ArrowLeft size={16} style={{ marginRight: '8px' }} /> Return to Insights
                </button>
            </div>

            <motion.div 
                initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
                className="glass-panel"
                style={{
                    padding: '3rem', marginBottom: '3rem', borderLeft: `4px solid ${sev.color}`,
                    background: `linear-gradient(135deg, ${sev.bg} 0%, transparent 100%)`
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', marginBottom: '1.5rem' }}>
                    <div style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.02)', borderRadius: '24px', border: '1px solid var(--glass-border)', color: sev.color }}>
                        <Shield size={42} style={{ filter: `drop-shadow(0 0 15px ${sev.color}88)` }} />
                    </div>
                    <div>
                        <h1 className="serif-heading" style={{ fontSize: '2.25rem', marginBottom: '0.4rem', letterSpacing: '-1px' }}>Support & Safety Protocols</h1>
                        <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', maxWidth: '700px', lineHeight: 1.6 }}>
                            A clinical-grade synthesis of your emotional stability indicators and professional resource network.
                        </p>
                    </div>
                </div>
            </motion.div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem', marginBottom: '3rem' }}>
                {/* Severity Card */}
                <div className="glass-panel" style={{ padding: '2.5rem' }}>
                    <h3 className="serif-heading" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '2rem' }}>
                        <Activity size={18} style={{ color: sev.color }} /> PATTERN CRITICALLY
                    </h3>
                    <div style={{ textAlign: 'center', padding: '1rem 0 2.5rem' }}>
                        <div style={{ fontSize: '1rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '4px', marginBottom: '10px' }}>Current State</div>
                        <div style={{ fontSize: '5rem', fontWeight: '900', color: sev.color, letterSpacing: '-2px', textShadow: `0 0 30px ${sev.color}44` }}>
                            {severityLevel}
                        </div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '16px', borderLeft: `4px solid ${sev.color}` }}>
                        <p style={{ margin: 0, fontSize: '1rem', lineHeight: 1.6, color: 'var(--text-main)' }}>{severity.summary}</p>
                    </div>
                </div>

                {/* Guidance Card */}
                <div className="glass-panel" style={{ padding: '2.5rem' }}>
                    <h3 className="serif-heading" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '2rem' }}>
                        <Info size={18} style={{ color: 'var(--accent-blue)' }} /> GUIDANCE PARAMETERS
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {resources.guidance_text.map((text, i) => (
                            <div key={i} style={{ display: 'flex', gap: '1rem', background: 'rgba(255,255,255,0.01)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                                <AlertCircle size={20} style={{ color: 'var(--accent-blue)', flexShrink: 0 }} />
                                <p style={{ margin: 0, fontSize: '0.95rem', lineHeight: 1.6, opacity: 0.9 }}>{text}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Pattern Analysis */}
            {detectedPatterns.length > 0 && (
                <div className="glass-panel" style={{ padding: '1rem', height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <h2 className="serif-heading" style={{ fontSize: '0.75rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Shield size={16} /> Clinical Network
                    </h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem' }}>
                        {detectedPatterns.map((p, i) => (
                            <div key={i} className="glass-panel" style={{ padding: '2rem', background: 'rgba(0,0,0,0.2)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', color: 'var(--text-main)' }}>{p.name}</h3>
                                    <span style={{ 
                                        padding: '0.4rem 0.8rem', borderRadius: '8px', fontSize: '0.7rem', fontWeight: '800', border: '1px solid',
                                        background: p.level === 'High' ? 'rgba(232, 132, 132, 0.1)' : 'rgba(136, 209, 170, 0.1)',
                                        borderColor: p.level === 'High' ? 'var(--emotion-anger)' : 'var(--emotion-happy)',
                                        color: p.level === 'High' ? 'var(--emotion-anger)' : 'var(--emotion-happy)'
                                    }}>
                                        {p.level.toUpperCase()} RANGE
                                    </span>
                                </div>
                                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: 1.6 }}>{p.description}</p>
                                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '10px', fontSize: '0.85rem' }}>
                                    <span style={{ color: 'var(--accent-purple)', fontWeight: '800', fontSize: '0.7rem', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Recommendation</span>
                                    {p.recommendation}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Emergency CTA */}
            <div className="glass-panel" style={{ 
                padding: '3rem', marginBottom: '3rem', 
                background: 'linear-gradient(90deg, rgba(99, 102, 241, 0.1), rgba(160, 132, 232, 0.1))',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '2rem'
            }}>
                <div style={{ flex: 1, minWidth: '300px' }}>
                    <h2 className="serif-heading" style={{ fontSize: '1.75rem', color: 'var(--accent-blue)', marginBottom: '0.5rem' }}>{resources.tele_manas.name}</h2>
                    <p style={{ margin: 0, fontSize: '1.1rem', opacity: 0.8 }}>National 24/7 Mental Health Helpline</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '2.5rem', fontWeight: '900', color: 'var(--text-main)', letterSpacing: '2px' }}>{resources.tele_manas.phone}</div>
                        <div style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--accent-green)', letterSpacing: '2px', textTransform: 'uppercase' }}>Available now • Toll Free</div>
                    </div>
                    <button className="glass-button primary" style={{ width: '64px', height: '64px', borderRadius: '20px', padding: 0 }}>
                        <Phone size={24} />
                    </button>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem', marginBottom: '3rem' }}>
                {/* Medicine Tracker */}
                <div className="glass-panel" style={{ padding: '2.5rem' }}>
                    <h3 className="serif-heading" style={{ marginBottom: '2rem' }}>PHARMACO-THERAPY LOG</h3>
                    <MedicalLogTable />
                </div>

                {/* Medical Files */}
                <div className="glass-panel" style={{ padding: '2.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                        <h3 className="serif-heading">CLINICAL DOCUMENTS</h3>
                        <label htmlFor="support-upload" className="glass-button primary" style={{ padding: '0.5rem 1.25rem', fontSize: '0.75rem', cursor: 'pointer' }}>
                            <Upload size={14} style={{ marginRight: '6px' }} /> {uploading ? 'UPLOADING...' : 'UPLOAD'}
                        </label>
                        <input type="file" id="support-upload" style={{ display: 'none' }} onChange={handleFileUpload} disabled={uploading} />
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {records.map((rec) => (
                            <div key={rec.id} className="glass-panel" style={{ padding: '1.25rem', background: 'rgba(0,0,0,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                    <FileText size={20} style={{ color: 'var(--text-secondary)' }} />
                                    <div>
                                        <div style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--text-main)' }}>{rec.filename}</div>
                                        <div style={{ fontSize: '0.7rem', opacity: 0.5 }}>{new Date(rec.uploaded_at).toLocaleDateString()}</div>
                                    </div>
                                </div>
                                <a href={`http://127.0.0.1:8000/${rec.file_path.replace(/\\/g, '/')}`} target="_blank" rel="noreferrer" className="glass-button" style={{ padding: '0.5rem', borderRadius: '12px' }}>
                                    <Download size={16} />
                                </a>
                            </div>
                        ))}
                        {records.length === 0 && <div style={{ textAlign: 'center', padding: '3rem', opacity: 0.4 }}>No archival records found.</div>}
                    </div>
                </div>
            </div>

            {/* Nearby Professionals */}
            <div className="glass-panel" style={{ padding: '3rem' }}>
                <h2 className="serif-heading" style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '1.5rem', marginBottom: '2rem' }}>
                    <MapPin size={24} style={{ color: 'var(--accent-purple)' }} /> PROXIMITY RESOURCE NETWORK
                </h2>

                {!consentGiven ? (
                    <div style={{ textAlign: 'center', padding: '4rem 2rem', background: 'rgba(255,255,255,0.01)', borderRadius: '24px', border: '1px dashed var(--glass-border)' }}>
                        <MapPin size={48} style={{ opacity: 0.2, marginBottom: '1.5rem' }} />
                        <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Spatial Matching Required</h3>
                        <p style={{ color: 'var(--text-secondary)', maxWidth: '450px', margin: '0 auto 2.5rem', lineHeight: 1.6 }}>
                            Authorize location data to visualize professional clinical networks in your immediate vicinity.
                        </p>
                        <button onClick={handleGrantConsent} className="glass-button primary" style={{ padding: '1rem 3rem' }}>
                            {loading ? 'CALIBRATING...' : 'AUTHORIZE ACCESS'}
                        </button>
                    </div>
                ) : (
                    <div>
                        {location && (
                            <div style={{ height: '400px', borderRadius: '24px', overflow: 'hidden', marginBottom: '2rem', border: '1px solid var(--glass-border)' }}>
                                <MapContainer center={[location.lat, location.lon]} zoom={13} style={{ height: '100%', width: '100%' }}>
                                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                    <Marker position={[location.lat, location.lon]}><Popup>Precision Location</Popup></Marker>
                                    {nearbyHelp.map((help, i) => <Marker key={i} position={[help.lat, help.lon]}><Popup><b>{help.name}</b><br/>{help.distance} away</Popup></Marker>)}
                                </MapContainer>
                            </div>
                        )}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
                            {nearbyHelp.map((help, i) => (
                                <div key={i} className="glass-panel" style={{ padding: '2rem', transition: 'all 0.4s' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                        <h3 style={{ margin: 0, color: 'var(--accent-purple)', fontSize: '1.1rem' }}>{help.name}</h3>
                                        <span style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--accent-green)' }}>{help.distance.toUpperCase()}</span>
                                    </div>
                                    <p style={{ margin: '0 0 1.5rem', opacity: 0.8, fontSize: '0.95rem' }}>{help.clinic}</p>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div 
                                            className="glass-panel" 
                                            style={{ 
                                                padding: '1rem', 
                                                background: 'rgba(255,255,255,0.02)',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '0.5rem'
                                            }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 'bold', textTransform: 'uppercase' }}>National Helpline</span>
                                                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-green)', boxShadow: '0 0 8px var(--accent-green)' }} />
                                            </div>
                                            <div style={{ fontSize: '1.2rem', fontWeight: '900', color: 'var(--text-main)', letterSpacing: '1px' }}>14416</div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}><Phone size={14} /> {help.contact}</div>
                                        <a href={help.map_link} target="_blank" rel="noreferrer" className="glass-button" style={{ padding: '0.5rem 1rem', fontSize: '0.75rem' }}>
                                            ROUTE <ExternalLink size={12} style={{ marginLeft: '6px' }} />
                                        </a>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div style={{ marginTop: '3rem', textAlign: 'center' }}>
                            <button onClick={handleRevokeConsent} style={{ background: 'none', border: 'none', color: 'var(--emotion-anger)', fontSize: '0.8rem', fontWeight: '800', cursor: 'pointer', letterSpacing: '1px' }}>
                                REVOKE SPATIAL PRIVACY
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SupportDashboard;
