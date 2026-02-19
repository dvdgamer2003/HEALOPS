import useAgentStore from '../store/useAgentStore';

export default function CICDTimeline() {
    const { results, status } = useAgentStore();

    const timeline = results?.ci_cd_timeline ?? [];
    const iterationsUsed = results?.iterations_used ?? timeline.length;

    if (!results) {
        return (
            <section className="glass-card p-8 animate-fade-in flex flex-col items-center justify-center min-h-[200px]">
                <div className="w-16 h-16 rounded-2xl bg-surface-900/80 flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <p className="text-gray-500 text-sm font-medium">CI/CD timeline will appear here</p>
            </section>
        );
    }

    return (
        <section className="glass-card p-8 animate-slide-up">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shadow-lg shadow-rose-500/20">
                        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-bold text-white">CI/CD Timeline</h2>
                </div>
                <span className="badge bg-surface-900/60 text-gray-400 border border-white/[0.06]">
                    {iterationsUsed} / 3 iterations
                </span>
            </div>

            {/* Vertical Timeline */}
            <div className="relative pl-8">
                {/* Vertical line */}
                <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-gradient-to-b from-brand-500/40 via-brand-500/20 to-transparent" />

                <div className="space-y-4">
                    {timeline.map((entry, i) => {
                        const isPassed = entry.status === 'PASSED';
                        const ts = new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

                        return (
                            <div
                                key={i}
                                className="relative flex items-start gap-4 animate-slide-up"
                                style={{ animationDelay: `${i * 100}ms` }}
                            >
                                {/* Dot */}
                                <div className={`absolute -left-8 top-1 w-[22px] h-[22px] rounded-full flex items-center justify-center border-2 ${isPassed
                                    ? 'border-emerald-500 bg-emerald-500/20'
                                    : 'border-red-500 bg-red-500/20'
                                    }`}>
                                    <div className={`w-2.5 h-2.5 rounded-full ${isPassed ? 'bg-emerald-400' : 'bg-red-400'}`} />
                                </div>

                                {/* Content */}
                                <div className="flex-1 bg-surface-900/50 rounded-xl p-4 border border-white/[0.04] hover:border-white/[0.08] transition-colors">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-semibold text-gray-200">
                                                Iteration {entry.iteration}
                                            </span>
                                            <span className={isPassed ? 'badge-passed' : 'badge-failed'}>
                                                {isPassed ? '✓ PASSED' : '✗ FAILED'}
                                            </span>
                                        </div>
                                        <span className="text-xs text-gray-500 font-mono">{ts}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {timeline.length === 0 && (
                    <p className="text-gray-500 text-sm py-4 text-center">No iterations recorded.</p>
                )}
            </div>
        </section>
    );
}
