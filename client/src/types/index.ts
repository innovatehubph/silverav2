export interface ProductVariantColor {
  name: string;
  hex: string;
}

export interface ProductVariants {
  sizes?: string[];
  colors?: ProductVariantColor[];
}

export interface Product {
  id: number;
  name: string;
  slug: string;
  description: string;
  price: number;
  sale_price?: number;
  category_id: number;
  category_name?: string;
  images: string[] | string;
  stock: number;
  featured: boolean;
  status: 'active' | 'inactive' | 'draft';
  rating?: number;
  variants?: string | ProductVariants;
  created_at: string;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  image?: string;
  parent_id?: number;
}

export interface CartItem {
  product_id: number;
  name: string;
  price: number;
  sale_price?: number;
  quantity: number;
  images?: string;
  size?: string;
  color?: string;
}

export interface User {
  id: number;
  email: string;
  name: string;
  phone?: string;
  role: 'customer' | 'admin';
}

export interface Review {
  id: number;
  product_id: number;
  user_id: number;
  user_name?: string;
  rating: number;
  title: string;
  comment: string;
  created_at: string;
}

export interface Order {
  id: number;
  user_id: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  total: number;
  shipping_address: string;
  payment_method: string;
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
  tracking_number?: string;
  carrier?: string;
  shipped_at?: string;
  delivered_at?: string;
  items: CartItem[];
  created_at: string;
}

export interface ReturnRequest {
  id: number;
  order_id: number;
  user_id: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'refunded';
  admin_notes?: string;
  refund_amount?: number;
  created_at: string;
  resolved_at?: string;
  customer_name?: string;
  customer_email?: string;
  order_total?: number;
  order_status?: string;
  order_payment_status?: string;
}
