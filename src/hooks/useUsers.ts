'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api-client';
import { toast } from 'sonner';

export interface User {
  _id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'cashier';
  status: 'active' | 'inactive';
  branch?: string;
  phone?: string;
  avatar?: string;
  lastLogin?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateUserInput extends Omit<Partial<User>, '_id'> {
  password: string;
}

export interface UsersParams {
  search?: string;
  role?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export function useUsers(params?: UsersParams) {
  const queryParams = new URLSearchParams();

  if (params?.search) queryParams.append('search', params.search);
  if (params?.role) queryParams.append('role', params.role);
  if (params?.status) queryParams.append('status', params.status);
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());

  return useQuery({
    queryKey: ['users', params],
    queryFn: () => apiGet<User[]>(`/api/users?${queryParams.toString()}`),
    select: (data) => data.data ?? [],
  });
}

export function useUser(id: string) {
  return useQuery({
    queryKey: ['user', id],
    queryFn: () => apiGet<User>(`/api/users/${id}`),
    select: (data) => data.data,
    enabled: !!id,
  });
}

export function useUsersStats() {
  return useQuery({
    queryKey: ['users-stats'],
    queryFn: () => apiGet<any>('/api/users/stats'),
    select: (data) => data.data,
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateUserInput) =>
      apiPost<User>('/api/users', data),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['users-stats'] });

      toast.success('User created successfully');
    },

    onError: (error: any) => {
      toast.error(error?.error || 'Failed to create user');
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<User>;
    }) => apiPut<User>(`/api/users/${id}`, data),

    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({
        queryKey: ['user', variables.id],
      });
      queryClient.invalidateQueries({
        queryKey: ['users-stats'],
      });

      toast.success('User updated successfully');
    },

    onError: (error: any) => {
      toast.error(error?.error || 'Failed to update user');
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiDelete(`/api/users/${id}`),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({
        queryKey: ['users-stats'],
      });

      toast.success('User deleted successfully');
    },

    onError: (error: any) => {
      toast.error(error?.error || 'Failed to delete user');
    },
  });
}

export function useSuspendUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiPut(`/api/users/${id}/suspend`, {}),

    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({
        queryKey: ['user', id],
      });

      toast.success('User suspended successfully');
    },

    onError: (error: any) => {
      toast.error(error?.error || 'Failed to suspend user');
    },
  });
}

export function useActivateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiPut(`/api/users/${id}/activate`, {}),

    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({
        queryKey: ['user', id],
      });

      toast.success('User activated successfully');
    },

    onError: (error: any) => {
      toast.error(error?.error || 'Failed to activate user');
    },
  });
}