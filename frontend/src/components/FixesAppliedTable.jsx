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

function StatusIcon({ status }) {
    if (status === 'Fixed') return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2 py-0.5">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Fixed
        </span>
    );
    if (status === 'Generated') return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand-400 bg-brand-500/10 border border-brand-500/20 rounded-full px-2 py-0.5">
            🤖 AI
        </span>
    );
    return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-400 bg-red-500/10 border border-red-500/20 rounded-full px-2 py-0.5">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
            Failed
        </span>
    );
}

export default function FixesAppliedTable() {
    const { results } = useAgentStore();
    const [sortKey, setSortKey] = useState(null);
    const [sortDir, setSortDir] = useState('asc');
    const [filter, setFilter] = useState('ALL');

    const fixes = results?.fixes ?? [];

    const bugTypes = useMemo(() => ['ALL', ...new Set(fixes.map(f => f.bug_type).filter(Boolean))], [fixes]);

    const filtered = useMemo(() => {
        if (filter === 'ALL') return fixes;
        return fixes.filter(f => f.bug_type === filter);
    }, [fixes, filter]);

    const sorted = useMemo(() => {
        if (!sortKey) return filtered;
        return [...filtered].sort((a, b) => {
            const av = a[sortKey] ?? '';
            const bv = b[sortKey] ?? '';
            const cmp = String(av).localeCompare(String(bv));
            return sortDir === 'asc' ? cmp : -cmp;
        });
    }, [filtered, sortKey, sortDir]);

    function toggleSort(key) {
        if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortKey(key); setSortDir('asc'); }
    }

    const SortIcon = ({ col }) => (
        <svg className={`w-3 h-3 inline ml-1 transition-transform ${sortKey === col && sortDir === 'desc' ? 'rotate-180' : ''} ${sortKey === col ? 'text-brand-400' : 'text-gray-600'}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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

    const fixedCount = fixes.filter(f => f.status === 'Fixed' || f.status === 'Generated').length;
    const failedCount = fixes.filter(f => f.status !== 'Fixed' && f.status !== 'Generated').length;

    return (
        <section className="glass-card p-6 animate-slide-up">
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                </div>
                <div className="flex-1">
                    <h2 className="text-xl font-bold text-white">Fixes Applied</h2>
                </div>
                {/* Summary Chips */}
                <div className="flex gap-2">
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2.5 py-1">
                        ✓ {fixedCount} fixed
                    </span>
                    {failedCount > 0 && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-400 bg-red-500/10 border border-red-500/20 rounded-full px-2.5 py-1">
                            ✗ {failedCount} failed
                        </span>
                    )}
                </div>
            </div>

            {/* Bug Type Filter Chips */}
            {bugTypes.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1 mb-4 scrollbar-none" style={{ scrollbarWidth: 'none' }}>
                    {bugTypes.map(type => (
                        <button
                            key={type}
                            onClick={() => setFilter(type)}
                            className={`flex-shrink-0 text-xs font-semibold px-3 py-1 rounded-full border transition-all ${filter === type
                                ? 'bg-brand-500/20 border-brand-500/40 text-brand-400'
                                : 'bg-transparent border-white/10 text-gray-500 hover:text-gray-300 hover:border-white/20'
                                }`}
                        >
                            {type}
                        </button>
                    ))}
                </div>
            )}

            {/* Table */}
            <div className="overflow-x-auto -mx-2">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-white/[0.06]">
                            <th className="text-left py-3 px-2 text-xs text-gray-400 font-semibold cursor-pointer select-none hover:text-gray-200 transition-colors uppercase tracking-wider" onClick={() => toggleSort('file')}>
                                File <SortIcon col="file" />
                            </th>
                            <th className="text-left py-3 px-2 text-xs text-gray-400 font-semibold cursor-pointer select-none hover:text-gray-200 transition-colors uppercase tracking-wider" onClick={() => toggleSort('bug_type')}>
                                Bug Type <SortIcon col="bug_type" />
                            </th>
                            <th className="text-center py-3 px-2 text-xs text-gray-400 font-semibold uppercase tracking-wider">Line</th>
                            <th className="text-left py-3 px-2 text-xs text-gray-400 font-semibold uppercase tracking-wider hidden md:table-cell">Description</th>
                            <th className="text-center py-3 px-2 text-xs text-gray-400 font-semibold uppercase tracking-wider">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.03]">
                        {sorted.map((fix, i) => (
                            <tr key={i} className="hover:bg-white/[0.02] transition-colors group">
                                <td className="py-3 px-2 font-mono text-xs text-gray-300 max-w-[150px] truncate" title={fix.file}>
                                    <span className="group-hover:text-white transition-colors">{fix.file}</span>
                                </td>
                                <td className="py-3 px-2">
                                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${BUG_BADGE_STYLES[fix.bug_type] || 'bg-gray-500/15 text-gray-400 border-gray-500/30'}`}>
                                        {fix.bug_type}
                                    </span>
                                </td>
                                <td className="py-3 px-2 text-center">
                                    <span className="font-mono text-xs bg-surface-900/60 px-2 py-1 rounded-lg text-gray-400">{fix.line_number}</span>
                                </td>
                                <td className="py-3 px-2 text-xs text-gray-500 max-w-[220px] truncate hidden md:table-cell" title={fix.error_message || fix.commit_message}>
                                    {fix.error_message || fix.commit_message}
                                </td>
                                <td className="py-3 px-2 text-center">
                                    <StatusIcon status={fix.status} />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {sorted.length === 0 && (
                    <p className="text-center text-gray-500 text-sm py-8">
                        {fixes.length === 0 ? 'No fixes recorded yet.' : `No fixes for "${filter}" type.`}
                    </p>
                )}
            </div>

            {/* Footer */}
            <div className="mt-3 pt-3 border-t border-white/[0.04] flex items-center justify-between text-xs text-gray-600">
                <span>Showing {sorted.length} of {fixes.length} fix{fixes.length !== 1 ? 'es' : ''}</span>
                <span>Mistral AI · autonomous repair</span>
            </div>
        </section>
    );
}
