import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Product, CartItem, User } from '../types';

interface CartStore {
  items: CartItem[];
  isLoading: boolean;
  addItem: (product: Product, quantity?: number, size?: string) => void;
  removeItem: (productId: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  clearCart: () => void;
  getTotalItems: () => number;
  getTotalPrice: () => number;
  syncWithServer: (token: string) => Promise<void>;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isLoading: false,

      addItem: (product, quantity = 1, size = 'M') => {
        set((state) => {
          const existingItem = state.items.find(
            (item) => item.product_id === product.id && item.size === size
          );

          if (existingItem) {
            return {
              items: state.items.map((item) =>
                item.product_id === product.id && item.size === size
                  ? { ...item, quantity: item.quantity + quantity }
                  : item
              ),
            };
          }

          const images = typeof product.images === 'string' 
            ? product.images 
            : product.images?.[0] || '';

          return {
            items: [
              ...state.items,
              {
                product_id: product.id,
                name: product.name,
                price: product.price,
                sale_price: product.sale_price,
                quantity,
                images,
                size,
              },
            ],
          };
        });
      },

      removeItem: (productId) => {
        set((state) => ({
          items: state.items.filter((item) => item.product_id !== productId),
        }));
      },

      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(productId);
          return;
        }
        set((state) => ({
          items: state.items.map((item) =>
            item.product_id === productId ? { ...item, quantity } : item
          ),
        }));
      },

      clearCart: () => set({ items: [] }),

      getTotalItems: () => {
        return get().items.reduce((sum, item) => sum + item.quantity, 0);
      },

      getTotalPrice: () => {
        return get().items.reduce(
          (sum, item) => sum + (item.sale_price || item.price) * item.quantity,
          0
        );
      },

      syncWithServer: async (token) => {
        const items = get().items;
        if (items.length === 0) return;

        try {
          for (const item of items) {
            await fetch('/api/cart', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                productId: item.product_id,
                quantity: item.quantity,
                size: item.size,
              }),
            });
          }
          get().clearCart();
        } catch (error) {
          console.error('Failed to sync cart:', error);
        }
      },
    }),
    {
      name: 'silvera-cart',
    }
  )
);

interface AuthStore {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: (user, token) => {
        localStorage.setItem('auth_token', token);
        set({ user, token, isAuthenticated: true });
      },

      logout: () => {
        localStorage.removeItem('auth_token');
        set({ user: null, token: null, isAuthenticated: false });
      },
    }),
    {
      name: 'silvera-auth',
    }
  )
);
