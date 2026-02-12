import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Products API
export const productsApi = {
  getAll: (params?: { limit?: number; category?: string }) =>
    api.get('/products', { params }),
  getById: (id: number) => api.get(`/products/${id}`),
  getReviews: (id: number) => api.get(`/products/${id}/reviews`),
  createReview: (id: number, data: { rating: number; title: string; comment: string }) =>
    api.post(`/products/${id}/reviews`, data),
};

// Categories API
export const categoriesApi = {
  getAll: () => api.get('/categories'),
};

// Auth API
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  register: (data: { name: string; email: string; password: string; phone?: string }) =>
    api.post('/auth/register', data),
  forgotPassword: (email: string) =>
    api.post('/auth/forgot-password', { email }),
  resetPassword: (token: string, password: string) =>
    api.post('/auth/reset-password', { token, password }),
  me: () => api.get('/auth/me'),
};

// Cart API
export const cartApi = {
  get: () => api.get('/cart'),
  add: (productId: number, quantity: number, size?: string) =>
    api.post('/cart', { productId, quantity, size }),
  update: (productId: number, quantity: number) =>
    api.put('/cart', { productId, quantity }),
  remove: (productId: number) => api.delete(`/cart/${productId}`),
  clear: () => api.delete('/cart'),
};

// Orders API
export const ordersApi = {
  getAll: () => api.get('/orders'),
  getById: (id: number) => api.get(`/orders/${id}`),
  create: (data: {
    items: { product_id: number; quantity: number }[];
    shipping_address: string;
    payment_method: string;
  }) => api.post('/orders', data),
  requestReturn: (orderId: number, reason: string) =>
    api.post(`/orders/${orderId}/return`, { reason }),
  getReturn: (orderId: number) => api.get(`/orders/${orderId}/return`),
};

// Payments API
export const paymentsApi = {
  getMethods: () => api.get('/payments/methods'),
  create: (data: {
    order_id: number;
    payment_method: string;
    payment_type: string;
  }) => api.post('/payments/qrph/create', data),
  getStatus: (paymentRef: string) =>
    api.get(`/payments/${paymentRef}/status`),
  callback: (data: {
    ref: string;
    status: string;
    amount?: string;
    timestamp?: number;
    signature?: string;
  }) => api.post('/payments/callback', data),
};

// Wishlist API
export const wishlistApi = {
  get: () => api.get('/wishlist'),
  add: (productId: number) => api.post('/wishlist', { productId }),
  remove: (productId: number) => api.delete(`/wishlist/${productId}`),
};

// Admin API
export const adminApi = {
  getDashboard: () => api.get('/admin/dashboard'),
  
  // Products CRUD
  getProducts: () => api.get('/admin/products'),
  createProduct: (data: FormData) => api.post('/admin/products', data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  updateProduct: (id: number, data: FormData) => api.put(`/admin/products/${id}`, data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  deleteProduct: (id: number) => api.delete(`/admin/products/${id}`),
  
  // Orders CRUD
  getOrders: (params?: { status?: string; payment_status?: string; search?: string; start_date?: string; end_date?: string }) =>
    api.get('/admin/orders', { params }),
  getOrder: (id: number) => api.get(`/admin/orders/${id}`),
  updateOrder: (id: number, data: { status?: string; payment_status?: string; tracking_number?: string; carrier?: string }) =>
    api.put(`/admin/orders/${id}`, data),
  updateOrderTracking: (id: number, tracking_number: string, carrier?: string) =>
    api.put(`/admin/orders/${id}/tracking`, { tracking_number, carrier }),
  addOrderNote: (id: number, note: string) =>
    api.post(`/admin/orders/${id}/notes`, { note }),
  
  // Users CRUD
  getUsers: () => api.get('/admin/users'),
  getUser: (id: number) => api.get(`/admin/users/${id}`),
  updateUser: (id: number, data: { name: string; email: string; phone?: string }) =>
    api.put(`/admin/users/${id}`, data),
  changeUserRole: (id: number, role: 'customer' | 'admin') =>
    api.put(`/admin/users/${id}/role`, { role }),
  changeUserStatus: (id: number, is_active: boolean) =>
    api.put(`/admin/users/${id}/status`, { is_active }),
  resetUserPassword: (id: number) =>
    api.post(`/admin/users/${id}/reset-password`),
  deleteUser: (id: number, hard?: boolean) =>
    api.delete(`/admin/users/${id}${hard ? '?hard=true' : ''}`),
  
  // Categories CRUD
  getCategories: () => api.get('/admin/categories'),
  createCategory: (data: { name: string; slug?: string; description?: string; image?: string }) =>
    api.post('/admin/categories', data),
  updateCategory: (id: number, data: { name: string; slug?: string; description?: string; image?: string }) =>
    api.put(`/admin/categories/${id}`, data),
  deleteCategory: (id: number) => api.delete(`/admin/categories/${id}`),
  uploadCategoryImage: (data: FormData) => api.post('/admin/upload/category-image', data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  
  // Reports & Analytics
  getReportsSales: (period?: string) =>
    api.get('/admin/reports/sales', { params: { period } }),
  getReportsRevenue: (period?: string) =>
    api.get('/admin/reports/revenue', { params: { period } }),
  getReportsTopProducts: (limit?: number) =>
    api.get('/admin/reports/top-products', { params: { limit } }),
  getReportsOrdersByStatus: () =>
    api.get('/admin/reports/orders-by-status'),
  getReportsCustomers: (period?: string) =>
    api.get('/admin/reports/customers', { params: { period } }),
  
  // Performance Monitoring
  getPerformanceMetrics: () => api.get('/admin/performance/metrics'),

  // Returns
  getReturns: () => api.get('/admin/returns'),
  processReturn: (id: number, data: { status: 'approved' | 'rejected'; admin_notes?: string }) =>
    api.put(`/admin/returns/${id}`, data),

  // Coupons CRUD
  getCoupons: () => api.get('/admin/coupons'),
  createCoupon: (data: {
    code: string;
    type: 'percentage' | 'fixed';
    value: number;
    min_order_amount?: number;
    max_uses?: number;
    is_active?: boolean;
    starts_at?: string | null;
    expires_at?: string | null;
  }) => api.post('/admin/coupons', data),
  updateCoupon: (id: number, data: {
    code?: string;
    type?: 'percentage' | 'fixed';
    value?: number;
    min_order_amount?: number;
    max_uses?: number;
    is_active?: boolean;
    starts_at?: string | null;
    expires_at?: string | null;
  }) => api.put(`/admin/coupons/${id}`, data),
  deleteCoupon: (id: number) => api.delete(`/admin/coupons/${id}`),
};

// Coupons API (public)
export const couponsApi = {
  validate: (code: string, order_total: number) =>
    api.post('/coupons/validate', { code, order_total }),
};

export default api;
