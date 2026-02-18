import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPatientInsights, getPatientLogs, getMedicalRecords, uploadMedicalRecord, generateReport } from '../api';
import { ArrowLeft, MessageSquare, Clipboard, FileText, Calendar, AlertTriangle, TrendingUp } from 'lucide-react';
import ChatInterface from './ChatInterface';
import MedicalLogTable from './MedicalLogTable';
import './PatientDetails.css'; // Import new styles

const PatientDetailView = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [allTextLogs, setAllTextLogs] = useState([]); // Store all logs
    const [allFaceLogs, setAllFaceLogs] = useState([]); // Store all logs
    const [filteredTextLogs, setFilteredTextLogs] = useState([]); // Displayed logs
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showChat, setShowChat] = useState(false);
    const [activeTab, setActiveTab] = useState('overview');

    // Filter State
    const [selectedDateFilter, setSelectedDateFilter] = useState('today'); // 'today', 'yesterday', 'all'

    const loadData = useCallback(async () => {
        try {
            const [insightsRes, logsRes, recordsRes] = await Promise.all([
                getPatientInsights(id),
                getPatientLogs(id),
                getMedicalRecords(id)
            ]);
            setData(insightsRes.data);
            setRecords(recordsRes.data || []);

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

    if (loading) return <div className="pd-container">Loading patient data...</div>;
    if (!data) return <div className="pd-container">Patient not found or access denied.</div>;

    const { detected_conditions, patient_email } = data;
    const name = patient_email.split('@')[0];

    const renderContent = () => {
        if (activeTab === 'overview') {
            return (
                <div className="pd-grid">
                    {/* 2. Ready for Review / Text Logs Summary */}
                    <div className="pd-card">
                        <div className="pd-card-header">
                            <span className="pd-card-title">Recent Text Logs</span>
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

                    {/* 3. High Risk / Conditions */}
                    <div className="pd-card">
                        <div className="pd-card-header">
                            <span className="pd-card-title">Risk Factors</span>
                            <AlertTriangle size={18} color="var(--pd-accent-alert)" />
                        </div>
                        <div className="pd-big-number">
                            {detected_conditions?.length || 0}
                        </div>

                        <ul className="pd-alert-list">
                            {detected_conditions?.map((c, i) => (
                                <li key={i} className="pd-alert-item">
                                    <span>{c.name}</span>
                                    <span className={c.level === 'High' ? 'risk-high' : ''}>{c.level}</span>
                                </li>
                            ))}
                            {(!detected_conditions || detected_conditions.length === 0) && (
                                <li className="pd-alert-item" style={{ justifyContent: 'center', opacity: 0.5 }}>No active risks</li>
                            )}
                        </ul>
                    </div>

                    {/* 4. Graph Placeholder / Trends (Full Width of Grid 2 & 3) */}
                    <div className="pd-card" style={{ gridColumn: '1 / span 2' }}>
                        <div className="pd-card-header">
                            <span className="pd-card-title">Sentiment Trend ({selectedDateFilter})</span>
                            <TrendingUp size={18} color="var(--pd-olive-deep)" />
                        </div>
                        <div style={{
                            minHeight: '300px',
                            height: '100%',
                            background: 'rgba(0,0,0,0.03)',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--pd-olive-medium)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '100px' }}>
                                {filteredTextLogs.slice(0, 20).reverse().map((log, i) => (
                                    <div key={i} style={{
                                        width: '15px',
                                        height: `${Math.max(log.confidence * 100, 10)}%`,
                                        background: log.emotion === 'happy' ? 'var(--pd-sage)' :
                                            log.emotion === 'neutral' ? '#ccc' : 'var(--pd-olive-deep)',
                                        borderRadius: '2px 2px 0 0',
                                        opacity: 0.8
                                    }} title={`${log.emotion}: ${log.confidence}`} />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            );
        } else if (activeTab === 'text_logs') {
            return (
                <div className="pd-card" style={{ minHeight: '500px' }}>
                    <div className="pd-card-header">
                        <span className="pd-card-title">Full Text Logs History</span>
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
                <div className="pd-card" style={{ minHeight: '500px' }}>
                    <div className="pd-card-header">
                        <span className="pd-card-title">Face Expression Logs</span>
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
                <div className="pd-card" style={{ minHeight: '500px' }}>
                    <div className="pd-card-header">
                        <span className="pd-card-title">Medical Records & Files</span>
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
                <div className="pd-card" style={{ minHeight: '500px' }}>
                    <div className="pd-card-header">
                        <span className="pd-card-title">Patient Medicine Log</span>
                    </div>
                    <div style={{ marginTop: '1rem' }}>
                        <MedicalLogTable patientId={id} readOnly={true} />
                    </div>
                </div>
            )
        }
        return null;
    }

    return (
        <div className="pd-container">
            {/* Header */}
            <header className="pd-header">
                <div className="pd-title">
                    <h1>{selectedDateFilter === 'today' ? "Today's Overview" :
                        selectedDateFilter === 'yesterday' ? "Yesterday's Overview" : "Patient Overview"}</h1>
                    <p>Hello, Dr. You have {detected_conditions?.length || 0} high-risk alerts for {name}.</p>
                </div>
                <div className="pd-controls">
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
                <div className="pd-card pd-sidebar" style={{ height: 'fit-content' }}>
                    <div className="pd-card-header">
                        <span className="pd-card-title">Quick Access</span>
                    </div>
                    <div style={{ marginTop: '1rem' }}>
                        <h2 style={{ fontSize: '1.5rem', margin: 0 }}>{name}</h2>
                        <p style={{ opacity: 0.7, fontSize: '0.9rem' }}>{patient_email}</p>
                    </div>

                    <ul className="pd-sidebar-menu">
                        <li className={activeTab === 'overview' ? 'active' : ''} onClick={() => setActiveTab('overview')}>
                            [+] Patient Overview
                        </li>
                        <li className={activeTab === 'text_logs' ? 'active' : ''} onClick={() => setActiveTab('text_logs')}>
                            [T] Text Logs
                        </li>
                        <li className={activeTab === 'face_logs' ? 'active' : ''} onClick={() => setActiveTab('face_logs')}>
                            [F] Face Logs
                        </li>
                        <li className={activeTab === 'records' ? 'active' : ''} onClick={() => setActiveTab('records')}>
                            [↗] Medical Records ({records.length})
                        </li>
                        <li className={activeTab === 'medicine_log' ? 'active' : ''} onClick={() => setActiveTab('medicine_log')}>
                            [+] Medicine Log
                        </li>
                        <li onClick={handleGenerateReport} style={{ marginTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem' }}>
                            [↓] Generate Report
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
        </div>
    );
};
export default PatientDetailView;
