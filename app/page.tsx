'use client';

import React, { useEffect, useState } from 'react';
import CourseRow from '@/components/CourseRow';
import { repository, Course } from '@/lib/db';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Play, Timer, FileText, BookOpen, CheckSquare, ChevronRight, Upload, Plus } from 'lucide-react';
import Link from 'next/link';

export default function Home() {
  const [courses, setCourses] = useState<Course[]>([]);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-foreground border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const inProgressCourses = courses.filter(c => c.completed_videos > 0 && c.completed_videos < c.total_videos);
  const completedLessons = courses.reduce((acc, c) => acc + c.completed_videos, 0);
  const totalLessons = courses.reduce((acc, c) => acc + c.total_videos, 0);

  return (
    <div className="min-h-screen bg-background p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Header Section with Upload CTA */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-black text-foreground tracking-tight">Welcome Back</h1>
            <p className="text-muted-foreground mt-1">Ready to continue your learning journey?</p>
          </div>
          <Link href="/upload">
            <Button size="lg" className="bg-foreground text-background hover:bg-foreground/90 rounded-2xl h-14 px-8 font-black text-sm uppercase tracking-widest gap-3 shadow-xl shadow-foreground/10 transition-all hover:scale-[1.02]">
              <Upload className="w-5 h-5" />
              Upload Course
            </Button>
          </Link>
        </header>

        {/* Learning Overview Section - Now with Real Data */}
        <section>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-card border border-border rounded-[32px] p-8 flex items-start gap-6 hover:shadow-2xl hover:shadow-foreground/5 transition-all cursor-pointer group">
              <div className="w-14 h-14 bg-foreground/5 rounded-2xl flex items-center justify-center group-hover:bg-foreground/10 transition-colors shrink-0">
                <BookOpen className="w-6 h-6 text-foreground" />
              </div>
              <div className="flex-1">
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] block mb-2">Total Courses</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-foreground">{courses.length}</span>
                  <span className="text-xs font-bold text-muted-foreground tracking-tight">Active</span>
                </div>
              </div>
            </div>

            <div className="bg-card border border-border rounded-[32px] p-8 flex items-start gap-6 hover:shadow-2xl hover:shadow-foreground/5 transition-all cursor-pointer group">
              <div className="w-14 h-14 bg-foreground/5 rounded-2xl flex items-center justify-center group-hover:bg-foreground/10 transition-colors shrink-0">
                <CheckSquare className="w-6 h-6 text-foreground" />
              </div>
              <div className="flex-1">
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] block mb-2">Lessons Completed</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-foreground">{completedLessons}</span>
                  <span className="text-xs font-bold text-muted-foreground tracking-tight">/{totalLessons} Total</span>
                </div>
              </div>
            </div>

            <Link href="/upload" className="bg-foreground border border-foreground rounded-[32px] p-8 flex items-center justify-center text-center group hover:shadow-2xl hover:shadow-foreground/20 transition-all">
              <div className="space-y-2">
                <div className="w-12 h-12 bg-background/10 rounded-2xl flex items-center justify-center mx-auto mb-2 text-background">
                  <Plus className="w-6 h-6" />
                </div>
                <p className="text-background font-black uppercase tracking-widest text-[10px]">Add New Material</p>
                <p className="text-background/60 text-xs font-bold">Import your local or cloud courses</p>
              </div>
            </Link>
          </div>
        </section>

        {/* Continue Watching Section */}
        {inProgressCourses.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-8 px-2">
              <h2 className="text-xl font-black text-foreground tracking-tight">Continue Watching</h2>
              <Link href="/courses" className="text-[10px] font-black text-muted-foreground uppercase tracking-widest hover:text-foreground transition-colors">View All Courses</Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {inProgressCourses.map((course) => (
                <Link key={course.id} href={`/course/${course.id}`} className="group space-y-4">
                  <div className="relative aspect-video rounded-[24px] overflow-hidden bg-muted border border-border">
                    {course.thumbnail_blob ? (
                      <img src={URL.createObjectURL(course.thumbnail_blob)} alt={course.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><Play className="w-8 h-8 text-foreground/10" /></div>
                    )}
                    <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors" />
                    <div className="absolute bottom-4 right-4 bg-background/90 backdrop-blur-md px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-tighter">
                      {Math.round((course.completed_videos / course.total_videos) * 100)}% Done
                    </div>
                  </div>
                  <div className="px-2">
                    <h3 className="text-base font-black text-foreground line-clamp-1 mb-3">{course.name}</h3>
                    <div className="h-1.5 w-full bg-foreground/5 rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${(course.completed_videos / course.total_videos) * 100}%` }} className="h-full bg-foreground" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Recently Added Section */}
        <section>
          <div className="flex items-center justify-between mb-8 px-2">
            <h2 className="text-xl font-black text-foreground tracking-tight">Recent Library</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {courses.slice(0, 10).map((course) => (
              <Link key={course.id} href={`/course/${course.id}`} className="group">
                <div className="relative aspect-video rounded-2xl overflow-hidden bg-muted border border-border mb-3">
                  {course.thumbnail_blob ? (
                    <img src={URL.createObjectURL(course.thumbnail_blob)} alt={course.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"><BookOpen className="w-6 h-6 text-foreground/5" /></div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                    <span className="text-white text-[10px] font-black uppercase tracking-widest">Learn More</span>
                  </div>
                </div>
                <h3 className="text-xs font-bold text-foreground truncate px-1">{course.name}</h3>
              </Link>
            ))}
            {courses.length === 0 && (
              <Link href="/upload" className="aspect-video rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center group hover:border-foreground/20 transition-all p-6 text-center">
                <Upload className="w-6 h-6 text-muted-foreground mb-3 group-hover:text-foreground transition-colors" />
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground group-hover:text-foreground">Upload Your First Course</span>
              </Link>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

const Button = React.forwardRef<HTMLButtonElement, any>(
  ({ className, size = 'default', asChild = false, ...props }, ref) => {
    const Comp = asChild ? motion.div : 'button';
    return (
      <Comp
        ref={ref as any}
        className={cn(
          "inline-flex items-center justify-center rounded-xl font-bold transition-all disabled:opacity-50 disabled:pointer-events-none",
          size === 'default' && "h-11 px-6 text-sm",
          size === 'lg' && "h-14 px-8 text-base",
          "bg-foreground text-background hover:opacity-90",
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
