import { useEffect, useState, useCallback, useRef, useContext } from "react";
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
import { motion } from "framer-motion";
import SupportDashboard from "./components/SupportDashboard";
import { Download, Table as TableIcon, Activity, LogOut, MessageSquare, Sun, Moon, Shield } from 'lucide-react';

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
  getFusionAnalytics
} from "./api";
import logo from './assets/logo.jpg';
import robotMascot from './assets/robot_mascot.png';
import logoFull from './assets/logo_full.jpg';
import logoFinal from './assets/logo_final.png';

import "./App.css";
import Background3D from "./components/Background3D";
import DriftGraph from "./components/DriftGraph";
import LogTable from "./components/LogTable";
import TransitionArrows from "./components/TransitionArrows";
import Login from "./components/Login";
import Signup from "./components/Signup";
import ChatAnalyzer from "./components/ChatAnalyzer";
import SelfEmotionMonitor from "./components/SelfEmotionMonitor";
import LandingPage from "./components/LandingPage";
import AuthContext, { AuthProvider } from "./context/AuthContext";
import { ThemeProvider, useTheme } from "./context/ThemeContext";

const emotionColors = {
  happy: "#e1ff5e",
  fear: "#9C27B0",
  sadness: "#2196F3",
  anger: "#F44336",
  surprise: "#FFC107",
  neutral: "#777",
  love: "#FF69B4"
};

const severityText = (s = 0) =>
  s >= 0.6
    ? ["🔴 High Drift", "Major emotional change detected"]
    : s >= 0.3
      ? ["🟠 Moderate Drift", "Noticeable emotional variation"]
      : ["🟢 Stable", "Emotion pattern consistent"];



function RequireAuth({ children }) {
  const { user, loading } = useContext(AuthContext);
  const location = useLocation();

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen text-white">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

function Dashboard() {
  const { user, logout } = useContext(AuthContext);
  const { theme, toggleTheme } = useTheme();

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
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [monitoring, setMonitoring] = useState(true);
  const [viewMode, setViewMode] = useState('dashboard'); // 'dashboard', 'table', 'chat'

  const dashboardRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const [t, d, dr, a, c, sh, sd, f] = await Promise.all([
        getTimeline(range),
        getDistribution(),
        getDrift(),
        getAlerts(),
        getComparison(range),
        getSelfEmotionHistory(range),
        getSelfEmotionDistribution(range),
        getFusionAnalytics(range === '1h' ? 0 : range === '24h' ? 1 : 7)
      ]);

      setTimeline(t.data);
      setDistribution(d.data);
      setDrift(dr.data);
      setAlerts(a.data);
      setComparison(c.data);
      setSelfHistory(sh.data);
      setSelfDistribution(sd.data);
      setFusion(f.data);
    } catch (e) {
      console.error("API error", e);
    }
  }, [range]);

  useEffect(() => {
    load();
  }, [load]);

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

  const timelineData =
    timeline?.timestamps?.map((t, i) => ({
      time: new Date(t).toLocaleTimeString(),
      confidence: timeline.confidences[i],
      emotion: timeline.emotions[i],
      source: timeline.sources ? timeline.sources[i] : "text"
    })) || [];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div style={{ background: '#333', padding: '10px', borderRadius: '5px', border: '1px solid #555' }}>
          <p style={{ margin: 0, fontWeight: 'bold', color: '#fff' }}>{label}</p>
          <p style={{ margin: '5px 0', color: emotionColors[data.emotion] || '#fff' }}>
            {data.emotion.toUpperCase()}
          </p>
          <p style={{ margin: 0, fontSize: '0.8em', color: '#ccc' }}>
            Confidence: {(data.confidence * 100).toFixed(1)}%
          </p>
          <p style={{ margin: 0, fontSize: '0.8em', color: data.source === 'face' ? '#007bff' : '#e1ff5e' }}>
            Source: {data.source === 'face' ? '📷 Face' : '💬 Chat'}
          </p>
        </div>
      );
    }
    return null;
  };

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

  return (
    <div className="dashboard" ref={dashboardRef}>
      <header className="header glass-panel">
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ position: 'relative', height: '245px', display: 'flex', alignItems: 'center' }}>
            {/* Spacer to establish width */}
            <img src={logoFinal} alt="" style={{ height: '245px', opacity: 0 }} />

            {/* Top Layer: Robot (Original Colors) - Shows top 73% */}
            <img
              src={logoFinal}
              alt="Sentia Robot"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                height: '100%',
                clipPath: 'inset(0 0 27% 0)',
                zIndex: 2
              }}
            />

            {/* Bottom Layer: Text (White in Dark Mode) - Shows bottom 27% */}
            <img
              src={logoFinal}
              alt="Sentia Text"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                height: '100%',
                clipPath: 'inset(73% 0 0 0)',
                filter: theme === 'dark' ? 'brightness(0) invert(1)' : 'brightness(0)',
                transition: 'filter 0.3s ease',
                zIndex: 1
              }}
            />
          </div>
        </div>

        {/* Center spacer if needed or just let space-between handle it */}
        <div style={{ flex: 1 }}></div>

        <div className="header-actions">
          <button
            className="icon-btn"
            onClick={() => window.location.href = '/support-dashboard'}
            title="Support & Safety"
            style={{ color: '#4caf50', border: '1px solid #4caf50' }}
          >
            <Shield size={20} />
          </button>
          {/* Chat Analysis Toggle */}
          <button
            className="icon-btn"
            onClick={() => setViewMode('chat')}
            title="Chat Analysis"
            disabled={!monitoring}
            style={viewMode === 'chat' ? { color: '#e1ff5e', border: '1px solid #e1ff5e' } : {}}
          >
            <MessageSquare size={20} />
          </button>

          <button className="icon-btn" disabled={!monitoring} onClick={() => setViewMode(viewMode === 'dashboard' ? 'table' : 'dashboard')} title="Toggle Dashboard/Table">
            {viewMode === 'table' ? <Activity /> : <TableIcon />}
          </button>

          <button className="icon-btn" disabled={!monitoring} onClick={handleExportPDF} title="Export PDF">
            <Download />
          </button>

          <button className="icon-btn" onClick={logout} title="Logout">
            <LogOut />
          </button>

          <button
            className={`monitor-toggle ${monitoring ? "on" : "off"}`}
            onClick={() => setMonitoring(!monitoring)}
            style={monitoring ? { background: '#e1ff5e', color: 'black' } : {}}
          >
            {monitoring ? "ON" : "OFF"}
          </button>


          <button
            className="icon-btn"
            onClick={toggleTheme}
            title={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
            style={{ color: theme === 'light' ? '#333' : 'white' }}
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>

          <div className="bell" onClick={() => setShowAlerts(!showAlerts)}>
            🔔{alerts.length > 0 && <span className="dot" />}
          </div>
        </div>
      </header>

      {/* View Switcher Content */}
      <div className={!monitoring ? "frozen" : ""}>
        {viewMode === 'chat' ? (
          <div style={{ marginTop: '2rem' }}>
            <button className="text-btn" onClick={() => setViewMode('dashboard')} style={{ marginBottom: '1rem', color: '#e1ff5e', background: 'none', border: 'none', cursor: 'pointer' }}>
              &larr; Back to Dashboard
            </button>
            <ChatAnalyzer />
          </div>
        ) : (
          <>
            {showAlerts && (
              <div className="alert-popup glass-panel">
                {alerts.length === 0 ? (
                  <div className="alert-empty">No drift alerts</div>
                ) : (
                  alerts.slice(0, 5).map((a, i) => {
                    const [t, d] = severityText(a.severity);
                    return (
                      <div key={i} className="alert-item">
                        <strong>{t}</strong>
                        <small>{d}</small>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* Self Emotion Monitor (Webcam) */}
            <div style={{ marginBottom: '20px' }}>
              <SelfEmotionMonitor />
            </div>

            <div className="input-card glass-panel" style={{ padding: '2rem' }}>
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={monitoring ? `How are you feeling, ${user.email.split('@')[0]}?` : "Monitoring paused"}
                disabled={!monitoring}
                style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)', padding: '1rem', borderRadius: '8px', color: 'var(--text-main)', width: '70%' }}
              />
              <button onClick={submit} disabled={loading || !monitoring} style={{ marginLeft: '1rem', padding: '1rem 2rem', background: 'var(--accent-color)', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', color: 'var(--accent-text)' }}>
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
                <div className="card">
                  <h2>Drift Analysis</h2>
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
                </div>

                <div className="card">
                  <h2>Emotion Distribution</h2>
                  <ResponsiveContainer height={260}>
                    <BarChart data={distData}>
                      <XAxis dataKey="emotion" stroke="#aaa" />
                      <YAxis stroke="#aaa" />
                      <Tooltip contentStyle={{ background: '#333', border: 'none' }} />
                      <Bar dataKey="count">
                        {distData.map((d, i) => (
                          <Cell key={i} fill={emotionColors[d.emotion] || '#888'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {viewMode === 'dashboard' && (
              <>
                <motion.div className="card full" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                  <h2>Timeline</h2>
                  <ResponsiveContainer height={300}>
                    <LineChart data={timelineData}>
                      <CartesianGrid stroke="rgba(255,255,255,0.1)" />
                      <XAxis dataKey="time" stroke="#aaa" />
                      <YAxis domain={[0, 1]} stroke="#aaa" />
                      <Tooltip content={<CustomTooltip />} />
                      <Line type="monotone" dataKey="confidence" stroke="#e1ff5e" strokeWidth={3} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </motion.div>

                <motion.div className="card full" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                  <h2>Historical Comparison</h2>
                  {comparison?.meta?.current_count === 0 ? (
                    <p className="empty">Not enough data</p>
                  ) : (
                    <ResponsiveContainer height={300}>
                      <BarChart data={comparisonData}>
                        <XAxis dataKey="emotion" stroke="#aaa" />
                        <YAxis domain={[0, 1]} stroke="#aaa" />
                        <Tooltip contentStyle={{ background: '#333', border: 'none' }} />
                        <Bar dataKey="previous" fill="#555" name="Previous Period" />
                        <Bar dataKey="current" fill="#e1ff5e" name="Current Period" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </motion.div>

                <motion.div className="card full" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                  <h2>Face Emotion Trend</h2>
                  <ResponsiveContainer height={300}>
                    <LineChart data={selfHistoryData}>
                      <CartesianGrid stroke="rgba(255,255,255,0.1)" />
                      <XAxis dataKey="time" stroke="#aaa" hide />
                      <YAxis domain={[0, 1]} stroke="#aaa" />
                      <Tooltip content={<CustomTooltip />} />
                      <Line type="monotone" dataKey="confidence" stroke="#007bff" strokeWidth={3} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </motion.div>

                <motion.div className="card full" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                  <h2>Face Emotion Distribution</h2>
                  <ResponsiveContainer height={260}>
                    <BarChart data={selfDistData}>
                      <XAxis dataKey="emotion" stroke="#aaa" />
                      <YAxis stroke="#aaa" tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
                      <Tooltip contentStyle={{ background: '#333', border: 'none' }} formatter={(v) => `${(v * 100).toFixed(1)}%`} />
                      <Bar dataKey="count">
                        {selfDistData.map((d, i) => (
                          <Cell key={i} fill={emotionColors[d.emotion] || '#888'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </motion.div>


                <motion.div className="card full" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                  <h2>Fusion Insights</h2>
                  {fusion ? (
                    <div className="fusion-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', textAlign: 'center' }}>
                      <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                        <h3>Alignment Score</h3>
                        <div style={{ fontSize: '2rem', fontWeight: 'bold', color: fusion.alignment_score > 0.7 ? '#e1ff5e' : '#f44336' }}>
                          {(fusion.alignment_score * 100).toFixed(0)}%
                        </div>
                        <p style={{ fontSize: '0.8rem', opacity: 0.7 }}>Face vs Text Consistency</p>
                      </div>
                      <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                        <h3>Stability Index</h3>
                        <div style={{ fontSize: '2rem', fontWeight: 'bold', color: fusion.stability_score > 0.7 ? '#e1ff5e' : '#ffc107' }}>
                          {(fusion.stability_score * 100).toFixed(0)}%
                        </div>
                        <p style={{ fontSize: '0.8rem', opacity: 0.7 }}>Emotional Volatility</p>
                      </div>
                      <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                        <h3>Masking Alert</h3>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: fusion.masking_detected ? '#f44336' : '#4caf50' }}>
                          {fusion.masking_detected ? "DETECTED" : "None"}
                        </div>
                        {fusion.masking_detected && <p style={{ fontSize: '0.8rem', color: '#f44336' }}>Possible emotional suppression</p>}
                      </div>
                    </div>
                  ) : (
                    <p className="empty">Loading insights...</p>
                  )}
                </motion.div>
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
    </div >
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Background3D />
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route
              path="/support-dashboard"
              element={
                <RequireAuth>
                  <SupportDashboard />
                </RequireAuth>
              }
            />
            <Route
              path="/dashboard"
              element={
                <RequireAuth>
                  <Dashboard />
                </RequireAuth>
              }
            />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
