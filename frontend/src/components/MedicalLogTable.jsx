import React, { useState, useEffect } from 'react';
import { Plus, Trash2, CheckCircle, Circle, ChevronDown, ChevronUp } from 'lucide-react';
import { getMedicalLogs, createMedicalLog, updateMedicalLog, deleteMedicalLog, getPatientMedicalLogs } from '../api';

const FREQUENCY_OPTIONS = [
    { value: 'daily', label: 'Daily' },
    { value: 'twice_daily', label: 'Twice Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'as_needed', label: 'As Needed' },
];

const FrequencyBadge = ({ frequency }) => {
    const colors = {
        daily: { bg: 'rgba(33, 150, 243, 0.15)', text: '#64b5f6' },
        twice_daily: { bg: 'rgba(156, 39, 176, 0.15)', text: '#ce93d8' },
        weekly: { bg: 'rgba(76, 175, 80, 0.15)', text: '#81c784' },
        as_needed: { bg: 'rgba(255, 152, 0, 0.15)', text: '#ffb74d' },
    };
    const c = colors[frequency] || colors.daily;
    const label = FREQUENCY_OPTIONS.find(o => o.value === frequency)?.label || frequency;
    return (
        <span style={{
            background: c.bg, color: c.text,
            padding: '2px 8px', borderRadius: '12px',
            fontSize: '0.75rem', fontWeight: '600', whiteSpace: 'nowrap'
        }}>
            {label}
        </span>
    );
};

const MedicalLogTable = ({ patientId = null, readOnly = false, allowAdd = false }) => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newItem, setNewItem] = useState({ medicine: '', dosage: '', time: '', notes: '', frequency: 'daily' });
    const [adding, setAdding] = useState(false);
    const [expandedId, setExpandedId] = useState(null);

    useEffect(() => {
        fetchLogs();
    }, [patientId]);

    const fetchLogs = async () => {
        try {
            setLoading(true);
            let res;
            if (patientId) {
                res = await getPatientMedicalLogs(patientId);
            } else {
                res = await getMedicalLogs();
            }
            setLogs(res.data);
        } catch (error) {
            console.error("Failed to fetch medical logs", error);
        } finally {
            setLoading(false);
        }
    };
    const handleAdd = async () => {
        if (!newItem.medicine || !newItem.dosage || !newItem.time) return;
        try {
            setAdding(true);
            const res = await createMedicalLog(newItem, patientId);
            setLogs([res.data, ...logs]);
            setNewItem({ medicine: '', dosage: '', time: '', notes: '', frequency: 'daily' });
        } catch (error) {
            console.error("Failed to add log", error);
            alert("Failed to add log. Ensure you are authorized.");
        } finally {
            setAdding(false);
        }
    };

    const handleToggleTaken = async (log) => {
        if (readOnly && !allowAdd) return; // Allow toggling if allowAdd is true? No, usually not. But let's restrict to owner or if we want doc to toggle.
        // Actually, doctors probably shouldn't toggle "taken" on behalf of patient, but maybe they should? 
        // For now, let's keep it readOnly for docs unless explicitly allowed.
        // But wait, the error is ReferenceError, so I need to define it regardless.
        if (readOnly) return;
        try {
            const updated = { ...log, taken: !log.taken };
            const res = await updateMedicalLog(log.id, updated);
            setLogs(logs.map(l => l.id === log.id ? res.data : l));
        } catch (error) {
            console.error("Failed to update log", error);
        }
    };

    const handleDelete = async (id) => {
        if (readOnly) return;
        if (!window.confirm("Are you sure you want to delete this entry?")) return;
        try {
            await deleteMedicalLog(id);
            setLogs(logs.filter(l => l.id !== id));
        } catch (error) {
            console.error("Failed to delete log", error);
        }
    };

    if (loading) return <div style={{ padding: '1rem', opacity: 0.6 }}>Loading medical logs...</div>;

    return (
        <div style={{ background: 'var(--bg-panel)', borderRadius: '12px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
            <div style={{ padding: '1rem', background: 'rgba(0,0,0,0.1)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-main)' }}>Medicine Log</h3>
                {!readOnly && <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>Track your daily medication</span>}
            </div>

            <div style={{ padding: '1rem' }}>
                {(!readOnly || allowAdd) && (
                    <div style={{ marginBottom: '1rem' }}>
                        {/* Row 1: Medicine, Dosage, Time, Add button */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(120px, 2fr) minmax(80px, 1fr) minmax(80px, 1fr) 40px', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
                            <input
                                placeholder="Medicine Name"
                                value={newItem.medicine}
                                onChange={(e) => setNewItem({ ...newItem, medicine: e.target.value })}
                                style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-main)' }}
                            />
                            <input
                                placeholder="Dosage"
                                value={newItem.dosage}
                                onChange={(e) => setNewItem({ ...newItem, dosage: e.target.value })}
                                style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-main)' }}
                            />
                            <input
                                type="time"
                                value={newItem.time}
                                onChange={(e) => setNewItem({ ...newItem, time: e.target.value })}
                                style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-main)' }}
                            />
                            <button
                                onClick={handleAdd}
                                disabled={adding || !newItem.medicine}
                                style={{ padding: '0.5rem', borderRadius: '6px', background: 'var(--accent-color)', color: 'var(--accent-text)', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                                title="Add Entry"
                            >
                                <Plus size={18} />
                            </button>
                        </div>
                        {/* Row 2: Frequency + Notes */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(100px, 1fr) minmax(200px, 3fr)', gap: '0.5rem', alignItems: 'center' }}>
                            <select
                                value={newItem.frequency}
                                onChange={(e) => setNewItem({ ...newItem, frequency: e.target.value })}
                                style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-main)' }}
                            >
                                {FREQUENCY_OPTIONS.map(o => (
                                    <option key={o.value} value={o.value}>{o.label}</option>
                                ))}
                            </select>
                            <input
                                placeholder="Notes (optional) — e.g. take after food"
                                value={newItem.notes}
                                onChange={(e) => setNewItem({ ...newItem, notes: e.target.value })}
                                style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-main)' }}
                            />
                        </div>
                    </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {logs.length === 0 ? (
                        <div style={{ textAlign: 'center', opacity: 0.5, padding: '1rem', fontStyle: 'italic' }}>
                            No medicines added yet.
                        </div>
                    ) : (
                        logs.map(log => (
                            <div key={log.id} style={{
                                borderRadius: '8px',
                                border: !log.taken ? '1px solid #ff4d4d' : '1px solid var(--border-color)', // Red border if not taken
                                overflow: 'hidden',
                                position: 'relative'
                            }}>
                                {/* Main row */}
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: '40px minmax(120px, 2fr) minmax(60px, 1fr) minmax(60px, 1fr) auto 40px',
                                    gap: '0.5rem',
                                    alignItems: 'center',
                                    padding: '0.8rem 0.5rem',
                                    background: log.taken ? 'rgba(76, 175, 80, 0.1)' : 'var(--bg-card)',
                                    opacity: log.taken ? 0.85 : 1,
                                    cursor: (log.notes || log.frequency !== 'daily') ? 'pointer' : 'default'
                                }}
                                    onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                                >
                                    <div
                                        onClick={(e) => { e.stopPropagation(); handleToggleTaken(log); }}
                                        style={{ cursor: readOnly ? 'default' : 'pointer', display: 'flex', justifyContent: 'center', color: log.taken ? '#4caf50' : '#ff4d4d' }}
                                        title={log.taken ? "Marked as taken" : "Mark as taken"}
                                    >
                                        {log.taken ? <CheckCircle size={20} /> : <Circle size={20} />}
                                    </div>
                                    <div style={{ fontWeight: '500', textDecoration: log.taken ? 'line-through' : 'none', color: !log.taken ? '#ff4d4d' : 'inherit' }}>{log.medicine}</div>
                                    <div style={{ opacity: 0.8, fontSize: '0.9rem' }}>{log.dosage}</div>
                                    <div style={{ opacity: 0.8, fontSize: '0.9rem' }}>{log.time}</div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <FrequencyBadge frequency={log.frequency || 'daily'} />
                                        {!log.taken && (
                                            <span style={{ fontSize: '0.7rem', color: '#ff4d4d', fontWeight: 'bold', border: '1px solid #ff4d4d', padding: '1px 4px', borderRadius: '4px' }}>
                                                MISSED
                                            </span>
                                        )}
                                    </div>
                                    {readOnly ? (
                                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                                            {/* Expand icon logic */}
                                        </div>
                                    ) : (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDelete(log.id); }}
                                            style={{ background: 'transparent', border: 'none', color: '#ef5350', cursor: 'pointer', display: 'flex', justifyContent: 'center', opacity: 0.6 }}
                                            title="Delete"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </div>
                                {/* Expandable notes row */}
                                {expandedId === log.id && log.notes && (
                                    <div style={{
                                        padding: '0.5rem 0.8rem 0.5rem 3.5rem',
                                        background: 'rgba(0,0,0,0.05)',
                                        borderTop: '1px solid var(--border-color)',
                                        fontSize: '0.85rem',
                                        opacity: 0.8,
                                        fontStyle: 'italic'
                                    }}>
                                        📝 {log.notes}
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default MedicalLogTable;
