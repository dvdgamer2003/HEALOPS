import { useEffect, useRef } from 'react';
import useAgentStore from '../store/useAgentStore';

export default function ActivityLog() {
    const { logs, status, isPolling } = useAgentStore();
    const scrollRef = useRef(null);

    // Auto-scroll to bottom when new logs arrive
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs]);

    const isActive = status === 'RUNNING' || isPolling;
    const hasLogs = logs && logs.length > 0;

    if (!hasLogs && !isActive) return null;

    return (
        <section className="glass-card p-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                </div>
                <div className="flex-1">
                    <h2 className="text-lg font-bold text-white">Activity Log</h2>
                    <p className="text-xs text-gray-500">Real-time agent progress</p>
                </div>
                {isActive && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-400 bg-brand-500/10 px-3 py-1 rounded-full border border-brand-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />
                        Live
                    </span>
                )}
            </div>

            {/* Log Feed */}
            <div
                ref={scrollRef}
                className="max-h-[320px] overflow-y-auto rounded-xl bg-surface-950/60 border border-white/[0.04] p-4 space-y-1.5 scroll-smooth"
                style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}
                role="log"
                aria-live="polite"
                aria-label="Agent activity log"
            >
                {!hasLogs && isActive && (
                    <div className="flex items-center gap-2 text-gray-500 text-sm py-4 justify-center">
                        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                            <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
                        </svg>
                        Waiting for agent output...
                    </div>
                )}
                {logs.map((log, i) => {
                    const isSuccess = log.startsWith('✓');
                    const isFail = log.startsWith('✗');
                    const isSkip = log.startsWith('⏭');
                    const isLatest = i === logs.length - 1 && isActive;

                    return (
                        <div
                            key={i}
                            className={`flex items-start gap-2.5 text-sm font-mono leading-relaxed transition-all duration-300 ${isLatest ? 'animate-fade-in' : ''
                                }`}
                        >
                            <span className="text-gray-600 text-xs mt-0.5 select-none w-5 text-right shrink-0">
                                {String(i + 1).padStart(2, '0')}
                            </span>
                            <span
                                className={
                                    isSuccess
                                        ? 'text-emerald-400'
                                        : isFail
                                            ? 'text-red-400'
                                            : isSkip
                                                ? 'text-amber-400'
                                                : 'text-gray-300'
                                }
                            >
                                {log}
                            </span>
                        </div>
                    );
                })}
            </div>

            {/* Footer — summary count */}
            {hasLogs && (
                <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                    <span>{logs.length} event{logs.length !== 1 ? 's' : ''} logged</span>
                    {!isActive && status && (
                        <span className={status === 'PASSED' ? 'text-emerald-500' : 'text-red-400'}>
                            {status === 'PASSED' ? '✓ Pipeline complete' : '✗ Pipeline finished'}
                        </span>
                    )}
                </div>
            )}
        </section>
    );
}
