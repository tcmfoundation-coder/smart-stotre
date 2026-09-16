'use client';

import { DashboardHeader } from '@/components/dashboard-header';
import { getWhatsAppMessages, getWhatsAppMessageStats } from '@/lib/whatsapp';
import { MessageSquare, CheckCircle, XCircle, Search, Download, X } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';

type StatusFilter = 'all' | 'sent' | 'failed' | 'pending';

export default function WhatsAppMessagesPage() {
  const [messages, setMessages] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({ total: 0, sent: 0, failed: 0, successRate: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [loading, setLoading] = useState(true);

  const loadData = async (search?: string, status?: StatusFilter) => {
    try {
      setLoading(true);
      const [messagesData, statsData] = await Promise.all([
        getWhatsAppMessages({
          search: search || undefined,
          status: status && status !== 'all' ? status : undefined,
        }),
        getWhatsAppMessageStats()
      ]);
      setMessages(messagesData);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading WhatsApp messages:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      await loadData();
    })();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData(searchQuery || undefined, statusFilter);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, statusFilter]);

  const handleExport = () => {
    if (messages.length === 0) {
      toast.info('No messages to export');
      return;
    }

    const headers = ['Customer', 'Phone', 'Message', 'Amount', 'Date', 'Status'];
    const rows = messages.map((m) => [
      m.customerName,
      m.customerPhone,
      `"${(m.message || '').replace(/"/g, '""')}"`,
      m.amount || '',
      new Date(m.createdAt).toLocaleString(),
      m.status,
    ]);
    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `whatsapp-messages-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Messages exported successfully');
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader title="WhatsApp Messages" userRole="manager" />

      <main className="p-6 lg:p-8">
        {/* Quick Stats */}
        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-4">
          <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Total Messages</p>
                <h3 className="text-2xl font-semibold text-foreground">{stats.total}</h3>
              </div>
              <div className="rounded-md bg-primary/10 p-3 text-primary">
                <MessageSquare className="h-5 w-5" />
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Successfully Sent</p>
                <h3 className="text-2xl font-semibold text-success">{stats.sent}</h3>
              </div>
              <div className="rounded-md bg-success/10 p-3 text-success">
                <CheckCircle className="h-5 w-5" />
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Failed</p>
                <h3 className="text-2xl font-semibold text-destructive">{stats.failed}</h3>
              </div>
              <div className="rounded-md bg-destructive/10 p-3 text-destructive">
                <XCircle className="h-5 w-5" />
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Success Rate</p>
                <h3 className="text-2xl font-semibold text-foreground">{stats.successRate}%</h3>
              </div>
              <div className="rounded-md bg-info/10 p-3 text-info">
                <CheckCircle className="h-5 w-5" />
              </div>
            </div>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="mb-6 flex flex-col items-center justify-between gap-4 xl:flex-row">
          <div className="relative w-full flex-1 xl:w-96">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search messages by customer name or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-11 pl-9 pr-9"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex gap-3">
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
              <SelectTrigger className="h-11 w-40">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleExport} className="gap-2">
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>
        </div>

        {/* Messages Table */}
        <div className="rounded-lg border border-border bg-card shadow-sm">
          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent" />
              <p className="mt-4 text-sm text-muted-foreground">Loading WhatsApp messages...</p>
            </div>
          ) : messages.length === 0 ? (
            <EmptyState
              icon={MessageSquare}
              title="No messages found"
              description={searchQuery ? 'Try a different search term' : 'No WhatsApp messages sent yet'}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {messages.map((message: any) => (
                  <TableRow key={message._id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success/10 font-semibold text-success">
                          {message.customerName.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{message.customerName}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {message.customerId ? `ID: ${String(message.customerId).substring(18)}` : 'Guest'}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-foreground">{message.customerPhone}</TableCell>
                    <TableCell className="max-w-md">
                      <p className="line-clamp-2 text-sm text-muted-foreground">{message.message}</p>
                    </TableCell>
                    <TableCell className="font-medium text-foreground">
                      {message.amount ? formatCurrency(message.amount) : '-'}
                    </TableCell>
                    <TableCell>
                      <p className="text-foreground">{new Date(message.createdAt).toLocaleDateString()}</p>
                      <p className="text-xs text-muted-foreground">{new Date(message.createdAt).toLocaleTimeString()}</p>
                    </TableCell>
                    <TableCell>
                      {message.status === 'sent' && <Badge variant="success">Sent</Badge>}
                      {message.status === 'failed' && <Badge variant="destructive">Failed</Badge>}
                      {message.status === 'pending' && <Badge variant="warning">Pending</Badge>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </main>
    </div>
  );
}
