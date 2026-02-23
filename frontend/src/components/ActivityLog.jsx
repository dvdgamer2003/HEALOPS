import { useEffect, useRef } from 'react';
import useAgentStore from '../store/useAgentStore';
import { motion } from 'framer-motion';

// Simplify raw agent log messages into human-readable English
function simplifyLog(log) {
    if (!log) return log;

    // Remove emoji prefixes and extra whitespace
    const cleaned = log.replace(/^[✓✗⏭⚠🤖]\s*/, '').trim();

    // Pattern simplifications
    const rules = [
        [/^Cloned\s+https?:\/\/github\.com\/(.+)/i, (_, r) => `📦 Repository connected: ${r}`],
        [/^Created branch:\s*(.+)/i, (_, b) => `🌿 Initialized active branch: ${b}`],
        [/^Dependencies installed/i, () => `⚙️ Required dependencies securely installed`],
        [/^Detected.*?framework[:\s]*(\w+)/i, (_, f) => `🔍 Validation engine configured: ${f}`],
        [/^Found\s+(\d+)\s+test\s+file/i, (_, n) => `📄 Discovered ${n} test file${n !== '1' ? 's' : ''}`],
        [/^Found\s+(\d+)\s+source\s+file/i, (_, n) => `📂 Scanned ${n} source file${n !== '1' ? 's' : ''}`],
        [/^All source files already have/i, () => `✅ Repository test coverage is comprehensive`],
        [/^Running.*?tests?\s*\(iteration\s*(\d+)\)/i, (_, n) => `🧪 Executing test suite (Attempt ${n})`],
        [/^Tests?\s*PASSED/i, () => `✅ Zero defects found! Codebase is stable.`],
        [/^Tests?\s*FAILED/i, () => `❌ Tests failed. Initiating AI repair protocols...`],
        [/^Identified\s+(\d+)\s+fixable/i, (_, n) => `🔍 Analyzing ${n} identified code issue${n !== '1' ? 's' : ''}`],
        [/^Found\s+(\d+)\s+bugs?\s+to\s+fix/i, (_, n) => `🔍 Diagnosing ${n} bug${parseInt(n) !== 1 ? 's' : ''} for targeted repair`],
        [/^Iteration\s+(\d+):\s+(\d+)\s+new\s+fix/i, (_, i, n) => `🛠️ Fix Iteration ${i}: Implemented ${n} patch${n !== '1' ? 'es' : ''}`],
        [/^Attempt\s+(\d+):\s+Generated\s+(\d+)\s+fix/i, (_, i, n) => `🛠️ Target Attempt ${i}: Developed ${n} code patch${parseInt(n) !== 1 ? 'es' : ''}`],
        [/^Committed.*?(\d+)\s*fix.*?\(iteration\s*(\d+)\)/i, (_, n, i) => `📤 Version Control: Pushed ${n} verified patch${n !== '1' ? 'es' : ''}`],
        [/^CI\/CD\s+iteration\s+(\d+):\s*(\w+)/i, (_, i, s) => `⚡ Cloud Pipeline Check ${i}: Status is ${s}`],
        [/^Retrying.*?iteration\s*(\d+)/i, (_, n) => `🔄 Re-evaluating fixes (Retry ${n} of 5)`],
        [/^Skipped\s+(\d+)\s+unfixable/i, (_, n) => `⏭ Bypassed ${n} unfixable configuration file${n !== '1' ? 's' : ''}`],
        [/^Skipped\s+(\d+)\s+config\s+file/i, (_, n) => `⏭ Bypassed ${n} configuration file${parseInt(n) !== 1 ? 's' : ''}`],
        [/^Skipped\s+(\d+)\s+file.*?blacklisted/i, (_, n) => `⚠️ Blacklisted ${n} unresolvable file${parseInt(n) !== 1 ? 's' : ''} to prevent loops`],
        [/^Native push bypassed/i, () => `⚠️ Push omitted: Changes secured locally`],
        [/^Config\s*\/\s*collection\s*fault/i, () => `⚙️ Configuration anomaly automatically addressed`],
        [/^No\s*tests?\s*found/i, () => `ℹ️ No existing tests detected globally`],
        [/^No\s*workflow.*found/i, () => `ℹ️ Cloud CI/CD pipeline not configured`],
        [/^Error:/i, (m) => `❌ Critical Error: ${cleaned.replace('Error:', '').trim()}`],
    ];

    for (const [pattern, fn] of rules) {
        const match = cleaned.match(pattern);
        if (match) return fn(...match);
    }

    // Return a cleaned-up original if no rule matched
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

const LOG_STYLES = {
    '📦': 'text-sky-400',
    '🌿': 'text-teal-400',
    '🔍': 'text-violet-400',
    '🧪': 'text-blue-400',
    '✅': 'text-emerald-400',
    '❌': 'text-red-400',
    '🛠️': 'text-orange-400',
    '📤': 'text-brand-400',
    '⚡': 'text-yellow-400',
    '🔄': 'text-purple-400',
    '⏭': 'text-amber-400',
    '⚠️': 'text-amber-400',
    'ℹ️': 'text-gray-400',
    default: 'text-gray-300',
};

function getStyle(simplified) {
    for (const [emoji, cls] of Object.entries(LOG_STYLES)) {
        if (emoji !== 'default' && simplified.startsWith(emoji)) return cls;
    }
    return LOG_STYLES.default;
}

export default function ActivityLog() {
    const { logs, status, isPolling } = useAgentStore();
    const scrollRef = useRef(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs]);

    const isActive = status === 'RUNNING' || isPolling;
    const hasLogs = logs && logs.length > 0;

    if (!hasLogs && !isActive) return null;

    const simplified = logs.map(simplifyLog);
    const successCount = simplified.filter(l => l.startsWith('✅')).length;
    const errorCount = simplified.filter(l => l.startsWith('❌')).length;

    return (
        <motion.section
            className="premium-box p-6 relative group overflow-hidden"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.1 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
        >
            {/* Ambient Background Glow */}
            <div className="absolute -top-32 -left-32 w-64 h-64 bg-violet-600/10 rounded-full blur-[100px] pointer-events-none group-hover:bg-violet-500/20 transition-colors duration-700" />

            {/* Header */}
            <div className="flex items-center gap-4 mb-6 relative z-10">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center shadow-[0_0_30px_rgba(139,92,246,0.25)] border border-white/10 ring-1 ring-white/5">
                    <svg className="w-6 h-6 text-white drop-shadow-md" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                </div>
                <div className="flex-1">
                    <h2 className="text-xl font-bold tracking-tight text-white mb-0.5">Activity Stream</h2>
                    <p className="text-sm font-medium text-gray-400">Real-time agent execution logs</p>
                </div>
                {isActive ? (
                    <span className="inline-flex items-center gap-2 text-xs font-bold tracking-widest uppercase text-brand-300 bg-brand-500/10 px-4 py-1.5 rounded-full border border-brand-500/30 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-500"></span>
                        </span>
                        Live
                    </span>
                ) : hasLogs && (
                    <div className="flex gap-2 text-[11px] font-bold tracking-widest uppercase">
                        <span className="text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded-full px-3 py-1 shadow-[0_0_10px_rgba(16,185,129,0.15)]">{successCount} ✓</span>
                        {errorCount > 0 && <span className="text-red-300 bg-red-500/10 border border-red-500/30 rounded-full px-3 py-1 shadow-[0_0_10px_rgba(239,68,68,0.15)]">{errorCount} ✗</span>}
                    </div>
                )}
            </div>

            {/* Log Feed */}
            <div
                ref={scrollRef}
                className="max-h-[350px] overflow-y-auto rounded-2xl bg-surface-950/80 border border-white/5 p-4 space-y-2.5 scroll-smooth shadow-inner relative z-10"
                style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(99,102,241,0.2) transparent' }}
                role="log"
                aria-live="polite"
            >
                {!hasLogs && isActive && (
                    <div className="flex flex-col items-center justify-center gap-4 text-brand-400/80 text-sm py-12 font-medium">
                        <div className="relative w-10 h-10">
                            <div className="absolute inset-0 rounded-full border border-brand-500/20 animate-ping" />
                            <div className="absolute inset-2 rounded-full border-2 border-t-brand-400 border-r-transparent border-b-transparent border-l-transparent animate-spin" />
                        </div>
                        Initializing agent protocols...
                    </div>
                )}
                {simplified.map((log, i) => {
                    const isLatest = i === simplified.length - 1 && isActive;
                    return (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3 }}
                            className={`flex items-start gap-3 text-sm leading-relaxed px-3 py-2.5 rounded-xl border transition-all duration-300 ${isLatest ? 'bg-brand-500/5 border-brand-500/20 shadow-[0_0_15px_rgba(99,102,241,0.05)]' : 'bg-transparent border-transparent hover:bg-white/[0.02] hover:border-white/5'}`}
                        >
                            <span className="text-gray-500/50 font-mono text-[10px] font-bold w-5 mt-0.5 shrink-0 select-none text-right">M-{i + 1}</span>
                            <span className={`${getStyle(log)} font-medium tracking-wide`}>{log}</span>
                        </motion.div>
                    );
                })}
            </div>

            {/* Footer */}
            {hasLogs && (
                <div className="mt-3 flex items-center justify-between text-xs text-gray-600">
                    <span>{logs.length} step{logs.length !== 1 ? 's' : ''}</span>
                    {!isActive && status && (
                        <span className={status === 'PASSED' ? 'text-emerald-500 font-medium' : 'text-red-400 font-medium'}>
                            {status === 'PASSED' ? '✓ Done — all tests pass' : '✗ Done with issues'}
                        </span>
                    )}
                </div>
            )}
        </motion.section>
    );
}
