'use client';

import { useState } from 'react';
import { DashboardHeader } from '@/components/dashboard-header';
import { ArrowUpDown, Search, Plus, User, Calendar, CheckCircle, XCircle, X } from 'lucide-react';
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
import { useStockAdjustments, useApproveStockAdjustment, useRejectStockAdjustment } from '@/hooks/useStockAdjustments';
import { StockAdjustmentForm } from '@/components/dialogs/StockAdjustmentForm';
import { CardSkeleton } from '@/components/loading/CardSkeleton';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';

const STATUS_BADGE: Record<string, 'success' | 'warning' | 'destructive'> = {
  approved: 'success',
  pending: 'warning',
  rejected: 'destructive',
};

export default function StockAdjustmentsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isFormOpen, setIsFormOpen] = useState(false);

  const { data: adjustments, isLoading, error, refetch } = useStockAdjustments({
    search: searchQuery,
    status: statusFilter !== 'all' ? statusFilter : undefined,
  });
  const approveAdjustment = useApproveStockAdjustment();
  const rejectAdjustment = useRejectStockAdjustment();

  const handleApprove = (id: string) => {
    if (confirm('Are you sure you want to approve this adjustment?')) {
      approveAdjustment.mutate(id);
    }
  };

  const handleReject = (id: string) => {
    if (confirm('Are you sure you want to reject this adjustment?')) {
      rejectAdjustment.mutate(id);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader title="Stock Adjustments" userRole="admin" />

      <main className="p-6 lg:p-8">
        {/* Header Actions */}
        <div className="mb-6 flex flex-col items-stretch justify-between gap-4 xl:flex-row xl:items-center">
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center xl:w-auto">
            <div className="relative sm:w-64 xl:w-96">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search adjustments..."
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
              <SelectTrigger className="h-11 sm:w-44">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button className="w-full gap-2 xl:w-auto" onClick={() => setIsFormOpen(true)}>
            <Plus className="h-4 w-4" />
            New Adjustment
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
            <ErrorState description="Failed to load adjustments" onRetry={() => refetch()} />
          ) : !adjustments || adjustments.length === 0 ? (
            <EmptyState icon={ArrowUpDown} title="No stock adjustments found" description="Create your first adjustment to get started" />
          ) : (
            <div className="space-y-4">
              {adjustments.map((adjustment: any, index: number) => (
                <Card key={adjustment._id || adjustment.id || index}>
                  <CardContent className="p-6">
                    <div className="mb-4 flex items-start justify-between">
                      <div className="flex-1">
                        <div className="mb-2 flex items-center gap-2">
                          <ArrowUpDown className="h-4 w-4 text-primary" />
                          <span className="font-semibold text-foreground">{adjustment._id}</span>
                          <Badge variant={STATUS_BADGE[adjustment.status] ?? 'secondary'} className="capitalize">
                            {adjustment.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{adjustment.productName}</p>
                      </div>
                    </div>

                    <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-4">
                      <div>
                        <p className="mb-1 text-xs text-muted-foreground">Type</p>
                        <p className={`text-sm font-medium ${adjustment.adjustmentType === 'increase' ? 'text-success' : 'text-destructive'}`}>
                          {adjustment.adjustmentType === 'increase' ? 'Increase' : 'Decrease'}
                        </p>
                      </div>
                      <div>
                        <p className="mb-1 text-xs text-muted-foreground">Quantity</p>
                        <p className="text-sm font-medium text-foreground">
                          {adjustment.adjustmentType === 'increase' ? '+' : '-'}
                          {adjustment.quantity}
                        </p>
                      </div>
                      <div>
                        <p className="mb-1 text-xs text-muted-foreground">Stock Change</p>
                        <p className="text-sm font-medium text-foreground">{adjustment.previousStock} → {adjustment.newStock}</p>
                      </div>
                      <div>
                        <p className="mb-1 text-xs text-muted-foreground">Reason</p>
                        <p className="text-sm font-medium text-foreground">{adjustment.reason}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <User className="h-3 w-3" />
                          <span>{adjustment.performedBy}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3 w-3" />
                          <span>{adjustment.date ? new Date(adjustment.date).toLocaleString() : 'N/A'}</span>
                        </div>
                      </div>
                      {adjustment.status === 'pending' && (
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-success hover:text-success"
                            onClick={() => handleApprove(adjustment._id)}
                            disabled={approveAdjustment.isPending}
                          >
                            <CheckCircle className="mr-1 h-4 w-4" />
                            Approve
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleReject(adjustment._id)}
                            disabled={rejectAdjustment.isPending}
                          >
                            <XCircle className="mr-1 h-4 w-4" />
                            Reject
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </ErrorBoundary>

        <StockAdjustmentForm
          open={isFormOpen}
          onOpenChange={setIsFormOpen}
          onSuccess={() => refetch()}
        />
      </main>
    </div>
  );
}
