import axios from 'axios';

// In production (Vercel), set VITE_API_URL to your deployed backend URL.
// In dev, the Vite proxy handles /api → localhost:8000.
const BASE = import.meta.env.VITE_API_URL
    ? `${import.meta.env.VITE_API_URL}/api`
    : '/api';

const api = axios.create({
    baseURL: BASE,
    headers: { 'Content-Type': 'application/json' },
});

/**
 * POST /api/run-agent
 */
export async function runAgent(payload) {
    const { data } = await api.post('/run-agent', payload);
    return data;
}

/**
 * GET /api/status/:runId
 */
export async function getStatus(runId) {
    const { data } = await api.get(`/status/${runId}`);
    return data;
}

/**
 * GET /api/results/:runId
 */
export async function getResults(runId) {
    const { data } = await api.get(`/results/${runId}`);
    return data;
}
/**
 * POST /api/resume/:runId
 */
export async function resumeAgent(runId, approve) {
    const { data } = await api.post(`/resume/${runId}`, { approve });
    return data;
}

/**
 * POST /api/stop/:runId
 */
export async function stopAgent(runId) {
    const { data } = await api.post(`/stop/${runId}`);
    return data;
}
