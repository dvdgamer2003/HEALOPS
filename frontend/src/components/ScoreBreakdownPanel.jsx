import useAgentStore from '../store/useAgentStore';

// Circular progress ring
function RingProgress({ value, max = 130, size = 100, stroke = 8, color = '#6366f1' }) {
    const r = (size - stroke) / 2;
    const circ = 2 * Math.PI * r;
    const pct = Math.min(Math.max(value / max, 0), 1);
    const dash = circ * pct;

    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="rotate-[-90deg]">
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={stroke} />
            <circle
                cx={size / 2} cy={size / 2} r={r} fill="none"
                stroke={color} strokeWidth={stroke}
                strokeDasharray={`${dash} ${circ}`}
                strokeLinecap="round"
                style={{ transition: 'stroke-dasharray 0.8s ease' }}
            />
        </svg>
    );
}

export default function ScoreBreakdownPanel() {
    const { results } = useAgentStore();

    if (!results?.score) {
        return (
            <section className="glass-card p-8 animate-fade-in flex flex-col items-center justify-center min-h-[200px]">
                <div className="w-16 h-16 rounded-2xl bg-surface-900/80 flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                </div>
                <p className="text-gray-500 text-sm font-medium">Score breakdown will appear here</p>
            </section>
        );
    }

    const { base, speed_bonus, efficiency_penalty, final: finalScore } = results.score;

    const rows = [
        { label: 'Base Score', value: base, sign: '', color: 'bg-brand-500', textColor: 'text-brand-400' },
        { label: 'Speed Bonus', value: speed_bonus, sign: '+', color: 'bg-emerald-500', textColor: 'text-emerald-400' },
        { label: 'Efficiency Penalty', value: efficiency_penalty, sign: '', color: 'bg-red-500', textColor: 'text-red-400' },
    ];

    // Color the ring based on final score
    const ringColor = finalScore >= 100 ? '#10b981' : finalScore >= 70 ? '#6366f1' : '#ef4444';
    const grade = finalScore >= 110 ? 'S' : finalScore >= 100 ? 'A' : finalScore >= 80 ? 'B' : finalScore >= 60 ? 'C' : 'F';
    const gradeColor = finalScore >= 100 ? 'text-emerald-400' : finalScore >= 80 ? 'text-brand-400' : 'text-red-400';

    return (
        <section className="glass-card p-6 animate-slide-up">
            {/* Header */}
            <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                </div>
                <h2 className="text-xl font-bold text-white">Score Breakdown</h2>
            </div>

            {/* Ring + Score */}
            <div className="flex items-center gap-5 mb-5">
                <div className="relative flex-shrink-0">
                    <RingProgress value={finalScore} max={130} size={96} stroke={7} color={ringColor} />
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className={`text-2xl font-extrabold ${gradeColor}`}>{finalScore}</span>
                        <span className={`text-xs font-bold ${gradeColor} opacity-70`}>Grade {grade}</span>
                    </div>
                </div>
                <div className="flex-1 space-y-2.5">
                    {rows.map(({ label, value, sign, color, textColor }) => (
                        <div key={label} className="flex items-center gap-2">
                            <div className={`flex-shrink-0 w-2 h-2 rounded-full ${color}`} />
                            <div className="flex-1">
                                <div className="flex justify-between items-center mb-0.5">
                                    <span className="text-xs text-gray-400">{label}</span>
                                    <span className={`text-xs font-bold font-mono ${textColor}`}>{sign}{value}</span>
                                </div>
                                <div className="h-1 rounded-full bg-white/[0.05] overflow-hidden">
                                    <div
                                        className={`h-full rounded-full ${color}`}
                                        style={{ width: `${Math.min(Math.abs(value) / 130 * 100, 100)}%`, transition: 'width 0.8s ease' }}
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Final score large display */}
            <div className={`text-center py-3 rounded-xl border ${finalScore >= 100 ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
                <p className="text-xs text-gray-500 mb-0.5">Final Score</p>
                <p className={`text-3xl font-extrabold ${gradeColor}`}>{finalScore} <span className="text-sm font-medium text-gray-500">/ 130</span></p>
            </div>
        </section>
    );
}
