'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardHeader } from '@/components/dashboard-header';
import { FileText, Search, Download, Calendar, TrendingUp, DollarSign, Package, Users, Loader2, X, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useReports, useGenerateReport, useDownloadReport, useDeleteReport, generateReportCSV } from '@/hooks/useReports';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { ErrorState } from '@/components/ui/error-state';
import { CardSkeleton } from '@/components/loading/CardSkeleton';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

const STATUS_BADGE: Record<string, { label: string; variant: 'success' | 'warning' | 'destructive' }> = {
  completed: { label: 'Completed', variant: 'success' },
  pending: { label: 'Generating...', variant: 'warning' },
  failed: { label: 'Failed', variant: 'destructive' },
};

export default function ReportsPage() {
  const router = useRouter();
  const [dateRange, setDateRange] = useState('month');
  const [reportType, setReportType] = useState('sales');
  const [searchQuery, setSearchQuery] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [reportToDelete, setReportToDelete] = useState<string | null>(null);
  const [showCustomDateDialog, setShowCustomDateDialog] = useState(false);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const { data: reports, isLoading, error, refetch } = useReports({ type: reportType });
  const generateReport = useGenerateReport();
  const downloadReport = useDownloadReport();
  const deleteReport = useDeleteReport();

  const reportTypes = [
    { id: 'sales', name: 'Sales Reports', icon: TrendingUp, description: 'Revenue, transactions, and performance' },
    { id: 'inventory', name: 'Inventory Reports', icon: Package, description: 'Stock levels, movements, and valuation' },
    { id: 'customers', name: 'Customer Reports', icon: Users, description: 'Customer behavior and analytics' },
    { id: 'financial', name: 'Financial Reports', icon: DollarSign, description: 'Profit, loss, and expenses' }
  ];

  const handleGenerateReport = (type: string) => {
    if (dateRange === 'custom') {
      if (!customStartDate || !customEndDate) {
        toast.error('Please select both start and end dates');
        return;
      }
      generateReport.mutate({ type, dateRange, startDate: customStartDate, endDate: customEndDate });
    } else {
      generateReport.mutate({ type, dateRange });
    }
  };

  const handleDownload = (report: any) => {
    downloadReport.mutate(report);
  };

  const handleDelete = (reportId: string) => {
    setReportToDelete(reportId);
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    if (reportToDelete) {
      deleteReport.mutate(reportToDelete, {
        onSuccess: () => {
          setShowDeleteDialog(false);
          setReportToDelete(null);
          toast.success('Report deleted successfully');
        }
      });
    }
  };

  const handleExportAll = () => {
    // Export exactly the reports currently visible under the active type
    // tab and search filter - not the full unfiltered list - so the file
    // matches what the user is looking at on screen.
    if (!filteredReports || filteredReports.length === 0) {
      toast.error('No reports to export');
      return;
    }

    const csv = filteredReports
      .map(report => generateReportCSV(report))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `reports_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(`Exported ${filteredReports.length} ${filteredReports.length === 1 ? 'report' : 'reports'}`);
  };

  const handleCustomDateSubmit = () => {
    if (!customStartDate || !customEndDate) {
      toast.error('Please select both start and end dates');
      return;
    }
    setDateRange('custom');
    setShowCustomDateDialog(false);
    toast.success('Custom date range applied');
  };

  const filteredReports = reports?.filter(report =>
    report.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    report.generatedBy.toLowerCase().includes(searchQuery.toLowerCase()) ||
    report.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader title="Reports" userRole="admin" />

      <main className="p-6 lg:p-8" role="main" aria-label="Reports center">
        {/* Filters */}
        <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex w-full flex-col items-start gap-3 sm:w-auto sm:flex-row sm:items-center">
            <div>
              <Label htmlFor="date-range-select" className="sr-only">Select date range</Label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger id="date-range-select" className="h-11 w-full sm:w-44" aria-label="Date range filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="quarter">This Quarter</SelectItem>
                  <SelectItem value="year">This Year</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="outline"
              className="h-11 w-full gap-2 sm:w-auto"
              onClick={() => setShowCustomDateDialog(true)}
              aria-label="Open custom date range picker"
            >
              <Calendar className="h-4 w-4" aria-hidden="true" />
              Custom Range
            </Button>
          </div>
          <Button className="h-11 w-full gap-2 sm:w-auto" onClick={handleExportAll} aria-label="Export all reports">
            <Download className="h-4 w-4" aria-hidden="true" />
            Export All
          </Button>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative sm:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              type="text"
              placeholder="Search reports by name, type, or generated by..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-11 pl-9 pr-9"
              aria-label="Search reports"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>

        {/* Report Types */}
        <section aria-label="Report types" className="mb-8">
          <h2 className="mb-4 text-base font-semibold text-foreground">Select Report Type</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {reportTypes.map((type) => (
              <Card
                key={type.id}
                className={`cursor-pointer transition-shadow hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                  reportType === type.id ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => setReportType(type.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setReportType(type.id);
                  }
                }}
                role="button"
                tabIndex={0}
                aria-pressed={reportType === type.id}
                aria-label={`Select ${type.name}`}
              >
                <CardContent className="p-6">
                  <div className="mb-3 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10" aria-hidden="true">
                      <type.icon className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="text-base font-semibold text-foreground">{type.name}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">{type.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Quick Actions */}
        <section aria-label="Generate reports" className="mb-8">
          <h2 className="mb-4 text-base font-semibold text-foreground">Generate Report</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="p-6">
                <Button
                  className="w-full gap-2"
                  onClick={() => handleGenerateReport('sales')}
                  disabled={generateReport.isPending}
                  isLoading={generateReport.isPending}
                  aria-label="Generate sales report"
                >
                  {!generateReport.isPending && (
                    <>
                      <FileText className="h-4 w-4" aria-hidden="true" />
                      Generate Sales Report
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <Button
                  className="w-full gap-2"
                  onClick={() => handleGenerateReport('inventory')}
                  disabled={generateReport.isPending}
                  isLoading={generateReport.isPending}
                  aria-label="Generate inventory report"
                >
                  {!generateReport.isPending && (
                    <>
                      <Package className="h-4 w-4" aria-hidden="true" />
                      Generate Inventory Report
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <Button
                  className="w-full gap-2"
                  onClick={() => handleGenerateReport('customers')}
                  disabled={generateReport.isPending}
                  isLoading={generateReport.isPending}
                  aria-label="Generate customer report"
                >
                  {!generateReport.isPending && (
                    <>
                      <Users className="h-4 w-4" aria-hidden="true" />
                      Generate Customer Report
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Recent Reports */}
        <section aria-label="Recent reports">
          <ErrorBoundary>
            {isLoading ? (
              <div className="space-y-3" aria-label="Loading reports">
                {[1, 2, 3].map((i) => (
                  <CardSkeleton key={i} />
                ))}
              </div>
            ) : error ? (
              <ErrorState description="Unable to load reports." onRetry={() => refetch()} />
            ) : (
              <Card>
                <CardContent className="p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-base font-semibold text-foreground">
                      Recent Reports
                      {filteredReports && filteredReports.length > 0 && (
                        <span className="ml-2 text-sm font-normal text-muted-foreground">
                          ({filteredReports.length} {filteredReports.length === 1 ? 'report' : 'reports'})
                        </span>
                      )}
                    </h3>
                  </div>
                  {filteredReports && filteredReports.length > 0 ? (
                    <div className="space-y-3" role="list" aria-label="Report list">
                      {filteredReports.map((report) => {
                        const status = STATUS_BADGE[report.status] ?? STATUS_BADGE.completed;
                        return (
                          <div
                            key={report._id}
                            className="flex flex-col items-start justify-between gap-4 rounded-md border border-border p-4 sm:flex-row sm:items-center"
                            role="listitem"
                          >
                            <div className="w-full flex-1">
                              <div className="mb-1 flex flex-wrap items-center gap-2">
                                <FileText className="h-4 w-4 text-primary" aria-hidden="true" />
                                <span className="font-medium text-foreground">{report.name}</span>
                                <Badge variant={status.variant} role="status" aria-label={`Report status: ${status.label}`}>
                                  {status.label}
                                </Badge>
                              </div>
                              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                <span>Generated by {report.generatedBy}</span>
                                <span aria-hidden="true">•</span>
                                <span>{new Date(report.generatedAt).toLocaleString()}</span>
                                <span aria-hidden="true">•</span>
                                <span className="capitalize">{report.type}</span>
                              </div>
                            </div>
                            <div className="flex w-full gap-2 sm:w-auto">
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-1"
                                onClick={() => handleDownload(report)}
                                disabled={report.status !== 'completed' || downloadReport.isPending}
                                aria-label={`Download ${report.name}`}
                              >
                                {downloadReport.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Download className="h-4 w-4" aria-hidden="true" />}
                                Download
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-1"
                                onClick={() => router.push(`/dashboard/reports/${report._id}`)}
                                aria-label={`View ${report.name}`}
                              >
                                <Eye className="h-4 w-4" aria-hidden="true" />
                                View
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                onClick={() => handleDelete(report._id)}
                                aria-label={`Delete ${report.name}`}
                              >
                                Delete
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="py-8 text-center text-muted-foreground" role="status" aria-live="polite">
                      {searchQuery ? (
                        <p>No reports found matching &quot;{searchQuery}&quot;. Try a different search term.</p>
                      ) : (
                        <p>No reports found. Generate your first report above.</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </ErrorBoundary>
        </section>
      </main>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Report</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete this report? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteReport.isPending}
              isLoading={deleteReport.isPending}
            >
              {!deleteReport.isPending && 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Custom Date Range Dialog */}
      <Dialog open={showCustomDateDialog} onOpenChange={setShowCustomDateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Custom Date Range</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="start-date" className="mb-2 block">Start Date</Label>
              <Input
                id="start-date"
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                aria-label="Start date"
              />
            </div>
            <div>
              <Label htmlFor="end-date" className="mb-2 block">End Date</Label>
              <Input
                id="end-date"
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                aria-label="End date"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCustomDateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCustomDateSubmit}>
              Apply Range
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
