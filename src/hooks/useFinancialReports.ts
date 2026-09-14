'use client';

import { useQuery } from '@tanstack/react-query';
import { apiGet, ApiResponse } from '@/lib/api-client';

// apiGet resolves to { success:false, error } on an HTTP-level failure
// (e.g. a 403 from view_financial_reports, or a 500) rather than
// throwing, so without unwrapping, react-query's `error` never populates
// on a real backend failure - the page would render `data: undefined` as
// if the period genuinely had no financial activity instead of showing
// its "Failed to load financial reports" retry state.
async function unwrap<T>(promise: Promise<ApiResponse<T>>): Promise<T> {
  const response = await promise;
  if (!response.success) {
    throw new Error(response.error || 'Request failed');
  }
  return response.data as T;
}

export interface FinancialMetrics {
  totalRevenue: number;
  netProfit: number;
  totalExpenses: number;
  profitMargin: number;
  revenueChange: number;
  profitChange: number;
  expensesChange: number;
  marginChange: number;
}

export interface ExpenseBreakdown {
  category: string;
  amount: number;
  percentage: number;
}

export interface RevenueByCategory {
  category: string;
  amount: number;
  percentage: number;
}

export interface FinancialData {
  metrics: FinancialMetrics;
  expenseBreakdown: ExpenseBreakdown[];
  revenueByCategory: RevenueByCategory[];
}

export interface FinancialParams {
  startDate?: string;
  endDate?: string;
  dateRange?: 'today' | 'week' | 'month' | 'quarter' | 'year';
}

export function useFinancialReports(params?: FinancialParams) {
  const queryParams = new URLSearchParams();
  if (params?.startDate) queryParams.append('startDate', params.startDate);
  if (params?.endDate) queryParams.append('endDate', params.endDate);
  if (params?.dateRange) queryParams.append('dateRange', params.dateRange);

  return useQuery({
    queryKey: ['financial-reports', params],
    queryFn: () => unwrap(apiGet<FinancialData>(`/api/financial-reports?${queryParams}`)),
  });
}
