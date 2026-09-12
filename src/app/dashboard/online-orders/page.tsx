'use client';

import { DashboardHeader } from '@/components/dashboard-header';
import { getOrders, updateOrderStatus } from '@/lib/actions/orders';
import { ShoppingBag, Truck, CheckCircle2, Clock, XCircle, MoreVertical, Search, Filter, X } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';

const ORDER_STATUSES = ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'] as const;

export default function OnlineOrdersPage() {
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
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  useEffect(() => {
    (async () => {
      await loadOrders();
    })();
  }, []);

  async function loadOrders(search?: string) {
    try {
      setLoading(true);
      setError(false);
      const data = await getOrders('online', search ? { search } : undefined);
      setOrders(data);
    } catch (err) {
      console.error('Error loading orders:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }

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
    <div className="min-h-screen bg-background transition-colors duration-300">
      <DashboardHeader title="Digital Fulfilment" userRole="manager" />
      
      <main className="p-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          <div className="group bg-card p-8 rounded-[2rem] border border-border shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-xl transition-all duration-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-black text-muted-foreground uppercase tracking-widest mb-1">Incoming</p>
                <h3 className="text-3xl font-black text-foreground mt-1">
                  {orders.filter((o: any) => o.orderStatus === 'pending').length}
                </h3>
              </div>
              <div className="p-4 bg-amber-50 dark:bg-amber-500/10 rounded-2xl">
                <Clock className="h-8 w-8 text-amber-500" />
              </div>
            </div>
          </div>
          <div className="group bg-card p-8 rounded-[2rem] border border-border shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-xl transition-all duration-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-black text-muted-foreground uppercase tracking-widest mb-1">Processing</p>
                <h3 className="text-3xl font-black text-foreground mt-1">
                  {orders.filter((o: any) => ['confirmed', 'preparing'].includes(o.orderStatus)).length}
                </h3>
              </div>
              <div className="p-4 bg-blue-50 dark:bg-blue-500/10 rounded-2xl">
                <CheckCircle2 className="h-8 w-8 text-blue-500" />
              </div>
            </div>
          </div>
          <div className="group bg-card p-8 rounded-[2rem] border border-border shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-xl transition-all duration-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-black text-muted-foreground uppercase tracking-widest mb-1">In Transit</p>
                <h3 className="text-3xl font-black text-foreground mt-1">
                  {orders.filter((o: any) => o.orderStatus === 'ready').length}
                </h3>
              </div>
              <div className="p-4 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl">
                <Truck className="h-8 w-8 text-indigo-500" />
              </div>
            </div>
          </div>
          <div className="group bg-card p-8 rounded-[2rem] border border-border shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-xl transition-all duration-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-black text-muted-foreground uppercase tracking-widest mb-1">Gross Queue</p>
                <h3 className="text-3xl font-black text-foreground mt-1">{orders.length}</h3>
              </div>
              <div className="p-4 bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl">
                <ShoppingBag className="h-8 w-8 text-emerald-500" />
              </div>
            </div>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="flex flex-col xl:flex-row items-center justify-between gap-6 mb-10">
          <div className="flex items-center space-x-4 w-full xl:w-auto">
            <div className="relative flex-1 xl:w-96 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
              <input
                type="text"
                placeholder="Search by order ID or customer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-card border border-border rounded-2xl shadow-sm focus:ring-4 focus:ring-blue-600/5 focus:border-blue-600 transition-all text-foreground font-semibold outline-none placeholder:text-muted-foreground"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="appearance-none flex items-center space-x-2 pl-12 pr-6 py-4 bg-card border border-border rounded-2xl text-muted-foreground font-bold hover:bg-muted transition-all shadow-sm outline-none"
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

        <div className="bg-card rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-border overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
              <p className="mt-4 text-sm font-semibold text-slate-400">Loading orders...</p>
            </div>
          ) : error ? (
            <div className="p-12 text-center">
              <ShoppingBag className="h-16 w-16 text-red-400 mx-auto mb-4" />
              <p className="text-lg font-bold text-foreground mb-2">Failed to load orders</p>
              <button
                onClick={() => loadOrders(searchQuery || undefined)}
                className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold"
              >
                Retry
              </button>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="p-12 text-center">
              <ShoppingBag className="h-16 w-16 text-slate-400 mx-auto mb-4" />
              <p className="text-lg font-bold text-foreground mb-2">No orders found</p>
              <p className="text-sm font-semibold text-slate-400">
                {searchQuery || statusFilter ? 'Try a different search or filter' : 'No orders in the queue yet'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-muted/50 border-b border-border">
                    <th className="text-left py-6 px-8 text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em]">Order Identifier</th>
                    <th className="text-left py-6 px-8 text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em]">Customer Entity</th>
                    <th className="text-left py-6 px-8 text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em]">Logistic Mode</th>
                    <th className="text-left py-6 px-8 text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em]">Net Value</th>
                    <th className="text-left py-6 px-8 text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em]">Payment Status</th>
                    <th className="text-left py-6 px-8 text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em]">Flow State</th>
                    <th className="text-right py-6 px-8 text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredOrders.map((order: any) => (
                  <tr key={order._id} className="group hover:bg-muted/50 transition-colors">
                    <td className="py-6 px-8">
                      <span className="text-sm font-black text-foreground group-hover:text-blue-600 transition-colors">#{order.orderNumber}</span>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mt-1">{formatDate(order.createdAt)}</p>
                    </td>
                    <td className="py-6 px-8">
                      <div>
                        <p className="font-bold text-foreground">{order.customerName}</p>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight mt-0.5">{order.customerPhone}</p>
                      </div>
                    </td>
                    <td className="py-6 px-8">
                      <span className="px-3 py-1 bg-muted text-muted-foreground rounded-lg text-[10px] font-black uppercase tracking-widest border border-border">
                        {order.deliveryMethod}
                      </span>
                    </td>
                    <td className="py-6 px-8 text-sm font-black text-foreground">
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
                        className="p-3 hover:bg-muted rounded-xl transition-all text-slate-400 disabled:opacity-50"
                      >
                        <MoreVertical className="h-5 w-5" />
                      </button>
                      {openMenuId === order._id && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />
                          <div className="absolute right-8 top-16 z-20 w-48 bg-card border border-border rounded-2xl shadow-xl py-2 text-left">
                            {ORDER_STATUSES.filter((s) => s !== order.orderStatus).map((s) => (
                              <button
                                key={s}
                                onClick={() => handleStatusChange(order._id, s)}
                                className={cn(
                                  'w-full text-left px-4 py-2 text-sm font-semibold capitalize hover:bg-muted transition-colors',
                                  s === 'cancelled' ? 'text-rose-600' : 'text-foreground/80'
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
