import { Link } from 'react-router-dom';
import { ShoppingCart, Heart, Tag } from 'lucide-react';
import { useCartStore } from '../../stores';
import { parseProductImages, getDiscountPercentage } from '../../utils/product';
import OptimizedImage from '../OptimizedImage';
import type { Product } from '../../types';

interface ProductCardProps {
  product: Product;
  showWishlist?: boolean;
  viewMode?: 'grid' | 'list';
}

export default function ProductCard({ product, showWishlist = true, viewMode = 'grid' }: ProductCardProps) {
  const { addItem } = useCartStore();

  const imageUrl = parseProductImages(product.images)[0];
  const discountPercentage = getDiscountPercentage(product.price, product.sale_price);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem(product, 1);
  };

  // List View
  if (viewMode === 'list') {
    return (
      <Link to={`/product/${product.id}`} className="group">
        <div className="card card-hover hover-glow flex flex-col md:flex-row">
          {/* Image */}
          <div className="relative overflow-hidden md:w-48 md:flex-shrink-0">
            <OptimizedImage
              src={imageUrl}
              alt={product.name}
              className="w-full h-48 md:h-full"
              sizes="(max-width: 640px) 100vw, 200px"
            />
            
            {/* Discount Badge */}
            {discountPercentage > 0 && (
              <span className="absolute top-3 left-3 bg-gold/90 text-bg-primary text-xs font-semibold px-3 py-1 rounded-full">
                -{discountPercentage}%
              </span>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 p-4 md:p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between gap-4 mb-2">
                <h3 className="font-semibold text-txt-primary text-lg group-hover:text-gold transition-colors">
                  {product.name}
                </h3>
                {showWishlist && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    className="p-2 rounded-full hover:bg-bg-hover transition-colors"
                  >
                    <Heart className="w-5 h-5 text-txt-tertiary hover:text-gold transition-colors" />
                  </button>
                )}
              </div>

              {product.category_name && (
                <span className="inline-flex items-center gap-1 text-xs text-txt-tertiary mb-2">
                  <Tag className="w-3 h-3" />
                  {product.category_name}
                </span>
              )}

              <p className="text-sm text-txt-secondary line-clamp-2 mb-4">
                {product.description || 'Premium quality product with exceptional craftsmanship.'}
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="font-bold text-xl text-gold">
                  ₱{(product.sale_price || product.price).toFixed(2)}
                </span>
                {product.sale_price && product.price !== product.sale_price && (
                  <span className="text-sm text-txt-tertiary line-through">
                    ₱{product.price.toFixed(2)}
                  </span>
                )}
              </div>

              <button
                onClick={handleAddToCart}
                className="flex items-center gap-2 bg-gold hover:bg-gold-300 text-bg-primary px-4 py-2 rounded-lg font-medium transition-colors"
              >
                <ShoppingCart className="w-4 h-4" />
                Add to Cart
              </button>
            </div>
          </div>
        </div>
      </Link>
    );
  }

  // Grid View (default)
  return (
    <Link to={`/product/${product.id}`} className="group">
      <div className="card card-hover hover-glow">
        <div className="relative overflow-hidden">
          <OptimizedImage
            src={imageUrl}
            alt={product.name}
            className="w-full h-48 md:h-64"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />

          {/* Hover zoom overlay */}
          <div className="absolute inset-0 transform group-hover:scale-105 transition-transform duration-700 pointer-events-none" />

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

          {/* Discount Badge */}
          {discountPercentage > 0 && (
            <span className="absolute top-3 left-3 bg-gold/90 text-bg-primary text-xs font-semibold px-3 py-1 rounded-full">
              -{discountPercentage}%
            </span>
          )}

          {/* Featured Badge */}
          {product.featured && !discountPercentage && (
            <span className="absolute top-3 left-3 bg-violet/80 text-white text-xs font-semibold px-3 py-1 rounded-full">
              Featured
            </span>
          )}

          {/* Category Badge */}
          {product.category_name && (
            <span className="absolute bottom-3 left-3 bg-bg-primary/80 backdrop-blur-sm text-txt-secondary text-xs px-2 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
              {product.category_name}
            </span>
          )}

          {/* Actions */}
          <div className="absolute top-3 right-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
            {showWishlist && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                className="w-10 h-10 glass-strong rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"
              >
                <Heart className="w-4 h-4 text-txt-primary" />
              </button>
            )}
            <button
              onClick={handleAddToCart}
              className="w-10 h-10 bg-gold rounded-full flex items-center justify-center hover:bg-gold-300 transition-colors shadow-glow-gold"
            >
              <ShoppingCart className="w-4 h-4 text-bg-primary" />
            </button>
          </div>
        </div>

        <div className="p-4">
          <h3 className="font-medium text-txt-primary text-sm mb-1 line-clamp-1 group-hover:text-gold transition-colors">
            {product.name}
          </h3>

          <p className="text-xs text-txt-tertiary mb-3 line-clamp-1">
            {product.description || 'Premium quality product'}
          </p>

          <div className="flex items-center gap-2">
            <span className="font-bold text-lg text-gold">
              ₱{(product.sale_price || product.price).toFixed(2)}
            </span>

            {product.sale_price && product.price !== product.sale_price && (
              <span className="text-sm text-txt-tertiary line-through">
                ₱{product.price.toFixed(2)}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
