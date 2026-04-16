import React from 'react';
import { motion } from 'framer-motion';
import { FileText, Scale, Zap, Globe, ChevronLeft, Cpu, ShieldAlert, Award } from 'lucide-react';
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

export default function TermsOfService() {
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
                            <FileText size={16} />
                            <span className="text-xs font-bold tracking-[0.2em] uppercase">Operational Framework V2.1</span>
                        </motion.div>
                        
                        <motion.h1 variants={itemVariants} className="text-6xl md:text-7xl font-serif font-bold tracking-tight mb-8 leading-[1.1]">
                            Neural Interface <br/>
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-indigo-400 to-purple-400">Authorization Agreement</span>
                        </motion.h1>
                        
                        <motion.p variants={itemVariants} className="text-xl text-zinc-400 leading-relaxed font-light max-w-2xl">
                            The collective protocols and boundaries governing user participation within the Emotion Drift cognitive research network.
                        </motion.p>
                    </header>

                    <div className="space-y-16">
                        <motion.section variants={itemVariants} className="glass-panel p-10 rounded-[2rem] border border-white/5 bg-white/[0.01] backdrop-blur-xl relative group">
                            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 rounded-[2rem]" />
                            
                            <h2 className="text-2xl font-serif font-semibold mb-8 flex items-center gap-4 text-zinc-100">
                                <Award className="text-cyan-400" size={24} />
                                01. The Synchrony Agreement
                            </h2>
                            <div className="space-y-6 text-zinc-400 leading-relaxed relative">
                                <p>
                                    By initializing a neural session (logging in), you enter into a state of Synchrony with the Emotion Drift intelligence engine. This operational framework is a research prototype.
                                </p>
                                <ul className="list-disc list-inside space-y-4 ml-4">
                                    <li><span className="text-white font-medium">Biological Authorization:</span> Use is strictly limited to human biological entities. Synthetic agents must declare identification protocols.</li>
                                    <li><span className="text-white font-medium">Neural Discretion:</span> You acknowledge that emotional vector analysis is probabilistic and not a clinical diagnosis.</li>
                                    <li><span className="text-white font-medium">Protocol Compliance:</span> Misuse of the Sentia AI or attempts to reverse-engineer the drift model result in immediate session termination.</li>
                                </ul>
                            </div>
                        </motion.section>

                        <motion.section variants={itemVariants} className="px-6 relative">
                            <div className="absolute -left-6 top-0 bottom-0 w-px bg-gradient-to-b from-cyan-500/50 via-cyan-500/10 to-transparent" />
                            <h2 className="text-2xl font-serif font-semibold mb-6 flex items-center gap-4">
                                <Cpu className="text-purple-400" size={24} />
                                02. Prohibited Neural Interventions
                            </h2>
                            <p className="text-zinc-400 leading-relaxed italic">
                                Automated extraction of network heuristics, injection of malicious semantic vectors, or unauthorized bypass of optical capture protocols is strictly prohibited.
                            </p>
                        </motion.section>

                        <motion.section variants={itemVariants} className="p-10 border border-red-500/10 bg-red-500/5 rounded-[2rem] relative overflow-hidden">
                             <div className="absolute top-0 right-0 p-8 opacity-10">
                                <ShieldAlert size={80} className="text-red-500" />
                             </div>
                            <h2 className="text-2xl font-serif font-semibold mb-6 text-red-200">03. Non-Clinical Neural Projection</h2>
                            <div className="space-y-4 text-red-100/70 leading-relaxed font-light">
                                <p className="font-bold underline text-red-300">
                                    EMOTION DRIFT IS NOT A SUBSYSTEM OF HEALTHCARE.
                                </p>
                                <p>
                                    The AI therapist (Sentia) and all projected emotional insights are research-style heuristics. We do not provide clinical psychiatric treatment. If you are experiencing a metabolic or cognitive crisis, contact physical emergency services immediately.
                                </p>
                            </div>
                        </motion.section>

                        <motion.section variants={itemVariants} className="px-6 relative">
                            <div className="absolute -left-6 top-0 bottom-0 w-px bg-gradient-to-b from-indigo-500/50 via-indigo-500/10 to-transparent" />
                            <h2 className="text-2xl font-serif font-semibold mb-6">04. Limitation of Operational Liability</h2>
                            <p className="text-zinc-400 leading-relaxed font-light">
                                Neural Drift Technologies holds no metabolic liability for cognitive fluctuations, pattern inaccuracies, or inaccuracies in the AI neural models. The network is provided in an "as-is" state for exploratory inquiry.
                            </p>
                        </motion.section>

                        <motion.section variants={itemVariants} className="px-6 relative">
                            <div className="absolute -left-6 top-0 bottom-0 w-px bg-gradient-to-b from-green-500/50 via-green-500/10 to-transparent" />
                            <h2 className="text-2xl font-serif font-semibold mb-6 flex items-center gap-4">
                                <Globe className="text-indigo-400" size={24} />
                                05. Governing Neural Protocol
                            </h2>
                            <p className="text-zinc-400 leading-relaxed">
                                Disputes regarding the Synchrony Agreement are governed by the ethics of open research and cooperative neural development.
                            </p>
                        </motion.section>

                        <motion.footer variants={itemVariants} className="pt-20 pb-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6 text-zinc-500 text-xs tracking-widest uppercase font-medium">
                            <p>© 2026 NEURAL DRIFT TECHNOLOGIES // OPERATIONAL FRAMEWORK</p>
                            <div className="flex gap-8">
                                <Link to="/privacy" className="hover:text-white transition-colors">NEURAL PROTOCOL</Link>
                                <span className="text-zinc-800">|</span>
                                <span className="text-zinc-600">LAST INITIALIZATION: 2026.03.20</span>
                            </div>
                        </motion.footer>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
