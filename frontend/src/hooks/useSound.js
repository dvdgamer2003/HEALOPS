import { useCallback } from 'react';

// Single context instance for the entire app, created lazily
let audioContext = null;

const getAudioContext = () => {
    if (typeof window !== 'undefined') {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }
    }
    return audioContext;
};

export const useSound = () => {
    const playClick = useCallback(() => {
        try {
            const ctx = getAudioContext();
            if (!ctx) return;

            const osc = ctx.createOscillator();
            const gainNode = ctx.createGain();

            // A short, low pop sound for UI clicks
            osc.type = 'sine';
            osc.frequency.setValueAtTime(600, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.05);

            gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

            osc.connect(gainNode);
            gainNode.connect(ctx.destination);

            osc.start();
            osc.stop(ctx.currentTime + 0.05);
        } catch (error) {
            console.warn('Audio playClick failed', error);
        }
    }, []);

    const playCompletion = useCallback(() => {
        try {
            const ctx = getAudioContext();
            if (!ctx) return;

            const playNote = (freq, startTime, duration, type = 'sine', volume = 0.1) => {
                const osc = ctx.createOscillator();
                const gainNode = ctx.createGain();

                osc.type = type;
                osc.frequency.setValueAtTime(freq, startTime);

                gainNode.gain.setValueAtTime(0, startTime);
                gainNode.gain.linearRampToValueAtTime(volume, startTime + 0.05);
                gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

                osc.connect(gainNode);
                gainNode.connect(ctx.destination);

                osc.start(startTime);
                osc.stop(startTime + duration);
            };

            const now = ctx.currentTime;

            // A pleasant major arpeggio for completion
            playNote(523.25, now, 0.4, 'sine', 0.1);       // C5
            playNote(659.25, now + 0.15, 0.4, 'sine', 0.1); // E5
            playNote(783.99, now + 0.3, 0.6, 'sine', 0.15); // G5
            playNote(1046.50, now + 0.45, 1.0, 'sine', 0.1); // C6

        } catch (error) {
            console.warn('Audio playCompletion failed', error);
        }
    }, []);

    return { playClick, playCompletion };
};
