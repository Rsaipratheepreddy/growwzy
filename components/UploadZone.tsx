'use client';

import React, { useRef, useState } from 'react';
import { Upload, FolderPlus, FileVideo, X, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Progress as UIProgress } from '@/components/ui/progress';

interface UploadZoneProps {
    onUpload: (files: File[]) => void;
    isUploading: boolean;
    uploadProgress: number;
    currentFileName?: string;
}

const UploadZone = ({ onUpload, isUploading, uploadProgress, currentFileName }: UploadZoneProps) => {
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const folderInputRef = useRef<HTMLInputElement>(null);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const files = Array.from(e.dataTransfer.files).filter(file => {
            const isVideo = file.type.startsWith('video/') || ['mp4', 'mkv', 'webm'].some(ext => file.name.endsWith(ext));
            const isMeta = file.name.startsWith('._');
            return isVideo && !isMeta;
        });
        if (files.length > 0) {
            onUpload(files);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files).filter(file => {
                const isVideo = file.type.startsWith('video/') || ['mp4', 'mkv', 'webm'].some(ext => file.name.endsWith(ext));
                const isMeta = file.name.startsWith('._');
                return isVideo && !isMeta;
            });
            onUpload(files);
        }
    };

    return (
        <div className="w-full max-w-4xl mx-auto px-4 py-12">
            <Card
                className={cn(
                    "relative border-2 border-dashed transition-all duration-300 min-h-[400px] flex flex-col items-center justify-center p-8 bg-card/40 backdrop-blur-md rounded-2xl shadow-2xl",
                    isDragging ? "border-indigo-500 bg-indigo-500/5 scale-[1.01]" : "border-border hover:border-indigo-500/20",
                    isUploading && "pointer-events-none opacity-50"
                )}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                <AnimatePresence mode="wait">
                    {!isUploading ? (
                        <motion.div
                            key="idle"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="text-center"
                        >
                            <div className="mb-6 inline-flex p-6 rounded-full bg-indigo-500/10 text-indigo-400">
                                <Upload className="w-12 h-12" />
                            </div>
                            <h2 className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent mb-2">
                                Upload Your Course
                            </h2>
                            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                                Drag and drop your course folder or individual video files. We'll automatically organize them into sections.
                            </p>

                            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                <Button
                                    onClick={() => folderInputRef.current?.click()}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-12 px-8 rounded-xl"
                                >
                                    <FolderPlus className="w-5 h-5 mr-2" />
                                    Select Course Folder
                                </Button>
                                <Button
                                    variant="secondary"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="bg-muted hover:bg-muted/80 text-foreground border-border h-12 px-8"
                                >
                                    <FileVideo className="w-5 h-5 mr-2" />
                                    Select Files
                                </Button>
                            </div>

                            {/* Hidden Inputs */}
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                multiple
                                accept="video/*,.mkv"
                                onChange={handleFileChange}
                            />
                            <input
                                type="file"
                                ref={folderInputRef}
                                className="hidden"
                                webkitdirectory=""
                                directory=""
                                multiple
                                onChange={handleFileChange}
                            />
                        </motion.div>
                    ) : (
                        <motion.div
                            key="uploading"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="w-full max-w-lg text-center"
                        >
                            <div className="relative mb-8 pt-1">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex flex-col items-start">
                                        <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-indigo-400 bg-indigo-400/10">
                                            Processing
                                        </span>
                                        <span className="text-sm font-medium text-muted-foreground mt-2 truncate max-w-xs">
                                            {currentFileName || "Finalizing..."}
                                        </span>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-xs font-semibold inline-block text-indigo-400">
                                            {Math.round(uploadProgress)}%
                                        </span>
                                    </div>
                                </div>
                                <UIProgress value={uploadProgress} className="h-2 bg-muted" />
                            </div>

                            <div className="flex items-center justify-center gap-3 text-white/40">
                                <Loader2 className="w-5 h-5 animate-spin" />
                                <span>Storing in local database...</span>
                            </div>
                            <p className="mt-4 text-[10px] text-white/20 italic">
                                * Please don't close this tab until the process is complete.
                            </p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </Card>

            {/* Constraints Tip */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex gap-4 p-4 rounded-lg bg-card border border-border">
                    <CheckCircle2 className="w-6 h-6 text-green-500 shrink-0" />
                    <div>
                        <h4 className="text-sm font-bold text-foreground mb-1">Preserve Structure</h4>
                        <p className="text-xs text-muted-foreground">We use folder names to create sections automatically.</p>
                    </div>
                </div>
                <div className="flex gap-4 p-4 rounded-lg bg-card border border-border">
                    <AlertCircle className="w-6 h-6 text-yellow-500 shrink-0" />
                    <div>
                        <h4 className="text-sm font-bold text-foreground mb-1">Storage Limit</h4>
                        <p className="text-xs text-muted-foreground">IndexedDB usually allows 1-2GB of offline storage.</p>
                    </div>
                </div>
                <div className="flex gap-4 p-4 rounded-lg bg-card border border-border">
                    <FileVideo className="w-6 h-6 text-blue-500 shrink-0" />
                    <div>
                        <h4 className="text-sm font-bold text-foreground mb-1">Formats</h4>
                        <p className="text-xs text-muted-foreground">Supports MP4, WebM, and MKV (browser compatible).</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Add standard HTML attributes for directory upload
declare module 'react' {
    interface InputHTMLAttributes<T> extends HTMLAttributes<T> {
        webkitdirectory?: string;
        directory?: string;
    }
}

export default UploadZone;
