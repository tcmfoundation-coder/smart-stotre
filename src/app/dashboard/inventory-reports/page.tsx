'use client';

import { useState } from 'react';
import { DashboardHeader } from '@/components/dashboard-header';
import { Package, Search, Download, TrendingUp, AlertTriangle, Info, Loader2, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ErrorState } from '@/components/ui/error-state';
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
  const { data: movementsData, isLoading: movementsLoading, error: movementsError, refetch: refetchMovements } = useInventoryMovements({
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
        { id: 'total-value', name: 'Total Inventory Value (at cost)', value: formatCurrency(metrics.totalInventoryValue), icon: Package, variant: 'success' as const },
        { id: 'low-stock', name: 'Low Stock Items', value: metrics.lowStockCount.toString(), icon: AlertTriangle, variant: 'warning' as const },
        { id: 'out-of-stock', name: 'Out of Stock', value: metrics.outOfStockCount.toString(), icon: AlertTriangle, variant: 'destructive' as const },
        {
          id: 'turnover',
          name: 'Inventory Turnover',
          value: metrics.turnoverRatio !== null ? `${metrics.turnoverRatio.toFixed(2)}x` : 'N/A',
          icon: TrendingUp,
          variant: 'primary' as const,
        },
      ]
    : [];

  const VARIANT_STYLES: Record<string, string> = {
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    destructive: 'bg-destructive/10 text-destructive',
    primary: 'bg-primary/10 text-primary',
  };

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
    <div className="min-h-screen bg-background">
      <DashboardHeader title="Inventory Reports" userRole="manager" />

      <main className="p-6 lg:p-8">
        {/* Filters */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Select value={dateRange} onValueChange={(v) => setDateRange(v as typeof dateRange)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="quarter">This Quarter</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories?.map((cat) => (
                  <SelectItem key={cat._id} value={cat._id}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleExport} disabled={isLoading || !metrics} className="gap-2">
            <Download className="h-4 w-4" />
            Export Report
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <ErrorState description="Failed to load inventory reports" onRetry={() => refetch()} />
        ) : (
          <>
            {/* Metrics */}
            <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              {summaryCards.map((metric) => (
                <Card key={metric.id}>
                  <CardContent className="p-6">
                    <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-md ${VARIANT_STYLES[metric.variant]}`}>
                      <metric.icon className="h-5 w-5" />
                    </div>
                    <p className="mb-1 text-sm text-muted-foreground">{metric.name}</p>
                    <p className="text-2xl font-semibold text-foreground">{metric.value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Limitations / methodology note */}
            {data?.limitations && data.limitations.length > 0 && (
              <div className="mb-8 flex gap-3 rounded-lg border border-info/20 bg-info/10 p-4">
                <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-info" />
                <div className="space-y-1.5">
                  {data.limitations.map((note, i) => (
                    <p key={i} className="text-xs text-info">{note}</p>
                  ))}
                </div>
              </div>
            )}

            {/* Category Performance */}
            <Card className="mb-8">
              <CardContent className="p-6">
                <h3 className="mb-4 text-lg font-semibold text-foreground">Category Performance</h3>
                {categoryBreakdown.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No active products found for this filter</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Category</TableHead>
                        <TableHead>Total Value</TableHead>
                        <TableHead>COGS (Period)</TableHead>
                        <TableHead>Low Stock</TableHead>
                        <TableHead>Out of Stock</TableHead>
                        <TableHead>Turnover</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {categoryBreakdown.map((category) => (
                        <TableRow key={category.categoryId}>
                          <TableCell className="font-medium text-foreground">{category.category}</TableCell>
                          <TableCell className="text-foreground">{formatCurrency(category.totalValue)}</TableCell>
                          <TableCell className="text-foreground">{formatCurrency(category.cogs)}</TableCell>
                          <TableCell>
                            <span className={category.lowStock > 0 ? 'font-medium text-warning' : 'text-foreground'}>{category.lowStock}</span>
                          </TableCell>
                          <TableCell>
                            <span className={category.outOfStock > 0 ? 'font-medium text-destructive' : 'text-foreground'}>{category.outOfStock}</span>
                          </TableCell>
                          <TableCell className="text-foreground">{category.turnoverRatio !== null ? `${category.turnoverRatio.toFixed(2)}x` : 'N/A'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Inventory Movement Feed */}
            <Card>
              <CardContent className="p-6">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold text-foreground">Inventory Movements</h3>
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder="Search product or SKU..."
                        value={movementSearch}
                        onChange={(e) => { setMovementSearch(e.target.value); setMovementPage(1); }}
                        className="h-10 w-56 pl-9 text-sm"
                      />
                    </div>
                    <Select value={movementType} onValueChange={(v) => { setMovementType(v as MovementType | 'all'); setMovementPage(1); }}>
                      <SelectTrigger className="h-10 w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        {(Object.keys(MOVEMENT_TYPE_LABELS) as MovementType[]).map((t) => (
                          <SelectItem key={t} value={t}>{MOVEMENT_TYPE_LABELS[t]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {movementsData?.notes && movementsData.notes.length > 0 && (
                  <div className="mb-4 flex gap-2 rounded-md bg-muted/50 p-3">
                    <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">{movementsData.notes[0]}</p>
                  </div>
                )}

                {movementsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : movementsError ? (
                  <ErrorState description="Unable to load inventory movements." onRetry={() => refetchMovements()} />
                ) : !movementsData || movementsData.movements.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">No inventory movements found for this filter</p>
                ) : (
                  <>
                    <div className="space-y-2">
                      {movementsData.movements.map((movement) => (
                        <div key={movement.id} className="flex items-center justify-between rounded-md bg-muted/40 p-4">
                          <div className="flex items-center gap-4">
                            <div
                              className={`flex h-9 w-9 items-center justify-center rounded-md ${
                                movement.quantityChange >= 0 ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
                              }`}
                            >
                              {movement.quantityChange >= 0 ? (
                                <ArrowUpCircle className="h-4 w-4" />
                              ) : (
                                <ArrowDownCircle className="h-4 w-4" />
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-foreground">{movement.productName}</p>
                                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-primary">
                                  {MOVEMENT_TYPE_LABELS[movement.type]}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground">{movement.reference} &middot; {movement.performedBy}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={movement.quantityChange >= 0 ? 'font-semibold text-success' : 'font-semibold text-destructive'}>
                              {movement.quantityChange >= 0 ? '+' : ''}{movement.quantityChange}
                            </p>
                            <p className="text-xs text-muted-foreground">{new Date(movement.date).toLocaleString()}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    {movementsData.pagination.totalPages > 1 && (
                      <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
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
