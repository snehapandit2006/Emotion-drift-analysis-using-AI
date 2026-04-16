import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
    Mail, Lock, ArrowRight, Github, Chrome, 
    Sparkles, Compass
} from 'lucide-react';
import { useGoogleLogin } from '@react-oauth/google';
import AuthContext from '../context/AuthContext';

const Login = () => {
    const navigate = useNavigate();
    const { login, googleLogin } = useContext(AuthContext);
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [role, setRole] = useState('patient');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        try {
            const result = await login(formData.email, formData.password);
            if (result && result.role === 'psychiatrist') {
                navigate('/doctor-dashboard');
            } else {
                navigate('/dashboard');
            }
        } catch (err) {
            setError(err.message || 'Invalid credentials. Please attempt synchronization again.');
            setIsLoading(false);
        }
    };

    const handleGoogleLogin = useGoogleLogin({
        onSuccess: async (tokenResponse) => {
            setIsLoading(true);
            const result = await googleLogin(tokenResponse.access_token);
            if (result && result.success) {
                if (result.role === 'psychiatrist') {
                    navigate('/doctor-dashboard');
                } else {
                    navigate('/dashboard');
                }
            } else {
                setError('Google authentication failed.');
                setIsLoading(false);
            }
        },
        onError: () => {
            setError('Google login failed.');
            setIsLoading(false);
        }
    });

    return (
        <div style={{ 
            minHeight: '100vh', width: '100vw', background: '#0F1117',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            position: 'relative', overflow: 'hidden', color: 'white'
        }}>
            {/* Background Typography Watermark */}
            <div style={{ 
                position: 'absolute', right: '-5vw', top: '25%', 
                fontSize: '12vw', fontWeight: '900', lineHeight: 0.9,
                opacity: 0.03, pointerEvents: 'none', userSelect: 'none',
                fontFamily: 'var(--font-heading)', textAlign: 'right'
            }}>
                CALM<br/>DRIFT<br/>FLOW
            </div>

            {/* Ambient Background Glows */}
            <div style={{ position: 'absolute', top: '10%', left: '10%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(99, 102, 241, 0.1) 0%, transparent 70%)', filter: 'blur(60px)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: '10%', right: '10%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(160, 132, 232, 0.1) 0%, transparent 70%)', filter: 'blur(60px)', pointerEvents: 'none' }} />

            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                style={{ zIndex: 10, width: '100%', maxWidth: '440px', padding: '2rem' }}
            >
                <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                        <Compass className="text-blue-500" size={28} />
                        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem', fontWeight: '900', letterSpacing: '-0.5px', margin: 0 }}>Emotion Drift</h1>
                    </div>
                    <p style={{ fontSize: '0.75rem', fontWeight: '700', opacity: 0.4, letterSpacing: '2px', textTransform: 'uppercase' }}>Premium Sanctuary</p>
                </div>

                <div className="glass-panel" style={{ padding: '2.5rem', borderRadius: '32px', border: '1px solid var(--glass-highlight)', background: 'rgba(255, 255, 255, 0.02)' }}>
                    <div style={{ marginBottom: '2rem' }}>
                        <h2 style={{ fontSize: '1.75rem', fontWeight: '800', marginBottom: '0.5rem' }}>Welcome back</h2>
                        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Resume your journey toward inner clarity.</p>
                    </div>

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div style={{ position: 'relative' }}>
                            <div style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', opacity: 0.6 }}>
                                <Mail size={18} />
                            </div>
                            <input 
                                type="email"
                                placeholder="Email address"
                                required
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                style={{ 
                                    width: '100%', padding: '1.1rem 1rem 1.1rem 3.5rem', borderRadius: '16px',
                                    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)',
                                    color: 'white', fontSize: '1rem', outline: 'none', transition: 'all 0.3s'
                                }}
                            />
                        </div>

                        <div style={{ position: 'relative' }}>
                            <div style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', opacity: 0.6 }}>
                                <Lock size={18} />
                            </div>
                            <input 
                                type="password"
                                placeholder="Password"
                                required
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                style={{ 
                                    width: '100%', padding: '1.1rem 1rem 1.1rem 3.5rem', borderRadius: '16px',
                                    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)',
                                    color: 'white', fontSize: '1rem', outline: 'none', transition: 'all 0.3s'
                                }}
                            />
                        </div>

                        {/* Role Selector */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem', marginTop: '0.5rem' }}>
                            <button
                                type="button"
                                onClick={() => setRole('patient')}
                                style={{
                                    padding: '0.8rem', borderRadius: '12px', fontSize: '0.85rem', fontWeight: '800', border: '1px solid',
                                    borderColor: role === 'patient' ? '#60A5FA' : 'rgba(255,255,255,0.05)',
                                    background: role === 'patient' ? 'rgba(96, 165, 250, 0.1)' : 'rgba(255,255,255,0.02)',
                                    color: role === 'patient' ? '#60A5FA' : 'rgba(255,255,255,0.4)',
                                    cursor: 'pointer', transition: 'all 0.3s'
                                }}
                            >
                                Patient
                            </button>
                            <button
                                type="button"
                                onClick={() => setRole('psychiatrist')}
                                style={{
                                    padding: '0.8rem', borderRadius: '12px', fontSize: '0.85rem', fontWeight: '800', border: '1px solid',
                                    borderColor: role === 'psychiatrist' ? '#A084E8' : 'rgba(255,255,255,0.05)',
                                    background: role === 'psychiatrist' ? 'rgba(160, 132, 232, 0.1)' : 'rgba(255,255,255,0.02)',
                                    color: role === 'psychiatrist' ? '#A084E8' : 'rgba(255,255,255,0.4)',
                                    cursor: 'pointer', transition: 'all 0.3s'
                                }}
                            >
                                Doctor
                            </button>
                        </div>

                        {error && (
                            <div style={{ color: 'var(--emotion-anger)', fontSize: '0.75rem', textAlign: 'center', marginTop: '0.5rem', fontWeight: '600' }}>
                                {error}
                            </div>
                        )}

                        <button 
                            type="submit" 
                            disabled={isLoading}
                            className="glass-button primary"
                            style={{ 
                                marginTop: '1rem', padding: '1.1rem', borderRadius: '16px',
                                background: 'linear-gradient(135deg, #60A5FA, #3B82F6)',
                                border: 'none', color: 'white', fontWeight: '800', fontSize: '1rem',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem',
                                boxShadow: '0 10px 25px rgba(59, 130, 246, 0.3)', cursor: 'pointer'
                            }}
                        >
                            {isLoading ? 'Synchronizing...' : (
                                <>Enter Sanctuary <ArrowRight size={18} /></>
                            )}
                        </button>
                    </form>

                    <div style={{ margin: '2rem 0', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.05)' }} />
                        <span style={{ fontSize: '0.65rem', fontWeight: '800', opacity: 0.3, letterSpacing: '1px' }}>OR CONTINUE WITH</span>
                        <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.05)' }} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <button 
                            onClick={() => handleGoogleLogin()}
                            style={{ padding: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '0.85rem', fontWeight: '700', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', color: 'white', borderRadius: '12px', cursor: 'pointer' }}
                        >
                            <Chrome size={18} /> Google
                        </button>
                        <button style={{ padding: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '0.85rem', fontWeight: '700', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', color: 'white', borderRadius: '12px', cursor: 'pointer' }}>
                            <Github size={18} /> Github
                        </button>
                    </div>
                </div>

                <div style={{ textAlign: 'center', marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div className="glass-panel" style={{ display: 'inline-flex', alignSelf: 'center', padding: '0.5rem 1rem', borderRadius: '100px', alignItems: 'center', gap: '8px', fontSize: '0.65rem', fontWeight: '800', letterSpacing: '0.5px', background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.1)' }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-green)', boxShadow: '0 0 10px var(--accent-green)' }} />
                        CURRENT ATMOSPHERE: <span style={{ color: 'var(--accent-green)' }}>SERENE</span>
                    </div>

                    <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                        Don't have an account? <Link to="/signup" style={{ color: '#3B82F6', fontWeight: '700', textDecoration: 'none' }}>Create an Account</Link>
                    </div>
                    
                    <div style={{ opacity: 0.3, fontSize: '0.6rem', fontWeight: '800', letterSpacing: '2px', display: 'flex', justifyContent: 'center', gap: '2rem' }}>
                        <span>PRIVACY</span>
                        <span>TERMS</span>
                        <span>SUPPORT</span>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default Login;
