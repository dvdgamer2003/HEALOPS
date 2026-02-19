import axios from 'axios';

const api = axios.create({
    baseURL: '/api',
    headers: { 'Content-Type': 'application/json' },
});

/**
 * POST /api/run-agent
 * @param {{ github_url: string, team_name: string, leader_name: string, github_token: string }} payload
 * @returns {{ runId: string, status: string }}
 */
export async function runAgent(payload) {
    const { data } = await api.post('/run-agent', payload);
    return data;
}

/**
 * GET /api/status/:runId
 * @param {string} runId
 * @returns {{ runId: string, status: string, currentStep: string }}
 */
export async function getStatus(runId) {
    const { data } = await api.get(`/status/${runId}`);
    return data;
}

/**
 * GET /api/results/:runId
 * @param {string} runId
 * @returns {object} Full results JSON
 */
export async function getResults(runId) {
    const { data } = await api.get(`/results/${runId}`);
    return data;
}
