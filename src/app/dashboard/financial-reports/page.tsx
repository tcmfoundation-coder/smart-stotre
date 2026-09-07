'use client';

import { useState } from 'react';
import { DashboardHeader } from '@/components/dashboard-header';
import { DollarSign, TrendingUp, Wallet, Download, Calendar, ArrowUpRight, ArrowDownRight, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import { useFinancialReports } from '@/hooks/useFinancialReports';

export default function FinancialReportsPage() {
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'quarter' | 'year'>('month');
  const [customRange, setCustomRange] = useState<{ startDate: string; endDate: string } | null>(null);
  const [isCustomRangeOpen, setIsCustomRangeOpen] = useState(false);
  const [draftStart, setDraftStart] = useState('');
  const [draftEnd, setDraftEnd] = useState('');

  const { data, isLoading, error, refetch } = useFinancialReports(
    customRange ? customRange : { dateRange }
  );

  const metrics = data?.metrics;
  const expenseBreakdown = data?.expenseBreakdown ?? [];
  const revenueByCategory = data?.revenueByCategory ?? [];

  const financialMetrics = metrics
    ? [
        { id: 'revenue', name: 'Total Revenue', value: metrics.totalRevenue, change: metrics.revenueChange, icon: DollarSign, color: 'text-green-600' },
        { id: 'profit', name: 'Net Profit', value: metrics.netProfit, change: metrics.profitChange, icon: TrendingUp, color: 'text-blue-600' },
        { id: 'expenses', name: 'Total Expenses', value: metrics.totalExpenses, change: metrics.expensesChange, icon: Wallet, color: 'text-red-600' },
        { id: 'margin', name: 'Profit Margin', value: metrics.profitMargin, change: metrics.marginChange, icon: TrendingUp, color: 'text-purple-600', isPercentage: true },
      ]
    : [];

  const handleApplyCustomRange = () => {
    if (!draftStart || !draftEnd) {
      toast.error('Select both a start and end date');
      return;
    }
    setCustomRange({ startDate: draftStart, endDate: draftEnd });
    setIsCustomRangeOpen(false);
  };

  const handleClearCustomRange = () => {
    setCustomRange(null);
    setDraftStart('');
    setDraftEnd('');
  };

  const handleExportReport = () => {
    if (!metrics) {
      toast.info('No report data to export yet');
      return;
    }

    let csv = 'Financial Report\n';
    csv += `Date Range,${customRange ? `${customRange.startDate} to ${customRange.endDate}` : dateRange}\n`;
    csv += `Export Date,${new Date().toLocaleString()}\n\n`;

    csv += 'Financial Metrics\n';
    csv += 'Metric,Value,Change (%)\n';
    financialMetrics.forEach((metric) => {
      csv += `${metric.name},${metric.isPercentage ? metric.value.toFixed(1) + '%' : formatCurrency(metric.value)},${metric.change.toFixed(1)}\n`;
    });

    csv += '\nExpense Breakdown\n';
    csv += 'Category,Amount,Percentage\n';
    expenseBreakdown.forEach((item) => {
      csv += `${item.category},${item.amount},${item.percentage.toFixed(1)}\n`;
    });

    csv += '\nRevenue by Category\n';
    csv += 'Category,Amount,Percentage\n';
    revenueByCategory.forEach((item) => {
      csv += `${item.category},${item.amount},${item.percentage.toFixed(1)}\n`;
    });

    csv += '\nFinancial Summary\n';
    csv += 'Category,Amount\n';
    csv += `Gross Revenue,${formatCurrency(metrics.totalRevenue)}\n`;
    csv += `Total Expenses,${formatCurrency(metrics.totalExpenses)}\n`;
    csv += `Net Profit,${formatCurrency(metrics.netProfit)}\n`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `financial_report_${customRange ? 'custom' : dateRange}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Financial report exported successfully');
  };

  return (
    <div className="min-h-screen transition-colors duration-300">
      <DashboardHeader title="Financial Reports" userRole="admin" />

      <main className="py-6">
        {/* Filters */}
        <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-4">
            <select
              value={dateRange}
              onChange={(e) => {
                setCustomRange(null);
                setDateRange(e.target.value as typeof dateRange);
              }}
              disabled={!!customRange}
              className="px-4 py-2 bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
            >
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="quarter">This Quarter</option>
              <option value="year">This Year</option>
            </select>
            <Button variant="outline" onClick={() => setIsCustomRangeOpen(true)}>
              <Calendar className="h-4 w-4 mr-2" />
              {customRange ? `${customRange.startDate} → ${customRange.endDate}` : 'Custom Range'}
            </Button>
            {customRange && (
              <Button variant="ghost" size="sm" onClick={handleClearCustomRange}>
                Clear
              </Button>
            )}
          </div>
          <Button className="bg-primary text-primary-foreground" onClick={handleExportReport} disabled={isLoading || !metrics}>
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
            <p className="text-red-500 mb-4">Failed to load financial reports</p>
            <Button onClick={() => refetch()}>Retry</Button>
          </div>
        ) : (
          <>
            {/* Financial Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {financialMetrics.map((metric, index) => (
                <motion.div
                  key={metric.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center">
                          <metric.icon className={`h-5 w-5 ${metric.color}`} />
                        </div>
                        <div className={`flex items-center gap-1 text-sm ${
                          metric.change >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {metric.change >= 0 ? (
                            <ArrowUpRight className="h-4 w-4" />
                          ) : (
                            <ArrowDownRight className="h-4 w-4" />
                          )}
                          <span className="font-bold">{Math.abs(metric.change).toFixed(1)}%</span>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mb-1">{metric.name}</p>
                      <p className="text-2xl font-bold text-foreground">
                        {metric.isPercentage ? `${metric.value.toFixed(1)}%` : formatCurrency(metric.value)}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Expense Breakdown */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-bold text-foreground mb-4">Expense Breakdown</h3>
                  {expenseBreakdown.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No expenses recorded in this period</p>
                  ) : (
                    <div className="space-y-4">
                      {expenseBreakdown.map((item, index) => (
                        <div key={index}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-foreground capitalize">{item.category}</span>
                            <span className="text-sm font-bold text-foreground">{formatCurrency(item.amount)}</span>
                          </div>
                          <div className="h-2 bg-secondary rounded-full overflow-hidden">
                            <div
                              className="h-full bg-red-500 rounded-full"
                              style={{ width: `${item.percentage}%` }}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{item.percentage.toFixed(1)}% of total</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Revenue by Category */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-bold text-foreground mb-4">Revenue by Category</h3>
                  {revenueByCategory.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No sales recorded in this period</p>
                  ) : (
                    <div className="space-y-4">
                      {revenueByCategory.map((item, index) => (
                        <div key={index}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-foreground">{item.category}</span>
                            <span className="text-sm font-bold text-foreground">{formatCurrency(item.amount)}</span>
                          </div>
                          <div className="h-2 bg-secondary rounded-full overflow-hidden">
                            <div
                              className="h-full bg-green-500 rounded-full"
                              style={{ width: `${item.percentage}%` }}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{item.percentage.toFixed(1)}% of total</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Financial Summary */}
            {metrics && (
              <Card className="mt-6">
                <CardContent className="p-6">
                  <h3 className="text-lg font-bold text-foreground mb-4">Financial Summary</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
                      <p className="text-sm text-muted-foreground mb-1">Gross Revenue</p>
                      <p className="text-2xl font-bold text-green-600 dark:text-green-400">{formatCurrency(metrics.totalRevenue)}</p>
                    </div>
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl">
                      <p className="text-sm text-muted-foreground mb-1">Total Expenses</p>
                      <p className="text-2xl font-bold text-red-600 dark:text-red-400">{formatCurrency(metrics.totalExpenses)}</p>
                    </div>
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                      <p className="text-sm text-muted-foreground mb-1">Net Profit</p>
                      <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{formatCurrency(metrics.netProfit)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </main>

      <Dialog open={isCustomRangeOpen} onOpenChange={setIsCustomRangeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Custom Date Range</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="start-date">Start Date</Label>
              <Input id="start-date" type="date" value={draftStart} onChange={(e) => setDraftStart(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-date">End Date</Label>
              <Input id="end-date" type="date" value={draftEnd} onChange={(e) => setDraftEnd(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCustomRangeOpen(false)}>Cancel</Button>
            <Button onClick={handleApplyCustomRange}>Apply</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
