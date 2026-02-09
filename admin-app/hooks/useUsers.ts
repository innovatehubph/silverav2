'use client';

import { adminApi } from '@/lib/api-client';
import { useApi, useAsync } from './useApi';

export function useUsers() {
  const { data, loading, error } = useApi(() => adminApi.getUsers());

  return {
    users: data || [],
    loading,
    error,
  };
}

export function useUser(id?: string) {
  const { data, loading, error } = useApi(
    () => (id ? adminApi.getUser(id) : Promise.resolve(null)),
    [id]
  );

  return { user: data, loading, error };
}

export function useUserOrders(userId?: string) {
  const { data, loading, error } = useApi(
    () => (userId ? adminApi.getUserOrders(userId) : Promise.resolve(null)),
    [userId]
  );

  return { orders: data || [], loading, error };
}
