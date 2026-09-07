'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost } from '@/lib/api-client';
import { toast } from 'sonner';

export interface ReturnItem {
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitRefundPrice: number;
  refundAmount: number;
  reason: string;
  restocked: boolean;
}

export interface ReturnRecord {
  id: string;
  _id: string;
  returnNumber: string;
  saleId: string;
  saleNumber: string;
  customerId?: string;
  customerName?: string;
  items: ReturnItem[];
  totalRefund: number;
  refundMethod: 'cash' | 'card' | 'transfer' | 'paystack';
  status: 'completed';
  processedBy: string;
  date: string;
  createdAt: string;
}

export interface SaleLookupItem {
  productId: string;
  productName: string;
  sku: string;
  quantitySold: number;
  quantityAlreadyReturned: number;
  quantityReturnable: number;
  unitRefundPrice: number;
}

export interface SaleLookupResult {
  saleId: string;
  saleNumber: string;
  customerId?: string;
  customerName?: string;
  total: number;
  totalAlreadyRefunded: number;
  totalRefundable: number;
  items: SaleLookupItem[];
}

export function useReturns(params?: { search?: string }) {
  const queryParams = new URLSearchParams();
  if (params?.search) queryParams.append('search', params.search);

  return useQuery({
    queryKey: ['returns', params],
    queryFn: () => apiGet<ReturnRecord[]>(`/api/returns?${queryParams.toString()}`),
    select: (data) => data.data ?? [],
  });
}

export async function lookupSaleForReturn(saleNumber: string): Promise<SaleLookupResult> {
  const response = await apiGet<SaleLookupResult>(`/api/returns/lookup?saleNumber=${encodeURIComponent(saleNumber)}`);
  if (!response.data) {
    throw new Error(response.error || 'Sale not found');
  }
  return response.data;
}

export interface ProcessReturnInput {
  saleId: string;
  refundMethod: 'cash' | 'card' | 'transfer' | 'paystack';
  items: Array<{ productId: string; quantity: number; reason: string; restock: boolean }>;
}

export function useProcessReturn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ProcessReturnInput) => apiPost<ReturnRecord>('/api/returns', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['returns'] });
      toast.success('Return processed successfully');
    },
    onError: (error: { error?: string }) => {
      toast.error(error?.error || 'Failed to process return');
    },
  });
}
