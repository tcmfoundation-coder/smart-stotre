'use client';

import { DashboardHeader } from '@/components/dashboard-header';
import { getOrders, updateOrderStatus } from '@/lib/actions/orders';
import { ShoppingBag, Truck, CheckCircle2, Clock, MoreVertical, Search, X } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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

const ORDER_STATUSES = ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'] as const;

const STATUS_VARIANT: Record<string, BadgeProps['variant']> = {
  pending: 'warning',
  confirmed: 'info',
  preparing: 'secondary',
  ready: 'default',
  delivered: 'success',
  cancelled: 'destructive',
};

export default function OnlineOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

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

  const filteredOrders = statusFilter !== 'all'
    ? orders.filter((o) => o.orderStatus === statusFilter)
    : orders;

  const handleStatusChange = async (orderId: string, status: string) => {
    setUpdatingId(orderId);
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
    <div className="min-h-screen bg-background">
      <DashboardHeader title="Digital Fulfilment" userRole="manager" />

      <main className="p-6 lg:p-8">
        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-4">
          <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Incoming</p>
                <h3 className="text-3xl font-semibold text-foreground">
                  {orders.filter((o: any) => o.orderStatus === 'pending').length}
                </h3>
              </div>
              <div className="rounded-md bg-warning/10 p-3 text-warning">
                <Clock className="h-5 w-5" />
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Processing</p>
                <h3 className="text-3xl font-semibold text-foreground">
                  {orders.filter((o: any) => ['confirmed', 'preparing'].includes(o.orderStatus)).length}
                </h3>
              </div>
              <div className="rounded-md bg-info/10 p-3 text-info">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">In Transit</p>
                <h3 className="text-3xl font-semibold text-foreground">
                  {orders.filter((o: any) => o.orderStatus === 'ready').length}
                </h3>
              </div>
              <div className="rounded-md bg-primary/10 p-3 text-primary">
                <Truck className="h-5 w-5" />
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Total Orders</p>
                <h3 className="text-3xl font-semibold text-foreground">{orders.length}</h3>
              </div>
              <div className="rounded-md bg-success/10 p-3 text-success">
                <ShoppingBag className="h-5 w-5" />
              </div>
            </div>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="mb-6 flex flex-col items-center justify-between gap-4 xl:flex-row">
          <div className="flex w-full items-center gap-3 xl:w-auto">
            <div className="relative flex-1 xl:w-96">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by order ID or customer..."
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
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-11 w-40">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {ORDER_STATUSES.map((s) => (
                  <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card shadow-sm">
          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent" />
              <p className="mt-4 text-sm text-muted-foreground">Loading orders...</p>
            </div>
          ) : error ? (
            <ErrorState icon={ShoppingBag} description="Failed to load orders" onRetry={() => loadOrders(searchQuery || undefined)} />
          ) : filteredOrders.length === 0 ? (
            <EmptyState
              icon={ShoppingBag}
              title="No orders found"
              description={searchQuery || statusFilter !== 'all' ? 'Try a different search or filter' : 'No orders in the queue yet'}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Delivery</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order: any) => (
                  <TableRow key={order._id}>
                    <TableCell>
                      <span className="font-medium text-foreground">#{order.orderNumber}</span>
                      <p className="mt-0.5 text-xs text-muted-foreground">{formatDate(order.createdAt)}</p>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium text-foreground">{order.customerName}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{order.customerPhone}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize">{order.deliveryMethod}</Badge>
                    </TableCell>
                    <TableCell className="font-medium text-foreground">{formatCurrency(order.total)}</TableCell>
                    <TableCell>
                      <Badge variant={order.paymentStatus === 'paid' ? 'success' : 'warning'} className="capitalize">
                        {order.paymentStatus}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[order.orderStatus] || 'secondary'} className="capitalize">
                        {order.orderStatus}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" disabled={updatingId === order._id} className="text-muted-foreground">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {ORDER_STATUSES.filter((s) => s !== order.orderStatus).map((s) => (
                            <DropdownMenuItem key={s} onClick={() => handleStatusChange(order._id, s)} destructive={s === 'cancelled'}>
                              Mark as {s}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
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
