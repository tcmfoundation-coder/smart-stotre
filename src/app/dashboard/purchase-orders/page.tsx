'use client';

import { useState } from 'react';
import { DashboardHeader } from '@/components/dashboard-header';
import { ShoppingCart, Search, Plus, Truck, CheckCircle, PackagePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
import { formatCurrency } from '@/lib/utils';
import { usePurchaseOrders, useApprovePurchaseOrder, type PurchaseOrder } from '@/hooks/usePurchaseOrders';
import { PurchaseOrderForm } from '@/components/dialogs/PurchaseOrderForm';
import { GoodsReceiptForm } from '@/components/dialogs/GoodsReceiptForm';
import { CardSkeleton } from '@/components/loading/CardSkeleton';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { ErrorState } from '@/components/ui/error-state';
import { EmptyState } from '@/components/ui/empty-state';

const STATUS_VARIANT: Record<string, BadgeProps['variant']> = {
  pending: 'warning',
  approved: 'info',
  partially_received: 'default',
  delivered: 'success',
  cancelled: 'destructive',
};

export default function PurchaseOrdersPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [viewingOrder, setViewingOrder] = useState<PurchaseOrder | null>(null);
  const [receivingOrder, setReceivingOrder] = useState<PurchaseOrder | null>(null);

  const { data: purchaseOrders, isLoading, error, refetch } = usePurchaseOrders({
    search: searchQuery,
    status: statusFilter !== 'all' ? statusFilter : undefined,
  });
  const approveOrder = useApprovePurchaseOrder();

  const handleCreateOrder = () => {
    setIsFormOpen(true);
  };

  const handleApprove = (id: string) => {
    if (confirm('Are you sure you want to approve this order?')) {
      approveOrder.mutate(id);
    }
  };

  const canReceiveGoods = (status: string) => status === 'approved' || status === 'partially_received';

  const formatStatusLabel = (status: string) => status.replace(/_/g, ' ');

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader title="Purchase Orders" userRole="admin" />

      <main className="p-6 lg:p-8">
        {/* Header Actions */}
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="flex flex-1 items-center gap-3">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search purchase orders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-52">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="partially_received">Partially Received</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleCreateOrder} className="gap-2">
            <Plus className="h-4 w-4" />
            New Purchase Order
          </Button>
        </div>

        <ErrorBoundary>
          {isLoading ? (
            <div className="grid grid-cols-1 gap-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <CardSkeleton key={i} />
              ))}
            </div>
          ) : error ? (
            <ErrorState icon={ShoppingCart} description="Failed to load purchase orders" onRetry={() => refetch()} />
          ) : !purchaseOrders || purchaseOrders.length === 0 ? (
            <EmptyState icon={ShoppingCart} title="No purchase orders found" />
          ) : (
            <div className="space-y-4">
              {purchaseOrders.map((order, index: number) => (
                <Card key={order._id || index}>
                  <CardContent className="p-6">
                    <div className="mb-4 flex items-start justify-between">
                      <div className="flex-1">
                        <div className="mb-2 flex items-center gap-2">
                          <ShoppingCart className="h-4 w-4 text-primary" />
                          <span className="font-semibold text-foreground">{order.orderNumber}</span>
                          <Badge variant={STATUS_VARIANT[order.status] || 'secondary'} className="capitalize">
                            {formatStatusLabel(order.status)}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{order.supplierName}</p>
                      </div>
                    </div>

                    <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-4">
                      <div>
                        <p className="mb-1 text-xs text-muted-foreground">Order Date</p>
                        <p className="text-sm font-medium text-foreground">{order.orderDate ? new Date(order.orderDate).toLocaleDateString() : 'N/A'}</p>
                      </div>
                      <div>
                        <p className="mb-1 text-xs text-muted-foreground">Expected Delivery</p>
                        <p className="text-sm font-medium text-foreground">{order.expectedDelivery ? new Date(order.expectedDelivery).toLocaleDateString() : 'N/A'}</p>
                      </div>
                      <div>
                        <p className="mb-1 text-xs text-muted-foreground">Items</p>
                        <p className="text-sm font-medium text-foreground">{order.itemCount} products</p>
                      </div>
                      <div>
                        <p className="mb-1 text-xs text-muted-foreground">Total Amount</p>
                        <p className="text-sm font-semibold text-foreground">{formatCurrency(order.totalAmount)}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => setViewingOrder(order)}>
                          View Details
                        </Button>
                        {order.status === 'pending' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleApprove(order._id)}
                            disabled={approveOrder.isPending}
                            className="gap-1 text-success hover:text-success"
                          >
                            <CheckCircle className="h-4 w-4" />
                            Approve
                          </Button>
                        )}
                        {canReceiveGoods(order.status) && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setReceivingOrder(order)}
                            className="gap-1"
                          >
                            <PackagePlus className="h-4 w-4" />
                            Receive Goods
                          </Button>
                        )}
                      </div>
                      {canReceiveGoods(order.status) && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Truck className="h-4 w-4" />
                          <span>{order.status === 'partially_received' ? 'Partially received' : 'In transit'}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </ErrorBoundary>

        <PurchaseOrderForm
          open={isFormOpen}
          onOpenChange={setIsFormOpen}
          onSuccess={() => refetch()}
        />

        <GoodsReceiptForm
          key={receivingOrder?._id || 'closed'}
          open={!!receivingOrder}
          onOpenChange={(open) => !open && setReceivingOrder(null)}
          purchaseOrder={
            receivingOrder
              ? { _id: receivingOrder._id, orderNumber: receivingOrder.orderNumber, supplierName: receivingOrder.supplierName }
              : null
          }
          onSuccess={() => refetch()}
        />

        <Dialog open={!!viewingOrder} onOpenChange={(open) => !open && setViewingOrder(null)}>
          <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Purchase Order {viewingOrder?.orderNumber}</DialogTitle>
            </DialogHeader>
            {viewingOrder && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Badge variant={STATUS_VARIANT[viewingOrder.status] || 'secondary'} className="capitalize">
                    {formatStatusLabel(viewingOrder.status)}
                  </Badge>
                  <span className="text-sm text-muted-foreground">{viewingOrder.supplierName}</span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="mb-1 text-xs text-muted-foreground">Order Date</p>
                    <p className="font-medium text-foreground">{viewingOrder.orderDate ? new Date(viewingOrder.orderDate).toLocaleDateString() : 'N/A'}</p>
                  </div>
                  <div>
                    <p className="mb-1 text-xs text-muted-foreground">Expected Delivery</p>
                    <p className="font-medium text-foreground">{viewingOrder.expectedDelivery ? new Date(viewingOrder.expectedDelivery).toLocaleDateString() : 'N/A'}</p>
                  </div>
                  <div>
                    <p className="mb-1 text-xs text-muted-foreground">Created By</p>
                    <p className="font-medium text-foreground">{viewingOrder.createdBy || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="mb-1 text-xs text-muted-foreground">Total Amount</p>
                    <p className="font-semibold text-foreground">{formatCurrency(viewingOrder.totalAmount)}</p>
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Items</p>
                  <div className="rounded-lg border border-border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead className="text-right">Qty</TableHead>
                          <TableHead className="text-right">Unit Price</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {viewingOrder.items?.map((item, idx) => (
                          <TableRow key={idx}>
                            <TableCell>{item.productName}</TableCell>
                            <TableCell className="text-right">{item.quantity}</TableCell>
                            <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                            <TableCell className="text-right font-medium">{formatCurrency(item.total)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {viewingOrder.notes && (
                  <div>
                    <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Notes</p>
                    <p className="text-sm text-foreground">{viewingOrder.notes}</p>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
