import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPatientInsights, getPatientLogs, getMedicalRecords, uploadMedicalRecord, generateReport } from '../api';
import { ArrowLeft, MessageSquare, Clipboard, FileText, Calendar, AlertTriangle, TrendingUp, Sun, Moon, LayoutDashboard, AlignLeft, UserCircle, Pill, Download, Folder, Music } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ReferenceLine } from 'recharts';
import { getPatientTherapies, prescribeTherapy } from '../api';
import ChatInterface from './ChatInterface';
import MedicalLogTable from './MedicalLogTable';
import DoctorVoiceAssistant from './DoctorVoiceAssistant';

const PatientDetailView = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [allTextLogs, setAllTextLogs] = useState([]); // Store all logs
    const [allFaceLogs, setAllFaceLogs] = useState([]); // Store all logs
    const [filteredTextLogs, setFilteredTextLogs] = useState([]); // Displayed logs
    const [records, setRecords] = useState([]);
    const [therapies, setTherapies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showChat, setShowChat] = useState(false);
    const [activeTab, setActiveTab] = useState('overview');

    // Filter State
    const [selectedDateFilter, setSelectedDateFilter] = useState('today'); // 'today', 'yesterday', 'all'

    const loadData = useCallback(async () => {
        try {
            const [insightsRes, logsRes, recordsRes, therapiesRes] = await Promise.all([
                getPatientInsights(id),
                getPatientLogs(id),
                getMedicalRecords(id),
                getPatientTherapies(id)
            ]);
            setData(insightsRes.data);
            setRecords(recordsRes.data || []);
            setTherapies(therapiesRes.data || []);

            // Handle new structure
            if (logsRes.data.text_logs) {
                setAllTextLogs(logsRes.data.text_logs);
                setAllFaceLogs(logsRes.data.face_logs || []);
            } else {
                setAllTextLogs(logsRes.data);
            }
        } catch {
            console.error("Failed to load patient data");
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Effect to filter logs when date selection changes
    useEffect(() => {
        if (!allTextLogs.length) return;

        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        let filtered = [];
        if (selectedDateFilter === 'today') {
            filtered = allTextLogs.filter(log => new Date(log.created_at) >= today);
        } else if (selectedDateFilter === 'yesterday') {
            filtered = allTextLogs.filter(log => {
                const logDate = new Date(log.created_at);
                return logDate >= yesterday && logDate < today;
            });
        } else {
            filtered = allTextLogs;
        }
        setFilteredTextLogs(filtered);
    }, [selectedDateFilter, allTextLogs]);


    // Helper to get download URL
    const getDownloadUrl = (filePath) => {
        // filePath is like "storage/medical_records/1/file.pdf"
        // We mounted "/storage" to "storage" dir
        // Ensure path separators are handled
        const relativePath = filePath.replace(/\\/g, '/');
        // If path starts with storage/, remove it to match mount? 
        // Actually, if we mount "storage" to "/storage", and file_path is "storage/...",
        // we might need to strip the prefix or adjust.
        // Let's assume the API returns relative path from root.
        // We need URL: http://localhost:8000/{filePath}
        const API_BASE = "http://127.0.0.1:8000"; // Should use env
        return `${API_BASE}/${relativePath}`;
    };

    const handleGenerateReport = async () => {
        try {
            setLoading(true);
            const res = await generateReport({
                user_id: id,
                from_date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
                to_date: new Date().toISOString()
            });
            // Download Logic
            const downloadUrl = res.data.download_url;
            import('../api').then(async ({ API }) => {
                const response = await API.get(downloadUrl, { responseType: 'blob' });
                const url = window.URL.createObjectURL(new Blob([response.data]));
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', `report_${id}.pdf`);
                document.body.appendChild(link);
                link.click();
                link.parentNode.removeChild(link);
                setLoading(false);
            });
        } catch (e) {
            console.error(e);
            alert("Failed to generate report");
            setLoading(false);
        }
    };

    const handleFileUpload = async (e) => {
        if (e.target.files[0]) {
            const formData = new FormData();
            formData.append('file', e.target.files[0]);
            formData.append('patient_id', id);
            try {
                await uploadMedicalRecord(id, formData);
                loadData();
            } catch {
                alert("Upload failed");
            }
        }
    };

    const handlePrescribeTherapy = async () => {
        const type = prompt("Enter therapy type (e.g. binaural, lofi, general):", "binaural");
        if (!type) return;
        const hzStr = prompt("Enter frequency Hz (or leave blank if none):", "432");
        const freq = hzStr ? parseInt(hzStr) : null;
        
        try {
            await prescribeTherapy({
                user_id: parseInt(id),
                therapy_type: type,
                name: "Custom Music Therapy Session",
                description: "Prescribed to regulate emotional drift and reduce anxiety.",
                duration_minutes: 15,
                frequency_hz: freq,
                is_active: true
            });
            loadData();
            alert("Therapy prescribed successfully");
        } catch (e) {
            alert("Failed to prescribe therapy.");
        }
    };

    if (loading) return <div className="pd-container" style={{ background: 'transparent' }}>Loading patient data...</div>;
    if (!data) return <div className="pd-container" style={{ background: 'transparent' }}>Patient not found or access denied.</div>;

    const { active_alerts, patient_email, current_instant_risk, stress_trend } = data;
    const name = patient_email.split('@')[0];

    const renderContent = () => {
        if (activeTab === 'overview') {
            return (
                <div className="pd-grid">
                    {/* 2. Ready for Review / Text Logs Summary */}
                    <div className="pd-card glass-panel">
                        <div className="pd-card-header">
                            <span className="pd-card-title serif-heading">Recent Text Logs</span>
                        </div>
                        <div className="pd-big-number">{filteredTextLogs.length}</div>

                        <div style={{ maxHeight: '180px', overflowY: 'auto' }}>
                            <table className="pd-log-table">
                                <tbody>
                                    {filteredTextLogs.slice(0, 5).map(log => (
                                        <tr key={log.id}>
                                            <td className="pd-log-emotion" style={{ color: log.emotion === 'anger' || log.emotion === 'fear' ? 'var(--pd-accent-alert)' : 'inherit' }}>
                                                {log.emotion}
                                            </td>
                                            <td>{(log.confidence * 100).toFixed(0)}%</td>
                                            <td style={{ textAlign: 'right', opacity: 0.6 }}>
                                                {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredTextLogs.length === 0 && (
                                        <tr><td colSpan="3" style={{ textAlign: 'center', opacity: 0.5 }}>No logs for this period</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* 3. High Risk / Conditions -> Active Alert Badges */}
                    <div className="pd-card glass-panel">
                        <div className="pd-card-header">
                            <span className="pd-card-title serif-heading">Active Alert Badges</span>
                            <AlertTriangle size={18} color="var(--pd-accent-alert)" />
                        </div>

                        <div style={{ marginBottom: '1rem', padding: '1rem', background: 'var(--bg-input)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                <span style={{ fontWeight: 'bold' }}>Instant Risk Score</span>
                                <span>{(current_instant_risk || 0).toFixed(2)}</span>
                            </div>
                            <div style={{ height: '8px', background: 'var(--bg-main)', borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                                <div style={{ height: '100%', width: Math.min(100, Math.max(0, (current_instant_risk || 0) * 100)) + '%', background: (current_instant_risk > 0.85) ? 'var(--emotion-anger)' : (current_instant_risk > 0.7 ? 'var(--emotion-disgust)' : 'var(--emotion-happy)') }}></div>
                            </div>
                        </div>

                        <ul className="pd-alert-list">
                            {active_alerts?.map((c, i) => (
                                <li key={i} className="pd-alert-item" style={{ color: 'var(--text-main)' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ fontWeight: 'bold', fontSize: '0.9rem', color: 'var(--text-main)' }}>{c.type.replace(/_/g, " ")}</span>
                                        <span style={{ fontSize: '0.75rem', opacity: 0.7, color: 'var(--text-secondary)' }}>Score: {c.score.toFixed(2)} | {new Date(c.timestamp).toLocaleTimeString()}</span>
                                    </div>
                                    <span className={c.level === 'HIGH' ? 'risk-high' : 'risk-medium'} style={{ background: c.level === 'HIGH' ? 'rgba(255,100,100,0.2)' : 'rgba(255,165,0,0.2)', color: c.level === 'HIGH' ? '#ff4d4d' : 'orange', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold', alignSelf: 'center' }}>{c.level}</span>
                                </li>
                            ))}
                            {(!active_alerts || active_alerts.length === 0) && (
                                <li className="pd-alert-item" style={{ justifyContent: 'center', opacity: 0.5, color: 'var(--text-main)' }}>No active emotional alerts</li>
                            )}
                        </ul>
                    </div>

                    {/* 4. Graph Placeholder / Trends (Full Width of Grid 2 & 3) */}
                    <div className="pd-card glass-panel" style={{ gridColumn: '1 / span 2' }}>
                        <div className="pd-card-header">
                            <span className="pd-card-title serif-heading">Stress Trend Graph (last 5 sessions)</span>
                            <TrendingUp size={18} color="var(--pd-olive-deep)" />
                        </div>
                        <div style={{
                            minHeight: '300px',
                            height: '100%',
                            background: 'var(--bg-panel)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--text-main)',
                            padding: '1rem',
                            paddingTop: '3rem'
                        }}>
                            {(stress_trend && stress_trend.length > 0) ? (
                                <ResponsiveContainer width="100%" height={250}>
                                    <BarChart
                                        data={stress_trend}
                                        margin={{ top: 20, right: 30, left: 10, bottom: 5 }}
                                    >
                                        <XAxis dataKey="time" stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
                                        <YAxis domain={[0, 100]} stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `${val}%`} />
                                        <Tooltip
                                            cursor={{ fill: 'var(--border-color)', opacity: 0.4 }}
                                            contentStyle={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-main)' }}
                                            formatter={(value, name, props) => [`${value}%`, `Stress (${props.payload.emotion})`]}
                                            labelStyle={{ color: 'var(--text-secondary)', marginBottom: '4px' }}
                                            itemStyle={{ color: 'var(--text-main)' }}
                                        />
                                        <ReferenceLine y={80} stroke="var(--emotion-anger)" strokeDasharray="3 3" />
                                        <Bar dataKey="stress" radius={[4, 4, 0, 0]} maxBarSize={40}>
                                            {
                                                stress_trend.map((log, index) => (
                                                    <Cell key={`cell-${index}`} fill={log.stress > 80 ? 'var(--emotion-anger)' : (log.stress > 50 ? 'var(--emotion-disgust)' : 'var(--primary-blue)')} />
                                                ))
                                            }
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <p style={{ opacity: 0.5 }}>No data available for this period.</p>
                            )}
                        </div>
                    </div>
                </div>
            );
        } else if (activeTab === 'text_logs') {
            return (
                <div className="pd-card glass-panel" style={{ minHeight: '500px' }}>
                    <div className="pd-card-header">
                        <span className="pd-card-title serif-heading">Full Text Logs History</span>
                    </div>
                    <div className="pd-scroll-container">
                        <table className="pd-log-table" style={{ marginTop: '0' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid var(--pd-border)' }}>
                                    <th>Time</th>
                                    <th>Emotion</th>
                                    <th>Confidence</th>
                                    <th>Context / Text</th>
                                </tr>
                            </thead>
                            <tbody>
                                {allTextLogs.map(log => (
                                    <tr key={log.id}>
                                        <td style={{ whiteSpace: 'nowrap', width: '150px' }}>{new Date(log.created_at).toLocaleString()}</td>
                                        <td className="pd-log-emotion" style={{ fontWeight: 'bold' }}>{log.emotion}</td>
                                        <td>{(log.confidence * 100).toFixed(0)}%</td>
                                        <td style={{ opacity: 0.8, fontStyle: log.text ? 'normal' : 'italic' }}>
                                            {log.text || "No text content available"}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )
        } else if (activeTab === 'face_logs') {
            return (
                <div className="pd-card glass-panel" style={{ minHeight: '500px' }}>
                    <div className="pd-card-header">
                        <span className="pd-card-title serif-heading">Face Expression Logs</span>
                    </div>
                    <div className="pd-scroll-container">
                        <table className="pd-log-table" style={{ marginTop: '0' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid var(--pd-border)' }}>
                                    <th>Time</th>
                                    <th>Detected Emotion</th>
                                    <th>Confidence Score</th>
                                </tr>
                            </thead>
                            <tbody>
                                {allFaceLogs.map(log => (
                                    <tr key={log.id}>
                                        <td style={{ whiteSpace: 'nowrap', width: '200px' }}>{new Date(log.timestamp).toLocaleString()}</td>
                                        <td className="pd-log-emotion" style={{ fontWeight: 'bold', color: 'var(--pd-olive-deep)' }}>{log.emotion}</td>
                                        <td>{(log.confidence * 100).toFixed(1)}%</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )
        } else if (activeTab === 'records') {
            return (
                <div className="pd-card glass-panel" style={{ minHeight: '500px' }}>
                    <div className="pd-card-header">
                        <span className="pd-card-title serif-heading">Medical Records & Files</span>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <input type="file" id="full-upload" style={{ display: 'none' }} onChange={handleFileUpload} />
                            <label htmlFor="full-upload" className="pd-btn secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
                                + Upload New
                            </label>
                        </div>
                    </div>
                    <ul className="pd-alert-list" style={{ marginTop: '1rem' }}>
                        {records.map(rec => (
                            <li key={rec.id} className="pd-alert-item" style={{ padding: '1rem', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <div style={{ background: 'var(--pd-beige-light)', padding: '0.8rem', borderRadius: '8px' }}>
                                        <FileText size={24} color="var(--pd-olive-deep)" />
                                    </div>
                                    <div>
                                        <p style={{ margin: 0, fontWeight: 'bold', fontSize: '1rem' }}>{rec.filename}</p>
                                        <p style={{ margin: 0, fontSize: '0.8rem', opacity: 0.6 }}>
                                            Uploaded: {new Date(rec.uploaded_at).toLocaleString()}
                                        </p>
                                        <p style={{ margin: 0, fontSize: '0.8rem', opacity: 0.6 }}>
                                            {rec.description || "No description"}
                                        </p>
                                    </div>
                                </div>
                                <div>
                                    <a
                                        href={getDownloadUrl(rec.file_path)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="pd-btn outline"
                                        style={{ textDecoration: 'none', display: 'inline-flex' }}
                                    >
                                        Download / View
                                    </a>
                                </div>
                            </li>
                        ))}
                        {records.length === 0 && (
                            <div style={{ padding: '3rem', textAlign: 'center', opacity: 0.5 }}>
                                <Clipboard size={48} style={{ marginBottom: '1rem' }} />
                                <p>No medical records found.</p>
                            </div>
                        )}
                    </ul>
                </div>
            )
        } else if (activeTab === 'medicine_log') {
            return (
                <div className="pd-card glass-panel" style={{ minHeight: '500px' }}>
                    <div className="pd-card-header">
                        <span className="pd-card-title serif-heading">Patient Medicine Log</span>
                    </div>
                    <div style={{ marginTop: '1rem' }}>
                        <MedicalLogTable patientId={id} readOnly={true} allowAdd={true} />
                    </div>
                </div>
            )
        } else if (activeTab === 'therapies') {
            return (
                <div className="pd-card glass-panel" style={{ minHeight: '500px' }}>
                    <div className="pd-card-header">
                        <span className="pd-card-title serif-heading">Prescribed Therapies</span>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <button className="pd-btn secondary" onClick={handlePrescribeTherapy} style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
                                + Prescribe Music Therapy
                            </button>
                        </div>
                    </div>
                    <ul className="pd-alert-list" style={{ marginTop: '1rem' }}>
                        {therapies.map(t => (
                            <li key={t.id} className="pd-alert-item" style={{ padding: '1rem', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <div style={{ background: 'rgba(59, 130, 246, 0.2)', padding: '0.8rem', borderRadius: '8px' }}>
                                        <Music size={24} color="var(--primary-blue)" />
                                    </div>
                                    <div>
                                        <p style={{ margin: 0, fontWeight: 'bold', fontSize: '1rem' }}>{t.name}</p>
                                        <p style={{ margin: 0, fontSize: '0.8rem', opacity: 0.8 }}>Type: {t.therapy_type} {t.frequency_hz ? `| ${t.frequency_hz}Hz` : ''} | {t.duration_minutes} Mins</p>
                                        <p style={{ margin: 0, fontSize: '0.85rem', opacity: 0.6 }}>{t.description}</p>
                                        <p style={{ margin: 0, fontSize: '0.75rem', opacity: 0.5, marginTop: '4px' }}>Prescribed: {new Date(t.prescribed_at).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                <div>
                                    <button className="pd-btn outline" style={{ pointerEvents: 'none', opacity: 0.7 }}>Active</button>
                                </div>
                            </li>
                        ))}
                        {therapies.length === 0 && (
                            <div style={{ padding: '3rem', textAlign: 'center', opacity: 0.5 }}>
                                <Music size={48} style={{ marginBottom: '1rem' }} />
                                <p>No therapies prescribed.</p>
                            </div>
                        )}
                    </ul>
                </div>
            )
        }
        return null;
    }

    return (
        <div className="pd-container" style={{ background: 'transparent' }}>
            {/* Header */}
            <header className="pd-header" style={{ background: 'transparent', borderBottom: '1px solid var(--glass-border)' }}>
                <div className="pd-title">
                    <h1 className="serif-heading" style={{ fontSize: '2.5rem' }}>Emotional Risk Assessment</h1>
                    <p style={{ opacity: 0.8 }}>Hello, Dr. You have {active_alerts?.length || 0} active emotional alerts for {name}.</p>
                </div>
                <div className="pd-controls" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>

                    <button className="pd-btn outline" onClick={() => navigate('/doctor-dashboard')}>
                        Dashboard
                    </button>
                    <button className="pd-btn" onClick={() => setShowChat(!showChat)}>
                        <MessageSquare size={16} /> Chat
                    </button>
                </div>
            </header>

            {/* Date Filters (Only show on Overview) */}
            {activeTab === 'overview' && (
                <div className="pd-date-filter">
                    <button
                        className={`pd-pill ${selectedDateFilter === 'today' ? 'active' : ''}`}
                        onClick={() => setSelectedDateFilter('today')}
                    >
                        Today
                    </button>
                    <button
                        className={`pd-pill ${selectedDateFilter === 'yesterday' ? 'active' : ''}`}
                        onClick={() => setSelectedDateFilter('yesterday')}
                    >
                        Yesterday
                    </button>
                    <button
                        className={`pd-pill ${selectedDateFilter === 'all' ? 'active' : ''}`}
                        onClick={() => setSelectedDateFilter('all')}
                    >
                        All History
                    </button>
                </div>
            )}

            {/* Layout Container: Sidebar + Content */}
            <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '1.5rem' }}>

                {/* Fixed Sidebar */}
                <div className="pd-card pd-sidebar glass-panel" style={{ height: 'fit-content' }}>
                    <div className="pd-card-header">
                        <span className="pd-card-title serif-heading">Quick Access</span>
                    </div>
                    <div style={{ marginTop: '1rem' }}>
                        <h2 className="serif-heading" style={{ fontSize: '1.5rem', margin: 0 }}>{name}</h2>
                        <p style={{ opacity: 0.7, fontSize: '0.9rem' }}>{patient_email}</p>
                    </div>

                    <ul className="pd-sidebar-menu">
                        <li className={activeTab === 'overview' ? 'active' : ''} onClick={() => setActiveTab('overview')}>
                            <LayoutDashboard size={18} /> AI Emotional Drift Dashboard
                        </li>
                        <li className={activeTab === 'text_logs' ? 'active' : ''} onClick={() => setActiveTab('text_logs')}>
                            <AlignLeft size={18} /> Text Logs
                        </li>
                        <li className={activeTab === 'face_logs' ? 'active' : ''} onClick={() => setActiveTab('face_logs')}>
                            <UserCircle size={18} /> Face Logs
                        </li>
                        <li className={activeTab === 'records' ? 'active' : ''} onClick={() => setActiveTab('records')}>
                            <Folder size={18} /> Medical Records ({records.length})
                        </li>
                        <li className={activeTab === 'medicine_log' ? 'active' : ''} onClick={() => setActiveTab('medicine_log')}>
                            <Pill size={18} /> Medicine Log
                        </li>
                        <li className={activeTab === 'therapies' ? 'active' : ''} onClick={() => setActiveTab('therapies')}>
                            <Music size={18} /> Therapies ({therapies.length})
                        </li>
                        <li onClick={handleGenerateReport} style={{ marginTop: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                            <Download size={18} /> Generate Report
                        </li>
                    </ul>
                </div>

                {/* Main Content Area */}
                <div style={{ overflowX: 'hidden' }}>
                    {renderContent()}
                </div>

            </div>

            {/* Chat Overlay */}
            {showChat && (
                <ChatInterface
                    otherUserId={id}
                    otherUserEmail={patient_email}
                    onClose={() => setShowChat(false)}
                />
            )}

            {/* Global Voice Assistant */}
            <DoctorVoiceAssistant patientId={id} />
        </div>
    );
};
export default PatientDetailView;
