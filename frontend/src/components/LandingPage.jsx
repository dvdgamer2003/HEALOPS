import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export default function LandingPage({ onStart }) {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        setIsVisible(true);
    }, []);

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { duration: 1 }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 }
    };

    return (
        <motion.div
            className="min-h-screen bg-[#0A0A0B] text-white flex flex-col relative overflow-hidden font-sans selection:bg-brand-500/30"
            variants={containerVariants}
            initial="hidden"
            animate={isVisible ? "visible" : "hidden"}
        >
            {/* Background Effects */}
            <div className="fixed inset-0 pointer-events-none z-0" aria-hidden="true">
                <div className="absolute top-[-20%] left-[-10%] w-[1000px] h-[1000px] bg-brand-600/10 rounded-full blur-[180px] animate-pulse" style={{ animationDuration: '10s' }} />
                <div className="absolute bottom-[-20%] right-[-10%] w-[800px] h-[800px] bg-purple-600/10 rounded-full blur-[160px] animate-pulse" style={{ animationDuration: '12s' }} />
                <div className="absolute top-[30%] left-[50%] w-[600px] h-[600px] bg-emerald-600/5 rounded-full blur-[150px] mix-blend-screen" />
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTAgMGg0MHY0MEgwVjB6bTM5IDM5VjFoLTM4djM4aDM4eiIgZmlsbD0icmdiYSgyNTUsIDI1NSwgMjU1LCAwLjAyKSIgZmlsbC1ydWxlPSJldmVub2RkIi8+PC9zdmc+')] opacity-30" />
            </div>

            {/* Glowing Top Border */}
            <div className="h-1 w-full bg-gradient-to-r from-transparent via-brand-500 to-transparent opacity-50 absolute top-0 z-50"></div>

            {/* Premium Top Navigation */}
            <motion.nav
                className="relative z-50 w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between"
                variants={itemVariants}
                transition={{ duration: 0.6 }}
            >
                <div className="flex items-center gap-3 w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-purple-600 justify-center shadow-lg shadow-brand-500/30 border border-white/10 group cursor-pointer hover:scale-105 transition-transform">
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                </div>
                <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-400">
                    <a href="#" className="hover:text-white transition-colors">Documentation</a>
                    <a href="#" className="hover:text-white transition-colors">Features</a>
                    <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors flex items-center gap-2">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                        </svg>
                        Source
                    </a>
                </div>
            </motion.nav>

            <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 pt-12 pb-24 text-center w-full max-w-6xl mx-auto">
                {/* Badge */}
                <motion.div
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-300 text-xs font-bold tracking-widest uppercase mb-8 backdrop-blur-sm shadow-[0_0_15px_rgba(56,189,248,0.15)]"
                    variants={itemVariants}
                    transition={{ duration: 0.5, delay: 0.1 }}
                >
                    <span className="w-2 h-2 bg-brand-400 rounded-full animate-pulse shadow-[0_0_10px_rgba(56,189,248,0.8)]" aria-hidden="true" />
                    v2.0 · Mistral AI Powered
                </motion.div>

                <motion.h1
                    className="text-5xl md:text-7xl lg:text-8xl font-black text-white tracking-tight leading-[1.05] mb-8 max-w-5xl"
                    variants={itemVariants}
                    transition={{ duration: 0.6, delay: 0.2 }}
                >
                    Autonomous <br className="hidden md:block" />
                    <span className="bg-gradient-to-r from-brand-300 via-brand-500 to-purple-500 bg-clip-text text-transparent inline-block pb-2">
                        CI/CD Self-Healing
                    </span>
                </motion.h1>

                <motion.p
                    className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed mb-14 font-medium"
                    variants={itemVariants}
                    transition={{ duration: 0.6, delay: 0.3 }}
                >
                    Connect your GitHub repository and let HEALOPS automatically clone, analyze, test, and repair broken pipelines using advanced AI. Verified fixes are committed directly, saving you hours of debugging.
                </motion.p>

                <motion.div
                    variants={itemVariants}
                    transition={{ duration: 0.6, delay: 0.4 }}
                    className="relative group"
                >
                    <div className="absolute -inset-1 bg-gradient-to-r from-brand-500 to-purple-600 rounded-2xl blur opacity-30 group-hover:opacity-60 transition duration-500"></div>
                    <button
                        onClick={onStart}
                        className="relative flex items-center justify-center gap-3 px-10 py-5 font-bold text-white transition-all bg-surface-900 rounded-2xl hover:bg-surface-800 border border-white/5"
                    >
                        <span className="text-lg tracking-wide">Initialize Agent Engine</span>
                        <svg className="w-5 h-5 transition-transform group-hover:translate-x-1 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                    </button>
                </motion.div>

                {/* Glassmorphic Features Grid */}
                <div className="mt-32 grid grid-cols-1 md:grid-cols-3 gap-6 w-full text-left">
                    {[
                        {
                            title: 'Code Bug Detection',
                            desc: 'Automatically discovers tests and performs deep stack-trace analysis of codebase failures.',
                            icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
                            color: 'text-brand-400',
                            bg: 'bg-brand-500/10'
                        },
                        {
                            title: 'Generative AI Fixes',
                            desc: 'Mistral AI synthesizes missing test coverage and authors syntactically verified code patches.',
                            icon: 'M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z',
                            color: 'text-purple-400',
                            bg: 'bg-purple-500/10'
                        },
                        {
                            title: 'Zero-touch CI/CD',
                            desc: 'Securely pushes verified code via GitHub PAT and continuously monitors your integration pipeline.',
                            icon: 'M5 13l4 4L19 7',
                            color: 'text-emerald-400',
                            bg: 'bg-emerald-500/10'
                        }
                    ].map((feat, i) => (
                        <motion.div
                            key={i}
                            className="bg-white/[0.02] backdrop-blur-xl border border-white/[0.05] rounded-3xl p-8 hover:bg-white/[0.04] transition-all duration-300 group cursor-default shadow-2xl shadow-black/50"
                            variants={itemVariants}
                            transition={{ duration: 0.6, delay: 0.5 + (i * 0.1) }}
                            whileHover={{ y: -5 }}
                        >
                            <div className={`w-12 h-12 rounded-2xl ${feat.bg} flex items-center justify-center mb-6 ${feat.color} group-hover:scale-110 transition-transform duration-300 border border-white/5`}>
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d={feat.icon} />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold mb-3 text-white tracking-tight">{feat.title}</h3>
                            <p className="text-base text-gray-400 leading-relaxed font-medium">{feat.desc}</p>
                        </motion.div>
                    ))}
                </div>
            </main>
        </motion.div>
    );
}
