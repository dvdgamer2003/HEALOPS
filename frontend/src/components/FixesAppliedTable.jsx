import { useState, useMemo } from 'react';
import useAgentStore from '../store/useAgentStore';

const BUG_BADGE_STYLES = {
    LINTING: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
    SYNTAX: 'bg-red-500/15 text-red-400 border-red-500/30',
    LOGIC: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
    TYPE_ERROR: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
    IMPORT: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    INDENTATION: 'bg-gray-500/15 text-gray-400 border-gray-500/30',
    CONFIG: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
    GENERATED_TEST: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
};

export default function FixesAppliedTable() {
    const { results } = useAgentStore();
    const [sortKey, setSortKey] = useState(null);
    const [sortDir, setSortDir] = useState('asc');

    const fixes = results?.fixes ?? [];

    const sorted = useMemo(() => {
        if (!sortKey) return fixes;
        return [...fixes].sort((a, b) => {
            const av = a[sortKey] ?? '';
            const bv = b[sortKey] ?? '';
            const cmp = String(av).localeCompare(String(bv));
            return sortDir === 'asc' ? cmp : -cmp;
        });
    }, [fixes, sortKey, sortDir]);

    function toggleSort(key) {
        if (sortKey === key) {
            setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortKey(key);
            setSortDir('asc');
        }
    }

    const SortIcon = ({ col }) => (
        <svg className={`w-3.5 h-3.5 inline ml-1 transition-transform ${sortKey === col && sortDir === 'desc' ? 'rotate-180' : ''} ${sortKey === col ? 'text-brand-400' : 'text-gray-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
        </svg>
    );

    if (!results) {
        return (
            <section className="glass-card p-8 animate-fade-in flex flex-col items-center justify-center min-h-[200px]">
                <div className="w-16 h-16 rounded-2xl bg-surface-900/80 flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                </div>
                <p className="text-gray-500 text-sm font-medium">Applied fixes will appear here</p>
            </section>
        );
    }

    return (
        <section className="glass-card p-8 animate-slide-up">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                </div>
                <h2 className="text-xl font-bold text-white">Fixes Applied</h2>
                <span className="ml-auto badge bg-surface-900/60 text-gray-400 border border-white/[0.06]">
                    {fixes.length} total
                </span>
            </div>

            {/* Table */}
            <div className="overflow-x-auto -mx-2">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-white/[0.06]">
                            <th className="text-left py-3 px-2 text-gray-400 font-medium cursor-pointer select-none hover:text-gray-200 transition-colors" onClick={() => toggleSort('file')}>
                                File <SortIcon col="file" />
                            </th>
                            <th className="text-left py-3 px-2 text-gray-400 font-medium cursor-pointer select-none hover:text-gray-200 transition-colors" onClick={() => toggleSort('bug_type')}>
                                Bug Type <SortIcon col="bug_type" />
                            </th>
                            <th className="text-center py-3 px-2 text-gray-400 font-medium">Line</th>
                            <th className="text-left py-3 px-2 text-gray-400 font-medium">Commit Message</th>
                            <th className="text-center py-3 px-2 text-gray-400 font-medium">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                        {sorted.map((fix, i) => (
                            <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                                <td className="py-3 px-2 font-mono text-xs text-gray-300 max-w-[180px] truncate" title={fix.file}>{fix.file}</td>
                                <td className="py-3 px-2">
                                    <span className={`badge border ${BUG_BADGE_STYLES[fix.bug_type] || 'bg-gray-500/15 text-gray-400 border-gray-500/30'}`}>
                                        {fix.bug_type}
                                    </span>
                                </td>
                                <td className="py-3 px-2 text-center font-mono text-gray-400">{fix.line_number}</td>
                                <td className="py-3 px-2 text-xs text-gray-400 max-w-[250px] truncate" title={fix.commit_message}>{fix.commit_message}</td>
                                <td className="py-3 px-2 text-center">
                                    {fix.status === 'Fixed' ? (
                                        <span className="text-emerald-400 text-lg" title="Fixed">✓</span>
                                    ) : fix.status === 'Generated' ? (
                                        <span className="text-emerald-400 text-lg" title="AI Generated">🤖</span>
                                    ) : (
                                        <span className="text-red-400 text-lg" title="Failed">✗</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {fixes.length === 0 && (
                    <p className="text-center text-gray-500 text-sm py-8">No fixes recorded yet.</p>
                )}
            </div>
        </section>
    );
}
