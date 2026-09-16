'use client';

import { useState, useEffect } from 'react';
import { Users, Activity, Clock, Monitor, RefreshCw, AlertCircle } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';

interface UserActivityData {
  _id: string;
  userId: {
    _id: string;
    name: string;
    email: string;
    role: string;
    avatar?: string;
  };
  userName: string;
  userEmail: string;
  userRole: string;
  sessionStart: string;
  lastActivity: string;
  currentPage: string;
  isActive: boolean;
  ipAddress?: string;
  activities: Array<{
    action: string;
    page: string;
    timestamp: string;
    details?: Record<string, any>;
  }>;
}

const ROLE_VARIANT: Record<string, BadgeProps['variant']> = {
  admin: 'default',
  manager: 'info',
  cashier: 'success',
};

export default function ActiveUsersPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [activeUsers, setActiveUsers] = useState<UserActivityData[]>([]);
  const [sessionsToday, setSessionsToday] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastRefresh, setLastRefresh] = useState(new Date());

  useEffect(() => {
    if (session?.user?.role !== 'admin') {
      router.push('/dashboard');
      return;
    }

    fetchActiveUsers();

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchActiveUsers, 30000);

    return () => clearInterval(interval);
  }, [session, router]);

  const fetchActiveUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/user-activity/active?minutes=5');
      const data = await response.json();

      if (data.success) {
        setActiveUsers(data.data);
        setSessionsToday(data.sessionsToday ?? 0);
        setLastRefresh(new Date());
        setError('');
      } else {
        setError('Failed to fetch active users');
      }
    } catch (err) {
      setError('An error occurred while fetching active users');
      console.error('Error fetching active users:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const formatDuration = (startDate: string) => {
    const start = new Date(startDate);
    const now = new Date();
    const hours = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60));
    const minutes = Math.floor(((now.getTime() - start.getTime()) % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  if (session?.user?.role !== 'admin') {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Active Users</h1>
          <p className="mt-1 text-muted-foreground">Real-time user activity monitoring</p>
        </div>
        <Button onClick={fetchActiveUsers} disabled={loading} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Active Users</p>
              <p className="mt-2 text-3xl font-semibold text-foreground">{activeUsers.length}</p>
            </div>
            <div className="rounded-md bg-primary/10 p-3 text-primary">
              <Users className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Sessions Today</p>
              <p className="mt-2 text-3xl font-semibold text-foreground">{sessionsToday}</p>
            </div>
            <div className="rounded-md bg-success/10 p-3 text-success">
              <Activity className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Last Refresh</p>
              <p className="mt-2 text-lg font-semibold text-foreground">{formatTimeAgo(lastRefresh.toISOString())}</p>
            </div>
            <div className="rounded-md bg-info/10 p-3 text-info">
              <Clock className="h-5 w-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="flex items-center gap-3 rounded-md border border-destructive/20 bg-destructive/10 px-4 py-3 text-destructive">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      {/* Active Users Table */}
      <div className="rounded-lg border border-border bg-card shadow-sm">
        <div className="border-b border-border p-6">
          <h2 className="text-lg font-semibold text-foreground">Currently Active Users</h2>
          <p className="mt-1 text-sm text-muted-foreground">Users with activity in the last 5 minutes</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : activeUsers.length === 0 ? (
          <EmptyState icon={Users} title="No active users found" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Current Page</TableHead>
                <TableHead>Session Duration</TableHead>
                <TableHead>Last Activity</TableHead>
                <TableHead>Recent Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeUsers.map((user) => (
                <TableRow key={user._id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                        {user.userName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{user.userName}</p>
                        <p className="text-xs text-muted-foreground">{user.userEmail}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={ROLE_VARIANT[user.userRole] || 'secondary'} className="capitalize">
                      {user.userRole}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Monitor className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-foreground">{user.currentPage}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-foreground">{formatDuration(user.sessionStart)}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatTimeAgo(user.lastActivity)}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      {user.activities.slice(-3).reverse().map((activity, idx) => (
                        <div key={idx} className="text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">{activity.action}</span>
                          <span className="ml-2 text-muted-foreground/70">{formatTimeAgo(activity.timestamp)}</span>
                        </div>
                      ))}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
