'use client';

import { DashboardHeader } from '@/components/dashboard-header';
import { getWhatsAppMessages, getWhatsAppMessageStats } from '@/lib/whatsapp';
import { MessageSquare, CheckCircle, XCircle, Clock, Search, Filter, Download, X } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';

type StatusFilter = '' | 'sent' | 'failed' | 'pending';

export default function WhatsAppMessagesPage() {
  const [messages, setMessages] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({ total: 0, sent: 0, failed: 0, successRate: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('');
  const [loading, setLoading] = useState(true);

  const loadData = async (search?: string, status?: StatusFilter) => {
    try {
      setLoading(true);
      const [messagesData, statsData] = await Promise.all([
        getWhatsAppMessages({
          search: search || undefined,
          status: status || undefined,
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
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 transition-colors duration-300">
      <DashboardHeader title="WhatsApp Messages" userRole="manager" />
      
      <main className="p-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
          <div className="group bg-white dark:bg-slate-900 rounded-[2rem] p-6 border border-slate-100 dark:border-slate-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-xl transition-all duration-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Total Messages</p>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white">{stats.total}</h3>
              </div>
              <div className="p-3 bg-blue-50 dark:bg-blue-500/10 rounded-2xl">
                <MessageSquare className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>
          
          <div className="group bg-white dark:bg-slate-900 rounded-[2rem] p-6 border border-slate-100 dark:border-slate-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-xl transition-all duration-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Successfully Sent</p>
                <h3 className="text-2xl font-black text-emerald-900 dark:text-emerald-400">{stats.sent}</h3>
              </div>
              <div className="p-3 bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl">
                <CheckCircle className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
          </div>
          
          <div className="group bg-white dark:bg-slate-900 rounded-[2rem] p-6 border border-slate-100 dark:border-slate-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-xl transition-all duration-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Failed</p>
                <h3 className="text-2xl font-black text-red-900 dark:text-red-400">{stats.failed}</h3>
              </div>
              <div className="p-3 bg-red-50 dark:bg-red-500/10 rounded-2xl">
                <XCircle className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </div>
          
          <div className="group bg-white dark:bg-slate-900 rounded-[2rem] p-6 border border-slate-100 dark:border-slate-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-xl transition-all duration-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Success Rate</p>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white">{stats.successRate}%</h3>
              </div>
              <div className="p-3 bg-purple-50 dark:bg-purple-500/10 rounded-2xl">
                <CheckCircle className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="flex flex-col xl:flex-row items-center justify-between gap-6 mb-10">
          <div className="relative flex-1 xl:w-96 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
            <input
              type="text"
              placeholder="Search messages by customer name or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm focus:ring-4 focus:ring-blue-600/5 focus:border-blue-600 transition-all text-slate-900 dark:text-white font-semibold outline-none placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex gap-4">
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                className="appearance-none flex items-center space-x-2 pl-12 pr-6 py-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all outline-none"
              >
                <option value="">All Status</option>
                <option value="sent">Sent</option>
                <option value="failed">Failed</option>
                <option value="pending">Pending</option>
              </select>
              <Filter className="h-5 w-5 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
            </div>
            <button
              onClick={handleExport}
              className="flex items-center space-x-2 px-6 py-4 bg-primary text-primary-foreground rounded-2xl font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 hover:-translate-y-0.5 transition-all active:scale-95"
            >
              <Download className="h-5 w-5" />
              <span>Export</span>
            </button>
          </div>
        </div>

        {/* Messages Table */}
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 dark:border-slate-800 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-emerald-600 border-r-transparent"></div>
              <p className="mt-4 text-sm font-semibold text-slate-400">Loading WhatsApp messages...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="p-12 text-center">
              <MessageSquare className="h-16 w-16 text-slate-400 mx-auto mb-4" />
              <p className="text-lg font-bold text-slate-900 dark:text-white mb-2">No messages found</p>
              <p className="text-sm font-semibold text-slate-400">
                {searchQuery ? 'Try a different search term' : 'No WhatsApp messages sent yet'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                    <th className="text-left py-6 px-8 text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Customer</th>
                    <th className="text-left py-6 px-8 text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Phone</th>
                    <th className="text-left py-6 px-8 text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Message</th>
                    <th className="text-left py-6 px-8 text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Amount</th>
                    <th className="text-left py-6 px-8 text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Date</th>
                    <th className="text-left py-6 px-8 text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {messages.map((message: any) => (
                    <tr key={message._id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="py-6 px-8">
                        <div className="flex items-center space-x-4">
                          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white font-black shadow-lg shadow-green-200 dark:shadow-none">
                            {message.customerName.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">{message.customerName}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5">
                              {message.customerId ? `ID: ${String(message.customerId).substring(18)}` : 'Guest'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-6 px-8">
                        <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{message.customerPhone}</p>
                      </td>
                      <td className="py-6 px-8 max-w-md">
                        <p className="text-sm font-medium text-slate-600 dark:text-slate-400 line-clamp-2">
                          {message.message}
                        </p>
                      </td>
                      <td className="py-6 px-8">
                        <p className="text-sm font-black text-slate-900 dark:text-white">
                          {message.amount ? formatCurrency(message.amount) : '-'}
                        </p>
                      </td>
                      <td className="py-6 px-8">
                        <p className="text-sm font-bold text-slate-900 dark:text-white">
                          {new Date(message.createdAt).toLocaleDateString()}
                        </p>
                        <p className="text-xs font-medium text-slate-400 dark:text-slate-500">
                          {new Date(message.createdAt).toLocaleTimeString()}
                        </p>
                      </td>
                      <td className="py-6 px-8">
                        <div className="flex items-center space-x-2">
                          {message.status === 'sent' && (
                            <>
                              <CheckCircle className="h-4 w-4 text-emerald-500" />
                              <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">Sent</span>
                            </>
                          )}
                          {message.status === 'failed' && (
                            <>
                              <XCircle className="h-4 w-4 text-red-500" />
                              <span className="text-sm font-bold text-red-600 dark:text-red-400">Failed</span>
                            </>
                          )}
                          {message.status === 'pending' && (
                            <>
                              <Clock className="h-4 w-4 text-orange-500" />
                              <span className="text-sm font-bold text-orange-600 dark:text-orange-400">Pending</span>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
