import { Link } from 'react-router-dom';
import { ShoppingCart, Heart } from 'lucide-react';
import { useCartStore } from '../../stores';
import { parseProductImages, getDiscountPercentage } from '../../utils/product';
import type { Product } from '../../types';

interface ProductCardProps {
  product: Product;
  showWishlist?: boolean;
}

export default function ProductCard({ product, showWishlist = true }: ProductCardProps) {
  const { addItem } = useCartStore();

  const imageUrl = parseProductImages(product.images)[0];
  const discountPercentage = getDiscountPercentage(product.price, product.sale_price);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem(product, 1);
  };

  return (
    <Link to={`/product/${product.id}`} className="group">
      <div className="card card-hover">
        <div className="relative overflow-hidden">
          <img
            src={imageUrl}
            alt={product.name}
            className="w-full h-48 md:h-64 object-cover transform group-hover:scale-105 transition-transform duration-500"
            onError={(e) => {
              const img = e.target as HTMLImageElement;
              if (!img.dataset.fallback) {
                img.dataset.fallback = '1';
                img.src = '/assets/images/product-images/01.webp';
              }
            }}
          />
          
          {/* Discount Badge */}
          {discountPercentage > 0 && (
            <span className="absolute top-3 left-3 badge-gold">
              -{discountPercentage}%
            </span>
          )}
          
          {/* Featured Badge */}
          {product.featured && !discountPercentage && (
            <span className="absolute top-3 left-3 badge-primary">
              Featured
            </span>
          )}
          
          {/* Actions */}
          <div className="absolute top-3 right-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            {showWishlist && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                className="w-10 h-10 bg-white rounded-full shadow-md flex items-center justify-center hover:bg-gray-50 transition-colors"
              >
                <Heart className="w-5 h-5 text-gray-600" />
              </button>
            )}
            <button
              onClick={handleAddToCart}
              className="w-10 h-10 bg-primary-600 rounded-full shadow-md flex items-center justify-center hover:bg-primary-700 transition-colors"
            >
              <ShoppingCart className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
        
        <div className="p-4">
          <h3 className="font-medium text-gray-900 mb-1 line-clamp-1 group-hover:text-primary-600 transition-colors">
            {product.name}
          </h3>
          
          <p className="text-sm text-gray-500 mb-2 line-clamp-1">
            {product.description || 'Premium quality product'}
          </p>
          
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg text-gray-900">
              ₱{(product.sale_price || product.price).toFixed(2)}
            </span>
            
            {product.sale_price && product.price !== product.sale_price && (
              <span className="text-sm text-gray-400 line-through">
                ₱{product.price.toFixed(2)}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
