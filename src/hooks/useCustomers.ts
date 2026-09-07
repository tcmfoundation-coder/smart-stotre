'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiPut, apiDelete, ApiResponse } from '@/lib/api-client';
import { toast } from 'sonner';

export interface Customer {
  _id: string;
  customerId?: string;
  name: string;
  email?: string;
  phone: string;
  address?: string;
  customerType?: 'walk-in' | 'registered' | 'vip' | 'corporate';
  loyaltyPoints: number;
  totalSpent: number;
  purchaseCount: number;
  lastPurchaseDate?: string;
  notes?: string;
  createdAt?: string;
  updatedAt: string;
}

export interface CustomersParams {
  search?: string;
  page?: number;
  limit?: number;
}

export function useCustomers(params?: CustomersParams) {
  const queryParams = new URLSearchParams();
  if (params?.search) queryParams.append('search', params.search);
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());

  return useQuery({
    queryKey: ['customers', params],
    queryFn: () => apiGet<Customer[]>(`/api/customers?${queryParams}`),
    select: (data) => data.data ?? [],
  });
}

export function useCustomer(id: string) {
  return useQuery({
    queryKey: ['customer', id],
    queryFn: () => apiGet<Customer>(`/api/customers/${id}`),
    select: (data) => data.data,
    enabled: !!id,
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<Customer>) => apiPost<Customer>('/api/customers', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Customer created successfully');
    },
    onError: (error: any) => {
      toast.error(error.error || 'Failed to create customer');
    },
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Customer> }) =>
      apiPut<Customer>(`/api/customers/${id}`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customer', variables.id] });
      toast.success('Customer updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.error || 'Failed to update customer');
    },
  });
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiDelete(`/api/customers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Customer deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.error || 'Failed to delete customer');
    },
  });
}
