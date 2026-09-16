'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardHeader } from '@/components/dashboard-header';
import {
  ArrowLeft,
  Download,
  Printer,
  TrendingUp,
  Package,
  Users,
  DollarSign,
  FileText,
  Clock,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useReport, useDownloadReport, type Report } from '@/hooks/useReports';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';

const REPORT_TYPE_META = {
  sales: { label: 'Sales Report', icon: TrendingUp, variant: 'success' as const },
  inventory: { label: 'Inventory Report', icon: Package, variant: 'primary' as const },
  customers: { label: 'Customer Report', icon: Users, variant: 'info' as const },
  financial: { label: 'Financial Report', icon: DollarSign, variant: 'warning' as const },
} as const;

const TYPE_VARIANT_STYLES: Record<string, string> = {
  success: 'bg-success/10 text-success',
  primary: 'bg-primary/10 text-primary',
  info: 'bg-info/10 text-info',
  warning: 'bg-warning/10 text-warning',
};

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
    <div className="animate-pulse space-y-6" aria-label="Loading report">
      <div className="h-24 rounded-lg border border-border bg-card" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 rounded-lg border border-border bg-card" />
        ))}
      </div>
      <div className="h-64 rounded-lg border border-border bg-card" />
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
    <div className="min-h-screen bg-background">
      <DashboardHeader title="Report Viewer" userRole="admin" />

      <main className="p-6 lg:p-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <Button variant="outline" onClick={() => router.push('/dashboard/reports')} className="gap-2">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to Reports
          </Button>
          {report && report.status === 'completed' && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleDownload}
                disabled={downloadReport.isPending}
                isLoading={downloadReport.isPending}
                className="gap-2"
              >
                {!downloadReport.isPending && <Download className="h-4 w-4" aria-hidden="true" />}
                Download CSV
              </Button>
              <Button onClick={() => window.print()} className="gap-2">
                <Printer className="h-4 w-4" aria-hidden="true" />
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
              <AlertTriangle className="mx-auto mb-4 h-8 w-8 text-destructive" aria-hidden="true" />
              {notFound ? (
                <>
                  <p className="mb-1 text-lg font-semibold text-foreground">Report not found</p>
                  <p className="mb-6 text-muted-foreground">This report may have been deleted.</p>
                </>
              ) : forbidden ? (
                <>
                  <p className="mb-1 text-lg font-semibold text-foreground">You don&apos;t have access to this report</p>
                  <p className="mb-6 text-muted-foreground">Your role doesn&apos;t have permission to view this report type.</p>
                </>
              ) : (
                <>
                  <p className="mb-1 text-lg font-semibold text-foreground">Unable to load this report</p>
                  <p className="mb-6 text-muted-foreground">Something went wrong while fetching the report data.</p>
                </>
              )}
              <div className="flex items-center justify-center gap-3">
                {!notFound && !forbidden && (
                  <Button onClick={() => refetch()} className="gap-2">
                    <RefreshCw className="h-4 w-4" aria-hidden="true" />
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
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={`flex h-11 w-11 items-center justify-center rounded-md ${TYPE_VARIANT_STYLES[meta?.variant ?? 'primary']}`}>
                <TypeIcon className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-foreground">{report.name}</h1>
                <p className="text-sm text-muted-foreground">{meta?.label ?? 'Report'}</p>
              </div>
            </div>
            <StatusBadge status={report.status} />
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 text-sm sm:grid-cols-3">
            <div>
              <p className="mb-0.5 text-muted-foreground">Period</p>
              <p className="font-medium text-foreground">
                {dateRange?.start && dateRange?.end ? (
                  <>
                    {formatDate(dateRange.start)} — {formatDate(dateRange.end)}
                    {dateRangePreset && dateRangePreset !== 'custom' && DATE_RANGE_LABELS[dateRangePreset] && (
                      <span className="font-normal text-muted-foreground"> ({DATE_RANGE_LABELS[dateRangePreset]})</span>
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
              <p className="mb-0.5 text-muted-foreground">Generated By</p>
              <p className="font-medium text-foreground">{report.generatedBy}</p>
            </div>
            <div>
              <p className="mb-0.5 text-muted-foreground">Generated At</p>
              <p className="font-medium text-foreground">{new Date(report.generatedAt).toLocaleString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {report.status === 'pending' && (
        <Card>
          <CardContent className="p-12 text-center">
            <Clock className="mx-auto mb-4 h-8 w-8 animate-pulse text-warning" aria-hidden="true" />
            <p className="mb-1 text-lg font-semibold text-foreground">This report is still generating</p>
            <p className="mb-6 text-muted-foreground">Check back in a moment.</p>
            <Button onClick={() => onRefetch()} className="gap-2">
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Refresh
            </Button>
          </CardContent>
        </Card>
      )}

      {report.status === 'failed' && (
        <Card>
          <CardContent className="p-12 text-center">
            <AlertTriangle className="mx-auto mb-4 h-8 w-8 text-destructive" aria-hidden="true" />
            <p className="mb-1 text-lg font-semibold text-foreground">Report generation failed</p>
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
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                {metrics.map((metric) => (
                  <Card key={metric.key}>
                    <CardContent className="p-6">
                      <p className="mb-1 text-sm text-muted-foreground">{metric.label}</p>
                      <p className="text-2xl font-semibold text-foreground">
                        {formatMetric(Number(metadata[metric.key]) || 0, metric.format)}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Breakdown table */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="mb-4 text-lg font-semibold text-foreground">Metric Breakdown</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Metric</TableHead>
                        <TableHead>Value</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {metrics.map((metric) => (
                        <TableRow key={metric.key}>
                          <TableCell className="font-medium text-foreground">{metric.label}</TableCell>
                          <TableCell className="text-foreground">
                            {formatMetric(Number(metadata[metric.key]) || 0, metric.format)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
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
  const config: Record<Report['status'], { label: string; variant: BadgeProps['variant'] }> = {
    completed: { label: 'Completed', variant: 'success' },
    pending: { label: 'Generating...', variant: 'warning' },
    failed: { label: 'Failed', variant: 'destructive' },
  };
  const { label, variant } = config[status];

  return (
    <Badge variant={variant} role="status">
      {label}
    </Badge>
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
    { label: 'Revenue', value: revenue, className: 'bg-success' },
    { label: 'Expenses', value: expenses, className: 'bg-destructive' },
    { label: 'Profit', value: profit, className: profit >= 0 ? 'bg-primary' : 'bg-destructive' },
  ];

  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="mb-4 text-lg font-semibold text-foreground">Revenue vs. Expenses vs. Profit</h3>
        <div className="space-y-4">
          {bars.map((bar) => (
            <div key={bar.label}>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">{bar.label}</span>
                <span className="text-sm font-semibold text-foreground">{formatCurrency(bar.value)}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-secondary">
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
