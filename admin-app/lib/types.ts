// Authentication Types
export interface User {
  id: number;
  email: string;
  name: string;
  role: string;
}

// Dashboard Types
export interface Order {
  id: number | string;
  customer_name?: string;
  status: 'pending' | 'completed' | 'cancelled' | 'processing';
  total: number;
}

export interface DashboardStats {
  totalOrders: number;
  totalRevenue: number;
  totalProducts: number;
  totalUsers: number;
  recentOrders: Order[];
}

// Product Types
export interface Product {
  id: number | string;
  name: string;
  description?: string;
  category_id?: number;
  category?: { id: number; name: string };
  price: number;
  sale_price?: number;
  stock: number;
  status: 'active' | 'draft' | 'inactive';
  featured: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ProductVariant {
  id: number | string;
  product_id: number;
  name: string;
  sku: string;
  price_modifier: number;
  stock: number;
  featured: boolean;
}

// Order Types
export interface OrderItem {
  id: number | string;
  product_id: number;
  product_name: string;
  quantity: number;
  price: number;
  subtotal: number;
}

export interface OrderDetails extends Order {
  customer_email?: string;
  customer_phone?: string;
  shipping_address?: string;
  payment_method?: string;
  payment_status?: 'pending' | 'paid' | 'failed' | 'refunded';
  items: OrderItem[];
  created_at?: string;
  updated_at?: string;
}

// Customer Types
export interface CustomerInfo extends User {
  phone?: string;
  total_orders?: number;
  total_spent?: number;
  registration_date?: string;
  addresses?: Address[];
}

export interface Address {
  id: number | string;
  user_id: number;
  street: string;
  city: string;
  state?: string;
  postal_code?: string;
  country?: string;
  is_default: boolean;
}

// Category Types
export interface Category {
  id: number | string;
  name: string;
  slug?: string;
  image?: string;
  product_count?: number;
  created_at?: string;
}

// Analytics Types
export interface AnalyticsMetric {
  label: string;
  value: number;
  change?: number;
  changeType?: 'increase' | 'decrease';
}

export interface SalesData {
  date: string;
  sales: number;
  revenue: number;
}

export interface AnalyticsDashboard {
  metrics: AnalyticsMetric[];
  salesTrend: SalesData[];
  topProducts: Product[];
  orderStatusDistribution: {
    [key: string]: number;
  };
}

// API Response Types
export interface ApiResponse<T = any> {
  success?: boolean;
  data?: T;
  error?: string;
  message?: string;
  token?: string;
  user?: User;
}

export interface ListResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
