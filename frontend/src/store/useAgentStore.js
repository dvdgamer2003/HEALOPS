import { create } from 'zustand';
import { getStatus, getResults } from '../services/api';

// All statuses that indicate the pipeline has finished running
const TERMINAL_STATUSES = new Set(['PASSED', 'FAILED', 'ABORTED', 'REJECTED']);

const useAgentStore = create((set, get) => ({
    // ─── State ───
    runId: null,
    status: null,           // 'RUNNING' | 'AWAITING_APPROVAL' | 'PASSED' | 'FAILED' | 'ABORTED' | 'REJECTED'
    currentStep: '',
    results: null,
    logs: [],
    error: null,
    isPolling: false,
    completionToast: null,  // { type: 'success' | 'error', message: string } | null
    _intervalId: null,

    // ─── Actions ───
    setRunId: (runId) => set({
        runId,
        status: 'RUNNING',
        currentStep: 'Initializing...',
        results: null,
        logs: [],
        error: null,
        completionToast: null,
    }),

    dismissToast: () => set({ completionToast: null }),

    startPolling: () => {
        const { _intervalId } = get();
        if (_intervalId) return; // already polling

        const id = setInterval(async () => {
            const { runId } = get();
            if (!runId) return;

            try {
                const statusRes = await getStatus(runId);
                const newStatus = statusRes.status;
                set({ status: newStatus, currentStep: statusRes.currentStep, logs: statusRes.logs || [] });

                if (TERMINAL_STATUSES.has(newStatus)) {
                    // Attempt to fetch full results (may or may not exist)
                    try {
                        const resultsRes = await getResults(runId);
                        set({ results: resultsRes });
                        if (resultsRes?.error_message) {
                            set({ error: resultsRes.error_message });
                        }
                    } catch {
                        // Results not ready — that's fine, we still show the toast
                    }

                    // Show completion toast notification
                    if (newStatus === 'PASSED') {
                        set({ completionToast: { type: 'success', message: '✅ Agent completed successfully! All tests passed and changes have been pushed to GitHub.' } });
                    } else if (newStatus === 'FAILED') {
                        set({ completionToast: { type: 'error', message: '❌ Agent run finished with failures. Review the results panel for details.' } });
                    } else if (newStatus === 'ABORTED') {
                        set({ completionToast: { type: 'warning', message: '🛑 Agent was manually stopped.' } });
                    } else if (newStatus === 'REJECTED') {
                        set({ completionToast: { type: 'warning', message: '🚫 Commit was rejected. No changes were pushed.' } });
                    }

                    get().stopPolling();
                }
            } catch (err) {
                set({ error: err.message });
                get().stopPolling();
            }
        }, 3000);

        set({ _intervalId: id, isPolling: true });
    },

    stopPolling: () => {
        const { _intervalId } = get();
        if (_intervalId) {
            clearInterval(_intervalId);
            set({ _intervalId: null, isPolling: false });
        }
    },

    reset: () => {
        get().stopPolling();
        set({
            runId: null,
            status: null,
            currentStep: '',
            results: null,
            logs: [],
            error: null,
            isPolling: false,
            completionToast: null,
        });
    },
}));

export default useAgentStore;
