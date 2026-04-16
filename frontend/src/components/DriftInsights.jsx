import { useState, useEffect, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, ShieldCheck, Activity, Brain, Heart, Zap, Wind, Moon, Sun, ChevronDown, ChevronUp, TrendingUp, TrendingDown } from 'lucide-react';
import { getDrift, getTimeline } from '../api';
import AuthContext from '../context/AuthContext';

const DRIFT_PROFILES = {
  high: {
    label: 'High Drift',
    color: 'var(--emotion-anger)',
    gradient: 'linear-gradient(135deg, rgba(232,132,132,0.15), rgba(232,132,132,0.05))',
    icon: '🔴',
    description: 'Your emotional state is shifting rapidly. Significant turbulence detected in your cognitive patterns.',
    symptoms: [
      { icon: '😰', title: 'Heightened Anxiety', detail: 'Sudden surges of unease or restlessness without clear cause.' },
      { icon: '😤', title: 'Emotional Reactivity', detail: 'Disproportionate responses to minor triggers or stressors.' },
      { icon: '🌀', title: 'Racing Thoughts', detail: 'Difficulty slowing down internal mental chatter.' },
      { icon: '😴', title: 'Sleep Disruption', detail: 'Trouble falling or staying asleep due to emotional overactivation.' },
      { icon: '💢', title: 'Irritability Spikes', detail: 'Short fuse and heightened sensitivity in social interactions.' },
      { icon: '🫀', title: 'Somatic Tension', detail: 'Physical tightness in chest, shoulders, or jaw linked to emotional strain.' },
    ],
    risks: [
      'Risk of burnout if high drift persists beyond 48 hours',
      'Impaired decision-making and cognitive clarity',
      'Strained interpersonal relationships',
      'Reduced immune response due to chronic stress hormones',
    ],
    preventions: [
      { icon: <Wind size={20} />, title: 'Box Breathing (4-4-4-4)', detail: 'Inhale 4s, hold 4s, exhale 4s, hold 4s. Repeat 5 cycles to activate the parasympathetic system.', color: 'var(--accent-blue)' },
      { icon: <Moon size={20} />, title: 'Sleep Hygiene Protocol', detail: 'Maintain a fixed sleep schedule. Avoid screens 1 hour before bed. Keep room temperature below 20°C.', color: 'var(--emotion-sadness)' },
      { icon: <Brain size={20} />, title: 'Cognitive Defusion', detail: 'Label thoughts: "I notice I am having the thought that...". Creates space between you and your emotions.', color: 'var(--accent-purple)' },
      { icon: <Activity size={20} />, title: '20-Minute Walk', detail: 'Light cardio reduces cortisol by up to 14%. Do it outdoors for the added benefit of sunlight exposure.', color: 'var(--accent-green)' },
      { icon: <Heart size={20} />, title: 'Talk to Your Therapist', detail: 'A high drift score warrants professional check-in. Reach out via the Community or Doctor Chat feature.', color: 'var(--emotion-love)' },
    ]
  },
  medium: {
    label: 'Moderate Drift',
    color: 'var(--emotion-surprise)',
    gradient: 'linear-gradient(135deg, rgba(232,200,132,0.15), rgba(232,200,132,0.05))',
    icon: '🟠',
    description: 'Noticeable emotional variation detected. Your patterns are shifting but remain manageable.',
    symptoms: [
      { icon: '🤔', title: 'Mental Fog', detail: 'Mild difficulty concentrating or following through on tasks.' },
      { icon: '😕', title: 'Mood Fluctuations', detail: 'Emotions shifting more frequently than your baseline average.' },
      { icon: '😩', title: 'Low-grade Fatigue', detail: 'Persistent tiredness not fully explained by physical exertion.' },
      { icon: '📵', title: 'Social Withdrawal', detail: 'Subtle tendency to avoid or postpone social engagements.' },
    ],
    risks: [
      'May escalate to high drift if left unaddressed',
      'Reduced productivity and creative output',
      'Increased risk of emotional eating or comfort-seeking behaviours',
    ],
    preventions: [
      { icon: <Sun size={20} />, title: 'Morning Sunlight', detail: 'Expose yourself to natural light within 30 minutes of waking. anchors your circadian rhythm and boosts serotonin.', color: 'var(--emotion-surprise)' },
      { icon: <Wind size={20} />, title: 'Mindful Breathing (5-min)', detail: 'Set a 5-minute timer. Focus fully on the breath. Redirect gently when the mind wanders.', color: 'var(--accent-blue)' },
      { icon: <Zap size={20} />, title: 'Dopamine Circuit', detail: 'Engage in a small, achievable task (make your bed, wash dishes). Completion triggers reward pathways.', color: 'var(--accent-gold)' },
      { icon: <Heart size={20} />, title: 'Gratitude Journaling', detail: 'Write 3 specific things you are grateful for. The specificity is key — not "family" but "my sister called me today."', color: 'var(--emotion-love)' },
    ]
  },
  low: {
    label: 'Stable',
    color: 'var(--emotion-happy)',
    gradient: 'linear-gradient(135deg, rgba(136,209,170,0.15), rgba(136,209,170,0.05))',
    icon: '🟢',
    description: 'Your emotional patterns are consistent and stable. Your system is in optimal equilibrium.',
    symptoms: [
      { icon: '😌', title: 'Emotional Steadiness', detail: 'Sustained sense of inner calm across varying circumstances.' },
      { icon: '🧠', title: 'Mental Clarity', detail: 'Clear thinking, decisiveness, and creative flow.' },
      { icon: '💤', title: 'Restful Sleep', detail: 'High-quality sleep cycles supporting cognitive restoration.' },
    ],
    risks: [
      'Complacency — stable states require active maintenance',
      'Brief external shocks can still tip the balance',
    ],
    preventions: [
      { icon: <ShieldCheck size={20} />, title: 'Daily Emotional Logging', detail: 'Keep logging your emotional state. Consistency is the foundation of long-term stability.', color: 'var(--accent-green)' },
      { icon: <Heart size={20} />, title: 'Proactive Social Connection', detail: 'Invest in relationships while you have the emotional bandwidth. Reach out to someone today.', color: 'var(--emotion-love)' },
      { icon: <Brain size={20} />, title: 'Mindfulness Maintenance', detail: '10 minutes of daily meditation sustains neuroplasticity and builds resilience for future drift events.', color: 'var(--accent-purple)' },
    ]
  }
};

const EMOTION_SYMPTOM_MAP = {
  anger:   { issues: ['Elevated blood pressure', 'Conflict escalation', 'Impaired rational thinking'], emoji: '😤' },
  sadness: { issues: ['Increased lethargy', 'Social isolation', 'Reduced motivation and appetite'], emoji: '😢' },
  fear:    { issues: ['Hypervigilance', 'Avoidant behaviours', 'Panic response activation'], emoji: '😰' },
  disgust: { issues: ['Negative cognitive bias', 'Reduced empathy', 'Withdrawal from experiences'], emoji: '🤢' },
  surprise:{ issues: ['Disorientation', 'Decision paralysis', 'Acute sensory overload'], emoji: '😲' },
  joy:     { issues: ['Risk of emotional inflation', 'Impulsive decisions in euphoria', 'Post-peak crash'], emoji: '😊' },
  neutral: { issues: ['Emotional numbness if sustained', 'Disconnection from intrinsic motivators'], emoji: '😐' },
};

function SymptomCard({ icon, title, detail, index }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, duration: 0.4 }}
      onClick={() => setExpanded(e => !e)}
      style={{
        background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)',
        borderRadius: '16px', padding: '1rem 1.25rem', cursor: 'pointer',
        transition: 'all 0.3s', display: 'flex', flexDirection: 'column', gap: '8px'
      }}
      whileHover={{ borderColor: 'var(--glass-highlight)' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '1.4rem' }}>{icon}</span>
          <span style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--text-main)' }}>{title}</span>
        </div>
        {expanded ? <ChevronUp size={16} color="var(--text-secondary)" /> : <ChevronDown size={16} color="var(--text-secondary)" />}
      </div>
      <AnimatePresence>
        {expanded && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.6, paddingLeft: '34px' }}
          >
            {detail}
          </motion.p>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function PreventionCard({ icon, title, detail, color, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
      style={{
        background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)',
        borderRadius: '20px', padding: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'flex-start',
        transition: 'all 0.3s'
      }}
      whileHover={{ background: 'rgba(255,255,255,0.04)', borderColor: 'var(--glass-highlight)' }}
    >
      <div style={{
        width: '44px', height: '44px', borderRadius: '14px', flexShrink: 0,
        background: `${color}22`, border: `1px solid ${color}44`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', color
      }}>
        {icon}
      </div>
      <div>
        <h4 style={{ margin: '0 0 6px', color: 'var(--text-main)', fontSize: '0.95rem', fontWeight: '700' }}>{title}</h4>
        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.8rem', lineHeight: 1.7 }}>{detail}</p>
      </div>
    </motion.div>
  );
}

export default function DriftInsights() {
  const { user } = useContext(AuthContext);
  const [drift, setDrift] = useState(null);
  const [dominantEmotion, setDominantEmotion] = useState('neutral');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [driftRes, timelineRes] = await Promise.all([getDrift(), getTimeline('24h')]);
        setDrift(driftRes.data);
        const emotions = timelineRes.data?.emotions || [];
        if (emotions.length > 0) {
          const freq = {};
          emotions.forEach(e => { freq[e] = (freq[e] || 0) + 1; });
          setDominantEmotion(Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0]);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const severity = drift?.details?.variance > 0.4 ? 'high' : drift?.details?.variance > 0.2 ? 'medium' : 'low';
  const profile = DRIFT_PROFILES[severity];
  const emotionProfile = EMOTION_SYMPTOM_MAP[dominantEmotion] || EMOTION_SYMPTOM_MAP['neutral'];

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px', color: 'var(--text-secondary)' }}>
      <div style={{ width: '32px', height: '32px', border: '3px solid var(--glass-border)', borderTopColor: 'var(--accent-purple)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ maxWidth: '900px', margin: '0 auto', paddingBottom: '3rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ width: '52px', height: '52px', borderRadius: '16px', background: `${profile.color}22`, border: `1px solid ${profile.color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <AlertTriangle size={24} color={profile.color} />
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: '800', letterSpacing: '-0.3px' }}>Drift Intelligence Report</h1>
          <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Personalised insights based on your 24-hour emotional pattern.
          </p>
        </div>
      </div>

      {/* Drift Status Banner */}
      <div className="glass-panel" style={{ padding: '1.75rem 2rem', background: profile.gradient, borderColor: `${profile.color}33` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{ fontSize: '2.5rem' }}>{profile.icon}</span>
            <div>
              <div style={{ fontSize: '0.65rem', fontWeight: '800', letterSpacing: '2px', color: profile.color, marginBottom: '4px' }}>CURRENT DRIFT STATUS</div>
              <div style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--text-main)' }}>{profile.label}</div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Variance Score</div>
            <div style={{ fontSize: '2.5rem', fontWeight: '900', color: profile.color, lineHeight: 1 }}>
              {((drift?.details?.variance || 0.1) * 100).toFixed(0)}<span style={{ fontSize: '1rem', opacity: 0.6 }}>%</span>
            </div>
          </div>
        </div>
        <p style={{ margin: '1.25rem 0 0', color: 'var(--text-secondary)', lineHeight: 1.7, fontSize: '0.9rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1rem' }}>
          {profile.description}
        </p>
      </div>

      {/* Dominant Emotion Issues */}
      <div className="glass-panel" style={{ padding: '1.75rem 2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.25rem' }}>
          <span style={{ fontSize: '1.5rem' }}>{emotionProfile.emoji}</span>
          <div>
            <div style={{ fontSize: '0.65rem', fontWeight: '800', letterSpacing: '2px', color: 'var(--text-secondary)' }}>DOMINANT EMOTION — LAST 24H</div>
            <div style={{ fontWeight: '700', textTransform: 'capitalize', color: 'var(--text-main)', fontSize: '1.1rem' }}>{dominantEmotion}</div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {emotionProfile.issues.map((issue, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--emotion-anger)', flexShrink: 0 }} />
              <span style={{ color: 'var(--text-main)', fontSize: '0.85rem' }}>{issue}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Symptoms */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.25rem' }}>
          <Brain size={18} color="var(--accent-purple)" />
          <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: '800', letterSpacing: '2px', color: 'var(--text-main)', textTransform: 'uppercase' }}>Symptoms to Watch</h2>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginLeft: '4px' }}>tap to expand</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.75rem' }}>
          {profile.symptoms.map((s, i) => (
            <SymptomCard key={i} {...s} index={i} />
          ))}
        </div>
      </div>

      {/* Risks */}
      <div className="glass-panel" style={{ padding: '1.75rem 2rem', background: 'rgba(232,132,132,0.04)', borderColor: 'rgba(232,132,132,0.15)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.25rem' }}>
          <TrendingUp size={18} color="var(--emotion-anger)" />
          <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: '800', letterSpacing: '2px', textTransform: 'uppercase' }}>Potential Risks if Unaddressed</h2>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {profile.risks.map((risk, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}
            >
              <AlertTriangle size={14} color="var(--emotion-anger)" style={{ marginTop: '3px', flexShrink: 0 }} />
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.6 }}>{risk}</span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Preventions */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.25rem' }}>
          <ShieldCheck size={18} color="var(--accent-green)" />
          <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: '800', letterSpacing: '2px', textTransform: 'uppercase' }}>Recommended Actions</h2>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {profile.preventions.map((p, i) => (
            <PreventionCard key={i} {...p} index={i} />
          ))}
        </div>
      </div>

      {/* CTA Footer */}
      <div className="glass-panel" style={{ padding: '1.75rem 2rem', textAlign: 'center', background: 'rgba(160,132,232,0.06)', borderColor: 'rgba(160,132,232,0.2)' }}>
        <Brain size={32} color="var(--accent-purple)" style={{ marginBottom: '1rem' }} />
        <h3 style={{ margin: '0 0 8px', fontSize: '1.1rem', fontWeight: '700' }}>Want a Deeper Analysis?</h3>
        <p style={{ margin: '0 0 1.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Talk to Sentia, your AI therapist, for a live, conversational deep-dive into your emotional patterns.</p>
        <button
          className="glass-button primary"
          style={{ padding: '0.8rem 2.5rem' }}
          onClick={() => window.dispatchEvent(new CustomEvent('open-sentia'))}
        >
          Start Session with Sentia
        </button>
      </div>
    </motion.div>
  );
}
