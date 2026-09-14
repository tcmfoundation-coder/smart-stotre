'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiDelete, ApiResponse } from '@/lib/api-client';
import { toast } from 'sonner';

export interface Report {
  _id: string;
  name: string;
  type: 'sales' | 'inventory' | 'customers' | 'financial';
  generatedBy: string;
  generatedAt: string;
  status: 'pending' | 'completed' | 'failed';
  fileUrl?: string;
  dateRange?: { start: string; end: string };
  metadata?: Record<string, any>;
}

export interface ReportParams {
  type?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

// apiGet/apiPost/apiDelete resolve to { success:false, error } on an
// HTTP-level failure (e.g. a 403 or a 500) rather than throwing. Without
// unwrapping: a failed query looks identical to "genuinely zero rows" to
// react-query (data is undefined, error stays null), and a failed
// mutation still runs onSuccess - so a denied generate/delete would show
// a false "success" toast. `data` is intentionally not required to be
// present here: a successful DELETE's response has no `data` field.
async function unwrap<T>(promise: Promise<ApiResponse<T>>): Promise<T> {
  const response = await promise;
  if (!response.success) {
    throw new Error(response.error || 'Request failed');
  }
  return response.data as T;
}

export function useReports(params?: ReportParams) {
  const queryParams = new URLSearchParams();
  if (params?.type) queryParams.append('type', params.type);
  if (params?.status) queryParams.append('status', params.status);
  if (params?.startDate) queryParams.append('startDate', params.startDate);
  if (params?.endDate) queryParams.append('endDate', params.endDate);
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());

  return useQuery({
    queryKey: ['reports', params],
    queryFn: () => unwrap(apiGet<Report[]>(`/api/reports?${queryParams}`)),
  });
}

export function useReport(id: string | undefined) {
  return useQuery({
    queryKey: ['reports', 'detail', id],
    queryFn: () => unwrap(apiGet<Report>(`/api/reports/${id}`)),
    enabled: !!id,
    retry: false,
  });
}

export function useGenerateReport() {
  const queryClient = useQueryClient();

  return useMutation({
    // apiPost resolves (rather than rejects) even on a 403 from the
    // permission check in /api/reports/generate, so without unwrapping,
    // onSuccess below would fire - and show a false "success" toast - for
    // a role that was actually denied.
    mutationFn: (data: { type: string; dateRange?: string; startDate?: string; endDate?: string }) =>
      unwrap(apiPost<Report>('/api/reports/generate', data)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      toast.success('Report generation started');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to generate report');
    },
  });
}

export function useDownloadReport() {
  return useMutation({
    mutationFn: (report: any) => {
      // Generate CSV client-side
      const csvContent = generateReportCSV(report);
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `${report.name.replace(/\s+/g, '_')}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      return Promise.resolve({ success: true });
    },
    onSuccess: () => {
      toast.success('Report downloaded');
    },
    onError: (error: any) => {
      toast.error(error.error || 'Failed to download report');
    },
  });
}

export function generateReportCSV(report: any): string {
  const metadata = report.metadata || {};
  const type = report.type;
  
  let csv = '';
  let headers: string[] = [];
  let rows: any[] = [];
  
  switch (type) {
    case 'sales':
      headers = ['Metric', 'Value'];
      rows = [
        ['Total Revenue', metadata.totalRevenue || 0],
        ['Total Transactions', metadata.totalTransactions || 0],
        ['Average Transaction Value', metadata.averageTransactionValue || 0],
        ['Sales Count', metadata.salesCount || 0],
      ];
      break;
      
    case 'inventory':
      headers = ['Metric', 'Value'];
      rows = [
        ['Total Products', metadata.totalProducts || 0],
        ['Total Stock', metadata.totalStock || 0],
        ['Total Value', metadata.totalValue || 0],
        ['Low Stock Items', metadata.lowStockItems || 0],
      ];
      break;
      
    case 'customers':
      headers = ['Metric', 'Value'];
      rows = [
        ['Total Customers', metadata.totalCustomers || 0],
        ['New Customers', metadata.newCustomers || 0],
        ['Average Purchase Value', metadata.averagePurchaseValue || 0],
      ];
      break;
      
    case 'financial':
      headers = ['Metric', 'Value'];
      rows = [
        ['Revenue', metadata.revenue || 0],
        ['Expenses', metadata.expenses || 0],
        ['Profit', metadata.profit || 0],
        ['Profit Margin (%)', metadata.profitMargin || 0],
      ];
      break;
      
    default:
      headers = ['Key', 'Value'];
      rows = Object.entries(metadata).map(([key, value]) => [key, value]);
  }
  
  // Add report info
  csv += `Report Name,${report.name}\n`;
  csv += `Report Type,${report.type}\n`;
  csv += `Generated By,${report.generatedBy}\n`;
  csv += `Generated At,${new Date(report.generatedAt).toLocaleString()}\n`;
  csv += `Date Range,${report.dateRange?.start ? new Date(report.dateRange.start).toLocaleDateString() : 'N/A'} - ${report.dateRange?.end ? new Date(report.dateRange.end).toLocaleDateString() : 'N/A'}\n\n`;
  
  // Add data
  csv += headers.join(',') + '\n';
  rows.forEach(row => {
    csv += row.join(',') + '\n';
  });
  
  return csv;
}

export function useDeleteReport() {
  const queryClient = useQueryClient();

  return useMutation({
    // Same unwrap concern as useGenerateReport - a 403 or 404 from the
    // DELETE route must not be reported to the user as a success.
    mutationFn: (reportId: string) => unwrap(apiDelete(`/api/reports?id=${reportId}`)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      toast.success('Report deleted');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete report');
    },
  });
}
