'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api-client';
import { toast } from 'sonner';

export interface PurchaseOrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface PurchaseOrder {
  _id: string;
  orderNumber: string;
  supplierId: string;
  supplierName: string;
  items: PurchaseOrderItem[];
  totalAmount: number;
  status: 'pending' | 'approved' | 'partially_received' | 'delivered' | 'cancelled';
  orderDate: string;
  expectedDelivery?: string;
  actualDelivery?: string;
  notes?: string;
  createdBy: string;
  itemCount: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface PurchaseOrdersParams {
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export function usePurchaseOrders(params?: PurchaseOrdersParams) {
  const queryParams = new URLSearchParams();
  if (params?.search) queryParams.append('search', params.search);
  if (params?.status) queryParams.append('status', params.status);
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());

  return useQuery({
    queryKey: ['purchase-orders', params],
    queryFn: () => apiGet<PurchaseOrder[]>(`/api/purchase-orders?${queryParams.toString()}`),
    select: (data) => data.data ?? [],
  });
}

export function usePurchaseOrder(id: string) {
  return useQuery({
    queryKey: ['purchase-order', id],
    queryFn: () => apiGet<PurchaseOrder>(`/api/purchase-orders/${id}`),
    select: (data) => data.data,
    enabled: !!id,
  });
}

export function useCreatePurchaseOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<PurchaseOrder>) =>
      apiPost<PurchaseOrder>('/api/purchase-orders', data),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      toast.success('Purchase order created successfully');
    },

    onError: (error: any) => {
      toast.error(error?.error || 'Failed to create purchase order');
    },
  });
}

export function useApprovePurchaseOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiPost(`/api/purchase-orders/${id}/approve`, {}),

    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      queryClient.invalidateQueries({
        queryKey: ['purchase-order', id],
      });
      toast.success('Purchase order approved successfully');
    },

    onError: (error: any) => {
      toast.error(error?.error || 'Failed to approve purchase order');
    },
  });
}

export function useUpdatePurchaseOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<PurchaseOrder> }) =>
      apiPut<PurchaseOrder>(`/api/purchase-orders/${id}`, data),

    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      queryClient.invalidateQueries({
        queryKey: ['purchase-order', variables.id],
      });
      toast.success('Purchase order updated successfully');
    },

    onError: (error: any) => {
      toast.error(error?.error || 'Failed to update purchase order');
    },
  });
}

export function useDeletePurchaseOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiDelete(`/api/purchase-orders/${id}`),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      toast.success('Purchase order deleted successfully');
    },

    onError: (error: any) => {
      toast.error(error?.error || 'Failed to delete purchase order');
    },
  });
}
