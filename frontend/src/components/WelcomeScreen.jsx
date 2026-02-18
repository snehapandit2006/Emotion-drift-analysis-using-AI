import { useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import AuthContext from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

import logoFinal from '../assets/logo_final.png';

const WelcomeScreen = () => {
    const { user } = useContext(AuthContext);
    const { theme } = useTheme();
    const navigate = useNavigate();
    const name = user ? (user.email.split('@')[0].charAt(0).toUpperCase() + user.email.split('@')[0].slice(1)) : '';

    useEffect(() => {
        if (!user) {
            navigate('/login');
            return;
        }

        const timer = setTimeout(() => {
            if (user.role === 'psychiatrist') {
                navigate('/doctor-dashboard');
            } else {
                navigate('/dashboard');
            }
        }, 4000);

        return () => clearTimeout(timer);
    }, [user, navigate]);

    if (!user) return null;

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100vh',
            background: 'var(--bg-main)',
            color: 'var(--text-main)',
            overflow: 'hidden'
        }}>
            <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 1, ease: 'easeOut' }}
                style={{ marginBottom: '2rem', position: 'relative', width: '200px', height: '200px' }}
            >
                {/* Top Layer: Robot (Original Colors) */}
                <img
                    src={logoFinal}
                    alt="Sentia Robot"
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                        clipPath: 'inset(0 0 27% 0)',
                        filter: 'drop-shadow(0 0 20px var(--accent-color))'
                    }}
                />
                {/* Bottom Layer: Text (Adaptive Color) */}
                <img
                    src={logoFinal}
                    alt="Sentia Text"
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                        clipPath: 'inset(73% 0 0 0)',
                        filter: theme === 'dark' ? 'brightness(0) invert(1) drop-shadow(0 0 20px var(--accent-color))' : 'brightness(0) drop-shadow(0 0 20px var(--accent-color))'
                    }}
                />
            </motion.div>

            <motion.h1
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.8 }}
                style={{ fontSize: '3rem', fontWeight: 'bold', textAlign: 'center' }}
            >
                Welcome, <span style={{ color: 'var(--accent-color)' }}>{name}</span>
            </motion.h1>

            <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.5, duration: 1 }}
                style={{ marginTop: '1rem', fontSize: '1.2rem', color: 'var(--text-secondary)' }}
            >
                Preparing your {user.role === 'psychiatrist' ? 'Doctor' : 'Personal'} Dashboard...
            </motion.p>

            <motion.div
                initial={{ width: 0 }}
                animate={{ width: '200px' }}
                transition={{ delay: 0.5, duration: 3.5, ease: "linear" }}
                style={{
                    marginTop: '3rem',
                    height: '4px',
                    background: 'var(--accent-color)',
                    borderRadius: '2px'
                }}
            />
        </div>
    );
};

export default WelcomeScreen;
