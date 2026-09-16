'use client';

import { useState, useEffect } from 'react';
import { DashboardHeader } from '@/components/dashboard-header';
import { History, Search, Calendar, User, Shield, Download, FileText, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { CardSkeleton } from '@/components/loading/CardSkeleton';
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

const SEVERITY_BADGE: Record<ActivityLogEntry['severity'], 'destructive' | 'warning' | 'info'> = {
  critical: 'destructive',
  warning: 'warning',
  info: 'info',
};

const SEVERITY_ICON: Record<ActivityLogEntry['severity'], typeof FileText> = {
  critical: AlertTriangle,
  warning: AlertTriangle,
  info: FileText,
};

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader title="Activity Logs" userRole="admin" />

      <main className="p-6 lg:p-8">
        {/* Header Actions */}
        <div className="mb-6 flex flex-col items-stretch justify-between gap-4 xl:flex-row xl:items-center">
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center xl:w-auto">
            <div className="relative sm:w-64 xl:w-96">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search logs by action, description, or user..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-11 pl-9"
              />
            </div>
            <div className="flex gap-3">
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="h-11 flex-1 sm:w-48">
                  <SelectValue placeholder="All Actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  <SelectItem value="USER_LOGIN">User Login</SelectItem>
                  <SelectItem value="USER_CREATED">User Created</SelectItem>
                  <SelectItem value="USER_UPDATED">User Updated</SelectItem>
                  <SelectItem value="USER_ROLE_CHANGED">User Role Changed</SelectItem>
                  <SelectItem value="USER_DEACTIVATED">User Deactivated</SelectItem>
                  <SelectItem value="ROLE_CREATED">Role Created</SelectItem>
                  <SelectItem value="ROLE_UPDATED">Role Updated</SelectItem>
                  <SelectItem value="ROLE_DELETED">Role Deleted</SelectItem>
                  <SelectItem value="PRODUCT_CREATED">Product Created</SelectItem>
                  <SelectItem value="STOCK_ADJUSTMENT">Stock Adjustment Approved</SelectItem>
                  <SelectItem value="STOCK_ADJUSTMENT_REJECTED">Stock Adjustment Rejected</SelectItem>
                  <SelectItem value="SALE_COMPLETED">Sale Completed</SelectItem>
                  <SelectItem value="RETURN_PROCESSED">Return Processed</SelectItem>
                  <SelectItem value="PURCHASE_ORDER_CREATED">Purchase Order Created</SelectItem>
                  <SelectItem value="PURCHASE_ORDER_APPROVED">Purchase Order Approved</SelectItem>
                  <SelectItem value="GOODS_RECEIPT_CREATED">Goods Receipt Created</SelectItem>
                  <SelectItem value="GOODS_RECEIPT_OVERAGE_APPROVED">Over-Delivery Approved</SelectItem>
                  <SelectItem value="GOODS_RECEIPT_OVERAGE_REJECTED">Over-Delivery Rejected</SelectItem>
                  <SelectItem value="DATABASE_EXPORTED">Database Exported</SelectItem>
                </SelectContent>
              </Select>
              <Select value={userFilter} onValueChange={setUserFilter}>
                <SelectTrigger className="h-11 flex-1 sm:w-40">
                  <SelectValue placeholder="All Users" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  <SelectItem value="admin">Admins</SelectItem>
                  <SelectItem value="manager">Managers</SelectItem>
                  <SelectItem value="cashier">Cashiers</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button variant="outline" className="w-full gap-2 xl:w-auto" onClick={handleExport}>
            <Download className="h-4 w-4" />
            Export Logs
          </Button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : error ? (
          <ErrorState description={error} onRetry={fetchActivityLogs} />
        ) : activityLogs.length === 0 ? (
          <EmptyState icon={History} title="No activity logs found" description="Try a different search or filter" />
        ) : (
          <div className="space-y-3">
            {activityLogs.map((log) => {
              const SeverityIcon = SEVERITY_ICON[log.severity] ?? FileText;
              return (
                <Card key={log.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md bg-primary/10">
                        <SeverityIcon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="mb-2 flex items-center gap-2">
                          <Badge variant={SEVERITY_BADGE[log.severity] ?? 'secondary'} className="uppercase">
                            {log.severity}
                          </Badge>
                          <span className="font-semibold text-foreground">{log.action}</span>
                        </div>
                        <p className="mb-2 text-sm text-muted-foreground">{log.description}</p>
                        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
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
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
