import { useEffect, useState } from 'react';
import LandingPage from './components/LandingPage';
import InputSection from './components/InputSection';
import PipelineProgress from './components/PipelineProgress';
import ActivityLog from './components/ActivityLog';
import RunSummaryCard from './components/RunSummaryCard';
import ScoreBreakdownPanel from './components/ScoreBreakdownPanel';
import FixesAppliedTable from './components/FixesAppliedTable';
import CICDTimeline from './components/CICDTimeline';
import useAgentStore from './store/useAgentStore';
import { useSound } from './hooks/useSound';
import { resumeAgent, stopAgent } from './services/api';
import { motion, AnimatePresence } from 'framer-motion';

export default function App() {
    const { runId, results, status, currentStep, startPolling, setRunId, completionToast, dismissToast } = useAgentStore();
    const { playClick, playCompletion } = useSound();
    const [isResuming, setIsResuming] = useState(false);
    const [isStopping, setIsStopping] = useState(false);

    // Simple state-based router
    const [currentView, setCurrentView] = useState('landing'); // 'landing' | 'dashboard'

    // Global click listener for interactive elements
    useEffect(() => {
        const handleClick = (e) => {
            const isButton = e.target.closest('button') ||
                e.target.closest('[role="button"]') ||
                e.target.tagName.toLowerCase() === 'a';
            if (isButton && currentView === 'dashboard') {
                playClick();
            }
        };
        document.addEventListener('click', handleClick);
        return () => document.removeEventListener('click', handleClick);
    }, [playClick, currentView]);

    // Pipeline completion listener
    useEffect(() => {
        if (status === 'PASSED' || status === 'FAILED' || status === 'AWAITING_APPROVAL') {
            playCompletion();
        }
    }, [status, playCompletion]);

    const handleApproval = async (approve) => {
        if (!runId) return;
        setIsResuming(true);
        try {
            await resumeAgent(runId, approve);
            startPolling(); // Resume polling to catch the next updates
        } catch (error) {
            console.error("Failed to resume agent:", error);
        } finally {
            setIsResuming(false);
        }
    };

    const handleStop = async () => {
        if (!runId) return;

        // Confirm before stopping
        if (!window.confirm("Are you sure you want to forcefully stop the agent?")) return;

        setIsStopping(true);
        try {
            await stopAgent(runId);
            // The polling loop will automatically pick up the ABORTED status on next tick
            // and the UI will reflect this.
        } catch (error) {
            console.error("Failed to stop agent:", error);
            alert("Error trying to stop the agent.");
        } finally {
            setIsStopping(false);
        }
    };

    return (
        <AnimatePresence mode="wait">
            {currentView === 'landing' ? (
                <LandingPage key="landing" onStart={() => setCurrentView('dashboard')} />
            ) : (
                <motion.div
                    key="dashboard"
                    className="min-h-screen bg-surface-950"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.02 }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                >
                    {/* Skip-to-content */}
                    <a href="#main-content" className="skip-link">Skip to main content</a>

                    {/* Background glows */}
                    <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
                        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-brand-600/8 rounded-full blur-[140px]" />
                        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-600/8 rounded-full blur-[140px]" />
                        <div className="absolute top-[40%] left-[50%] w-[300px] h-[300px] bg-emerald-600/5 rounded-full blur-[100px]" />
                    </div>

                    {/* Approval Modal */}
                    <AnimatePresence>
                        {status === 'AWAITING_APPROVAL' && (
                            <motion.div
                                className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.2 }}
                            >
                                <motion.div
                                    className="bg-surface-900 border border-brand-500/30 w-full max-w-md rounded-2xl shadow-2xl p-6 relative overflow-hidden"
                                    initial={{ scale: 0.95, y: 20 }}
                                    animate={{ scale: 1, y: 0 }}
                                    exit={{ scale: 0.95, y: 20 }}
                                >
                                    <div className="absolute inset-0 bg-gradient-to-br from-brand-500/10 to-transparent pointer-events-none" />

                                    <div className="relative z-10">
                                        <div className="w-12 h-12 rounded-full bg-brand-500/20 text-brand-400 flex items-center justify-center mb-4 border border-brand-500/30 shadow-lg shadow-brand-500/20">
                                            <svg className="w-6 h-6 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </div>

                                        <h3 className="text-xl font-bold text-white mb-2">Ready to Commit!</h3>
                                        <p className="text-gray-300 text-sm mb-6 leading-relaxed">
                                            The agent has successfully completed local testing and generated a verified fix.
                                            Do you want to commit these changes and push them to your repository?
                                        </p>

                                        <div className="flex gap-3 mt-8">
                                            <button
                                                onClick={() => handleApproval(false)}
                                                disabled={isResuming}
                                                className="flex-1 px-4 py-2.5 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 font-semibold transition-colors disabled:opacity-50"
                                            >
                                                ❌ No, Abort
                                            </button>
                                            <button
                                                onClick={() => handleApproval(true)}
                                                disabled={isResuming}
                                                className="flex-1 px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold shadow-lg shadow-brand-500/30 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                            >
                                                {isResuming ? (
                                                    <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                                                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                                                        <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
                                                    </svg>
                                                ) : (
                                                    <>✅ Yes, Commit</>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* ── Completion Toast Banner ── */}
                    <AnimatePresence>
                        {completionToast && (
                            <motion.div
                                className={`fixed top-5 right-5 z-[60] max-w-sm w-full rounded-2xl shadow-2xl border backdrop-blur-xl px-5 py-4 flex items-start gap-4 ${completionToast.type === 'success'
                                        ? 'bg-emerald-950/90 border-emerald-500/40 shadow-emerald-500/20'
                                        : completionToast.type === 'error'
                                            ? 'bg-red-950/90 border-red-500/40 shadow-red-500/20'
                                            : 'bg-surface-900/90 border-yellow-500/40 shadow-yellow-500/20'
                                    }`}
                                initial={{ opacity: 0, x: 80, scale: 0.95 }}
                                animate={{ opacity: 1, x: 0, scale: 1 }}
                                exit={{ opacity: 0, x: 80, scale: 0.95 }}
                                transition={{ type: 'spring', stiffness: 250, damping: 25 }}
                            >
                                <div className="flex-1">
                                    <p className={`text-sm font-semibold leading-relaxed ${completionToast.type === 'success' ? 'text-emerald-200'
                                            : completionToast.type === 'error' ? 'text-red-200'
                                                : 'text-yellow-200'
                                        }`}>
                                        {completionToast.message}
                                    </p>
                                    {completionToast.type === 'success' && (
                                        <p className="text-xs text-emerald-400/70 mt-1">Results are now visible in the dashboard panel.</p>
                                    )}
                                </div>
                                <button
                                    onClick={dismissToast}
                                    className="text-gray-400 hover:text-white transition-colors mt-0.5 shrink-0"
                                    aria-label="Dismiss notification"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Content */}
                    <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">

                        {/* ── Premium Navbar ── */}
                        <header className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-6 glass-card px-8 py-5 border-white/10" role="banner">
                            <div className="flex items-center gap-5 relative cursor-pointer group" onClick={() => setCurrentView('landing')}>
                                <div className="absolute -inset-4 bg-brand-500/10 rounded-full blur-xl animate-pulse group-hover:bg-brand-500/20 transition-colors" />
                                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center shadow-lg shadow-brand-500/30 relative border border-white/10 ring-1 ring-white/5">
                                    <svg className="w-7 h-7 text-white drop-shadow-md" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                </div>
                                <div className="relative">
                                    <h1 className="text-2xl font-black text-white tracking-tight leading-tight flex items-center gap-3">
                                        HEALOPS
                                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-brand-500/20 text-brand-300 border border-brand-500/30 tracking-widest uppercase shadow-inner">Beta</span>
                                    </h1>
                                    <p className="text-sm font-semibold text-brand-400/80 tracking-widest uppercase mt-0.5">Intelligence Dashboard</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                {/* Only show Stop button if a run is actually active/running */}
                                {(status === 'RUNNING' || status === 'PENDING' || status === 'AWAITING_APPROVAL') && (
                                    <button
                                        onClick={handleStop}
                                        disabled={isStopping}
                                        className="flex items-center gap-2 px-4 py-2 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 font-semibold transition-colors disabled:opacity-50 shadow-lg shadow-red-500/10"
                                    >
                                        {isStopping ? (
                                            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                                                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                                                <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
                                            </svg>
                                        ) : (
                                            "🛑 Stop Agent"
                                        )}
                                    </button>
                                )}

                                <button
                                    onClick={() => setCurrentView('landing')}
                                    className="flex items-center gap-2 text-gray-400 hover:text-white transition-all group px-5 py-2.5 rounded-xl hover:bg-surface-800/80 active:scale-95 border border-transparent hover:border-white/5"
                                >
                                    <svg className="w-4 h-4 transform group-hover:-translate-x-1.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                    </svg>
                                    <span className="font-semibold text-sm tracking-wide">Return to Home</span>
                                </button>
                            </div>
                        </header>

                        {/* ── Dashboard Grid ── */}
                        <main id="main-content" role="main">
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                                {/* Left Column */}
                                <div className="lg:col-span-5 space-y-6">
                                    <InputSection />
                                    <PipelineProgress />
                                    <ActivityLog />
                                </div>

                                {/* Right Column */}
                                <div className="lg:col-span-7 space-y-6">
                                    {results || (status === 'FAILED' || status === 'ABORTED' || status === 'REJECTED') ? (
                                        <motion.div
                                            className="space-y-6"
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.5, ease: 'easeOut' }}
                                        >
                                            <RunSummaryCard />
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <ScoreBreakdownPanel />
                                                <CICDTimeline />
                                            </div>
                                            <FixesAppliedTable />
                                        </motion.div>
                                    ) : (
                                        /* Redesigned Premium Empty State / Waiting Screen */
                                        <motion.div
                                            className="sticky top-8 premium-box min-h-[700px] flex flex-col overflow-hidden group"
                                            initial={{ opacity: 0, scale: 0.98 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{ duration: 0.7, ease: "easeOut" }}
                                        >
                                            {/* Glowing Grid Background inside Box */}
                                            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTAgMGg0MHY0MEgwVjB6bTM5IDM5VjFoLTM4djM4aDM4eiIgZmlsbD0icmdiYSgyNTUsIDI1NSwgMjU1LCAwLjAxKSIgZmlsbC1ydWxlPSJldmVub2RkIi8+PC9zdmc+')] opacity-50 z-0 pointer-events-none" />

                                            {/* Top Animated Progress Bar */}
                                            <div className="relative w-full h-1.5 bg-surface-900 border-b border-white/5 z-20">
                                                <div className={`h-full bg-gradient-to-r from-brand-500 via-purple-500 to-pink-500 transition-all duration-1000 ${status === 'RUNNING' ? 'w-full animate-[shimmer_2s_infinite] shadow-[0_0_15px_rgba(168,85,247,0.8)]' : 'w-0'}`} />
                                            </div>

                                            <motion.div
                                                className="flex-1 flex flex-col items-center justify-center p-12 text-center relative z-10"
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                transition={{ delay: 0.3, duration: 0.8 }}
                                            >

                                                {/* Dynamic Status Icon Hero */}
                                                <div className="relative mb-12 flex justify-center w-full">
                                                    {status === 'RUNNING' ? (
                                                        <div className="relative flex items-center justify-center">
                                                            <div className="absolute inset-0 rounded-full border border-brand-500/40 animate-ping" style={{ animationDuration: '2.5s' }} />
                                                            <div className="absolute inset-[-24px] rounded-full border border-purple-500/20 animate-[spin_10s_linear_infinite]" />
                                                            <div className="absolute inset-[-48px] rounded-full border border-emerald-500/10 animate-[spin_15s_linear_infinite_reverse]" />
                                                            <div className="w-28 h-28 bg-gradient-to-br from-brand-600/20 to-purple-600/20 rounded-full flex items-center justify-center backdrop-blur-xl border border-brand-400/30 shadow-[0_0_40px_rgba(99,102,241,0.2)]">
                                                                <svg className="w-14 h-14 text-brand-300 animate-pulse drop-shadow-lg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                                                </svg>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <motion.div
                                                            className="relative flex items-center justify-center"
                                                            animate={{ y: [0, -12, 0] }}
                                                            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
                                                        >
                                                            <div className="absolute inset-0 bg-brand-500/5 blur-[40px] rounded-full" />
                                                            <div className="w-32 h-32 bg-surface-900/40 backdrop-blur-2xl shadow-2xl rounded-full flex items-center justify-center border border-white/5 opacity-80 ring-1 ring-white/[0.03]">
                                                                <svg className="w-14 h-14 text-gray-500/80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                                                                </svg>
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </div>

                                                <motion.h2
                                                    className={`text-4xl font-extrabold tracking-tight mb-5 drop-shadow-md ${status === 'RUNNING' ? 'text-white' : 'text-gray-200'}`}
                                                    initial={{ opacity: 0, y: 15 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: 0.4, type: "spring", stiffness: 200 }}
                                                >
                                                    {status === 'RUNNING' ? 'Agent Pipeline Active' : 'Awaiting Target Vectors'}
                                                </motion.h2>
                                                <motion.p
                                                    className="text-gray-400 text-base max-w-md mx-auto leading-relaxed mb-14 font-medium"
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    transition={{ delay: 0.5 }}
                                                >
                                                    {status === 'RUNNING'
                                                        ? currentStep ? `Currently executing: ${currentStep}. Sub-routine analytical data will populate here securely upon completion.` : 'Processing repository and mapping initial codebase structure...'
                                                        : 'Enter configuration coordinates on the left to initialize the Mistral AI healing agent. Real-time metrics, runtime analysis, and dynamic intelligence will appear here.'}
                                                </motion.p>

                                                {/* Status Track Vertical Steps */}
                                                <motion.div
                                                    className="w-full max-w-md bg-surface-900/30 backdrop-blur-md border border-white/[0.02] rounded-3xl p-6 flex flex-col gap-6 text-left relative overflow-hidden shadow-inner"
                                                    initial="hidden"
                                                    animate="visible"
                                                    variants={{
                                                        hidden: { opacity: 0 },
                                                        visible: { opacity: 1, transition: { staggerChildren: 0.15, delayChildren: 0.5 } }
                                                    }}
                                                >
                                                    {status === 'RUNNING' && <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/10 blur-[50px] pointer-events-none" />}
                                                    {[
                                                        { label: 'Initialization & Clone', active: status === 'RUNNING' || currentStep?.includes('Clone') },
                                                        { label: 'Static & Runtime Analysis', active: status === 'RUNNING' && (currentStep?.includes('Test') || currentStep?.includes('Valid')) },
                                                        { label: 'Mistral AI Patch Generation', active: status === 'RUNNING' && currentStep?.includes('Fix') },
                                                        { label: 'CI/CD Pipeline Verification', active: status === 'RUNNING' && currentStep?.includes('Verify') }
                                                    ].map((phase, i) => (
                                                        <motion.div
                                                            key={i}
                                                            className={`flex items-center gap-5 transition-all duration-700 relative z-10 ${phase.active ? 'opacity-100 scale-105 transform origin-left drop-shadow-lg' : 'opacity-30'}`}
                                                            variants={{
                                                                hidden: { opacity: 0, x: -30 },
                                                                visible: { opacity: phase.active ? 1 : 0.4, x: 0 }
                                                            }}
                                                        >
                                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border font-mono text-sm font-bold transition-all duration-500 shadow-md ${phase.active ? 'bg-gradient-to-br from-brand-500 to-purple-600 border-white/20 text-white shadow-brand-500/40 ring-4 ring-brand-500/10' : 'bg-surface-800 border-white/5 text-gray-500'}`}>
                                                                0{i + 1}
                                                            </div>
                                                            <span className={`text-base font-bold tracking-wide transition-colors ${phase.active ? 'text-white' : 'text-gray-500'}`}>
                                                                {phase.label}
                                                            </span>
                                                        </motion.div>
                                                    ))}
                                                </motion.div>

                                            </motion.div>
                                        </motion.div>
                                    )}
                                </div>
                            </div>
                        </main>

                        {/* Footer */}
                        <footer className="mt-16 pb-4 text-center text-xs text-gray-700" role="contentinfo">
                            <span className="text-gray-600 font-semibold">HEALOPS</span>
                            {' · '}Autonomous CI/CD Healing Agent
                            {' · '}React · LangGraph · Mistral AI · MongoDB
                        </footer>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
