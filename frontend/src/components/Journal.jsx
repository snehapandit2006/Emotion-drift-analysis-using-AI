import React, { useState, useEffect, useCallback } from 'react';
import { Book, Send, History, Sparkles } from 'lucide-react';
import { postPredict, getTimeline } from '../api';
import { motion, AnimatePresence } from 'framer-motion';

const emotionColors = {
  joy: "var(--emotion-happy)",
  happy: "var(--emotion-happy)",
  sadness: "var(--emotion-sadness)",
  anger: "var(--emotion-anger)",
  fear: "var(--emotion-fear)",
  surprise: "var(--emotion-surprise)",
  neutral: "var(--emotion-neutral)",
};

const Journal = () => {
  const [entry, setEntry] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastPrediction, setLastPrediction] = useState(null);
  const [history, setHistory] = useState([]);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await getTimeline('24h');
      // Filter or just show all as "Journal history" since we're in the Journal view
      // In a real app we'd filter by source: 'journal', but for now we follow "no logic change"
      const data = res.data.emotions.map((e, i) => ({
        emotion: e,
        timestamp: res.data.timestamps[i],
        confidence: res.data.confidences[i]
      })).reverse();
      setHistory(data);
    } catch (e) {
      console.error("Failed to fetch history", e);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleSave = async () => {
    if (!entry.trim()) return;
    setLoading(true);
    try {
      const res = await postPredict(entry);
      setLastPrediction(res.data);
      setEntry('');
      fetchHistory();
    } catch (e) {
      console.error("Failed to save entry", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="journal-container" style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <header style={{ marginBottom: '2rem' }}>
        <h1 className="serif-heading" style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '2.5rem' }}>
          <Book size={32} color="var(--accent-purple)" />
          Mood Journal
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>Reflect on your day and track your emotional journey.</p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '2rem' }}>
        {/* Entry Section */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="glass-panel" 
          style={{ padding: '2rem' }}
        >
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '1rem', fontWeight: 'bold', fontSize: '1.1rem', color: 'var(--text-main)' }}>How are you feeling today?</label>
            <textarea
              value={entry}
              onChange={(e) => setEntry(e.target.value)}
              placeholder="Start writing your thoughts here... Be honest with yourself."
              style={{
                width: '100%',
                minHeight: '350px',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--glass-border)',
                borderRadius: '16px',
                padding: '1.5rem',
                color: 'white',
                fontSize: '1.1rem',
                lineHeight: '1.6',
                resize: 'none',
                outline: 'none',
                transition: 'all 0.3s ease',
                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)'
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--accent-purple)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--glass-border)'}
            />
          </div>
          <button
            className="glass-button primary"
            onClick={handleSave}
            disabled={loading || !entry.trim()}
            style={{ 
                width: '100%', 
                padding: '1.2rem', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                gap: '12px',
                fontSize: '1.1rem',
                fontWeight: '600'
            }}
          >
            {loading ? "Analyzing Sentiment..." : (
              <>
                <Send size={18} /> Save Reflection
              </>
            )}
          </button>

          <AnimatePresence>
            {lastPrediction && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                style={{
                  marginTop: '1.5rem',
                  padding: '1.5rem',
                  background: 'rgba(255,255,255,0.05)',
                  borderRadius: '16px',
                  border: `1px solid ${emotionColors[lastPrediction.emotion] || 'var(--glass-border)'}`,
                  textAlign: 'center',
                  boxShadow: `0 0 20px ${emotionColors[lastPrediction.emotion]}22`
                }}
              >
                <Sparkles size={24} color={emotionColors[lastPrediction.emotion]} style={{ marginBottom: '0.75rem' }} />
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Analysis Complete</p>
                <h3 style={{ color: emotionColors[lastPrediction.emotion], fontWeight: '900', fontSize: '2rem', margin: '0.5rem 0' }}>
                  {lastPrediction.emotion.toUpperCase()}
                </h3>
                <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden', margin: '1rem 0' }}>
                    <div style={{ width: `${lastPrediction.confidence * 100}%`, height: '100%', background: emotionColors[lastPrediction.emotion] }}></div>
                </div>
                <p style={{ fontSize: '0.85rem', opacity: 0.7 }}>
                  AI Confidence: {(lastPrediction.confidence * 100).toFixed(1)}%
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* History Section */}
        <motion.div 
           initial={{ opacity: 0, x: 20 }}
           animate={{ opacity: 1, x: 0 }}
           className="glass-panel" 
           style={{ padding: '2rem' }}
        >
          <h2 className="serif-heading" style={{ fontSize: '1.5rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <History size={24} color="var(--primary-blue)" /> Emotional History
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', maxHeight: '600px', overflowY: 'auto', paddingRight: '0.5rem' }}>
            {history.map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                style={{
                  padding: '1.2rem',
                  background: 'rgba(255,255,255,0.02)',
                  borderRadius: '12px',
                  border: '1px solid var(--glass-border)',
                  borderLeft: `6px solid ${emotionColors[item.emotion] || 'var(--glass-border)'}`,
                  transition: 'transform 0.2s ease',
                  cursor: 'default'
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateX(5px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateX(0)'}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontWeight: '800', fontSize: '1rem', color: emotionColors[item.emotion] }}>
                    {item.emotion.toUpperCase()}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '500' }}>
                    {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {new Date(item.timestamp).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)' }}>
                    Confidence: {(item.confidence * 100).toFixed(0)}%
                  </span>
                </div>
              </motion.div>
            ))}
            {history.length === 0 && (
              <div style={{ textAlign: 'center', padding: '3rem 0' }}>
                <Book size={48} color="rgba(255,255,255,0.1)" style={{ margin: '0 auto 1rem' }} />
                <p style={{ color: 'var(--text-secondary)' }}>Your emotional journey starts here.</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Journal;
