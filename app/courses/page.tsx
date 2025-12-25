'use client';

import React, { useEffect, useState } from 'react';
import { repository, Course } from '@/lib/db';
import CourseCard from '@/components/CourseCard';
import { Search, Filter, BookOpen, Plus, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

export default function CoursesPage() {
    const [courses, setCourses] = useState<Course[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCourses = async () => {
            try {
                const allCourses = await repository.getCourses();
                setCourses(allCourses);
            } catch (error) {
                console.error('Error fetching courses:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchCourses();
    }, []);

    const filteredCourses = courses.filter(course =>
        course.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-foreground border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background pt-24 pb-20 px-6 md:px-12">
            <div className="max-w-7xl mx-auto space-y-12">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="space-y-2">
                        <h1 className="text-4xl font-black text-foreground tracking-tight">My Library</h1>
                        <p className="text-muted-foreground font-medium flex items-center gap-2">
                            <BookOpen className="w-4 h-4" /> {courses.length} courses in your collection
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                        <div className="relative group w-full sm:w-80">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-foreground transition-colors" />
                            <input
                                placeholder="Search your library..."
                                className="w-full bg-card border border-border h-12 rounded-2xl pl-11 pr-4 text-sm focus:border-foreground/30 outline-none transition-all"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <Link href="/upload">
                            <button className="h-12 px-6 bg-foreground text-background rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-foreground/10 hover:scale-[1.02] transition-all shrink-0">
                                <Plus className="w-4 h-4" />
                                Add Course
                            </button>
                        </Link>
                    </div>
                </div>

                {/* Grid */}
                {filteredCourses.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                        {filteredCourses.map((course, i) => (
                            <motion.div
                                key={course.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }}
                            >
                                <CourseCard course={course} />
                            </motion.div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-40 text-center bg-card border border-dashed border-border rounded-[40px]">
                        <div className="w-20 h-20 bg-foreground/5 rounded-3xl flex items-center justify-center mb-6">
                            <Search className="w-10 h-10 text-muted-foreground/20" />
                        </div>
                        <h3 className="text-xl font-black text-foreground">No matches found</h3>
                        <p className="text-muted-foreground text-sm max-w-xs mx-auto mt-2">Try adjusting your search query or upload a new course to your collection.</p>
                        <Link href="/upload">
                            <Button variant="link" className="mt-8 text-foreground font-black uppercase tracking-widest text-[10px]">Upload Course Now</Button>
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}

const Button = React.forwardRef<HTMLButtonElement, any>(
    ({ className, variant = 'default', asChild = false, ...props }, ref) => {
        const Comp = asChild ? 'div' : 'button';
        return (
            <Comp
                ref={ref as any}
                className={cn(
                    "inline-flex items-center justify-center transition-all disabled:opacity-50 disabled:pointer-events-none",
                    variant === 'default' && "h-11 px-6 rounded-xl font-bold bg-foreground text-background",
                    variant === 'link' && "underline-offset-4 hover:underline font-black",
                    className
                )}
                {...props}
            />
        );
    }
);
Button.displayName = "Button";
