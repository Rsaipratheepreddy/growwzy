'use client';

import React, { useState, useEffect } from 'react';
import { repository, Note, Course, Video } from '@/lib/db';
import { Search, StickyNote, Calendar, Play, ChevronRight, Layout, Trash2, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import Link from 'next/link';

export default function NotesPage() {
    const [notes, setNotes] = useState<Note[]>([]);
    const [courses, setCourses] = useState<Record<string, Course>>({});
    const [videos, setVideos] = useState<Record<string, Video>>({});
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch all notes (via private access to db for now)
                const db = await (repository as any).dbPromise;
                const allNotes = await db.getAll('notes');
                setNotes(allNotes.sort((a: Note, b: Note) => b.created_at - a.created_at));

                const allCourses = await repository.getCourses();
                const courseMap: Record<string, Course> = {};
                allCourses.forEach(c => courseMap[c.id] = c);
                setCourses(courseMap);

                // Fetch videos for the notes
                const videoMap: Record<string, Video> = {};
                const videoIds = Array.from(new Set(allNotes.map((n: Note) => n.video_id)));
                for (const vid of videoIds as string[]) {
                    const v = await repository.getVideo(vid);
                    if (v) videoMap[v.id] = v;
                }
                setVideos(videoMap);
            } catch (err) {
                console.error('Error fetching notes:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleDeleteNote = async (id: string) => {
        await repository.deleteNote(id);
        setNotes(prev => prev.filter(n => n.id !== id));
        toast.success('Note deleted');
    };

    const filteredNotes = notes.filter((n: Note) =>
        n.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        videos[n.video_id]?.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        courses[n.course_id]?.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

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
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h1 className="text-3xl font-black text-foreground tracking-tight">My Notes</h1>
                        <p className="text-muted-foreground text-sm font-medium mt-1">Review your insights and captured moments.</p>
                    </div>
                    <div className="relative group min-w-[300px]">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-foreground transition-colors" />
                        <input
                            type="text"
                            placeholder="Search notes, videos, courses..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-card border border-border focus:border-foreground/30 rounded-2xl py-3 pl-11 pr-4 text-sm transition-all outline-none"
                        />
                    </div>
                </header>

                {/* Notes Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <AnimatePresence mode="popLayout">
                        {filteredNotes.map((note) => (
                            <motion.div
                                layout
                                key={note.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-card border border-border rounded-[32px] overflow-hidden flex flex-col hover:shadow-2xl hover:shadow-foreground/5 transition-all group"
                            >
                                {note.screenshot && (
                                    <div className="aspect-video relative overflow-hidden bg-muted border-b border-border">
                                        <img
                                            src={URL.createObjectURL(note.screenshot)}
                                            alt="Screenshot"
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                        />
                                        <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors" />
                                        <div className="absolute bottom-4 right-4 bg-background/90 backdrop-blur-md px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-tighter">
                                            Capture @ {formatTime(note.timestamp)}
                                        </div>
                                    </div>
                                )}

                                <div className="p-8 space-y-6 flex-1 flex flex-col">
                                    <div className="flex items-start justify-between">
                                        <div className="space-y-1 min-w-0">
                                            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block truncate">
                                                {courses[note.course_id]?.name || 'Unknown Course'}
                                            </span>
                                            <h3 className="text-sm font-black text-foreground truncate">
                                                {videos[note.video_id]?.title || 'Unknown Video'}
                                            </h3>
                                        </div>
                                        <button onClick={() => handleDeleteNote(note.id)} className="text-muted-foreground hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all p-1">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>

                                    <div className="flex-1">
                                        <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap line-clamp-4">
                                            {note.content}
                                        </p>
                                    </div>

                                    <div className="pt-6 border-t border-border flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                                            <Calendar className="w-3 h-3" />
                                            {new Date(note.created_at).toLocaleDateString()}
                                        </div>
                                        <Link href={`/watch/${note.course_id}/${note.video_id}?t=${note.timestamp}`}>
                                            <Button size="sm" variant="ghost" className="rounded-xl px-4 hover:bg-foreground/5 gap-2 text-[10px] font-black uppercase tracking-widest">
                                                Go to Video
                                                <ExternalLink className="w-3 h-3" />
                                            </Button>
                                        </Link>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>

                {filteredNotes.length === 0 && (
                    <div className="text-center py-32 bg-muted/30 rounded-[40px] border-2 border-dashed border-border">
                        <StickyNote className="w-12 h-12 text-muted-foreground/20 mx-auto mb-6" />
                        <h3 className="text-lg font-black text-foreground">No notes found</h3>
                        <p className="text-sm text-muted-foreground max-w-xs mx-auto mt-2">Captured notes from your videos will appear here.</p>
                        <Link href="/">
                            <Button variant="link" className="mt-6 text-foreground font-black uppercase tracking-widest text-[10px]">Start Watching Now</Button>
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}

function formatTime(seconds: number) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m}:${s.toString().padStart(2, '0')}`;
}
