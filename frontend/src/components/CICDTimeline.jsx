import { motion } from 'framer-motion';
import useAgentStore from '../store/useAgentStore';

const STATUS_CFG = {
    PASSED: { label: 'Passed', dot: 'bg-emerald-400', badge: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25', ring: 'border-emerald-500/40 bg-emerald-500/10', line: 'from-emerald-500/60' },
    FAILED: { label: 'Failed', dot: 'bg-red-400', badge: 'text-red-400 bg-red-500/10 border-red-500/25', ring: 'border-red-500/40 bg-red-500/10', line: 'from-red-500/60' },
    SKIPPED: { label: 'Skipped', dot: 'bg-amber-400', badge: 'text-amber-400 bg-amber-500/10 border-amber-500/25', ring: 'border-amber-500/40 bg-amber-500/10', line: 'from-amber-500/60' },
    TIMEOUT: { label: 'Timeout', dot: 'bg-gray-400', badge: 'text-gray-400 bg-gray-500/10 border-gray-500/25', ring: 'border-gray-500/40 bg-gray-500/10', line: 'from-gray-500/40' },
};

const ICONS = {
    PASSED: <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />,
    FAILED: <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />,
    SKIPPED: <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />,
    TIMEOUT: <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />,
};

function formatTime(ts) {
    if (!ts) return '';
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export default function CICDTimeline() {
    const { results } = useAgentStore();

    if (!results) {
        return (
            <motion.section className="glass-card p-8 flex flex-col items-center justify-center min-h-[220px]"
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                <div className="w-14 h-14 rounded-2xl bg-surface-900/80 flex items-center justify-center mb-3 border border-white/5">
                    <svg className="w-7 h-7 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <p className="text-gray-600 text-xs font-medium">CI/CD timeline available after run</p>
            </motion.section>
        );
    }

    const timeline = results?.ci_cd_timeline ?? [];
    const iterationsUsed = results?.iterations_used ?? timeline.length;
    const MAX_ITER = 5;
    const effPct = Math.max(0, Math.round((1 - (Math.max(iterationsUsed - 1, 0)) / (MAX_ITER - 1)) * 100));
    const effColor = effPct >= 80 ? 'text-emerald-400' : effPct >= 50 ? 'text-amber-400' : 'text-red-400';
    const effBarColor = effPct >= 80 ? 'bg-emerald-500' : effPct >= 50 ? 'bg-amber-500' : 'bg-red-500';

    return (
        <motion.section className="glass-card overflow-hidden"
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.05 }}>

            {/* Header */}
            <div className="flex items-center justify-between p-5 pb-3">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shadow-lg shadow-rose-500/25 flex-shrink-0">
                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-white tracking-wide">CI/CD Timeline</h2>
                        <p className="text-[11px] text-gray-500">Iteration history</p>
                    </div>
                </div>
                {/* Iterations used */}
                <div className="text-right">
                    <div className="text-[10px] text-gray-600 uppercase tracking-widest mb-0.5">Iterations</div>
                    <div className="text-lg font-black text-white leading-none">
                        {iterationsUsed}<span className="text-gray-600 font-normal text-xs"> / {MAX_ITER}</span>
                    </div>
                </div>
            </div>

            {/* Efficiency bar */}
            <div className="px-5 pb-4">
                <div className="flex justify-between text-[11px] mb-1.5">
                    <span className="text-gray-500 font-medium">Efficiency</span>
                    <span className={`font-bold ${effColor}`}>{effPct}%</span>
                </div>
                <div className="h-2 rounded-full bg-white/[0.05] overflow-hidden">
                    <motion.div className={`h-full rounded-full ${effBarColor}`}
                        initial={{ width: 0 }} animate={{ width: `${effPct}%` }}
                        transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }} />
                </div>
            </div>

            {/* Timeline entries */}
            <div className="px-5 pb-5">
                <div className="relative">
                    {/* Vertical connector */}
                    {timeline.length > 1 && (
                        <div className="absolute left-[13px] top-6 bottom-6 w-px bg-gradient-to-b from-white/10 to-transparent" />
                    )}

                    <div className="space-y-2">
                        {timeline.map((entry, i) => {
                            const cfg = STATUS_CFG[entry.status] || STATUS_CFG.FAILED;
                            return (
                                <motion.div key={i} className="flex items-center gap-3"
                                    initial={{ opacity: 0, x: -12 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.08 }}>
                                    {/* Node dot */}
                                    <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${cfg.ring}`}>
                                        <svg className={`w-3 h-3 ${cfg.badge.split(' ')[0]}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                            {ICONS[entry.status] || ICONS.FAILED}
                                        </svg>
                                    </div>
                                    {/* Row card */}
                                    <div className="flex-1 flex items-center justify-between bg-surface-900/50 rounded-xl px-3 py-2 border border-white/[0.05] hover:border-white/10 transition-colors">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-semibold text-gray-300">Iter {entry.iteration}</span>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cfg.badge}`}>
                                                {cfg.label}
                                            </span>
                                        </div>
                                        <span className="text-[10px] text-gray-600 font-mono">{formatTime(entry.timestamp)}</span>
                                    </div>
                                </motion.div>
                            );
                        })}

                        {/* Future blank slots */}
                        {Array.from({ length: Math.max(0, MAX_ITER - timeline.length) }).map((_, i) => (
                            <div key={`blank-${i}`} className="flex items-center gap-3 opacity-10">
                                <div className="w-7 h-7 rounded-full border border-white/20 flex-shrink-0" />
                                <div className="flex-1 h-9 bg-surface-900/20 rounded-xl border border-white/[0.03] flex items-center px-3">
                                    <span className="text-[10px] text-gray-700">Iteration {timeline.length + i + 1}</span>
                                </div>
                            </div>
                        ))}

                        {timeline.length === 0 && (
                            <p className="text-gray-600 text-xs text-center py-3">No CI/CD iterations recorded</p>
                        )}
                    </div>
                </div>
            </div>
        </motion.section>
    );
}
