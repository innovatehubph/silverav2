'use client';

import { adminApi } from '@/lib/api-client';
import { useApi } from './useApi';
import { DashboardStats } from '@/lib/types';

export function useDashboard() {
  const { data, loading, error } = useApi<DashboardStats>(() => adminApi.getDashboard());

  return {
    stats: data,
    loading,
    error,
  };
}
