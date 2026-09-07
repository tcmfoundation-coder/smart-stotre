'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiPut, apiDelete, ApiResponse } from '@/lib/api-client';
import { toast } from 'sonner';

export interface Product {
  _id: string;
  name: string;
  sku?: string;
  barcode?: string;
  categoryId?: { _id: string; name: string } | string;
  sellingPrice: number;
  buyingPrice?: number;
  stockQuantity: number;
  minStockLevel?: number;
  description?: string;
  images?: string[];
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductsParams {
  search?: string;
  category?: string;
  status?: string;
  page?: number;
  limit?: number;
  lowStock?: boolean;
  outOfStock?: boolean;
}

export function useProducts(params?: ProductsParams) {
  const queryParams = new URLSearchParams();
  if (params?.search) queryParams.append('search', params.search);
  if (params?.category) queryParams.append('category', params.category);
  if (params?.status) queryParams.append('status', params.status);
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.lowStock) queryParams.append('lowStock', 'true');
  if (params?.outOfStock) queryParams.append('outOfStock', 'true');

  return useQuery({
    queryKey: ['products', params],
    queryFn: () => apiGet<Product[]>(`/api/products?${queryParams}`),
    select: (data) => data.data ?? [],
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: ['product', id],
    queryFn: () => apiGet<Product>(`/api/products/${id}`),
    select: (data) => data.data,
    enabled: !!id,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<Product>) => apiPost<Product>('/api/products', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product created successfully');
    },
    onError: (error: any) => {
      toast.error(error.error || 'Failed to create product');
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Product> }) =>
      apiPut<Product>(`/api/products/${id}`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['product', variables.id] });
      toast.success('Product updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.error || 'Failed to update product');
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiDelete(`/api/products/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.error || 'Failed to delete product');
    },
  });
}
