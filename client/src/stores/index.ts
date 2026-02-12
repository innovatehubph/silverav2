import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Product, CartItem, User } from '../types';

// =============================================================================
// THEME STORE
// =============================================================================

type Theme = 'dark' | 'light';

interface ThemeStore {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      
      setTheme: (theme) => {
        document.documentElement.setAttribute('data-theme', theme);
        set({ theme });
      },
      
      toggleTheme: () => {
        const newTheme = get().theme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        set({ theme: newTheme });
      },
    }),
    {
      name: 'silvera-theme',
      onRehydrateStorage: () => (state) => {
        // Apply theme on page load
        if (state?.theme) {
          document.documentElement.setAttribute('data-theme', state.theme);
        }
      },
    }
  )
);

// =============================================================================
// CART STORE
// =============================================================================

interface CartStore {
  items: CartItem[];
  isLoading: boolean;
  addItem: (product: Product, quantity?: number, size?: string, color?: string) => void;
  removeItem: (productId: number, size?: string, color?: string) => void;
  updateQuantity: (productId: number, quantity: number, size?: string, color?: string) => void;
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

      addItem: (product, quantity = 1, size, color) => {
        // Check authentication before adding to cart
        const authToken = localStorage.getItem('auth_token');
        if (!authToken) {
          window.location.href = '/login';
          return;
        }

        set((state) => {
          const matchItem = (item: CartItem) =>
            item.product_id === product.id &&
            item.size === size &&
            item.color === color;

          const existingItem = state.items.find(matchItem);

          if (existingItem) {
            return {
              items: state.items.map((item) =>
                matchItem(item)
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
                color,
              },
            ],
          };
        });
      },

      removeItem: (productId, size, color) => {
        set((state) => ({
          items: state.items.filter((item) =>
            !(item.product_id === productId && item.size === size && item.color === color)
          ),
        }));
      },

      updateQuantity: (productId, quantity, size, color) => {
        if (quantity <= 0) {
          get().removeItem(productId, size, color);
          return;
        }
        set((state) => ({
          items: state.items.map((item) =>
            item.product_id === productId && item.size === size && item.color === color
              ? { ...item, quantity }
              : item
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
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
