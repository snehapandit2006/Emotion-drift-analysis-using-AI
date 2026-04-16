import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Lock, Eye, FileText, ChevronLeft, Zap, Database, Activity } from 'lucide-react';
import { Link } from 'react-router-dom';
import NeuralBackground from '../components/NeuralBackground';

const cinematicEasing = [0.16, 1, 0.3, 1];

const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
        opacity: 1, 
        transition: { staggerChildren: 0.1, delayChildren: 0.2 } 
    }
};

const itemVariants = {
    hidden: { opacity: 0, y: 20, filter: 'blur(10px)' },
    visible: { 
        opacity: 1, 
        y: 0, 
        filter: 'blur(0px)',
        transition: { duration: 0.8, ease: cinematicEasing } 
    }
};

export default function PrivacyPolicy() {
    return (
        <div className="min-h-screen bg-[#02040A] text-white relative overflow-hidden selection:bg-indigo-500/30">
            {/* Cinematic Neural Background */}
            <NeuralBackground />

            <div className="relative z-10 p-8 md:p-16 lg:p-24">
                <motion.div 
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="max-w-4xl mx-auto"
                >
                    <motion.div variants={itemVariants}>
                        <Link to="/" className="inline-flex items-center gap-2 text-zinc-400 hover:text-indigo-400 transition-colors mb-12 group">
                            <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                            <span className="text-sm font-medium tracking-widest uppercase">RETURN TO NETWORK</span>
                        </Link>
                    </motion.div>

                    <header className="mb-20">
                        <motion.div variants={itemVariants} className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mb-8">
                            <Shield size={16} />
                            <span className="text-xs font-bold tracking-[0.2em] uppercase">Neural Protocol V2.1</span>
                        </motion.div>
                        
                        <motion.h1 variants={itemVariants} className="text-6xl md:text-7xl font-serif font-bold tracking-tight mb-8 leading-[1.1]">
                            Privacy & <br/>
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400">Cognitive Sovereignty</span>
                        </motion.h1>
                        
                        <motion.p variants={itemVariants} className="text-xl text-zinc-400 leading-relaxed font-light max-w-2xl">
                            A disclosure of the operational parameters governing the Extraction, Analysis, and Safeguarding of the human emotional baseline within the Emotion Drift intelligence engine.
                        </motion.p>
                    </header>

                    <div className="space-y-16">
                        <motion.section variants={itemVariants} className="glass-panel p-10 rounded-[2rem] border border-white/5 bg-white/[0.01] backdrop-blur-xl relative group">
                            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 rounded-[2rem]" />
                            
                            <h2 className="text-2xl font-serif font-semibold mb-8 flex items-center gap-4 text-zinc-100">
                                <Zap className="text-indigo-400" size={24} />
                                01. Dimensional Extraction
                            </h2>
                            <div className="space-y-6 text-zinc-400 leading-relaxed relative">
                                <p>
                                    The Emotion Drift engine harvests high-fidelity semantic and behavioral vectors to map the user's emotional topography. This extraction includes:
                                </p>
                                <div className="grid md:grid-cols-2 gap-6">
                                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                                        <h4 className="text-white font-medium mb-2 flex items-center gap-2">
                                            <Database size={16} className="text-purple-400" />
                                            Semantic Ingestion
                                        </h4>
                                        <p className="text-sm italic">Analysis of text-based neural outputs during chat interactions to identify latent emotional subtext.</p>
                                    </div>
                                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                                        <h4 className="text-white font-medium mb-2 flex items-center gap-2">
                                            <Eye size={16} className="text-cyan-400" />
                                            Optical Capture
                                        </h4>
                                        <p className="text-sm italic">Snapshot-based facial vector tracking via webcam. Strictly ephemeral and triggered only by manual authorization.</p>
                                    </div>
                                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                                        <h4 className="text-white font-medium mb-2 flex items-center gap-2">
                                            <Activity size={16} className="text-rose-400" />
                                            Biometric Proxies
                                        </h4>
                                        <p className="text-sm italic">Monitoring of heart rate and SpO2 levels to provide metabolic context for detected cognitive drift.</p>
                                    </div>
                                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                                        <h4 className="text-white font-medium mb-2 flex items-center gap-2">
                                            <Lock size={16} className="text-indigo-400" />
                                            Identity Nodes
                                        </h4>
                                        <p className="text-sm italic">Basic account identifiers required for neural session persistence and cross-network intelligence.</p>
                                    </div>
                                </div>
                            </div>
                        </motion.section>

                        <motion.section variants={itemVariants} className="px-6 relative">
                            <div className="absolute -left-6 top-0 bottom-0 w-px bg-gradient-to-b from-indigo-500/50 via-indigo-500/10 to-transparent" />
                            <h2 className="text-2xl font-serif font-semibold mb-6 flex items-center gap-4">
                                <Shield className="text-cyan-400" size={24} />
                                02. Synaptic Safeguards
                            </h2>
                            <p className="text-zinc-400 leading-relaxed">
                                Your cognitive data is decoupled from the user node. We employ localized vector embedding and neural decoupling protocols to ensure that detected patterns remain anonymous. PII is never fused with the emotional analytics layer, preserving the integrity of your neural identity.
                            </p>
                        </motion.section>

                        <motion.section variants={itemVariants} className="px-6 relative">
                            <div className="absolute -left-6 top-0 bottom-0 w-px bg-gradient-to-b from-purple-500/50 via-purple-500/10 to-transparent" />
                            <h2 className="text-2xl font-serif font-semibold mb-6">03. Intent of Analysis</h2>
                            <p className="text-zinc-400 leading-relaxed">
                                All harvested data is utilized strictly for the optimization of the human experience within the Drift environment including real-time sentiment forecasting and automated support triggering.
                            </p>
                        </motion.section>

                        <motion.section variants={itemVariants} className="p-10 border border-amber-500/10 bg-amber-500/5 rounded-[2rem] relative overflow-hidden">
                             <div className="absolute top-0 right-0 p-8 opacity-10">
                                <Activity size={80} className="text-amber-500" />
                             </div>
                            <h2 className="text-2xl font-serif font-semibold mb-6 text-amber-200">04. Limitation of Intelligence</h2>
                            <p className="text-amber-100/70 text-sm leading-relaxed italic max-w-2xl font-light">
                                PERCEPTION VS. DIAGNOSIS: The Emotion Drift engine provides probabilistic modeling of detected affective states. This is NOT a clinical evaluation. It is a research-style neural projection intended for self-optimization and educational inquiry only.
                            </p>
                        </motion.section>

                        <motion.footer variants={itemVariants} className="pt-20 pb-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6 text-zinc-500 text-xs tracking-widest uppercase font-medium">
                            <p>© 2026 NEURAL DRIFT TECHNOLOGIES // DECODING THE HUMAN OS</p>
                            <div className="flex gap-8">
                                <Link to="/terms" className="hover:text-white transition-colors">OPERATIONAL FRAMEWORK</Link>
                                <span className="text-zinc-800">|</span>
                                <span className="text-zinc-600">LAST SYNC: 2026.03.20</span>
                            </div>
                        </motion.footer>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
