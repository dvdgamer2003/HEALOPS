import { useState, useEffect, useRef } from 'react';
import useAgentStore from '../store/useAgentStore';
import { runAgent } from '../services/api';

export default function InputSection() {
    const [githubUrl, setGithubUrl] = useState('');
    const [teamName, setTeamName] = useState('');
    const [leaderName, setLeaderName] = useState('');
    const [githubToken, setGithubToken] = useState('');
    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [elapsed, setElapsed] = useState(0);
    const timerRef = useRef(null);

    const { status, currentStep, error, setRunId, startPolling, reset } = useAgentStore();
    const isRunning = status === 'RUNNING';
    const isDone = status === 'PASSED' || status === 'FAILED';

    // Elapsed timer
    useEffect(() => {
        if (isRunning) {
            setElapsed(0);
            timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
        } else {
            if (timerRef.current) clearInterval(timerRef.current);
        }
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [isRunning]);

    const mins = String(Math.floor(elapsed / 60)).padStart(2, '0');
    const secs = String(elapsed % 60).padStart(2, '0');

    function validate() {
        const errs = {};
        const ghPattern = /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/?$/;
        if (!githubUrl.trim()) errs.githubUrl = 'Repository URL is required';
        else if (!ghPattern.test(githubUrl.trim())) errs.githubUrl = 'Must be a valid GitHub URL (https://github.com/user/repo)';

        if (!teamName.trim()) errs.teamName = 'Team name is required';
        if (!leaderName.trim()) errs.leaderName = 'Leader name is required';
        if (!githubToken.trim()) errs.githubToken = 'GitHub PAT token is required for cloned repository operations';
        return errs;
    }

    async function handleSubmit(e) {
        e.preventDefault();
        const errs = validate();
        setErrors(errs);
        if (Object.keys(errs).length > 0) return;

        setIsSubmitting(true);
        try {
            const res = await runAgent({
                github_url: githubUrl.trim(),
                team_name: teamName.trim(),
                leader_name: leaderName.trim(),
                github_token: githubToken.trim(),
            });
            setRunId(res.runId);
            startPolling();
        } catch (err) {
            setErrors({ submit: err?.response?.data?.detail || err?.response?.data?.error || err.message });
        } finally {
            setIsSubmitting(false);
        }
    }

    function handleNewRun() {
        reset();
        setErrors({});
        setElapsed(0);
    }

    // Friendly error message
    const friendlyError = error
        ? error.includes('403')
            ? '🔒 Push failed: GitHub token does not have write access. Check your PAT permissions (needs "Contents: Read and Write").'
            : error.includes('401')
                ? '🔑 Authentication failed: Invalid GitHub token. Check your GITHUB_TOKEN in .env.'
                : `❌ ${error}`
        : null;

    return (
        <section className="glass-card p-6 animate-fade-in" aria-label="Agent configuration">
            {/* Header */}
            <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center shadow-lg shadow-brand-500/20">
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                </div>
                <div className="flex-1">
                    <h2 className="text-lg font-bold text-white">Launch Healing Agent</h2>
                    <p className="text-xs text-gray-500">Enter a GitHub repo to begin autonomous CI/CD repair</p>
                </div>

                {/* Elapsed Timer */}
                {(isRunning || isDone) && (
                    <div
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono font-semibold border ${isRunning
                            ? 'text-brand-400 bg-brand-500/10 border-brand-500/20'
                            : status === 'PASSED'
                                ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                                : 'text-red-400 bg-red-500/10 border-red-500/20'
                            }`}
                        aria-live="polite"
                        aria-label={`Elapsed time: ${mins}:${secs}`}
                    >
                        {isRunning && <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />}
                        <span>⏱ {mins}:{secs}</span>
                    </div>
                )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                {/* GitHub URL */}
                <div>
                    <label htmlFor="github-url" className="block text-sm font-medium text-gray-300 mb-1.5">
                        GitHub Repository URL <span className="text-red-400">*</span>
                    </label>
                    <input
                        id="github-url"
                        type="url"
                        value={githubUrl}
                        onChange={(e) => setGithubUrl(e.target.value)}
                        placeholder="https://github.com/user/repo"
                        className={`input-field font-mono text-sm ${errors.githubUrl ? 'ring-2 ring-red-500/50 border-red-500/50' : ''}`}
                        disabled={isRunning || isDone}
                        aria-required="true"
                        aria-invalid={!!errors.githubUrl}
                        aria-describedby={errors.githubUrl ? 'github-url-error' : undefined}
                    />
                    {errors.githubUrl && (
                        <p id="github-url-error" className="mt-1 text-xs text-red-400" role="alert">{errors.githubUrl}</p>
                    )}
                </div>

                {/* GitHub Token */}
                <div>
                    <label htmlFor="github-token" className="block text-sm font-medium text-gray-300 mb-1.5">
                        GitHub PAT Token <span className="text-red-400">*</span>
                    </label>
                    <input
                        id="github-token"
                        type="password"
                        value={githubToken}
                        onChange={(e) => setGithubToken(e.target.value)}
                        placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                        className={`input-field font-mono text-sm ${errors.githubToken ? 'ring-2 ring-red-500/50 border-red-500/50' : ''}`}
                        disabled={isRunning || isDone}
                        aria-required="true"
                        aria-invalid={!!errors.githubToken}
                        aria-describedby={errors.githubToken ? 'github-token-error' : undefined}
                    />
                    {errors.githubToken && (
                        <p id="github-token-error" className="mt-1 text-xs text-red-400" role="alert">{errors.githubToken}</p>
                    )}
                </div>

                {/* Team & Leader */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="team-name" className="block text-sm font-medium text-gray-300 mb-1.5">
                            Team Name <span className="text-red-400">*</span>
                        </label>
                        <input
                            id="team-name"
                            type="text"
                            value={teamName}
                            onChange={(e) => setTeamName(e.target.value)}
                            placeholder="CODE WARRIORS"
                            className={`input-field ${errors.teamName ? 'ring-2 ring-red-500/50 border-red-500/50' : ''}`}
                            disabled={isRunning || isDone}
                            aria-required="true"
                            aria-invalid={!!errors.teamName}
                            aria-describedby={errors.teamName ? 'team-name-error' : undefined}
                        />
                        {errors.teamName && (
                            <p id="team-name-error" className="mt-1 text-xs text-red-400" role="alert">{errors.teamName}</p>
                        )}
                    </div>
                    <div>
                        <label htmlFor="leader-name" className="block text-sm font-medium text-gray-300 mb-1.5">
                            Team Leader <span className="text-red-400">*</span>
                        </label>
                        <input
                            id="leader-name"
                            type="text"
                            value={leaderName}
                            onChange={(e) => setLeaderName(e.target.value)}
                            placeholder="John Doe"
                            className={`input-field ${errors.leaderName ? 'ring-2 ring-red-500/50 border-red-500/50' : ''}`}
                            disabled={isRunning || isDone}
                            aria-required="true"
                            aria-invalid={!!errors.leaderName}
                            aria-describedby={errors.leaderName ? 'leader-name-error' : undefined}
                        />
                        {errors.leaderName && (
                            <p id="leader-name-error" className="mt-1 text-xs text-red-400" role="alert">{errors.leaderName}</p>
                        )}
                    </div>
                </div>

                {/* Buttons */}
                {isDone ? (
                    <button
                        type="button"
                        onClick={handleNewRun}
                        className="btn-primary w-full text-center flex items-center justify-center gap-2 !bg-gradient-to-r !from-brand-600 !to-purple-600 hover:!from-brand-500 hover:!to-purple-500"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                        <span>New Run</span>
                    </button>
                ) : (
                    <button
                        type="submit"
                        disabled={isRunning || isSubmitting}
                        className="btn-primary w-full text-center flex items-center justify-center gap-2"
                    >
                        {isRunning || isSubmitting ? (
                            <>
                                <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                                    <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
                                </svg>
                                <span aria-live="polite">{currentStep || 'Starting agent...'}</span>
                            </>
                        ) : (
                            <>
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span>Run Agent</span>
                            </>
                        )}
                    </button>
                )}

                {errors.submit && (
                    <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400" role="alert">
                        {errors.submit}
                    </div>
                )}
            </form>

            {/* Error Banner */}
            {friendlyError && (
                <div className="mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 animate-fade-in" role="alert">
                    <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-red-400 mb-1">Agent Error</p>
                            <p className="text-sm text-red-300/80 leading-relaxed">{friendlyError}</p>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}
