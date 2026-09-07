'use client';

import { DashboardHeader } from '@/components/dashboard-header';
import { getOrders, updateOrderStatus } from '@/lib/actions/orders';
import { MessageSquare, ShoppingBag, MoreVertical, Search, Filter, X } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';

const ORDER_STATUSES = ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'] as const;

export default function WhatsAppOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-500/20';
      case 'confirmed': return 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-500/20';
      case 'preparing': return 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-500/20';
      case 'ready': return 'bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-100 dark:border-purple-500/20';
      case 'delivered': return 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/20';
      case 'cancelled': return 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-500/20';
      default: return 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-100 dark:border-slate-800';
    }
  };

  useEffect(() => {
    (async () => {
      await loadOrders();
    })();
  }, []);

  const loadOrders = async (search?: string) => {
    try {
      setLoading(true);
      setError(false);
      const data = await getOrders('whatsapp', search ? { search } : undefined);
      setOrders(data);
    } catch (err) {
      console.error('Error loading orders:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.length > 0) {
        loadOrders(searchQuery);
      } else if (searchQuery.length === 0) {
        loadOrders();
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const filteredOrders = statusFilter
    ? orders.filter((o) => o.orderStatus === statusFilter)
    : orders;

  const handleStatusChange = async (orderId: string, status: string) => {
    setUpdatingId(orderId);
    setOpenMenuId(null);
    try {
      await updateOrderStatus(orderId, status);
      setOrders((prev) => prev.map((o) => (o._id === orderId ? { ...o, orderStatus: status } : o)));
      toast.success(`Order marked as ${status}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update order status');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 transition-colors duration-300">
      <DashboardHeader title="Social Commerce" userRole="manager" />
      
      <main className="p-8">
        <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 rounded-[2rem] p-8 mb-10 flex items-center space-x-6 shadow-sm">
          <div className="h-16 w-16 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-200 dark:shadow-none">
            <MessageSquare className="h-8 w-8" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">WhatsApp Protocol</h2>
            <p className="text-emerald-700 dark:text-emerald-400 font-medium mt-1">Orders initiated via secure mobile messaging API. Synchronized in real-time.</p>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="flex flex-col xl:flex-row items-center justify-between gap-6 mb-10">
          <div className="flex items-center space-x-4 w-full xl:w-auto">
            <div className="relative flex-1 xl:w-96 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
              <input
                type="text"
                placeholder="Search WhatsApp queue..."
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
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="appearance-none flex items-center space-x-2 pl-12 pr-6 py-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm outline-none"
              >
                <option value="">All Status</option>
                {ORDER_STATUSES.map((s) => (
                  <option key={s} value={s} className="capitalize">{s}</option>
                ))}
              </select>
              <Filter className="h-5 w-5 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 dark:border-slate-800 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-emerald-600 border-r-transparent"></div>
              <p className="mt-4 text-sm font-semibold text-slate-400">Loading WhatsApp orders...</p>
            </div>
          ) : error ? (
            <div className="p-12 text-center">
              <MessageSquare className="h-16 w-16 text-red-400 mx-auto mb-4" />
              <p className="text-lg font-bold text-slate-900 dark:text-white mb-2">Failed to load WhatsApp orders</p>
              <button
                onClick={() => loadOrders(searchQuery || undefined)}
                className="mt-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold"
              >
                Retry
              </button>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="p-12 text-center">
              <MessageSquare className="h-16 w-16 text-slate-400 mx-auto mb-4" />
              <p className="text-lg font-bold text-slate-900 dark:text-white mb-2">No WhatsApp orders found</p>
              <p className="text-sm font-semibold text-slate-400">
                {searchQuery || statusFilter ? 'Try a different search or filter' : 'No orders in the WhatsApp queue yet'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                    <th className="text-left py-6 px-8 text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Transaction ID</th>
                    <th className="text-left py-6 px-8 text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Sender Profile</th>
                    <th className="text-left py-6 px-8 text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Procurement</th>
                    <th className="text-left py-6 px-8 text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Net Value</th>
                    <th className="text-left py-6 px-8 text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Payment</th>
                    <th className="text-left py-6 px-8 text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Status</th>
                    <th className="text-right py-6 px-8 text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredOrders.map((order: any) => (
                  <tr key={order._id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="py-6 px-8">
                      <span className="text-sm font-black text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">#{order.orderNumber}</span>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mt-1">{formatDate(order.createdAt)}</p>
                    </td>
                    <td className="py-6 px-8">
                      <div className="flex items-center space-x-3">
                        <div className="h-8 w-8 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-[10px] font-black text-emerald-600">
                          {order.customerName.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white">{order.customerName}</p>
                          <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tight mt-0.5">{order.customerPhone}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-6 px-8">
                      <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg text-[10px] font-black uppercase tracking-widest border border-slate-200 dark:border-slate-700">
                        {order.deliveryMethod}
                      </span>
                    </td>
                    <td className="py-6 px-8 text-sm font-black text-slate-900 dark:text-white">
                      {formatCurrency(order.total)}
                    </td>
                    <td className="py-6 px-8">
                      <span className={cn(
                        "inline-flex px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border",
                        order.paymentStatus === 'paid' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/20' : 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-500/20'
                      )}>
                        {order.paymentStatus}
                      </span>
                    </td>
                    <td className="py-6 px-8">
                      <span className={cn(
                        "inline-flex px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border",
                        getStatusStyles(order.orderStatus)
                      )}>
                        {order.orderStatus}
                      </span>
                    </td>
                    <td className="py-6 px-8 text-right relative">
                      <button
                        onClick={() => setOpenMenuId(openMenuId === order._id ? null : order._id)}
                        disabled={updatingId === order._id}
                        className="p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all text-slate-400 disabled:opacity-50"
                      >
                        <MoreVertical className="h-5 w-5" />
                      </button>
                      {openMenuId === order._id && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />
                          <div className="absolute right-8 top-16 z-20 w-48 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-xl py-2 text-left">
                            {ORDER_STATUSES.filter((s) => s !== order.orderStatus).map((s) => (
                              <button
                                key={s}
                                onClick={() => handleStatusChange(order._id, s)}
                                className={cn(
                                  'w-full text-left px-4 py-2 text-sm font-semibold capitalize hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors',
                                  s === 'cancelled' ? 'text-rose-600' : 'text-slate-700 dark:text-slate-300'
                                )}
                              >
                                Mark as {s}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
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
