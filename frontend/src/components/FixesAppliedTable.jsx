import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useAgentStore from '../store/useAgentStore';

const TYPE_STYLES = {
    LINTING: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/25',
    SYNTAX: 'text-red-400 bg-red-500/10 border-red-500/25',
    LOGIC: 'text-orange-400 bg-orange-500/10 border-orange-500/25',
    TYPE_ERROR: 'text-purple-400 bg-purple-500/10 border-purple-500/25',
    IMPORT: 'text-blue-400 bg-blue-500/10 border-blue-500/25',
    INDENTATION: 'text-gray-400 bg-gray-500/10 border-gray-500/25',
    CONFIG: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/25',
    GENERATED_TEST: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25',
};

const TYPE_DOT = {
    LINTING: 'bg-yellow-400', SYNTAX: 'bg-red-400', LOGIC: 'bg-orange-400',
    TYPE_ERROR: 'bg-purple-400', IMPORT: 'bg-blue-400', INDENTATION: 'bg-gray-400',
    CONFIG: 'bg-cyan-400', GENERATED_TEST: 'bg-emerald-400',
};

function StatusPill({ status }) {
    if (status === 'Fixed') return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 rounded-full px-2 py-0.5">
            <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Fixed
        </span>
    );
    if (status === 'Generated') return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-brand-400 bg-brand-500/10 border border-brand-500/25 rounded-full px-2 py-0.5">
            ✦ Generated
        </span>
    );
    return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-400 bg-red-500/10 border border-red-500/25 rounded-full px-2 py-0.5">
            <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
            Failed
        </span>
    );
}

export default function FixesAppliedTable() {
    const { results } = useAgentStore();
    const [filter, setFilter] = useState('ALL');
    const [sortKey, setSortKey] = useState(null);
    const [sortDir, setSortDir] = useState('asc');
    const [expanded, setExpanded] = useState(null);

    const fixes = results?.fixes ?? [];
    const bugTypes = useMemo(() => ['ALL', ...new Set(fixes.map(f => f.bug_type).filter(Boolean))], [fixes]);

    const filtered = useMemo(() => filter === 'ALL' ? fixes : fixes.filter(f => f.bug_type === filter), [fixes, filter]);
    const sorted = useMemo(() => {
        if (!sortKey) return filtered;
        return [...filtered].sort((a, b) => {
            const cmp = String(a[sortKey] ?? '').localeCompare(String(b[sortKey] ?? ''));
            return sortDir === 'asc' ? cmp : -cmp;
        });
    }, [filtered, sortKey, sortDir]);

    const toggleSort = (key) => {
        if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortKey(key); setSortDir('asc'); }
    };

    if (!results) {
        return (
            <motion.section className="glass-card p-8 flex flex-col items-center justify-center min-h-[200px]"
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                <div className="w-14 h-14 rounded-2xl bg-surface-900/80 flex items-center justify-center mb-3 border border-white/5">
                    <svg className="w-7 h-7 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                </div>
                <p className="text-gray-600 text-xs font-medium">Fixes will appear after the run completes</p>
            </motion.section>
        );
    }

    const fixedCount = fixes.filter(f => f.status === 'Fixed' || f.status === 'Generated').length;
    const failedCount = fixes.filter(f => f.status !== 'Fixed' && f.status !== 'Generated').length;

    return (
        <motion.section className="glass-card overflow-hidden"
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>

            {/* Header */}
            <div className="flex items-center gap-3 px-6 pt-5 pb-4">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/25 flex-shrink-0">
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                </div>
                <div className="flex-1">
                    <h2 className="text-sm font-bold text-white tracking-wide">Fixes Applied</h2>
                    <p className="text-[11px] text-gray-500">AI-generated patches and test files</p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 rounded-full px-2.5 py-1">
                        ✓ {fixedCount} fixed
                    </span>
                    {failedCount > 0 && (
                        <span className="text-[11px] font-bold text-red-400 bg-red-500/10 border border-red-500/25 rounded-full px-2.5 py-1">
                            ✗ {failedCount}
                        </span>
                    )}
                </div>
            </div>

            {/* Filter chips */}
            {bugTypes.length > 1 && (
                <div className="flex gap-2 px-6 pb-4 overflow-x-auto scrollbar-none">
                    {bugTypes.map(type => (
                        <button key={type} onClick={() => setFilter(type)}
                            className={`flex-shrink-0 flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1 rounded-full border transition-all ${filter === type
                                    ? 'bg-brand-500/20 border-brand-500/40 text-brand-300'
                                    : 'bg-transparent border-white/8 text-gray-500 hover:text-gray-300 hover:border-white/20'
                                }`}>
                            {type !== 'ALL' && (
                                <span className={`w-1.5 h-1.5 rounded-full ${TYPE_DOT[type] || 'bg-gray-400'}`} />
                            )}
                            {type}
                        </button>
                    ))}
                </div>
            )}

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-y border-white/[0.05] bg-surface-950/40">
                            <th className="text-left py-2.5 px-6 text-[10px] text-gray-500 font-semibold uppercase tracking-wider cursor-pointer hover:text-gray-300 transition-colors select-none"
                                onClick={() => toggleSort('file')}>
                                File {sortKey === 'file' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                            </th>
                            <th className="text-left py-2.5 px-3 text-[10px] text-gray-500 font-semibold uppercase tracking-wider cursor-pointer hover:text-gray-300 transition-colors select-none"
                                onClick={() => toggleSort('bug_type')}>
                                Type {sortKey === 'bug_type' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                            </th>
                            <th className="text-center py-2.5 px-3 text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Line</th>
                            <th className="text-center py-2.5 px-4 text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        <AnimatePresence initial={false}>
                            {sorted.map((fix, i) => {
                                const isExp = expanded === i;
                                return (
                                    <>
                                        <motion.tr key={i}
                                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                            transition={{ delay: i * 0.03 }}
                                            className="border-b border-white/[0.03] hover:bg-white/[0.025] cursor-pointer transition-colors group"
                                            onClick={() => setExpanded(isExp ? null : i)}>
                                            <td className="py-3 px-6">
                                                <span className="font-mono text-[11px] text-gray-300 group-hover:text-white transition-colors truncate block max-w-[180px]" title={fix.file}>
                                                    {fix.file?.split(/[\\/]/).pop()}
                                                </span>
                                                <span className="text-[10px] text-gray-600 block truncate max-w-[180px]" title={fix.file}>
                                                    {fix.file}
                                                </span>
                                            </td>
                                            <td className="py-3 px-3">
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${TYPE_STYLES[fix.bug_type] || 'text-gray-400 bg-gray-500/10 border-gray-500/25'}`}>
                                                    {fix.bug_type}
                                                </span>
                                            </td>
                                            <td className="py-3 px-3 text-center">
                                                <span className="font-mono text-[11px] bg-surface-900/60 px-2 py-0.5 rounded-lg text-gray-500">
                                                    {fix.line_number || '—'}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                <StatusPill status={fix.status} />
                                            </td>
                                        </motion.tr>
                                        {/* Expanded description row */}
                                        {isExp && (
                                            <motion.tr key={`exp-${i}`}
                                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                                <td colSpan={4} className="pb-3 px-6">
                                                    <div className="bg-surface-900/60 border border-white/[0.05] rounded-xl px-4 py-3 text-[11px] text-gray-400 font-mono leading-relaxed">
                                                        {fix.commit_message || fix.error_message || 'No description available.'}
                                                    </div>
                                                </td>
                                            </motion.tr>
                                        )}
                                    </>
                                );
                            })}
                        </AnimatePresence>
                    </tbody>
                </table>

                {sorted.length === 0 && (
                    <div className="text-center py-10 text-gray-600 text-xs">
                        {fixes.length === 0 ? 'No fixes recorded for this run.' : `No "${filter}" fixes found.`}
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-white/[0.04] flex items-center justify-between text-[11px] text-gray-600">
                <span>Showing {sorted.length} of {fixes.length} fix{fixes.length !== 1 ? 'es' : ''}</span>
                <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-500/60" />
                    HEALOPS · Autonomous Repair
                </span>
            </div>
        </motion.section>
    );
}
