'use client';

import React, { useEffect, useState } from 'react';
import { repository, UserSettings } from '@/lib/db';
import { formatSize } from '@/lib/video';
import {
    Database, Trash2, Download, Upload, Play, Clock,
    Settings as SettingsIcon, Monitor, ShieldCheck, HelpCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

export default function SettingsPage() {
    const [settings, setSettings] = useState<UserSettings | null>(null);
    const [storage, setStorage] = useState<StorageEstimate | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const s = await repository.getSettings();
                setSettings(s);

                const estimate = await repository.getStorageEstimate();
                setStorage(estimate);
            } catch (error) {
                console.error('Error fetching settings:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleToggle = async (key: keyof UserSettings, value: any) => {
        if (!settings) return;
        const newSettings = { ...settings, [key]: value };
        setSettings(newSettings);
        await repository.saveSettings(newSettings);
        toast.success('Settings updated');
    };

    const handleClearData = async () => {
        if (confirm('DANGER: This will delete ALL courses, videos, and progress. This cannot be undone. Are you sure?')) {
            // We need to implement clearAll in lib/db.ts or just delete the DB
            const db = await (repository as any).dbPromise;
            const tx = db.transaction(['courses', 'sections', 'videos', 'progress'], 'readwrite');
            await tx.objectStore('courses').clear();
            await tx.objectStore('sections').clear();
            await tx.objectStore('videos').clear();
            await tx.objectStore('progress').clear();
            await tx.done;

            toast.success('All data cleared');
            window.location.href = '/';
        }
    };

    const handleExport = async () => {
        const db = await (repository as any).dbPromise;
        const courses = await db.getAll('courses');
        const sections = await db.getAll('sections');
        const videos = await db.getAll('videos'); // Note: This includes BLOBs, might be huge!

        // For a lightweight export, we'll only export metadata, not blobs.
        const exportData = {
            courses: courses.map((c: any) => ({ ...c, thumbnail_blob: null })),
            sections,
            videos: videos.map((v: any) => ({ ...v, video_blob: null, thumbnail_blob: null })),
            exported_at: new Date().toISOString(),
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `growwzy-export-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Metadata exported');
    };

    if (loading || !settings) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    const storageUsagePercent = storage ? Math.round((storage.usage! / storage.quota!) * 100) : 0;

    return (
        <div className="min-h-screen pt-24 pb-12 px-4 md:px-12 bg-background">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold text-white mb-8 flex items-center gap-3">
                    <SettingsIcon className="w-8 h-8 text-indigo-500" /> Settings
                </h1>

                <div className="space-y-8">
                    {/* Storage Section */}
                    <section>
                        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                            <Database className="w-5 h-5 text-indigo-400" /> Local Storage
                        </h2>
                        <Card className="p-6 bg-card border-white/5 rounded-2xl shadow-xl">
                            <div className="mb-4">
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="text-white/60">Usage</span>
                                    <span className="text-white font-bold">{formatSize(storage?.usage || 0)} / {formatSize(storage?.quota || 0)}</span>
                                </div>
                                <Progress value={storageUsagePercent} className="h-2 bg-white/5" />
                                <p className="text-[10px] text-muted-foreground/40 mt-2 italic">
                                    * Growwzy stores video files directly in your browser. Clearing your browser cache may delete this data.
                                </p>
                            </div>
                            <div className="flex flex-wrap gap-4 mt-6">
                                <Button variant="destructive" onClick={handleClearData} className="bg-red-600/20 hover:bg-red-600 text-red-600 hover:text-white border-red-600/40">
                                    <Trash2 className="w-4 h-4 mr-2" /> Clear All Data
                                </Button>
                                <Button variant="secondary" onClick={handleExport} className="bg-white/5 hover:bg-white/10 text-white border-white/5">
                                    <Download className="w-4 h-4 mr-2" /> Export Metadata
                                </Button>
                            </div>
                        </Card>
                    </section>

                    {/* Playback Settings */}
                    <section>
                        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                            <Play className="w-5 h-5 text-indigo-400" /> Playback Preferences
                        </h2>
                        <Card className="bg-card border-white/5 divide-y divide-white/5 rounded-2xl shadow-xl overflow-hidden">
                            <div className="p-6 flex items-center justify-between">
                                <div>
                                    <h4 className="text-white font-medium">Auto-play Next Episode</h4>
                                    <p className="text-sm text-white/40">Automatically start the next video after the current one finishes.</p>
                                </div>
                                <Switch
                                    checked={settings.auto_next}
                                    onCheckedChange={(val: boolean) => handleToggle('auto_next', val)}
                                />
                            </div>
                            <div className="p-6 flex items-center justify-between">
                                <div>
                                    <h4 className="text-white font-medium">Auto-play Video on Load</h4>
                                    <p className="text-sm text-white/40">Start playing videos immediately when you open the player.</p>
                                </div>
                                <Switch
                                    checked={settings.auto_play}
                                    onCheckedChange={(val: boolean) => handleToggle('auto_play', val)}
                                />
                            </div>
                        </Card>
                    </section>

                    {/* Appearance */}
                    <section>
                        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                            <Monitor className="w-5 h-5 text-indigo-400" /> Appearance
                        </h2>
                        <Card className="p-6 bg-card border-white/5 rounded-2xl shadow-xl">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className="text-foreground font-medium">Theme Preference</h4>
                                    <p className="text-sm text-muted-foreground/60">Choose between light, dark, or system default.</p>
                                </div>
                                <div className="px-3 py-1 bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 rounded text-xs font-bold uppercase">
                                    Use Navbar Toggle
                                </div>
                            </div>
                        </Card>
                    </section>

                    {/* About */}
                    <section className="pt-8 border-t border-white/5">
                        <div className="flex flex-col items-center text-center">
                            <div className="bg-indigo-600 p-2.5 rounded-lg shadow-lg shadow-indigo-500/20 mb-4">
                                <Play className="w-8 h-8 fill-white text-white" />
                            </div>
                            <h3 className="text-xl font-bold text-foreground italic">Growwzy v1.0.0</h3>
                            <p className="text-sm text-white/40 mt-2 max-w-md">
                                A premium, offline-first course player built by Antigravity.
                                Your data never leaves your browser.
                            </p>
                            <div className="flex gap-4 mt-6">
                                <Button variant="link" className="text-white/40 hover:text-white flex items-center gap-2">
                                    <ShieldCheck className="w-4 h-4" /> Privacy
                                </Button>
                                <Button variant="link" className="text-white/40 hover:text-white flex items-center gap-2">
                                    <HelpCircle className="w-4 h-4" /> Support
                                </Button>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}
