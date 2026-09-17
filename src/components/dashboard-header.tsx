'use client';

import { Bell, Search } from 'lucide-react';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ProfileMenu } from './profile-menu';
import { QuickCreateMenu } from './quick-create-menu';
import type { UserRole } from '@/lib/rbac';
import { useNotifications } from '@/hooks/useNotifications';

interface DashboardHeaderProps {
  title: string;
  userRole: string;
}

export function DashboardHeader({ title, userRole }: DashboardHeaderProps) {
  const { data: session } = useSession();
  const resolvedRole = ((session?.user?.role as string | undefined) || userRole || 'cashier') as UserRole;
  const [searchQuery, setSearchQuery] = useState('');
  const [scrolled, setScrolled] = useState(false);
  const router = useRouter();
  // Mounted on every dashboard page, so this is also what keeps polling for
  // new notifications (in-app toast + native browser notification) while
  // the cashier/admin is anywhere in the app, not just on the notification
  // center page itself.
  const { unreadCount } = useNotifications();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/dashboard/pos?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <header
      className={`sticky top-0 z-30 bg-background/95 backdrop-blur transition-shadow ${
        scrolled ? 'border-b border-border shadow-sm' : 'border-b border-transparent'
      } py-4 pl-16 pr-4 sm:pr-6 lg:px-8`}
    >
      <div className="flex items-center justify-between gap-4">
        {/* Left: page context */}
        <h1 className="truncate text-xl font-semibold text-foreground sm:text-2xl">{title}</h1>

        {/* Right: search, quick create, notifications, identity */}
        <div className="flex shrink-0 items-center gap-2">
          <form onSubmit={handleSearch} className="relative hidden md:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search products, barcode, or customers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 w-56 rounded-md border border-input bg-input-background pl-9 pr-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/20 lg:w-72"
            />
          </form>

          <button
            onClick={() => router.push('/dashboard/pos')}
            className="rounded-md p-2.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground md:hidden"
            aria-label="Search"
          >
            <Search className="h-5 w-5" />
          </button>

          <QuickCreateMenu role={resolvedRole} />

          <Link
            href="/dashboard/notifications"
            className="relative rounded-md p-2.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-none text-destructive-foreground">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Link>

          <ProfileMenu role={resolvedRole} />
        </div>
      </div>
    </header>
  );
}
