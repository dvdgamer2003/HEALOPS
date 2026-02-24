import useAgentStore from '../store/useAgentStore';
import { motion } from 'framer-motion';

const STAT_CARDS = [
    {
        key: 'total_failures',
        label: 'Bugs Found',
        icon: <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />,
        gradient: 'from-red-500/20 to-orange-500/5',
        border: 'border-red-500/20',
        iconBg: 'bg-red-500/20 text-red-400',
        value: (r) => r.total_failures ?? 0,
        color: 'text-red-400',
    },
    {
        key: 'total_fixes',
        label: 'Fixes Applied',
        icon: <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />,
        gradient: 'from-emerald-500/20 to-teal-500/5',
        border: 'border-emerald-500/20',
        iconBg: 'bg-emerald-500/20 text-emerald-400',
        value: (r) => r.total_fixes ?? 0,
        color: 'text-emerald-400',
    },
    {
        key: 'iterations',
        label: 'Iterations',
        icon: <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />,
        gradient: 'from-violet-500/20 to-purple-500/5',
        border: 'border-violet-500/20',
        iconBg: 'bg-violet-500/20 text-violet-400',
        value: (r) => r.iterations_used ?? r.ci_cd_timeline?.length ?? '—',
        color: 'text-violet-400',
    },
    {
        key: 'time',
        label: 'Duration',
        icon: <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />,
        gradient: 'from-sky-500/20 to-blue-500/5',
        border: 'border-sky-500/20',
        iconBg: 'bg-sky-500/20 text-sky-400',
        value: (r) => {
            const m = Math.floor((r.time_taken_seconds ?? 0) / 60);
            const s = Math.floor((r.time_taken_seconds ?? 0) % 60);
            return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        },
        color: 'text-sky-400',
    },
];

export default function RunSummaryCard() {
    const { results } = useAgentStore();

    if (!results) {
        return (
            <motion.section className="glass-card p-8 flex flex-col items-center justify-center min-h-[220px]"
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                <div className="w-14 h-14 rounded-2xl bg-surface-900/80 border border-white/5 flex items-center justify-center mb-3">
                    <svg className="w-7 h-7 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                </div>
                <p className="text-gray-600 text-xs font-medium">Summary will appear after the run</p>
            </motion.section>
        );
    }

    const isPassed = results.ci_cd_status === 'PASSED';
    const branchLink = results.branch
        ? `${(results.repo_url || '').replace(/\.git$/, '').replace(/\/$/, '')}/commits/${results.branch}`
        : results.branch_url;

    return (
        <motion.section className="glass-card overflow-hidden"
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>

            {/* Coloured top accent */}
            <div className={`h-[3px] w-full ${isPassed ? 'bg-gradient-to-r from-emerald-500 to-teal-400' : 'bg-gradient-to-r from-red-500 to-orange-400'}`} />

            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-5 pb-4">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/25">
                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-white tracking-wide">Run Summary</h2>
                        <p className="text-[11px] text-gray-500">Pipeline execution report</p>
                    </div>
                </div>
                <span className={`text-xs font-bold px-3 py-1 rounded-full border ${isPassed ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25' : 'text-red-400 bg-red-500/10 border-red-500/25'}`}>
                    {isPassed ? '✓ PASSED' : '✗ FAILED'}
                </span>
            </div>

            {/* Stat cards grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-6 pb-5">
                {STAT_CARDS.map(({ key, label, icon, gradient, border, iconBg, value, color }) => (
                    <motion.div key={key}
                        className={`relative rounded-2xl border bg-gradient-to-b ${gradient} ${border} p-4 overflow-hidden`}
                        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: STAT_CARDS.findIndex(s => s.key === key) * 0.06 }}>
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center mb-3 ${iconBg}`}>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>{icon}</svg>
                        </div>
                        <div className={`text-2xl font-black font-mono leading-none mb-1 ${color}`}>{value(results)}</div>
                        <div className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">{label}</div>
                    </motion.div>
                ))}
            </div>

            {/* Metadata rows */}
            <div className="border-t border-white/[0.04] px-6 py-4 space-y-3">
                {[
                    { label: 'Repository', value: results.repo_url, mono: true },
                    { label: 'Commit message', value: results.commit_message },
                    { label: 'Branch', value: results.branch, mono: true, link: branchLink },
                ].filter(r => r.value).map(({ label, value, mono, link }) => (
                    <div key={label} className="flex items-start justify-between gap-4">
                        <span className="text-[11px] text-gray-600 font-medium flex-shrink-0 pt-0.5">{label}</span>
                        {link ? (
                            <a href={link} target="_blank" rel="noopener noreferrer"
                                className={`text-[11px] font-semibold text-brand-400 hover:text-brand-300 transition-colors ${mono ? 'font-mono' : ''} truncate text-right max-w-[65%] flex items-center gap-1`}>
                                {value}
                                <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                            </a>
                        ) : (
                            <span className={`text-[11px] text-gray-300 font-semibold ${mono ? 'font-mono' : ''} truncate text-right max-w-[65%]`}>{value}</span>
                        )}
                    </div>
                ))}
            </div>
        </motion.section>
    );
}
