'use client';

import { useState, useEffect } from 'react';
import { DashboardHeader } from '@/components/dashboard-header';
import { Bell, Check, CheckCheck, Trash2, AlertTriangle, Info, AlertCircle, CheckCircle, Tag, Clock } from 'lucide-react';
import { formatDate, cn } from '@/lib/utils';

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

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await fetch('/api/notifications');
      const data = await response.json();
      if (data.success) {
        setNotifications(data.data);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
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
      setNotifications(notifications.map(n =>
        n._id === id ? { ...n, isRead: true } : n
      ));
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
      setNotifications(notifications.map(n => ({ ...n, isRead: true })));
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}`, { method: 'DELETE' });
      setNotifications(notifications.filter(n => n._id !== id));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-orange-600" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      default:
        return <Info className="h-5 w-5 text-blue-600" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 transition-colors duration-300">
      <DashboardHeader title="Notifications" userRole="admin" />
      
      <main className="p-8">
        {/* Actions Bar */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-6">
            <button
              onClick={handleMarkAllAsRead}
              className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-2xl font-black shadow-lg shadow-blue-200 dark:shadow-none hover:bg-blue-700 hover:-translate-y-0.5 transition-all active:scale-95"
            >
              <CheckCheck className="h-5 w-5" />
              <span>MARK ALL AS READ</span>
            </button>
            <div className="flex items-center space-x-2">
              <div className="h-2 w-2 rounded-full bg-blue-600 animate-pulse"></div>
              <span className="text-sm font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">
                {notifications.filter(n => !n.isRead).length} Unread
              </span>
            </div>
          </div>
        </div>

        {/* Notifications List */}
        <div className="space-y-6 max-w-4xl">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800">
              <div className="h-10 w-10 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin mb-4"></div>
              <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Syncing alerts...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-800 p-20 text-center">
              <div className="h-24 w-24 bg-slate-50 dark:bg-slate-800 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
                <Bell className="h-10 w-10 text-slate-300 dark:text-slate-600" />
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">Zero alerts</h3>
              <p className="text-slate-400 font-medium">Your system is running smoothly with no new notifications.</p>
            </div>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification._id}
                className={`group bg-white dark:bg-slate-900 rounded-[2rem] p-6 border transition-all duration-300 ${
                  !notification.isRead 
                    ? 'border-blue-600/20 dark:border-blue-500/20 shadow-xl shadow-blue-600/[0.03] bg-blue-50/30 dark:bg-blue-900/10' 
                    : 'border-slate-100 dark:border-slate-800 shadow-sm opacity-80'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-6">
                    <div className={cn(
                      "p-4 rounded-2xl shadow-sm border border-transparent transition-transform group-hover:scale-110",
                      notification.type === 'warning' ? "bg-orange-50 dark:bg-orange-500/10" : 
                      notification.type === 'error' ? "bg-rose-50 dark:bg-rose-500/10" : 
                      notification.type === 'success' ? "bg-emerald-50 dark:bg-emerald-500/10" : 
                      "bg-blue-50 dark:bg-blue-500/10"
                    )}>
                      {getIcon(notification.type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="font-black text-slate-900 dark:text-white tracking-tight text-lg">{notification.title}</h3>
                        <span className={cn(
                          "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                          getPriorityColor(notification.priority)
                        )}>
                          {notification.priority}
                        </span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-400 font-medium leading-relaxed mb-4">{notification.message}</p>
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                          <Clock className="h-3.5 w-3.5 mr-1.5" />
                          <span>{formatDate(notification.createdAt)}</span>
                        </div>
                        <div className="flex items-center text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                          <Tag className="h-3.5 w-3.5 mr-1.5" />
                          <span>{notification.category.replace('_', ' ')}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-center space-y-2">
                    {!notification.isRead && (
                      <button
                        onClick={() => handleMarkAsRead(notification._id)}
                        className="p-3 hover:bg-white dark:hover:bg-slate-800 rounded-xl shadow-sm hover:shadow-md transition-all text-blue-600"
                        title="Mark as read"
                      >
                        <Check className="h-5 w-5" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(notification._id)}
                      className="p-3 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-all text-rose-500"
                      title="Delete"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
