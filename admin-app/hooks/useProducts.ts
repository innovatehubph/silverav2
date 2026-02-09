'use client';

import { useState, useCallback } from 'react';
import { adminApi } from '@/lib/api-client';
import { useApi, useAsync } from './useApi';

export function useProducts() {
  const { data, loading, error } = useApi(() => adminApi.getProducts());

  const create = useAsync(() => adminApi.createProduct({}), false);
  const update = useAsync(() => Promise.resolve(null), false);
  const remove = useAsync(() => Promise.resolve(null), false);

  return {
    products: data || [],
    loading,
    error,
    create,
    update,
    remove,
  };
}

export function useProduct(id?: string) {
  const { data, loading, error } = useApi(
    () => (id ? adminApi.getProduct(id) : Promise.resolve(null)),
    [id]
  );

  return { product: data, loading, error };
}

export function useProductVariants(productId: string) {
  const { data, loading, error } = useApi(
    () => adminApi.getProductVariants(productId),
    [productId]
  );

  const create = useAsync(
    () => adminApi.createProductVariant(productId, {}),
    false
  );

  return {
    variants: data || [],
    loading,
    error,
    create,
  };
}
