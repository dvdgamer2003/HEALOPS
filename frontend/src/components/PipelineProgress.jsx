import useAgentStore from '../store/useAgentStore';

const STAGES = [
    { key: 'clone', label: 'Clone', match: 'clon', icon: '📦' },
    { key: 'discover', label: 'Discover', match: 'discover', icon: '🔍' },
    { key: 'test', label: 'Test', match: 'test', icon: '🧪' },
    { key: 'analyze', label: 'Analyze', match: 'analyz', icon: '🔬' },
    { key: 'fix', label: 'Fix', match: 'fix', icon: '🛠️' },
    { key: 'commit', label: 'Commit', match: 'commit|push', icon: '📤' },
    { key: 'cicd', label: 'CI/CD', match: 'ci/cd|monitor|ci_cd', icon: '⚡' },
    { key: 'retry', label: 'Retry', match: 'retry', icon: '🔄' },
    { key: 'finalize', label: 'Done', match: 'complet|finaliz', icon: '✅' },
];

function getActiveIndex(currentStep) {
    if (!currentStep) return -1;
    const lower = currentStep.toLowerCase();
    for (let i = STAGES.length - 1; i >= 0; i--) {
        const patterns = STAGES[i].match.split('|');
        if (patterns.some((p) => lower.includes(p))) return i;
    }
    return 0;
}

export default function PipelineProgress() {
    const { status, currentStep } = useAgentStore();
    const isRunning = status === 'RUNNING';
    const isDone = status === 'PASSED' || status === 'FAILED';

    if (!isRunning && !isDone) return null;

    const activeIdx = isDone ? STAGES.length - 1 : getActiveIndex(currentStep);

    return (
        <section
            className="glass-card p-6 animate-fade-in"
            role="progressbar"
            aria-label="Agent pipeline progress"
            aria-valuenow={activeIdx + 1}
            aria-valuemin={1}
            aria-valuemax={STAGES.length}
        >
            {/* Header */}
            <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                    </svg>
                </div>
                <div className="flex-1">
                    <h2 className="text-lg font-bold text-white">Pipeline Progress</h2>
                    <p className="text-xs text-gray-500">
                        {isDone
                            ? `Completed — ${status === 'PASSED' ? 'All tests passing' : 'Finished with failures'}`
                            : currentStep || 'Starting...'}
                    </p>
                </div>
                {isRunning && (
                    <span className="badge-running text-xs">Running</span>
                )}
                {status === 'PASSED' && (
                    <span className="badge-passed text-xs">Passed</span>
                )}
                {status === 'FAILED' && (
                    <span className="badge-failed text-xs">Failed</span>
                )}
            </div>

            {/* Stage Steps */}
            <div className="flex items-center gap-0" role="list" aria-label="Pipeline stages">
                {STAGES.map((stage, i) => {
                    const isDoneStage = i < activeIdx || (isDone && i <= activeIdx);
                    const isActive = i === activeIdx && isRunning;
                    const isPending = i > activeIdx;

                    return (
                        <div key={stage.key} className="flex items-center flex-1 min-w-0" role="listitem">
                            {/* Step indicator */}
                            <div className="flex flex-col items-center gap-1.5 min-w-0">
                                <div
                                    className={`
                                        w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-all duration-500
                                        ${isDoneStage
                                            ? 'bg-emerald-500/20 border border-emerald-500/40 shadow-sm shadow-emerald-500/20'
                                            : isActive
                                                ? 'bg-brand-500/20 border border-brand-500/50 shadow-md shadow-brand-500/30 animate-pulse'
                                                : 'bg-surface-900/60 border border-white/[0.06]'
                                        }
                                    `}
                                    title={stage.label}
                                >
                                    {isDoneStage ? (
                                        <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                        </svg>
                                    ) : (
                                        <span className={`text-xs ${isActive ? 'text-brand-400' : 'text-gray-600'}`}>
                                            {stage.icon}
                                        </span>
                                    )}
                                </div>
                                <span
                                    className={`text-[10px] text-center font-medium leading-tight truncate max-w-full
                                        ${isDoneStage ? 'text-emerald-400' : isActive ? 'text-brand-400' : 'text-gray-600'}
                                    `}
                                >
                                    {stage.label}
                                </span>
                            </div>

                            {/* Connector line */}
                            {i < STAGES.length - 1 && (
                                <div
                                    className={`flex-1 h-0.5 mx-0.5 mt-[-14px] rounded-full transition-all duration-500 ${i < activeIdx
                                            ? 'bg-emerald-500/50'
                                            : i === activeIdx && isRunning
                                                ? 'bg-gradient-to-r from-brand-500/50 to-transparent'
                                                : 'bg-white/[0.06]'
                                        }`}
                                />
                            )}
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
