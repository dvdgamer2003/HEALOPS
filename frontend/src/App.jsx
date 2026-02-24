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
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.4 }}
                >
                    <a href="#main-content" className="skip-link">Skip to main content</a>

                    {/* Ambient background blobs */}
                    <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
                        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-brand-600/6 rounded-full blur-[160px]" />
                        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-purple-600/6 rounded-full blur-[140px]" />
                        <div className="absolute top-1/2 left-3/4 w-[250px] h-[250px] bg-emerald-600/4 rounded-full blur-[100px]" />
                    </div>

                    {/* Approval Modal */}
                    <AnimatePresence>
                        {status === 'AWAITING_APPROVAL' && (
                            <motion.div
                                className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4"
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            >
                                <motion.div
                                    className="relative w-full max-w-md rounded-3xl overflow-hidden"
                                    initial={{ scale: 0.92, y: 24 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, y: 24 }}
                                    transition={{ type: 'spring', stiffness: 280, damping: 28 }}
                                >
                                    {/* Glass panel */}
                                    <div className="absolute inset-0 bg-surface-900/95 backdrop-blur-2xl" />
                                    <div className="absolute inset-0 bg-gradient-to-br from-brand-500/8 via-transparent to-purple-500/5" />
                                    <div className="absolute inset-0 border border-white/10 rounded-3xl" />

                                    <div className="relative z-10 p-8">
                                        {/* Icon */}
                                        <div className="flex justify-center mb-6">
                                            <div className="relative">
                                                <div className="absolute inset-0 rounded-full bg-brand-500/20 blur-xl animate-pulse" />
                                                <div className="w-16 h-16 rounded-2xl bg-brand-500/20 border border-brand-500/30 flex items-center justify-center relative">
                                                    <svg className="w-8 h-8 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                </div>
                                            </div>
                                        </div>

                                        <h3 className="text-xl font-bold text-white text-center mb-2">Ready to Commit</h3>
                                        <p className="text-gray-400 text-sm text-center leading-relaxed mb-8">
                                            All tests passed locally. The AI has verified the fix.<br />
                                            Approve to push changes to GitHub.
                                        </p>

                                        <div className="flex gap-3">
                                            <button onClick={() => handleApproval(false)} disabled={isResuming}
                                                className="flex-1 py-3 rounded-xl border border-white/10 text-gray-400 hover:text-white hover:border-white/20 hover:bg-white/5 font-semibold text-sm transition-all disabled:opacity-40">
                                                Reject
                                            </button>
                                            <button onClick={() => handleApproval(true)} disabled={isResuming}
                                                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white font-bold text-sm shadow-lg shadow-brand-500/30 transition-all disabled:opacity-40 flex items-center justify-center gap-2">
                                                {isResuming ? (
                                                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                                                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                                                        <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
                                                    </svg>
                                                ) : 'Approve & Push'}
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

                    {/* Content wrapper */}
                    <div className="relative z-10 max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6">

                        {/* ── Navbar ── */}
                        <header className="flex items-center justify-between mb-8 px-5 py-4 glass-card border-white/[0.08]" role="banner">
                            {/* Logo */}
                            <button className="flex items-center gap-3 group" onClick={() => setCurrentView('landing')}>
                                <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center shadow-lg shadow-brand-500/30 group-hover:shadow-brand-500/50 transition-shadow">
                                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                </div>
                                <div className="text-left">
                                    <div className="text-sm font-black text-white tracking-tight flex items-center gap-2">
                                        HEALOPS
                                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-brand-500/20 text-brand-300 border border-brand-500/25 tracking-widest">BETA</span>
                                    </div>
                                    <div className="text-[10px] text-gray-500 font-semibold uppercase tracking-widest">AI Healing Agent</div>
                                </div>
                            </button>

                            {/* Right controls */}
                            <div className="flex items-center gap-3">
                                {/* Status pill */}
                                {status && status !== 'IDLE' && (
                                    <div className={`hidden sm:flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border ${status === 'RUNNING' ? 'text-brand-400 bg-brand-500/10 border-brand-500/25' :
                                            status === 'PASSED' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25' :
                                                status === 'FAILED' ? 'text-red-400 bg-red-500/10 border-red-500/25' :
                                                    status === 'AWAITING_APPROVAL' ? 'text-yellow-400 bg-yellow-500/10 border-yellow-500/25' :
                                                        'text-gray-400 bg-gray-500/10 border-gray-500/25'
                                        }`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${status === 'RUNNING' ? 'bg-brand-400 animate-pulse' :
                                                status === 'PASSED' ? 'bg-emerald-400' :
                                                    status === 'FAILED' ? 'bg-red-400' :
                                                        status === 'AWAITING_APPROVAL' ? 'bg-yellow-400 animate-pulse' :
                                                            'bg-gray-400'
                                            }`} />
                                        {status.replace(/_/g, ' ')}
                                    </div>
                                )}

                                {(status === 'RUNNING' || status === 'PENDING' || status === 'AWAITING_APPROVAL') && (
                                    <button onClick={handleStop} disabled={isStopping}
                                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border border-red-500/25 text-red-400 hover:bg-red-500/10 font-semibold transition-colors disabled:opacity-40">
                                        {isStopping ? (
                                            <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                                                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                                                <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
                                            </svg>
                                        ) : (
                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                                            </svg>
                                        )}
                                        Stop
                                    </button>
                                )}

                                <button onClick={() => setCurrentView('landing')}
                                    className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-white px-3 py-1.5 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/8 font-semibold transition-all">
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                    </svg>
                                    Home
                                </button>
                            </div>
                        </header>

                        {/* ── Dashboard Grid ── */}
                        <main id="main-content" role="main">
                            <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">

                                {/* Left Column — inputs + live feed */}
                                <div className="xl:col-span-4 space-y-5">
                                    <InputSection />
                                    <PipelineProgress />
                                    <ActivityLog />
                                </div>

                                {/* Right Column — results */}
                                <div className="xl:col-span-8 space-y-5">
                                    {results || (status === 'FAILED' || status === 'ABORTED' || status === 'REJECTED') ? (
                                        <motion.div className="space-y-5"
                                            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.45, ease: 'easeOut' }}>
                                            <RunSummaryCard />
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                                <ScoreBreakdownPanel />
                                                <CICDTimeline />
                                            </div>
                                            <FixesAppliedTable />
                                        </motion.div>
                                    ) : (
                                        /* ── Empty / Waiting State ── */
                                        <motion.div
                                            className="premium-box min-h-[680px] flex flex-col overflow-hidden"
                                            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                            transition={{ duration: 0.6 }}>

                                            {/* Shimmer top bar when running */}
                                            <div className="h-[3px] w-full bg-surface-900 relative overflow-hidden flex-shrink-0">
                                                {status === 'RUNNING' && (
                                                    <motion.div
                                                        className="absolute inset-0 bg-gradient-to-r from-brand-500 via-purple-500 to-pink-500"
                                                        animate={{ x: ['-100%', '100%'] }}
                                                        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                                                    />
                                                )}
                                            </div>

                                            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                                                {/* Central icon */}
                                                <div className="relative mb-10">
                                                    {status === 'RUNNING' ? (
                                                        <div className="relative">
                                                            <div className="absolute inset-[-48px] rounded-full border border-brand-500/10 animate-spin" style={{ animationDuration: '12s' }} />
                                                            <div className="absolute inset-[-28px] rounded-full border border-purple-500/15 animate-spin" style={{ animationDuration: '8s', animationDirection: 'reverse' }} />
                                                            <div className="absolute inset-0 rounded-full border border-brand-500/30 animate-ping" style={{ animationDuration: '2.5s' }} />
                                                            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-brand-600/25 to-purple-600/15 flex items-center justify-center border border-brand-400/30 backdrop-blur-xl shadow-[0_0_50px_rgba(99,102,241,0.15)]">
                                                                <svg className="w-11 h-11 text-brand-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                                                </svg>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}>
                                                            <div className="w-24 h-24 rounded-full bg-surface-900/50 flex items-center justify-center border border-white/5 shadow-2xl">
                                                                <svg className="w-10 h-10 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                                                                </svg>
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </div>

                                                <h2 className={`text-3xl font-extrabold tracking-tight mb-3 ${status === 'RUNNING' ? 'text-white' : 'text-gray-300'}`}>
                                                    {status === 'RUNNING' ? 'Agent Pipeline Active' : 'Awaiting Input'}
                                                </h2>
                                                <p className="text-gray-500 text-sm max-w-sm mx-auto leading-relaxed mb-10">
                                                    {status === 'RUNNING'
                                                        ? currentStep ? `${currentStep}. Results will appear here when complete.` : 'Processing repository...'
                                                        : 'Configure and run the agent on the left. Results, metrics and AI insights will appear here.'}
                                                </p>

                                                {/* Phase steps */}
                                                <div className="w-full max-w-sm space-y-3">
                                                    {[
                                                        'Clone & Install',
                                                        'Discover & Generate Tests',
                                                        'AI Patch Generation',
                                                        'CI/CD Verification',
                                                    ].map((phase, i) => {
                                                        const isActive = status === 'RUNNING';
                                                        return (
                                                            <motion.div key={i}
                                                                className={`flex items-center gap-4 p-3 rounded-xl border transition-all ${isActive
                                                                        ? 'bg-brand-500/5 border-brand-500/15'
                                                                        : 'bg-surface-900/30 border-white/[0.03]'
                                                                    }`}
                                                                initial={{ opacity: 0, x: -16 }}
                                                                animate={{ opacity: isActive ? 1 : 0.3, x: 0 }}
                                                                transition={{ delay: i * 0.1 + 0.4 }}>
                                                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold flex-shrink-0 ${isActive ? 'bg-brand-500/20 text-brand-300 border border-brand-500/25' : 'bg-surface-800 border border-white/5 text-gray-700'
                                                                    }`}>
                                                                    {String(i + 1).padStart(2, '0')}
                                                                </div>
                                                                <span className={`text-sm font-semibold ${isActive ? 'text-gray-300' : 'text-gray-600'}`}>{phase}</span>
                                                            </motion.div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </div>
                            </div>
                        </main>

                        {/* Footer */}
                        <footer className="mt-12 pb-4 text-center" role="contentinfo">
                            <p className="text-[11px] text-gray-700 font-medium">
                                <span className="text-gray-500 font-semibold">HEALOPS</span>
                                {' · '}Autonomous CI/CD Healing Agent{' · '}React · LangGraph · Mistral AI · MongoDB
                            </p>
                        </footer>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
