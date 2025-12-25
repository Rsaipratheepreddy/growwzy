'use client';

import React, { useEffect, useState } from 'react';
import { repository, Course, Progress } from '@/lib/db';
import { formatDuration } from '@/lib/video';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { motion } from 'framer-motion';
import { Clock, BookOpen, CheckCircle2, TrendingUp, Calendar, Zap, Play } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export default function StatsPage() {
    const [courses, setCourses] = useState<Course[]>([]);
    const [progress, setProgress] = useState<Progress[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const c = await repository.getCourses();
                setCourses(c);

                // Fetch all progress items - using private access for now as it's a demo
                const db = await (repository as any).dbPromise;
                const p = await db.getAll('progress');
                setProgress(p);
            } catch (error) {
                console.error('Error fetching stats:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-foreground border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    const totalWatchTime = progress.reduce((acc, curr) => acc + curr.watch_time, 0);
    const completedVideos = progress.filter(p => p.completed).length;
    const completedCourses = courses.filter(c => c.completed_videos === c.total_videos && c.total_videos > 0).length;

    const now = new Date();
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const chartData = Array.from({ length: 7 }).map((_, i) => {
        const d = new Date();
        d.setDate(now.getDate() - (6 - i));
        const dayLabel = days[d.getDay()];
        const dayProgress = progress.filter(p => {
            const pDate = new Date(p.updated_at);
            return pDate.toDateString() === d.toDateString();
        });
        const duration = dayProgress.reduce((acc, curr) => acc + (curr.watch_time / 3600), 0);
        return { name: dayLabel, hours: parseFloat(duration.toFixed(2)) };
    });

    const pieData = [
        { name: 'Completed', value: completedVideos },
        { name: 'In Progress', value: Math.max(0, progress.length - completedVideos) },
    ];

    const COLORS = ['#ffffff', 'rgba(255, 255, 255, 0.05)'];

    return (
        <div className="min-h-screen pt-24 pb-12 px-4 md:px-12 bg-background">
            <div className="max-w-7xl mx-auto">
                <header className="mb-12">
                    <h1 className="text-4xl font-black text-foreground tracking-tight">Analytics</h1>
                    <p className="text-muted-foreground font-medium mt-1">Deep insights into your learning behavior.</p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                    {[
                        { label: 'Total Watch Time', value: formatDuration(totalWatchTime), icon: Clock, color: 'text-foreground' },
                        { label: 'Videos Watched', value: completedVideos, icon: CheckCircle2, color: 'text-foreground' },
                        { label: 'Courses Finished', value: completedCourses, icon: BookOpen, color: 'text-foreground' },
                        { label: 'Learning Streak', value: '0 Days', icon: Zap, color: 'text-foreground' },
                    ].map((stat, i) => (
                        <motion.div
                            key={stat.label}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                        >
                            <Card className="p-8 bg-card border-border flex items-center justify-between shadow-2xl hover:border-foreground/20 transition-all cursor-pointer rounded-[32px]">
                                <div>
                                    <p className="text-[10px] text-muted-foreground uppercase font-black tracking-[0.2em]">{stat.label}</p>
                                    <p className="text-3xl font-black text-foreground mt-2 tracking-tighter">{stat.value}</p>
                                </div>
                                <div className="w-14 h-14 bg-foreground/5 rounded-2xl flex items-center justify-center shrink-0">
                                    <stat.icon className={cn("w-6 h-6", stat.color)} />
                                </div>
                            </Card>
                        </motion.div>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="lg:col-span-2 bg-card p-8 rounded-[40px] border border-border h-[450px] shadow-2xl"
                    >
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-xl font-black text-foreground tracking-tight">Learning Activity</h3>
                            <div className="flex gap-2">
                                <button className="px-4 py-1.5 rounded-lg bg-foreground text-background text-[10px] font-black uppercase tracking-widest">7 Days</button>
                                <button className="px-4 py-1.5 rounded-lg bg-foreground/5 text-muted-foreground text-[10px] font-black uppercase tracking-widest hover:text-foreground">30 Days</button>
                            </div>
                        </div>
                        <ResponsiveContainer width="100%" height="80%">
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="var(--foreground)" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="var(--foreground)" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                                <XAxis dataKey="name" stroke="var(--muted-foreground)" axisLine={false} tickLine={false} fontSize={10} fontWeight="bold" dy={15} />
                                <YAxis stroke="var(--muted-foreground)" axisLine={false} tickLine={false} fontSize={10} fontWeight="bold" />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '16px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}
                                    itemStyle={{ color: 'var(--foreground)', fontSize: '12px', fontWeight: 'bold' }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="hours"
                                    stroke="var(--foreground)"
                                    fillOpacity={1}
                                    fill="url(#colorHours)"
                                    strokeWidth={4}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-card p-8 rounded-[40px] border border-border h-[450px] flex flex-col items-center justify-between shadow-2xl"
                    >
                        <h3 className="text-xl font-black text-foreground tracking-tight w-full mb-8">Course Progress</h3>
                        <div className="relative flex-1 w-full flex items-center justify-center">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={pieData}
                                        innerRadius={70}
                                        outerRadius={110}
                                        paddingAngle={8}
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        {pieData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={index === 0 ? 'var(--foreground)' : 'rgba(var(--foreground), 0.05)'} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span className="text-3xl font-black text-foreground">{pieData[0].value}</span>
                                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Done</span>
                            </div>
                        </div>
                        <div className="w-full space-y-3 mt-8">
                            <div className="flex items-center justify-between p-4 bg-foreground/5 rounded-2xl">
                                <div className="flex items-center gap-3">
                                    <div className="w-2 h-2 rounded-full bg-foreground" />
                                    <span className="text-xs font-bold text-foreground">Completed Videos</span>
                                </div>
                                <span className="text-xs font-black text-foreground">{completedVideos}</span>
                            </div>
                            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-2xl">
                                <div className="flex items-center gap-3">
                                    <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
                                    <span className="text-xs font-bold text-muted-foreground">In Progress</span>
                                </div>
                                <span className="text-xs font-black text-muted-foreground">{Math.max(0, progress.length - completedVideos)}</span>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}
