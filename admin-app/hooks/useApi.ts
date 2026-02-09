'use client';

import { useState, useEffect, useCallback } from 'react';

export interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/**
 * Generic API hook for fetching data
 */
export function useApi<T>(
  fn: () => Promise<any>,
  dependencies: any[] = []
): ApiState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await fn();
        if (isMounted) {
          setData(result);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'An error occurred');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, dependencies);

  return { data, loading, error };
}

/**
 * Hook for async functions with manual trigger
 * Supports both no-arg and parameterized async functions
 */
export function useAsync<T, E = string>(
  asyncFn: (...args: any[]) => Promise<T>,
  immediate = false
) {
  const [status, setStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<E | null>(null);

  const execute = useCallback(
    async (...args: any[]) => {
      setStatus('pending');
      setData(null);
      setError(null);
      try {
        const response = await asyncFn(...args);
        setData(response);
        setStatus('success');
        return response;
      } catch (error) {
        setError(error as E);
        setStatus('error');
        throw error;
      }
    },
    [asyncFn]
  );

  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [execute, immediate]);

  return { execute, status, data, error };
}
