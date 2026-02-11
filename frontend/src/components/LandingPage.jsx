import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Activity, MessageSquare, Zap, Shield } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import './LandingPage.css';
import robotMascot from '../assets/robot_mascot.png';
import logoFinal from '../assets/logo_final.png';
import VideoBackground from './VideoBackground';

export default function LandingPage() {
    const { theme } = useTheme();

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.2 }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
    };

    return (
        <motion.div
            className="landing-container"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, ease: "easeInOut" }}
        >
            <VideoBackground />

            {/* Navigation */}
            <nav className="landing-nav">
                <div className="brand-logo" style={{ position: 'relative', height: '140px', width: '140px', animation: 'sphere-levitate 3s ease-in-out infinite' }}>
                    {/* Top Layer: Robot (Original Colors) - Shows top 73% */}
                    <img
                        src={logoFinal}
                        alt="Sentia Robot"
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            height: '100%',
                            width: '100%',
                            objectFit: 'contain',
                            clipPath: 'inset(0 0 27% 0)'
                        }}
                    />
                    {/* Bottom Layer: Text (Adaptive Color) - Shows bottom 27% */}
                    <img
                        src={logoFinal}
                        alt="Sentia Text"
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            height: '100%',
                            width: '100%',
                            objectFit: 'contain',
                            clipPath: 'inset(73% 0 0 0)',
                            filter: theme === 'dark' ? 'brightness(0) invert(1)' : 'brightness(0)'
                        }}
                    />
                </div>
                <div className="nav-links">
                    <Link to="/login" className="nav-item">Log In</Link>
                    <Link to="/signup" className="btn-primary" style={{ padding: '0.6rem 1.5rem', fontSize: '0.9rem' }}>
                        Get Started
                    </Link>
                </div>
            </nav>

            {/* Hero Section */}
            <main className="landing-hero">
                <motion.div
                    className="hero-content"
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                >
                    <motion.div variants={itemVariants} className="hero-pill">
                        ✨ AI-Powered Emotional Intelligence
                    </motion.div>

                    <motion.h1 variants={itemVariants} className="hero-title">
                        Understand the <br />
                        <span>Emotion</span> Behind the Text
                    </motion.h1>

                    <motion.p variants={itemVariants} className="hero-subtitle">
                        Real-time emotion drift analysis for your digital conversations.
                        Detect hidden sentiments, track changes, and improved connection.
                    </motion.p>

                    <motion.div variants={itemVariants} className="cta-group">
                        <Link to="/signup" className="btn-primary">Start Analyzing Now</Link>
                        <Link to="/login" className="btn-secondary">View Demo</Link>
                    </motion.div>
                </motion.div>
            </main>

            {/* Features Grid */}
            <motion.section
                className="features-section"
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
            >
                <div className="feature-card">
                    <div className="feature-icon"><Activity /></div>
                    <h3>Real-time Drift</h3>
                    <p>Track how emotions shift over time with our rigorous drift tracking algorithms.</p>
                </div>

                <div className="feature-card">
                    <div className="feature-icon"><MessageSquare /></div>
                    <h3>Chat Analysis</h3>
                    <p>Paste entire conversations and get a breakdown of the emotional journey.</p>
                </div>

                <div className="feature-card">
                    <div className="feature-icon"><Zap /></div>
                    <h3>Instant Feedback</h3>
                    <p>Get immediate insights into the tone and sentiment of your messages.</p>
                </div>
            </motion.section>
        </motion.div>
    );
}
