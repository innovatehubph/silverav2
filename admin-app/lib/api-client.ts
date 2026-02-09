import axios, { AxiosInstance, AxiosError } from 'axios';
import { ApiResponse } from './types';

export class AdminApiClient {
  private client: AxiosInstance;
  private token: string | null = null;

  constructor(baseURL: string = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3865') {
    this.client = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true,
    });

    // Load token from localStorage (client-side only)
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('admin_token');
      if (this.token) {
        this.setAuthHeader(this.token);
      }
    }

    // Response interceptor for handling 401
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          this.logout();
        }
        return Promise.reject(error);
      }
    );
  }

  private setAuthHeader(token: string) {
    this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  public setToken(token: string) {
    this.token = token;
    localStorage.setItem('admin_token', token);
    this.setAuthHeader(token);
  }

  public getToken(): string | null {
    return this.token;
  }

  public logout() {
    this.token = null;
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    delete this.client.defaults.headers.common['Authorization'];
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  }

  // ===== AUTHENTICATION =====
  async login(email: string, password: string): Promise<ApiResponse> {
    try {
      const { data } = await this.client.post('/api/auth/login', { email, password });
      if (data.token) {
        this.setToken(data.token);
        localStorage.setItem('admin_user', JSON.stringify(data.user));
      }
      return data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // ===== DASHBOARD =====
  async getDashboard(): Promise<ApiResponse> {
    try {
      const { data } = await this.client.get('/api/admin/dashboard');
      return data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // ===== PRODUCTS =====
  async getProducts(): Promise<ApiResponse> {
    try {
      const { data } = await this.client.get('/api/admin/products');
      return data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getProduct(id: string): Promise<ApiResponse> {
    try {
      const { data } = await this.client.get(`/api/admin/products/${id}`);
      return data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async createProduct(formData: any): Promise<ApiResponse> {
    try {
      const { data } = await this.client.post('/api/admin/products', formData);
      return data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async updateProduct(id: string, formData: any): Promise<ApiResponse> {
    try {
      const { data } = await this.client.put(`/api/admin/products/${id}`, formData);
      return data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async deleteProduct(id: string): Promise<ApiResponse> {
    try {
      const { data } = await this.client.delete(`/api/admin/products/${id}`);
      return data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getProductVariants(productId: string): Promise<ApiResponse> {
    try {
      const { data } = await this.client.get(`/api/admin/products/${productId}/variants`);
      return data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async createProductVariant(productId: string, formData: any): Promise<ApiResponse> {
    try {
      const { data } = await this.client.post(`/api/admin/products/${productId}/variants`, formData);
      return data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // ===== ORDERS =====
  async getOrders(): Promise<ApiResponse> {
    try {
      const { data } = await this.client.get('/api/admin/orders');
      return data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getOrder(id: string): Promise<ApiResponse> {
    try {
      const { data } = await this.client.get(`/api/admin/orders/${id}`);
      return data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async updateOrderStatus(id: string, status: string, paymentStatus?: string): Promise<ApiResponse> {
    try {
      const { data } = await this.client.put(`/api/admin/orders/${id}`, {
        status,
        payment_status: paymentStatus,
      });
      return data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // ===== CUSTOMERS =====
  async getUsers(): Promise<ApiResponse> {
    try {
      const { data } = await this.client.get('/api/admin/users');
      return data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getUser(id: string): Promise<ApiResponse> {
    try {
      const { data } = await this.client.get(`/api/admin/users/${id}`);
      return data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getUserOrders(userId: string): Promise<ApiResponse> {
    try {
      const { data } = await this.client.get(`/api/admin/users/${userId}/orders`);
      return data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // ===== CATEGORIES =====
  async getCategories(): Promise<ApiResponse> {
    try {
      const { data } = await this.client.get('/api/admin/categories');
      return data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async createCategory(name: string, image?: string): Promise<ApiResponse> {
    try {
      const { data } = await this.client.post('/api/admin/categories', { name, image });
      return data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async updateCategory(id: string, name: string, image?: string): Promise<ApiResponse> {
    try {
      const { data } = await this.client.put(`/api/admin/categories/${id}`, { name, image });
      return data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async deleteCategory(id: string): Promise<ApiResponse> {
    try {
      const { data } = await this.client.delete(`/api/admin/categories/${id}`);
      return data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // ===== ANALYTICS =====
  async getAnalyticsDashboard(): Promise<ApiResponse> {
    try {
      const { data } = await this.client.get('/api/admin/analytics/dashboard');
      return data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getAnalyticsSales(startDate?: string, endDate?: string): Promise<ApiResponse> {
    try {
      const params = { startDate, endDate };
      const { data } = await this.client.get('/api/admin/analytics/sales', { params });
      return data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // ===== ERROR HANDLING =====
  private handleError(error: any): Error {
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.error || error.message || 'API request failed';
      return new Error(message);
    }
    return error instanceof Error ? error : new Error(String(error));
  }
}

// Singleton instance
export const adminApi = new AdminApiClient();
