'use client';

import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api-client';

export interface DashboardStats {
  totalRevenue?: number;
  todayRevenue?: number;
  todaySalesCount?: number;
  weeklyRevenue?: number;
  monthlyRevenue?: number;
  revenueChange?: number;
  totalProducts?: number;
  lowStockProducts?: number;
  outOfStockProducts?: number;
  totalEmployees?: number;
  totalCustomers?: number;
  pendingPurchaseOrders?: number;
  totalSuppliers?: number;
  itemsSoldToday?: number;
  activeSuppliers?: number;
  recentTransactions?: any[];
}

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => apiGet<DashboardStats>('/api/dashboard/stats'),
    select: (data) => data.data,
    staleTime: 30 * 1000,
  });
}

export function useSalesData(timeFilter: 'daily' | 'weekly' | 'monthly' | 'yearly' = 'monthly') {
  return useQuery({
    queryKey: ['sales-data', timeFilter],
    queryFn: () => apiGet<any[]>(`/api/dashboard/sales?filter=${timeFilter}`),
    select: (data) => data.data ?? [],
    staleTime: 60 * 1000,
  });
}

export function useLowStockAlerts() {
  return useQuery({
    queryKey: ['low-stock-alerts'],
    queryFn: () => apiGet<any[]>('/api/inventory/alerts/low-stock'),
    select: (data) => data.data ?? [],
    staleTime: 60 * 1000,
  });
}

export function useExpiringItems() {
  return useQuery({
    queryKey: ['expiring-items'],
    queryFn: () => apiGet<any[]>('/api/inventory/alerts/expiring'),
    select: (data) => data.data ?? [],
    staleTime: 60 * 1000,
  });
}
