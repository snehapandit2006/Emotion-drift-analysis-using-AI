import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Square, Timer, Wind, CheckCircle, Volume2, VolumeX, RotateCcw } from 'lucide-react';
import { logMeditation } from '../api';

const AMBIENT_SOUNDS = [
  { id: 'rain', label: 'Rain', icon: '🌧️' },
  { id: 'whitenoise', label: 'White Noise', icon: '📻' },
  { id: 'forest', label: 'Forest', icon: '🌿' },
  { id: 'ocean', label: 'Ocean', icon: '🌊' },
  { id: 'crickets', label: 'Crickets', icon: '🦗' },
  { id: 'none', label: 'Silent', icon: '🔕' },
];

// Create noise buffer helper
function createNoiseBuffer(ctx, seconds = 3) {
  const bufferSize = ctx.sampleRate * seconds;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

function buildSoundGraph(ctx, soundId, gainNode) {
  const nodes = [];

  if (soundId === 'whitenoise') {
    const source = ctx.createBufferSource();
    source.buffer = createNoiseBuffer(ctx);
    source.loop = true;
    source.connect(gainNode);
    source.start();
    nodes.push(source);

  } else if (soundId === 'rain') {
    // Heavy rain = white noise through a low-pass filter
    const source = ctx.createBufferSource();
    source.buffer = createNoiseBuffer(ctx);
    source.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1200;
    source.connect(filter);
    filter.connect(gainNode);
    source.start();
    nodes.push(source, filter);

  } else if (soundId === 'ocean') {
    // Ocean = noise through two band-pass filters with slow LFO sweep
    const source = ctx.createBufferSource();
    source.buffer = createNoiseBuffer(ctx, 5);
    source.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 400;
    filter.Q.value = 0.8;
    // Slow LFO on filter frequency to simulate wave rhythm
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 0.18;
    lfoGain.gain.value = 300;
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    lfo.start();
    source.connect(filter);
    filter.connect(gainNode);
    source.start();
    nodes.push(source, filter, lfo, lfoGain);

  } else if (soundId === 'forest') {
    // Forest = gentle high-passed noise + subtle oscillator chirps
    const source = ctx.createBufferSource();
    source.buffer = createNoiseBuffer(ctx);
    source.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 1800;
    const gainReduced = ctx.createGain();
    gainReduced.gain.value = 0.4;
    source.connect(filter);
    filter.connect(gainReduced);
    gainReduced.connect(gainNode);
    source.start();
    nodes.push(source, filter, gainReduced);

  } else if (soundId === 'crickets') {
    // Crickets = two oscillators slightly detuned + amplitude modulation
    [4200, 4350].forEach(freq => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const ampMod = ctx.createOscillator();
      ampMod.frequency.value = 16 + Math.random() * 4;
      const ampGain = ctx.createGain();
      ampGain.gain.value = 0;
      const baseGain = ctx.createGain();
      baseGain.gain.value = 0.15;
      ampMod.connect(ampGain.gain);
      osc.connect(baseGain);
      baseGain.connect(gainNode);
      osc.start();
      ampMod.start();
      nodes.push(osc, ampMod, ampGain, baseGain);
    });
  }

  return nodes;
}

const MeditationTimer = ({ onComplete }) => {
  const [isActive, setIsActive] = useState(false);
  const [seconds, setSeconds] = useState(300);
  const [sessionType, setSessionType] = useState('breathing');
  const [isFinished, setIsFinished] = useState(false);
  const [selectedSound, setSelectedSound] = useState('none');
  const [volume, setVolume] = useState(0.4);
  const [isMuted, setIsMuted] = useState(false);
  const timerRef = useRef(null);
  const audioCtxRef = useRef(null);
  const gainNodeRef = useRef(null);
  const soundNodesRef = useRef([]);

  const stopAudio = () => {
    soundNodesRef.current.forEach(node => {
      try { node.stop?.(); node.disconnect?.(); } catch (_) {}
    });
    soundNodesRef.current = [];
    if (audioCtxRef.current) {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
      gainNodeRef.current = null;
    }
  };

  const startAudio = (soundId, vol) => {
    stopAudio();
    if (soundId === 'none') return;
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    audioCtxRef.current = ctx;
    const gainNode = ctx.createGain();
    gainNode.gain.value = isMuted ? 0 : vol;
    gainNode.connect(ctx.destination);
    gainNodeRef.current = gainNode;
    soundNodesRef.current = buildSoundGraph(ctx, soundId, gainNode);
  };

  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  useEffect(() => () => stopAudio(), []);

  const startTimer = () => {
    setIsActive(true);
    setIsFinished(false);
    if (selectedSound !== 'none') startAudio(selectedSound, isMuted ? 0 : volume);
  };

  const stopTimer = () => {
    setIsActive(false);
    clearInterval(timerRef.current);
    stopAudio();
  };

  const resetTimer = () => {
    stopTimer();
    setSeconds(sessionType === 'breathing' ? 300 : 1500);
  };

  useEffect(() => {
    if (isActive && seconds > 0) {
      timerRef.current = setInterval(() => setSeconds(prev => prev - 1), 1000);
    } else if (seconds === 0) {
      handleFinish();
    }
    return () => clearInterval(timerRef.current);
  }, [isActive, seconds]);

  const handleFinish = async () => {
    stopTimer();
    setIsFinished(true);
    try {
      await logMeditation({
        duration_seconds: sessionType === 'breathing' ? 300 - seconds : 1500 - seconds,
        session_type: sessionType,
      });
      if (onComplete) onComplete();
    } catch (error) { console.error(error); }
  };

  const formatTime = s => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <div className="glass-panel" style={{ padding: '2.5rem', maxWidth: '580px', margin: '0 auto' }}>
      <h2 className="serif-heading" style={{ marginBottom: '2rem', textAlign: 'center', letterSpacing: '4px', fontSize: '1rem', color: 'var(--accent-purple)' }}>
        {sessionType === 'breathing' ? 'PULSE BREATH' : 'DEEP RESONANCE'}
      </h2>

      <div style={{ fontSize: '5rem', fontWeight: '900', margin: '1rem 0', fontFamily: 'monospace', textAlign: 'center', color: 'var(--text-main)', letterSpacing: '-2px' }}>
        {formatTime(seconds)}
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', marginBottom: '2rem' }}>
        {!isActive ? (
          <button className="glass-button primary" onClick={startTimer} style={{ padding: '1rem 2.5rem' }}>
            <Play size={20} style={{ marginRight: '8px' }} /> Begin
          </button>
        ) : (
          <button className="glass-button" onClick={stopTimer} style={{ padding: '1rem 2.5rem', background: 'rgba(232, 132, 132, 0.1)', borderColor: 'var(--emotion-anger)', color: 'var(--emotion-anger)' }}>
            <Square size={20} style={{ marginRight: '8px' }} /> Pause
          </button>
        )}
        <button className="glass-button" onClick={resetTimer} style={{ width: '56px', height: '56px', padding: 0, borderRadius: '50%' }}>
          <RotateCcw size={20} />
        </button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', marginBottom: '2.5rem' }}>
        <button onClick={() => { setSessionType('breathing'); setSeconds(300); stopTimer(); }}
          style={{ 
            padding: '0.6rem 1.2rem', borderRadius: '100px', border: '1px solid var(--glass-border)', 
            background: sessionType === 'breathing' ? 'var(--glass-highlight)' : 'transparent', 
            color: sessionType === 'breathing' ? 'var(--text-main)' : 'var(--text-secondary)', 
            cursor: 'pointer', fontSize: '0.8rem', fontWeight: '600', transition: 'all 0.3s'
          }}>
          5m Breathe
        </button>
        <button onClick={() => { setSessionType('focus'); setSeconds(1500); stopTimer(); }}
          style={{ 
            padding: '0.6rem 1.2rem', borderRadius: '100px', border: '1px solid var(--glass-border)', 
            background: sessionType === 'focus' ? 'var(--glass-highlight)' : 'transparent', 
            color: sessionType === 'focus' ? 'var(--text-main)' : 'var(--text-secondary)', 
            cursor: 'pointer', fontSize: '0.8rem', fontWeight: '600', transition: 'all 0.3s'
          }}>
          25m Focus
        </button>
      </div>

      <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '2rem' }}>
        <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '2px', textAlign: 'center', fontWeight: '700' }}>
          Ambient Resonance
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
          {AMBIENT_SOUNDS.map(sound => (
            <button
              key={sound.id}
              onClick={() => { setSelectedSound(sound.id); if (isActive) startAudio(sound.id, volume); }}
              style={{
                padding: '1rem 0.5rem', borderRadius: '16px', 
                border: '1px solid var(--glass-border)',
                background: selectedSound === sound.id ? 'var(--glass-highlight)' : 'rgba(255,255,255,0.02)',
                color: selectedSound === sound.id ? 'var(--text-main)' : 'var(--text-secondary)',
                cursor: 'pointer', fontSize: '0.75rem', transition: 'all 0.2s',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px'
              }}
            >
              <span style={{ fontSize: '1.5rem' }}>{sound.icon}</span>
              {sound.label}
            </button>
          ))}
        </div>

        {selectedSound !== 'none' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '0 10px' }}>
            <button onClick={() => setIsMuted(m => !m)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
              {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
            <input
              type="range" min="0" max="1" step="0.05" value={isMuted ? 0 : volume}
              onChange={e => { setIsMuted(false); setVolume(parseFloat(e.target.value)); }}
              style={{ flex: 1, accentColor: 'var(--accent-purple)', height: '4px' }}
            />
          </div>
        )}
      </div>

      {isActive && sessionType === 'breathing' && (
        <div style={{ position: 'relative', margin: '3rem auto 0', width: '120px', height: '120px' }}>
          <motion.div
            animate={{ scale: [1, 1.6, 1], opacity: [0.2, 0.5, 0.2] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
            style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'radial-gradient(circle, var(--accent-purple) 0%, transparent 70%)' }}
          />
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <motion.div 
              animate={{ opacity: [1, 0, 0, 1] }} 
              transition={{ duration: 6, repeat: Infinity, times: [0, 0.45, 0.55, 1] }}
              style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--accent-purple)', textTransform: 'uppercase', letterSpacing: '2px' }}
            >
              Inhale
            </motion.div>
            <motion.div 
               style={{ position: 'absolute', fontSize: '0.8rem', fontWeight: '800', color: 'var(--accent-purple)', textTransform: 'uppercase', letterSpacing: '2px' }}
               animate={{ opacity: [0, 1, 1, 0] }} 
               transition={{ duration: 6, repeat: Infinity, times: [0, 0.5, 0.95, 1] }}
            >
              Exhale
            </motion.div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MeditationTimer;
