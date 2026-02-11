import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ShoppingCart, Heart, Share2, Star, ArrowLeft, Plus, Minus } from 'lucide-react';
import { toast } from 'sonner';
import { productsApi } from '../utils/api';
import { useCartStore } from '../stores';
import { parseProductImages, getDiscountPercentage } from '../utils/product';
import { SEO, generateProductStructuredData } from '../components/SEO';
import OptimizedImage from '../components/OptimizedImage';
import VariantSelector from '../components/product/VariantSelector';
import type { Product, ProductVariants } from '../types';

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const { addItem } = useCartStore();

  const variants = useMemo<ProductVariants | null>(() => {
    if (!product?.variants) return null;
    try {
      return typeof product.variants === 'string'
        ? JSON.parse(product.variants)
        : product.variants;
    } catch {
      return null;
    }
  }, [product]);

  // Auto-select first variant options when product loads
  useEffect(() => {
    if (variants) {
      if (variants.sizes?.length && !selectedSize) {
        setSelectedSize(variants.sizes[0]);
      }
      if (variants.colors?.length && !selectedColor) {
        setSelectedColor(variants.colors[0].name);
      }
    }
  }, [variants, selectedSize, selectedColor]);

  useEffect(() => {
    if (id) {
      loadProduct(parseInt(id));
    }
  }, [id]);

  const loadProduct = async (productId: number) => {
    try {
      setIsLoading(true);
      const response = await productsApi.getById(productId);
      setProduct(response.data);
    } catch (error) {
      console.error('Failed to load product:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToCart = () => {
    if (product) {
      addItem(product, quantity, selectedSize || undefined, selectedColor || undefined);
      toast.success('Added to cart!');
    }
  };

  const handleBuyNow = () => {
    if (product) {
      addItem(product, quantity, selectedSize || undefined, selectedColor || undefined);
      navigate('/checkout');
    }
  };

  if (isLoading) {
    return (
      <div className="container-custom py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="skeleton h-96 rounded-xl"></div>
          <div className="space-y-4">
            <div className="skeleton h-8 w-3/4"></div>
            <div className="skeleton h-6 w-1/4"></div>
            <div className="skeleton h-24"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container-custom py-16 text-center">
        <h1 className="section-title">Product Not Found</h1>
        <button onClick={() => navigate('/shop')} className="btn-primary mt-4">
          Back to Shop
        </button>
      </div>
    );
  }

  const images = parseProductImages(product.images);
  const discountPercentage = getDiscountPercentage(product.price, product.sale_price);
  const currentPrice = product.sale_price || product.price;
  const productUrl = `https://silvera.innoserver.cloud/products/${product.id}`;

  return (
    <>
      <SEO
        title={product.name}
        description={product.description || `Buy ${product.name} online at Silvera PH. Premium quality, fast delivery, secure payment.`}
        keywords={`${product.name}, luxury products, premium shopping, ${product.category_name || 'products'}`}
        image={images[0] || 'https://silvera.innoserver.cloud/og-image.jpg'}
        url={productUrl}
        type="product"
        price={currentPrice.toString()}
        currency="PHP"
        availability={product.stock > 0 ? 'instock' : 'outofstock'}
        structuredData={generateProductStructuredData({
          name: product.name,
          description: product.description || '',
          image: images[0] || '',
          price: product.price,
          salePrice: product.sale_price,
          currency: 'PHP',
          sku: product.id.toString(),
          availability: product.stock > 0 ? 'InStock' : 'OutOfStock'
        })}
      />
      <div className="container-custom py-8 animate-fade-in">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-txt-secondary hover:text-gold mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          Back
        </button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
        {/* Image Gallery */}
        <div>
          <div className="relative aspect-square rounded-2xl overflow-hidden bg-bg-secondary">
            <OptimizedImage
              src={images[activeImage]}
              alt={product.name}
              className="w-full h-full"
              sizes="(max-width: 768px) 100vw, 50vw"
              eager={activeImage === 0}
            />
            {discountPercentage > 0 && (
              <span className="absolute top-4 left-4 badge-gold text-lg px-4 py-2">
                -{discountPercentage}%
              </span>
            )}
          </div>

          {images.length > 1 && (
            <div className="flex gap-2 mt-4 overflow-x-auto">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImage(idx)}
                  className={`w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all ${
                    activeImage === idx ? 'border-gold' : 'border-transparent'
                  }`}
                >
                  <OptimizedImage
                    src={img}
                    alt=""
                    className="w-full h-full"
                    sizes="80px"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="space-y-6">
          <div>
            <p className="text-txt-tertiary text-sm mb-2">{product.category_name || 'Category'}</p>
            <h1 className="text-3xl md:text-4xl font-serif font-bold text-txt-primary">
              {product.name}
            </h1>
            
            <div className="flex items-center gap-2 mt-2">
              <div className="flex">
                {[1,2,3,4,5].map((star) => (
                  <Star key={star} className="w-5 h-5 fill-gold-400 text-gold-400" />
                ))}
              </div>
              <span className="text-txt-tertiary">(24 reviews)</span>
            </div>
          </div>

          <div className="flex items-baseline gap-3">
            <span className="text-4xl font-bold text-txt-primary">
              ₱{(product.sale_price || product.price).toFixed(2)}
            </span>
            {product.sale_price && product.price !== product.sale_price && (
              <span className="text-xl text-txt-tertiary line-through">
                ₱{product.price.toFixed(2)}
              </span>
            )}
          </div>

          <p className="text-txt-secondary leading-relaxed">
            {product.description || 'Premium quality product with excellent craftsmanship. Made with the finest materials for lasting durability and style.'}
          </p>

          {/* Variants */}
          {variants && (variants.sizes?.length || variants.colors?.length) && (
            <div className="bg-bg-secondary/50 backdrop-blur-sm border border-bdr-subtle rounded-2xl p-5">
              <VariantSelector
                variants={variants}
                selectedSize={selectedSize}
                selectedColor={selectedColor}
                onSizeChange={setSelectedSize}
                onColorChange={setSelectedColor}
              />
            </div>
          )}

          {/* Quantity */}
          <div className="flex items-center gap-4">
            <span className="text-txt-secondary font-medium">Quantity:</span>
            <div className="flex items-center border border-bdr rounded-lg">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="p-3 hover:bg-bg-hover"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-12 text-center font-medium">{quantity}</span>
              <button
                onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                className="p-3 hover:bg-bg-hover"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <span className="text-txt-tertiary text-sm">
              {product.stock} items available
            </span>
          </div>

          {/* Actions */}
          <div className="flex gap-4 pt-4">
            <button
              onClick={handleAddToCart}
              className="flex-1 btn-primary flex items-center justify-center gap-2"
            >
              <ShoppingCart className="w-5 h-5" />
              Add to Cart
            </button>
            
            <button
              onClick={handleBuyNow}
              className="flex-1 btn-secondary flex items-center justify-center gap-2"
            >
              Buy Now
            </button>
          </div>

          {/* Secondary Actions */}
          <div className="flex gap-4 pt-2">
            <button className="flex items-center gap-2 text-txt-tertiary hover:text-red-400 transition-colors">
              <Heart className="w-5 h-5" />
              Add to Wishlist
            </button>
            <button className="flex items-center gap-2 text-txt-tertiary hover:text-gold transition-colors">
              <Share2 className="w-5 h-5" />
              Share
            </button>
          </div>

          {/* Features */}
          <div className="border-t border-bdr pt-6 mt-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gold/10 rounded-full flex items-center justify-center">
                  <span className="text-gold text-lg">🚚</span>
                </div>
                <div>
                  <p className="font-medium">Free Shipping</p>
                  <p className="text-sm text-txt-tertiary">On orders over ₱1,000</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gold/10 rounded-full flex items-center justify-center">
                  <span className="text-gold text-lg">↩️</span>
                </div>
                <div>
                  <p className="font-medium">Easy Returns</p>
                  <p className="text-sm text-txt-tertiary">30-day return policy</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
