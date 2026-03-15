/**
 * vitalAlarm.js
 * Audio alarm + voice alert system for critical/warning vital events.
 *
 * Uses:
 *  - Web Audio API  → generates beep patterns (no audio file dependencies)
 *  - Web Speech API → speaks the alert message exactly TWICE then stops
 */

let audioCtx = null;
let alarmInterval = null;
let speechUtteranceCount = 0;

// ─── Internal helpers ─────────────────────────────────────────────────────

async function getAudioCtx() {
    if (!audioCtx || audioCtx.state === 'closed') {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
    }
    return audioCtx;
}

/**
 * Plays a single beep tone.
 * @param {AudioContext} ctx
 * @param {number} frequency - Hz
 * @param {number} startTime - AudioContext time offset (seconds)
 * @param {number} duration  - seconds
 * @param {number} gain      - 0.0 – 1.0
 */
function scheduleTone(ctx, frequency, startTime, duration, gain = 0.6) {
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(frequency, startTime);

    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(gain, startTime + 0.02);
    gainNode.gain.linearRampToValueAtTime(0, startTime + duration - 0.02);

    osc.start(startTime);
    osc.stop(startTime + duration);
}

// ─── Public: play alarm ───────────────────────────────────────────────────

/**
 * Plays a repeating alarm sound pattern.
 * @param {'critical'|'warning'} severity
 */
export async function playAlarm(severity = 'critical') {
    stopAlarmSound(); // stop any previous alarm

    const ctx = await getAudioCtx();

    if (severity === 'critical') {
        // Rapid double-beep pattern (high pitch) — repeats every 1.2 seconds
        const playPattern = () => {
            const t = ctx.currentTime;
            scheduleTone(ctx, 1100, t,        0.15, 0.7);
            scheduleTone(ctx, 1100, t + 0.2,  0.15, 0.7);
            scheduleTone(ctx, 880,  t + 0.45, 0.3,  0.5);
        };
        playPattern();
        alarmInterval = setInterval(playPattern, 1300);
    } else {
        // Slower 2-tone beep for warnings
        const playPattern = () => {
            const t = ctx.currentTime;
            scheduleTone(ctx, 700, t,       0.2, 0.5);
            scheduleTone(ctx, 600, t + 0.4, 0.2, 0.4);
        };
        playPattern();
        alarmInterval = setInterval(playPattern, 1600);
    }

    // Auto-stop alarm sound after 8 seconds (speech takes over anyway)
    setTimeout(stopAlarmSound, 8000);
}

function stopAlarmSound() {
    if (alarmInterval) {
        clearInterval(alarmInterval);
        alarmInterval = null;
    }
}

// ─── Public: build spoken phrase ─────────────────────────────────────────

const METRIC_SPEECH = {
    heart_rate:               { label: 'Heart Rate',    unit: 'beats per minute' },
    spo2:                     { label: 'Blood Oxygen',  unit: 'percent'          },
    blood_pressure_systolic:  { label: 'Blood Pressure (systolic)', unit: 'millimetres of mercury' },
    blood_pressure_diastolic: { label: 'Blood Pressure (diastolic)', unit: 'millimetres of mercury' },
};

/**
 * Builds a natural-language phrase from an alert object.
 * e.g. "High Heart Rate — 160 beats per minute — Risk Alert, needs attention now"
 */
export function buildPhrase(alert) {
    const info = METRIC_SPEECH[alert.metric] || { label: alert.metric, unit: '' };

    const levelWord = alert.alert_type === 'rapid_fluctuation'
        ? 'Rapid change in'
        : alert.value > 100  // High vs Low
            ? (alert.metric === 'spo2' ? 'Low' : 'High')
            : 'Low';

    return (
        `${levelWord} ${info.label} — ` +
        `${Math.round(alert.value)} ${info.unit} — ` +
        `Risk Alert. Needs attention now.`
    );
}

// ─── Public: speak alert (exactly N times) ────────────────────────────────

/**
 * Uses the Web Speech API to speak text exactly `times` times.
 * @param {string} text
 * @param {number} times - defaults to 2
 */
export function speakAlert(text, times = 2) {
    if (!window.speechSynthesis) return;

    window.speechSynthesis.cancel(); // clear any pending speech
    speechUtteranceCount = 0;

    function speakOnce() {
        if (speechUtteranceCount >= times) return;
        speechUtteranceCount++;

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate   = 0.88;   // slightly slower for clarity
        utterance.pitch  = 1.0;
        utterance.volume = 1.0;

        // Prefer a clear English voice if available
        const voices = window.speechSynthesis.getVoices();
        const preferred = voices.find(v =>
            (v.lang.startsWith('en') && v.name.toLowerCase().includes('google')) ||
            (v.lang.startsWith('en') && !v.name.toLowerCase().includes('espeak'))
        );
        if (preferred) utterance.voice = preferred;

        utterance.onend = () => {
            // Short pause between repetitions, then speak again
            if (speechUtteranceCount < times) {
                setTimeout(speakOnce, 800);
            }
        };

        window.speechSynthesis.speak(utterance);
    }

    // Voices may not be loaded yet on first call
    if (window.speechSynthesis.getVoices().length === 0) {
        window.speechSynthesis.addEventListener('voiceschanged', speakOnce, { once: true });
    } else {
        speakOnce();
    }
}

// ─── Public: trigger full alarm sequence ─────────────────────────────────

/**
 * Main entry point. Pass the highest-severity alert object.
 * Plays alarm beeps, then speaks the alert message exactly twice.
 */
export async function triggerVitalAlarm(alert) {
    if (!alert) return;

    await playAlarm(alert.severity);

    const phrase = buildPhrase(alert);

    // Slight delay so alarm beeps play a moment before speech starts
    setTimeout(() => speakAlert(phrase, 2), 1200);
}

// ─── Public: stop everything ─────────────────────────────────────────────

/**
 * Cancels alarm beeps and any ongoing/queued speech.
 * Call this when the user clicks Acknowledge.
 */
export function stopAlarm() {
    stopAlarmSound();
    if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
    }
    speechUtteranceCount = 0;
}
