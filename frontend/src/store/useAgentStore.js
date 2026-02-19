import { create } from 'zustand';
import { getStatus, getResults } from '../services/api';

const useAgentStore = create((set, get) => ({
    // ─── State ───
    runId: null,
    status: null,           // 'RUNNING' | 'PASSED' | 'FAILED'
    currentStep: '',
    results: null,
    logs: [],
    error: null,
    isPolling: false,
    _intervalId: null,

    // ─── Actions ───
    setRunId: (runId) => set({ runId, status: 'RUNNING', currentStep: 'Initializing...', results: null, logs: [], error: null }),

    startPolling: () => {
        const { _intervalId } = get();
        if (_intervalId) return; // already polling

        const id = setInterval(async () => {
            const { runId } = get();
            if (!runId) return;

            try {
                const statusRes = await getStatus(runId);
                set({ status: statusRes.status, currentStep: statusRes.currentStep, logs: statusRes.logs || [] });

                if (statusRes.status === 'PASSED' || statusRes.status === 'FAILED') {
                    try {
                        const resultsRes = await getResults(runId);
                        set({ results: resultsRes, isPolling: false });
                        // Surface error_message from the agent results
                        if (resultsRes?.error_message) {
                            set({ error: resultsRes.error_message });
                        }
                    } catch {
                        // Results might not be ready yet
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
        });
    },
}));

export default useAgentStore;
