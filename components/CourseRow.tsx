'use client';

import React, { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Course } from '@/lib/db';
import CourseCard from './CourseCard';
import { cn } from '@/lib/utils';

interface CourseRowProps {
    title: string;
    courses: Course[];
    className?: string;
}

const CourseRow = ({ title, courses, className }: CourseRowProps) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [showLeftArrow, setShowLeftArrow] = useState(false);
    const [showRightArrow, setShowRightArrow] = useState(true);

    const checkScroll = () => {
        if (!scrollRef.current) return;
        const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
        setShowLeftArrow(scrollLeft > 0);
        setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 5);
    };

    useEffect(() => {
        checkScroll();
        window.addEventListener('resize', checkScroll);
        return () => window.removeEventListener('resize', checkScroll);
    }, [courses]);

    const scroll = (direction: 'left' | 'right') => {
        if (!scrollRef.current) return;
        const { clientWidth } = scrollRef.current;
        const scrollAmount = direction === 'left' ? -clientWidth * 0.8 : clientWidth * 0.8;

        scrollRef.current.scrollBy({
            left: scrollAmount,
            behavior: 'smooth',
        });

        // Slight delay to check scroll after animation
        setTimeout(checkScroll, 500);
    };

    if (courses.length === 0) return null;

    return (
        <div className={cn("relative group mb-8 md:mb-12", className)}>
            <div className="flex items-center gap-3 px-4 md:px-12 mb-6">
                <div className="w-1.5 h-6 bg-foreground rounded-full" />
                <h2 className="text-xl md:text-3xl font-extrabold text-foreground tracking-tight">
                    {title}
                </h2>
            </div>

            <div className="relative">
                {/* Left Arrow */}
                {showLeftArrow && (
                    <button
                        onClick={() => scroll('left')}
                        className="absolute left-0 top-0 bottom-0 z-40 w-12 md:w-16 bg-background/60 hover:bg-background/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer backdrop-blur-md border-r border-border"
                    >
                        <ChevronLeft className="w-8 h-8 text-foreground" />
                    </button>
                )}

                {/* Course List */}
                <div
                    ref={scrollRef}
                    onScroll={checkScroll}
                    className="flex gap-4 overflow-x-auto scrollbar-hide px-4 md:px-12 py-4 scroll-smooth"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                    {courses.map((course) => (
                        <CourseCard key={course.id} course={course} />
                    ))}
                </div>

                {/* Right Arrow */}
                {showRightArrow && (
                    <button
                        onClick={() => scroll('right')}
                        className="absolute right-0 top-0 bottom-0 z-40 w-12 md:w-16 bg-background/60 hover:bg-background/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer backdrop-blur-md border-l border-border"
                    >
                        <ChevronRight className="w-8 h-8 text-foreground" />
                    </button>
                )}
            </div>

            <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
        </div>
    );
};

export default CourseRow;
