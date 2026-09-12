'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, ChevronRight } from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { getNavigationByRole } from '@/config/navigation';
import { UserRole } from '@/lib/rbac';

interface DashboardSidebarProps {
  userRole: UserRole;
  userName?: string;
}

export function DashboardSidebar({ userRole, userName }: DashboardSidebarProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [isLargeScreen, setIsLargeScreen] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => setIsLargeScreen(window.innerWidth >= 1024);
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  const navigationGroups = getNavigationByRole(userRole);

  const NavItem = ({ item }: { item: any }) => {
    const isActive = pathname === item.href;
    return (
      <Link
        href={item.href}
        onClick={() => setIsOpen(false)}
        className={cn(
          "group relative flex items-center px-4 py-3 text-sm font-bold rounded-xl transition-all duration-300 mb-1",
          isActive
            ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
            : "text-muted-foreground hover:bg-accent hover:text-primary",
          isCollapsed && isLargeScreen && "justify-center px-3"
        )}
        title={isCollapsed && isLargeScreen ? item.name : undefined}
      >
        <motion.div
          whileHover={{ scale: 1.2, rotate: 5 }}
          transition={{ duration: 0.2 }}
          className={cn(isCollapsed && isLargeScreen ? "mr-0" : "mr-3")}
        >
          <item.icon className={cn(
            "h-5 w-5 transition-transform duration-300",
            isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-primary"
          )} />
        </motion.div>
        <motion.span 
          className="flex-1 tracking-tight"
          animate={{ 
            opacity: isCollapsed && isLargeScreen ? 0 : 1,
            width: isCollapsed && isLargeScreen ? 0 : 'auto'
          }}
          transition={{ duration: 0.3 }}
          whileHover={{ x: isCollapsed && isLargeScreen ? 0 : 5 }}
        >
          {item.name}
        </motion.span>
        {isActive && !isCollapsed && (
          <motion.div
            layoutId="active-pill"
            className="absolute left-0 w-1 h-6 bg-primary-foreground rounded-full ml-1"
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          />
        )}
        {!isCollapsed && (
          <motion.div
            className={cn(
              "h-4 w-4 opacity-0 transition-all duration-300 transform translate-x-2",
              isActive && "hidden"
            )}
            whileHover={{ 
              opacity: 0.4, 
              translateX: 0,
              scale: 1.2
            }}
          >
            <ChevronRight className="h-4 w-4" />
          </motion.div>
        )}
      </Link>
    );
  };

  return (
    <>
      {/* Mobile Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-3 bg-card border border-border rounded-xl shadow-xl active:scale-95 transition-transform"
      >
        {isOpen ? <X className="h-6 w-6 text-muted-foreground" /> : <Menu className="h-6 w-6 text-muted-foreground" />}
      </button>

      {/* Sidebar Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 z-40 bg-background/40 backdrop-blur-sm lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Main Sidebar Container */}
      <motion.aside
        initial={{ x: -300, opacity: 0 }}
        animate={{ 
          x: isOpen ? 0 : (isLargeScreen ? 0 : -300), 
          opacity: 1,
          width: isCollapsed && isLargeScreen ? 80 : 288
        }}
        transition={{ duration: 0.4 }}
        className={cn(
          "fixed inset-y-0 left-0 z-40 bg-card border-r border-border lg:translate-x-0 overflow-hidden",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex flex-col h-full p-6">
          {/* Brand Identity */}
          <motion.div 
            className="flex items-center justify-between px-2 mb-10"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <div className="flex items-center">
              <motion.div 
                className="h-12 w-12 mr-3 flex-shrink-0"
                whileHover={{ scale: 1.1, rotate: 5 }}
                transition={{ duration: 0.3 }}
              >
                <img src="/logo.svg" alt="SmartMart Logo" className="h-full w-full" />
              </motion.div>
              <motion.div
                animate={{ 
                  opacity: isCollapsed ? 0 : 1,
                  width: isCollapsed ? 0 : 'auto'
                }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <h1 className="text-xl font-black text-foreground tracking-tighter uppercase leading-none whitespace-nowrap">SmartMart</h1>
                <p className="text-[10px] font-black text-primary tracking-[0.3em] uppercase mt-0.5">Enterprise</p>
              </motion.div>
            </div>
            
            {/* Collapse Toggle */}
            {isLargeScreen && (
              <motion.button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="p-2 rounded-lg hover:bg-accent transition-colors"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <ChevronRight 
                  className={cn(
                    "h-5 w-5 text-muted-foreground transition-transform duration-300",
                    isCollapsed && "rotate-180"
                  )}
                />
              </motion.button>
            )}
          </motion.div>

          {/* Navigation Engine */}
          <div className="flex-1 overflow-y-auto pr-2 -mr-2 custom-scrollbar space-y-6">
            {navigationGroups.map((group: any, groupIndex: number) => (
              <motion.div
                key={group.title}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: groupIndex * 0.1 }}
              >
                <motion.h3 
                  className="px-4 mb-2 text-xs font-black text-muted-foreground uppercase tracking-widest overflow-hidden"
                  animate={{ 
                    opacity: isCollapsed && isLargeScreen ? 0 : 1,
                    width: isCollapsed && isLargeScreen ? 0 : 'auto'
                  }}
                  transition={{ duration: 0.3 }}
                >
                  {group.title}
                </motion.h3>
                <motion.div 
                  className="space-y-1"
                  initial="hidden"
                  animate="visible"
                  variants={{
                    hidden: { opacity: 0 },
                    visible: {
                      opacity: 1,
                      transition: {
                        staggerChildren: 0.05
                      }
                    }
                  }}
                >
                  {group.items.map((item: any, index: number) => (
                    <motion.div
                      key={item.name}
                      variants={{
                        hidden: { opacity: 0, x: -20 },
                        visible: { opacity: 1, x: 0 }
                      }}
                      transition={{ duration: 0.3, delay: index * 0.03 }}
                    >
                      <NavItem item={item} />
                    </motion.div>
                  ))}
                </motion.div>
              </motion.div>
            ))}
          </div>

          {/* User Control Node */}
          <motion.div 
            className="mt-6 pt-6 border-t border-border"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.5 }}
          >
            <motion.div 
              className={cn(
                "flex items-center p-3 bg-secondary/50 rounded-xl border border-transparent hover:border-border transition-all cursor-pointer group",
                isCollapsed && isLargeScreen && "justify-center"
              )}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="relative flex-shrink-0">
                <motion.div 
                  className="h-11 w-11 rounded-xl bg-gradient-to-br from-primary to-primary-700 flex items-center justify-center text-primary-foreground font-black text-lg shadow-lg shadow-primary/20"
                  whileHover={{ rotate: 360, scale: 1.1 }}
                  transition={{ duration: 0.5 }}
                >
                  {(userName || userRole).charAt(0).toUpperCase()}
                </motion.div>
                <motion.div 
                  className="absolute -bottom-1 -right-1 h-4 w-4 bg-success border-2 border-card rounded-full"
                  animate={{ 
                    scale: [1, 1.2, 1],
                    opacity: [1, 0.7, 1]
                  }}
                  transition={{ 
                    duration: 2, 
                    repeat: Infinity,
                    ease: "easeInOut" 
                  }}
                />
              </div>
              <motion.div 
                className="flex-1 min-w-0 ml-3 overflow-hidden"
                animate={{ 
                  opacity: isCollapsed && isLargeScreen ? 0 : 1,
                  width: isCollapsed && isLargeScreen ? 0 : 'auto'
                }}
                transition={{ duration: 0.3 }}
              >
                <p className="text-sm font-black text-foreground truncate uppercase tracking-tight">{userName || 'Administrator'}</p>
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mt-0.5">{userRole}</p>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </motion.aside>
    </>
  );
}
