'use client';

import { Bell, Search, User as UserIcon, Command, Sun, Moon, Plus, Store, ChevronDown, ShoppingCart, Package, Wallet, LogOut, Menu } from 'lucide-react';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './ui/button';

interface DashboardHeaderProps {
  title: string;
  userRole: string;
}

export function DashboardHeader({ title, userRole }: DashboardHeaderProps) {
  const { data: session } = useSession();
  const resolvedRole = (session?.user?.role as string | undefined) || userRole || 'cashier';
  const [searchQuery, setSearchQuery] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
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

    const handleClickOutside = (event: MouseEvent) => {
      if (showQuickCreate && !(event.target as Element).closest('.quick-create-dropdown')) {
        setShowQuickCreate(false);
      }
      if (showUserMenu && !(event.target as Element).closest('.user-menu-dropdown')) {
        setShowUserMenu(false);
      }
    };

    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearInterval(interval);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showQuickCreate, showUserMenu]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/dashboard/pos?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const handleLogout = async () => {
    // End the activity session before logging out
    try {
      await fetch('/api/user-activity/end-session', {
        method: 'POST',
      });
    } catch (error) {
      console.error('Failed to end activity session:', error);
    }
    await signOut({ callbackUrl: '/login' });
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

        <motion.div 
          className="flex items-center space-x-4"
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

          {/* Quick Create Button */}
          <div className="relative quick-create-dropdown">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button 
                variant="primary" 
                size="sm" 
                className="gap-2"
                onClick={() => setShowQuickCreate(!showQuickCreate)}
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Quick Create</span>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </motion.div>
            
            <AnimatePresence>
              {showQuickCreate && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute right-0 mt-2 w-56 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden"
                >
                  <div className="p-2">
                    <button
                      onClick={() => { router.push('/dashboard/pos'); setShowQuickCreate(false); }}
                      className="w-full text-left px-4 py-3 rounded-lg hover:bg-accent transition-colors flex items-center gap-3"
                    >
                      <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">New Sale</span>
                    </button>
                    <button
                      onClick={() => { router.push('/dashboard/inventory/new'); setShowQuickCreate(false); }}
                      className="w-full text-left px-4 py-3 rounded-lg hover:bg-accent transition-colors flex items-center gap-3"
                    >
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Add Product</span>
                    </button>
                    <button
                      onClick={() => { router.push('/dashboard/customers/new'); setShowQuickCreate(false); }}
                      className="w-full text-left px-4 py-3 rounded-lg hover:bg-accent transition-colors flex items-center gap-3"
                    >
                      <UserIcon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Add Customer</span>
                    </button>
                    <button
                      onClick={() => { router.push('/dashboard/expenses'); setShowQuickCreate(false); }}
                      className="w-full text-left px-4 py-3 rounded-lg hover:bg-accent transition-colors flex items-center gap-3"
                    >
                      <Wallet className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Add Expense</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex items-center space-x-2 border-l border-border pl-4">
            {/* Theme Toggle */}
            <motion.button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2.5 text-muted-foreground hover:bg-accent rounded-xl transition-all"
              whileHover={{ scale: 1.1, rotate: 180 }}
              whileTap={{ scale: 0.9 }}
              transition={{ duration: 0.3 }}
            >
              {mounted && theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </motion.button>

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

            {/* Logout Button - Always Visible */}
            <motion.button
              onClick={handleLogout}
              className="p-2.5 text-destructive hover:bg-destructive/10 rounded-xl transition-all"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              title="Logout"
            >
              <LogOut className="h-5 w-5" />
            </motion.button>

            {/* User menu */}
            <div className="relative user-menu-dropdown">
              <motion.div 
                className="flex items-center space-x-3 p-1.5 pr-4 bg-secondary/50 rounded-xl hover:bg-secondary transition-colors cursor-pointer group border border-transparent hover:border-border"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowUserMenu(!showUserMenu)}
              >
                <motion.div 
                  className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-primary-700 flex items-center justify-center text-primary-foreground text-sm font-bold shadow-lg shadow-primary/20"
                  whileHover={{ rotate: 360, scale: 1.1 }}
                  transition={{ duration: 0.5 }}
                >
                  {resolvedRole.charAt(0).toUpperCase()}
                </motion.div>
                <div className="hidden md:block">
                  <p className="text-xs font-bold text-foreground leading-none">{resolvedRole.toUpperCase()}</p>
                  <p className="text-[10px] font-bold text-success mt-1 uppercase tracking-tighter">Verified</p>
                </div>
              </motion.div>

              <AnimatePresence>
                {showUserMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute right-0 mt-2 w-48 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden"
                  >
                    <div className="p-2">
                      <div className="px-4 py-2 border-b border-border mb-2">
                        <p className="text-sm font-bold text-foreground">{session?.user?.name || 'User'}</p>
                        <p className="text-xs text-muted-foreground">{session?.user?.email}</p>
                      </div>
                      <button
                        onClick={() => { router.push('/dashboard/settings'); setShowUserMenu(false); }}
                        className="w-full text-left px-4 py-3 rounded-lg hover:bg-accent transition-colors flex items-center gap-3"
                      >
                        <UserIcon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Settings</span>
                      </button>
                      {resolvedRole === 'admin' && (
                        <button
                          onClick={() => { router.push('/dashboard/active-users'); setShowUserMenu(false); }}
                          className="w-full text-left px-4 py-3 rounded-lg hover:bg-accent transition-colors flex items-center gap-3"
                        >
                          <Menu className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">Active Users</span>
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.header>
  );
}
