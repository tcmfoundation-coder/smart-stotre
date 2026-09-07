'use client';

import { useState, useEffect } from 'react';
import { DashboardHeader } from '@/components/dashboard-header';
import { History, Search, Filter, Calendar, User, Shield, Download, FileText, AlertTriangle, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';

interface ActivityLogEntry {
  id: string;
  action: string;
  description: string;
  userId?: string;
  userName: string;
  userRole: string;
  ipAddress: string;
  severity: 'info' | 'warning' | 'critical';
  timestamp: string;
}

export default function ActivityLogsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [userFilter, setUserFilter] = useState('all');
  const [activityLogs, setActivityLogs] = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      await fetchActivityLogs();
    })();
  }, [searchQuery, actionFilter, userFilter]);

  const fetchActivityLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (actionFilter !== 'all') params.append('action', actionFilter);
      if (userFilter !== 'all') params.append('user', userFilter);
      
      const response = await fetch(`/api/activity-logs?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setActivityLogs(data.data);
      } else {
        setError(data.error || 'Failed to fetch activity logs');
      }
    } catch (err) {
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (activityLogs.length === 0) {
      toast.info('No activity logs to export');
      return;
    }

    const headers = ['Timestamp', 'Severity', 'Action', 'Description', 'User', 'Role', 'IP Address'];
    const rows = activityLogs.map((log) => [
      new Date(log.timestamp).toLocaleString(),
      log.severity,
      log.action,
      `"${(log.description || '').replace(/"/g, '""')}"`,
      log.userName,
      log.userRole,
      log.ipAddress,
    ]);
    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `activity-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Activity logs exported');
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'warning': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'info': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return AlertTriangle;
      case 'warning': return AlertTriangle;
      default: return FileText;
    }
  };

  return (
    <div className="min-h-screen transition-colors duration-300">
      <DashboardHeader title="Activity Logs" userRole="admin" />
      
      <main className="py-6">
        {/* Header Actions */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search logs by action, description, or user..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="px-4 py-2 bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">All Actions</option>
              <option value="USER_LOGIN">User Login</option>
              <option value="PRODUCT_CREATED">Product Created</option>
              <option value="STOCK_ADJUSTMENT">Stock Adjustment</option>
              <option value="SALE_COMPLETED">Sale Completed</option>
              <option value="RETURN_PROCESSED">Return Processed</option>
            </select>
            <select
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              className="px-4 py-2 bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">All Users</option>
              <option value="admin">Admins</option>
              <option value="manager">Managers</option>
              <option value="cashier">Cashiers</option>
            </select>
          </div>
          <Button 
            variant="outline"
            onClick={handleExport}
          >
            <Download className="h-4 w-4 mr-2" />
            Export Logs
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <History className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-500">{error}</p>
            <Button onClick={fetchActivityLogs} className="mt-4">Retry</Button>
          </div>
        ) : (
          <div className="space-y-3">
            {activityLogs.map((log, index) => {
            const SeverityIcon = getSeverityIcon(log.severity);
            return (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                        <SeverityIcon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-bold ${getSeverityColor(log.severity)}`}>
                            {log.severity.toUpperCase()}
                          </span>
                          <span className="font-bold text-foreground">{log.action}</span>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{log.description}</p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            <span>{log.userName} ({log.userRole})</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>{new Date(log.timestamp).toLocaleString()}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Shield className="h-3 w-3" />
                            <span>{log.ipAddress}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
            })}
          </div>
        )}

        {!loading && !error && activityLogs.length === 0 && (
          <div className="text-center py-12">
            <History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No activity logs found matching your search</p>
          </div>
        )}
      </main>
    </div>
  );
}
