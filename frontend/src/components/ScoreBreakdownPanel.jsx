import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import useAgentStore from '../store/useAgentStore';

const COLORS = {
    base: '#6366f1',
    speed_bonus: '#10b981',
    efficiency_penalty: '#ef4444',
};

const LABELS = {
    base: 'Base Score',
    speed_bonus: 'Speed Bonus',
    efficiency_penalty: 'Penalty',
};

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

    const chartData = [
        { name: 'Score', base: base, speed_bonus: speed_bonus, efficiency_penalty: Math.abs(efficiency_penalty) },
    ];

    const breakdown = [
        { key: 'base', value: base, sign: '' },
        { key: 'speed_bonus', value: speed_bonus, sign: '+' },
        { key: 'efficiency_penalty', value: efficiency_penalty, sign: '' },
    ];

    return (
        <section className="glass-card p-8 animate-slide-up">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                </div>
                <h2 className="text-xl font-bold text-white">Score Breakdown</h2>
            </div>

            {/* Final Score */}
            <div className="text-center mb-6">
                <span className="text-6xl font-extrabold bg-gradient-to-r from-brand-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                    {finalScore}
                </span>
                <p className="text-sm text-gray-400 mt-1">Final Score</p>
            </div>

            {/* Breakdown List */}
            <div className="space-y-2 mb-6">
                {breakdown.map(({ key, value, sign }) => (
                    <div key={key} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLORS[key] }} />
                            <span className="text-gray-300">{LABELS[key]}</span>
                        </div>
                        <span className={`font-semibold font-mono ${value >= 0 ? 'text-gray-200' : 'text-red-400'}`}>
                            {sign}{value}
                        </span>
                    </div>
                ))}
            </div>

            {/* Stacked Bar Chart */}
            <div className="h-16">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} layout="vertical" barCategoryGap="0%">
                        <XAxis type="number" hide domain={[0, 130]} />
                        <YAxis type="category" dataKey="name" hide />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#1e1e2e',
                                border: '1px solid rgba(255,255,255,0.06)',
                                borderRadius: '12px',
                                color: '#e2e8f0',
                                fontSize: '12px',
                            }}
                        />
                        <Bar dataKey="base" stackId="a" fill={COLORS.base} radius={[6, 0, 0, 6]} />
                        <Bar dataKey="speed_bonus" stackId="a" fill={COLORS.speed_bonus} />
                        <Bar dataKey="efficiency_penalty" stackId="a" fill={COLORS.efficiency_penalty} radius={[0, 6, 6, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </section>
    );
}
