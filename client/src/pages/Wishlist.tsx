import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Heart, ShoppingBag, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { wishlistApi } from '../utils/api';
import { useCartStore, useWishlistStore } from '../stores';
import { SEO } from '../components/SEO';

interface WishlistItem {
  id: number;
  product_id: number;
  name: string;
  price: number;
  sale_price?: number;
  images: string;
}

export default function Wishlist() {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { addItem } = useCartStore();
  const { setCount: setWishlistCount } = useWishlistStore();

  useEffect(() => {
    wishlistApi.get()
      .then(res => {
        const data = res.data || [];
        setItems(data);
        setWishlistCount(data.length);
      })
      .catch(err => console.error('Failed to fetch wishlist:', err))
      .finally(() => setIsLoading(false));
  }, [setWishlistCount]);

  const handleRemove = async (productId: number) => {
    try {
      await wishlistApi.remove(productId);
      setItems(items.filter(item => item.product_id !== productId));
      setWishlistCount(items.length - 1);
      toast.success('Removed from wishlist');
    } catch {
      toast.error('Failed to remove item');
    }
  };

  const handleAddToCart = (item: WishlistItem) => {
    addItem({
      id: item.product_id,
      name: item.name,
      price: item.price,
      sale_price: item.sale_price,
      images: item.images,
    } as unknown as import('../types').Product);
    toast.success('Added to cart');
  };

  if (isLoading) {
    return (
      <div className="container-custom py-16 text-center">
        <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-txt-tertiary mt-4">Loading wishlist...</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="container-custom py-16 text-center">
        <div className="w-20 h-20 bg-bg-tertiary rounded-full flex items-center justify-center mx-auto mb-4">
          <Heart className="w-10 h-10 text-txt-tertiary" />
        </div>
        <h1 className="section-title">Your Wishlist is Empty</h1>
        <p className="text-txt-secondary mb-6">Save items you love for later</p>
        <Link to="/shop" className="btn-primary inline-block">Browse Shop</Link>
      </div>
    );
  }

  return (
    <>
      <SEO title="My Wishlist" description="Your saved products on Silvera PH. Add items to your wishlist and buy when you're ready." url="https://silvera.innoserver.cloud/wishlist" />
      <div className="container-custom py-8 animate-fade-in">
      <h1 className="section-title mb-8">My Wishlist ({items.length})</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {items.map((item) => {
          const imageUrl = typeof item.images === 'string'
            ? (item.images.startsWith('[') ? JSON.parse(item.images)[0] : item.images)
            : '/assets/images/product-images/01.webp';

          return (
            <div key={item.id} className="card overflow-hidden group">
              <Link to={`/product/${item.product_id}`}>
                <img
                  src={imageUrl}
                  alt={item.name}
                  className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                  width={400}
                  height={192}
                />
              </Link>
              <div className="p-4">
                <Link to={`/product/${item.product_id}`} className="font-medium text-txt-primary hover:text-gold transition-colors line-clamp-1">
                  {item.name}
                </Link>
                <div className="flex items-center gap-2 mt-1">
                  {item.sale_price ? (
                    <>
                      <span className="font-bold text-gold">₱{item.sale_price!.toFixed(2)}</span>
                      <span className="text-sm text-txt-tertiary line-through">₱{item.price.toFixed(2)}</span>
                    </>
                  ) : (
                    <span className="font-bold">₱{item.price.toFixed(2)}</span>
                  )}
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => handleAddToCart(item)}
                    className="btn-primary flex-1 text-sm py-2 flex items-center justify-center gap-1"
                  >
                    <ShoppingBag className="w-4 h-4" /> Add to Cart
                  </button>
                  <button
                    onClick={() => handleRemove(item.product_id)}
                    className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
    </>
  );
}
