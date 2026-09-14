'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardHeader } from '@/components/dashboard-header';
import { FileText, Search, Download, Calendar, TrendingUp, DollarSign, Package, Users, Filter, Loader2, X, ChevronDown, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { useReports, useGenerateReport, useDownloadReport, useDeleteReport, generateReportCSV } from '@/hooks/useReports';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { CardSkeleton } from '@/components/loading/CardSkeleton';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

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

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      completed: { label: 'Completed', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
      pending: { label: 'Generating...', className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
      failed: { label: 'Failed', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.completed;
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.className}`} role="status" aria-label={`Report status: ${config.label}`}>
        {config.label}
      </span>
    );
  };

  return (
    <div className="min-h-screen transition-colors duration-300">
      <DashboardHeader title="Reports" userRole="admin" />
      
      <main className="py-6" role="main" aria-label="Reports center">
        {/* Filters */}
        <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto">
            <div className="relative">
              <label htmlFor="date-range-select" className="sr-only">Select date range</label>
              <select
                id="date-range-select"
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="px-4 py-2 bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                aria-label="Date range filter"
              >
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="quarter">This Quarter</option>
                <option value="year">This Year</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>
            <Button 
              variant="outline" 
              onClick={() => setShowCustomDateDialog(true)}
              aria-label="Open custom date range picker"
            >
              <Calendar className="h-4 w-4 mr-2" aria-hidden="true" />
              Custom Range
            </Button>
          </div>
          <Button 
            className="bg-primary text-primary-foreground w-full sm:w-auto"
            onClick={handleExportAll}
            aria-label="Export all reports"
          >
            <Download className="h-4 w-4 mr-2" aria-hidden="true" />
            Export All
          </Button>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <input
              type="text"
              placeholder="Search reports by name, type, or generated by..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-2 bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              aria-label="Search reports"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>

        {/* Report Types */}
        <section aria-label="Report types" className="mb-8">
          <h2 className="text-lg font-bold text-foreground mb-4">Select Report Type</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {reportTypes.map((type, index) => (
              <motion.div
                key={type.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card 
                  className={`cursor-pointer transition-all hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
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
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center" aria-hidden="true">
                        <type.icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-bold text-foreground">{type.name}</h3>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">{type.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Quick Actions */}
        <section aria-label="Generate reports" className="mb-8">
          <h2 className="text-lg font-bold text-foreground mb-4">Generate Report</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6">
                <Button 
                  className="w-full bg-primary text-primary-foreground"
                  onClick={() => handleGenerateReport('sales')}
                  disabled={generateReport.isPending}
                  aria-label="Generate sales report"
                >
                  {generateReport.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />}
                  <FileText className="h-4 w-4 mr-2" aria-hidden="true" />
                  Generate Sales Report
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <Button 
                  className="w-full bg-primary text-primary-foreground"
                  onClick={() => handleGenerateReport('inventory')}
                  disabled={generateReport.isPending}
                  aria-label="Generate inventory report"
                >
                  {generateReport.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />}
                  <Package className="h-4 w-4 mr-2" aria-hidden="true" />
                  Generate Inventory Report
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <Button 
                  className="w-full bg-primary text-primary-foreground"
                  onClick={() => handleGenerateReport('customers')}
                  disabled={generateReport.isPending}
                  aria-label="Generate customer report"
                >
                  {generateReport.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />}
                  <Users className="h-4 w-4 mr-2" aria-hidden="true" />
                  Generate Customer Report
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
              <Card>
                <CardContent className="p-6 text-center py-12" role="alert">
                  <p className="text-red-500 mb-4">Unable to load reports.</p>
                  <Button variant="outline" onClick={() => refetch()}>Retry</Button>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-foreground">
                      Recent Reports
                      {filteredReports && filteredReports.length > 0 && (
                        <span className="text-sm font-normal text-muted-foreground ml-2">
                          ({filteredReports.length} {filteredReports.length === 1 ? 'report' : 'reports'})
                        </span>
                      )}
                    </h3>
                  </div>
                  {filteredReports && filteredReports.length > 0 ? (
                    <div className="space-y-3" role="list" aria-label="Report list">
                      {filteredReports.map((report, index) => (
                        <motion.div
                          key={report._id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-secondary/50 rounded-lg gap-4"
                          role="listitem"
                        >
                          <div className="flex-1 w-full">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <FileText className="h-4 w-4 text-primary" aria-hidden="true" />
                              <span className="font-medium text-foreground">{report.name}</span>
                              {getStatusBadge(report.status)}
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                              <span>Generated by {report.generatedBy}</span>
                              <span aria-hidden="true">•</span>
                              <span>{new Date(report.generatedAt).toLocaleString()}</span>
                              <span aria-hidden="true">•</span>
                              <span className="capitalize">{report.type}</span>
                            </div>
                          </div>
                          <div className="flex gap-2 w-full sm:w-auto">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleDownload(report)}
                              disabled={report.status !== 'completed' || downloadReport.isPending}
                              aria-label={`Download ${report.name}`}
                            >
                              {downloadReport.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" aria-hidden="true" /> : <Download className="h-4 w-4 mr-1" aria-hidden="true" />}
                              Download
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => router.push(`/dashboard/reports/${report._id}`)}
                              aria-label={`View ${report.name}`}
                            >
                              <Eye className="h-4 w-4 mr-1" aria-hidden="true" />
                              View
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                              onClick={() => handleDelete(report._id)}
                              aria-label={`Delete ${report.name}`}
                            >
                              Delete
                            </Button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground" role="status" aria-live="polite">
                      {searchQuery ? (
                        <p>No reports found matching "{searchQuery}". Try a different search term.</p>
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
            >
              {deleteReport.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />}
              Delete
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
              <label htmlFor="start-date" className="block text-sm font-medium text-foreground mb-2">
                Start Date
              </label>
              <input
                id="start-date"
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="w-full px-4 py-2 bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                aria-label="Start date"
              />
            </div>
            <div>
              <label htmlFor="end-date" className="block text-sm font-medium text-foreground mb-2">
                End Date
              </label>
              <input
                id="end-date"
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="w-full px-4 py-2 bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
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
