import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Square, Timer, Wind, CheckCircle } from 'lucide-react';
import { logMeditation } from '../api';

const MeditationTimer = ({ onComplete }) => {
  const [isActive, setIsActive] = useState(false);
  const [seconds, setSeconds] = useState(300); // 5 minutes default
  const [sessionType, setSessionType] = useState('breathing'); // breathing, focus
  const [isFinished, setIsFinished] = useState(false);
  const timerRef = useRef(null);

  const startTimer = () => {
    setIsActive(true);
    setIsFinished(false);
  };

  const stopTimer = () => {
    setIsActive(false);
    clearInterval(timerRef.current);
  };

  const resetTimer = () => {
    stopTimer();
    setSeconds(sessionType === 'breathing' ? 300 : 1500); // 5 or 25 mins
  };

  useEffect(() => {
    if (isActive && seconds > 0) {
      timerRef.current = setInterval(() => {
        setSeconds((prev) => prev - 1);
      }, 1000);
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
        session_type: sessionType
      });
      if (onComplete) onComplete();
    } catch (error) {
      console.error("Failed to log meditation:", error);
    }
  };

  const formatTime = (s) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', maxWidth: '500px', margin: '0 auto', background: 'transparent' }}>
      <h2 className="serif-heading" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
        <Timer size={24} color="var(--primary-blue)" />
        {sessionType === 'breathing' ? 'Breathing Exercise' : 'Deep Focus'}
      </h2>

      <div className="timer-display" style={{ fontSize: '4rem', fontWeight: 'bold', margin: '2rem 0', fontFamily: 'monospace' }}>
        {formatTime(seconds)}
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '2rem' }}>
        {!isActive ? (
          <button className="primary-btn" onClick={startTimer} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '1rem 2rem', borderRadius: '12px' }}>
            <Play size={20} /> Start
          </button>
        ) : (
          <button className="secondary-btn" onClick={stopTimer} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '1rem 2rem', borderRadius: '12px' }}>
            <Square size={20} /> Pause
          </button>
        )}
        <button className="icon-btn" onClick={resetTimer} style={{ padding: '1rem' }}>Reset</button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
        <button 
          className={`tab-btn ${sessionType === 'breathing' ? 'active' : ''}`} 
          onClick={() => { setSessionType('breathing'); setSeconds(300); stopTimer(); }}
          style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: sessionType === 'breathing' ? 'var(--primary-blue)' : 'transparent', color: sessionType === 'breathing' ? 'white' : 'var(--text-main)' }}
        >
          Breathing (5m)
        </button>
        <button 
          className={`tab-btn ${sessionType === 'focus' ? 'active' : ''}`} 
          onClick={() => { setSessionType('focus'); setSeconds(1500); stopTimer(); }}
          style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: sessionType === 'focus' ? 'var(--primary-blue)' : 'transparent', color: sessionType === 'focus' ? 'white' : 'var(--text-main)' }}
        >
          Focus (25m)
        </button>
      </div>

      {isActive && sessionType === 'breathing' && (
        <div style={{ position: 'relative', margin: '2rem auto', width: '150px', height: '150px' }}>
          <motion.div 
            animate={{ scale: [1, 1.8, 1] }} 
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            style={{ 
              width: '100%', 
              height: '100%', 
              borderRadius: '50%', 
              background: 'radial-gradient(circle, var(--primary-blue) 0%, transparent 70%)', 
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: 0.4
            }}
          />
          <div style={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            width: '100%', 
            height: '100%', 
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'center', 
            justifyContent: 'center'
          }}>
            <motion.div
              animate={{ scale: [0.9, 1.1, 0.9] }}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            >
              <Wind size={40} color="var(--primary-blue)" style={{ opacity: 0.8, marginBottom: '10px' }} />
            </motion.div>
            
            <div style={{ position: 'relative', height: '28px', width: '100%', display: 'flex', justifyContent: 'center' }}>
              <motion.span
                animate={{ opacity: [1, 1, 0, 0, 1] }}
                transition={{ duration: 8, repeat: Infinity, times: [0, 0.45, 0.5, 0.95, 1] }}
                style={{ position: 'absolute', fontWeight: 'bold', color: 'var(--primary-blue)', fontSize: '1.4rem', whiteSpace: 'nowrap' }}
              >
                Breathe In
              </motion.span>
              <motion.span
                animate={{ opacity: [0, 0, 1, 1, 0] }}
                transition={{ duration: 8, repeat: Infinity, times: [0, 0.5, 0.55, 0.95, 1] }}
                style={{ position: 'absolute', fontWeight: 'bold', color: 'var(--primary-blue)', fontSize: '1.4rem', whiteSpace: 'nowrap' }}
              >
                Breathe Out
              </motion.span>
            </div>
          </div>
        </div>
      )}

      <AnimatePresence>
        {isFinished && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ marginTop: '2rem', color: 'var(--emotion-happy)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            <CheckCircle size={20} /> Session Complete! Great job.
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MeditationTimer;
