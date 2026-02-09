'use client';

import { useState, useCallback } from 'react';
import { adminApi } from '@/lib/api-client';
import { useApi, useAsync } from './useApi';

export function useOrders() {
  const { data, loading, error } = useApi(() => adminApi.getOrders());

  const updateStatus = useAsync(() => Promise.resolve(null), false);

  return {
    orders: data || [],
    loading,
    error,
    updateStatus,
  };
}

export function useOrder(id?: string) {
  const { data, loading, error } = useApi(
    () => (id ? adminApi.getOrder(id) : Promise.resolve(null)),
    [id]
  );

  return { order: data, loading, error };
}

export function useOrderActions() {
  const updateStatus = useAsync(() => Promise.resolve(null), false);

  return { updateStatus };
}
