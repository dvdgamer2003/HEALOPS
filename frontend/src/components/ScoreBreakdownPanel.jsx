import {
    RadialBarChart, RadialBar, ResponsiveContainer,
    BarChart, Bar, XAxis, YAxis, Tooltip, Cell,
    Legend
} from 'recharts';
import useAgentStore from '../store/useAgentStore';
import { motion } from 'framer-motion';

// Circular progress ring (SVG)
function RingProgress({ value, max = 130, size = 96, stroke = 7, color = '#6366f1' }) {
    const r = (size - stroke) / 2;
    const circ = 2 * Math.PI * r;
    const pct = Math.min(Math.max(value / max, 0), 1);
    const dash = circ * pct;
    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="rotate-[-90deg]">
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={stroke} />
            <circle cx={size / 2} cy={size / 2} r={r} fill="none"
                stroke={color} strokeWidth={stroke}
                strokeDasharray={`${dash} ${circ}`}
                strokeLinecap="round"
                style={{ transition: 'stroke-dasharray 0.8s ease' }}
            />
        </svg>
    );
}

// Custom tooltip for bar chart
const BarTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const { name, value } = payload[0].payload;
    return (
        <div className="bg-surface-900 border border-white/10 rounded-xl px-3 py-2 text-xs shadow-xl">
            <p className="text-gray-400">{name}</p>
            <p className="text-white font-bold text-sm">{value > 0 ? '+' : ''}{value}</p>
        </div>
    );
};

export default function ScoreBreakdownPanel() {
    const { results } = useAgentStore();

    if (!results?.score) {
        return (
            <motion.section
                className="glass-card p-8 flex flex-col items-center justify-center min-h-[200px]"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
            >
                <div className="w-16 h-16 rounded-2xl bg-surface-900/80 flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                </div>
                <p className="text-gray-500 text-sm font-medium">Score breakdown will appear here</p>
            </motion.section>
        );
    }

    const { base, speed_bonus, efficiency_penalty, final: finalScore } = results.score;

    const ringColor = finalScore >= 100 ? '#10b981' : finalScore >= 70 ? '#6366f1' : '#ef4444';
    const grade = finalScore >= 110 ? 'S' : finalScore >= 100 ? 'A' : finalScore >= 80 ? 'B' : finalScore >= 60 ? 'C' : 'F';
    const gradeColor = finalScore >= 100 ? 'text-emerald-400' : finalScore >= 80 ? 'text-brand-400' : 'text-red-400';

    // Max possible = base + speed_bonus (no penalty scenario)
    const maxPossible = base + Math.max(speed_bonus, 10);

    // Only show penalty in chart if it's actually non-zero
    const barData = [
        { name: 'Base Score', value: base, fill: '#6366f1' },
        { name: 'Speed Bonus', value: speed_bonus, fill: '#10b981' },
        ...(efficiency_penalty < 0 ? [{ name: 'Penalty', value: efficiency_penalty, fill: '#ef4444' }] : []),
        { name: 'Final Score', value: finalScore, fill: ringColor },
    ];

    // Compact breakdown list — hide penalty if 0
    const breakdownRows = [
        { label: 'Base', val: base, color: 'bg-brand-500', text: 'text-brand-400' },
        { label: 'Speed Bonus', val: `+${speed_bonus}`, color: 'bg-emerald-500', text: 'text-emerald-400' },
        ...(efficiency_penalty < 0 ? [{ label: 'Penalty', val: efficiency_penalty, color: 'bg-red-500', text: 'text-red-400' }] : []),
    ];

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 15 },
        visible: { opacity: 1, y: 0 }
    };

    return (
        <motion.section
            className="glass-card p-6"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            {/* Header */}
            <motion.div variants={itemVariants} className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                </div>
                <h2 className="text-xl font-bold text-white">Score Breakdown</h2>
            </motion.div>

            {/* Ring + Grade */}
            <motion.div variants={itemVariants} className="flex items-center gap-5 mb-5">
                <div className="relative flex-shrink-0">
                    <RingProgress value={finalScore} max={maxPossible} color={ringColor} />
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className={`text-xl font-extrabold ${gradeColor}`}>{finalScore}</span>
                        <span className={`text-xs font-bold ${gradeColor} opacity-70`}>Grade {grade}</span>
                    </div>
                </div>
                <div className="flex-1 space-y-2">
                    {breakdownRows.map(({ label, val, color, text }) => (
                        <div key={label} className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1.5">
                                <div className={`w-2 h-2 rounded-full ${color}`} />
                                <span className="text-gray-400">{label}</span>
                            </div>
                            <span className={`font-semibold font-mono ${text}`}>{val}</span>
                        </div>
                    ))}
                </div>
            </motion.div>

            {/* Bar Chart */}
            <motion.div variants={itemVariants} className="mb-4">
                <p className="text-xs text-gray-500 mb-2 font-medium">Score Components</p>
                <div className="h-[${barData.length * 38}px]" style={{ height: `${barData.length * 38}px` }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={barData} layout="vertical" barCategoryGap="25%">
                            <XAxis type="number" hide domain={[0, 140]} />
                            <YAxis
                                type="category"
                                dataKey="name"
                                tick={{ fill: '#6b7280', fontSize: 10 }}
                                width={100}
                            />
                            <Tooltip content={<BarTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                                {barData.map((entry, index) => (
                                    <Cell key={index} fill={entry.fill} fillOpacity={entry.name === 'Final Score' ? 1 : 0.8} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </motion.div>

            {/* Final Score Badge */}
            <motion.div variants={itemVariants} className={`text-center py-2.5 rounded-xl border ${finalScore >= 100 ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
                <p className={`text-2xl font-extrabold ${gradeColor}`}>
                    {finalScore}
                    <span className="text-sm font-medium text-gray-500 ml-1">/ 130</span>
                </p>
                <p className="text-xs text-gray-500 mt-0.5">Final Score</p>
            </motion.div>
        </motion.section>
    );
}
