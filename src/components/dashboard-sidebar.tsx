'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Menu, X, ChevronsLeft } from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { getNavigationByRole } from '@/config/navigation';
import type { NavItem as NavItemType } from '@/config/navigation';
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
  const collapsed = isCollapsed && isLargeScreen;

  const NavItem = ({ item }: { item: NavItemType }) => {
    const isActive = pathname === item.href;
    return (
      <Link
        href={item.href}
        onClick={() => setIsOpen(false)}
        className={cn(
          'flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors',
          isActive
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:bg-accent hover:text-foreground',
          collapsed && 'justify-center px-2'
        )}
        title={collapsed ? item.name : undefined}
      >
        <item.icon className={cn('h-4.5 w-4.5 shrink-0', !collapsed && 'mr-3')} />
        {!collapsed && <span className="truncate">{item.name}</span>}
      </Link>
    );
  };

  return (
    <>
      {/* Mobile Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-50 rounded-md border border-border bg-card p-2.5 shadow-sm lg:hidden"
        aria-label={isOpen ? 'Close menu' : 'Open menu'}
      >
        {isOpen ? <X className="h-5 w-5 text-foreground" /> : <Menu className="h-5 w-5 text-foreground" />}
      </button>

      {/* Sidebar Overlay */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-40 bg-background/60 lg:hidden"
        />
      )}

      {/* Main Sidebar Container */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex flex-col border-r border-border bg-card transition-[width,transform] duration-200',
          collapsed ? 'w-20' : 'w-72',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="flex h-full flex-col p-4">
          {/* Brand */}
          <div className="mb-6 flex items-center justify-between px-2">
            <div className="flex min-w-0 items-center">
              <Image src="/logo.svg" alt="" width={32} height={32} className="mr-2.5 h-8 w-8 shrink-0" />
              {!collapsed && (
                <span className="truncate text-lg font-semibold leading-none text-foreground">SmartMart</span>
              )}
            </div>

            {isLargeScreen && !collapsed && (
              <button
                onClick={() => setIsCollapsed(true)}
                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                aria-label="Collapse sidebar"
              >
                <ChevronsLeft className="h-4 w-4" />
              </button>
            )}
          </div>

          {isLargeScreen && collapsed && (
            <button
              onClick={() => setIsCollapsed(false)}
              className="mb-4 self-center rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              aria-label="Expand sidebar"
            >
              <ChevronsLeft className="h-4 w-4 rotate-180" />
            </button>
          )}

          {/* Navigation */}
          <nav className="custom-scrollbar flex-1 space-y-5 overflow-y-auto pr-1">
            {navigationGroups.map((group) => (
              <div key={group.title}>
                {!collapsed && (
                  <h3 className="mb-1.5 px-3 text-xs font-medium uppercase tracking-wide text-muted-foreground/70">
                    {group.title}
                  </h3>
                )}
                <div className="space-y-0.5">
                  {group.items.map((item) => (
                    <NavItem key={item.name} item={item} />
                  ))}
                </div>
              </div>
            ))}
          </nav>

          {/* User identity */}
          <div className="mt-4 border-t border-border pt-4">
            <div
              className={cn(
                'flex items-center rounded-md p-2',
                collapsed && 'justify-center'
              )}
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                {(userName || userRole).charAt(0).toUpperCase()}
              </div>
              {!collapsed && (
                <div className="ml-3 min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{userName || 'Administrator'}</p>
                  <p className="truncate text-xs capitalize text-muted-foreground">{userRole}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
