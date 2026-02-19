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
            {/* Skip-to-content (HCI accessibility) */}
            <a href="#main-content" className="skip-link">Skip to main content</a>

            {/* Background glow */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
                <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-brand-600/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-purple-600/10 rounded-full blur-[120px]" />
            </div>

            {/* Content */}
            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
                {/* Header */}
                <header className="text-center mb-10 lg:mb-14 animate-fade-in" role="banner">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-xs font-semibold tracking-widest uppercase mb-4">
                        <span className="w-2 h-2 bg-brand-400 rounded-full animate-pulse" aria-hidden="true" />
                        AI-Powered DevOps
                    </div>
                    <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight">
                        CI/CD Healing{' '}
                        <span className="bg-gradient-to-r from-brand-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                            Agent
                        </span>
                    </h1>
                    <p className="mt-4 text-lg text-gray-400 max-w-2xl mx-auto leading-relaxed">
                        Autonomous AI agent that clones your repo, detects failures, generates fixes with Google Gemini, and monitors CI/CD until all tests pass.
                    </p>
                </header>

                {/* Dashboard Grid */}
                <main id="main-content" role="main">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        {/* Left Column */}
                        <div className="lg:col-span-5 space-y-6">
                            <InputSection />
                            <PipelineProgress />
                            <ActivityLog />
                        </div>

                        {/* Right Column — results only when available */}
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
                                <div className="glass-card p-12 flex flex-col items-center justify-center min-h-[400px] animate-fade-in">
                                    <div className="w-20 h-20 rounded-2xl bg-surface-900/80 flex items-center justify-center mb-6">
                                        <svg className="w-10 h-10 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                                        </svg>
                                    </div>
                                    <p className="text-gray-500 font-medium mb-2">No Results Yet</p>
                                    <p className="text-gray-600 text-sm text-center max-w-xs">
                                        Enter a GitHub repository URL and run the agent to see results, score breakdown, fixes, and CI/CD timeline here.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </main>

                {/* Footer */}
                <footer className="mt-16 text-center text-xs text-gray-600" role="contentinfo">
                    Autonomous CI/CD Healing Agent · Built with React, LangGraph & Google Gemini
                </footer>
            </div>
        </div>
    );
}
