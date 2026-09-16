'use client';

import { useState } from 'react';
import { DashboardHeader } from '@/components/dashboard-header';
import { Percent, Search, Plus, Edit, Trash2, CheckCircle, X } from 'lucide-react';
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
import { formatCurrency } from '@/lib/utils';
import { usePromotions, useDeletePromotion, usePausePromotion, useResumePromotion } from '@/hooks/usePromotions';
import { CardSkeleton } from '@/components/loading/CardSkeleton';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { useRouter } from 'next/navigation';

const STATUS_BADGE: Record<string, 'success' | 'info' | 'destructive' | 'warning' | 'secondary'> = {
  active: 'success',
  scheduled: 'info',
  expired: 'destructive',
  paused: 'warning',
};

export default function PromotionsPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: promotions, isLoading, error, refetch } = usePromotions({ search: searchQuery, status: statusFilter });
  const deletePromotion = useDeletePromotion();
  const pausePromotion = usePausePromotion();
  const resumePromotion = useResumePromotion();

  const handleCreatePromotion = () => {
    router.push('/dashboard/promotions/new');
  };

  const handleEditPromotion = (id: string) => {
    router.push(`/dashboard/promotions/${id}`);
  };

  const getTypeLabel = (type: string, value: number) => {
    switch (type) {
      case 'percentage': return `${value}% Off`;
      case 'fixed': return `${formatCurrency(value)} Off`;
      case 'buy-one-get-one': return `Buy 1 Get 1 (${value}% off 2nd)`;
      default: return type;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader title="Discounts & Promotions" userRole="admin" />

      <main className="p-6 lg:p-8">
        {/* Header Actions */}
        <div className="mb-6 flex flex-col items-stretch justify-between gap-4 xl:flex-row xl:items-center">
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center xl:w-auto">
            <div className="relative sm:w-64 xl:w-96">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search promotions..."
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
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button className="w-full gap-2 xl:w-auto" onClick={handleCreatePromotion}>
            <Plus className="h-4 w-4" />
            Create Promotion
          </Button>
        </div>

        <ErrorBoundary>
          {isLoading ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <CardSkeleton key={i} />
              ))}
            </div>
          ) : error ? (
            <ErrorState description="Failed to load promotions" onRetry={() => refetch()} />
          ) : !promotions || promotions.length === 0 ? (
            <EmptyState
              icon={Percent}
              title="No promotions found"
              description={searchQuery ? 'Try a different search term' : 'Create your first promotion to get started'}
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {promotions.map((promo) => {
                const status = promo.effectiveStatus;
                const applicable = [...(promo.categories || []), ...(promo.products || [])];
                return (
                  <Card key={promo._id}>
                    <CardContent className="p-6">
                      <div className="mb-4 flex items-start justify-between">
                        <div className="flex-1">
                          <div className="mb-2 flex items-center gap-2">
                            <Percent className="h-4 w-4 text-primary" />
                            <span className="font-semibold text-foreground">{promo.name}</span>
                          </div>
                          <p className="text-sm text-muted-foreground">{promo.description}</p>
                        </div>
                        <Badge variant={STATUS_BADGE[status] ?? 'secondary'} className="capitalize">
                          {status}
                        </Badge>
                      </div>

                      <div className="mb-4 space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Type</span>
                          <span className="font-medium text-foreground">{getTypeLabel(promo.type, promo.value)}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Period</span>
                          <span className="font-medium text-foreground">
                            {new Date(promo.startDate).toLocaleDateString()} -{' '}
                            {promo.endDate ? new Date(promo.endDate).toLocaleDateString() : 'N/A'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Applies to</span>
                          <span className="font-medium text-foreground">{applicable.length ? applicable.join(', ') : 'All Products'}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Usage</span>
                          <span className="font-medium text-foreground">{promo.usageCount || 0} times</span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1" onClick={() => handleEditPromotion(promo._id)}>
                          <Edit className="mr-1 h-4 w-4" />
                          Edit
                        </Button>
                        {status === 'active' ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-warning hover:text-warning"
                            onClick={() => pausePromotion.mutate(promo._id)}
                            disabled={pausePromotion.isPending}
                          >
                            Pause
                          </Button>
                        ) : status === 'paused' ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-success hover:text-success"
                            onClick={() => resumePromotion.mutate(promo._id)}
                            disabled={resumePromotion.isPending}
                          >
                            <CheckCircle className="mr-1 h-4 w-4" />
                            Resume
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="icon"
                            className="text-muted-foreground hover:text-destructive"
                            onClick={() => {
                              if (confirm('Are you sure you want to delete this promotion?')) {
                                deletePromotion.mutate(promo._id);
                              }
                            }}
                            disabled={deletePromotion.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </ErrorBoundary>
      </main>
    </div>
  );
}
