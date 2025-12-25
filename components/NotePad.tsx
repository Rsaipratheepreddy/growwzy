'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Clock, CheckCircle2, MoreVertical, Edit2, Camera, Table, ExternalLink, X, Image as ImageIcon, Search, Bold, Italic, List as ListIcon, Code } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { repository, Note } from '@/lib/db';
import { formatDuration } from '@/lib/video';
import { toast } from 'sonner';

interface NotePadProps {
    courseId: string;
    videoId: string;
    currentTime: number;
    onJumpTo: (time: number) => void;
    onCapture?: () => Promise<Blob | null>;
}

const NotePad = ({ courseId, videoId, currentTime, onJumpTo, onCapture }: NotePadProps) => {
    const [notes, setNotes] = useState<Note[]>([]);
    const [newNote, setNewNote] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [capturedImage, setCapturedImage] = useState<Blob | null>(null);
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        loadNotes();
    }, [videoId]);

    useEffect(() => {
        if (capturedImage) {
            const url = URL.createObjectURL(capturedImage);
            setImageUrl(url);
            return () => URL.revokeObjectURL(url);
        } else {
            setImageUrl(null);
        }
    }, [capturedImage]);

    const loadNotes = async () => {
        const fetchedNotes = await repository.getNotesForVideo(videoId);
        setNotes(fetchedNotes.sort((a, b) => b.created_at - a.created_at)); // Latest first like Apple Notes
    };

    const handleAddNote = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!newNote.trim() && !capturedImage) return;

        const note: Note = {
            id: crypto.randomUUID(),
            course_id: courseId,
            video_id: videoId,
            content: newNote.trim(),
            timestamp: currentTime,
            screenshot: capturedImage || undefined,
            created_at: Date.now(),
            updated_at: Date.now(),
        };

        await repository.addNote(note);
        setNewNote('');
        setCapturedImage(null);
        setIsAdding(false);
        loadNotes();
        toast.success('Note saved', {
            style: { background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' }
        });
    };

    const handleCapture = async () => {
        if (!onCapture) return;
        const blob = await onCapture();
        if (blob) {
            setCapturedImage(blob);
            setIsAdding(true);
        }
    };

    const insertTable = () => {
        const tableTemplate = "\n| Column 1 | Column 2 |\n| -------- | -------- |\n| Content  | Content  |";
        setNewNote(prev => prev + tableTemplate);
    };

    const insertMarkup = (prefix: string, suffix: string = '') => {
        const textarea = document.getElementById('note-editor') as HTMLTextAreaElement;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;
        const before = text.substring(0, start);
        const after = text.substring(end);
        const selected = text.substring(start, end);

        const newValue = `${before}${prefix}${selected}${suffix}${after}`;
        setNewNote(newValue);

        // Reset focus and selection
        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + prefix.length, end + prefix.length);
        }, 0);
    };

    const parseContent = (content: string) => {
        const regex = /\[(\d{1,2}:)?(\d{1,2}:\d{2})\]/g;
        return content.split('\n').map((line, i) => {
            const matches = line.match(/\[(\d{1,2}:)?(\d{1,2}:\d{2})\]/);
            if (matches) {
                const timeStr = matches[0].replace('[', '').replace(']', '');
                const timeParts = timeStr.split(':').map(Number);
                let seconds = 0;
                if (timeParts.length === 3) seconds = timeParts[0] * 3600 + timeParts[1] * 60 + timeParts[2];
                else seconds = timeParts[0] * 60 + timeParts[1];

                return (
                    <div key={i} className="prose prose-sm dark:prose-invert max-w-none text-foreground/80 leading-relaxed">
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                                p: ({ children }) => (
                                    <p className="inline">
                                        {children}
                                        <button
                                            onClick={() => onJumpTo(seconds)}
                                            className="text-[#EAB308] font-bold px-1 hover:underline transition-all mx-0.5"
                                        >
                                            {matches[0]}
                                        </button>
                                    </p>
                                )
                            }}
                        >
                            {line.replace(matches[0], '')}
                        </ReactMarkdown>
                    </div>
                );
            }
            return (
                <div key={i} className="prose prose-sm dark:prose-invert max-w-none text-foreground/80 leading-relaxed overflow-hidden">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{line}</ReactMarkdown>
                </div>
            );
        });
    };

    const handleDeleteNote = async (id: string) => {
        await repository.deleteNote(id);
        loadNotes();
    };

    const handleUpdateNote = async (id: string, content: string) => {
        await repository.updateNote(id, content);
        setEditingId(null);
        loadNotes();
    };

    const filteredNotes = notes.filter(n =>
        n.content.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="flex flex-col h-full bg-background/50">
            {/* Apple Notes Header */}
            <div className="flex flex-col gap-4 mb-8 shrink-0">
                <div className="flex items-center justify-between">
                    <h3 className="text-2xl font-bold tracking-tight text-foreground">Notes</h3>
                    <div className="flex gap-2">
                        <Button
                            onClick={handleCapture}
                            variant="ghost"
                            size="icon"
                            className="w-10 h-10 rounded-full hover:bg-[#EAB308]/10 text-[#EAB308]"
                        >
                            <Camera className="w-5 h-5" />
                        </Button>
                        <Button
                            onClick={() => setIsAdding(true)}
                            variant="ghost"
                            size="icon"
                            className="w-10 h-10 rounded-full bg-[#EAB308]/10 text-[#EAB308] hover:bg-[#EAB308]/20"
                        >
                            <Plus className="w-5 h-5" />
                        </Button>
                    </div>
                </div>

                <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50 group-focus-within:text-[#EAB308] transition-colors" />
                    <input
                        type="text"
                        placeholder="Search"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-muted/30 border-none focus:ring-0 rounded-xl h-10 pl-10 pr-4 text-sm font-medium placeholder:text-muted-foreground/30 transition-all"
                    />
                </div>
            </div>

            <div className="flex-1 space-y-px overflow-y-auto scrollbar-hide -mx-2 px-2">
                <AnimatePresence mode="popLayout">
                    {isAdding && (
                        <motion.form
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            onSubmit={handleAddNote}
                            className="bg-card/40 border border-[#EAB308]/20 rounded-2xl p-6 mb-6 shadow-sm"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2 text-[#EAB308]">
                                    <Clock className="w-3.5 h-3.5" />
                                    <span className="text-[11px] font-bold uppercase tracking-wider">{formatDuration(currentTime)}</span>
                                </div>
                                <button type="button" onClick={() => { setIsAdding(false); setCapturedImage(null); }} className="text-muted-foreground/30 hover:text-foreground transition-colors"><X className="w-4 h-4" /></button>
                            </div>

                            {imageUrl && (
                                <div className="relative group rounded-xl overflow-hidden border border-border aspect-video bg-black mb-4">
                                    <img src={imageUrl} alt="Captured frame" className="w-full h-full object-cover" />
                                    <button
                                        type="button"
                                        onClick={() => setCapturedImage(null)}
                                        className="absolute top-2 right-2 p-1.5 bg-black/60 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            )}

                            <textarea
                                id="note-editor"
                                autoFocus
                                value={newNote}
                                onChange={(e) => setNewNote(e.target.value)}
                                placeholder="New Observation..."
                                className="w-full bg-transparent border-none focus:ring-0 text-[15px] h-32 p-0 resize-none text-foreground placeholder:text-muted-foreground/30 font-medium leading-relaxed"
                            />

                            <div className="flex items-center justify-between pt-4 border-t border-border/50">
                                <div className="flex items-center gap-1">
                                    <Button type="button" variant="ghost" size="icon" onClick={() => insertMarkup('**', '**')} className="w-8 h-8 rounded-lg text-muted-foreground/50 hover:text-[#EAB308] hover:bg-[#EAB308]/5"><Bold className="w-3.5 h-3.5" /></Button>
                                    <Button type="button" variant="ghost" size="icon" onClick={() => insertMarkup('*', '*')} className="w-8 h-8 rounded-lg text-muted-foreground/50 hover:text-[#EAB308] hover:bg-[#EAB308]/5"><Italic className="w-3.5 h-3.5" /></Button>
                                    <Button type="button" variant="ghost" size="icon" onClick={() => insertMarkup('- ')} className="w-8 h-8 rounded-lg text-muted-foreground/50 hover:text-[#EAB308] hover:bg-[#EAB308]/5"><ListIcon className="w-3.5 h-3.5" /></Button>
                                    <Button type="button" variant="ghost" size="icon" onClick={() => insertMarkup('`', '`')} className="w-8 h-8 rounded-lg text-muted-foreground/50 hover:text-[#EAB308] hover:bg-[#EAB308]/5"><Code className="w-3.5 h-3.5" /></Button>
                                    <Button type="button" variant="ghost" size="icon" onClick={insertTable} className="w-8 h-8 rounded-lg text-muted-foreground/50 hover:text-[#EAB308] hover:bg-[#EAB308]/5"><Table className="w-3.5 h-3.5" /></Button>
                                </div>
                                <Button type="submit" size="sm" className="bg-[#EAB308] text-black hover:bg-[#EAB308]/90 rounded-full h-9 px-6 font-bold text-xs">Done</Button>
                            </div>
                        </motion.form>
                    )}

                    {filteredNotes.map((note) => (
                        <motion.div
                            layout
                            key={note.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="group relative bg-transparent hover:bg-muted/30 rounded-xl px-4 py-3 transition-all cursor-pointer border-b border-border/40 last:border-none"
                        >
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-[10px] font-bold text-muted-foreground/40">{new Date(note.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => setEditingId(note.id)} className="text-muted-foreground/40 hover:text-[#EAB308]"><Edit2 className="w-3.5 h-3.5" /></button>
                                    <button onClick={() => handleDeleteNote(note.id)} className="text-muted-foreground/40 hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
                                </div>
                            </div>

                            <button
                                onClick={() => onJumpTo(note.timestamp)}
                                className="absolute left-[-8px] top-1/2 -translate-y-1/2 w-1 h-6 bg-[#EAB308] rounded-full opacity-0 group-hover:opacity-100 transition-all"
                            />

                            <div className="pl-0">
                                {editingId === note.id ? (
                                    <textarea
                                        autoFocus
                                        defaultValue={note.content}
                                        onBlur={(e) => handleUpdateNote(note.id, e.target.value)}
                                        className="w-full bg-transparent border-none focus:ring-0 text-sm min-h-[40px] p-0 resize-none text-foreground font-medium"
                                    />
                                ) : (
                                    <div className="space-y-4">
                                        <div className="text-[14px] leading-relaxed">
                                            {parseContent(note.content)}
                                        </div>
                                        {note.screenshot && (
                                            <div className="rounded-xl overflow-hidden border border-border/50 bg-black max-w-[200px]" onClick={() => onJumpTo(note.timestamp)}>
                                                <img src={URL.createObjectURL(note.screenshot)} alt="" className="w-full aspect-video object-cover" />
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    ))}

                    {filteredNotes.length === 0 && !isAdding && (
                        <div className="text-center py-32 px-6 opacity-20">
                            <Clock className="w-12 h-12 mx-auto mb-6 text-foreground" />
                            <h3 className="text-sm font-bold mb-1">
                                {searchQuery ? 'No Results' : 'No Notes'}
                            </h3>
                            <p className="text-xs">
                                {searchQuery ? 'Adjust your search terms.' : 'Your observations will appear here.'}
                            </p>
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default NotePad;
