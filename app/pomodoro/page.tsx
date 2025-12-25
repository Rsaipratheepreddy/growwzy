'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Play, Pause, RotateCcw, Coffee, Brain, Volume2, VolumeX, Settings2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const SESSION_TYPES = {
    work: { label: 'Focus', duration: 25 * 60, icon: Brain },
    short: { label: 'Short Break', duration: 5 * 60, icon: Coffee },
    long: { label: 'Long Break', duration: 15 * 60, icon: Coffee },
};

export default function PomodoroPage() {
    const [mode, setMode] = useState<keyof typeof SESSION_TYPES>('work');
    const [timeLeft, setTimeLeft] = useState(SESSION_TYPES.work.duration);
    const [isActive, setIsActive] = useState(false);
    const [isMuted, setIsMuted] = useState(false);

    const switchMode = useCallback((newMode: keyof typeof SESSION_TYPES) => {
        setMode(newMode);
        setTimeLeft(SESSION_TYPES[newMode].duration);
        setIsActive(false);
    }, []);

    useEffect(() => {
        let interval: any = null;
        if (isActive && timeLeft > 0) {
            interval = setInterval(() => {
                setTimeLeft((prev) => prev - 1);
            }, 1000);
        } else if (timeLeft === 0) {
            setIsActive(false);
            if (!isMuted) {
                const audio = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-alarm-digital-clock-beep-989.mp3');
                audio.play();
            }
            toast.success(`${SESSION_TYPES[mode].label} session finished!`, {
                description: mode === 'work' ? 'Time for a break.' : 'Time to focus!',
            });
            if (mode === 'work') switchMode('short');
            else switchMode('work');
        }
        return () => clearInterval(interval);
    }, [isActive, timeLeft, mode, isMuted, switchMode]);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const progress = (1 - timeLeft / SESSION_TYPES[mode].duration) * 100;

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 pb-24">
            <div className="w-full max-w-xl space-y-12">
                <header className="text-center space-y-2">
                    <h1 className="text-3xl font-black text-foreground tracking-tight">Focus Timer</h1>
                    <p className="text-muted-foreground text-sm font-medium">Use the Pomodoro technique to study better.</p>
                </header>

                <div className="bg-card border border-border rounded-[60px] p-12 shadow-2xl space-y-12 relative overflow-hidden">
                    {/* Progress Background */}
                    <div
                        className="absolute inset-x-0 bottom-0 bg-foreground/5 transition-all duration-1000 ease-linear"
                        style={{ height: `${progress}%` }}
                    />

                    <div className="relative z-10 space-y-12">
                        {/* Mode Selector */}
                        <div className="flex bg-muted/30 p-2 rounded-3xl gap-2">
                            {Object.entries(SESSION_TYPES).map(([key, value]) => (
                                <button
                                    key={key}
                                    onClick={() => switchMode(key as any)}
                                    className={cn(
                                        "flex-1 py-3 px-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all gap-2 flex items-center justify-center",
                                        mode === key ? "bg-foreground text-background shadow-lg" : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                                    )}
                                >
                                    <value.icon className="w-3 h-3" />
                                    <span className="hidden sm:inline">{value.label}</span>
                                </button>
                            ))}
                        </div>

                        {/* Timer Display */}
                        <div className="text-center py-8">
                            <motion.span
                                key={timeLeft}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="text-[120px] font-black tabular-nums text-foreground tracking-tighter leading-none"
                            >
                                {formatTime(timeLeft)}
                            </motion.span>
                        </div>

                        {/* Controls */}
                        <div className="flex items-center justify-center gap-6">
                            <Button
                                onClick={() => setIsActive(!isActive)}
                                className="h-20 px-12 rounded-[32px] bg-foreground text-background hover:scale-[1.02] transition-all flex items-center gap-4 group"
                            >
                                {isActive ? (
                                    <>
                                        <Pause className="w-6 h-6 fill-background" />
                                        <span className="text-lg font-black uppercase tracking-[0.2em]">Pause</span>
                                    </>
                                ) : (
                                    <>
                                        <Play className="w-6 h-6 fill-background" />
                                        <span className="text-lg font-black uppercase tracking-[0.2em]">Start</span>
                                    </>
                                )}
                            </Button>

                            <button
                                onClick={() => switchMode(mode)}
                                className="w-20 h-20 rounded-[32px] bg-foreground/5 hover:bg-foreground/10 transition-colors flex items-center justify-center text-foreground"
                            >
                                <RotateCcw className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Footer Controls */}
                        <div className="pt-8 border-t border-border/50 flex justify-center gap-8">
                            <button
                                onClick={() => setIsMuted(!isMuted)}
                                className="flex items-center gap-3 text-muted-foreground hover:text-foreground transition-colors"
                            >
                                {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                                <span className="text-[10px] font-black uppercase tracking-widest">{isMuted ? 'Muted' : 'Sound On'}</span>
                            </button>
                            <button
                                className="flex items-center gap-3 text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <Settings2 className="w-5 h-5" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Settings</span>
                            </button>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-muted/10 border border-border rounded-3xl p-8 space-y-4">
                        <h3 className="text-sm font-black uppercase tracking-[0.2em] text-foreground">Why 25 Minutes?</h3>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            The Pomodoro Technique uses a timer to break work into intervals, traditionally 25 minutes in length, separated by short breaks.
                        </p>
                    </div>
                    <div className="bg-muted/10 border border-border rounded-3xl p-8 space-y-4">
                        <h3 className="text-sm font-black uppercase tracking-[0.2em] text-foreground">Long Breaks</h3>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            After four focus sessions, take a longer break (15-30 minutes) to recharge your brain for the next study block.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
