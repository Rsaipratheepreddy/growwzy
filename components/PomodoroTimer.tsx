'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, X, Timer } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PomodoroTimerProps {
    onClose: () => void;
}

const PomodoroTimer = ({ onClose }: PomodoroTimerProps) => {
    const [timeLeft, setTimeLeft] = useState(25 * 60);
    const [isActive, setIsActive] = useState(false);
    const [isBreak, setIsBreak] = useState(false);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (isActive && timeLeft > 0) {
            timerRef.current = setInterval(() => {
                setTimeLeft((prev) => prev - 1);
            }, 1000);
        } else if (timeLeft === 0) {
            handleComplete();
        } else {
            if (timerRef.current) clearInterval(timerRef.current);
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [isActive, timeLeft]);

    const handleComplete = () => {
        setIsActive(false);
        if (timerRef.current) clearInterval(timerRef.current);

        // Notification sound (optional, but good for UX)
        try {
            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
            audio.play();
        } catch (e) {
            console.log('Audio play failed');
        }

        if (!isBreak) {
            setIsBreak(true);
            setTimeLeft(5 * 60);
            setIsActive(true);
        } else {
            setIsBreak(false);
            setTimeLeft(25 * 60);
        }
    };

    const toggleTimer = () => setIsActive(!isActive);

    const resetTimer = () => {
        setIsActive(false);
        setIsBreak(false);
        setTimeLeft(25 * 60);
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 right-8 z-[200] w-64 bg-card border border-border rounded-2xl shadow-2xl p-6 backdrop-blur-xl"
        >
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-indigo-500">
                    <Timer className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-widest">
                        {isBreak ? 'Break Time' : 'Focus Session'}
                    </span>
                </div>
                <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
                    <X className="w-4 h-4" />
                </button>
            </div>

            <div className="text-center mb-6">
                <div className="text-5xl font-mono font-bold tracking-tighter text-foreground tabular-nums">
                    {formatTime(timeLeft)}
                </div>
            </div>

            <div className="flex items-center gap-3 justify-center">
                <Button
                    onClick={toggleTimer}
                    size="icon"
                    className={cn(
                        "w-12 h-12 rounded-full shadow-lg transition-all",
                        isActive ? "bg-amber-500 hover:bg-amber-600" : "bg-indigo-600 hover:bg-indigo-700"
                    )}
                >
                    {isActive ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white ml-1" />}
                </Button>
                <Button
                    onClick={resetTimer}
                    variant="outline"
                    size="icon"
                    className="w-12 h-12 rounded-full border-border hover:bg-accent"
                >
                    <RotateCcw className="w-5 h-5" />
                </Button>
            </div>

            <div className="mt-6 flex justify-between text-[10px] text-muted-foreground uppercase tracking-widest font-medium">
                <span>{isBreak ? '05:00' : '25:00'} min</span>
                <span>{isBreak ? 'Session' : 'Break'} Next</span>
            </div>
        </motion.div>
    );
};

export default PomodoroTimer;
