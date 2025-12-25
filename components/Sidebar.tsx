'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    BookOpen,
    CheckSquare,
    FileText,
    Timer,
    Upload,
    Settings,
    HelpCircle,
    LogOut
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/' },
    { icon: BookOpen, label: 'My Course', href: '/courses' },
    { icon: CheckSquare, label: 'My Tasks', href: '/tasks' },
    { icon: FileText, label: 'My Notes', href: '/notes' },
    { icon: Timer, label: 'Pomodoro', href: '/pomodoro' },
];

const actionItems = [
    { icon: Upload, label: 'Upload Course', href: '/upload' },
];

const settingItems = [
    { icon: Settings, label: 'Setting', href: '/settings' },
];

export default function Sidebar() {
    const pathname = usePathname();

    return (
        <div className="w-64 h-screen bg-sidebar-navy flex flex-col shrink-0 overflow-y-auto scrollbar-hide">
            {/* Logo */}
            <div className="p-8 pb-12">
                <Link href="/" className="flex items-center gap-3">
                    <span className="text-xl font-black text-white tracking-tight italic">GROWWZY</span>
                </Link>
            </div>

            {/* Menu Sections */}
            <div className="flex-1 px-4 space-y-8">
                <div>
                    <span className="text-[10px] font-bold text-white/30 uppercase tracking-[2px] px-4 mb-4 block">Main Menu</span>
                    <nav className="space-y-1">
                        {menuItems.map((item) => {
                            const isActive = pathname === item.href;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={cn(
                                        "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative",
                                        isActive ? "text-white bg-white/10" : "text-white/50 hover:text-white hover:bg-white/5"
                                    )}
                                >
                                    {isActive && (
                                        <motion.div
                                            layoutId="active-sidebar"
                                            className="absolute left-0 w-1 h-6 bg-white rounded-r-full"
                                        />
                                    )}
                                    <item.icon className={cn("w-5 h-5", isActive ? "text-white" : "group-hover:text-white")} />
                                    <span className="text-sm font-medium">{item.label}</span>
                                </Link>
                            );
                        })}
                    </nav>
                </div>

                <div>
                    <span className="text-[10px] font-bold text-white/30 uppercase tracking-[2px] px-4 mb-4 block">Action</span>
                    <nav className="space-y-1">
                        {actionItems.map((item) => {
                            const isActive = pathname === item.href;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={cn(
                                        "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group text-white/50 hover:text-white hover:bg-white/5",
                                        isActive && "text-white bg-white/10"
                                    )}
                                >
                                    <item.icon className="w-5 h-5 group-hover:text-white" />
                                    <span className="text-sm font-medium">{item.label}</span>
                                </Link>
                            );
                        })}
                    </nav>
                </div>

                <div>
                    <span className="text-[10px] font-bold text-white/30 uppercase tracking-[2px] px-4 mb-4 block">Preference</span>
                    <nav className="space-y-1">
                        {settingItems.map((item) => {
                            const isActive = pathname === item.href;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={cn(
                                        "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                                        isActive ? "text-white bg-white/10" : "text-white/50 hover:text-white hover:bg-white/5"
                                    )}
                                >
                                    <item.icon className={cn("w-5 h-5", isActive ? "text-white" : "group-hover:text-white")} />
                                    <span className="text-sm font-medium">{item.label}</span>
                                </Link>
                            );
                        })}
                    </nav>
                </div>
            </div>

            {/* Upgrade Card removed per User Request */}
        </div>
    );
}
