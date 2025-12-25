'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search, Bell, Settings, Menu, X, Play, Sun, Moon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useTheme } from 'next-themes';

const Navbar = () => {
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const { theme, setTheme } = useTheme();
    const pathname = usePathname();

    useEffect(() => {
        setMounted(true);
        const handleScroll = () => {
            if (window.scrollY > 0) {
                setIsScrolled(true);
            } else {
                setIsScrolled(false);
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const navLinks = [
        { name: 'Home', href: '/' },
        { name: 'My Courses', href: '/courses' },
        { name: 'Upload', href: '/upload' },
        { name: 'Stats', href: '/stats' },
    ];
    return (
        <nav
            className={cn(
                'absolute top-0 right-0 left-0 z-50 transition-all duration-300 ease-in-out px-4 md:px-8 h-16 md:h-20 flex items-center justify-between bg-transparent'
            )}
        >
            <div className="flex-1 max-w-xl">
                {/* Search Bar matching Ref 1 */}
                <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-foreground transition-colors" />
                    <input
                        type="text"
                        placeholder="Search Everything..."
                        className="w-full bg-secondary/50 border border-transparent focus:border-foreground/30 focus:bg-background rounded-2xl py-2.5 pl-11 pr-4 text-sm transition-all outline-none"
                    />
                </div>
            </div>

            <div className="flex items-center gap-4 md:gap-6 ml-4">
                {/* Icons */}
                <button className="text-foreground/60 hover:text-foreground transition-colors relative">
                    <Bell className="w-5 h-5" />
                    <span className="absolute top-0 right-0 w-2 h-2 bg-foreground rounded-full border-2 border-background" />
                </button>

                {mounted && (
                    <button
                        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                        className="text-foreground/60 hover:text-foreground transition-all hover:rotate-12"
                    >
                        {theme === 'dark' ? <Sun className="w-5 h-5 text-amber-500" /> : <Moon className="w-5 h-5 text-foreground" />}
                    </button>
                )}

                {/* Vertical Divider */}
                <div className="w-px h-6 bg-border mx-2 hidden sm:block" />

                {/* User Profile Removed per User Request */}

                {/* Mobile Menu Button */}
                <button
                    className="md:hidden text-foreground"
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                >
                    {isMobileMenuOpen ? <X /> : <Menu />}
                </button>
            </div>

            {/* Mobile Menu Overlay */}
            {isMobileMenuOpen && (
                <div className="absolute top-16 left-0 w-full bg-background/98 backdrop-blur-xl border-t border-border p-4 md:hidden animate-in fade-in slide-in-from-top-4 shadow-2xl">
                    <div className="flex flex-col gap-4">
                        {navLinks.map((link) => (
                            <Link
                                key={link.name}
                                href={link.href}
                                className={cn(
                                    'text-lg py-2 border-b border-border',
                                    pathname === link.href ? 'text-primary' : 'text-foreground'
                                )}
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                {link.name}
                            </Link>
                        ))}
                    </div>
                </div>
            )}
        </nav>
    );
};

export default Navbar;
