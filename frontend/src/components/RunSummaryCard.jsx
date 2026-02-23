import useAgentStore from '../store/useAgentStore';
import { motion } from 'framer-motion';

export default function RunSummaryCard() {
    const { results } = useAgentStore();

    if (!results) {
        return (
            <motion.section
                className="glass-card p-8 flex flex-col items-center justify-center min-h-[260px]"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <div className="w-16 h-16 rounded-2xl bg-surface-900/80 flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                </div>
                <p className="text-gray-500 text-sm font-medium">Run summary will appear here</p>
            </motion.section>
        );
    }

    const mins = Math.floor(results.time_taken_seconds / 60);
    const secs = Math.floor(results.time_taken_seconds % 60);
    const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    const isPassed = results.ci_cd_status === 'PASSED';

    const statCards = [
        {
            label: 'Bugs Detected',
            value: results.total_failures ?? 0,
            icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
            ),
            color: 'from-red-500 to-orange-600',
            shadow: 'shadow-red-500/20',
            textColor: 'text-red-400',
        },
        {
            label: 'Fixes Applied',
            value: results.total_fixes ?? 0,
            icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            ),
            color: 'from-emerald-500 to-teal-600',
            shadow: 'shadow-emerald-500/20',
            textColor: 'text-emerald-400',
        },
        {
            label: 'Iterations',
            value: results.iterations_used ?? (results.ci_cd_timeline?.length ?? '-'),
            icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
            ),
            color: 'from-violet-500 to-purple-600',
            shadow: 'shadow-violet-500/20',
            textColor: 'text-violet-400',
        },
        {
            label: 'Time Taken',
            value: timeStr,
            icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            ),
            color: 'from-sky-500 to-blue-600',
            shadow: 'shadow-sky-500/20',
            textColor: 'text-sky-400',
        },
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
            <motion.div variants={itemVariants} className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-bold text-white">Run Summary</h2>
                </div>
                <span
                    className={isPassed ? 'badge-passed text-sm px-4 py-1.5' : 'badge-failed text-sm px-4 py-1.5'}
                    aria-label={`Pipeline status: ${results.ci_cd_status}`}
                >
                    {isPassed ? '✓ PASSED' : '✗ FAILED'}
                </span>
            </motion.div>

            {/* Hero Stat Cards */}
            <div className="grid grid-cols-2 gap-3 mb-5">
                {statCards.map(({ label, value, icon, color, shadow, textColor }) => (
                    <motion.div
                        key={label}
                        variants={itemVariants}
                        className="bg-surface-900/60 border border-white/[0.06] rounded-xl p-4 flex flex-col gap-2 hover:border-white/[0.12] transition-colors"
                    >
                        <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center text-white shadow-lg ${shadow}`}>
                            {icon}
                        </div>
                        <div className={`text-2xl font-extrabold ${textColor} font-mono`}>{value}</div>
                        <div className="text-xs text-gray-500 font-medium">{label}</div>
                    </motion.div>
                ))}
            </div>

            {/* Repo + Branch Info */}
            <motion.div variants={itemVariants} className="space-y-2 pt-3 border-t border-white/[0.04]">
                {[
                    { label: 'Repository', value: results.repo_url, mono: true, truncate: true },
                    { label: 'Description', value: results.commit_message },
                    {
                        label: 'Branch',
                        value: results.branch,
                        mono: true,
                        // Link to commits view so user can see exactly what the AI committed
                        link: results.branch
                            ? `${(results.repo_url || '').replace(/\.git$/, '').replace(/\/$/, '')}/commits/${results.branch}`
                            : results.branch_url,
                    },
                ].map(({ label, value, mono, truncate, link }) => (
                    <div key={label} className="flex items-center justify-between py-1.5 border-b border-white/[0.03] last:border-0">
                        <span className="text-xs text-gray-500">{label}</span>
                        {link ? (
                            <a
                                href={link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs font-semibold font-mono text-brand-400 hover:text-brand-300 transition-colors"
                            >
                                {value}
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                            </a>
                        ) : (
                            <span className={`text-xs font-semibold text-white ${mono ? 'font-mono' : ''} ${truncate ? 'max-w-[180px] truncate' : ''}`}
                                title={truncate ? String(value) : undefined}>
                                {value}
                            </span>
                        )}
                    </div>
                ))}
            </motion.div>
        </motion.section>
    );
}
