'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardHeader } from '@/components/dashboard-header';
import {
  ArrowLeft,
  Download,
  Printer,
  Loader2,
  TrendingUp,
  Package,
  Users,
  DollarSign,
  FileText,
  Clock,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useReport, useDownloadReport, type Report } from '@/hooks/useReports';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';

const REPORT_TYPE_META = {
  sales: { label: 'Sales Report', icon: TrendingUp, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-900/30' },
  inventory: { label: 'Inventory Report', icon: Package, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/30' },
  customers: { label: 'Customer Report', icon: Users, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-100 dark:bg-purple-900/30' },
  financial: { label: 'Financial Report', icon: DollarSign, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/30' },
} as const;

const DATE_RANGE_LABELS: Record<string, string> = {
  today: 'Today',
  week: 'This Week',
  month: 'This Month',
  quarter: 'This Quarter',
  year: 'This Year',
  custom: 'Custom Range',
};

interface MetricDef {
  key: string;
  label: string;
  format: 'currency' | 'number' | 'percent';
}

const METRICS_BY_TYPE: Record<string, MetricDef[]> = {
  sales: [
    { key: 'totalRevenue', label: 'Total Revenue', format: 'currency' },
    { key: 'totalTransactions', label: 'Total Transactions', format: 'number' },
    { key: 'averageTransactionValue', label: 'Average Transaction Value', format: 'currency' },
    { key: 'salesCount', label: 'Sales Count', format: 'number' },
  ],
  inventory: [
    { key: 'totalProducts', label: 'Total Products', format: 'number' },
    { key: 'totalStock', label: 'Total Stock (units)', format: 'number' },
    { key: 'totalValue', label: 'Total Inventory Value', format: 'currency' },
    { key: 'lowStockItems', label: 'Low Stock Items', format: 'number' },
  ],
  customers: [
    { key: 'totalCustomers', label: 'Total Customers', format: 'number' },
    { key: 'newCustomers', label: 'New Customers', format: 'number' },
    { key: 'averagePurchaseValue', label: 'Average Purchase Value', format: 'currency' },
  ],
  financial: [
    { key: 'revenue', label: 'Revenue', format: 'currency' },
    { key: 'expenses', label: 'Expenses', format: 'currency' },
    { key: 'profit', label: 'Profit', format: 'currency' },
    { key: 'profitMargin', label: 'Profit Margin', format: 'percent' },
  ],
};

function formatMetric(value: number, format: MetricDef['format']): string {
  if (format === 'currency') return formatCurrency(value);
  if (format === 'percent') return `${value.toFixed(1)}%`;
  return new Intl.NumberFormat('en-US').format(value);
}

function ReportViewerSkeleton() {
  return (
    <div className="space-y-6 animate-pulse" aria-label="Loading report">
      <div className="h-24 bg-card border border-border rounded-2xl" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 bg-card border border-border rounded-2xl" />
        ))}
      </div>
      <div className="h-64 bg-card border border-border rounded-2xl" />
    </div>
  );
}

export default function ReportViewerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data: report, isLoading, error, refetch } = useReport(id);
  const downloadReport = useDownloadReport();

  const handleDownload = () => {
    if (report) downloadReport.mutate(report);
  };

  const notFound = error?.message === 'Report not found';
  const forbidden = error?.message === 'Forbidden - Insufficient permissions';

  return (
    <div className="min-h-screen transition-colors duration-300">
      <DashboardHeader title="Report Viewer" userRole="admin" />

      <main className="py-6">
        <div className="mb-6 flex items-center justify-between flex-wrap gap-3 print:hidden">
          <Button variant="outline" onClick={() => router.push('/dashboard/reports')}>
            <ArrowLeft className="h-4 w-4 mr-2" aria-hidden="true" />
            Back to Reports
          </Button>
          {report && report.status === 'completed' && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleDownload}
                disabled={downloadReport.isPending}
              >
                {downloadReport.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
                ) : (
                  <Download className="h-4 w-4 mr-2" aria-hidden="true" />
                )}
                Download CSV
              </Button>
              <Button className="bg-primary text-primary-foreground" onClick={() => window.print()}>
                <Printer className="h-4 w-4 mr-2" aria-hidden="true" />
                Print
              </Button>
            </div>
          )}
        </div>

        {isLoading ? (
          <ReportViewerSkeleton />
        ) : error ? (
          <Card>
            <CardContent className="p-12 text-center" role="alert">
              <AlertTriangle className="h-10 w-10 text-red-500 mx-auto mb-4" aria-hidden="true" />
              {notFound ? (
                <>
                  <p className="text-lg font-bold text-foreground mb-1">Report not found</p>
                  <p className="text-muted-foreground mb-6">This report may have been deleted.</p>
                </>
              ) : forbidden ? (
                <>
                  <p className="text-lg font-bold text-foreground mb-1">You don&apos;t have access to this report</p>
                  <p className="text-muted-foreground mb-6">Your role doesn&apos;t have permission to view this report type.</p>
                </>
              ) : (
                <>
                  <p className="text-lg font-bold text-foreground mb-1">Unable to load this report</p>
                  <p className="text-muted-foreground mb-6">Something went wrong while fetching the report data.</p>
                </>
              )}
              <div className="flex items-center justify-center gap-3">
                {!notFound && !forbidden && (
                  <Button onClick={() => refetch()}>
                    <RefreshCw className="h-4 w-4 mr-2" aria-hidden="true" />
                    Retry
                  </Button>
                )}
                <Button variant="outline" onClick={() => router.push('/dashboard/reports')}>
                  Back to Reports
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : report ? (
          <ErrorBoundary>
            <ReportViewerContent report={report} onRefetch={refetch} />
          </ErrorBoundary>
        ) : null}
      </main>
    </div>
  );
}

function ReportViewerContent({ report, onRefetch }: { report: Report; onRefetch: () => void }) {
  const meta = REPORT_TYPE_META[report.type];
  const TypeIcon = meta?.icon ?? FileText;
  const metrics = METRICS_BY_TYPE[report.type] ?? [];
  const metadata = report.metadata ?? {};
  const dateRangePreset = metadata.dateRange as string | undefined;
  const dateRange = report.dateRange;

  return (
    <div className="space-y-6">
      {/* Header card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${meta?.bg ?? 'bg-primary/10'}`}>
                <TypeIcon className={`h-6 w-6 ${meta?.color ?? 'text-primary'}`} aria-hidden="true" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">{report.name}</h1>
                <p className="text-sm text-muted-foreground">{meta?.label ?? 'Report'}</p>
              </div>
            </div>
            <StatusBadge status={report.status} />
          </div>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground mb-0.5">Period</p>
              <p className="font-medium text-foreground">
                {dateRange?.start && dateRange?.end ? (
                  <>
                    {formatDate(dateRange.start)} — {formatDate(dateRange.end)}
                    {dateRangePreset && dateRangePreset !== 'custom' && DATE_RANGE_LABELS[dateRangePreset] && (
                      <span className="text-muted-foreground font-normal"> ({DATE_RANGE_LABELS[dateRangePreset]})</span>
                    )}
                  </>
                ) : dateRangePreset ? (
                  DATE_RANGE_LABELS[dateRangePreset] ?? dateRangePreset
                ) : (
                  'N/A'
                )}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground mb-0.5">Generated By</p>
              <p className="font-medium text-foreground">{report.generatedBy}</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-0.5">Generated At</p>
              <p className="font-medium text-foreground">{new Date(report.generatedAt).toLocaleString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {report.status === 'pending' && (
        <Card>
          <CardContent className="p-12 text-center">
            <Clock className="h-10 w-10 text-yellow-500 mx-auto mb-4 animate-pulse" aria-hidden="true" />
            <p className="text-lg font-bold text-foreground mb-1">This report is still generating</p>
            <p className="text-muted-foreground mb-6">Check back in a moment.</p>
            <Button onClick={() => onRefetch()}>
              <RefreshCw className="h-4 w-4 mr-2" aria-hidden="true" />
              Refresh
            </Button>
          </CardContent>
        </Card>
      )}

      {report.status === 'failed' && (
        <Card>
          <CardContent className="p-12 text-center">
            <AlertTriangle className="h-10 w-10 text-red-500 mx-auto mb-4" aria-hidden="true" />
            <p className="text-lg font-bold text-foreground mb-1">Report generation failed</p>
            <p className="text-muted-foreground">Generate a new report from the Reports Center.</p>
          </CardContent>
        </Card>
      )}

      {report.status === 'completed' && (
        <>
          {metrics.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center text-muted-foreground">
                No data available for this period.
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Summary metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {metrics.map((metric, index) => (
                  <motion.div
                    key={metric.key}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card>
                      <CardContent className="p-6">
                        <p className="text-sm text-muted-foreground mb-1">{metric.label}</p>
                        <p className="text-2xl font-bold text-foreground">
                          {formatMetric(Number(metadata[metric.key]) || 0, metric.format)}
                        </p>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>

              {/* Breakdown table */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-bold text-foreground mb-4">Metric Breakdown</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-3 px-4 text-xs font-bold text-muted-foreground uppercase">Metric</th>
                          <th className="text-left py-3 px-4 text-xs font-bold text-muted-foreground uppercase">Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {metrics.map((metric) => (
                          <tr key={metric.key} className="border-b border-border last:border-0 hover:bg-muted/50">
                            <td className="py-3 px-4 font-medium text-foreground">{metric.label}</td>
                            <td className="py-3 px-4 text-foreground">
                              {formatMetric(Number(metadata[metric.key]) || 0, metric.format)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {report.type === 'financial' && (
                <FinancialBreakdownChart metadata={metadata} />
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: Report['status'] }) {
  const config = {
    completed: { label: 'Completed', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
    pending: { label: 'Generating...', className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
    failed: { label: 'Failed', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  }[status];

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium ${config.className}`} role="status">
      {config.label}
    </span>
  );
}

// The generic Report record stores three flat, already-computed numbers
// (revenue, expenses, profit) - this renders them as proportional bars
// without deriving or recalculating anything the backend didn't already
// compute in /api/reports/generate.
function FinancialBreakdownChart({ metadata }: { metadata: Record<string, any> }) {
  const revenue = Number(metadata.revenue) || 0;
  const expenses = Number(metadata.expenses) || 0;
  const profit = Number(metadata.profit) || 0;
  const max = Math.max(revenue, expenses, Math.abs(profit), 1);

  const bars = [
    { label: 'Revenue', value: revenue, className: 'bg-green-500' },
    { label: 'Expenses', value: expenses, className: 'bg-red-500' },
    { label: 'Profit', value: profit, className: profit >= 0 ? 'bg-blue-500' : 'bg-red-500' },
  ];

  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="text-lg font-bold text-foreground mb-4">Revenue vs. Expenses vs. Profit</h3>
        <div className="space-y-4">
          {bars.map((bar) => (
            <div key={bar.label}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-foreground">{bar.label}</span>
                <span className="text-sm font-bold text-foreground">{formatCurrency(bar.value)}</span>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${bar.className}`}
                  style={{ width: `${Math.min(100, (Math.abs(bar.value) / max) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
