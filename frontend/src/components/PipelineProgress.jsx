import { motion, AnimatePresence } from 'framer-motion';
import useAgentStore from '../store/useAgentStore';

// Pipeline stages — each has a keyword list matched against `currentStep`
const STAGES = [
    {
        key: 'clone',
        label: 'Clone Repository',
        desc: 'Fetching and cloning the repository',
        match: ['clon', 'branch'],
        icon: (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
        ),
    },
    {
        key: 'deps',
        label: 'Install Dependencies',
        desc: 'Setting up project dependencies',
        match: ['dep', 'install', 'pip', 'npm'],
        icon: (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
        ),
    },
    {
        key: 'discover',
        label: 'Discover Tests',
        desc: 'Scanning for test files and framework',
        match: ['discover', 'detect'],
        icon: (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
        ),
    },
    {
        key: 'generate',
        label: 'Generate Tests',
        desc: 'AI generating missing test cases',
        match: ['generat', 'test case'],
        icon: (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
        ),
    },
    {
        key: 'test',
        label: 'Run Tests',
        desc: 'Executing test suite',
        match: ['run', 'running test', 'pytest', 'jest'],
        icon: (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        ),
    },
    {
        key: 'analyze',
        label: 'Analyze Failures',
        desc: 'AI reading and understanding errors',
        match: ['analyz', 'failure', 'issue'],
        icon: (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
        ),
    },
    {
        key: 'fix',
        label: 'Apply Fixes',
        desc: 'AI patching the identified bugs',
        match: ['fix', 'patch', 'repair'],
        icon: (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
        ),
    },
    {
        key: 'commit',
        label: 'Commit & Push',
        desc: 'Pushing verified changes to GitHub',
        match: ['commit', 'push', 'approv', 'resum'],
        icon: (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
        ),
    },
    {
        key: 'cicd',
        label: 'CI/CD Check',
        desc: 'Verifying pipeline on GitHub Actions',
        match: ['ci/cd', 'monitor', 'cicd', 'pipeline'],
        icon: (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
        ),
    },
    {
        key: 'done',
        label: 'Complete',
        desc: 'Agent run finished',
        match: ['complet', 'finaliz', 'done'],
        icon: (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        ),
    },
];

function getActiveIndex(currentStep, status) {
    if (!currentStep) return 0;
    const lower = currentStep.toLowerCase();
    for (let i = STAGES.length - 1; i >= 0; i--) {
        if (STAGES[i].match.some((p) => lower.includes(p))) return i;
    }
    return 0;
}

const STATUS_CONFIG = {
    RUNNING: { color: 'text-brand-400', bg: 'bg-brand-500/15 border-brand-500/30', dot: 'bg-brand-400', label: 'Running' },
    PASSED: { color: 'text-emerald-400', bg: 'bg-emerald-500/15 border-emerald-500/30', dot: 'bg-emerald-400', label: 'Passed' },
    FAILED: { color: 'text-red-400', bg: 'bg-red-500/15 border-red-500/30', dot: 'bg-red-400', label: 'Failed' },
    AWAITING_APPROVAL: { color: 'text-yellow-400', bg: 'bg-yellow-500/15 border-yellow-500/30', dot: 'bg-yellow-400', label: 'Awaiting Approval' },
    ABORTED: { color: 'text-gray-400', bg: 'bg-gray-500/15 border-gray-500/30', dot: 'bg-gray-400', label: 'Stopped' },
    REJECTED: { color: 'text-orange-400', bg: 'bg-orange-500/15 border-orange-500/30', dot: 'bg-orange-400', label: 'Rejected' },
};

export default function PipelineProgress() {
    const { status, currentStep } = useAgentStore();

    const isActive = ['RUNNING', 'AWAITING_APPROVAL'].includes(status);
    const isTerminal = ['PASSED', 'FAILED', 'ABORTED', 'REJECTED'].includes(status);

    if (!isActive && !isTerminal) return null;

    const conf = STATUS_CONFIG[status] || STATUS_CONFIG.RUNNING;
    const activeIdx = isTerminal
        ? (status === 'PASSED' ? STAGES.length - 1 : getActiveIndex(currentStep, status))
        : getActiveIndex(currentStep, status);

    const progressPct = Math.round(((activeIdx + 1) / STAGES.length) * 100);

    return (
        <motion.section
            className="glass-card overflow-hidden"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            role="progressbar"
            aria-label="Agent pipeline progress"
            aria-valuenow={activeIdx + 1}
            aria-valuemin={1}
            aria-valuemax={STAGES.length}
        >
            {/* Top progress bar — real percentage from activeIdx */}
            <div className="h-[3px] w-full bg-surface-800 relative overflow-hidden">
                <motion.div
                    className={`h-full rounded-full ${status === 'PASSED' ? 'bg-emerald-500' : status === 'FAILED' ? 'bg-red-500' : 'bg-gradient-to-r from-brand-500 via-purple-500 to-pink-500'}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPct}%` }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                />
                {isActive && (
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-[shimmer_1.5s_infinite]" />
                )}
            </div>

            <div className="p-5">
                {/* Header row */}
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h2 className="text-sm font-bold text-white tracking-wide">Pipeline Progress</h2>
                        <p className="text-xs text-gray-500 mt-0.5 truncate max-w-[220px]">
                            {isTerminal
                                ? (status === 'PASSED' ? 'All tests passing — changes pushed' : status === 'ABORTED' ? 'Agent was stopped manually' : status === 'REJECTED' ? 'Commit was rejected' : 'Run finished with failures')
                                : (status === 'AWAITING_APPROVAL' ? 'Waiting for your approval to commit' : currentStep || 'Starting up...')}
                        </p>
                    </div>
                    {/* Status badge */}
                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold ${conf.bg} ${conf.color}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${conf.dot} ${isActive ? 'animate-pulse' : ''}`} />
                        {conf.label}
                    </div>
                </div>

                {/* Progress percentage */}
                <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] text-gray-600 font-medium uppercase tracking-widest">
                        Step {activeIdx + 1} of {STAGES.length}
                    </span>
                    <span className={`text-xs font-bold ${conf.color}`}>{progressPct}%</span>
                </div>

                {/* Steps — horizontal scrollable on small screens */}
                <div className="flex items-start gap-0 overflow-x-auto pb-1 scrollbar-none">
                    {STAGES.map((stage, i) => {
                        const isDone = i < activeIdx || (status === 'PASSED' && i <= activeIdx);
                        const isCurrent = i === activeIdx && isActive;
                        const isFailed = i === activeIdx && status === 'FAILED';
                        const isPending = !isDone && !isCurrent && !isFailed;

                        return (
                            <div key={stage.key} className="flex items-center flex-1 min-w-0">
                                {/* Stage node */}
                                <div className="flex flex-col items-center gap-1.5 min-w-0 flex-1 px-0.5">
                                    <motion.div
                                        className={`
                                            relative w-8 h-8 rounded-xl flex items-center justify-center text-sm border transition-all duration-500 flex-shrink-0
                                            ${isDone ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400 shadow-sm shadow-emerald-500/20'
                                                : isCurrent ? 'bg-brand-500/25 border-brand-500/60 text-brand-300 shadow-md shadow-brand-500/25'
                                                    : isFailed ? 'bg-red-500/20 border-red-500/40 text-red-400'
                                                        : 'bg-surface-900/60 border-white/[0.05] text-gray-700'}
                                        `}
                                        animate={isCurrent ? { scale: [1, 1.08, 1] } : {}}
                                        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                                        title={stage.desc}
                                    >
                                        {/* Glow ring for current */}
                                        {isCurrent && (
                                            <span className="absolute inset-0 rounded-xl border border-brand-500/40 animate-ping opacity-50" />
                                        )}
                                        {isDone ? (
                                            <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                            </svg>
                                        ) : isFailed ? (
                                            <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        ) : (
                                            stage.icon
                                        )}
                                    </motion.div>

                                    {/* Label */}
                                    <AnimatePresence mode="wait">
                                        <motion.span
                                            key={`${stage.key}-${isDone}-${isCurrent}`}
                                            className={`
                                                text-[9px] text-center font-semibold leading-tight truncate max-w-full tracking-wide
                                                ${isDone ? 'text-emerald-500' : isCurrent ? 'text-brand-400' : isFailed ? 'text-red-400' : 'text-gray-700'}
                                            `}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                        >
                                            {stage.label}
                                        </motion.span>
                                    </AnimatePresence>
                                </div>

                                {/* Connector line between stages */}
                                {i < STAGES.length - 1 && (
                                    <div className="flex-shrink-0 w-3 h-[2px] mt-[-14px] relative overflow-hidden rounded-full bg-surface-800">
                                        <motion.div
                                            className={`absolute inset-0 rounded-full ${isDone ? 'bg-emerald-500/60' : isCurrent ? 'bg-brand-500/40' : 'bg-transparent'}`}
                                            initial={{ scaleX: 0 }}
                                            animate={{ scaleX: isDone || isCurrent ? 1 : 0 }}
                                            style={{ transformOrigin: 'left' }}
                                            transition={{ duration: 0.4, ease: 'easeOut' }}
                                        />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Current step description — real data only */}
                {isActive && currentStep && (
                    <motion.div
                        className="mt-3 flex items-center gap-2 px-3 py-2 bg-surface-900/60 rounded-xl border border-white/[0.04]"
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        key={currentStep}
                    >
                        <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse flex-shrink-0" />
                        <span className="text-[11px] text-gray-400 truncate">{currentStep}</span>
                    </motion.div>
                )}
            </div>
        </motion.section>
    );
}
