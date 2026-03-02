import React, { useState, useEffect, useContext } from 'react';
import { getPatients, assignPatient } from '../api';
import { motion } from 'framer-motion';

import { User, Activity, AlertCircle, Plus, LogOut, Sun, Moon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import DoctorVoiceAssistant from './DoctorVoiceAssistant';

const PsychiatristDashboard = () => {
    const { user, logout } = useContext(AuthContext);
    const { theme, toggleTheme } = useTheme();
    const [patients, setPatients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newPatientEmail, setNewPatientEmail] = useState("");
    const navigate = useNavigate();

    useEffect(() => {
        loadPatients();
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

    return (
        <div className="pd-container">
            <header className="pd-header">
                <div className="pd-title">
                    <h1>Psychiatrist Dashboard</h1>
                    <p>Welcome back, Dr. {user?.email}</p>
                </div>
                <div className="pd-controls" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <button
                        className="icon-btn"
                        onClick={toggleTheme}
                        title={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
                        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', width: '36px', height: '36px' }}
                    >
                        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                    </button>
                    <button className="pd-btn outline" onClick={logout} title="Logout">
                        <LogOut size={16} /> Logout
                    </button>
                </div>
            </header>

            {/* Add Patient Section */}
            <div className="pd-card" style={{ marginBottom: '2rem' }}>
                <div className="pd-card-header">
                    <span className="pd-card-title">Add New Patient</span>
                    <Plus size={18} color="var(--pd-olive-deep)" />
                </div>
                <form onSubmit={handleAssign} style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                    <input
                        type="email"
                        placeholder="Enter Patient Email"
                        value={newPatientEmail}
                        onChange={(e) => setNewPatientEmail(e.target.value)}
                        required
                        style={{
                            padding: '0.8rem',
                            borderRadius: '8px',
                            border: '1px solid var(--pd-border)',
                            flex: 1,
                            background: '#fff',
                            color: 'var(--pd-text-dark)',
                            fontSize: '1rem'
                        }}
                    />
                    <button type="submit" className="pd-btn">
                        Assign Patient
                    </button>
                </form>
            </div>

            <h2 style={{
                fontSize: '1.5rem',
                fontWeight: '400',
                marginBottom: '1.5rem',
                color: 'var(--text-main)',
                borderBottom: '1px solid var(--border-color)',
                paddingBottom: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
            }}>
                <User size={24} /> My Patients ({patients.length})
            </h2>

            {/* Patient List */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
                {loading ? <p>Loading patients...</p> : patients.map(p => (
                    <motion.div
                        key={p.id}
                        className="pd-card glass-panel"
                        whileHover={{ y: -5, boxShadow: '0 10px 30px rgba(0,0,0,0.2)', borderColor: 'var(--accent-color)' }}
                        style={{
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            padding: '1.5rem',
                            background: 'var(--bg-card)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '16px'
                        }}
                        onClick={() => navigate(`/doctor/patient/${p.id}`)}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                            <div style={{
                                background: 'var(--bg-panel)',
                                padding: '12px',
                                borderRadius: '50%',
                                border: '1px solid var(--border-color)',
                                color: 'var(--primary-blue)'
                            }}>
                                <User size={24} />
                            </div>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-main)' }}>{p.email.split('@')[0]}</h3>
                                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{p.email}</p>
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1rem', borderTop: '1px dashed var(--border-color)' }}>
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Active Patient</span>
                            <div className="pd-btn secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}>
                                View Profile &rarr;
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {!loading && patients.length === 0 && (
                <div style={{ textAlign: 'center', padding: '3rem', opacity: 0.6 }}>
                    <p>No patients assigned yet.</p>
                </div>
            )}

            {/* Global Voice Assistant */}
            <DoctorVoiceAssistant />
        </div>
    );
};
export default PsychiatristDashboard;
