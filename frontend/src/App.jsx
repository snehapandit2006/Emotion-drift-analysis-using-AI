import { useEffect, useState, useCallback, useRef, useContext, lazy, Suspense } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  LineChart,
  Line,
  CartesianGrid,
  Cell,
} from "recharts";
import { motion, AnimatePresence } from 'framer-motion';
// Eager load critical components
import SupportDashboard from "./components/SupportDashboard";
import LandingPage from "./components/LandingPage";
import NeuralBackground from "./components/NeuralBackground";
import BackgroundSelector, { getStoredBackground } from "./components/BackgroundSelector";
import { Download, Table as TableIcon, Activity, LogOut, MessageSquare, Sun, Moon, Shield, Menu, X, Play, Timer, Music, Settings, Layout, Sparkles, Layers } from 'lucide-react';

import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';

import {
  getAlerts,
  postPredict,
  getComparison,
  generateReport,
  getTimeline,
  getDistribution,
  getDrift,
  API,
  getSelfEmotionHistory,
  getSelfEmotionDistribution,
  getFusionAnalytics,
  getPatientTherapies,
  updateProfile
} from "./api";
// Assets
import logoFinal from './assets/logo_final.png';

import "./App.css";
// Lazy load non-critical components
const Background3D = lazy(() => import("./components/Background3D"));
const Brain3D = lazy(() => import("./components/Brain3D"));
const DriftGraph = lazy(() => import("./components/DriftGraph"));
const LogTable = lazy(() => import("./components/LogTable"));
const TransitionArrows = lazy(() => import("./components/TransitionArrows"));
const Login = lazy(() => import("./components/Login"));
const Signup = lazy(() => import("./components/Signup"));
const WelcomeScreen = lazy(() => import("./components/WelcomeScreen"));
const ChatAnalyzer = lazy(() => import("./components/ChatAnalyzer"));
const SelfEmotionMonitor = lazy(() => import("./components/SelfEmotionMonitor"));
const PsychiatristDashboard = lazy(() => import("./components/PsychiatristDashboard"));
const PatientDetailView = lazy(() => import("./components/PatientDetailView"));
import ChatInterface from "./components/ChatInterface";
import FloatingRobot from "./components/FloatingRobot";
import DoctorFloatingButton from "./components/DoctorFloatingButton";
import SentiaFullScreenChat from "./components/SentiaFullScreenChat";
const MeditationTimer = lazy(() => import("./components/MeditationTimer"));
const MediaHub = lazy(() => import("./components/MediaHub"));
const CommunityChat = lazy(() => import("./components/CommunityChat"));
const VitalsDashboard = lazy(() => import("./components/VitalsDashboard"));

import AuthContext, { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";

const emotionColors = {
  joy: "var(--emotion-happy)",
  happy: "var(--emotion-happy)",
  fear: "var(--emotion-fear)",
  sadness: "var(--emotion-sadness)",
  anger: "var(--emotion-anger)",
  surprise: "var(--emotion-surprise)",
  neutral: "var(--emotion-neutral)",
  love: "var(--emotion-love)",
  disgust: "var(--emotion-disgust)"
};

const severityText = (s = 0) =>
  s >= 0.6
    ? ["🔴 High Drift", "Major emotional change detected"]
    : s >= 0.3
      ? ["🟠 Moderate Drift", "Noticeable emotional variation"]
      : ["🟢 Stable", "Emotion pattern consistent"];



function RequireAuth({ children }) {
  const { user, loading } = useContext(AuthContext);


  if (loading) {
    return <div className="flex items-center justify-center min-h-screen text-white">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function RequireDoctorAuth({ children }) {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user || user.role !== 'psychiatrist') {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="glass-panel" style={{ padding: '12px', border: '1px solid var(--glass-border)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
        <p style={{ margin: 0, fontWeight: 'bold', color: 'var(--text-main)', fontSize: '0.9rem' }}>{label}</p>
        <p style={{ margin: '4px 0', color: emotionColors[data.emotion] || '#fff', fontWeight: '600' }}>
          {data.emotion.toUpperCase()}
        </p>
        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          Confidence: <span style={{ color: 'var(--text-main)' }}>{(data.confidence * 100).toFixed(1)}%</span>
        </p>
        <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: data.source === 'face' ? 'var(--primary-blue)' : 'var(--accent-color)' }}>
          Source: {data.source === 'face' ? '📷 Face' : '💬 Chat'}
        </p>
      </div>
    );
  }
  return null;
};

function Dashboard() {
  const { user, logout, updateUserProfile } = useContext(AuthContext);

  const [range, setRange] = useState("24h");
  const [timeline, setTimeline] = useState(null);
  const [distribution, setDistribution] = useState({});
  const [drift, setDrift] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [showAlerts, setShowAlerts] = useState(false);
  const [comparison, setComparison] = useState(null);
  const [selfHistory, setSelfHistory] = useState([]);
  const [selfDistribution, setSelfDistribution] = useState({});
  const [fusion, setFusion] = useState(null);
  const [therapies, setTherapies] = useState([]);
  const [activeTherapyId, setActiveTherapyId] = useState(null);
  
  // Use refs for audio objects so they don't trigger or get caught in re-renders
  const audioContextRef = useRef(null);
  const oscillatorsRef = useRef([]);
  const audioFileRef = useRef(null);
  const therapyTimerRef = useRef(null); // Timer for auto-stop after duration
  
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [monitoring, setMonitoring] = useState(true);
  const [viewMode, setViewMode] = useState('dashboard'); // 'dashboard', 'table', 'chat', 'settings', 'meditation', 'media', 'community'
  const [showDoctorChat, setShowDoctorChat] = useState(false);
  const [showSentia, setShowSentia] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const dashboardRef = useRef(null);

  const load = useCallback(async () => {
    if (!user || !user.id) return;
    try {
      const [t, d, dr, a, c, sh, sd, f, th] = await Promise.all([
        getTimeline(range),
        getDistribution(),
        getDrift(),
        getAlerts(),
        getComparison(range),
        getSelfEmotionHistory(range),
        getSelfEmotionDistribution(range),
        getFusionAnalytics(range === '1h' ? 0 : range === '24h' ? 1 : 7),
        getPatientTherapies(user.id).catch(() => ({ data: [] }))
      ]);

      setTimeline(t.data);
      setDistribution(d.data);
      setDrift(dr.data);
      setAlerts(a.data);
      setComparison(c.data);
      setSelfHistory(sh.data);
      setSelfDistribution(sd.data);
      setFusion(f.data);
      
      setTherapies(prev => {
          const newTherapies = th.data || [];
          if (prev.length !== newTherapies.length) return newTherapies;
          // Simple deep check to ensure we don't unnecessarily reset the UI if active
          const isSame = prev.every((p, i) => newTherapies[i] && p.id === newTherapies[i].id);
          return isSame ? prev : newTherapies;
      });
    } catch (e) {
      console.error("API error", e);
    }
  }, [range, user]);

  useEffect(() => {
    load();
  }, [load]);

  // Listen for global refresh events (e.g. from FloatingRobot)
  useEffect(() => {
    const handleRefresh = () => {
      console.log("Refreshing dashboard data...");
      load();
    };
    window.addEventListener('refresh-dashboard', handleRefresh);
    return () => window.removeEventListener('refresh-dashboard', handleRefresh);
  }, [load]);

  // Click outside to close alerts
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showAlerts && !event.target.closest('.alert-popup') && !event.target.closest('.bell')) {
        setShowAlerts(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showAlerts]);

  // Listener for global doctor chat open event
  useEffect(() => {
    const handleOpenDoctorChat = () => {
      console.log("Toggling doctor chat from global event...");
      setShowDoctorChat(prev => !prev);
    };
    window.addEventListener('open-doctor-chat', handleOpenDoctorChat);
    return () => window.removeEventListener('open-doctor-chat', handleOpenDoctorChat);
  }, []);

  const submit = async () => {
    if (!text.trim() || !monitoring) return;
    setLoading(true);
    await postPredict(text);
    setText("");
    await load();
    setLoading(false);
  };

  const handleExportPDF = async () => {
    try {
      // Calculate date range based on 'range' state
      const now = new Date();
      let fromDate = new Date();

      if (range === "1h") fromDate.setHours(now.getHours() - 1);
      else if (range === "24h") fromDate.setDate(now.getDate() - 1);
      else if (range === "7d") fromDate.setDate(now.getDate() - 7);

      const payload = {
        user_id: String(user.id), // Ensure string for backend Pydantic model
        from_date: fromDate.toISOString(),
        to_date: now.toISOString(),
        report_type: "emotion_summary"
      };

      const { data } = await generateReport(payload);

      // Trigger download securely using authenticated API
      // We need to fetch the file blob with auth headers
      const downloadResponse = await API.get(data.download_url, {
        responseType: 'blob'
      });

      const downloadUrl = window.URL.createObjectURL(new Blob([downloadResponse.data]));
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', `emotion_report_${user.email}_${now.toISOString().split('T')[0]}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);

    } catch (e) {
      console.error("PDF Generation failed", e);
      alert(`Failed to generate PDF report: ${e.response?.data?.detail || e.message}`);
    }
  };

  const stopTherapyAudio = useCallback(() => {
    setActiveTherapyId(null); // Clear active UI state
    
    // Clear auto-stop timer
    if (therapyTimerRef.current) {
        clearTimeout(therapyTimerRef.current);
        therapyTimerRef.current = null;
    }
    
    // Clean up file audio
    if (audioFileRef.current) {
        audioFileRef.current.pause();
        audioFileRef.current.currentTime = 0;
        audioFileRef.current = null;
    }
    
    // Clean up oscillators
    if (oscillatorsRef.current && oscillatorsRef.current.length > 0) {
        oscillatorsRef.current.forEach(osc => {
            try { 
                osc.stop(); 
                osc.disconnect(); 
            } catch(e) { console.error("Error stopping oscillator", e); }
        });
        oscillatorsRef.current = [];
    }
    
    // Clean up AudioContext
    if (audioContextRef.current) {
        try {
            audioContextRef.current.close();
        } catch(e) { console.error("Error closing AudioContext", e); }
        audioContextRef.current = null;
    }
  }, []);

  // Clean up audio on unmount ONLY
  useEffect(() => {
      return () => {
          stopTherapyAudio();
      };
  }, [stopTherapyAudio]);

  const playTherapyAudio = async (therapy) => {
    // 1. Fully stop any existing audio first
    stopTherapyAudio();
    
    // 2. Set the active ID so the UI updates
    setActiveTherapyId(therapy.id);

    const type = therapy.therapy_type.toLowerCase();
    
    // If it's binaural beats, synthesize it via Web Audio API 
    if (type.includes("binaural")) {
        try {
            const baseFreq = therapy.frequency_hz || 432; // Default to 432Hz healing freq if null
            const beatDiff = 10; // 10Hz Alpha waves for relaxation
            
            const actx = new (window.AudioContext || window.webkitAudioContext)();
            
            // Left Ear
            const oscLeft = actx.createOscillator();
            const panLeft = actx.createStereoPanner();
            panLeft.pan.value = -1;
            oscLeft.type = 'sine';
            oscLeft.frequency.value = baseFreq;
            oscLeft.connect(panLeft);
            panLeft.connect(actx.destination);
            
            // Right Ear
            const oscRight = actx.createOscillator();
            const panRight = actx.createStereoPanner();
            panRight.pan.value = 1;
            oscRight.type = 'sine';
            oscRight.frequency.value = baseFreq + beatDiff;
            oscRight.connect(panRight);
            panRight.connect(actx.destination);
            
            oscLeft.start();
            oscRight.start();
            
            // Save to refs
            audioContextRef.current = actx;
            oscillatorsRef.current = [oscLeft, oscRight];
        } catch (err) {
            console.error("Failed to start Web Audio API:", err);
            setActiveTherapyId(null);
            return; // Exit early on error
        }
    } else {
        // Fallback to playing a pleasant ambient track if it's not binaural
        const audio = new Audio('https://actions.google.com/sounds/v1/ambiences/coffee_shop.ogg');
        audio.crossOrigin = "anonymous";
        audio.loop = true;
        audio.volume = 0.5;
        audioFileRef.current = audio;
        audio.play().catch(e => {
            console.error("Error playing audio files", e);
            setActiveTherapyId(null);
        });
        
        // If there's an error on standard play, activeTherapyId is null, we can return early there too, 
        // but `audio.play()` is a promise. It's fine to let the timer set, if we stop early it clears itself.
    }
    
    // Auto-stop after prescribed duration
    const durationMs = (therapy.duration_minutes || 15) * 60 * 1000;
    therapyTimerRef.current = setTimeout(() => {
        console.log(`Therapy auto-stopped after ${therapy.duration_minutes} minutes.`);
        stopTherapyAudio();
    }, durationMs);
  };

  const timelineData =
    timeline?.timestamps?.map((t, i) => ({
      time: new Date(t).toLocaleTimeString(),
      confidence: timeline.confidences[i],
      emotion: timeline.emotions[i],
      source: timeline.sources ? timeline.sources[i] : "text"
    })) || [];



  const distData = Object.entries(distribution).map(([e, c]) => ({
    emotion: e,
    count: c,
  }));

  const comparisonData = comparison
    ? Object.keys(emotionColors).map((emotion) => ({
      emotion,
      previous: comparison.previous?.[emotion] ?? 0,
      current: comparison.current?.[emotion] ?? 0,
    }))
    : [];

  const selfHistoryData = selfHistory.map(h => ({
    time: new Date(h.timestamp).toLocaleString(),
    confidence: h.confidence,
    emotion: h.emotion
  }));

  const selfDistData = Object.entries(selfDistribution).map(([e, c]) => ({
    emotion: e,
    count: c * 100, // It's a percentage (0-1) from backend, let's keep it normalized or displaying as is? Backend returns 0.25 for 25%. Wait, backend implementation returns { emotion: count/total }. So it is 0.0-1.0. Let's multiply by 100 for chart if needed, or just display as percent.
  }));

  const lastEmotion =
    timeline?.emotions?.[timeline.emotions.length - 1] || null;

  const prevEmotion =
    timeline?.emotions?.[timeline.emotions.length - 2] || null;

  console.log("Timeline Data:", timelineData);
  console.log("Current User ID:", user?.id);

  return (
    <div className="dashboard" style={{ background: 'transparent' }} ref={dashboardRef}>
      <header className="header glass-panel">
        <div className="header-logo" style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} onClick={() => setViewMode('dashboard')}>
          <span className="serif-heading" style={{ fontSize: '1.8rem', letterSpacing: '2px', fontWeight: 'bold', color: 'var(--primary-blue)', fontStyle: 'normal' }}>SENTIA</span>
        </div>

        {/* Desktop Features Bar - Compact & Complete */}
        <nav className="desktop-nav">
          {[
            { id: 'dashboard', label: 'Analytics', icon: Activity },
            { id: 'settings', label: 'Profile', icon: Settings },
            { id: 'meditation', label: 'Therapy', icon: Timer },
            { id: 'media', label: 'Media', icon: Music },
            { id: 'support', label: 'Support', icon: Shield, action: () => window.location.href = '/support-dashboard' },
            { id: 'community', label: 'Community', icon: MessageSquare },
            { id: 'vitals', label: 'Vitals', icon: Activity },
            { id: 'sentia', label: 'Sentia (Therapist)', icon: Sparkles, action: () => setShowSentia(true) },
            { id: 'chat', label: 'Analysis', icon: MessageSquare, disabled: !monitoring },
            { id: 'dr', label: 'Dr Chat', icon: MessageSquare, action: () => setShowDoctorChat(true), hidden: !user.doctor_id },
            { id: 'toggle', label: viewMode === 'table' ? 'Dashboard' : 'Table', icon: viewMode === 'table' ? Layout : TableIcon, action: () => setViewMode(viewMode === 'dashboard' ? 'table' : 'dashboard'), disabled: !monitoring },
            { id: 'export', label: 'Export', icon: Download, action: () => handleExportPDF(), disabled: !monitoring }
          ].filter(item => !item.hidden).map(item => (
            <button
              key={item.id}
              onClick={item.action || (() => setViewMode(item.id))}
              disabled={item.disabled}
              className={`nav-item-btn ${viewMode === item.id && !item.action ? 'active' : ''}`}
            >
              <item.icon size={16} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Center spacer if needed or just let space-between handle it */}
        <div style={{ flex: 1 }}></div>

        <div className="header-actions">
          {/* Always visible: Theme & Alerts */}


          <div className="bell" style={{ position: 'relative' }} onClick={() => setShowAlerts(!showAlerts)}>
            🔔{alerts.length > 0 && <span className="dot" />}
            {showAlerts && (
              <div className="alert-popup glass-panel" style={{ position: 'absolute', top: '100%', right: 0, marginTop: '10px' }}>
                {alerts.length === 0 ? (
                  <div className="alert-empty">No drift alerts</div>
                ) : (
                  alerts.slice(0, 5).map((a, i) => {
                    const [t, d] = severityText(a.severity);
                    return (
                      <div key={i} className="alert-item" style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'left' }}>
                        <strong>{t}</strong>
                        <small>{d}</small>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Hamburger Menu */}
          <div style={{ position: 'relative' }}>
            <button
              className="icon-btn"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              style={{ color: 'var(--text-main)' }}
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            {/* Dropdown Menu - System Actions Only */}
            {isMenuOpen && (
              <div className="glass-panel" style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: '10px',
                padding: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                minWidth: '180px',
                zIndex: 1000,
                background: 'var(--bg-card)',
                border: '1px solid var(--glass-border)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
              }}>
                <button
                  className={`monitor-toggle ${monitoring ? "on" : "off"}`}
                  onClick={() => { setMonitoring(!monitoring); setIsMenuOpen(false); }}
                  style={{ justifyContent: 'center', width: '100%' }}
                >
                  {monitoring ? "Monitoring ON" : "Monitoring OFF"}
                </button>

                <div style={{ height: '1px', background: 'var(--border-color)', margin: '0.5rem 0' }}></div>

                <button
                  className="icon-btn"
                  onClick={logout}
                  style={{ justifyContent: 'flex-start', width: '100%', borderRadius: '8px', padding: '10px', gap: '10px', color: 'var(--emotion-anger)' }}
                >
                  <LogOut size={20} /> <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* View Switcher Content */}
      <div className={!monitoring ? "monitoring-paused" : ""}>
        {viewMode === 'chat' ? (
          <div style={{ marginTop: '2rem' }}>
            <button className="text-btn" onClick={() => setViewMode('dashboard')} style={{ marginBottom: '1rem', color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem' }}>
              &larr; Back to Dashboard
            </button>
            <ChatAnalyzer />
          </div>
        ) : viewMode === 'meditation' ? (
          <div style={{ marginTop: '2rem' }}>
            <button className="text-btn" onClick={() => setViewMode('dashboard')} style={{ marginBottom: '1rem', color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem' }}>
              &larr; Back to Dashboard
            </button>
            <Suspense fallback={<div>Loading Meditation...</div>}>
              <MeditationTimer onComplete={() => load()} />
            </Suspense>
          </div>
        ) : viewMode === 'media' ? (
          <div style={{ marginTop: '2rem' }}>
            <button className="text-btn" onClick={() => setViewMode('dashboard')} style={{ marginBottom: '1rem', color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem' }}>
              &larr; Back to Dashboard
            </button>
            <Suspense fallback={<div>Loading Media...</div>}>
              <MediaHub />
            </Suspense>
          </div>
        ) : viewMode === 'community' ? (
          <div style={{ marginTop: '2rem' }}>
            <button className="text-btn" onClick={() => setViewMode('dashboard')} style={{ marginBottom: '1rem', color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem' }}>
              &larr; Back to Dashboard
            </button>
            <Suspense fallback={<div>Loading Community Chat...</div>}>
              <CommunityChat />
            </Suspense>
          </div>
        ) : viewMode === 'vitals' ? (
          <div style={{ marginTop: '2rem' }}>
            <button className="text-btn" onClick={() => setViewMode('dashboard')} style={{ marginBottom: '1rem', color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem' }}>
              &larr; Back to Dashboard
            </button>
            <Suspense fallback={<div>Loading Vitals Dashboard...</div>}>
              <VitalsDashboard />
            </Suspense>
          </div>
        ) : viewMode === 'settings' ? (
          <div style={{ marginTop: '2rem' }}>
            <button className="text-btn" onClick={() => setViewMode('dashboard')} style={{ marginBottom: '1rem', color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem' }}>
              &larr; Back to Dashboard
            </button>
            <div className="glass-panel" style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
                <h2 className="serif-heading" style={{ marginBottom: '1.5rem', color: 'var(--text-main)' }}>Profile Settings</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>My Hobbies</label>
                        <textarea 
                            value={user.hobbies || ''}
                            onChange={(e) => updateUserProfile({ hobbies: e.target.value })}
                            placeholder="e.g. Playing guitar, Painting, Reading sci-fi novels..."
                            style={{ 
                                background: 'var(--bg-input)', 
                                border: '1px solid var(--border-color)', 
                                padding: '1rem', 
                                borderRadius: '8px', 
                                color: 'var(--text-main)',
                                minHeight: '100px',
                                resize: 'vertical'
                            }}
                        />
                        <p style={{ fontSize: '0.8rem', opacity: 0.6 }}>Sentia will gently check in about these to help maintain your routine.</p>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Preferred Anti-Anxiety Games</label>
                        <textarea 
                            value={(() => {
                                try {
                                    const parsed = JSON.parse(user.preferred_games);
                                    if (Array.isArray(parsed)) return parsed.map(g => g.name).join(', ');
                                    return user.preferred_games || '';
                                } catch(e) {
                                    return user.preferred_games || '';
                                }
                            })()}
                            onChange={(e) => updateUserProfile({ preferred_games: e.target.value })}
                            placeholder="e.g. Tetris, Stardew Valley, Cozy Grove..."
                            style={{ 
                                background: 'var(--bg-input)', 
                                border: '1px solid var(--border-color)', 
                                padding: '1rem', 
                                borderRadius: '8px', 
                                color: 'var(--text-main)',
                                minHeight: '80px',
                                resize: 'vertical'
                            }}
                        />
                        <p style={{ fontSize: '0.8rem', opacity: 0.6 }}>Sentia will suggest these or new grounding games during anxiety.</p>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Music & Media Interests</label>
                        <textarea 
                            value={user.music_interests || ''}
                            onChange={(e) => updateUserProfile({ music_interests: e.target.value })}
                            placeholder="e.g. Lofi hip hop for focus, Classical for sleep, YouTube links to favorite yoga channels..."
                            style={{ 
                                background: 'var(--bg-input)', 
                                border: '1px solid var(--border-color)', 
                                padding: '1rem', 
                                borderRadius: '8px', 
                                color: 'var(--text-main)',
                                minHeight: '80px',
                                resize: 'vertical'
                            }}
                        />
                        <p style={{ fontSize: '0.8rem', opacity: 0.6 }}>Linked YouTube/Spotify content will be suggested for mood regulation.</p>
                    </div>
                    
                    <button 
                        onClick={async () => {
                            try {
                                setLoading(true);
                                await updateProfile({
                                    hobbies: user.hobbies,
                                    preferred_games: user.preferred_games,
                                    music_interests: user.music_interests
                                });
                                alert("Preferences saved successfully!");
                            } catch (e) {
                                console.error(e);
                                alert("Failed to save preferences.");
                            } finally {
                                setLoading(false);
                            }
                        }}
                        disabled={loading}
                        style={{ 
                            padding: '1rem', 
                            background: 'var(--accent-color)', 
                            border: 'none', 
                            borderRadius: '8px', 
                            fontWeight: 'bold', 
                            cursor: 'pointer', 
                            color: 'var(--accent-text)',
                            marginTop: '1rem'
                        }}
                    >
                        {loading ? "Saving..." : "Save Preferences"}
                    </button>
                </div>
            </div>
          </div>
        ) : (
          <>
            {/* Self Emotion Monitor (Webcam) */}
            <div style={{ marginBottom: '20px' }}>
              <SelfEmotionMonitor />
            </div>

            <div className="input-card glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={monitoring ? `How are you feeling, ${user.email.split('@')[0]}?` : "Monitoring paused"}
                disabled={!monitoring}
                className="sentia-input"
                style={{ flex: 1 }}
              />
              <button 
                onClick={submit} 
                disabled={loading || !text.trim() || !monitoring} 
                className="glass-button primary"
                style={{ height: '54px', minWidth: '150px' }}
              >
                {loading ? "Analyzing..." : "Analyze"}
              </button>
            </div>

            <div className="range-selector">
              {["1h", "24h", "7d"].map((r) => (
                <button
                  key={r}
                  className={range === r ? "active" : ""}
                  onClick={() => setRange(r)}
                  disabled={!monitoring}
                  style={range === r ? { background: 'var(--accent-color)', color: 'var(--accent-text)' } : {}}
                >
                  {r}
                </button>
              ))}
            </div>

            {viewMode === 'table' ? (
              <LogTable logs={timelineData} />
            ) : (
              <div className="grid">
                <motion.div className="card glass-panel" layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }}>
                  <h2 className="serif-heading">Drift Analysis</h2>
                  {lastEmotion ? (
                    <>
                      <TransitionArrows previous={prevEmotion} current={lastEmotion} />
                      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1rem' }}>
                        <DriftGraph severity={drift?.details?.severity || 0} />
                      </div>
                      <p style={{ textAlign: 'center', marginTop: '1rem' }}>
                        {severityText(drift?.details?.severity)[1]}
                      </p>
                    </>
                  ) : (
                    <p className="empty">No data required</p>
                  )}
                </motion.div>

                <motion.div className="card glass-panel" layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3, delay: 0.1 }}>
                  <h2 className="serif-heading">Emotion Distribution</h2>
                  <ResponsiveContainer height={260}>
                    <BarChart data={distData}>
                      <XAxis dataKey="emotion" stroke="var(--text-secondary)" />
                      <YAxis stroke="var(--text-secondary)" />
                      <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px' }} itemStyle={{ color: 'var(--text-main)' }} cursor={{ fill: 'var(--bg-panel)' }} />
                      <Bar dataKey="count">
                        {distData.map((d, i) => (
                          <Cell key={i} fill={emotionColors[d.emotion] || '#888'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </motion.div>
              </div>
            )}

            {viewMode === 'dashboard' && (
              <>
                <motion.div className="card full glass-panel" layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
                  <h2 className="serif-heading">Timeline</h2>
                  <ResponsiveContainer height={300}>
                    <LineChart data={timelineData}>
                      <CartesianGrid stroke="var(--glass-border)" />
                      <XAxis dataKey="time" stroke="var(--text-secondary)" />
                      <YAxis domain={[0, 1]} stroke="var(--text-secondary)" />
                      <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--text-secondary)' }} />
                      <Line type="monotone" dataKey="confidence" stroke="var(--accent-color)" strokeWidth={3} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </motion.div>

                <motion.div className="card full glass-panel" layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
                  <h2 className="serif-heading">Historical Comparison</h2>
                  {comparison?.meta?.current_count === 0 ? (
                    <p className="empty">Not enough data</p>
                  ) : (
                    <ResponsiveContainer height={300}>
                      <BarChart data={comparisonData}>
                        <XAxis dataKey="emotion" stroke="var(--text-secondary)" />
                        <YAxis domain={[0, 1]} stroke="var(--text-secondary)" />
                        <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px' }} itemStyle={{ color: 'var(--text-main)' }} cursor={{ fill: 'var(--bg-panel)' }} />
                        <Bar dataKey="previous" fill="var(--text-secondary)" name="Previous Period" />
                        <Bar dataKey="current" fill="var(--accent-color)" name="Current Period" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </motion.div>

                <motion.div className="card full glass-panel" layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }}>
                  <h2 className="serif-heading">Face Emotion Trend</h2>
                  <ResponsiveContainer height={300}>
                    <LineChart data={selfHistoryData}>
                      <CartesianGrid stroke="var(--glass-border)" />
                      <XAxis dataKey="time" stroke="var(--text-secondary)" hide />
                      <YAxis domain={[0, 1]} stroke="var(--text-secondary)" />
                      <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--text-secondary)' }} />
                      <Line type="monotone" dataKey="confidence" stroke="var(--primary-blue)" strokeWidth={3} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </motion.div>

                <motion.div className="card full glass-panel" layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.3 }}>
                  <h2 className="serif-heading">Face Emotion Distribution</h2>
                  <ResponsiveContainer height={260}>
                    <BarChart data={selfDistData}>
                      <XAxis dataKey="emotion" stroke="var(--text-secondary)" />
                      <YAxis stroke="var(--text-secondary)" tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
                      <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px' }} itemStyle={{ color: 'var(--text-main)' }} formatter={(v) => `${(v * 100).toFixed(1)}%`} cursor={{ fill: 'var(--bg-panel)' }} />
                      <Bar dataKey="count">
                        {selfDistData.map((d, i) => (
                          <Cell key={i} fill={emotionColors[d.emotion] || '#888'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </motion.div>


                <motion.div className="card full glass-panel" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                  <h2 className="serif-heading">Fusion Insights</h2>
                  {fusion ? (
                    <div className="fusion-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', textAlign: 'center' }}>
                      <div style={{ padding: '1rem', background: 'var(--bg-panel)', borderRadius: '8px' }}>
                        <h3>Alignment Score</h3>
                        <div style={{ fontSize: '2rem', fontWeight: 'bold', color: fusion.alignment_score > 0.7 ? 'var(--accent-color)' : 'var(--emotion-anger)' }}>
                          {(fusion.alignment_score * 100).toFixed(0)}%
                        </div>
                        <p style={{ fontSize: '0.8rem', opacity: 0.7 }}>Face vs Text Consistency</p>
                      </div>
                      <div style={{ padding: '1rem', background: 'var(--bg-panel)', borderRadius: '8px' }}>
                        <h3>Stability Index</h3>
                        <div style={{ fontSize: '2rem', fontWeight: 'bold', color: fusion.stability_score > 0.7 ? 'var(--accent-color)' : 'var(--emotion-surprise)' }}>
                          {(fusion.stability_score * 100).toFixed(0)}%
                        </div>
                        <p style={{ fontSize: '0.8rem', opacity: 0.7 }}>Emotional Volatility</p>
                      </div>
                      <div style={{ padding: '1rem', background: 'var(--bg-panel)', borderRadius: '8px' }}>
                        <h3>Masking Alert</h3>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: fusion.masking_detected ? 'var(--emotion-anger)' : 'var(--emotion-happy)' }}>
                          {fusion.masking_detected ? "DETECTED" : "None"}
                        </div>
                        {fusion.masking_detected && <p style={{ fontSize: '0.8rem', color: 'var(--emotion-anger)' }}>Possible emotional suppression</p>}
                      </div>
                    </div>
                  ) : (
                    <p className="empty">Loading insights...</p>
                  )}
                </motion.div>

                {/* Patient Therapies Render */}
                {therapies.length > 0 && (
                  <motion.div className="card full glass-panel" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
                    <h2 className="serif-heading" style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span role="img" aria-label="music">🎵</span> Doctor Prescribed Therapies
                      </div>
                      {activeTherapyId && (
                         <button 
                           onClick={() => stopTherapyAudio()} 
                           style={{ background: 'var(--emotion-anger)', color: 'white', border: 'none', padding: '5px 15px', borderRadius: '20px', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 'bold' }}
                         >
                           ⏹ Stop Audio
                         </button>
                      )}
                    </h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
                      {therapies.map(t => {
                        const isPlaying = activeTherapyId === t.id;
                        return (
                          <div 
                            key={t.id} 
                            style={{ 
                              padding: '1.5rem', 
                              background: isPlaying ? 'rgba(59, 130, 246, 0.1)' : 'var(--bg-panel)', 
                              borderRadius: '12px', 
                              border: isPlaying ? '2px solid var(--primary-blue)' : '1px solid var(--glass-border)',
                              transition: 'all 0.3s ease',
                              cursor: 'pointer',
                              position: 'relative',
                              overflow: 'hidden'
                            }}
                            onClick={() => isPlaying ? stopTherapyAudio() : playTherapyAudio(t)}
                          >
                            {isPlaying && (
                              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'linear-gradient(90deg, transparent, rgba(59, 130, 246, 0.05), transparent)', animation: 'wave 2s infinite linear', pointerEvents: 'none' }} />
                            )}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                               <h3 style={{ margin: 0, color: 'var(--primary-blue)' }}>{t.name}</h3>
                               <div style={{ padding: '8px', borderRadius: '50%', background: isPlaying ? 'var(--primary-blue)' : 'rgba(255,255,255,0.05)', color: isPlaying ? 'white' : 'var(--text-secondary)' }}>
                                   {isPlaying ? <Activity size={16} className="animate-pulse" /> : <Play size={16} />}
                               </div>
                            </div>
                            <div style={{ display: 'flex', gap: '10px', marginBottom: '1rem' }}>
                              <span style={{ fontSize: '0.8rem', padding: '4px 8px', borderRadius: '4px', background: 'rgba(59, 130, 246, 0.2)', color: 'var(--primary-blue)' }}>
                                 {t.therapy_type}
                              </span>
                              {t.frequency_hz && (
                                <span style={{ fontSize: '0.8rem', padding: '4px 8px', borderRadius: '4px', background: 'rgba(139, 92, 246, 0.2)', color: '#8b5cf6' }}>
                                   {t.frequency_hz} Hz
                                </span>
                              )}
                              <span style={{ fontSize: '0.8rem', padding: '4px 8px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.2)', color: '#10b981' }}>
                                 {t.duration_minutes} Mins
                              </span>
                            </div>
                            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{t.description}</p>
                            <p style={{ margin: '1rem 0 0 0', fontSize: '0.75rem', color: 'var(--text-sub)' }}>
                              Prescribed: {new Date(t.prescribed_at).toLocaleDateString()}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}

                {/* AI Prescribed Grounding Games */}
                {user.preferred_games && (
                  <motion.div className="card full" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
                    <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span role="img" aria-label="game">🎮</span> Digital Prescription: Grounding Games
                    </h2>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                      Sentia has recommended these games to help you ground yourself when anxiety levels are high.
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
                      {(() => {
                        try {
                          const gameList = JSON.parse(user.preferred_games);
                          if (!Array.isArray(gameList)) throw new Error("Not a list");
                          return gameList.map((game, idx) => (
                            <div 
                              key={idx}
                              className="glass-panel"
                              style={{ padding: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid var(--glass-border)' }}
                            >
                              <div style={{
                                  width: '60px', height: '60px', borderRadius: '12px',
                                  background: `hsl(${(game.name?.charCodeAt(0) || 200) * 137 % 360}, 60%, 35%)`,
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  flexShrink: 0, overflow: 'hidden'
                              }}>
                                  {game.logo ? (
                                      <img 
                                          src={game.logo} 
                                          alt={game.name} 
                                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                          onError={(e) => {
                                              // Hide broken image and show fallback emoji
                                              e.target.style.display = 'none';
                                              e.target.nextSibling.style.display = 'flex';
                                          }}
                                      />
                                  ) : null}
                                  <span style={{ 
                                      display: game.logo ? 'none' : 'flex',
                                      fontSize: '1.8rem', 
                                      alignItems: 'center', 
                                      justifyContent: 'center',
                                      width: '100%', height: '100%'
                                  }}>🎮</span>
                              </div>
                              <div style={{ flex: 1 }}>
                                <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-main)' }}>{game.name}</h3>
                                <p style={{ fontSize: '0.75rem', opacity: 0.6, margin: '4px 0 10px 0' }}>Prescribed: {new Date(game.prescribed_at).toLocaleDateString()}</p>
                                <a 
                                  href={game.link} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="accent-btn"
                                  style={{ padding: '6px 15px', fontSize: '0.85rem', display: 'inline-block', textDecoration: 'none', background: 'var(--primary-blue)', color: 'white', borderRadius: '6px' }}
                                >
                                  Play Now
                                </a>
                              </div>
                            </div>
                          ));
                        } catch (e) {
                          // Fallback for legacy plain text data
                          return (
                            <div className="glass-panel" style={{ padding: '1rem', color: 'var(--text-secondary)' }}>
                              <p>Legacy preferences: {user.preferred_games}</p>
                              <p style={{ fontSize: '0.8rem' }}>Sentia will update these with rich cards the next time she recommends a game!</p>
                            </div>
                          );
                        }
                      })()}
                    </div>
                  </motion.div>
                )}
              </>
            )}
          </>
        )}
      </div>

      <div style={{
        position: 'fixed',
        bottom: '1rem',
        left: '2rem',
        fontSize: '0.85rem',
        color: 'var(--text-sub)',
        zIndex: 100,
        background: 'var(--bg-card)',
        padding: '0.5rem 1rem',
        borderRadius: '20px',
        border: '1px solid var(--glass-border)',
        backdropFilter: 'blur(10px)'
      }}>
        Logged in as: <span style={{ color: 'var(--accent-color)', fontWeight: 'bold' }}>{user.email}</span>
      </div>

      {
        showDoctorChat && user.doctor_id && (
          <ChatInterface
            otherUserId={user.doctor_id}
            otherUserEmail="Doctor" // We might not have doc email, just say Doctor for now
            onClose={() => setShowDoctorChat(false)}
          />
        )
      }
      {
        showSentia && (
          <SentiaFullScreenChat onClose={() => setShowSentia(false)} />
        )
      }
    </div >
  );
}


// Pages that should NOT show the background (auth + landing pages)
const AUTH_ROUTES = ['/', '/login', '/signup', '/welcome'];

function MainContent() {
  const location = useLocation();
  const isLandingPage = location.pathname === '/';
  const showBackground = !AUTH_ROUTES.includes(location.pathname);
  const [activeBg, setActiveBg] = useState(getStoredBackground);

  useEffect(() => {
    const handler = (e) => setActiveBg(e.detail.background);
    window.addEventListener('background-change', handler);
    return () => window.removeEventListener('background-change', handler);
  }, []);

  return (
    <>
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: -1, background: '#02040A', transition: 'background 0.3s ease' }}>
        {showBackground && activeBg === 'neural' && <NeuralBackground theme="dark" />}
        {showBackground && activeBg === 'particles' && (
          <Suspense fallback={null}>
            <Background3D />
          </Suspense>
        )}
        {showBackground && activeBg === 'brain3d' && (
          <Suspense fallback={null}>
            <Brain3D progress={1} />
          </Suspense>
        )}
      </div>
      <Suspense fallback={
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'white', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ width: '40px', height: '40px', border: '3px solid rgba(255,255,255,0.3)', borderRadius: '50%', borderTopColor: '#e1ff5e', animation: 'spin 1s linear infinite' }}></div>
          <p>Loading Sentia...</p>
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        </div>
      }>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={
            <Suspense fallback={null}><Login /></Suspense>
          } />
          <Route path="/signup" element={
            <Suspense fallback={null}><Signup /></Suspense>
          } />
          <Route path="/welcome" element={
            <Suspense fallback={null}><WelcomeScreen /></Suspense>
          } />
          <Route path="/dashboard" element={
            <RequireAuth>
              <Dashboard />
            </RequireAuth>
          } />
          <Route path="/support-dashboard" element={
            <RequireAuth>
              <SupportDashboard />
            </RequireAuth>
          } />
          <Route path="/doctor-dashboard" element={
            <RequireDoctorAuth>
              <Suspense fallback={null}><PsychiatristDashboard /></Suspense>
            </RequireDoctorAuth>
          } />
          <Route path="/doctor/patient/:id" element={
            <RequireDoctorAuth>
              <Suspense fallback={null}><PatientDetailView /></Suspense>
            </RequireDoctorAuth>
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <GlobalDoctorFloatingButton />
        {showBackground && <BackgroundSelector />}
      </Suspense>
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <MainContent />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}



function GlobalDoctorFloatingButton() {
  const { user } = useContext(AuthContext);
  const location = useLocation();

  // Show floating button for doctor chat instead of robot
  const showOnRoutes = ['/dashboard', '/support-dashboard'];
  const shouldShow = user && user.role === 'patient' && user.doctor_id && showOnRoutes.some(route => location.pathname.startsWith(route));

  if (!shouldShow) return null;

  // We need a way to open the doctor chat from here
  // Since we're in App, we can't easily access Dashboard's setShowDoctorChat
  // BUT we can use the navigation menu or just let the dashboard handle its own floating button if we prefer
  // Wait, the user asked for "in place of virtaul assitant robo put the chat with dr"
  
  // To make it fully functional globally, we might need a GlobalChatContext or similar.
  // For now, let's just make it trigger the chat if we are on the dashboard.
  // Actually, Dashboard is where showDoctorChat lives.
  
  // If we want it truly global, we should move showDoctorChat to a context.
  // But let's see if we can trigger it via a custom event like refresh-dashboard.
  
  const handleClick = () => {
    window.dispatchEvent(new CustomEvent('open-doctor-chat'));
  };

  return <DoctorFloatingButton onClick={handleClick} />;
}
