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
  AreaChart,
  Area,
  PieChart,
  Pie,
  CartesianGrid,
  Cell,
} from "recharts";
import { motion, AnimatePresence } from 'framer-motion';
// Eager load critical components
import LandingPage from "./components/LandingPage";
import NeuralBackground from "./components/NeuralBackground";
import { Download, Table as TableIcon, Activity, LogOut, MessageSquare, Sun, Moon, Shield, Menu, X, Play, Timer, Music, Settings, Layout, Sparkles, Layers, Users, User, Camera, Headphones, Compass, MapPin, BookHeart, ShieldAlert, BrainCircuit } from 'lucide-react';

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
  updateProfile,
  getWebSocketUrl
} from "./api";
// Assets
import logoFinal from './assets/logo_final.png';

import "./App.css";
// Lazy load non-critical components
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
const MedicalLogTable = lazy(() => import("./components/MedicalLogTable"));
const DriftInsights = lazy(() => import("./components/DriftInsights"));
const CognitiveModel = lazy(() => import("./components/CognitiveModel"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));

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
  const [exporting, setExporting] = useState(false);
  const [comparison, setComparison] = useState(null);
  const [selfHistory, setSelfHistory] = useState([]);
  const [selfDistribution, setSelfDistribution] = useState({});
  const [fusion, setFusion] = useState(null);
  const [therapies, setTherapies] = useState([]);
  const [activeTherapyId, setActiveTherapyId] = useState(null);
  const [advancedAnalytics, setAdvancedAnalytics] = useState(null);
  
  // Use refs for audio objects so they don't trigger or get caught in re-renders
  const audioContextRef = useRef(null);
  const oscillatorsRef = useRef([]);
  const audioFileRef = useRef(null);
  const therapyTimerRef = useRef(null); // Timer for auto-stop after duration
  
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [monitoring, setMonitoring] = useState(true);
  const [viewMode, setViewMode] = useState('dashboard');
  const [mapQuery, setMapQuery] = useState('mental health support');
  const [selectedMapItem, setSelectedMapItem] = useState(null);
  const [showRoute, setShowRoute] = useState(false);
 // 'dashboard', 'table', 'chat', 'settings', 'meditation', 'media', 'community'
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const dashboardRef = useRef(null);

  const load = useCallback(async () => {
    if (!user || !user.id) return;
    try {
      const [t, d, dr, a, c, sh, sd, f, th, aa] = await Promise.all([
        getTimeline(range),
        getDistribution(),
        getDrift(),
        getAlerts(),
        getComparison(range),
        getSelfEmotionHistory(range),
        getSelfEmotionDistribution(range),
        getFusionAnalytics(range === '1h' ? 0 : range === '24h' ? 1 : 7),
        getPatientTherapies(user.id).catch(() => ({ data: [] })),
        API.get("/analytics/advanced").then(res => res.data).catch(() => null)
      ]);

      setTimeline(t.data);
      setDistribution(d.data);
      setDrift(dr.data);
      setAlerts(a.data);
      setComparison(c.data);
      setSelfHistory(sh.data);
      setSelfDistribution(sd.data);
      setFusion(f.data);
      if (aa) setAdvancedAnalytics(aa);
      
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

  // WebSocket connection for real-time updates
  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem('token');
    const wsUrl = `${getWebSocketUrl()}/ws/dashboard?token=${token}`;
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => console.log("Dashboard WebSocket Connected");
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'intelligence_update' || data.type === 'risk_escalation') {
           console.log("Real-time update received, refreshing dashboard...");
           load();
           if (data.type === 'risk_escalation') {
               setAlerts(prev => [{message: data.data.message, created_at: new Date().toISOString(), metric_type: 'CRITICAL'}, ...prev]);
           }
        }
      } catch (e) {
        console.error("WS parse error", e);
      }
    };
    ws.onerror = (e) => console.error("WS error", e);
    
    return () => ws.close();
  }, [user, load]);

  // Listen for global refresh events (e.g. from Sentia or Mirror)
  useEffect(() => {
    const handleRefresh = () => {
      console.log("Refreshing dashboard data via event...");
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
      console.log("Activating doctor chat view from global event...");
      setViewMode('doctor-chat');
    };
    window.addEventListener('open-doctor-chat', handleOpenDoctorChat);
    return () => window.removeEventListener('open-doctor-chat', handleOpenDoctorChat);
  }, []);

  // Listener for global sentia session open event
  useEffect(() => {
    const handleOpenSentia = () => {
      console.log("Activating Sentia view from global event...");
      setViewMode('sentia');
    };
    window.addEventListener('open-sentia', handleOpenSentia);
    return () => window.removeEventListener('open-sentia', handleOpenSentia);
  }, []);

  const handleExportReport = async () => {
    if (!user || exporting) return;
    setExporting(true);
    try {
      const now = new Date();
      let fromDate = new Date();
      if (range === '1h') fromDate.setHours(now.getHours() - 1);
      else if (range === '24h') fromDate.setDate(now.getDate() - 1);
      else if (range === '7d') fromDate.setDate(now.getDate() - 7);

      const payload = {
        user_id: user.id.toString(),
        from_date: fromDate.toISOString(),
        to_date: now.toISOString(),
        report_type: "emotion_summary"
      };

      const res = await generateReport(payload);
      const reportId = res.data.report_id;
      
      // Fetch the file with auth token
      const downloadRes = await API.get(`/reports/download/${reportId}`, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([downloadRes.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `emotion_report_${reportId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Export failed", e);
      alert("Failed to export report. please check connection.");
    } finally {
      setExporting(false);
    }
  };

  const submit = async () => {
    if (!text.trim() || !monitoring) return;
    setLoading(true);
    await postPredict(text);
    setText("");
    await load();
    setLoading(false);
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
        // Smart ambient sound mapping based on therapy type
        // Using reliable, CDN-hosted ambient sounds from mixkit & soundjay
        const AMBIENT_SOUNDS = {
            rain:         'https://www.soundjay.com/nature/sounds/rain-01.mp3',
            'white noise':'https://www.soundjay.com/nature/sounds/white-noise-1.mp3',
            nature:       'https://www.soundjay.com/nature/sounds/birds-in-forest-1.mp3',
            forest:       'https://www.soundjay.com/nature/sounds/birds-in-forest-1.mp3',
            sleep:        'https://www.soundjay.com/nature/sounds/white-noise-1.mp3',
            focus:        'https://www.soundjay.com/nature/sounds/crickets-1.mp3',
            meditation:   'https://www.soundjay.com/nature/sounds/birds-in-forest-1.mp3',
            ocean:        'https://www.soundjay.com/miscellaneous/sounds/ocean-wave-1.mp3',
            waves:        'https://www.soundjay.com/miscellaneous/sounds/ocean-wave-1.mp3',
        };
        
        // Find matching sound based on therapy name or type
        const searchStr = `${therapy.name || ''} ${therapy.therapy_type || ''}`.toLowerCase();
        let ambientUrl = null;
        
        for (const [key, url] of Object.entries(AMBIENT_SOUNDS)) {
            if (searchStr.includes(key)) {
                ambientUrl = url;
                break;
            }
        }
        
        // Fallback to rain (calming default)
        ambientUrl = ambientUrl || AMBIENT_SOUNDS['rain'];
        
        const audio = new Audio(ambientUrl);
        audio.crossOrigin = "anonymous";
        audio.loop = true;
        audio.volume = 0.45;
        audioFileRef.current = audio;
        audio.play().catch(e => {
            console.error("Error playing ambient audio:", e);
            // Try Google fallback
            const fallback = new Audio('https://actions.google.com/sounds/v1/ambiences/forest_with_night_insects.ogg');
            fallback.loop = true;
            fallback.volume = 0.45;
            audioFileRef.current = fallback;
            fallback.play().catch(e2 => {
                console.error("Fallback also failed:", e2);
                setActiveTherapyId(null);
            });
        });
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
    <div className="dashboard" ref={dashboardRef}>
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="sidebar-logo" style={{ padding: '0 24px 32px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '32px', height: '32px', background: 'var(--accent-purple)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', color: '#fff' }}>S</div>
        </div>
        
        <nav className="nav-links">
          <div className={`nav-item ${viewMode === 'dashboard' ? 'active' : ''}`} onClick={() => setViewMode('dashboard')}>
            <Layout size={18} /> <span>Home</span>
          </div>
          <div className={`nav-item ${viewMode === 'vitals' ? 'active' : ''}`} onClick={() => setViewMode('vitals')}>
            <Activity size={18} /> <span>Vitals</span>
          </div>
          <div className={`nav-item ${viewMode === 'sentia' ? 'active' : ''}`} onClick={() => setViewMode('sentia')}>
            <Sparkles size={18} /> <span>Virtual Therapist</span>
          </div>
          <div className={`nav-item ${viewMode === 'community' ? 'active' : ''}`} onClick={() => setViewMode('community')}>
            <MessageSquare size={18} /> <span>Community Chat</span>
          </div>
          <div className={`nav-item ${viewMode === 'media' ? 'active' : ''}`} onClick={() => setViewMode('media')}>
            <Music size={18} /> <span>Music</span>
          </div>
          <div className={`nav-item ${viewMode === 'therapy' ? 'active' : ''}`} onClick={() => setViewMode('therapy')}>
            <Timer size={18} /> <span>Breathing Exercise</span>
          </div>
          {user?.role === 'patient' && user?.doctor_id && (
              <div className={`nav-item ${viewMode === 'doctor-chat' ? 'active' : ''}`} onClick={() => setViewMode('doctor-chat')}>
                <MessageSquare size={18} /> <span>Chat with Doctor</span>
              </div>
          )}
          <div className={`nav-item ${viewMode === 'face' ? 'active' : ''}`} onClick={() => setViewMode('face')}>
            <Camera size={18} /> <span>Face Analyzer</span>
          </div>
          <div className={`nav-item ${viewMode === 'binaural' ? 'active' : ''}`} onClick={() => setViewMode('binaural')}>
            <Headphones size={18} /> <span>Binaural Beats</span>
          </div>
          <div className={`nav-item ${viewMode === 'table' ? 'active' : ''}`} onClick={() => setViewMode('table')}>
            <Layers size={18} /> <span>Logs</span>
          </div>
          <div className={`nav-item ${viewMode === 'insights' ? 'active' : ''}`} onClick={() => setViewMode('insights')}>
            <ShieldAlert size={18} /> <span>Drift Insights</span>
          </div>
          <div className={`nav-item ${viewMode === 'medtracker' ? 'active' : ''}`} onClick={() => setViewMode('medtracker')}>
            <BookHeart size={18} /> <span>Med Tracker</span>
          </div>
          <div className={`nav-item ${viewMode === 'map' ? 'active' : ''}`} onClick={() => setViewMode('map')}>
            <MapPin size={18} /> <span>Nearby Help</span>
          </div>
          <div className={`nav-item ${viewMode === 'cognitive' ? 'active' : ''}`} onClick={() => setViewMode('cognitive')}>
            <BrainCircuit size={18} />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: '1.2' }}>
              <span>PCS (Cognitive Model)</span>
              <span style={{ fontSize: '0.65rem', color: '#a084e8', fontWeight: '700', letterSpacing: '0.5px' }}>Coming Soon</span>
            </div>
          </div>
          <div className={`nav-item ${viewMode === 'settings' ? 'active' : ''}`} onClick={() => setViewMode('settings')}>
            <Settings size={18} /> <span>Settings</span>
          </div>
        </nav>
      </aside>

      <main className="main-content">
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Compass className="text-blue-500" size={24} />
                <h2 style={{ fontSize: '1.25rem', fontWeight: '900', letterSpacing: '-0.5px', margin: 0, color: 'white', fontFamily: 'var(--font-heading)' }}>
                   Emotion Drift
                </h2>
             </div>
             <div className="glass-panel" style={{ 
               padding: '6px 14px', 
               borderRadius: '100px', 
               fontSize: '0.65rem', 
               fontWeight: '800', 
               color: 'rgba(255,255,255,0.4)', 
               letterSpacing: '1px',
               display: 'flex', 
               alignItems: 'center', 
               gap: '8px',
               background: 'rgba(16, 185, 129, 0.05)',
               border: '1px solid rgba(16, 185, 129, 0.1)'
             }}>
               <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-green)', boxShadow: '0 0 10px var(--accent-green)' }} />
               CURRENT ATMOSPHERE: <span style={{ color: 'var(--accent-green)' }}>SERENE</span>
             </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', position: 'relative' }}>
            <div 
              className="bell" 
              style={{ position: 'relative', cursor: 'pointer' }} 
              onClick={(e) => {
                 e.stopPropagation();
                 setShowAlerts(prev => !prev);
              }}
            >
              <Activity size={20} color="var(--text-secondary)" />
              {alerts.length > 0 && <div style={{ position: 'absolute', top: -2, right: -2, width: '8px', height: '8px', background: '#ff4757', borderRadius: '50%', border: '2px solid #0D0E12' }} />}
            </div>
            
            <AnimatePresence>
              {showAlerts && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="alert-popup glass-panel"
                  style={{ position: 'absolute', top: '40px', right: '100px', width: '320px', padding: '1.2rem', zIndex: 100 }}
                >
                  <h3 className="serif-heading" style={{ fontSize: '0.85rem', marginBottom: '1rem', color: 'var(--text-main)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    Vital Alerts
                    <span style={{ background: 'var(--emotion-anger)', color: '#fff', fontSize: '0.65rem', padding: '2px 8px', borderRadius: '100px' }}>{alerts.length}</span>
                  </h3>
                  {alerts.length === 0 ? (
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center', margin: '1rem 0' }}>All systems stable. No active alerts.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '300px', overflowY: 'auto' }}>
                      {alerts.map((alert, idx) => (
                        <div key={idx} style={{ padding: '0.85rem', background: 'rgba(232, 132, 132, 0.1)', border: '1px solid rgba(232, 132, 132, 0.3)', borderRadius: '12px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                              <span style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--emotion-anger)' }}>{alert.metric_type?.toUpperCase()} ALERT</span>
                              <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>{new Date(alert.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                          </div>
                          <p style={{ margin: '0', fontSize: '0.8rem', color: 'var(--text-main)', lineHeight: '1.4' }}>{alert.message}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingLeft: '12px', borderLeft: '1px solid rgba(255,255,255,0.1)' }}>
               <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                 <span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-main)' }}>{user?.email.split('@')[0] || 'Alex Mercer'}</span>
                 <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', letterSpacing: '0.5px' }}>PREMIUM SANCTUARY</span>
               </div>
               <div style={{ width: '36px', height: '36px', borderRadius: '50%', border: '2px solid var(--accent-purple)', background: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-purple)' }}>
                 <User size={18} />
               </div>
            </div>
            
            <button 
              className="glass-button" 
              onClick={handleExportReport}
              disabled={exporting}
              style={{ fontSize: '0.75rem', padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '8px', opacity: exporting ? 0.5 : 1 }}
            >
              <Download size={14} className={exporting ? "animate-spin" : ""} /> {exporting ? "Exporting..." : "Export Report"}
            </button>
          </div>
        </header>

        {/* View Switcher Content */}
        <div className={!monitoring ? "monitoring-paused" : ""}>
          {monitoring ? (
            <>
              {viewMode === 'chat' ? (
                <div style={{ marginTop: '1rem' }}>
                  <button className="text-btn" onClick={() => setViewMode('dashboard')} style={{ marginBottom: '1rem', color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem' }}>
                    &larr; Back to Dashboard
                  </button>
                  <ChatAnalyzer />
                </div>
              ) : viewMode === 'doctor-chat' ? (
                <div style={{ marginTop: '1rem', height: '100%', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <button className="text-btn" onClick={() => setViewMode('dashboard')} style={{ marginBottom: '1rem', color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem' }}>
                    &larr; Back to Dashboard
                  </button>
                  <div style={{ flex: 1, minHeight: '600px' }}>
                     <ChatInterface otherUserId={user?.doctor_id} otherUserEmail="Your Doctor" isEmbedded={true} onClose={() => {}} />
                  </div>
                </div>
              ) : viewMode === 'therapy' ? (
                <div style={{ marginTop: '1rem' }}>
                  <button className="text-btn" onClick={() => setViewMode('dashboard')} style={{ marginBottom: '1rem', color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem' }}>
                    &larr; Back to Dashboard
                  </button>
                  <Suspense fallback={<div>Loading Meditation...</div>}>
                    <MeditationTimer onComplete={() => load()} />
                  </Suspense>
                </div>
              ) : viewMode === 'media' ? (
                <div style={{ marginTop: '1rem' }}>
                  <button className="text-btn" onClick={() => setViewMode('dashboard')} style={{ marginBottom: '1rem', color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem' }}>
                    &larr; Back to Dashboard
                  </button>
                  <Suspense fallback={<div>Loading Media...</div>}>
                    <MediaHub />
                  </Suspense>
                </div>
              ) : viewMode === 'community' ? (
                <div style={{ marginTop: '1rem' }}>
                  <button className="text-btn" onClick={() => setViewMode('dashboard')} style={{ marginBottom: '1rem', color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem' }}>
                    &larr; Back to Dashboard
                  </button>
                  <Suspense fallback={<div>Loading Community Chat...</div>}>
                    <CommunityChat />
                  </Suspense>
                </div>
              ) : viewMode === 'vitals' ? (
                <div style={{ marginTop: '1rem' }}>
                  <button className="text-btn" onClick={() => setViewMode('dashboard')} style={{ marginBottom: '1rem', color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem' }}>
                    &larr; Back to Dashboard
                  </button>
                  <Suspense fallback={<div>Loading Vitals Dashboard...</div>}>
                    <VitalsDashboard />
                  </Suspense>
                </div>
              ) : viewMode === 'face' ? (
                <div style={{ marginTop: '1rem' }}>
                  <button className="text-btn" onClick={() => setViewMode('dashboard')} style={{ marginBottom: '1rem', color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem' }}>
                    &larr; Back to Dashboard
                  </button>
                  <Suspense fallback={<div>Loading Face Analyzer...</div>}>
                    <SelfEmotionMonitor />
                  </Suspense>
                </div>
              ) : viewMode === 'binaural' ? (
                <div style={{ marginTop: '1rem' }}>
                  <button className="text-btn" onClick={() => setViewMode('dashboard')} style={{ marginBottom: '1rem', color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem' }}>
                    &larr; Back to Dashboard
                  </button>
                  <div className="glass-panel" style={{ padding: '3rem', maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
                     <Headphones size={48} color="var(--accent-purple)" style={{ marginBottom: '1rem' }} />
                     <h2 className="serif-heading" style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Binaural Beats Therapy</h2>
                     <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
                         Deeply relaxing 432Hz base frequency mixed with a 10Hz offset to induce Alpha wave states for relaxation and focus.
                     </p>
                     <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
                       <button className="glass-button primary" onClick={() => playTherapyAudio({ id: 'binaural-manual', therapy_type: 'binaural', duration_minutes: 15 })}>
                         Start 15m Session
                       </button>
                       <button className="glass-button" onClick={() => stopTherapyAudio()} style={{ background: 'rgba(232, 132, 132, 0.1)', borderColor: 'var(--emotion-anger)', color: 'var(--emotion-anger)' }}>
                         Stop
                       </button>
                     </div>
                  </div>
                </div>
              ) : viewMode === 'sentia' ? (
                <SentiaFullScreenChat onClose={() => setViewMode('dashboard')} />
              ) : viewMode === 'settings' ? (
                <div style={{ marginTop: '1rem' }}>
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
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                              <label style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Music & Media Interests</label>
                              <textarea 
                                  value={user.music_interests || ''}
                                  onChange={(e) => updateUserProfile({ music_interests: e.target.value })}
                                  placeholder="e.g. Lofi hip hop for focus..."
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
                          </div>
                      </div>
                      <button className="accent-btn" onClick={() => setViewMode('dashboard')} style={{ marginTop: '1.5rem' }}>Save & Return</button>
                  </div>
                </div>
              ) : viewMode === 'table' ? (
                <div style={{ marginTop: '1rem' }}>
                  <button className="text-btn" onClick={() => setViewMode('dashboard')} style={{ marginBottom: '1rem', color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem' }}>
                    &larr; Back to Dashboard
                  </button>
                  <LogTable logs={timelineData} />
                </div>
              ) : viewMode === 'insights' ? (
                <div style={{ marginTop: '1rem' }}>
                  <button className="text-btn" onClick={() => setViewMode('dashboard')} style={{ marginBottom: '1rem', color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem' }}>
                    &larr; Back to Dashboard
                  </button>
                  <Suspense fallback={<div>Loading Drift Insights...</div>}>
                    <DriftInsights />
                  </Suspense>
                </div>
              ) : viewMode === 'medtracker' ? (
                <div style={{ marginTop: '1rem' }}>
                  <button className="text-btn" onClick={() => setViewMode('dashboard')} style={{ marginBottom: '1rem', color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem' }}>
                    &larr; Back to Dashboard
                  </button>
                  <Suspense fallback={<div>Loading Med Tracker...</div>}>
                    <MedicalLogTable />
                  </Suspense>
                </div>
              ) : viewMode === 'map' ? (
                <div style={{ marginTop: '1rem' }}>
                  <button className="text-btn" onClick={() => setViewMode('dashboard')} style={{ marginBottom: '1rem', color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem' }}>
                    &larr; Back to Dashboard
                  </button>
                  <div className="glass-panel" style={{ padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem' }}>
                      <MapPin size={24} color="var(--accent-purple)" />
                      <div>
                        <h2 className="serif-heading" style={{ fontSize: '1rem', letterSpacing: '3px', color: 'var(--accent-purple)', opacity: 1 }}>NEARBY MENTAL HEALTH SUPPORT</h2>
                        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Find therapists, clinics, and wellness centers near you.</p>
                      </div>
                    </div>
                    
                    {/* Category Selector Menu */}
                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                      <button 
                        onClick={() => { setMapQuery('psychiatrist near me'); setSelectedMapItem(null); setShowRoute(false); }}
                        className={`glass-button ${mapQuery.includes('psychiatrist') ? 'primary' : ''}`}
                        style={{ fontSize: '0.8rem', padding: '0.6rem 1.2rem' }}
                      >
                        <MapPin size={14} style={{ marginRight: '6px' }} /> Find Psychiatrists
                      </button>
                      <button 
                        onClick={() => { setMapQuery('mental health clinic near me'); setSelectedMapItem(null); setShowRoute(false); }}
                        className={`glass-button ${mapQuery.includes('clinic') ? 'primary' : ''}`}
                        style={{ fontSize: '0.8rem', padding: '0.6rem 1.2rem' }}
                      >
                        <MapPin size={14} style={{ marginRight: '6px' }} /> Mental Health Clinics
                      </button>
                      <button 
                        onClick={() => { setMapQuery('yoga wellness center near me'); setSelectedMapItem(null); setShowRoute(false); }}
                        className={`glass-button ${mapQuery.includes('wellness') ? 'primary' : ''}`}
                        style={{ fontSize: '0.8rem', padding: '0.6rem 1.2rem' }}
                      >
                        <MapPin size={14} style={{ marginRight: '6px' }} /> Wellness Centers
                      </button>
                    </div>

                    <div style={{ borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--glass-border)', height: '480px', position: 'relative', background: '#0F1117', backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(139, 92, 246, 0.1) 0%, transparent 60%), linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)', backgroundSize: '100% 100%, 40px 40px, 40px 40px' }}>
                        
                        {/* Mock User Location Center */}
                        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 5 }}>
                            <div className="pulse" style={{ width: '16px', height: '16px', background: '#fff', borderRadius: '50%', boxShadow: '0 0 20px #fff', border: '3px solid var(--accent-blue)' }}></div>
                            <div style={{ position: 'absolute', top: '20px', left: '-20px', color: '#fff', fontSize: '10px', fontWeight: 'bold', whiteSpace: 'nowrap', textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>You are here</div>
                        </div>

                        {/* SVG Routing Line */}
                        {showRoute && selectedMapItem && (
                          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 4 }}>
                            <defs>
                              <linearGradient id="routeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#fff" stopOpacity="0.8" />
                                <stop offset="100%" stopColor={selectedMapItem.color} stopOpacity="0.8" />
                              </linearGradient>
                              <filter id="glow">
                                <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                                <feMerge>
                                  <feMergeNode in="coloredBlur"/>
                                  <feMergeNode in="SourceGraphic"/>
                                </feMerge>
                              </filter>
                            </defs>
                            <line 
                              x1="50%" y1="50%" 
                              x2={selectedMapItem.left} y2={selectedMapItem.top} 
                              stroke="url(#routeGrad)" strokeWidth="4" strokeDasharray="8 8"
                              filter="url(#glow)"
                              className="route-animation"
                            />
                          </svg>
                        )}

                        {/* Dynamic Map Pins based on Category */}
                        {mapQuery.includes('psychiatrist') ? (
                          <>
                            <div onClick={() => { setSelectedMapItem({ name: 'Dr. Mercer, MD', type: 'Psychiatrist', color: 'var(--accent-green)', top: '30%', left: '40%', rating: '4.9', distance: '1.2 miles', phone: '(555) 123-4567', address: '120 Neuro Ave, Suite 300' }); setShowRoute(false); }} style={{ position: 'absolute', top: '30%', left: '40%', cursor: 'pointer', zIndex: 10 }}>
                                <div className="pulse" style={{ width: '14px', height: '14px', background: 'var(--accent-green)', borderRadius: '50%', boxShadow: '0 0 15px var(--accent-green)' }}></div>
                                <div style={{ position: 'absolute', top: '-30px', left: '-50px', background: selectedMapItem?.name === 'Dr. Mercer, MD' ? 'var(--accent-green)' : 'rgba(0,0,0,0.8)', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', color: selectedMapItem?.name === 'Dr. Mercer, MD' ? '#000' : '#fff', border: '1px solid var(--accent-green)', whiteSpace: 'nowrap', fontWeight: 'bold' }}>Dr. Mercer, MD</div>
                            </div>
                            <div onClick={() => { setSelectedMapItem({ name: 'City Psychiatry', type: 'Clinic', color: 'var(--accent-purple)', top: '60%', left: '70%', rating: '4.7', distance: '3.4 miles', phone: '(555) 987-6543', address: '850 Wellness Blvd' }); setShowRoute(false); }} style={{ position: 'absolute', top: '60%', left: '70%', cursor: 'pointer', zIndex: 10 }}>
                                <div className="pulse" style={{ width: '14px', height: '14px', background: 'var(--accent-purple)', borderRadius: '50%', boxShadow: '0 0 15px var(--accent-purple)' }}></div>
                                <div style={{ position: 'absolute', top: '-30px', left: '-60px', background: selectedMapItem?.name === 'City Psychiatry' ? 'var(--accent-purple)' : 'rgba(0,0,0,0.8)', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', color: selectedMapItem?.name === 'City Psychiatry' ? '#fff' : '#fff', border: '1px solid var(--accent-purple)', whiteSpace: 'nowrap', fontWeight: 'bold' }}>City Psychiatry</div>
                            </div>
                            <div onClick={() => { setSelectedMapItem({ name: 'Dr. Chen', type: 'Psychiatrist', color: 'var(--accent-blue)', top: '45%', left: '20%', rating: '4.8', distance: '0.8 miles', phone: '(555) 456-7890', address: '45 Serenity Lane' }); setShowRoute(false); }} style={{ position: 'absolute', top: '45%', left: '20%', cursor: 'pointer', zIndex: 10 }}>
                                <div className="pulse" style={{ width: '14px', height: '14px', background: 'var(--accent-blue)', borderRadius: '50%', boxShadow: '0 0 15px var(--accent-blue)' }}></div>
                                <div style={{ position: 'absolute', top: '-30px', left: '-40px', background: selectedMapItem?.name === 'Dr. Chen' ? 'var(--accent-blue)' : 'rgba(0,0,0,0.8)', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', color: selectedMapItem?.name === 'Dr. Chen' ? '#fff' : '#fff', border: '1px solid var(--accent-blue)', whiteSpace: 'nowrap', fontWeight: 'bold' }}>Dr. Chen</div>
                            </div>
                          </>
                        ) : mapQuery.includes('clinic') ? (
                          <>
                            <div onClick={() => { setSelectedMapItem({ name: 'Hope Clinic', type: 'Clinic', color: 'var(--accent-purple)', top: '25%', left: '55%', rating: '4.6', distance: '2.1 miles', phone: '(555) 333-2222', address: '200 Healing Way' }); setShowRoute(false); }} style={{ position: 'absolute', top: '25%', left: '55%', cursor: 'pointer', zIndex: 10 }}>
                                <div className="pulse" style={{ width: '14px', height: '14px', background: 'var(--accent-purple)', borderRadius: '50%', boxShadow: '0 0 15px var(--accent-purple)' }}></div>
                                <div style={{ position: 'absolute', top: '-30px', left: '-60px', background: selectedMapItem?.name === 'Hope Clinic' ? 'var(--accent-purple)' : 'rgba(0,0,0,0.8)', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', color: '#fff', border: '1px solid var(--accent-purple)', whiteSpace: 'nowrap', fontWeight: 'bold' }}>Hope Clinic</div>
                            </div>
                            <div onClick={() => { setSelectedMapItem({ name: 'Serenity Mental Health', type: 'Clinic', color: 'var(--accent-green)', top: '70%', left: '30%', rating: '4.5', distance: '4.5 miles', phone: '(555) 444-5555', address: '77 Peace Court' }); setShowRoute(false); }} style={{ position: 'absolute', top: '70%', left: '30%', cursor: 'pointer', zIndex: 10 }}>
                                <div className="pulse" style={{ width: '14px', height: '14px', background: 'var(--accent-green)', borderRadius: '50%', boxShadow: '0 0 15px var(--accent-green)' }}></div>
                                <div style={{ position: 'absolute', top: '-30px', left: '-40px', background: selectedMapItem?.name === 'Serenity Mental Health' ? 'var(--accent-green)' : 'rgba(0,0,0,0.8)', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', color: selectedMapItem?.name === 'Serenity Mental Health' ? '#000' : '#fff', border: '1px solid var(--accent-green)', whiteSpace: 'nowrap', fontWeight: 'bold' }}>Serenity Mental Health</div>
                            </div>
                          </>
                        ) : (
                          <>
                            <div onClick={() => { setSelectedMapItem({ name: 'Zen Wellness Center', type: 'Wellness Center', color: 'var(--accent-blue)', top: '50%', left: '50%', rating: '4.9', distance: '1.0 miles', phone: '(555) 888-9999', address: '100 Zen Plaza' }); setShowRoute(false); }} style={{ position: 'absolute', top: '50%', left: '50%', cursor: 'pointer', zIndex: 10 }}>
                                <div className="pulse" style={{ width: '14px', height: '14px', background: 'var(--accent-blue)', borderRadius: '50%', boxShadow: '0 0 15px var(--accent-blue)' }}></div>
                                <div style={{ position: 'absolute', top: '-30px', left: '-50px', background: selectedMapItem?.name === 'Zen Wellness Center' ? 'var(--accent-blue)' : 'rgba(0,0,0,0.8)', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', color: '#fff', border: '1px solid var(--accent-blue)', whiteSpace: 'nowrap', fontWeight: 'bold' }}>Zen Wellness Center</div>
                            </div>
                            <div onClick={() => { setSelectedMapItem({ name: 'Lotus Yoga', type: 'Wellness Center', color: 'var(--accent-gold)', top: '35%', left: '75%', rating: '4.8', distance: '2.8 miles', phone: '(555) 777-6666', address: '33 Blossom St' }); setShowRoute(false); }} style={{ position: 'absolute', top: '35%', left: '75%', cursor: 'pointer', zIndex: 10 }}>
                                <div className="pulse" style={{ width: '14px', height: '14px', background: 'var(--accent-gold)', borderRadius: '50%', boxShadow: '0 0 15px var(--accent-gold)' }}></div>
                                <div style={{ position: 'absolute', top: '-30px', left: '-40px', background: selectedMapItem?.name === 'Lotus Yoga' ? 'var(--accent-gold)' : 'rgba(0,0,0,0.8)', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', color: selectedMapItem?.name === 'Lotus Yoga' ? '#000' : '#fff', border: '1px solid var(--accent-gold)', whiteSpace: 'nowrap', fontWeight: 'bold' }}>Lotus Yoga</div>
                            </div>
                          </>
                        )}
                        
                        {/* Info Overlay */}
                        <div style={{ position: 'absolute', bottom: '20px', left: '20px', background: 'rgba(26, 29, 38, 0.8)', backdropFilter: 'blur(8px)', padding: '12px 20px', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)', fontSize: '0.9rem', fontWeight: '600' }}>
                                <div className="dot-pulse" style={{ width: '8px', height: '8px', background: 'var(--accent-green)', borderRadius: '50%' }}></div>
                                Active Radar: {mapQuery.includes('psychiatrist') ? 'Psychiatrists' : mapQuery.includes('clinic') ? 'Clinics' : 'Wellness'}
                            </div>
                        </div>

                        {/* Location Details Panel Overlay */}
                        <AnimatePresence>
                          {selectedMapItem && (
                            <motion.div 
                              initial={{ x: 300, opacity: 0 }}
                              animate={{ x: 0, opacity: 1 }}
                              exit={{ x: 300, opacity: 0 }}
                              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                              style={{ 
                                position: 'absolute', top: '20px', right: '20px', bottom: '20px', width: '280px', 
                                background: 'rgba(15, 17, 23, 0.95)', backdropFilter: 'blur(10px)',
                                borderRadius: '16px', border: `1px solid ${selectedMapItem.color}`,
                                padding: '24px', display: 'flex', flexDirection: 'column', zIndex: 20,
                                boxShadow: `-10px 0 30px rgba(0,0,0,0.5)`
                              }}
                            >
                              <button onClick={() => setSelectedMapItem(null)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                                <X size={20} />
                              </button>
                              
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: selectedMapItem.color, boxShadow: `0 0 10px ${selectedMapItem.color}` }}></div>
                                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-secondary)', fontWeight: '700' }}>{selectedMapItem.type}</span>
                              </div>
                              
                              <h3 style={{ margin: '0 0 16px 0', fontSize: '1.4rem', color: '#fff', fontFamily: 'var(--font-heading)' }}>{selectedMapItem.name}</h3>
                              
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
                                <span style={{ background: 'rgba(255, 215, 0, 0.1)', color: '#FFD700', padding: '4px 8px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 'bold' }}>★ {selectedMapItem.rating}</span>
                                <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{selectedMapItem.distance} away</span>
                              </div>

                              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                                  <MapPin size={18} color="var(--text-secondary)" style={{ marginTop: '2px' }} />
                                  <span style={{ color: 'var(--text-main)', fontSize: '0.9rem', lineHeight: 1.5 }}>{selectedMapItem.address}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                  <Activity size={18} color="var(--text-secondary)" />
                                  <span style={{ color: 'var(--text-main)', fontSize: '0.9rem' }}>{selectedMapItem.phone}</span>
                                </div>
                              </div>

                              <button 
                                onClick={() => setShowRoute(!showRoute)}
                                className="glass-button" 
                                style={{ width: '100%', marginTop: 'auto', padding: '12px', background: showRoute ? 'rgba(255,255,255,0.05)' : selectedMapItem.color, color: showRoute ? 'var(--text-main)' : '#000', border: 'none' }}
                              >
                                {showRoute ? 'Clear Route' : 'Get Directions'}
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>

                    </div>
                  </div>
                </div>
              ) : viewMode === 'cognitive' ? (
                <div style={{ marginTop: '1rem' }}>
                  <button className="text-btn" onClick={() => setViewMode('dashboard')} style={{ marginBottom: '1rem', color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem' }}>
                    &larr; Back to Dashboard
                  </button>
                  <Suspense fallback={<div>Loading Cognitive Model...</div>}>
                    <CognitiveModel />
                  </Suspense>
                </div>
              ) : (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ paddingBottom: '80px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  <div style={{ marginBottom: '16px' }}>
                    <h1 style={{ fontSize: '2.5rem', fontWeight: '800', margin: '0 0 12px 0', letterSpacing: '-0.5px' }}>
                       Welcome Back, {(user?.email.split('@')[0] || "Alex").replace(/^[a-z]/, c => c.toUpperCase())}.
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', maxWidth: '600px', margin: 0, lineHeight: 1.6 }}>
                       The emotional landscape is shifting towards tranquility. Your current drift is within optimal parameters.
                    </p>
                  </div>

                  <div className="premium-bento-grid">
                     {/* Daily Emotional State */}
                     <motion.div className="glass-panel stat-card" style={{ gridArea: 'state', padding: '24px', display: 'flex', flexDirection: 'column' }}>
                       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                         <div style={{ fontSize: '0.75rem', letterSpacing: '2px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '700' }}>Daily Emotional State</div>
                         <Activity size={16} color="var(--text-secondary)" opacity={0.5} />
                       </div>
                       <div style={{ display: 'flex', gap: '32px', flex: 1, alignItems: 'center' }}>
                          <div className="score-ring-wrapper">
                             <div className="score-ring-inner">
                                <div className="score-number">{(fusion?.stability_score * 100 || 84).toFixed(0)}</div>
                                <div className="score-label">STABLE</div>
                             </div>
                             <svg className="ring-svg" viewBox="0 0 100 100">
                                <circle className="ring-bg" cx="50" cy="50" r="46" />
                                <circle className="ring-progress" cx="50" cy="50" r="46" strokeDasharray="289" strokeDashoffset={289 * (1 - (fusion?.stability_score || 0.84))} />
                             </svg>
                          </div>
                          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                             <p style={{ fontSize: '1.05rem', lineHeight: 1.6, color: 'var(--text-main)', margin: '0 0 24px 0' }}>
                               Your state is <span style={{ color: 'var(--accent-green)', fontWeight: '600' }}>remarkably serene</span> today. Consistent meditation and Sentia logging have contributed to a 12% increase in stability.
                             </p>
                             <div style={{ display: 'flex', gap: '16px' }}>
                               <div className="stat-sub-card">
                                 <div className="stat-sub-label">Drift Variance</div>
                                 <div className="stat-sub-val">{(drift?.details?.variance || 0.04).toFixed(2)} <span style={{ color: 'var(--accent-green)', fontSize: '0.75rem' }}>↓2%</span></div>
                               </div>
                               <div className="stat-sub-card">
                                 <div className="stat-sub-label">Peak Intensity</div>
                                 <div className="stat-sub-val" style={{ color: 'var(--text-main)' }}>Moderate</div>
                               </div>
                             </div>
                          </div>
                       </div>
                     </motion.div>

                     {/* Deep Insight */}
                     <motion.div className="glass-panel" style={{ gridArea: 'insight', padding: '24px', display: 'flex', flexDirection: 'column', position: 'relative', background: 'linear-gradient(145deg, rgba(26,29,38,0.8), rgba(26,29,38,0.4))' }}>
                       <div className="sparkle-icon"><Sparkles size={18} color="#fff" /></div>
                       <h3 style={{ fontSize: '1.25rem', marginTop: '16px', marginBottom: '12px', fontWeight: '700' }}>Deep Insight</h3>
                       <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.6, flex: 1, marginBottom: '24px' }}>
                         "Your emotional drift is currently low. Introspection is high today—consider a Sentia session to capture the subtle nuances of this clarity."
                       </p>
                       <button className="glass-button action-btn-purple" onClick={() => setViewMode('sentia')} style={{ width: '100%', padding: '12px' }}>
                         Start Deep Dive
                       </button>
                     </motion.div>

                     {/* Weekly Trends */}
                     <motion.div className="glass-panel" style={{ gridArea: 'trends', padding: '24px' }}>
                       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                         <div>
                           <div style={{ fontSize: '0.65rem', letterSpacing: '1px', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px', fontWeight: '700' }}>Weekly Trends</div>
                           <h3 style={{ fontSize: '1.25rem', margin: 0, fontWeight: '700' }}>Stability Timeline</h3>
                         </div>
                         <div style={{ display: 'flex', background: 'var(--bg-input)', borderRadius: '24px', padding: '4px' }}>
                           <button className="tab-pill active">7 Days</button>
                           <button className="tab-pill">30 Days</button>
                         </div>
                       </div>
                       <ResponsiveContainer height={200}>
                          <BarChart data={[
                            { day: 'MON', val: 0.6 }, { day: 'TUE', val: 0.4 }, { day: 'WED', val: 0.5 }, 
                            { day: 'THU', val: 0.65 }, { day: 'FRI', val: 0.3 }, { day: 'SAT', val: 0.55 }, { day: 'SUN', val: 0.8 }
                          ]} barSize={32}>
                             <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} dy={10} />
                             <Tooltip cursor={{ fill: 'rgba(255,255,255,0.02)' }} contentStyle={{ background: 'var(--bg-card)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px' }} />
                             <Bar dataKey="val" radius={[4,4,4,4]}>
                               { [0.6, 0.4, 0.5, 0.65, 0.3, 0.55, 0.8].map((entry, index) => (
                                 <Cell key={`cell-${index}`} fill={index === 6 ? 'var(--accent-blue)' : `rgba(255,255,255,0.08)`} />
                               ))}
                             </Bar>
                          </BarChart>
                       </ResponsiveContainer>
                     </motion.div>

                     {/* Ratio */}
                     <motion.div className="glass-panel" style={{ gridArea: 'ratio', padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                       <div style={{ fontSize: '0.75rem', letterSpacing: '2px', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '12px', alignSelf: 'flex-start', fontWeight: '700' }}>Stability Vs. Drift</div>
                       
                       <div className="ratio-donut-wrap">
                          <ResponsiveContainer width={180} height={180}>
                             <PieChart>
                                <Pie data={[{ name: 'Anchored', value: 86 }, { name: 'Drifting', value: 14 }]} cx="50%" cy="50%" innerRadius={65} outerRadius={85} stroke="none" cornerRadius={10} dataKey="value">
                                   <Cell fill="var(--accent-green)" />
                                   <Cell fill="var(--bg-card)" />
                                </Pie>
                                <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px' }} />
                             </PieChart>
                          </ResponsiveContainer>
                          <div className="ratio-center">
                            <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', letterSpacing: '1px', fontWeight: '700' }}>RATIO</span>
                            <span style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--text-main)', marginTop: '-4px' }}>0.14</span>
                          </div>
                       </div>
                       
                       <div style={{ display: 'flex', gap: '32px', marginTop: '16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '600' }}><div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-green)' }} /> ANCHORED</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '600' }}><div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--bg-card)' }} /> DRIFTING</div>
                       </div>
                     </motion.div>
                  </div>

                   {/* ELITE ANALYTICS CARDS */}
                   {advancedAnalytics && (
                   <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginTop: '24px', marginBottom: '24px' }}>
                       <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column' }}>
                           <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', letterSpacing: '1px', textTransform: 'uppercase', fontWeight: '700', marginBottom: '12px' }}>Emotional Recovery Rate</div>
                           <div style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--accent-green)' }}>{advancedAnalytics.recovery_rate}</div>
                           <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '8px' }}>Bounce-back speed from distress</div>
                       </div>
                       <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column' }}>
                           <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', letterSpacing: '1px', textTransform: 'uppercase', fontWeight: '700', marginBottom: '12px' }}>Most Frequent Trigger</div>
                           <div style={{ fontSize: '1.2rem', fontWeight: '800', color: 'var(--accent-purple)' }}>{advancedAnalytics.frequent_trigger}</div>
                           <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '8px' }}>Based on recent context</div>
                       </div>
                       <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column' }}>
                           <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', letterSpacing: '1px', textTransform: 'uppercase', fontWeight: '700', marginBottom: '12px' }}>Hidden Emotion Score</div>
                           <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#ff4757' }}>{advancedAnalytics.hidden_emotion_score}</div>
                           <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '8px' }}>Subconscious distress markers</div>
                       </div>
                       <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gridColumn: 'span 2' }}>
                           <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', letterSpacing: '1px', textTransform: 'uppercase', fontWeight: '700', marginBottom: '12px' }}>Repeated Topic Cloud</div>
                           <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
                               {advancedAnalytics.topics.map((t, idx) => (
                                   <div key={idx} style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.05)', borderRadius: '16px', fontSize: '0.8rem', color: 'var(--text-main)' }}>{t}</div>
                               ))}
                           </div>
                       </div>
                   </div>
                   )}

                   {/* Horizontal Action Bars */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 1fr) minmax(200px, 1fr) minmax(200px, 1fr)', gap: '16px', marginTop: '0' }}>
                    <button className="glass-panel dash-action-btn" onClick={() => setViewMode('table')}>
                      <div className="dash-action-icon blue"><Activity size={20} color="#fff" /></div>
                      <span>Log Mood</span>
                    </button>
                    <button className="glass-panel dash-action-btn" onClick={() => setViewMode('sentia')}>
                      <div className="dash-action-icon pink"><Activity size={20} color="#fff" /></div>
                      <span>Sentia Session</span>
                    </button>
                    <button className="glass-panel dash-action-btn" onClick={() => setViewMode('vitals')}>
                      <div className="dash-action-icon green"><Activity size={20} color="#fff" /></div>
                      <span>View Vitals</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </>
          ) : (
            <div className="empty-state" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
              <h2 className="serif-heading" style={{ fontSize: '2rem', marginBottom: '1rem' }}>Core Offline</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>Activate the neural bridge to begin real-time emotion analysis.</p>
              <button className="glass-button primary pulse" onClick={() => setMonitoring(true)} style={{ padding: '1rem 3rem' }}>Initialize Connection</button>
            </div>
          )}
        </div>

        {/* Global Modal Layer Removed; chat is now embedded in doctor-chat viewMode */}
        
        <div style={{ position: 'fixed', bottom: '1.5rem', left: '1.5rem', fontSize: '0.75rem', opacity: 0.5, zIndex: 100 }}>
          Protocol v2.4 // NODE: {user.email}
        </div>
      </main>
    </div>
  );
}


// Pages that should NOT show the background (auth + landing pages)
const AUTH_ROUTES = ['/', '/login', '/signup', '/welcome'];

function MainContent() {
  const location = useLocation();
  const isLandingPage = location.pathname === '/';
  const showBackground = !AUTH_ROUTES.includes(location.pathname);

  return (
    <>
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: -1, background: '#0F1117', transition: 'background 0.3s ease' }}>
        {showBackground && <NeuralBackground theme="dark" />}
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
          <Route path="/ps-detail/:id" element={<RequireDoctorAuth><PatientDetailView /></RequireDoctorAuth>} />
          
          {/* Legal Routes */}
          <Route path="/privacy" element={<Suspense fallback={<div className="min-h-screen bg-[#02040A]" />}><PrivacyPolicy /></Suspense>} />
          <Route path="/terms" element={<Suspense fallback={<div className="min-h-screen bg-[#02040A]" />}><TermsOfService /></Suspense>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <GlobalDoctorFloatingButton />
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
  // We trigger a global event which the Dashboard listens to to switch viewMode to 'doctor-chat'
  
  // If we want it truly global, we should move the chat state to a context.
  // But for now, triggering it via a custom event works well for the dashboard.
  
  const handleClick = () => {
    window.dispatchEvent(new CustomEvent('open-doctor-chat'));
  };

  return <DoctorFloatingButton onClick={handleClick} />;
}
