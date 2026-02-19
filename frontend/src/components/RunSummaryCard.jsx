import useAgentStore from '../store/useAgentStore';

export default function RunSummaryCard() {
    const { results, status } = useAgentStore();

    if (!results) {
        return (
            <section className="glass-card p-8 animate-fade-in flex flex-col items-center justify-center min-h-[260px]">
                <div className="w-16 h-16 rounded-2xl bg-surface-900/80 flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                </div>
                <p className="text-gray-500 text-sm font-medium">Run summary will appear here</p>
            </section>
        );
    }

    const mins = Math.floor(results.time_taken_seconds / 60);
    const secs = Math.floor(results.time_taken_seconds % 60);
    const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

    const items = [
        { label: 'Repository', value: results.repo_url, mono: true, truncate: true },
        { label: 'Team', value: results.team_name },
        { label: 'Leader', value: results.leader_name },
        { label: 'Branch', value: results.branch, mono: true, link: results.branch_url },
        { label: 'Failures Detected', value: results.total_failures, highlight: 'red' },
        { label: 'Fixes Applied', value: results.total_fixes, highlight: 'green' },
        { label: 'Time Taken', value: timeStr, mono: true },
    ];

    return (
        <section className="glass-card p-8 animate-slide-up">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-bold text-white">Run Summary</h2>
                </div>

                {/* CI/CD Badge */}
                <span
                    className={results.ci_cd_status === 'PASSED' ? 'badge-passed text-sm px-4 py-1.5' : 'badge-failed text-sm px-4 py-1.5'}
                    aria-label={`CI/CD status: ${results.ci_cd_status}`}
                >
                    {results.ci_cd_status === 'PASSED' ? '✓ PASSED' : '✗ FAILED'}
                </span>
            </div>

            {/* Summary Grid */}
            <div className="space-y-3">
                {items.map(({ label, value, mono, truncate, highlight, link }) => (
                    <div key={label} className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0">
                        <span className="text-sm text-gray-400">{label}</span>
                        {link ? (
                            <a
                                href={link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-sm font-semibold font-mono text-brand-400 hover:text-brand-300 transition-colors"
                                title={`View branch on GitHub`}
                            >
                                {value}
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                            </a>
                        ) : (
                            <span
                                className={`text-sm font-semibold ${highlight === 'red'
                                    ? 'text-red-400'
                                    : highlight === 'green'
                                        ? 'text-emerald-400'
                                        : 'text-white'
                                    } ${mono ? 'font-mono text-xs' : ''} ${truncate ? 'max-w-[200px] truncate' : ''}`}
                                title={truncate ? String(value) : undefined}
                            >
                                {value}
                            </span>
                        )}
                    </div>
                ))}
            </div>
        </section>
    );
}
