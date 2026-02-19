import useAgentStore from '../store/useAgentStore';

const STATUS_CONFIG = {
    PASSED: { dot: 'bg-emerald-400', ring: 'border-emerald-500 bg-emerald-500/10', text: 'text-emerald-400', label: '✓ PASSED', badge: 'badge-passed' },
    FAILED: { dot: 'bg-red-400', ring: 'border-red-500 bg-red-500/10', text: 'text-red-400', label: '✗ FAILED', badge: 'badge-failed' },
    SKIPPED: { dot: 'bg-amber-400', ring: 'border-amber-500 bg-amber-500/10', text: 'text-amber-400', label: '⏭ SKIPPED', badge: 'bg-amber-500/10 border-amber-500/30 text-amber-400 badge' },
    TIMEOUT: { dot: 'bg-gray-400', ring: 'border-gray-500 bg-gray-500/10', text: 'text-gray-400', label: '⏱ TIMEOUT', badge: 'bg-gray-500/10 border-gray-500/30 text-gray-400 badge' },
};

export default function CICDTimeline() {
    const { results } = useAgentStore();

    const timeline = results?.ci_cd_timeline ?? [];
    const iterationsUsed = results?.iterations_used ?? timeline.length;
    const MAX_ITERATIONS = 5;

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

    // Efficiency bar — how many iterations used vs max
    const efficiencyPct = Math.max(0, Math.round((1 - (iterationsUsed - 1) / (MAX_ITERATIONS - 1)) * 100));

    return (
        <section className="glass-card p-6 animate-slide-up">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shadow-lg shadow-rose-500/20">
                        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-bold text-white">CI/CD Timeline</h2>
                </div>
                <div className="text-right">
                    <div className="text-xs text-gray-500 mb-0.5">Iterations Used</div>
                    <div className="text-sm font-bold text-white">{iterationsUsed} <span className="text-gray-600 font-normal">/ {MAX_ITERATIONS}</span></div>
                </div>
            </div>

            {/* Efficiency Bar */}
            <div className="mb-5">
                <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-gray-500">Efficiency</span>
                    <span className={`font-semibold ${efficiencyPct >= 80 ? 'text-emerald-400' : efficiencyPct >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
                        {efficiencyPct}%
                    </span>
                </div>
                <div className="h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-all duration-1000 ${efficiencyPct >= 80 ? 'bg-emerald-500' : efficiencyPct >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                        style={{ width: `${efficiencyPct}%` }}
                    />
                </div>
            </div>

            {/* Vertical Timeline */}
            <div className="relative pl-8">
                {/* Vertical line */}
                <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-gradient-to-b from-brand-500/40 via-brand-500/10 to-transparent" />

                <div className="space-y-3">
                    {timeline.map((entry, i) => {
                        const cfg = STATUS_CONFIG[entry.status] || STATUS_CONFIG.FAILED;
                        const ts = new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                        return (
                            <div key={i} className="relative flex items-start gap-4 animate-slide-up" style={{ animationDelay: `${i * 80}ms` }}>
                                {/* Dot */}
                                <div className={`absolute -left-8 top-1.5 w-[22px] h-[22px] rounded-full flex items-center justify-center border-2 ${cfg.ring}`}>
                                    <div className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
                                </div>
                                {/* Card */}
                                <div className="flex-1 bg-surface-900/50 rounded-xl p-3 border border-white/[0.04] hover:border-white/[0.10] transition-colors">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-semibold text-gray-200">Iteration {entry.iteration}</span>
                                            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${cfg.badge}`}>
                                                {cfg.label}
                                            </span>
                                        </div>
                                        <span className="text-xs text-gray-500 font-mono">{ts}</span>
                                    </div>
                                    {entry.message && (
                                        <p className="text-xs text-gray-500 mt-1.5 truncate">{entry.message}</p>
                                    )}
                                </div>
                            </div>
                        );
                    })}

                    {/* Remaining iteration slots (greyed out) */}
                    {Array.from({ length: Math.max(0, MAX_ITERATIONS - timeline.length) }).map((_, i) => (
                        <div key={`empty-${i}`} className="relative flex items-start gap-4 opacity-20">
                            <div className="absolute -left-8 top-1.5 w-[22px] h-[22px] rounded-full border-2 border-white/20 bg-transparent" />
                            <div className="flex-1 bg-surface-900/20 rounded-xl p-3 border border-white/[0.03]">
                                <span className="text-xs text-gray-600">Iteration {timeline.length + i + 1}</span>
                            </div>
                        </div>
                    ))}
                </div>

                {timeline.length === 0 && (
                    <p className="text-gray-500 text-sm py-4 text-center">No iterations recorded.</p>
                )}
            </div>
        </section>
    );
}
