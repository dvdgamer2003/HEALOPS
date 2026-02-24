import { useState, useEffect, useRef } from 'react';
import useAgentStore from '../store/useAgentStore';
import { runAgent } from '../services/api';
import { motion } from 'framer-motion';

export default function InputSection() {
    const [githubUrl, setGithubUrl] = useState('');
    const [commitMessage, setCommitMessage] = useState('');
    const [githubToken, setGithubToken] = useState('');
    const [autoCommit, setAutoCommit] = useState(true);
    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [elapsed, setElapsed] = useState(0);
    const [timeLeft, setTimeLeft] = useState(180); // 3 minutes ETA countdown
    const timerRef = useRef(null);

    const { status, currentStep, error, setRunId, startPolling, reset } = useAgentStore();
    const isRunning = status === 'RUNNING' || status === 'AWAITING_APPROVAL';
    const isDone = status === 'PASSED' || status === 'FAILED' || status === 'REJECTED';

    // Elapsed & Countdown timer
    useEffect(() => {
        if (isRunning) {
            setElapsed(0);
            setTimeLeft(180);
            timerRef.current = setInterval(() => {
                setElapsed((e) => e + 1);
                setTimeLeft((t) => Math.max(0, t - 1));
            }, 1000);
        } else {
            if (timerRef.current) clearInterval(timerRef.current);
        }
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [isRunning]);

    const mins = String(Math.floor(elapsed / 60)).padStart(2, '0');
    const secs = String(elapsed % 60).padStart(2, '0');

    const etaMins = String(Math.floor(timeLeft / 60)).padStart(2, '0');
    const etaSecs = String(timeLeft % 60).padStart(2, '0');

    function validate() {
        const errs = {};
        const ghPattern = /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/?$/;
        if (!githubUrl.trim()) errs.githubUrl = 'Repository URL is required';
        else if (!ghPattern.test(githubUrl.trim())) errs.githubUrl = 'Must be a valid GitHub URL (https://github.com/user/repo)';

        if (!commitMessage.trim()) errs.commitMessage = 'Commit description is required';
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
                commit_message: commitMessage.trim(),
                github_token: githubToken.trim(),
                auto_commit: autoCommit,
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

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 15 },
        visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
    };

    return (
        <motion.section
            className="premium-box p-8 relative overflow-hidden group"
            aria-label="Agent configuration"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
        >
            {/* Background Glow */}
            <div className="absolute -top-32 -right-32 w-96 h-96 bg-brand-600/10 rounded-full blur-[100px] pointer-events-none group-hover:bg-brand-500/20 transition-colors duration-700" />
            <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-purple-600/10 rounded-full blur-[100px] pointer-events-none group-hover:bg-purple-500/20 transition-colors duration-700" />

            {/* Header */}
            <motion.div variants={itemVariants} className="flex items-center gap-4 mb-8 relative z-10">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center shadow-lg shadow-brand-500/30 border border-white/10 ring-1 ring-white/5">
                    <svg className="w-6 h-6 text-white drop-shadow-md" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                </div>
                <div className="flex-1">
                    <h2 className="text-xl font-bold tracking-tight text-white mb-0.5">Initialize Healing Agent</h2>
                    <p className="text-sm text-gray-400 font-medium">Configure target repository & credentials</p>
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
            </motion.div>

            <motion.form
                onSubmit={handleSubmit}
                className="space-y-6 relative z-10"
                noValidate
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                {/* GitHub URL */}
                <motion.div variants={itemVariants} className="relative group">
                    <label htmlFor="github-url" className="block text-sm font-semibold text-gray-300 mb-2 transition-colors group-focus-within:text-brand-400 flex items-center justify-between">
                        <span>GitHub Repository URL <span className="text-brand-400">*</span></span>
                        <svg className="w-4 h-4 text-gray-500 group-focus-within:text-brand-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                    </label>
                    <div className="relative">
                        <input
                            id="github-url"
                            type="url"
                            value={githubUrl}
                            onChange={(e) => setGithubUrl(e.target.value)}
                            placeholder="https://github.com/organization/repo-name"
                            className={`input-field font-mono text-sm group-hover:bg-surface-800/80 ${errors.githubUrl ? 'ring-2 ring-red-500/50 border-red-500/50' : ''}`}
                            disabled={isRunning || isDone}
                            aria-required="true"
                            aria-invalid={!!errors.githubUrl}
                            aria-describedby={errors.githubUrl ? 'github-url-error' : undefined}
                        />
                        <div className="absolute inset-0 rounded-xl pointer-events-none group-focus-within:ring-1 group-focus-within:ring-brand-500/30 transition-all duration-300" />
                    </div>
                    {errors.githubUrl && (
                        <p id="github-url-error" className="mt-1 text-xs text-red-400" role="alert">{errors.githubUrl}</p>
                    )}
                </motion.div>

                {/* GitHub Token */}
                <motion.div variants={itemVariants} className="relative group">
                    <label htmlFor="github-token" className="block text-sm font-semibold text-gray-300 mb-2 transition-colors group-focus-within:text-brand-400 flex items-center justify-between">
                        <span>GitHub PAT Token <span className="text-brand-400">*</span></span>
                        <svg className="w-4 h-4 text-gray-500 group-focus-within:text-brand-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                        </svg>
                    </label>
                    <div className="relative">
                        <input
                            id="github-token"
                            type="password"
                            value={githubToken}
                            onChange={(e) => setGithubToken(e.target.value)}
                            placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                            className={`input-field font-mono text-sm group-hover:bg-surface-800/80 ${errors.githubToken ? 'ring-2 ring-red-500/50 border-red-500/50' : ''}`}
                            disabled={isRunning || isDone}
                            aria-required="true"
                            aria-invalid={!!errors.githubToken}
                            aria-describedby={errors.githubToken ? 'github-token-error' : undefined}
                        />
                        <div className="absolute inset-0 rounded-xl pointer-events-none group-focus-within:ring-1 group-focus-within:ring-brand-500/30 transition-all duration-300" />
                    </div>
                    {errors.githubToken && (
                        <p id="github-token-error" className="mt-1 text-xs text-red-400" role="alert">{errors.githubToken}</p>
                    )}
                </motion.div>

                {/* Commit Description */}
                <motion.div variants={itemVariants} className="relative group">
                    <label htmlFor="commit-message" className="block text-sm font-semibold text-gray-300 mb-2 transition-colors group-focus-within:text-brand-400 flex items-center justify-between">
                        <span>Target Objective <span className="text-brand-400">*</span></span>
                        <svg className="w-4 h-4 text-gray-500 group-focus-within:text-brand-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                    </label>
                    <div className="relative">
                        <textarea
                            id="commit-message"
                            value={commitMessage}
                            onChange={(e) => setCommitMessage(e.target.value)}
                            placeholder="e.g. Please analyze the syntax errors in utils.py and provide an automated patch."
                            className={`input-field min-h-[100px] resize-y leading-relaxed group-hover:bg-surface-800/80 ${errors.commitMessage ? 'ring-2 ring-red-500/50 border-red-500/50' : ''}`}
                            disabled={isRunning || isDone}
                            aria-required="true"
                            aria-invalid={!!errors.commitMessage}
                            aria-describedby={errors.commitMessage ? 'commit-message-error' : undefined}
                        />
                        <div className="absolute inset-0 rounded-xl pointer-events-none group-focus-within:ring-1 group-focus-within:ring-brand-500/30 transition-all duration-300" />
                    </div>
                    {errors.commitMessage && (
                        <p id="commit-message-error" className="mt-1 text-xs text-red-400" role="alert">{errors.commitMessage}</p>
                    )}
                </motion.div>

                <div className="flex items-center gap-4 py-3 px-4 rounded-xl bg-surface-900/40 border border-white/5 hover:bg-surface-800/50 transition-colors">
                    <button
                        type="button"
                        role="switch"
                        aria-checked={autoCommit}
                        disabled={isRunning || isDone}
                        onClick={() => setAutoCommit(!autoCommit)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:ring-offset-surface-950 transition-colors duration-300 ease-in-out ${autoCommit ? 'bg-brand-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]' : 'bg-surface-700'} ${isRunning || isDone ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        <span className="sr-only">Auto-commit without asking</span>
                        <span aria-hidden="true" className={`pointer-events-none absolute left-0 inline-block h-6 w-6 transform rounded-full bg-white shadow-xl ring-0 transition duration-300 ease-in-out ${autoCommit ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                    <div className="flex flex-col cursor-pointer select-none flex-1" onClick={() => !isRunning && !isDone && setAutoCommit(!autoCommit)}>
                        <span className="text-sm font-bold text-gray-200">Autonomous Execution</span>
                        <span className="text-xs text-gray-500 font-medium">Bypass approval phase and strictly auto-commit to branch</span>
                    </div>
                </div>

                {/* Buttons */}
                <motion.div variants={itemVariants}>
                    {isDone ? (
                        <button
                            type="button"
                            onClick={handleNewRun}
                            className="btn-primary w-full text-center flex items-center justify-center gap-2 !bg-gradient-to-r !from-brand-600 !to-purple-600 hover:!from-brand-500 hover:!to-purple-500"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                            </svg>
                            <span>New Analyse</span>
                        </button>
                    ) : (
                        <button
                            type="submit"
                            disabled={isRunning || isSubmitting}
                            className="btn-primary w-full text-center flex flex-col items-center justify-center py-3.5 relative overflow-hidden group shadow-lg shadow-brand-500/20 hover:shadow-brand-500/40"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] pointer-events-none" />
                            {isRunning || isSubmitting ? (
                                <>
                                    <div className="flex items-center justify-center gap-2">
                                        <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                                            <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
                                        </svg>
                                        <span aria-live="polite" className="font-semibold">{currentStep || 'Initializing agent...'}</span>
                                    </div>
                                    <span className="text-xs text-brand-200 mt-1 font-mono tracking-widest opacity-90 font-medium">
                                        ETA ⏱ {etaMins}:{etaSecs}
                                    </span>
                                </>
                            ) : (
                                <div className="flex items-center justify-center gap-2 my-1 font-semibold tracking-wide">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span>Run Agent</span>
                                </div>
                            )}
                        </button>
                    )}

                    {errors.submit && (
                        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400" role="alert">
                            {errors.submit}
                        </div>
                    )}
                </motion.div>
            </motion.form>

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
        </motion.section>
    );
}
