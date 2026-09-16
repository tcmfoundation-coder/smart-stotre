'use client';

import { useState, useEffect } from 'react';
import { DashboardHeader } from '@/components/dashboard-header';
import { Bell, Check, CheckCheck, Trash2, AlertTriangle, Info, AlertCircle, CheckCircle, Tag, Clock, Loader2 } from 'lucide-react';
import { formatDate, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';

interface Notification {
  _id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  category: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  isRead: boolean;
  createdAt: string;
}

const TYPE_STYLES: Record<Notification['type'], { icon: typeof Info; className: string }> = {
  warning: { icon: AlertTriangle, className: 'bg-warning/10 text-warning' },
  error: { icon: AlertCircle, className: 'bg-destructive/10 text-destructive' },
  success: { icon: CheckCircle, className: 'bg-success/10 text-success' },
  info: { icon: Info, className: 'bg-info/10 text-info' },
};

const PRIORITY_BADGE: Record<Notification['priority'], 'destructive' | 'warning' | 'info' | 'secondary'> = {
  urgent: 'destructive',
  high: 'warning',
  medium: 'info',
  low: 'secondary',
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setError(false);
      const response = await fetch('/api/notifications');
      const data = await response.json();
      if (data.success) {
        setNotifications(data.data);
      } else {
        setError(true);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      const response = await fetch(`/api/notifications/${id}`, { method: 'PUT' });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to mark notification as read');
      }
      setNotifications(notifications.map((n) => (n._id === id ? { ...n, isRead: true } : n)));
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications/read-all', { method: 'PUT' });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to mark all notifications as read');
      }
      setNotifications(notifications.map((n) => ({ ...n, isRead: true })));
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}`, { method: 'DELETE' });
      setNotifications(notifications.filter((n) => n._id !== id));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader title="Notifications" userRole="admin" />

      <main className="p-6 lg:p-8">
        {/* Actions Bar */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" className="gap-2" onClick={handleMarkAllAsRead} disabled={unreadCount === 0}>
              <CheckCheck className="h-4 w-4" />
              Mark all as read
            </Button>
            {unreadCount > 0 && <Badge variant="info">{unreadCount} unread</Badge>}
          </div>
        </div>

        {/* Notifications List */}
        <div className="max-w-4xl space-y-4">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading notifications...
            </div>
          ) : error ? (
            <ErrorState description="Failed to load notifications" onRetry={fetchNotifications} />
          ) : notifications.length === 0 ? (
            <EmptyState icon={Bell} title="No notifications" description="You're all caught up." />
          ) : (
            notifications.map((notification) => {
              const { icon: Icon, className } = TYPE_STYLES[notification.type] ?? TYPE_STYLES.info;
              return (
                <Card
                  key={notification._id}
                  className={cn(!notification.isRead && 'border-primary/30 bg-primary/[0.03]')}
                >
                  <CardContent className="flex items-start justify-between gap-4 p-6">
                    <div className="flex items-start gap-4">
                      <div className={cn('flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md', className)}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <div className="mb-1.5 flex items-center gap-2">
                          <h3 className="text-sm font-semibold text-foreground">{notification.title}</h3>
                          <Badge variant={PRIORITY_BADGE[notification.priority] ?? 'secondary'} className="capitalize">
                            {notification.priority}
                          </Badge>
                        </div>
                        <p className="mb-3 text-sm text-muted-foreground">{notification.message}</p>
                        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5" />
                            <span>{formatDate(notification.createdAt)}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Tag className="h-3.5 w-3.5" />
                            <span className="capitalize">{notification.category.replace('_', ' ')}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-1">
                      {!notification.isRead && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-primary"
                          onClick={() => handleMarkAsRead(notification._id)}
                          title="Mark as read"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(notification._id)}
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
}
