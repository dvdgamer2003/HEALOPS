import useAgentStore from '../store/useAgentStore';
import { motion } from 'framer-motion';

const STATUS_CONFIG = {
    PASSED: { dot: 'bg-emerald-400', ring: 'border-emerald-500 bg-emerald-500/10', label: 'PASSED', icon: '✓', badgeCls: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25' },
    FAILED: { dot: 'bg-red-400', ring: 'border-red-500 bg-red-500/10', label: 'FAILED', icon: '✗', badgeCls: 'text-red-400 bg-red-500/10 border-red-500/25' },
    SKIPPED: { dot: 'bg-amber-400', ring: 'border-amber-500 bg-amber-500/10', label: 'SKIPPED', icon: '⏭', badgeCls: 'text-amber-400 bg-amber-500/10 border-amber-500/25' },
    TIMEOUT: { dot: 'bg-gray-400', ring: 'border-gray-500 bg-gray-500/10', label: 'TIMEOUT', icon: '⏱', badgeCls: 'text-gray-400 bg-gray-500/10 border-gray-500/25' },
};

export default function CICDTimeline() {
    const { results } = useAgentStore();

    const timeline = results?.ci_cd_timeline ?? [];
    const iterationsUsed = results?.iterations_used ?? timeline.length;
    const MAX_ITER = 5;

    if (!results) {
        return (
            <motion.section
                className="glass-card p-8 flex flex-col items-center justify-center min-h-[200px]"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
            >
                <div className="w-16 h-16 rounded-2xl bg-surface-900/80 flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <p className="text-gray-500 text-sm font-medium">CI/CD timeline will appear here</p>
            </motion.section>
        );
    }

    const efficiencyPct = Math.max(0, Math.round((1 - (iterationsUsed - 1) / (MAX_ITER - 1)) * 100));
    const effColor = efficiencyPct >= 80 ? 'text-emerald-400' : efficiencyPct >= 50 ? 'text-amber-400' : 'text-red-400';
    const effBar = efficiencyPct >= 80 ? 'bg-emerald-500' : efficiencyPct >= 50 ? 'bg-amber-500' : 'bg-red-500';

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.1, delayChildren: 0.2 }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, x: -15 },
        visible: { opacity: 1, x: 0 }
    };

    return (
        <motion.section
            className="glass-card p-5"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            {/* Header */}
            <motion.div variants={itemVariants} className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shadow-lg shadow-rose-500/20">
                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <h2 className="text-base font-bold text-white">CI/CD Timeline</h2>
                </div>
                <div className="text-right">
                    <div className="text-[10px] text-gray-500 mb-0.5">Used</div>
                    <div className="text-sm font-bold text-white leading-none">
                        {iterationsUsed}<span className="text-gray-600 font-normal text-xs"> / {MAX_ITER}</span>
                    </div>
                </div>
            </motion.div>

            {/* Efficiency Bar */}
            <motion.div variants={itemVariants} className="mb-4">
                <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-500">Efficiency</span>
                    <span className={`font-semibold ${effColor}`}>{efficiencyPct}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/[0.05] overflow-hidden relative">
                    <motion.div
                        className={`absolute top-0 left-0 h-full rounded-full ${effBar}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${efficiencyPct}%` }}
                        transition={{ duration: 1.5, ease: "easeOut", delay: 0.5 }}
                    />
                </div>
            </motion.div>

            {/* Vertical Timeline */}
            <div className="relative pl-7">
                {/* Connector line */}
                <div className="absolute left-[10px] top-3 bottom-3 w-px bg-gradient-to-b from-brand-500/30 to-transparent" />

                <div className="space-y-2.5">
                    {/* Actual iterations */}
                    {timeline.map((entry, i) => {
                        const cfg = STATUS_CONFIG[entry.status] || STATUS_CONFIG.FAILED;
                        const ts = new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        return (
                            <motion.div
                                key={i}
                                variants={itemVariants}
                                className="relative flex items-center gap-3"
                            >
                                {/* Dot */}
                                <div className={`absolute -left-7 w-5 h-5 rounded-full flex items-center justify-center border-2 ${cfg.ring}`}>
                                    <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                                </div>
                                {/* Content */}
                                <div className="flex-1 flex items-center justify-between bg-surface-900/50 rounded-xl px-3 py-2.5 border border-white/[0.05] hover:border-white/10 transition-colors">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span className="text-xs font-semibold text-gray-300 shrink-0">Iter {entry.iteration}</span>
                                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${cfg.badgeCls} shrink-0`}>
                                            {cfg.icon} {cfg.label}
                                        </span>
                                    </div>
                                    <span className="text-[10px] text-gray-600 font-mono ml-2 shrink-0">{ts}</span>
                                </div>
                            </motion.div>
                        );
                    })}

                    {/* Greyed future slots — compact */}
                    {Array.from({ length: Math.max(0, MAX_ITER - timeline.length) }).map((_, i) => (
                        <motion.div
                            key={`e-${i}`}
                            variants={itemVariants}
                            className="relative flex items-center gap-3 opacity-15"
                        >
                            <div className="absolute -left-7 w-5 h-5 rounded-full border border-white/15" />
                            <div className="flex-1 h-9 bg-surface-900/20 rounded-xl border border-white/[0.03] flex items-center px-3">
                                <span className="text-[10px] text-gray-700">Iteration {timeline.length + i + 1}</span>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {timeline.length === 0 && (
                    <p className="text-gray-500 text-xs py-4 text-center">No iterations recorded.</p>
                )}
            </div>
        </motion.section>
    );
}
