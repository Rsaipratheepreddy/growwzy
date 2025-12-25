'use client';

import React, { useState, useEffect } from 'react';
import { repository, Task, Course } from '@/lib/db';
import { Plus, Trash2, CheckCircle2, Clock, AlertCircle, ChevronRight, Layout, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function TasksPage() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [newTaskPriority, setNewTaskPriority] = useState<Task['priority']>('medium');
    const [filter, setFilter] = useState<'all' | 'pending' | 'in-progress' | 'completed'>('all');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [allTasks, allCourses] = await Promise.all([
                    repository.getTasks(),
                    repository.getCourses()
                ]);
                setTasks(allTasks);
                setCourses(allCourses);
            } catch (err) {
                console.error('Error fetching tasks:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleAddTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTaskTitle.trim()) return;

        const task: Task = {
            id: crypto.randomUUID(),
            title: newTaskTitle.trim(),
            status: 'pending',
            priority: newTaskPriority,
            created_at: Date.now(),
            updated_at: Date.now()
        };

        await repository.addTask(task);
        setTasks(prev => [...prev, task]);
        setNewTaskTitle('');
        setIsAdding(false);
        toast.success('Task added');
    };

    const handleUpdateStatus = async (task: Task, newStatus: Task['status']) => {
        const updatedTask = { ...task, status: newStatus };
        await repository.updateTask(updatedTask);
        setTasks(prev => prev.map(t => t.id === task.id ? updatedTask : t));
    };

    const handleDeleteTask = async (id: string) => {
        await repository.deleteTask(id);
        setTasks(prev => prev.filter(t => t.id !== id));
        toast.success('Task deleted');
    };

    const filteredTasks = tasks.filter(t => filter === 'all' || t.status === filter);

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-foreground border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background p-6 md:p-10">
            <div className="max-w-6xl mx-auto space-y-10">
                {/* Header */}
                <header className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-black text-foreground tracking-tight">Taskboard</h1>
                        <p className="text-muted-foreground text-sm font-medium mt-1">Organize your learning objectives and track progress.</p>
                    </div>
                    <Button onClick={() => setIsAdding(true)} className="bg-foreground text-background hover:bg-foreground/90 rounded-2xl h-12 px-6 font-black text-xs uppercase tracking-widest gap-2 shadow-lg shadow-foreground/10">
                        <Plus className="w-4 h-4" />
                        Create Task
                    </Button>
                </header>

                {/* Filters */}
                <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
                        <Filter className="w-4 h-4 text-muted-foreground mr-2 shrink-0" />
                        {['all', 'pending', 'in-progress', 'completed'].map((f) => (
                            <button
                                key={f}
                                onClick={() => setFilter(f as any)}
                                className={cn(
                                    "px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                                    filter === f ? "bg-foreground text-background shadow-md" : "text-muted-foreground hover:text-foreground bg-muted/50"
                                )}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Kanban Board Container */}
                <div className="flex-1 overflow-x-auto pb-8 scrollbar-hide">
                    <div className="flex gap-8 min-w-[900px] h-[calc(100vh-350px)]">
                        {[
                            { id: 'pending', label: 'To Do', color: 'bg-muted/30' },
                            { id: 'in-progress', label: 'In Progress', color: 'bg-[#EAB308]/5' },
                            { id: 'completed', label: 'Completed', color: 'bg-emerald-500/5' }
                        ].map((column) => {
                            const columnTasks = tasks.filter(t => t.status === column.id && (filter === 'all' || filter === column.id));
                            return (
                                <div key={column.id} className={cn("flex-1 flex flex-col rounded-[40px] p-8 border border-border/50", column.color)}>
                                    <div className="flex items-center justify-between mb-8">
                                        <div className="flex items-center gap-3">
                                            <span className="text-[12px] font-black uppercase tracking-[0.2em] text-foreground/40">{column.label}</span>
                                            <span className="px-3 py-1 bg-foreground/5 rounded-full text-[10px] font-black text-foreground/20">{columnTasks.length}</span>
                                        </div>
                                        {column.id === 'pending' && (
                                            <button onClick={() => setIsAdding(true)} className="p-2 hover:bg-foreground/5 rounded-xl transition-all text-muted-foreground hover:text-foreground">
                                                <Plus className="w-5 h-5" />
                                            </button>
                                        )}
                                    </div>

                                    <div className="flex-1 space-y-4 overflow-y-auto pr-2 scrollbar-hide">
                                        <AnimatePresence mode="popLayout">
                                            {column.id === 'pending' && isAdding && (
                                                <motion.div
                                                    initial={{ opacity: 0, scale: 0.95 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    className="bg-card border-2 border-dashed border-foreground/10 rounded-[32px] p-6 shadow-xl"
                                                >
                                                    <form onSubmit={handleAddTask} className="space-y-6">
                                                        <textarea
                                                            autoFocus
                                                            value={newTaskTitle}
                                                            onChange={(e) => setNewTaskTitle(e.target.value)}
                                                            placeholder="What's the goal?"
                                                            className="w-full bg-transparent border-none focus:ring-0 text-base font-bold p-0 resize-none text-foreground placeholder:text-muted-foreground/30"
                                                        />
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex gap-2">
                                                                {['low', 'medium', 'high'].map((p) => (
                                                                    <button
                                                                        key={p}
                                                                        type="button"
                                                                        onClick={() => setNewTaskPriority(p as any)}
                                                                        className={cn(
                                                                            "w-4 h-4 rounded-full transition-all",
                                                                            newTaskPriority === p ? "ring-4 ring-offset-2 ring-foreground/20" : "opacity-40",
                                                                            p === 'low' ? "bg-emerald-500" : p === 'medium' ? "bg-amber-500" : "bg-rose-500"
                                                                        )}
                                                                    />
                                                                ))}
                                                            </div>
                                                            <div className="flex gap-2">
                                                                <Button type="button" variant="ghost" size="sm" onClick={() => setIsAdding(false)} className="text-[10px] font-black uppercase tracking-widest">Cancel</Button>
                                                                <Button type="submit" size="sm" className="bg-foreground text-background rounded-xl px-4 text-[10px] font-black uppercase tracking-widest">Add</Button>
                                                            </div>
                                                        </div>
                                                    </form>
                                                </motion.div>
                                            )}

                                            {columnTasks.map((task) => (
                                                <motion.div
                                                    layout
                                                    key={task.id}
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    className="bg-card border border-border/50 rounded-[32px] p-6 hover:shadow-2xl hover:shadow-foreground/5 transition-all group relative"
                                                >
                                                    <div className="flex items-start justify-between mb-4">
                                                        <div className={cn(
                                                            "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest",
                                                            task.priority === 'high' ? "bg-rose-500/10 text-rose-600" :
                                                                task.priority === 'medium' ? "bg-amber-500/10 text-amber-600" : "bg-emerald-500/10 text-emerald-600"
                                                        )}>
                                                            {task.priority}
                                                        </div>
                                                        <button
                                                            onClick={() => handleDeleteTask(task.id)}
                                                            className="text-muted-foreground hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all p-1"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>

                                                    <h3 className={cn("text-base font-black text-foreground mb-6 leading-tight", task.status === 'completed' && "opacity-40")}>
                                                        {task.title}
                                                    </h3>

                                                    <div className="flex items-center justify-between pt-4 border-t border-border/40">
                                                        <div className="flex gap-1">
                                                            {column.id !== 'pending' && (
                                                                <button
                                                                    onClick={() => handleUpdateStatus(task, column.id === 'completed' ? 'in-progress' : 'pending')}
                                                                    className="p-2 hover:bg-muted rounded-xl text-muted-foreground transition-colors"
                                                                >
                                                                    <Layout className="w-4 h-4 rotate-180" />
                                                                </button>
                                                            )}
                                                            {column.id !== 'completed' && (
                                                                <button
                                                                    onClick={() => handleUpdateStatus(task, column.id === 'pending' ? 'in-progress' : 'completed')}
                                                                    className="p-2 hover:bg-muted rounded-xl text-muted-foreground transition-colors"
                                                                >
                                                                    <Layout className="w-4 h-4" />
                                                                </button>
                                                            )}
                                                        </div>

                                                        {task.status === 'completed' ? (
                                                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                                        ) : (
                                                            <Clock className="w-5 h-5 text-muted-foreground/20" />
                                                        )}
                                                    </div>
                                                </motion.div>
                                            ))}

                                            {columnTasks.length === 0 && !isAdding && (
                                                <div className="py-20 border-2 border-dashed border-border/20 rounded-[32px] flex flex-col items-center justify-center text-center px-6">
                                                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-foreground/10 mb-2">No Tasks</span>
                                                    <p className="text-[10px] font-medium text-muted-foreground/40 italic">Drop something here</p>
                                                </div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

            </div>
        </div>
    );
}
