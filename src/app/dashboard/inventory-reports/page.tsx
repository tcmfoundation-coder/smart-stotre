'use client';

import { useState } from 'react';
import { DashboardHeader } from '@/components/dashboard-header';
import { Package, Search, Download, TrendingUp, AlertTriangle, Info, Loader2, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import { useCategories } from '@/hooks/useCategories';
import { useInventoryReports, useInventoryMovements, type MovementType } from '@/hooks/useInventoryReports';

const MOVEMENT_TYPE_LABELS: Record<MovementType, string> = {
  SALE: 'Sale',
  PURCHASE: 'Purchase',
  ADJUSTMENT: 'Adjustment',
  RETURN: 'Return',
  OTHER: 'Other',
};

export default function InventoryReportsPage() {
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'quarter'>('month');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [movementType, setMovementType] = useState<MovementType | 'all'>('all');
  const [movementSearch, setMovementSearch] = useState('');
  const [movementPage, setMovementPage] = useState(1);

  const { data: categories } = useCategories();
  const { data, isLoading, error, refetch } = useInventoryReports({
    dateRange,
    category: categoryFilter !== 'all' ? categoryFilter : undefined,
  });
  const { data: movementsData, isLoading: movementsLoading } = useInventoryMovements({
    dateRange,
    type: movementType !== 'all' ? movementType : undefined,
    search: movementSearch || undefined,
    page: movementPage,
    limit: 15,
  });

  const metrics = data?.metrics;
  const categoryBreakdown = data?.categoryBreakdown ?? [];

  const summaryCards = metrics
    ? [
        { id: 'total-value', name: 'Total Inventory Value (at cost)', value: formatCurrency(metrics.totalInventoryValue), icon: Package, color: 'text-green-600' },
        { id: 'low-stock', name: 'Low Stock Items', value: metrics.lowStockCount.toString(), icon: AlertTriangle, color: 'text-amber-600' },
        { id: 'out-of-stock', name: 'Out of Stock', value: metrics.outOfStockCount.toString(), icon: AlertTriangle, color: 'text-red-600' },
        {
          id: 'turnover',
          name: 'Inventory Turnover',
          value: metrics.turnoverRatio !== null ? `${metrics.turnoverRatio.toFixed(2)}x` : 'N/A',
          icon: TrendingUp,
          color: 'text-blue-600',
        },
      ]
    : [];

  const handleExport = () => {
    if (!metrics) {
      toast.info('No report data to export yet');
      return;
    }
    let csv = 'Inventory Report\n';
    csv += `Date Range,${dateRange}\n`;
    csv += `Export Date,${new Date().toLocaleString()}\n\n`;
    csv += 'Metric,Value\n';
    csv += `Total Inventory Value (at cost),${metrics.totalInventoryValue}\n`;
    csv += `Average Inventory Value (at cost),${metrics.averageInventoryValue}\n`;
    csv += `Cost of Goods Sold,${metrics.cogs}\n`;
    csv += `Inventory Turnover,${metrics.turnoverRatio !== null ? metrics.turnoverRatio.toFixed(2) : 'N/A'}\n`;
    csv += `Low Stock Items,${metrics.lowStockCount}\n`;
    csv += `Out of Stock Items,${metrics.outOfStockCount}\n\n`;
    csv += 'Category,Total Value,Avg Inventory,COGS,Turnover,Low Stock,Out of Stock\n';
    categoryBreakdown.forEach((c) => {
      csv += `${c.category},${c.totalValue},${c.averageInventoryValue},${c.cogs},${c.turnoverRatio !== null ? c.turnoverRatio.toFixed(2) : 'N/A'},${c.lowStock},${c.outOfStock}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `inventory_report_${dateRange}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Inventory report exported successfully');
  };

  return (
    <div className="min-h-screen transition-colors duration-300">
      <DashboardHeader title="Inventory Reports" userRole="manager" />

      <main className="py-6">
        {/* Filters */}
        <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-4">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as typeof dateRange)}
              className="px-4 py-2 bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="quarter">This Quarter</option>
            </select>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-2 bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">All Categories</option>
              {categories?.map((cat) => (
                <option key={cat._id} value={cat._id}>{cat.name}</option>
              ))}
            </select>
          </div>
          <Button className="bg-primary text-primary-foreground" onClick={handleExport} disabled={isLoading || !metrics}>
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="text-center py-24">
            <p className="text-red-500 mb-4">Failed to load inventory reports</p>
            <Button onClick={() => refetch()}>Retry</Button>
          </div>
        ) : (
          <>
            {/* Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {summaryCards.map((metric, index) => (
                <motion.div key={metric.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
                  <Card>
                    <CardContent className="p-6">
                      <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                        <metric.icon className={`h-5 w-5 ${metric.color}`} />
                      </div>
                      <p className="text-sm text-muted-foreground mb-1">{metric.name}</p>
                      <p className="text-2xl font-bold text-foreground">{metric.value}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            {/* Limitations / methodology note */}
            {data?.limitations && data.limitations.length > 0 && (
              <div className="mb-8 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/40 rounded-xl flex gap-3">
                <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-1.5">
                  {data.limitations.map((note, i) => (
                    <p key={i} className="text-xs text-blue-800 dark:text-blue-300">{note}</p>
                  ))}
                </div>
              </div>
            )}

            {/* Category Performance */}
            <Card className="mb-8">
              <CardContent className="p-6">
                <h3 className="text-lg font-bold text-foreground mb-4">Category Performance</h3>
                {categoryBreakdown.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No active products found for this filter</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-3 px-4 text-xs font-bold text-muted-foreground uppercase">Category</th>
                          <th className="text-left py-3 px-4 text-xs font-bold text-muted-foreground uppercase">Total Value</th>
                          <th className="text-left py-3 px-4 text-xs font-bold text-muted-foreground uppercase">COGS (Period)</th>
                          <th className="text-left py-3 px-4 text-xs font-bold text-muted-foreground uppercase">Low Stock</th>
                          <th className="text-left py-3 px-4 text-xs font-bold text-muted-foreground uppercase">Out of Stock</th>
                          <th className="text-left py-3 px-4 text-xs font-bold text-muted-foreground uppercase">Turnover</th>
                        </tr>
                      </thead>
                      <tbody>
                        {categoryBreakdown.map((category, index) => (
                          <motion.tr
                            key={category.categoryId}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="border-b border-border hover:bg-muted/50"
                          >
                            <td className="py-3 px-4 font-medium text-foreground">{category.category}</td>
                            <td className="py-3 px-4 text-foreground">{formatCurrency(category.totalValue)}</td>
                            <td className="py-3 px-4 text-foreground">{formatCurrency(category.cogs)}</td>
                            <td className="py-3 px-4">
                              <span className={category.lowStock > 0 ? 'text-amber-600 font-bold' : 'text-foreground'}>{category.lowStock}</span>
                            </td>
                            <td className="py-3 px-4">
                              <span className={category.outOfStock > 0 ? 'text-red-600 font-bold' : 'text-foreground'}>{category.outOfStock}</span>
                            </td>
                            <td className="py-3 px-4 text-foreground">{category.turnoverRatio !== null ? `${category.turnoverRatio.toFixed(2)}x` : 'N/A'}</td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Inventory Movement Feed */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
                  <h3 className="text-lg font-bold text-foreground">Inventory Movements</h3>
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Search product or SKU..."
                        value={movementSearch}
                        onChange={(e) => { setMovementSearch(e.target.value); setMovementPage(1); }}
                        className="pl-9 pr-3 py-2 bg-card border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <select
                      value={movementType}
                      onChange={(e) => { setMovementType(e.target.value as MovementType | 'all'); setMovementPage(1); }}
                      className="px-3 py-2 bg-card border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="all">All Types</option>
                      {(Object.keys(MOVEMENT_TYPE_LABELS) as MovementType[]).map((t) => (
                        <option key={t} value={t}>{MOVEMENT_TYPE_LABELS[t]}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {movementsData?.notes && movementsData.notes.length > 0 && (
                  <div className="mb-4 p-3 bg-muted/50 rounded-lg flex gap-2">
                    <Info className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-muted-foreground">{movementsData.notes[0]}</p>
                  </div>
                )}

                {movementsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : !movementsData || movementsData.movements.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">No inventory movements found for this filter</p>
                ) : (
                  <>
                    <div className="space-y-3">
                      {movementsData.movements.map((movement) => (
                        <div key={movement.id} className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg">
                          <div className="flex items-center gap-4">
                            <div
                              className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                                movement.quantityChange >= 0 ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'
                              }`}
                            >
                              {movement.quantityChange >= 0 ? (
                                <ArrowUpCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                              ) : (
                                <ArrowDownCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-foreground">{movement.productName}</p>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-primary/10 text-primary">
                                  {MOVEMENT_TYPE_LABELS[movement.type]}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground">{movement.reference} &middot; {movement.performedBy}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`font-bold ${movement.quantityChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {movement.quantityChange >= 0 ? '+' : ''}{movement.quantityChange}
                            </p>
                            <p className="text-xs text-muted-foreground">{new Date(movement.date).toLocaleString()}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    {movementsData.pagination.totalPages > 1 && (
                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                        <p className="text-xs text-muted-foreground">
                          Page {movementsData.pagination.page} of {movementsData.pagination.totalPages} ({movementsData.pagination.total} total)
                        </p>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={movementPage <= 1}
                            onClick={() => setMovementPage((p) => Math.max(1, p - 1))}
                          >
                            Previous
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={movementPage >= movementsData.pagination.totalPages}
                            onClick={() => setMovementPage((p) => p + 1)}
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}
