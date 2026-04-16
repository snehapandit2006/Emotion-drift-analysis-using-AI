import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform, AnimatePresence, useSpring, useMotionValueEvent } from 'framer-motion';
import { Activity, MessageSquare, Zap, Shield, Sun, Moon, BrainCircuit, ChevronDown, Cpu, Network, Database, Lock, Eye, BarChart, ArrowRight } from 'lucide-react';
import Brain3D from './Brain3D';
import './LandingPage.css';
import logoFinal from '../assets/logo_final.png';

// Easing curve requested
const cinematicEasing = [0.16, 1, 0.3, 1];

// Staggered text blur animation
const blurVariants = {
    hidden: { filter: 'blur(10px)', opacity: 0, y: 20 },
    visible: { 
        filter: 'blur(0px)', 
        opacity: 1, 
        y: 0, 
        transition: { duration: 1.2, ease: cinematicEasing } 
    }
};

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.15, delayChildren: 0.2 }
    }
};

const fadeUpVariants = {
    hidden: { opacity: 0, y: 40 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: cinematicEasing } }
};

const FAQItem = ({ question, answer }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="faq-item glass-panel">
            <button className="faq-header" onClick={() => setIsOpen(!isOpen)}>
                <span>{question}</span>
                <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.3 }}>
                    <ChevronDown size={20} />
                </motion.div>
            </button>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.4, ease: cinematicEasing }}
                        style={{ overflow: 'hidden' }}
                    >
                        <div className="faq-content">
                            <p style={{ paddingBottom: '1.5rem', margin: 0 }}>{answer}</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default function LandingPage() {
    const heroRef = useRef(null);
    const containerRef = useRef(null);

    // Track scroll of the local container instead of window
    const { scrollYProgress: heroScroll } = useScroll({
        container: containerRef,
        target: heroRef,
        offset: ["start start", "end start"]
    });

    // Use a spring for cinematic, organic assembly feel
    const brainProgress = useSpring(heroScroll, { stiffness: 35, damping: 25, mass: 1 });

    return (
        <div 
            className="landing-container" 
            ref={containerRef}
            style={{ background: '#02040A' }} // Force solid dark background
        >
            {/* 3D Brain Background */}
            <Brain3D progress={brainProgress} />

            {/* Fixed Glass Navigation */}
            <motion.nav 
                className="landing-nav"
                initial={{ y: -100 }}
                animate={{ y: 0 }}
                transition={{ duration: 0.8, ease: cinematicEasing }}
            >
                <Link to="/" className="brand-logo-glass">
                    <BrainCircuit size={28} />
                    <span>Emotion Drift</span>
                </Link>
                <div className="landing-nav-links">
                    <a href="#research" className="landing-nav-item">Research</a>
                    <a href="#systems" className="landing-nav-item">Neural Systems</a>
                    <a href="#technology" className="landing-nav-item">Technology</a>
                    <a href="#insights" className="landing-nav-item">Insights</a>

                    <Link to="/login" className="landing-nav-item">Log In</Link>
                    <Link to="/signup" className="glass-button primary">
                        Sign Up
                    </Link>
                </div>
            </motion.nav>

            {/* Hero Section */}
            <section className="hero-section" ref={heroRef}>
                <motion.div 
                    className="hero-content"
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                >
                    <motion.div variants={blurVariants} className="hero-pill">
                        <Activity size={16} /> Neural Intelligence Engine V2.0
                    </motion.div>

                    <motion.h1 variants={blurVariants} className="hero-title">
                        Mapping the Architecture <br/>
                        <span style={{ fontStyle: 'italic', color: 'rgba(255,255,255,0.7)' }}>of Human Intelligence</span>
                    </motion.h1>

                    <motion.p variants={blurVariants} className="hero-subtitle">
                        A premium neuroscience technology platform exploring cognition, emotional intelligence, and neural AI. Decode the operating system of human intelligence through real-time drift analysis.
                    </motion.p>

                    <motion.div variants={blurVariants} className="cta-group">
                        <Link to="/signup" className="glass-button primary">Sign Up</Link>
                        <Link to="/login" className="glass-button">Log In <ArrowRight size={18} style={{ marginLeft: '8px' }} /></Link>
                    </motion.div>
                </motion.div>
            </section>

            {/* Mission Statement */}
            <motion.section 
                className="mission-section"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-100px" }}
                variants={fadeUpVariants}
            >
                <h2 className="mission-text">
                    Decoding the <span>operating system</span> of human emotion through precision pattern detection and <span>cognitive modeling.</span>
                </h2>
            </motion.section>

            {/* Split Architecture Section */}
            <section id="systems" className="architecture-section">
                <motion.div 
                    className="arch-visual glass-panel"
                    initial={{ opacity: 0, x: -50 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 1, ease: cinematicEasing }}
                >
                     <div style={{ position: 'relative', width: '300px', height: '300px' }}>
                        <img 
                            src={logoFinal} 
                            alt="Neural Engine" 
                            style={{ width: '100%', height: '100%', objectFit: 'contain', filter: 'drop-shadow(0 0 40px rgba(99, 102, 241, 0.4))' }} 
                        />
                     </div>
                </motion.div>

                <motion.div 
                    className="arch-grid"
                    variants={containerVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                >
                    {[ 
                        { icon: <Activity />, title: "Emotion Analysis", desc: "Real-time parsing of multidimensional emotional states." },
                        { icon: <Network />, title: "Cognitive Drift", desc: "Tracking deviations and shifts in cognitive baselines." },
                        { icon: <Zap />, title: "Signal Processing", desc: "High-throughput semantic signal filtering." },
                        { icon: <BrainCircuit />, title: "Adaptive Learning", desc: "Self-optimizing cognitive models based on interaction." },
                        { icon: <Eye />, title: "Behavior Modeling", desc: "Generating predictive models for user behavior." },
                        { icon: <Cpu />, title: "Neural Inference", desc: "Advanced vector embedding abstraction and inference." }
                    ].map((item, i) => (
                        <motion.div key={i} variants={fadeUpVariants} className="arch-card glass-panel">
                            <div className="arch-icon">{item.icon}</div>
                            <h4>{item.title}</h4>
                            <p>{item.desc}</p>
                        </motion.div>
                    ))}
                </motion.div>
            </section>

            {/* Pipeline Timeline */}
            <section id="technology" className="pipeline-section">
                <h2 className="section-title serif-heading" style={{ textAlign: 'center', marginBottom: '2rem' }}>Cognitive Processing Pipeline</h2>
                <div className="timeline-container">
                    {[
                        { num: "01", title: "Signal Capture", desc: "Ingesting high-fidelity semantic and behavioral data streams through a normalized vector interface." },
                        { num: "02", title: "Emotion Interpretation", desc: "Applying multi-layered transformer models to extract latent emotional indicators and tonality." },
                        { num: "03", title: "Pattern Detection", desc: "Identifying cyclical or anomalous cognitive drift against established user baselines." },
                        { num: "04", title: "Predictive Intelligence", desc: "Synthesizing output into actionable psychological models and predictive behavioral forecasting." }
                    ].map((step, i) => (
                        <motion.div 
                            key={i} 
                            className="timeline-item"
                            initial={{ opacity: 0, x: -50 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true, margin: "-100px" }}
                            transition={{ duration: 0.8, delay: i * 0.2, ease: cinematicEasing }}
                        >
                            <div className="timeline-marker">{step.num}</div>
                            <div className="timeline-content">
                                <h3 className="serif-heading">{step.title}</h3>
                                <p style={{ fontSize: '1.1rem', color: 'var(--text-body)', maxWidth: '600px', lineHeight: 1.6 }}>{step.desc}</p>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* Research Domains Bento Grid */}
            <section id="research" className="landing-bento-section">
                <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
                    <h2 className="section-title serif-heading">Research Domains</h2>
                    <p style={{ color: 'var(--text-body)', fontSize: '1.2rem' }}>Pioneering intersections of neuroscience and artificial cognition.</p>
                </div>

                <motion.div 
                    className="landing-bento-grid"
                    variants={containerVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                >
                    <motion.div variants={fadeUpVariants} className="landing-bento-item large glass-panel" style={{ background: 'var(--glass-bg)' }}>
                        <BrainCircuit size={48} style={{ color: 'var(--text-heading)', marginBottom: '1rem' }} />
                        <div>
                            <h3 className="serif-heading">Emotional Intelligence Integration</h3>
                            <p>Developing systems that don't just compute data, but comprehend human nuance, context, and emotional subtext dynamically.</p>
                        </div>
                    </motion.div>
                    
                    <motion.div variants={fadeUpVariants} className="landing-bento-item medium glass-panel">
                        <Network size={32} style={{ color: '#D946EF', marginBottom: '1rem' }} />
                        <h3 className="serif-heading">Neural AI Systems</h3>
                        <p>Architecting bio-mimetic network structures for processing.</p>
                    </motion.div>

                    <motion.div variants={fadeUpVariants} className="landing-bento-item glass-panel">
                        <Activity size={32} style={{ color: '#38BDF8', marginBottom: '1rem' }} />
                        <h3 className="serif-heading">Drift Analysis</h3>
                        <p>Quantifying cognitive state changes over temporal axes.</p>
                    </motion.div>

                    <motion.div variants={fadeUpVariants} className="landing-bento-item glass-panel">
                        <MessageSquare size={32} style={{ color: '#4ADE80', marginBottom: '1rem' }} />
                        <h3 className="serif-heading">Human-AI Interaction</h3>
                        <p>Frictionless interfaces bypassing traditional syntactical barriers.</p>
                    </motion.div>
                </motion.div>
            </section>

            {/* FAQ Accordion */}
            <section id="insights" className="faq-section">
                <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
                    <h2 className="section-title serif-heading">System Parameters</h2>
                    <p style={{ color: 'var(--text-body)', fontSize: '1.2rem' }}>Operational inquiries and technical specifications.</p>
                </div>

                <motion.div 
                    variants={containerVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
                >
                    <FAQItem 
                        question="How does Emotion Drift maintain privacy and data security?" 
                        answer="All semantic inputs are processed using localized embeddings and ephemeral in-memory processing. Data is stripped of PII prior to dimensional reduction, ensuring cognitive models are entirely anonymous and secure." 
                    />
                    <FAQItem 
                        question="What is the latency of the cognitive analysis pipeline?" 
                        answer="The core neural engine operates with a sub-200ms processing delay, making drift detection and signal routing feasible for real-time applications and live conversation intelligence." 
                    />
                    <FAQItem 
                        question="Can the platform detect masked or layered emotions?" 
                        answer="Yes. Our transformer models are trained on multilayered subtext, allowing the system to untangle conflicting emotional signals (e.g., surface-level agreement masking underlying hesitation)." 
                    />
                    <FAQItem 
                        question="Is the system compatible with custom sensory inputs?" 
                        answer="We current support semantic (text) inputs, with expanding architectural readiness for biometric parity (heart rate, GSR, optical tracking) in upcoming iterations." 
                    />
                </motion.div>
            </section>

            {/* Sophisticated Footer */}
            <footer className="landing-footer">
                <div className="footer-top">
                    <div className="footer-brand">
                        <div className="brand-logo-glass">
                            <BrainCircuit size={28} />
                            <span>Emotion Drift</span>
                        </div>
                        <p style={{ color: 'var(--text-body)', marginTop: '1.5rem', lineHeight: 1.6 }}>
                            Decoding the architecture of human intelligence. A cognitive research initiative leveraging real-time neural mapping sequences.
                        </p>
                    </div>

                    <div>
                        <h4 className="footer-heading serif-heading">Research</h4>
                        <ul className="footer-links">
                            <li><a href="#">Publications</a></li>
                            <li><a href="#">Neural Models</a></li>
                            <li><a href="#">Drift Theory</a></li>
                            <li><a href="#">Open Datasets</a></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="footer-heading serif-heading">Company</h4>
                        <ul className="footer-links">
                            <li><a href="#">About Us</a></li>
                            <li><a href="#">Careers</a></li>
                            <li><a href="#">Press</a></li>
                            <li><a href="#">Contact</a></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="footer-heading serif-heading">Network Initialization</h4>
                        <p style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>Join the cognitive research digest.</p>
                        <div className="newsletter-form">
                            <input type="email" placeholder="Email Address" className="newsletter-input" />
                            <button className="glass-button primary" style={{ padding: '0.8rem 1.2rem' }}>
                                <ArrowRight size={18} />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="footer-bottom">
                    <span>&copy; {new Date().getFullYear()} Emotion Drift Technologies. All rights reserved.</span>
                    <div style={{ display: 'flex', gap: '1.5rem' }}>
                        <a href="#" style={{ color: 'var(--text-body)', textDecoration: 'none' }}>Privacy Policy</a>
                        <a href="#" style={{ color: 'var(--text-body)', textDecoration: 'none' }}>Terms of Service</a>
                    </div>
                </div>
            </footer>
        </div>
    );
}
