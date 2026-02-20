import InputSection from './components/InputSection';
import PipelineProgress from './components/PipelineProgress';
import ActivityLog from './components/ActivityLog';
import RunSummaryCard from './components/RunSummaryCard';
import ScoreBreakdownPanel from './components/ScoreBreakdownPanel';
import FixesAppliedTable from './components/FixesAppliedTable';
import CICDTimeline from './components/CICDTimeline';
import useAgentStore from './store/useAgentStore';

export default function App() {
    const { results } = useAgentStore();

    return (
        <div className="min-h-screen bg-surface-950">
            {/* Skip-to-content */}
            <a href="#main-content" className="skip-link">Skip to main content</a>

            {/* Background glows */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
                <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-brand-600/8 rounded-full blur-[140px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-600/8 rounded-full blur-[140px]" />
                <div className="absolute top-[40%] left-[50%] w-[300px] h-[300px] bg-emerald-600/5 rounded-full blur-[100px]" />
            </div>

            {/* Content */}
            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">

                {/* ── Header ── */}
                <header className="text-center mb-12 lg:mb-16 animate-fade-in" role="banner">
                    {/* Logo mark */}
                    <div className="flex items-center justify-center gap-3 mb-5">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center shadow-xl shadow-brand-500/30">
                            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </div>
                        <span className="text-3xl font-black text-white tracking-tight">HEALOPS</span>
                    </div>

                    {/* Badge */}
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-xs font-semibold tracking-widest uppercase mb-5">
                        <span className="w-1.5 h-1.5 bg-brand-400 rounded-full animate-pulse" aria-hidden="true" />
                        Autonomous CI/CD Repair · Powered by Mistral AI
                    </div>

                    <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-tight">
                        Self-Healing{' '}
                        <span className="bg-gradient-to-r from-brand-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                            DevOps Pipeline
                        </span>
                    </h1>
                    <p className="mt-4 text-base text-gray-400 max-w-2xl mx-auto leading-relaxed">
                        Enter a GitHub repo. The agent clones it, runs tests, detects bugs, generates fixes using{' '}
                        <span className="text-brand-400 font-semibold">Mistral AI</span>, commits the patch, and verifies CI/CD — fully autonomously.
                    </p>
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
                            {results ? (
                                <>
                                    <RunSummaryCard />
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <ScoreBreakdownPanel />
                                        <CICDTimeline />
                                    </div>
                                    <FixesAppliedTable />
                                </>
                            ) : (
                                /* Empty State */
                                <div className="glass-card p-12 flex flex-col items-center justify-center min-h-[420px] animate-fade-in text-center">
                                    {/* Animated rings */}
                                    <div className="relative w-24 h-24 mb-6">
                                        <div className="absolute inset-0 rounded-full border-2 border-brand-500/20 animate-ping" style={{ animationDuration: '2s' }} />
                                        <div className="absolute inset-2 rounded-full border-2 border-purple-500/20 animate-ping" style={{ animationDuration: '2.5s', animationDelay: '0.3s' }} />
                                        <div className="absolute inset-4 rounded-full bg-surface-900/80 flex items-center justify-center">
                                            <svg className="w-8 h-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                                            </svg>
                                        </div>
                                    </div>
                                    <p className="text-white font-semibold text-lg mb-2">Awaiting Your First Run</p>
                                    <p className="text-gray-500 text-sm max-w-xs leading-relaxed">
                                        Run the agent on a GitHub repo and your results — score, fixes, CI/CD timeline — will appear here instantly.
                                    </p>
                                    <div className="mt-6 flex gap-3 flex-wrap justify-center">
                                        {['Clone', 'Detect', 'Fix', 'Verify'].map((step, i) => (
                                            <span key={step} className="text-xs font-medium px-3 py-1.5 rounded-full border border-white/10 text-gray-500 bg-white/[0.02]">
                                                {i + 1}. {step}
                                            </span>
                                        ))}
                                    </div>
                                </div>
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
        </div>
    );
}
