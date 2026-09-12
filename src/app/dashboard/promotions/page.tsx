'use client';

import { useState } from 'react';
import { DashboardHeader } from '@/components/dashboard-header';
import { Percent, Search, Plus, Edit, Trash2, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { usePromotions, useDeletePromotion, usePausePromotion, useResumePromotion } from '@/hooks/usePromotions';
import { CardSkeleton } from '@/components/loading/CardSkeleton';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { useRouter } from 'next/navigation';

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'scheduled': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'expired': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'paused': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      default: return 'bg-secondary text-secondary-foreground';
    }
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
    <div className="min-h-screen transition-colors duration-300">
      <DashboardHeader title="Discounts & Promotions" userRole="admin" />
      
      <main className="py-6">
        {/* Header Actions */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search promotions..."
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
              <option value="active">Active</option>
              <option value="scheduled">Scheduled</option>
              <option value="expired">Expired</option>
              <option value="paused">Paused</option>
            </select>
          </div>
          <Button 
            className="bg-primary text-primary-foreground"
            onClick={handleCreatePromotion}
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Promotion
          </Button>
        </div>

        <ErrorBoundary>
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <CardSkeleton key={i} />
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <Percent className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <p className="text-red-500">Failed to load promotions</p>
              <Button onClick={() => refetch()} className="mt-4">Retry</Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {promotions?.map((promo, index: number) => {
                const status = promo.effectiveStatus;
                const applicable = [...(promo.categories || []), ...(promo.products || [])];
                return (
            <motion.div
              key={promo._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Percent className="h-4 w-4 text-primary" />
                        <span className="font-bold text-foreground">{promo.name}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{promo.description}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${getStatusColor(status)}`}>
                      {status.toUpperCase()}
                    </span>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Type</span>
                      <span className="font-medium text-foreground">{getTypeLabel(promo.type, promo.value)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Period</span>
                      <span className="font-medium text-foreground">
                        {new Date(promo.startDate).toLocaleDateString()} - {
                          promo.endDate ? new Date(promo.endDate).toLocaleDateString() : "N/A"
                        }
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
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleEditPromotion(promo._id)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    {status === 'active' ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-yellow-600 hover:text-yellow-700"
                        onClick={() => pausePromotion.mutate(promo._id)}
                        disabled={pausePromotion.isPending}
                      >
                        Pause
                      </Button>
                    ) : status === 'paused' ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-green-600 hover:text-green-700"
                        onClick={() => resumePromotion.mutate(promo._id)}
                        disabled={resumePromotion.isPending}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Resume
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
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
            </motion.div>
                );
              })}
          </div>
        )}

        {!isLoading && !error && (!promotions || promotions.length === 0) && (
          <div className="text-center py-12">
            <Percent className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No promotions found matching your search</p>
          </div>
        )}
        </ErrorBoundary>
      </main>
    </div>
  );
}
