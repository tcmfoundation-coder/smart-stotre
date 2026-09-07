'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost } from '@/lib/api-client';
import { toast } from 'sonner';

export interface ShiftPaymentTotals {
  cash: number;
  card: number;
  transfer: number;
  paystack: number;
}

export interface Shift {
  id: string;
  _id: string;
  openedAt: string;
  closedAt?: string;
  openedBy: string;
  openedByName: string;
  closedBy?: string;
  closedByName?: string;
  openingCashBalance: number;
  closingCashBalance?: number;
  expectedCash?: number;
  actualCash?: number;
  cashVariance?: number;
  salesCount: number;
  salesTotal: number;
  refundsCount: number;
  refundsTotal: number;
  paymentMethodTotals: ShiftPaymentTotals;
  status: 'open' | 'closed';
}

export function useCurrentShift() {
  return useQuery({
    queryKey: ['shift-current'],
    queryFn: () => apiGet<Shift | null>('/api/shifts/current'),
    select: (data) => data.data ?? null,
    refetchInterval: 30_000,
  });
}

export function useShifts(params?: { status?: 'open' | 'closed' }) {
  const queryParams = new URLSearchParams();
  if (params?.status) queryParams.append('status', params.status);

  return useQuery({
    queryKey: ['shifts', params],
    queryFn: () => apiGet<Shift[]>(`/api/shifts?${queryParams.toString()}`),
    select: (data) => data.data ?? [],
  });
}

export function useOpenShift() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (openingCashBalance: number) => apiPost<Shift>('/api/shifts/open', { openingCashBalance }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift-current'] });
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      toast.success('Shift opened');
    },
    onError: (error: { error?: string }) => {
      toast.error(error?.error || 'Failed to open shift');
    },
  });
}

export function useCloseShift() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, actualCash }: { id: string; actualCash: number }) =>
      apiPost<Shift>(`/api/shifts/${id}/close`, { actualCash }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift-current'] });
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      toast.success('Shift closed');
    },
    onError: (error: { error?: string }) => {
      toast.error(error?.error || 'Failed to close shift');
    },
  });
}
