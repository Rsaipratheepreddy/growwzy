'use client';

import React, { useState, useEffect } from 'react';
import { Play, Plus, BookOpen, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Course } from '@/lib/db';
import { formatDuration } from '@/lib/video';
import { Card } from '@/components/ui/card';
import Link from 'next/link';

interface CourseCardProps {
    course: Course;
    priority?: boolean;
}

const CourseCard = ({ course, priority = false }: CourseCardProps) => {
    const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
    const [isHovered, setIsHovered] = useState(false);

    useEffect(() => {
        if (course.thumbnail_blob) {
            const url = URL.createObjectURL(course.thumbnail_blob);
            setThumbnailUrl(url);
            return () => URL.revokeObjectURL(url);
        }
    }, [course.thumbnail_blob]);

    const progressPercent = Math.round((course.completed_videos / course.total_videos) * 100) || 0;

    return (
        <motion.div
            className="relative flex-none w-full aspect-video rounded-3xl overflow-hidden cursor-pointer group"
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.3 }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <Link href={`/course/${course.id}`}>
                <Card className="w-full h-full border border-border bg-card relative overflow-hidden shadow-2xl rounded-3xl">
                    {thumbnailUrl ? (
                        <img
                            src={thumbnailUrl}
                            alt={course.name}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        />
                    ) : (
                        <div className="w-full h-full bg-muted flex flex-col items-center justify-center p-6 text-center">
                            <BookOpen className="w-12 h-12 text-foreground/5 mb-4" />
                            <span className="text-foreground/40 text-sm font-bold line-clamp-2">{course.name}</span>
                        </div>
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />

                    <div className="absolute inset-x-0 bottom-0 p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="bg-foreground text-background px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest">
                                {progressPercent === 100 ? "Completed" : "In Progress"}
                            </div>
                            <div className="w-10 h-10 bg-background/20 backdrop-blur-xl border border-white/20 rounded-2xl flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100">
                                <Play className="w-4 h-4 fill-white" />
                            </div>
                        </div>

                        <h3 className="text-white font-black text-lg line-clamp-1 leading-snug">
                            {course.name}
                        </h3>

                        <div className="space-y-3">
                            <div className="flex items-center justify-between text-[10px] font-black text-white/60 uppercase tracking-widest">
                                <span>{progressPercent}% Done</span>
                                <span>{course.completed_videos}/{course.total_videos} Lessons</span>
                            </div>
                            <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progressPercent}%` }}
                                    className="h-full bg-white"
                                />
                            </div>
                        </div>
                    </div>
                </Card>
            </Link>
        </motion.div>
    );
};

export default CourseCard;
