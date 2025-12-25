'use client';

import React, { useState, useEffect, useRef, use } from 'react';
import {
    Play, Pause, RotateCcw, RotateCw, Volume2, VolumeX,
    Maximize, Minimize, ChevronLeft, SkipForward, List, X, CheckCircle2, Timer, ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatDuration } from '@/lib/video';
import { repository, Video, Course, Progress, Section, Task } from '@/lib/db';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import PomodoroTimer from '@/components/PomodoroTimer';
import NotePad from '@/components/NotePad';

export default function WatchPage({ params }: { params: Promise<{ courseId: string, videoId: string }> }) {
    const { courseId, videoId } = use(params);
    const [video, setVideo] = useState<Video | null>(null);
    const [course, setCourse] = useState<Course | null>(null);
    const [progress, setProgress] = useState<Progress | null>(null);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [needsPermission, setNeedsPermission] = useState(false);

    // Player state
    const [playing, setPlaying] = useState(false);
    const [volume, setVolume] = useState(0.8);
    const [muted, setMuted] = useState(false);
    const [playbackRate, setPlaybackRate] = useState(1.0);
    const [played, setPlayed] = useState(0);
    const [playedSeconds, setPlayedSeconds] = useState(0);
    const [duration, setDuration] = useState(0);
    const [seeking, setSeeking] = useState(false);
    const [showControls, setShowControls] = useState(true);

    // UI state
    const [activeTab, setActiveTab] = useState<'summary' | 'transcript' | 'quiz' | 'ask'>('summary');
    const [sidebarTab, setSidebarTab] = useState<'curriculum' | 'notes'>('notes');
    const [showSidebar, setShowSidebar] = useState(true);
    const [showPomodoro, setShowPomodoro] = useState(false);

    const [sections, setSections] = useState<Section[]>([]);
    const [videosBySection, setVideosBySection] = useState<Record<string, Video[]>>({});
    const [progressByVideo, setProgressByVideo] = useState<Record<string, Progress>>({});
    const [nextVideo, setNextVideo] = useState<Video | null>(null);
    const [showNextOverlay, setShowNextOverlay] = useState(false);
    const [nextCountdown, setNextCountdown] = useState(10);

    const playerRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const router = useRouter();

    useEffect(() => {
        const fetchData = async () => {
            try {
                const videoData = await repository.getVideo(videoId);
                const courseData = await repository.getCourse(courseId);
                const progressData = await repository.getProgress(videoId);

                if (!videoData || !courseData) {
                    toast.error('Video or Course not found');
                    router.push('/');
                    return;
                }

                setVideo(videoData);
                setCourse(courseData);
                setProgress(progressData || null);

                if (courseData.storage_type === 'local' && courseData.directory_handle) {
                    const { verifyPermission, getFileHandle } = await import('@/lib/fs');
                    const hasPermission = await verifyPermission(courseData.directory_handle);

                    if (!hasPermission) {
                        setNeedsPermission(true);
                        setLoading(false);
                        return;
                    }

                    const pathSegments = videoData.file_path!.split('/');
                    if (pathSegments[0] === courseData.name) {
                        pathSegments.shift();
                    }

                    const fileHandle = await getFileHandle(courseData.directory_handle, pathSegments);
                    if (fileHandle) {
                        const file = await fileHandle.getFile();
                        const url = URL.createObjectURL(file);
                        setVideoUrl(url);
                    } else {
                        toast.error('Could not find video file in local folder.');
                    }
                } else if (videoData.video_blob) {
                    const url = URL.createObjectURL(videoData.video_blob);
                    setVideoUrl(url);
                }

                if (progressData && progressData.watch_time > 0) {
                    setPlayedSeconds(progressData.watch_time);
                }

                const sectionsData = await repository.getSectionsForCourse(courseId);
                sectionsData.sort((a, b) => a.order - b.order);
                setSections(sectionsData);

                const allVideos = await repository.getVideosForCourse(courseId);
                const grouped: Record<string, Video[]> = {};
                const pMap: Record<string, Progress> = {};

                for (const v of allVideos) {
                    if (!grouped[v.section_id]) grouped[v.section_id] = [];
                    grouped[v.section_id].push(v);
                    const p = await repository.getProgress(v.id);
                    if (p) pMap[v.id] = p;
                }

                Object.keys(grouped).forEach(sid => grouped[sid].sort((a, b) => a.order - b.order));
                setVideosBySection(grouped);
                setProgressByVideo(pMap);

                const flatVideos = sectionsData.flatMap(s => grouped[s.id] || []);
                const currentIndex = flatVideos.findIndex(v => v.id === videoId);
                if (currentIndex !== -1 && currentIndex < flatVideos.length - 1) {
                    setNextVideo(flatVideos[currentIndex + 1]);
                } else {
                    setNextVideo(null);
                }

                const allTasks = await repository.getTasks();
                setTasks(allTasks);

            } catch (error) {
                console.error('Error loading video:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();

        return () => {
            if (videoUrl) URL.revokeObjectURL(videoUrl);
            if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
            if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
        };
    }, [videoId, courseId]);

    useEffect(() => {
        const handleMouseMove = () => {
            setShowControls(true);
            if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
            controlsTimeoutRef.current = setTimeout(() => {
                if (playing) setShowControls(false);
            }, 3000);
        };

        document.addEventListener('mousemove', handleMouseMove);
        return () => document.removeEventListener('mousemove', handleMouseMove);
    }, [playing]);

    useEffect(() => {
        if (!video || !playedSeconds) return;

        const saveProgress = async () => {
            const isCompleted = playedSeconds / (duration || video.duration) > 0.95;
            await repository.updateProgress({
                id: videoId,
                course_id: courseId,
                watch_time: playedSeconds,
                completed: isCompleted || (progress?.completed ?? false),
                last_watched: Date.now(),
                created_at: progress?.created_at ?? Date.now(),
                updated_at: Date.now(),
            });
        };

        const interval = setInterval(saveProgress, 5000);
        return () => clearInterval(interval);
    }, [playedSeconds, videoId, courseId, video, duration, progress]);

    useEffect(() => {
        if (playerRef.current) {
            playerRef.current.volume = muted ? 0 : volume;
        }
    }, [volume, muted]);

    useEffect(() => {
        if (playerRef.current) {
            playerRef.current.playbackRate = playbackRate;
        }
    }, [playbackRate]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
            switch (e.code) {
                case 'Space':
                    e.preventDefault();
                    handlePlayPause();
                    break;
                case 'ArrowLeft':
                    if (playerRef.current) playerRef.current.currentTime = Math.max(0, playerRef.current.currentTime - 10);
                    break;
                case 'ArrowRight':
                    if (playerRef.current) playerRef.current.currentTime = Math.min(duration, playerRef.current.currentTime + 10);
                    break;
                case 'KeyF':
                    toggleFullscreen();
                    break;
                case 'KeyM':
                    setMuted(m => !m);
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [duration]);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            containerRef.current?.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    };

    const handlePlayPause = () => {
        if (!playerRef.current) return;
        if (playing) {
            playerRef.current.pause();
        } else {
            playerRef.current.play();
        }
        setPlaying(!playing);
    };

    const handleTimeUpdate = () => {
        if (!playerRef.current || seeking) return;
        const current = playerRef.current.currentTime;
        const dur = playerRef.current.duration;
        setPlayed(current / dur);
        setPlayedSeconds(current);

        if (dur > 60 && current > dur - 30 && nextVideo && !showNextOverlay) {
            setShowNextOverlay(true);
            startCountdown();
        }
    };
    const [tasks, setTasks] = useState<Task[]>([]);

    const startCountdown = () => {
        setNextCountdown(10);
        if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = setInterval(() => {
            setNextCountdown(prev => {
                if (prev <= 1) {
                    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
                    handleNext();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    const handleNext = () => {
        if (nextVideo) {
            router.push(`/watch/${courseId}/${nextVideo.id}`);
        }
    };

    const cancelNext = () => {
        setShowNextOverlay(false);
        if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };

    const handleGrantPermission = async () => {
        if (!course?.directory_handle) return;
        const { verifyPermission } = await import('@/lib/fs');
        const granted = await verifyPermission(course.directory_handle, true);
        if (granted) {
            setNeedsPermission(false);
            window.location.reload();
        } else {
            toast.error('Permission is required to play local videos.');
        }
    };

    const handleCapture = async (): Promise<Blob | null> => {
        if (!playerRef.current) return null;
        try {
            const canvas = document.createElement('canvas');
            canvas.width = playerRef.current.videoWidth;
            canvas.height = playerRef.current.videoHeight;
            const ctx = canvas.getContext('2d');
            if (!ctx) return null;
            ctx.drawImage(playerRef.current, 0, 0);
            return new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.8));
        } catch (e) {
            console.error('Capture failed:', e);
            return null;
        }
    };

    const handleSeekChange = (value: number[]) => {
        setPlayed(value[0]);
        setSeeking(true);
    };

    const handleSeekMouseUp = (value: number[]) => {
        setSeeking(false);
        if (playerRef.current) {
            playerRef.current.currentTime = value[0] * duration;
        }
    };

    const handleUpdateTaskStatus = async (task: Task, newStatus: 'pending' | 'in-progress' | 'completed') => {
        await repository.updateTask({ ...task, status: newStatus });
        const updatedTasks = await repository.getTasks();
        setTasks(updatedTasks);
        toast.success(`Task moved to ${newStatus.replace('-', ' ')}`);
    };

    const handleJumpTo = (time: number) => {
        if (playerRef.current) {
            playerRef.current.currentTime = time;
            setPlayedSeconds(time);
            setPlaying(true);
            playerRef.current.play();
        }
    };

    if (loading) {
        return (
            <div className="fixed inset-0 bg-background flex items-center justify-center z-[100]">
                <div className="w-12 h-12 border-4 border-foreground border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (needsPermission) {
        return (
            <div className="fixed inset-0 bg-background flex items-center justify-center z-[100] p-6 text-center">
                <div className="max-w-md bg-card p-8 rounded-2xl border border-border shadow-2xl">
                    <div className="w-20 h-20 bg-foreground/5 rounded-full flex items-center justify-center mx-auto mb-6">
                        <List className="w-10 h-10 text-foreground" />
                    </div>
                    <h2 className="text-2xl font-bold text-foreground mb-4">Access Required</h2>
                    <p className="text-muted-foreground mb-8 leading-relaxed">
                        To play videos from your local folder, the browser needs your permission.
                    </p>
                    <Button onClick={handleGrantPermission} className="w-full bg-foreground text-background hover:bg-foreground/90 font-bold h-14 rounded-xl">
                        Grant Access & Play
                    </Button>
                </div>
            </div>
        );
    }

    if (!videoUrl) {
        return (
            <div className="fixed inset-0 bg-black flex items-center justify-center z-[100]">
                <div className="text-white text-center">
                    <p className="mb-4">Failed to load video.</p>
                    <Button onClick={() => window.location.reload()}>Retry</Button>
                </div>
            </div>
        );
    }

    return (
        <div ref={containerRef} className="fixed inset-0 bg-background z-[100] flex flex-col md:flex-row overflow-hidden select-none">
            {/* Left Column: Video */}
            <div className="flex-1 bg-black relative flex items-center justify-center group/player overflow-hidden h-full">
                {/* Watch Header Overlay */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: showControls ? 1 : 0, y: showControls ? 0 : -20 }}
                    className="absolute top-0 left-0 right-0 p-6 bg-gradient-to-b from-black/80 via-black/40 to-transparent z-[60] flex items-center justify-between pointer-events-none group-hover/player:opacity-100 transition-opacity"
                >
                    <div className="flex items-center gap-4 pointer-events-auto">
                        <Link href={`/course/${courseId}`} className="text-white/60 hover:text-white transition-colors">
                            <ChevronLeft className="w-6 h-6" />
                        </Link>
                        <div className="flex flex-col min-w-0">
                            <span className="text-[10px] font-black text-white/40 uppercase tracking-widest truncate">{course?.name}</span>
                            <span className="text-sm font-black text-white truncate">{video?.title}</span>
                        </div>
                    </div>
                </motion.div>

                <div className="w-full h-full relative" onClick={handlePlayPause}>
                    <video
                        ref={playerRef}
                        src={videoUrl}
                        className="w-full h-full object-contain"
                        onTimeUpdate={handleTimeUpdate}
                        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
                        onEnded={handleNext}
                        onPlay={() => setPlaying(true)}
                        onPause={() => setPlaying(false)}
                        autoPlay
                        playsInline
                    />
                </div>

                <AnimatePresence>
                    {showControls && (
                        <>
                            {/* Previous/Next Overlays */}
                            {showNextOverlay && nextVideo && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    className="absolute inset-0 z-[80] bg-black/80 backdrop-blur-2xl flex flex-col items-center justify-center p-10 text-center"
                                >
                                    <div className="w-32 h-32 rounded-3xl bg-white/10 flex items-center justify-center mb-8">
                                        <SkipForward className="w-12 h-12 text-white fill-white" />
                                    </div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">Up Next in {nextCountdown}s</p>
                                    <h3 className="text-2xl font-black text-white mb-8 max-w-md">{nextVideo.title}</h3>
                                    <div className="flex gap-4">
                                        <Button onClick={() => setShowNextOverlay(false)} variant="ghost" className="text-white hover:bg-white/10 rounded-2xl h-12 px-8 font-black uppercase text-[10px] tracking-widest">Cancel</Button>
                                        <Button onClick={handleNext} className="bg-white text-black hover:bg-white/90 rounded-2xl h-12 px-8 font-black uppercase text-[10px] tracking-widest">Play Now</Button>
                                    </div>
                                </motion.div>
                            )}

                            {/* Sidebar Toggle */}
                            <motion.button
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                onClick={() => setShowSidebar(!showSidebar)}
                                className="absolute right-6 top-1/2 -translate-y-1/2 z-[75] w-12 h-12 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl flex items-center justify-center text-white hover:bg-white/20 transition-all shadow-2xl group/toggle pointer-events-auto"
                            >
                                {showSidebar ? <ChevronLeft className="w-6 h-6 rotate-180 group-hover/toggle:scale-110 transition-transform" /> : <ChevronLeft className="w-6 h-6 group-hover/toggle:scale-110 transition-transform" />}
                            </motion.button>

                            {/* Bottom Controls Overlay */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 20 }}
                                className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black/80 via-black/40 to-transparent z-[70] pointer-events-none"
                            >
                                <div className="max-w-7xl mx-auto space-y-6 pointer-events-auto">
                                    {/* Timeline */}
                                    <div className="px-2">
                                        <Slider
                                            value={[played]}
                                            max={1}
                                            step={0.0001}
                                            onValueChange={handleSeekChange}
                                            onValueCommit={handleSeekMouseUp}
                                            className="cursor-pointer"
                                        />
                                        <div className="flex justify-between mt-3 text-[10px] font-mono text-white/50">
                                            <span>{formatDuration(playedSeconds)}</span>
                                            <span>{formatDuration(duration)}</span>
                                        </div>
                                    </div>

                                    {/* Main Controls Row */}
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-8">
                                            <button onClick={handlePlayPause} className="text-white hover:scale-110 transition-transform">
                                                {playing ? <Pause className="w-8 h-8 fill-white" /> : <Play className="w-8 h-8 fill-white" />}
                                            </button>
                                            <div className="flex items-center gap-6">
                                                <button onClick={() => { if (playerRef.current) playerRef.current.currentTime -= 10; }} className="text-white/40 hover:text-white transition-colors"><RotateCcw className="w-6 h-6" /></button>
                                                <button onClick={() => { if (playerRef.current) playerRef.current.currentTime += 10; }} className="text-white/40 hover:text-white transition-colors"><RotateCw className="w-6 h-6" /></button>
                                            </div>
                                            <div className="flex items-center gap-4 group/vol">
                                                <button onClick={() => setMuted(!muted)} className="text-white/40 hover:text-white transition-colors">
                                                    {muted || volume === 0 ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
                                                </button>
                                                <div className="w-24 hidden group-hover/vol:block animate-in fade-in slide-in-from-left-2 duration-200">
                                                    <Slider
                                                        value={[muted ? 0 : volume]}
                                                        max={1}
                                                        step={0.01}
                                                        onValueChange={(v) => { setVolume(v[0]); setMuted(false); }}
                                                        className="cursor-pointer"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-8">
                                            {/* Speed Selector */}
                                            <div className="flex items-center p-1 bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl gap-1">
                                                {[1, 1.5, 2].map(r => (
                                                    <button
                                                        key={r}
                                                        onClick={() => setPlaybackRate(r)}
                                                        className={cn(
                                                            "text-[10px] font-black w-10 h-8 rounded-lg transition-all",
                                                            playbackRate === r ? "bg-white text-black shadow-xl" : "text-white/40 hover:text-white hover:bg-white/10"
                                                        )}
                                                    >
                                                        {r}x
                                                    </button>
                                                ))}
                                            </div>
                                            <button onClick={toggleFullscreen} className="text-white/40 hover:text-white transition-colors hover:scale-110">
                                                <Maximize className="w-6 h-6" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>
            </div>

            {/* Right Column: Pro Sidebar Workspace */}
            <AnimatePresence>
                {showSidebar && (
                    <motion.div
                        initial={{ width: 0, opacity: 0 }}
                        animate={{ width: 400, opacity: 1 }}
                        exit={{ width: 0, opacity: 0 }}
                        className="bg-card border-l border-border flex flex-col h-full shrink-0 overflow-hidden"
                    >
                        <div className="p-6 border-b border-border space-y-6">
                            <div className="flex items-center justify-between">
                                <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground">Workspace</h2>
                                <Button variant="ghost" size="icon" className="w-8 h-8 rounded-xl" onClick={() => setShowPomodoro(true)}><Timer className="w-4 h-4" /></Button>
                            </div>
                            <div className="flex p-1 bg-muted rounded-2xl gap-1">
                                {[
                                    { id: 'notes', label: 'Notes' },
                                    { id: 'curriculum', label: 'Curriculum' }
                                ].map(t => (
                                    <button
                                        key={t.id}
                                        onClick={() => setSidebarTab(t.id as any)}
                                        className={cn("flex-1 py-2 text-[10px] font-black uppercase rounded-xl transition-all", sidebarTab === t.id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
                                    >
                                        {t.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-10 scrollbar-hide">
                            {sidebarTab === 'curriculum' && (
                                <div className="space-y-8">
                                    {sections.map(section => (
                                        <div key={section.id} className="space-y-4">
                                            <h4 className="text-[10px] font-black text-muted-foreground uppercase px-1">{section.name}</h4>
                                            <div className="space-y-1">
                                                {(videosBySection[section.id] || []).map(v => {
                                                    const isActive = v.id === videoId;
                                                    const isComp = progressByVideo[v.id]?.completed;
                                                    return (
                                                        <Link key={v.id} href={`/watch/${courseId}/${v.id}`} className={cn("flex items-center gap-3 p-3 rounded-2xl transition-all border border-transparent", isActive ? "bg-foreground/5 border-border text-foreground" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground")}>
                                                            <div className="w-8 h-8 rounded-xl bg-muted border border-border flex items-center justify-center shrink-0">
                                                                {isComp ? <CheckCircle2 className="w-4 h-4 text-foreground/40" /> : isActive ? <Play className="w-3 h-3 fill-foreground" /> : <span className="text-[10px] font-black">{v.order}</span>}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-[11px] font-bold truncate leading-none mb-1">{v.title}</p>
                                                                <p className="text-[9px] font-mono opacity-40">{formatDuration(v.duration)}</p>
                                                            </div>
                                                        </Link>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {sidebarTab === 'notes' && (
                                <div className="h-full flex flex-col">
                                    <NotePad courseId={courseId} videoId={videoId} currentTime={playedSeconds} onJumpTo={handleJumpTo} onCapture={handleCapture} />
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Overlays */}
            <AnimatePresence>
                {showPomodoro && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-background/80 backdrop-blur-sm">
                        <div className="relative z-10 w-full max-w-sm">
                            <PomodoroTimer onClose={() => setShowPomodoro(false)} />
                        </div>
                    </div>
                )}
                {showNextOverlay && nextVideo && (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="fixed bottom-8 right-8 w-80 bg-background border border-border p-6 rounded-3xl shadow-2xl z-[120]">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-[10px] font-black uppercase text-foreground">Up Next: {nextCountdown}s</span>
                            <button onClick={cancelNext}><X className="w-4 h-4 text-muted-foreground" /></button>
                        </div>
                        <h5 className="text-sm font-black mb-6 line-clamp-2">{nextVideo.title}</h5>
                        <div className="flex gap-2">
                            <Button onClick={handleNext} className="flex-1 bg-foreground text-background font-black h-10 text-[10px] uppercase">Play Now</Button>
                            <Button variant="outline" onClick={cancelNext} className="h-10 text-[10px] font-black uppercase">Later</Button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
