"use client";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api-client';
import { toast } from 'sonner';

export interface Promotion {
  _id: string;
  name: string;
  description?: string;
  type: 'percentage' | 'fixed' | 'buy-one-get-one';
  value: number;
  startDate: string;
  endDate?: string;
  categoryIds?: string[];
  productIds?: string[];
  // Resolved display names for categoryIds/productIds, filled in by the API.
  categories?: string[];
  products?: string[];
  status: 'active' | 'paused' | 'scheduled';
  // status with an expired endDate taken into account - what the UI should show.
  effectiveStatus: 'active' | 'paused' | 'scheduled' | 'expired';
  minPurchase?: number;
  maxDiscount?: number;
  usageLimit?: number;
  usageCount?: number;
  createdAt?: string;
}

export interface PromotionsParams {
  search?: string;
  status?: string;
  type?: string;
  page?: number;
  limit?: number;
}

export function usePromotions(params?: PromotionsParams) {
  const queryParams = new URLSearchParams();

  if (params?.search) queryParams.append('search', params.search);
  if (params?.status) queryParams.append('status', params.status);
  if (params?.type) queryParams.append('type', params.type);
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());

  return useQuery({
    queryKey: ['promotions', params],
    queryFn: () => apiGet<Promotion[]>(`/api/promotions?${queryParams.toString()}`),
    select: (data) => data.data ?? [],
  });
}

export function usePromotion(id: string) {
  return useQuery({
    queryKey: ['promotion', id],
    queryFn: () => apiGet<Promotion>(`/api/promotions/${id}`),
    select: (data) => data.data,
    enabled: !!id,
  });
}

export function usePromotionsStats() {
  return useQuery({
    queryKey: ['promotions-stats'],
    queryFn: () => apiGet<any>('/api/promotions/stats'),
    select: (data) => data.data,
  });
}

export function useCreatePromotion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<Promotion>) =>
      apiPost<Promotion>('/api/promotions', data),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promotions'] });
      queryClient.invalidateQueries({ queryKey: ['promotions-stats'] });

      toast.success('Promotion created successfully');
    },

    onError: (error: any) => {
      toast.error(error?.error || 'Failed to create promotion');
    },
  });
}

export function useUpdatePromotion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<Promotion>;
    }) => apiPut<Promotion>(`/api/promotions/${id}`, data),

    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['promotions'] });
      queryClient.invalidateQueries({
        queryKey: ['promotion', variables.id],
      });
      queryClient.invalidateQueries({ queryKey: ['promotions-stats'] });

      toast.success('Promotion updated successfully');
    },

    onError: (error: any) => {
      toast.error(error?.error || 'Failed to update promotion');
    },
  });
}

export function useDeletePromotion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiDelete(`/api/promotions/${id}`),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promotions'] });
      queryClient.invalidateQueries({ queryKey: ['promotions-stats'] });

      toast.success('Promotion deleted successfully');
    },

    onError: (error: any) => {
      toast.error(error?.error || 'Failed to delete promotion');
    },
  });
}

/**
 * Pause Promotion
 */
export function usePausePromotion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiPut(`/api/promotions/${id}/pause`, {}),

    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['promotions'] });
      queryClient.invalidateQueries({
        queryKey: ['promotion', id],
      });
      queryClient.invalidateQueries({
        queryKey: ['promotions-stats'],
      });

      toast.success('Promotion paused successfully');
    },

    onError: (error: any) => {
      toast.error(error?.error || 'Failed to pause promotion');
    },
  });
}

/**
 * Resume Promotion
 */
export function useResumePromotion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiPut(`/api/promotions/${id}/resume`, {}),

    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['promotions'] });
      queryClient.invalidateQueries({
        queryKey: ['promotion', id],
      });
      queryClient.invalidateQueries({
        queryKey: ['promotions-stats'],
      });

      toast.success('Promotion resumed successfully');
    },

    onError: (error: any) => {
      toast.error(error?.error || 'Failed to resume promotion');
    },
  });
}