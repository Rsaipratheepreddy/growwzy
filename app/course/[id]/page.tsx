'use client';

import React, { useEffect, useState, use } from 'react';
import { repository, Course, Section, Video, Progress } from '@/lib/db';
import { verifyPermission } from '@/lib/fs';
import { formatDuration, formatSize } from '@/lib/video';
import { Play, CheckCircle2, Clock, BookOpen, ChevronDown, ChevronUp, Trash2, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Progress as UIProgress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

export default function CourseDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [course, setCourse] = useState<Course | null>(null);
    const [sections, setSections] = useState<Section[]>([]);
    const [videosBySection, setVideosBySection] = useState<Record<string, Video[]>>({});
    const [progressByVideo, setProgressByVideo] = useState<Record<string, Progress>>({});
    const [loading, setLoading] = useState(true);
    const [hasPermission, setHasPermission] = useState(true);
    const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
    const router = useRouter();

    useEffect(() => {
        const fetchData = async () => {
            try {
                const courseData = await repository.getCourse(id);
                if (!courseData) {
                    toast.error('Course not found');
                    router.push('/');
                    return;
                }
                setCourse(courseData);
                if (courseData.thumbnail_blob) {
                    setThumbnailUrl(URL.createObjectURL(courseData.thumbnail_blob));
                }

                const sectionsData = await repository.getSectionsForCourse(id);
                sectionsData.sort((a, b) => a.order - b.order);
                setSections(sectionsData);
                setExpandedSections(new Set(sectionsData.map(s => s.id)));

                const videosData = await repository.getVideosForCourse(id);
                const groupedVideos: Record<string, Video[]> = {};
                const progressMap: Record<string, Progress> = {};

                for (const video of videosData) {
                    if (!groupedVideos[video.section_id]) groupedVideos[video.section_id] = [];
                    groupedVideos[video.section_id].push(video);

                    const progress = await repository.getProgress(video.id);
                    if (progress) progressMap[video.id] = progress;
                }

                // Sort videos in each section
                Object.keys(groupedVideos).forEach(sid => {
                    groupedVideos[sid].sort((a, b) => a.order - b.order);
                });

                setVideosBySection(groupedVideos);
                setProgressByVideo(progressMap);
                // Check permission if local
                if (courseData.storage_type === 'local' && courseData.directory_handle) {
                    const perm = await verifyPermission(courseData.directory_handle);
                    setHasPermission(perm);
                }
            } catch (error) {
                console.error('Error fetching course details:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
        return () => {
            if (thumbnailUrl) URL.revokeObjectURL(thumbnailUrl);
        };
    }, [id]);

    const toggleSection = (sectionId: string) => {
        const newExpanded = new Set(expandedSections);
        if (newExpanded.has(sectionId)) {
            newExpanded.delete(sectionId);
        } else {
            newExpanded.add(sectionId);
        }
        setExpandedSections(newExpanded);
    };

    const handleDeleteCourse = async () => {
        if (confirm('Are you sure you want to delete this course? All videos and progress will be lost.')) {
            await repository.deleteCourse(id);
            toast.success('Course deleted');
            router.push('/');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!course) return null;

    const progressPercent = Math.round((course.completed_videos / course.total_videos) * 100) || 0;

    // Find first unwatched video to resume
    let resumeVideoId = '';
    for (const section of sections) {
        const videos = videosBySection[section.id] || [];
        const unwatched = videos.find(v => !progressByVideo[v.id]?.completed);
        if (unwatched) {
            resumeVideoId = unwatched.id;
            break;
        }
    }
    if (!resumeVideoId && sections.length > 0) {
        const firstSectionVideos = videosBySection[sections[0].id] || [];
        if (firstSectionVideos.length > 0) resumeVideoId = firstSectionVideos[0].id;
    }

    return (
        <div className="min-h-screen bg-background pb-24 px-6 md:px-12 pt-24">
            <div className="max-w-6xl mx-auto space-y-12">
                {/* Header Information */}
                <header className="space-y-8">
                    <Link href="/" className="inline-flex items-center text-muted-foreground hover:text-foreground transition-colors text-[10px] font-black uppercase tracking-widest gap-2">
                        <ArrowLeft className="w-4 h-4" /> Back to Library
                    </Link>

                    <div className="flex flex-col md:flex-row gap-10 items-start">
                        {/* Thumbnail or placeholder */}
                        <div className="w-full md:w-80 aspect-video rounded-3xl overflow-hidden bg-muted border border-border shrink-0 shadow-2xl">
                            {thumbnailUrl ? (
                                <img src={thumbnailUrl} alt={course.name} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <BookOpen className="w-10 h-10 text-foreground/10" />
                                </div>
                            )}
                        </div>

                        <div className="flex-1 space-y-6">
                            <h1 className="text-4xl md:text-5xl font-black text-foreground tracking-tight leading-tight">
                                {course.name}
                            </h1>

                            <div className="flex flex-wrap items-center gap-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                <div className="flex items-center gap-2">
                                    <span className="text-foreground">{progressPercent}% Completed</span>
                                    <div className="w-24 h-1 bg-foreground/5 rounded-full overflow-hidden">
                                        <div className="h-full bg-foreground" style={{ width: `${progressPercent}%` }} />
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 border-l border-border pl-6">
                                    <BookOpen className="w-4 h-4" />
                                    <span>{course.total_videos} lessons</span>
                                </div>
                                <div className="flex items-center gap-2 border-l border-border pl-6">
                                    <Clock className="w-4 h-4" />
                                    <span>{formatDuration(course.total_duration)} Total</span>
                                </div>
                            </div>

                            {/* Local Storage Auth Warning */}
                            {course.storage_type === 'local' && !hasPermission && (
                                <div className="p-6 bg-card border border-border rounded-3xl flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl shadow-foreground/5">
                                    <div>
                                        <h3 className="text-foreground font-black text-sm uppercase tracking-widest mb-1">Authorization Required</h3>
                                        <p className="text-muted-foreground text-xs font-medium">Local file access must be granted for this session.</p>
                                    </div>
                                    <Button
                                        onClick={async () => {
                                            const perm = await verifyPermission(course.directory_handle!, true);
                                            setHasPermission(perm);
                                            if (perm) toast.success('Access granted!');
                                        }}
                                        className="bg-foreground text-background font-black text-[10px] uppercase tracking-widest px-8 h-12 rounded-xl"
                                    >
                                        Authorize Access
                                    </Button>
                                </div>
                            )}

                            <div className="flex gap-4 pt-4">
                                <Button asChild className="bg-foreground text-background hover:bg-foreground/90 px-10 h-14 text-[10px] uppercase tracking-[0.2em] font-black rounded-2xl shadow-xl shadow-foreground/10 transition-all hover:scale-[1.02]">
                                    <Link href={`/watch/${course.id}/${resumeVideoId}`} className="flex items-center">
                                        <Play className="w-5 h-5 mr-3 fill-background" />
                                        {course.completed_videos > 0 ? 'Resume Journey' : 'Begin Learning'}
                                    </Link>
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={handleDeleteCourse}
                                    className="border-border text-muted-foreground hover:text-red-500 hover:border-red-500/30 h-14 px-8 rounded-2xl transition-all font-black text-[10px] uppercase tracking-widest"
                                >
                                    <Trash2 className="w-4 h-4 mr-2" /> Delete
                                </Button>
                            </div>
                        </div>
                    </div>
                </header>

                <div className="h-px w-full bg-border/50" />

                {/* Content Section */}
                <div className="space-y-8">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Course Content</h2>
                        <span className="text-[10px] font-black uppercase text-foreground">{sections.length} Sections</span>
                    </div>

                    <div className="grid grid-cols-1 gap-6">
                        {sections.map((section) => {
                            const isExpanded = expandedSections.has(section.id);
                            const videos = videosBySection[section.id] || [];

                            return (
                                <div key={section.id} className="bg-card border border-border rounded-[32px] overflow-hidden hover:shadow-2xl hover:shadow-foreground/5 transition-all">
                                    <button
                                        onClick={() => toggleSection(section.id)}
                                        className="w-full flex items-center justify-between p-8 hover:bg-foreground/[0.02] transition-colors text-left"
                                    >
                                        <div className="flex items-center gap-6">
                                            <div className="w-12 h-12 rounded-2xl bg-foreground/5 flex items-center justify-center font-black text-sm text-foreground">
                                                {(section.order + 1).toString().padStart(2, '0')}
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-black text-foreground tracking-tight">{section.name}</h3>
                                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mt-1">{videos.length} videos • {formatDuration(videos.reduce((acc, v) => acc + v.duration, 0))}</p>
                                            </div>
                                        </div>
                                        {isExpanded ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
                                    </button>

                                    <AnimatePresence>
                                        {isExpanded && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="overflow-hidden border-t border-border"
                                            >
                                                <div className="p-4 space-y-2 bg-muted/20">
                                                    {videos.map((video) => {
                                                        const progress = progressByVideo[video.id];
                                                        const isCompleted = progress?.completed;
                                                        const watchPercent = progress ? Math.round((progress.watch_time / video.duration) * 100) : 0;

                                                        return (
                                                            <Link
                                                                key={video.id}
                                                                href={`/watch/${course.id}/${video.id}`}
                                                                className="group flex items-center gap-6 p-4 rounded-2xl hover:bg-background border border-transparent hover:border-border transition-all relative"
                                                            >
                                                                <div className="relative w-40 aspect-video rounded-xl overflow-hidden shrink-0 bg-muted border border-border">
                                                                    {video.thumbnail_blob ? (
                                                                        <img
                                                                            src={URL.createObjectURL(video.thumbnail_blob)}
                                                                            alt={video.title}
                                                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                                                        />
                                                                    ) : (
                                                                        <div className="w-full h-full flex items-center justify-center">
                                                                            <Play className="w-6 h-6 text-foreground/10" />
                                                                        </div>
                                                                    )}
                                                                    <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors" />
                                                                    {isCompleted && (
                                                                        <div className="absolute top-2 right-2 bg-foreground rounded-full p-1.5 shadow-xl z-20">
                                                                            <CheckCircle2 className="w-3.5 h-3.5 text-background" />
                                                                        </div>
                                                                    )}
                                                                    {watchPercent > 0 && !isCompleted && (
                                                                        <div className="absolute bottom-0 left-0 w-full h-1 bg-foreground/10">
                                                                            <div className="h-full bg-foreground" style={{ width: `${watchPercent}%` }} />
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                <div className="flex-1 min-w-0">
                                                                    <h4 className={cn(
                                                                        "text-sm font-black tracking-tight mb-2 truncate group-hover:text-foreground transition-colors",
                                                                        isCompleted ? "text-muted-foreground/60" : "text-foreground"
                                                                    )}>
                                                                        {video.title}
                                                                    </h4>
                                                                    <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                                                        <span>{formatDuration(video.duration)}</span>
                                                                        <span>•</span>
                                                                        <span>{formatSize(video.file_size)}</span>
                                                                    </div>
                                                                </div>

                                                                <div className="opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100">
                                                                    <div className="bg-foreground rounded-xl p-2.5 text-background shadow-xl">
                                                                        <Play className="w-4 h-4 fill-background" />
                                                                    </div>
                                                                </div>
                                                            </Link>
                                                        );
                                                    })}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}

const Button = React.forwardRef<HTMLButtonElement, any>(
    ({ className, size = 'default', variant = 'default', asChild = false, ...props }, ref) => {
        const Comp = asChild ? motion.div : 'button';
        return (
            <Comp
                ref={ref as any}
                className={cn(
                    "inline-flex items-center justify-center transition-all disabled:opacity-50 disabled:pointer-events-none font-black text-[10px] uppercase tracking-widest",
                    variant === 'default' && "bg-foreground text-background hover:bg-foreground/90 rounded-2xl",
                    variant === 'destructive' && "bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white border border-red-500/20 rounded-2xl",
                    variant === 'outline' && "bg-transparent border border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground rounded-2xl",
                    size === 'default' && "h-11 px-6",
                    size === 'lg' && "h-14 px-8",
                    className
                )}
                {...props}
            />
        );
    }
);
Button.displayName = "Button";
