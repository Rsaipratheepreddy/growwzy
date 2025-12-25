'use client';

import React, { useState } from 'react';
import UploadZone from '@/components/UploadZone';
import { repository, Course, Section, Video } from '@/lib/db';
import { getVideoMetadata, generateThumbnail } from '@/lib/video';
import { walkDirectory } from '@/lib/fs';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FolderPlus, Link as LinkIcon, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function UploadPage() {
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [currentFileName, setCurrentFileName] = useState('');
    const router = useRouter();

    const processFiles = async (files: File[], directoryHandle?: FileSystemDirectoryHandle) => {
        if (files.length === 0) return;
        setIsUploading(true);
        setCurrentFileName('');
        setUploadProgress(0);

        try {
            const firstFile = files[0];
            const courseName = directoryHandle?.name || firstFile.webkitRelativePath.split('/')[0] || 'New Course';

            const courseId = crypto.randomUUID();
            const storageType: 'blob' | 'local' = directoryHandle ? 'local' : 'blob';

            const sections: Record<string, { id: string, name: string, order: number }> = {};
            const videoEntries: Video[] = [];
            let totalDuration = 0;

            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                setCurrentFileName(file.name);
                setUploadProgress(Math.round((i / files.length) * 100));

                const relativePath = file.webkitRelativePath || file.name;
                const parts = relativePath.split('/');

                let sectionName = 'General';
                if (parts.length > 2) {
                    sectionName = parts[parts.length - 2];
                } else if (directoryHandle && parts.length > 1) {
                    sectionName = parts[parts.length - 2];
                }

                if (!sections[sectionName]) {
                    sections[sectionName] = {
                        id: crypto.randomUUID(),
                        name: sectionName,
                        order: Object.keys(sections).length
                    };
                }

                try {
                    const metadata = await getVideoMetadata(file);
                    const thumbnail = await generateThumbnail(file);

                    videoEntries.push({
                        id: crypto.randomUUID(),
                        course_id: courseId,
                        section_id: sections[sectionName].id,
                        title: file.name.replace(/\.[^/.]+$/, ""),
                        duration: metadata.duration,
                        video_blob: storageType === 'blob' ? file : undefined,
                        thumbnail_blob: thumbnail || undefined,
                        file_path: storageType === 'local' ? relativePath : undefined,
                        file_size: file.size,
                        format: metadata.format,
                        order: i,
                        created_at: Date.now()
                    });
                    totalDuration += metadata.duration;
                } catch (err) {
                    console.error(`Skipping invalid video file: ${file.name}`);
                }
            }

            await repository.addCourse({
                id: courseId,
                name: courseName,
                thumbnail_blob: videoEntries.find(v => v.thumbnail_blob)?.thumbnail_blob,
                total_videos: videoEntries.length,
                completed_videos: 0,
                total_duration: totalDuration,
                created_at: Date.now(),
                updated_at: Date.now(),
                last_accessed: Date.now(),
                storage_type: storageType,
                directory_handle: directoryHandle
            });

            for (const section of Object.values(sections)) {
                await repository.addSection({
                    id: section.id,
                    course_id: courseId,
                    name: section.name,
                    order: section.order,
                    created_at: Date.now()
                });
            }

            for (const video of videoEntries) {
                await repository.addVideo(video);
            }

            toast.success(storageType === 'local' ? 'Course linked successfully!' : 'Course uploaded successfully!');
            router.push('/');
        } catch (error: any) {
            console.error('Upload error:', error);
            if (error.name === 'QuotaExceededError') {
                toast.error('Storage full! Please use "Link Folder" for large courses.');
            } else {
                toast.error('Failed to process course: ' + error.message);
            }
        } finally {
            setIsUploading(false);
            setUploadProgress(0);
            setCurrentFileName('');
        }
    };

    const handleLinkFolder = async () => {
        try {
            // @ts-ignore
            const handle = await window.showDirectoryPicker();
            if (!handle) return;

            const videoFiles = await walkDirectory(handle);
            if (videoFiles.length === 0) {
                toast.error('No video files found in the selected folder.');
                return;
            }

            const files = videoFiles.map(v => {
                Object.defineProperty(v.file, 'webkitRelativePath', {
                    value: v.relativePath.join('/'),
                    writable: false
                });
                return v.file;
            });

            await processFiles(files, handle);
        } catch (err: any) {
            if (err.name !== 'AbortError') {
                toast.error('Failed to access local folder: ' + err.message);
            }
        }
    };

    return (
        <div className="min-h-screen pt-24 pb-12">
            <div className="max-w-4xl mx-auto px-4">
                <div className="mb-12 text-center">
                    <h1 className="text-4xl font-bold text-foreground mb-4">Add New Course</h1>
                    <p className="text-muted-foreground">Upload files to IndexedDB or link a local folder to save space.</p>
                </div>

                <Tabs defaultValue="link" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 bg-muted h-14 p-1 mb-8 rounded-xl border border-border">
                        <TabsTrigger value="link" className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:text-primary font-bold rounded-lg transition-all shadow-sm">
                            <LinkIcon className="w-4 h-4" /> Link Local Folder
                        </TabsTrigger>
                        <TabsTrigger value="upload" className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:text-primary font-bold rounded-lg transition-all shadow-sm">
                            <FolderPlus className="w-4 h-4" /> Upload (Blob)
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="link" className="focus-visible:outline-none">
                        <div className="bg-card border-2 border-dashed border-border rounded-2xl p-16 text-center">
                            <div className="w-20 h-20 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                                <LinkIcon className="w-10 h-10 text-indigo-500" />
                            </div>
                            <h3 className="text-2xl font-bold text-foreground mb-4">Optimized for Large Courses</h3>
                            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                                Links to a folder on your disk. Saves massive amounts of browser storage.
                                Requires re-authorization after page reloads.
                            </p>
                            <Button
                                onClick={handleLinkFolder}
                                size="lg"
                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-12 h-14 text-lg font-bold rounded-xl transition-all hover:scale-105 shadow-xl shadow-indigo-500/20"
                                disabled={isUploading}
                            >
                                {isUploading ? 'Processing...' : 'Select Course Folder'}
                            </Button>
                        </div>
                    </TabsContent>

                    <TabsContent value="upload" className="focus-visible:outline-none">
                        <UploadZone
                            onUpload={processFiles}
                            isUploading={isUploading}
                            uploadProgress={uploadProgress}
                            currentFileName={currentFileName}
                        />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
