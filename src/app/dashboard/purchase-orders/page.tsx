'use client';

import { useState } from 'react';
import { DashboardHeader } from '@/components/dashboard-header';
import { ShoppingCart, Search, Plus, Truck, CheckCircle, PackagePlus } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatCurrency } from '@/lib/utils';
import { usePurchaseOrders, useApprovePurchaseOrder, type PurchaseOrder } from '@/hooks/usePurchaseOrders';
import { PurchaseOrderForm } from '@/components/dialogs/PurchaseOrderForm';
import { GoodsReceiptForm } from '@/components/dialogs/GoodsReceiptForm';
import { CardSkeleton } from '@/components/loading/CardSkeleton';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'approved': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'partially_received': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
      case 'delivered': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'cancelled': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const canReceiveGoods = (status: string) => status === 'approved' || status === 'partially_received';

  const formatStatusLabel = (status: string) => status.replace(/_/g, ' ').toUpperCase();

  return (
    <div className="min-h-screen transition-colors duration-300">
      <DashboardHeader title="Purchase Orders" userRole="admin" />
      
      <main className="py-6">
        {/* Header Actions */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search purchase orders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="partially_received">Partially Received</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <Button 
            className="bg-primary text-primary-foreground"
            onClick={handleCreateOrder}
          >
            <Plus className="h-4 w-4 mr-2" />
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
            <div className="text-center py-12">
              <ShoppingCart className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <p className="text-red-500">Failed to load purchase orders</p>
              <Button onClick={() => refetch()} className="mt-4">Retry</Button>
            </div>
          ) : (
          <div className="space-y-4">
            {purchaseOrders?.map((order, index: number) => (
            <motion.div
              key={order._id || index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <ShoppingCart className="h-4 w-4 text-primary" />
                        <span className="font-bold text-foreground">{order.orderNumber}</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${getStatusColor(order.status)}`}>
                          {formatStatusLabel(order.status)}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{order.supplierName}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Order Date</p>
                      <p className="font-medium text-sm">{order.orderDate ? new Date(order.orderDate).toLocaleDateString() : "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Expected Delivery</p>
                      <p className="font-medium text-sm">{order.expectedDelivery ? new Date(order.expectedDelivery).toLocaleDateString() : "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Items</p>
                      <p className="font-medium text-sm">{order.itemCount} products</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Total Amount</p>
                      <p className="font-bold text-sm">{formatCurrency(order.totalAmount)}</p>
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
                          className="text-green-600 hover:text-green-700"
                          onClick={() => handleApprove(order._id)}
                          disabled={approveOrder.isPending}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                      )}
                      {canReceiveGoods(order.status) && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-primary hover:text-primary"
                          onClick={() => setReceivingOrder(order)}
                        >
                          <PackagePlus className="h-4 w-4 mr-1" />
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
            </motion.div>
            ))}
          </div>
        )}

        {!isLoading && !error && (!purchaseOrders || purchaseOrders.length === 0) && (
          <div className="text-center py-12">
            <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No purchase orders found</p>
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
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Purchase Order {viewingOrder?.orderNumber}</DialogTitle>
            </DialogHeader>
            {viewingOrder && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${getStatusColor(viewingOrder.status)}`}>
                    {formatStatusLabel(viewingOrder.status)}
                  </span>
                  <span className="text-sm text-muted-foreground">{viewingOrder.supplierName}</span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Order Date</p>
                    <p className="font-medium">{viewingOrder.orderDate ? new Date(viewingOrder.orderDate).toLocaleDateString() : 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Expected Delivery</p>
                    <p className="font-medium">{viewingOrder.expectedDelivery ? new Date(viewingOrder.expectedDelivery).toLocaleDateString() : 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Created By</p>
                    <p className="font-medium">{viewingOrder.createdBy || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Total Amount</p>
                    <p className="font-bold">{formatCurrency(viewingOrder.totalAmount)}</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wide font-bold">Items</p>
                  <div className="border border-border rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-secondary/50 text-left">
                          <th className="px-4 py-2 font-semibold">Product</th>
                          <th className="px-4 py-2 font-semibold text-right">Qty</th>
                          <th className="px-4 py-2 font-semibold text-right">Unit Price</th>
                          <th className="px-4 py-2 font-semibold text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {viewingOrder.items?.map((item, idx) => (
                          <tr key={idx}>
                            <td className="px-4 py-2">{item.productName}</td>
                            <td className="px-4 py-2 text-right">{item.quantity}</td>
                            <td className="px-4 py-2 text-right">{formatCurrency(item.unitPrice)}</td>
                            <td className="px-4 py-2 text-right font-medium">{formatCurrency(item.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {viewingOrder.notes && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide font-bold">Notes</p>
                    <p className="text-sm">{viewingOrder.notes}</p>
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
