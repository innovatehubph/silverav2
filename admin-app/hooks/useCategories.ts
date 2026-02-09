'use client';

import { adminApi } from '@/lib/api-client';
import { useApi, useAsync } from './useApi';

export function useCategories() {
  const { data, loading, error } = useApi(() => adminApi.getCategories());

  const create = useAsync(() => Promise.resolve(null), false);
  const update = useAsync(() => Promise.resolve(null), false);
  const remove = useAsync(() => Promise.resolve(null), false);

  return {
    categories: data || [],
    loading,
    error,
    create,
    update,
    remove,
  };
}
