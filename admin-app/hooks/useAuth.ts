'use client';

import { useState, useEffect } from 'react';
import { adminApi } from '@/lib/api-client';
import { useAsync } from './useApi';
import { User, ApiResponse } from '@/lib/types';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('admin_token');
    const userStr = localStorage.getItem('admin_user');

    if (token && userStr) {
      try {
        const userData = JSON.parse(userStr);
        setUser(userData);
        setIsAuthenticated(true);
      } catch (err) {
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_user');
      }
    }

    setLoading(false);
  }, []);

  const login = useAsync<ApiResponse>(
    async (email: string, password: string) => {
      const response = await adminApi.login(email, password);
      if (response.token && response.user) {
        setUser(response.user);
        setIsAuthenticated(true);
      }
      return response;
    },
    false
  );

  const logout = () => {
    adminApi.logout();
    setUser(null);
    setIsAuthenticated(false);
  };

  return {
    user,
    isAuthenticated,
    loading,
    login,
    logout,
  };
}
