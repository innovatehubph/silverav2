import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://silvera.innoserver.cloud:3865/api';

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
};

// Wishlist API
export const wishlistApi = {
  get: () => api.get('/wishlist'),
  add: (productId: number) => api.post('/wishlist', { productId }),
  remove: (productId: number) => api.delete(`/wishlist/${productId}`),
};

export default api;
