'use client';

import { Bell, Search, Command } from 'lucide-react';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { ProfileMenu } from './profile-menu';
import { QuickCreateMenu } from './quick-create-menu';
import type { UserRole } from '@/lib/rbac';

interface DashboardHeaderProps {
  title: string;
  userRole: string;
}

export function DashboardHeader({ title, userRole }: DashboardHeaderProps) {
  const { data: session } = useSession();
  const resolvedRole = ((session?.user?.role as string | undefined) || userRole || 'cashier') as UserRole;
  const [searchQuery, setSearchQuery] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);

    const fetchUnreadCount = async () => {
      try {
        const response = await fetch('/api/notifications/unread-count');
        const data = await response.json();
        if (data.success) setUnreadCount(data.count);
      } catch (error) {
        console.error('Error fetching unread count:', error);
      }
    };

    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearInterval(interval);
    };
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/dashboard/pos?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <motion.header
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className={`sticky top-0 z-30 transition-all duration-300 ${
        scrolled
          ? 'bg-background/80 backdrop-blur-xl border-b border-border/50 py-3 shadow-sm'
          : 'bg-background/70 backdrop-blur-sm py-6'
      } px-4 sm:px-6 lg:px-8`}
    >
      <div className="flex items-center justify-between">
        {/* Left: context - page title / breadcrumb */}
        <motion.div
          className="flex items-center space-x-4"
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <motion.div
            className="p-2 bg-primary rounded-xl lg:hidden"
            whileHover={{ scale: 1.1, rotate: 5 }}
            whileTap={{ scale: 0.95 }}
          >
            <Command className="h-5 w-5 text-primary-foreground" />
          </motion.div>
          <div>
            <motion.h1
              className="text-2xl font-bold text-foreground tracking-tight"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
            >
              {title}
            </motion.h1>
            <motion.p
              className="text-xs font-medium text-muted-foreground uppercase tracking-widest mt-0.5"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.3 }}
            >
              Terminal 01 • Active
            </motion.p>
          </div>
        </motion.div>

        {/* Right: search, quick create (if permitted), notifications, identity */}
        <motion.div
          className="flex items-center space-x-3"
          initial={{ x: 20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          {/* Search Toggle for Mobile */}
          <motion.button
            onClick={() => setShowSearch(!showSearch)}
            className="lg:hidden p-2.5 text-muted-foreground hover:bg-accent rounded-xl transition-all"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <Search className="h-5 w-5" />
          </motion.button>

          {/* Search Bar */}
          <AnimatePresence>
            {(showSearch || !showSearch) && (
              <motion.form
                onSubmit={handleSearch}
                className="relative hidden lg:block group"
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: showSearch ? 0 : 'auto', opacity: showSearch ? 0 : 1 }}
                exit={{ width: 0, opacity: 0 }}
                whileFocus={{ scale: 1.02 }}
              >
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <motion.input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-11 pr-4 py-2.5 bg-secondary/50 border border-border rounded-xl focus:ring-2 focus:ring-ring/10 focus:bg-background transition-all w-64 text-sm font-semibold outline-none text-foreground placeholder:text-muted-foreground focus:w-80"
                  whileFocus={{ scale: 1.02 }}
                  transition={{ duration: 0.2 }}
                />
              </motion.form>
            )}
          </AnimatePresence>

          {/* Quick Create - only rendered when the current role holds at
              least one of the underlying creation permissions */}
          <QuickCreateMenu role={resolvedRole} />

          <div className="flex items-center space-x-2 border-l border-border pl-3">
            {/* Notifications */}
            <Link href="/dashboard/notifications" className="relative">
              <motion.div
                className="p-2.5 text-muted-foreground hover:bg-accent rounded-xl transition-all"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <Bell className="h-5 w-5" />
              </motion.div>
              {unreadCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 20 }}
                  className="absolute top-1 right-1 h-5 w-5 bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center rounded-full border-[3px] border-background ring-1 ring-destructive/20"
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </motion.span>
              )}
            </Link>

            {/* Identity - avatar opens the account menu (profile, settings,
                theme, change password, logout) */}
            <ProfileMenu role={resolvedRole} />
          </div>
        </motion.div>
      </div>
    </motion.header>
  );
}
