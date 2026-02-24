import { motion } from 'framer-motion';
import useAgentStore from '../store/useAgentStore';

function AnimatedRing({ value, max = 130, size = 110, stroke = 8 }) {
    const r = (size - stroke) / 2;
    const circ = 2 * Math.PI * r;
    const pct = Math.min(Math.max(value / max, 0), 1);
    const dash = circ * pct;

    const color = value >= 110 ? '#10b981' : value >= 80 ? '#6366f1' : value >= 60 ? '#f59e0b' : '#ef4444';
    const glow = value >= 110 ? '#10b981' : value >= 80 ? '#818cf8' : value >= 60 ? '#f59e0b' : '#ef4444';

    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
            {/* Track */}
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={stroke} />
            {/* Glow effect */}
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={glow} strokeWidth={stroke + 4}
                strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" style={{ opacity: 0.15, transition: 'stroke-dasharray 1s ease' }} />
            {/* Main arc */}
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
                strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
                style={{ transition: 'stroke-dasharray 1s ease', filter: `drop-shadow(0 0 6px ${glow})` }} />
        </svg>
    );
}

export default function ScoreBreakdownPanel() {
    const { results } = useAgentStore();

    if (!results?.score) {
        return (
            <motion.section className="glass-card p-8 flex flex-col items-center justify-center min-h-[220px]"
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                <div className="w-14 h-14 rounded-2xl bg-surface-900/80 flex items-center justify-center mb-3 border border-white/5">
                    <svg className="w-7 h-7 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                </div>
                <p className="text-gray-600 text-xs font-medium">Score available after run completes</p>
            </motion.section>
        );
    }

    const { base, speed_bonus, efficiency_penalty, final: finalScore } = results.score;
    const maxPossible = Math.max(base + Math.abs(speed_bonus ?? 0) + 10, 130);

    const grade = finalScore >= 110 ? 'S' : finalScore >= 100 ? 'A' : finalScore >= 80 ? 'B' : finalScore >= 60 ? 'C' : 'F';
    const gradeColor = finalScore >= 110 ? 'text-emerald-400' : finalScore >= 100 ? 'text-brand-400' : finalScore >= 80 ? 'text-yellow-400' : 'text-red-400';
    const gradeBg = finalScore >= 110 ? 'from-emerald-500/20 to-transparent border-emerald-500/25' :
        finalScore >= 100 ? 'from-brand-500/20 to-transparent border-brand-500/25' :
            finalScore >= 80 ? 'from-yellow-500/20 to-transparent border-yellow-500/25' :
                'from-red-500/20 to-transparent border-red-500/25';

    const metrics = [
        { label: 'Base Score', value: base, color: 'bg-brand-500', text: 'text-brand-400', bar: base / maxPossible },
        { label: 'Speed Bonus', value: `+${speed_bonus}`, color: 'bg-emerald-500', text: 'text-emerald-400', bar: (speed_bonus ?? 0) / maxPossible },
        ...(efficiency_penalty < 0 ? [{ label: 'Penalty', value: efficiency_penalty, color: 'bg-red-500', text: 'text-red-400', bar: Math.abs(efficiency_penalty) / maxPossible }] : []),
    ];

    return (
        <motion.section className="glass-card overflow-hidden"
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>

            {/* Header */}
            <div className="flex items-center gap-3 p-5 pb-0">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/25 flex-shrink-0">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                </div>
                <div>
                    <h2 className="text-sm font-bold text-white tracking-wide">Score Breakdown</h2>
                    <p className="text-[11px] text-gray-500">Performance rating for this run</p>
                </div>
            </div>

            {/* Score Ring + Grade */}
            <div className="flex items-center gap-4 px-5 pt-4 pb-2">
                <div className="relative flex-shrink-0">
                    <AnimatedRing value={finalScore} max={maxPossible} />
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className={`text-2xl font-black leading-none ${gradeColor}`}>{finalScore}</span>
                        <span className={`text-[10px] font-bold ${gradeColor} opacity-70 mt-0.5`}>Grade {grade}</span>
                    </div>
                </div>

                {/* Metric bars */}
                <div className="flex-1 space-y-3">
                    {metrics.map(({ label, value, color, text, bar }) => (
                        <div key={label}>
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-[11px] text-gray-500">{label}</span>
                                <span className={`text-[11px] font-bold font-mono ${text}`}>{value}</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
                                <motion.div
                                    className={`h-full rounded-full ${color}`}
                                    initial={{ width: 0 }}
                                    animate={{ width: `${Math.min(bar * 100, 100)}%` }}
                                    transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Final Score strip */}
            <div className={`mx-4 mb-4 mt-2 py-3 rounded-2xl border bg-gradient-to-r ${gradeBg} text-center`}>
                <span className={`text-3xl font-black ${gradeColor}`}>{finalScore}</span>
                <span className="text-gray-500 text-sm font-medium ml-1">/ {maxPossible}</span>
                <p className="text-[10px] text-gray-600 mt-0.5 uppercase tracking-widest font-semibold">Final Score</p>
            </div>
        </motion.section>
    );
}
