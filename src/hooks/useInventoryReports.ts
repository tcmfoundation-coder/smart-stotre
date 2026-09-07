'use client';

import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api-client';

export interface InventoryReportMetrics {
  totalInventoryValue: number;
  averageInventoryValue: number;
  cogs: number;
  turnoverRatio: number | null;
  lowStockCount: number;
  outOfStockCount: number;
}

export interface CategoryInventoryBreakdown {
  categoryId: string;
  category: string;
  totalValue: number;
  averageInventoryValue: number;
  cogs: number;
  turnoverRatio: number | null;
  lowStock: number;
  outOfStock: number;
}

export interface InventoryReportData {
  metrics: InventoryReportMetrics;
  categoryBreakdown: CategoryInventoryBreakdown[];
  limitations: string[];
}

export interface InventoryReportParams {
  dateRange?: 'today' | 'week' | 'month' | 'quarter';
  startDate?: string;
  endDate?: string;
  category?: string;
}

export function useInventoryReports(params?: InventoryReportParams) {
  const queryParams = new URLSearchParams();
  if (params?.dateRange) queryParams.append('dateRange', params.dateRange);
  if (params?.startDate) queryParams.append('startDate', params.startDate);
  if (params?.endDate) queryParams.append('endDate', params.endDate);
  if (params?.category) queryParams.append('category', params.category);

  return useQuery({
    queryKey: ['inventory-reports', params],
    queryFn: () => apiGet<InventoryReportData>(`/api/inventory-reports?${queryParams}`),
    select: (data) => data.data,
  });
}

export type MovementType = 'SALE' | 'PURCHASE' | 'ADJUSTMENT' | 'RETURN' | 'OTHER';

export interface MovementEntry {
  id: string;
  type: MovementType;
  date: string;
  productId: string;
  productName: string;
  sku: string;
  quantityChange: number;
  reference: string;
  performedBy: string;
}

export interface MovementsData {
  movements: MovementEntry[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
  notes: string[];
}

export interface MovementParams extends InventoryReportParams {
  type?: MovementType;
  search?: string;
  page?: number;
  limit?: number;
}

export function useInventoryMovements(params?: MovementParams) {
  const queryParams = new URLSearchParams();
  if (params?.dateRange) queryParams.append('dateRange', params.dateRange);
  if (params?.startDate) queryParams.append('startDate', params.startDate);
  if (params?.endDate) queryParams.append('endDate', params.endDate);
  if (params?.type) queryParams.append('type', params.type);
  if (params?.search) queryParams.append('search', params.search);
  if (params?.page) queryParams.append('page', String(params.page));
  if (params?.limit) queryParams.append('limit', String(params.limit));

  return useQuery({
    queryKey: ['inventory-movements', params],
    queryFn: () => apiGet<MovementsData>(`/api/inventory-reports/movements?${queryParams}`),
    select: (data) => data.data,
  });
}
