import React, { useState, useEffect } from "react";
import { getCognitiveLatest, getCognitiveHistory, triggerCognitiveAnalysis, submitCBTReflection, getCBTReflections } from "../api";

const S = {
  page: { maxWidth: 1200, margin: "0 auto", padding: "1rem", color: "var(--text-main)", fontFamily: "var(--font-body, inherit)" },
  hero: { background: "var(--bg-card)", border: "1px solid var(--glass-border)", borderRadius: 24, padding: "2rem", marginBottom: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap" },
  badge: (color) => ({ padding: "4px 10px", borderRadius: 20, fontSize: "0.7rem", fontWeight: 700, letterSpacing: 1, background: `${color}20`, color, border: `1px solid ${color}40`, marginRight: 8 }),
  h1: { fontSize: "2rem", fontWeight: 900, margin: "0.5rem 0", color: "var(--text-main)" },
  sub: { color: "var(--text-secondary)", fontSize: "0.9rem", maxWidth: 560, lineHeight: 1.6 },
  btn: (primary) => ({ padding: "10px 20px", borderRadius: 12, fontWeight: 700, fontSize: "0.85rem", cursor: "pointer", border: primary ? "none" : "1px solid var(--glass-border)", background: primary ? "var(--accent-purple)" : "transparent", color: primary ? "#fff" : "var(--text-secondary)", transition: "all 0.2s" }),
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginBottom: "1.5rem" },
  grid3: { display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1.5rem", marginBottom: "1.5rem" },
  card: { background: "var(--bg-card)", border: "1px solid var(--glass-border)", borderRadius: 20, padding: "1.5rem" },
  cardTitle: { fontSize: "0.95rem", fontWeight: 700, color: "var(--text-secondary)", marginBottom: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center" },
  label: { fontSize: "0.7rem", fontWeight: 700, letterSpacing: 1.5, color: "var(--text-secondary)", textTransform: "uppercase" },
  tag: (color) => ({ padding: "3px 8px", borderRadius: 8, fontSize: "0.7rem", fontWeight: 600, background: `${color}20`, color, border: `1px solid ${color}30`, margin: "2px" }),
  bar: (pct, color) => ({ height: 6, borderRadius: 3, background: color, width: `${Math.min(100, pct * 100)}%`, transition: "width 0.5s ease" }),
  barTrack: { height: 6, borderRadius: 3, background: "rgba(255,255,255,0.06)", marginBottom: "0.75rem", overflow: "hidden" },
  signal: { display: "flex", justifyContent: "space-between", padding: "8px 10px", borderRadius: 10, background: "rgba(255,255,255,0.03)", marginBottom: 6, fontSize: "0.8rem" },
  textarea: { width: "100%", boxSizing: "border-box", padding: "0.8rem 1rem", borderRadius: 12, border: "1px solid var(--glass-border)", background: "rgba(255,255,255,0.03)", color: "var(--text-main)", fontSize: "0.9rem", minHeight: 90, resize: "vertical", fontFamily: "inherit" },
  select: { width: "100%", padding: "0.7rem 1rem", borderRadius: 10, border: "1px solid var(--glass-border)", background: "var(--bg-card)", color: "var(--text-main)", fontSize: "0.85rem" },
};

const COLOR = { rose: "#f43f5e", violet: "#a084e8", emerald: "#34d399", amber: "#f59e0b", sky: "#38bdf8", pink: "#f472b6" };

function GaugeBar({ label, value, confidence, invert, breakdown }) {
  const pct = Math.min(1, Math.max(0, value));
  const col = invert
    ? (pct > 0.6 ? COLOR.rose : pct > 0.4 ? COLOR.amber : COLOR.emerald)
    : (pct > 0.6 ? COLOR.emerald : pct > 0.4 ? COLOR.amber : COLOR.rose);
  return (
    <div style={{ marginBottom: "0.9rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={S.label}>
          {label} {confidence !== undefined && <span style={{ textTransform: "none", color: "var(--text-secondary)", fontWeight: 400, opacity: 0.7 }}>(Conf: {Math.round(confidence * 100)}%)</span>}
        </span>
        <span style={{ fontSize: "0.8rem", fontWeight: 700, color: col }}>{Math.round(pct * 100)}%</span>
      </div>
      <div style={S.barTrack}><div style={S.bar(pct, col)} /></div>
      {breakdown && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 4 }}>
          <div style={{ display: "flex", gap: 12, fontSize: "0.7rem", color: "var(--text-secondary)" }}>
            <span>🔑 Key: {Math.round(breakdown.keyword * 100)}%</span>
            <span>🤖 Sem: {Math.round(breakdown.semantic * 100)}%</span>
          </div>
          {breakdown.evidence && breakdown.evidence.length > 0 && (
            <div style={{ fontSize: "0.65rem", color: "var(--text-secondary)", background: "rgba(255,255,255,0.01)", padding: "4px 8px", borderRadius: 6, border: "1px dashed rgba(255,255,255,0.05)" }}>
              <div style={{ fontWeight: 600, color: "var(--accent-purple)", marginBottom: 2 }}>🔍 Clinical Evidence:</div>
              <ul style={{ margin: 0, paddingLeft: 12, listStyleType: "disc" }}>
                {breakdown.evidence.map((ev, idx) => (
                  <li key={idx} style={{ marginBottom: 2 }}>{ev}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function RadarSVG({ perf, avoid, rumin }) {
  const cx = 100, cy = 100, r = 75;
  const pt = (val, deg) => {
    const d = Math.max(0.12, Math.min(1, val)) * r;
    const a = (deg - 90) * Math.PI / 180;
    return [cx + d * Math.cos(a), cy + d * Math.sin(a)];
  };
  const grid = (s, deg) => { const d = s * r; const a = (deg - 90) * Math.PI / 180; return [cx + d * Math.cos(a), cy + d * Math.sin(a)]; };
  const mkPoly = (s) => [0, 120, 240].map(d => grid(s, d).join(",")).join(" ");
  const [x1, y1] = pt(perf, 0);
  const [x2, y2] = pt(avoid, 120);
  const [x3, y3] = pt(rumin, 240);

  return (
    <div style={{ position: "relative", width: 200, height: 200, margin: "0 auto" }}>
      <svg width={200} height={200} style={{ overflow: "visible" }}>
        {[1, 0.75, 0.5, 0.25].map((s, i) => (
          <polygon key={i} points={mkPoly(s)} fill="none" stroke={i === 0 ? "#334155" : "#1e293b"} strokeWidth={1} strokeDasharray={i > 0 ? "3,3" : undefined} />
        ))}
        {[0, 120, 240].map((d, i) => {
          const [gx, gy] = grid(1, d);
          return <line key={i} x1={cx} y1={cy} x2={gx} y2={gy} stroke="#334155" strokeWidth={1} />;
        })}
        <polygon points={`${x1},${y1} ${x2},${y2} ${x3},${y3}`} fill="rgba(160,132,232,0.2)" stroke="#a084e8" strokeWidth={2} />
        {[[x1,y1],[x2,y2],[x3,y3]].map(([px,py], i) => <circle key={i} cx={px} cy={py} r={4} fill="#c084fc" />)}
      </svg>
      <div style={{ position: "absolute", top: -18, left: "50%", transform: "translateX(-50%)", textAlign: "center" }}>
        <div style={S.label}>Perfectionism</div>
        <div style={{ color: COLOR.violet, fontWeight: 800, fontSize: "0.85rem" }}>{Math.round(perf * 100)}%</div>
      </div>
      <div style={{ position: "absolute", bottom: -18, left: -30, textAlign: "left" }}>
        <div style={S.label}>Avoidance</div>
        <div style={{ color: COLOR.violet, fontWeight: 800, fontSize: "0.85rem" }}>{Math.round(avoid * 100)}%</div>
      </div>
      <div style={{ position: "absolute", bottom: -18, right: -30, textAlign: "right" }}>
        <div style={S.label}>Rumination</div>
        <div style={{ color: COLOR.violet, fontWeight: 800, fontSize: "0.85rem" }}>{Math.round(rumin * 100)}%</div>
      </div>
    </div>
  );
}

const CBT_STEPS = [
  { key: "what_happened", label: "1. Activating Event", hint: "What objective situation triggered the distress?" },
  { key: "what_thought", label: "2. Automatic Belief", hint: "What immediate thoughts or internal narratives arose?" },
  { key: "what_felt", label: "3. Emotional Reaction", hint: "What emotions and physical sensations did you feel?" },
  { key: "what_done", label: "4. Behavioral Response", hint: "What action did you take? (e.g. withdrew, avoided)" },
  { key: "what_next", label: "5. Cognitive Restructuring", hint: "How can you reframe this? What would a compassionate observer say?" },
];

export default function CognitiveModel() {
  const [profile, setProfile] = useState(null);
  const [history, setHistory] = useState([]);
  const [reflections, setReflections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ what_happened: "", what_thought: "", what_felt: "", what_done: "", what_next: "", thought_intensity: 5, emotion_intensity: 5, associated_pattern: "rumination" });
  const [cbtMsg, setCbtMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [a, b, c] = await Promise.all([getCognitiveLatest(), getCognitiveHistory(), getCBTReflections()]);
      setProfile(a.data); setHistory(b.data); setReflections(c.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const recalc = async () => {
    setAnalyzing(true);
    try { await triggerCognitiveAnalysis(); await load(); } catch (e) { console.error(e); }
    setAnalyzing(false);
  };

  const submitCBT = async (e) => {
    e.preventDefault(); setSubmitting(true); setCbtMsg("");
    try {
      await submitCBTReflection(form);
      setCbtMsg("✓ Reflection logged to your cognitive archive.");
      setForm({ what_happened: "", what_thought: "", what_felt: "", what_done: "", what_next: "", thought_intensity: 5, emotion_intensity: 5, associated_pattern: "rumination" });
      setStep(0);
      const r = await getCBTReflections(); setReflections(r.data);
    } catch (e) { setCbtMsg("Error saving reflection. Please try again."); }
    setSubmitting(false);
  };

  if (loading) return (
    <div style={{ textAlign: "center", padding: "4rem", color: "var(--text-secondary)" }}>
      <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>🧠</div>
      <p style={{ fontWeight: 700, letterSpacing: 2 }}>LOADING COGNITIVE SNAPSHOTS...</p>
    </div>
  );

  const t = profile?.traits || {};
  const st = profile?.states || {};
  const attMap = profile?.attention_map?.distribution || {};
  const attDrift = profile?.attention_map?.drift || {};
  const rec = profile?.recovery || {};
  const sig = profile?.signals || {};
  const notes = profile?.notes || "Chat with Sentia to generate your first cognitive analysis.";
  const attColors = { academics: COLOR.rose, career: COLOR.violet, health: COLOR.emerald, relationships: COLOR.pink, identity: COLOR.sky, family: COLOR.amber };
  const attTotal = Object.values(attMap).reduce((s, v) => s + v, 0) || 1;

  return (
    <div style={S.page}>
      {/* Hero */}
      <div style={S.hero}>
        <div>
          <div>
            <span style={S.badge(COLOR.violet)}>COGNITIVE SNAPSHOTS</span>
            <span style={S.badge(COLOR.emerald)}>EXPLAINABLE SCORING</span>
            <span style={S.badge(COLOR.sky)}>CBT MATRIX v3.0</span>
          </div>
          <h1 style={S.h1}>Personal Cognitive Model</h1>
          <p style={S.sub}>Longitudinal cognitive snapshots mapped from real-time communication behaviors and clinical reframing tasks.</p>
          {profile?.messages_analyzed !== undefined && (
            <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: 8, display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: COLOR.emerald }} />
              <strong>Observation Window:</strong> {profile.messages_analyzed} messages analyzed over {profile.days_covered} days
            </div>
          )}
        </div>
        <button style={S.btn(true)} onClick={recalc} disabled={analyzing}>
          {analyzing ? "⟳ Recalculating..." : "⟳ Update Snapshot"}
        </button>
      </div>

      {/* Narrative */}
      <div style={{ ...S.card, marginBottom: "1.5rem", borderLeft: "3px solid var(--accent-purple)" }}>
        <div style={S.cardTitle}><span>🔬 Clinical Case Formulation</span><span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Dynamic summary generated from pre-calculated metrics</span></div>
        <p style={{ color: "var(--text-main)", fontStyle: "italic", lineHeight: 1.7, margin: 0, padding: "1rem", background: "rgba(255,255,255,0.02)", borderRadius: 12, border: "1px solid var(--glass-border)" }}>"{notes}"</p>
      </div>

      {/* Traits + States */}
      <div style={S.grid2}>
        <div style={S.card}>
          <div style={S.cardTitle}><span>Psychological Traits</span><span style={S.badge(COLOR.violet)}>Slow-Changing Baseline</span></div>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "2rem", marginTop: "1rem" }}>
            <RadarSVG perf={t.perfectionism || 0} avoid={t.avoidance || 0} rumin={t.rumination || 0} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginTop: "1.5rem" }}>
            {/* Perfectionism */}
            <div style={{ padding: "8px 12px", background: "rgba(255,255,255,0.02)", border: "1px solid var(--glass-border)", borderRadius: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", marginBottom: 4 }}>
                <span style={{ color: "var(--text-main)", fontWeight: 600 }}>Perfectionism Tendency</span>
                <span style={{ fontWeight: 700, color: COLOR.violet }}>{Math.round((t.perfectionism || 0) * 100)}%</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", color: "var(--text-secondary)" }}>
                <span>Conf: {Math.round((t.perfectionism_confidence || 0) * 100)}%</span>
                {profile?.signal_source_breakdown?.perfectionism && (
                  <span style={{ opacity: 0.8 }}>
                    🔑 Key: {Math.round(profile.signal_source_breakdown.perfectionism.keyword * 100)}% | 
                    🤖 Sem: {Math.round(profile.signal_source_breakdown.perfectionism.semantic * 100)}%
                  </span>
                )}
              </div>
              {profile?.signal_source_breakdown?.perfectionism?.evidence && profile.signal_source_breakdown.perfectionism.evidence.length > 0 && (
                <div style={{ marginTop: "6px", paddingTop: "4px", borderTop: "1px dashed rgba(255,255,255,0.05)", fontSize: "0.65rem", color: "var(--text-secondary)" }}>
                  <div style={{ fontWeight: 600, color: "var(--accent-purple)", marginBottom: 2 }}>🔍 Clinical Evidence:</div>
                  <ul style={{ margin: 0, paddingLeft: "12px", listStyleType: "disc" }}>
                    {profile.signal_source_breakdown.perfectionism.evidence.map((ev, idx) => (
                      <li key={idx} style={{ marginBottom: 2 }}>{ev}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Avoidance */}
            <div style={{ padding: "8px 12px", background: "rgba(255,255,255,0.02)", border: "1px solid var(--glass-border)", borderRadius: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", marginBottom: 4 }}>
                <span style={{ color: "var(--text-main)", fontWeight: 600 }}>Avoidance Tendency</span>
                <span style={{ fontWeight: 700, color: COLOR.violet }}>{Math.round((t.avoidance || 0) * 100)}%</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", color: "var(--text-secondary)" }}>
                <span>Conf: {Math.round((t.avoidance_confidence || 0) * 100)}%</span>
                {profile?.signal_source_breakdown?.avoidance && (
                  <span style={{ opacity: 0.8 }}>
                    🔑 Key: {Math.round(profile.signal_source_breakdown.avoidance.keyword * 100)}% | 
                    🤖 Sem: {Math.round(profile.signal_source_breakdown.avoidance.semantic * 100)}%
                  </span>
                )}
              </div>
              {profile?.signal_source_breakdown?.avoidance?.evidence && profile.signal_source_breakdown.avoidance.evidence.length > 0 && (
                <div style={{ marginTop: "6px", paddingTop: "4px", borderTop: "1px dashed rgba(255,255,255,0.05)", fontSize: "0.65rem", color: "var(--text-secondary)" }}>
                  <div style={{ fontWeight: 600, color: "var(--accent-purple)", marginBottom: 2 }}>🔍 Clinical Evidence:</div>
                  <ul style={{ margin: 0, paddingLeft: "12px", listStyleType: "disc" }}>
                    {profile.signal_source_breakdown.avoidance.evidence.map((ev, idx) => (
                      <li key={idx} style={{ marginBottom: 2 }}>{ev}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Rumination */}
            <div style={{ padding: "8px 12px", background: "rgba(255,255,255,0.02)", border: "1px solid var(--glass-border)", borderRadius: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", marginBottom: 4 }}>
                <span style={{ color: "var(--text-main)", fontWeight: 600 }}>Rumination Tendency</span>
                <span style={{ fontWeight: 700, color: COLOR.violet }}>{Math.round((t.rumination || 0) * 100)}%</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", color: "var(--text-secondary)" }}>
                <span>Conf: {Math.round((t.rumination_confidence || 0) * 100)}%</span>
                {profile?.signal_source_breakdown?.rumination && (
                  <span style={{ opacity: 0.8 }}>
                    🔑 Key: {Math.round(profile.signal_source_breakdown.rumination.keyword * 100)}% | 
                    🤖 Sem: {Math.round(profile.signal_source_breakdown.rumination.semantic * 100)}%
                  </span>
                )}
              </div>
              {profile?.signal_source_breakdown?.rumination?.evidence && profile.signal_source_breakdown.rumination.evidence.length > 0 && (
                <div style={{ marginTop: "6px", paddingTop: "4px", borderTop: "1px dashed rgba(255,255,255,0.05)", fontSize: "0.65rem", color: "var(--text-secondary)" }}>
                  <div style={{ fontWeight: 600, color: "var(--accent-purple)", marginBottom: 2 }}>🔍 Clinical Evidence:</div>
                  <ul style={{ margin: 0, paddingLeft: "12px", listStyleType: "disc" }}>
                    {profile.signal_source_breakdown.rumination.evidence.map((ev, idx) => (
                      <li key={idx} style={{ marginBottom: 2 }}>{ev}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
        <div style={S.card}>
          <div style={S.cardTitle}><span>Psychological States</span><span style={S.badge(COLOR.emerald)}>Fast-Changing Indicators</span></div>
          <GaugeBar label="Burnout Risk" value={st.burnout || 0} confidence={st.burnout_confidence} invert={true} breakdown={profile?.signal_source_breakdown?.burnout} />
          <GaugeBar label="Motivation Level" value={st.motivation || 0} confidence={st.motivation_confidence} invert={false} breakdown={profile?.signal_source_breakdown?.motivation} />
          <GaugeBar label="Stress Adaptation" value={st.stress_adaptation || 0} confidence={st.stress_adaptation_confidence} invert={false} breakdown={profile?.signal_source_breakdown?.stress_adaptation} />
          <GaugeBar label="Cognitive Flexibility" value={st.cognitive_flexibility || 0} confidence={st.cognitive_flexibility_confidence} invert={false} breakdown={profile?.signal_source_breakdown?.cognitive_flexibility} />
        </div>
      </div>

      {/* Attention Map + Recovery Effectiveness */}
      <div style={S.grid3}>
        <div style={S.card}>
          <div style={S.cardTitle}><span>Cognitive Attention Map</span><span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Where mental effort is focused</span></div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem", marginBottom: "1rem" }}>
            {Object.entries(attMap).map(([k, v]) => {
              const driftData = attDrift[k] || 0;
              const driftVal = (typeof driftData === 'object') ? (driftData.change || 0) : (driftData || 0);
              const zScore = (typeof driftData === 'object') ? (driftData.z_score || 0) : 0;
              
              const driftColor = driftVal > 0 ? COLOR.emerald : driftVal < 0 ? COLOR.rose : "var(--text-secondary)";
              const isZSignificant = Math.abs(zScore) >= 1.5;
              
              return (
                <div key={k} style={{ background: `${attColors[k]}15`, border: `1px solid ${attColors[k]}30`, borderRadius: 14, padding: "0.75rem", textAlign: "center", position: "relative" }}>
                  <div style={{ ...S.label, marginBottom: 4 }}>{k}</div>
                  <div style={{ color: attColors[k], fontWeight: 900, fontSize: "1.3rem" }}>{Math.round((v / attTotal) * 100)}%</div>
                  {driftVal !== 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "2px", marginTop: 4 }}>
                      <span style={{ fontSize: "0.7rem", fontWeight: 700, color: driftColor }}>
                        {driftVal > 0 ? `+${Math.round(driftVal * 100)}%` : `${Math.round(driftVal * 100)}%`} drift
                      </span>
                      {zScore !== 0 && (
                        <span style={{ 
                          fontSize: "0.65rem", 
                          fontWeight: isZSignificant ? 800 : 500, 
                          color: isZSignificant ? (driftVal > 0 ? COLOR.emerald : COLOR.rose) : "var(--text-secondary)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "2px"
                        }}>
                          {isZSignificant && <span>⚠️</span>}
                          <span>Z: {zScore > 0 ? `+${zScore}` : zScore}</span>
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div style={{ display: "flex", height: 8, borderRadius: 4, overflow: "hidden" }}>
            {Object.entries(attMap).map(([k, v]) => (
              <div key={k} style={{ background: attColors[k], width: `${(v / attTotal) * 100}%`, transition: "width 0.5s" }} title={`${k}: ${Math.round((v / attTotal) * 100)}%`} />
            ))}
          </div>
        </div>
        <div style={S.card}>
          <div style={S.cardTitle}><span>Coping & Recovery Memory</span><span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>What works best</span></div>
          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
            <div style={{ flex: 1, background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: "0.6rem", textAlign: "center" }}>
              <div style={S.label}>Trigger</div>
              <div style={{ color: COLOR.violet, fontWeight: 700, fontSize: "0.85rem", marginTop: 2, textTransform: "capitalize" }}>{rec.stress_trigger || "general stress"}</div>
            </div>
            <div style={{ flex: 1, background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: "0.6rem", textAlign: "center" }}>
              <div style={S.label}>Recovery Speed</div>
              <div style={{ color: COLOR.emerald, fontWeight: 700, fontSize: "0.85rem", marginTop: 2, textTransform: "capitalize" }}>{rec.recovery_speed || "medium"}</div>
            </div>
          </div>
          <div style={{ ...S.label, marginBottom: 6 }}>Coping Strategy Effectiveness</div>
          <div style={{ maxHeight: 180, overflowY: "auto", paddingRight: 4 }}>
            {Object.entries(rec.recovery_effectiveness || {})
              .sort((a, b) => b[1] - a[1])
              .map(([activity, score]) => (
                <div key={activity} style={{ marginBottom: "0.6rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", marginBottom: 2 }}>
                    <span style={{ textTransform: "capitalize", fontWeight: 600 }}>{activity}</span>
                    <span style={{ color: score > 0.5 ? COLOR.emerald : COLOR.rose, fontWeight: 700 }}>{Math.round(score * 100)}% eff.</span>
                  </div>
                  <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${score * 100}%`, background: score > 0.5 ? COLOR.emerald : COLOR.rose }} />
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Audit Signals */}
      <div style={{ ...S.card, marginBottom: "1.5rem" }}>
        <div style={S.cardTitle}><span>Scientific Audit Trail</span><span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Behavioral signal counts — the inputs to every score</span></div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "0.5rem" }}>
          {[
            ["Catastrophic phrases", sig.catastrophic_phrases, COLOR.rose],
            ["Negative repetition", sig.negative_repetition, COLOR.amber],
            ["Self-critical phrases", sig.self_critical_phrases, COLOR.rose],
            ["Avoidance phrases", sig.avoidance_phrases, COLOR.sky],
            ["Social withdrawal", sig.social_mentions, COLOR.pink],
            ["Coping mentions", sig.coping_mentions, COLOR.emerald],
          ].map(([label, val, col]) => (
            <div key={label} style={S.signal}>
              <span style={{ color: "var(--text-secondary)" }}>{label}</span>
              <span style={{ fontWeight: 800, fontFamily: "monospace", color: col }}>{val ?? 0}</span>
            </div>
          ))}
        </div>
      </div>

      {/* History Sparkline */}
      {history.length > 1 && (
        <div style={{ ...S.card, marginBottom: "1.5rem" }}>
          <div style={S.cardTitle}><span>Longitudinal Trends (Temporal Drift)</span></div>
          <div style={{ position: "relative", height: 100, background: "rgba(255,255,255,0.02)", borderRadius: 12, overflow: "hidden" }}>
            <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} preserveAspectRatio="none">
              {[
                { key: "rumination", trait: true, col: COLOR.rose },
                { key: "perfectionism", trait: true, col: COLOR.violet },
                { key: "cognitive_flexibility", trait: false, col: COLOR.sky },
                { key: "burnout", trait: false, col: COLOR.amber },
              ].map(({ key, trait, col }) => (
                <polyline key={key} fill="none" stroke={col} strokeWidth="2"
                  points={history.map((h, i) => {
                    const v = trait ? h.traits?.[key] : h.states?.[key];
                    const x = (i / (history.length - 1)) * 100;
                    const y = (1 - (v || 0)) * 80 + 10;
                    return `${x}%,${y}%`;
                  }).join(" ")} />
              ))}
            </svg>
            <div style={{ position: "absolute", top: 8, right: 12, display: "flex", gap: 12 }}>
              {[["Rumination", COLOR.rose], ["Perfectionism", COLOR.violet], ["Cognitive Flexibility", COLOR.sky], ["Burnout", COLOR.amber]].map(([l, c]) => (
                <span key={l} style={{ fontSize: "0.7rem", fontWeight: 700, color: c, display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: c, display: "inline-block" }} />{l}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* CBT Section */}
      <div style={S.grid2}>
        {/* Archive */}
        <div style={S.card}>
          <div style={S.cardTitle}><span>📓 CBT Restructuring Archive</span><span style={{ fontSize: "0.75rem" }}>{reflections.length} entries</span></div>
          <div style={{ maxHeight: 420, overflowY: "auto" }}>
            {reflections.length === 0 && <p style={{ color: "var(--text-secondary)", textAlign: "center", padding: "2rem 0" }}>No reflections yet. Log one in the CBT box →</p>}
            {reflections.map((r, i) => (
              <div key={i} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--glass-border)", borderRadius: 14, padding: "1rem", marginBottom: "0.75rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, alignItems: "center", flexWrap: "wrap", gap: 4 }}>
                  <span style={S.tag(COLOR.violet)}>{r.associated_pattern}</span>
                  <div style={{ display: "flex", gap: 6 }}>
                    <span style={S.tag(COLOR.amber)}>Thought: {r.thought_intensity}/10</span>
                    <span style={S.tag(COLOR.rose)}>Emotion: {r.emotion_intensity}/10</span>
                  </div>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>{new Date(r.created_at).toLocaleDateString()}</span>
                </div>
                <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.6 }}><strong style={{ color: "var(--text-main)" }}>Event:</strong> {r.what_happened}</p>
                <p style={{ margin: "0.5rem 0 0", fontSize: "0.82rem", color: COLOR.sky, fontStyle: "italic" }}>"{r.what_next}"</p>
              </div>
            ))}
          </div>
        </div>

        {/* CBT Wizard */}
        <div style={S.card}>
          <div style={S.cardTitle}>
            <span>🧠 CBT Restructuring Box</span>
            <div style={{ display: "flex", gap: 4 }}>
              {CBT_STEPS.map((_, i) => <span key={i} style={{ width: i <= step ? 14 : 8, height: 8, borderRadius: 4, background: i <= step ? COLOR.violet : "rgba(255,255,255,0.1)", transition: "all 0.3s" }} />)}
            </div>
          </div>
          <form onSubmit={submitCBT}>
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ ...S.label, display: "block", marginBottom: 6 }}>{CBT_STEPS[step].label}</label>
              <textarea
                style={S.textarea}
                placeholder={CBT_STEPS[step].hint}
                value={form[CBT_STEPS[step].key]}
                onChange={e => setForm({ ...form, [CBT_STEPS[step].key]: e.target.value })}
                required
              />
              
              {/* Conditional Sliders for intensities */}
              {step === 1 && (
                <div style={{ marginTop: "1rem", background: "rgba(255,255,255,0.02)", padding: "10px", borderRadius: 10, border: "1px solid var(--glass-border)" }}>
                  <label style={{ ...S.label, display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span>Thought Belief Intensity</span>
                    <span style={{ color: COLOR.violet, fontWeight: 800 }}>{form.thought_intensity}/10</span>
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={form.thought_intensity}
                    onChange={e => setForm({ ...form, thought_intensity: parseInt(e.target.value) })}
                    style={{ width: "100%", accentColor: COLOR.violet, cursor: "pointer" }}
                  />
                </div>
              )}

              {step === 2 && (
                <div style={{ marginTop: "1rem", background: "rgba(255,255,255,0.02)", padding: "10px", borderRadius: 10, border: "1px solid var(--glass-border)" }}>
                  <label style={{ ...S.label, display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span>Emotional Reaction Intensity</span>
                    <span style={{ color: COLOR.rose, fontWeight: 800 }}>{form.emotion_intensity}/10</span>
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={form.emotion_intensity}
                    onChange={e => setForm({ ...form, emotion_intensity: parseInt(e.target.value) })}
                    style={{ width: "100%", accentColor: COLOR.rose, cursor: "pointer" }}
                  />
                </div>
              )}
            </div>
            
            {step === CBT_STEPS.length - 1 && (
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ ...S.label, display: "block", marginBottom: 6 }}>Pattern Type</label>
                <select style={S.select} value={form.associated_pattern} onChange={e => setForm({ ...form, associated_pattern: e.target.value })}>
                  <option value="rumination">Rumination</option>
                  <option value="avoidance">Avoidance</option>
                  <option value="perfectionism">Perfectionism</option>
                  <option value="catastrophizing">Catastrophizing</option>
                  <option value="burnout">Burnout</option>
                </select>
              </div>
            )}
            
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <button type="button" style={S.btn(false)} disabled={step === 0} onClick={() => setStep(s => s - 1)}>← Back</button>
              {step < CBT_STEPS.length - 1
                ? <button type="button" style={S.btn(true)} onClick={() => setStep(s => s + 1)}>Next →</button>
                : <button type="submit" style={S.btn(true)} disabled={submitting}>{submitting ? "Saving..." : "Log Worksheet"}</button>
              }
            </div>
            {cbtMsg && <p style={{ marginTop: 8, fontSize: "0.8rem", color: cbtMsg.startsWith("✓") ? COLOR.emerald : COLOR.rose, textAlign: "center" }}>{cbtMsg}</p>}
          </form>
        </div>
      </div>
    </div>
  );
}
