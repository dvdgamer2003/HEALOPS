import { useEffect, useRef } from 'react';
import useAgentStore from '../store/useAgentStore';

// Simplify raw agent log messages into human-readable English
function simplifyLog(log) {
    if (!log) return log;

    // Remove emoji prefixes and extra whitespace
    const cleaned = log.replace(/^[✓✗⏭⚠🤖]\s*/, '').trim();

    // Pattern simplifications
    const rules = [
        [/^Cloned\s+https?:\/\/github\.com\/(.+)/i, (_, r) => `📦 Cloned repository: ${r}`],
        [/^Created branch:\s*(.+)/i, (_, b) => `🌿 Working on branch: ${b}`],
        [/^Detected.*?test\s*framework[:\s]*(\w+)/i, (_, f) => `🔍 Test framework: ${f}`],
        [/^Running.*?tests?\s*\(iteration\s*(\d+)\)/i, (_, n) => `🧪 Running tests (attempt ${n})`],
        [/^Tests?\s*PASSED/i, () => `✅ All tests passed!`],
        [/^Tests?\s*FAILED/i, () => `❌ Tests failed — attempting fix`],
        [/^Identified\s+(\d+)\s+fixable/i, (_, n) => `🔍 Found ${n} bug${n > 1 ? 's' : ''} to fix`],
        [/^Iteration\s+(\d+):\s+(\d+)\s+new\s+fix/i, (_, i, n) => `🛠️ Attempt ${i}: Generated ${n} fix${n > 1 ? 'es' : ''}`],
        [/^Committed.*?(\d+)\s*fix.*?\(iteration\s*(\d+)\)/i, (_, n, i) => `📤 Committed ${n} fix${n > 1 ? 'es' : ''} (attempt ${i})`],
        [/^CI\/CD\s+iteration\s+(\d+):\s*(\w+)/i, (_, i, s) => `⚡ CI/CD check ${i}: ${s}`],
        [/^Retrying.*?iteration\s*(\d+)/i, (_, n) => `🔄 Retrying (attempt ${n} of 5)`],
        [/^Skipped\s+(\d+)\s+unfixable/i, (_, n) => `⏭ Skipped ${n} config file${n > 1 ? 's' : ''}`],
        [/^Native push bypassed/i, () => `⚠️ Push skipped — local commit succeeded`],
        [/^Config\s*\/\s*collection\s*fault/i, () => `⚠️ Config issue detected — skipping code fix`],
        [/^No\s*tests?\s*found/i, () => `ℹ️ No tests found in repository`],
        [/^No\s*workflow.*found/i, () => `ℹ️ No GitHub Actions detected`],
        [/^Error:/i, (m) => `❌ ${cleaned}`],
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
        <section className="glass-card p-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                </div>
                <div className="flex-1">
                    <h2 className="text-lg font-bold text-white">Activity Log</h2>
                    <p className="text-xs text-gray-500">Live agent steps</p>
                </div>
                {isActive ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-400 bg-brand-500/10 px-3 py-1 rounded-full border border-brand-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />
                        Live
                    </span>
                ) : hasLogs && (
                    <div className="flex gap-1.5 text-xs">
                        <span className="text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2 py-0.5">{successCount} ✓</span>
                        {errorCount > 0 && <span className="text-red-400 bg-red-500/10 border border-red-500/20 rounded-full px-2 py-0.5">{errorCount} ✗</span>}
                    </div>
                )}
            </div>

            {/* Log Feed */}
            <div
                ref={scrollRef}
                className="max-h-[280px] overflow-y-auto rounded-xl bg-surface-950/60 border border-white/[0.04] p-3 space-y-1.5 scroll-smooth"
                style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.08) transparent' }}
                role="log"
                aria-live="polite"
            >
                {!hasLogs && isActive && (
                    <div className="flex items-center gap-2 text-gray-500 text-sm py-6 justify-center">
                        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                            <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
                        </svg>
                        Starting agent...
                    </div>
                )}
                {simplified.map((log, i) => {
                    const isLatest = i === simplified.length - 1 && isActive;
                    return (
                        <div
                            key={i}
                            className={`flex items-start gap-2 text-sm leading-relaxed px-1 py-0.5 rounded-lg hover:bg-white/[0.02] transition-all ${isLatest ? 'animate-fade-in' : ''}`}
                        >
                            <span className="text-gray-600 font-mono text-[10px] w-4 mt-1 shrink-0 select-none">{i + 1}</span>
                            <span className={`${getStyle(log)} font-medium`}>{log}</span>
                        </div>
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
        </section>
    );
}
