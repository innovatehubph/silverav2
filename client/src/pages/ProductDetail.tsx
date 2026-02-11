import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ShoppingCart, Heart, Share2, Star, ArrowLeft, Plus, Minus, X, Send, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { productsApi } from '../utils/api';
import { useCartStore, useAuthStore } from '../stores';
import { parseProductImages, getDiscountPercentage } from '../utils/product';
import { SEO, generateProductStructuredData } from '../components/SEO';
import OptimizedImage from '../components/OptimizedImage';
import VariantSelector from '../components/product/VariantSelector';
import type { Product, ProductVariants, Review } from '../types';

function StarRating({ rating, size = 20, interactive, onRate }: {
  rating: number;
  size?: number;
  interactive?: boolean;
  onRate?: (rating: number) => void;
}) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={!interactive}
          onClick={() => onRate?.(star)}
          onMouseEnter={() => interactive && setHover(star)}
          onMouseLeave={() => interactive && setHover(0)}
          className={interactive ? 'cursor-pointer' : 'cursor-default'}
        >
          <Star
            size={size}
            className={`${
              star <= (hover || rating)
                ? 'fill-gold-400 text-gold-400'
                : 'text-zinc-600'
            } transition-colors`}
          />
        </button>
      ))}
    </div>
  );
}

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
  const { isAuthenticated } = useAuthStore();

  // Reviews state
  const [reviews, setReviews] = useState<Review[]>([]);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

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
      const [productRes, reviewsRes] = await Promise.all([
        productsApi.getById(productId),
        productsApi.getReviews(productId),
      ]);
      setProduct(productRes.data);
      setReviews(Array.isArray(reviewsRes.data) ? reviewsRes.data : []);
    } catch (error) {
      console.error('Failed to load product:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!id) return;
    if (reviewRating === 0) { toast.error('Please select a rating'); return; }
    if (!reviewTitle.trim()) { toast.error('Please enter a title'); return; }
    if (!reviewComment.trim()) { toast.error('Please enter a comment'); return; }

    setSubmittingReview(true);
    try {
      await productsApi.createReview(parseInt(id), {
        rating: reviewRating,
        title: reviewTitle.trim(),
        comment: reviewComment.trim(),
      });
      toast.success('Review posted!');
      setShowReviewForm(false);
      setReviewRating(0);
      setReviewTitle('');
      setReviewComment('');
      const res = await productsApi.getReviews(parseInt(id));
      setReviews(Array.isArray(res.data) ? res.data : []);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to post review');
    } finally {
      setSubmittingReview(false);
    }
  };

  const avgRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;

  const ratingDistribution = [5, 4, 3, 2, 1].map(star => ({
    star,
    count: reviews.filter(r => r.rating === star).length,
    pct: reviews.length > 0 ? (reviews.filter(r => r.rating === star).length / reviews.length) * 100 : 0,
  }));

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
              <StarRating rating={Math.round(avgRating)} />
              <span className="text-txt-tertiary">
                {reviews.length > 0
                  ? `${avgRating.toFixed(1)} (${reviews.length} review${reviews.length !== 1 ? 's' : ''})`
                  : 'No reviews yet'}
              </span>
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
      {/* Reviews Section */}
      <div className="mt-12 border-t border-bdr pt-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <MessageSquare className="text-accent-gold" size={24} />
            <h2 className="text-2xl font-serif font-bold text-txt-primary">
              Customer Reviews
            </h2>
            {reviews.length > 0 && (
              <span className="text-sm text-txt-tertiary">({reviews.length})</span>
            )}
          </div>
          {isAuthenticated && (
            <button
              onClick={() => setShowReviewForm(true)}
              className="btn-primary px-4 py-2 rounded-lg flex items-center gap-2 text-sm"
            >
              <Send size={16} /> Write a Review
            </button>
          )}
        </div>

        {reviews.length > 0 && (
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            {/* Rating Summary */}
            <div className="card p-5 flex flex-col items-center justify-center">
              <div className="text-4xl font-bold text-txt-primary">{avgRating.toFixed(1)}</div>
              <StarRating rating={Math.round(avgRating)} />
              <p className="text-sm text-txt-tertiary mt-1">Based on {reviews.length} review{reviews.length !== 1 ? 's' : ''}</p>
            </div>

            {/* Rating Breakdown */}
            <div className="card p-5 md:col-span-2">
              <div className="space-y-2">
                {ratingDistribution.map(({ star, count, pct }) => (
                  <div key={star} className="flex items-center gap-3 text-sm">
                    <span className="text-txt-secondary w-8">{star} ★</span>
                    <div className="flex-1 h-2.5 bg-bg-tertiary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-accent-gold rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-txt-tertiary w-8 text-right">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Reviews List */}
        <div className="space-y-4">
          {reviews.map((review) => (
            <div key={review.id} className="card p-5">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-8 h-8 rounded-full bg-accent-gold/20 flex items-center justify-center text-accent-gold text-sm font-bold">
                      {(review.user_name || 'U').charAt(0).toUpperCase()}
                    </div>
                    <span className="text-txt-primary font-medium text-sm">{review.user_name || 'Anonymous'}</span>
                  </div>
                  <StarRating rating={review.rating} size={16} />
                </div>
                <span className="text-xs text-txt-tertiary">
                  {new Date(review.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
              <h4 className="font-medium text-txt-primary mt-2">{review.title}</h4>
              <p className="text-sm text-txt-secondary mt-1 leading-relaxed">{review.comment}</p>
            </div>
          ))}
          {reviews.length === 0 && (
            <div className="text-center py-8">
              <MessageSquare size={32} className="mx-auto text-txt-tertiary mb-3" />
              <p className="text-txt-secondary">No reviews yet. Be the first to review this product!</p>
              {isAuthenticated && (
                <button
                  onClick={() => setShowReviewForm(true)}
                  className="btn-primary px-4 py-2 rounded-lg text-sm mt-3"
                >
                  Write a Review
                </button>
              )}
              {!isAuthenticated && (
                <button
                  onClick={() => navigate('/login')}
                  className="text-accent-gold hover:underline text-sm mt-3 inline-block"
                >
                  Log in to write a review
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Review Form Modal */}
      {showReviewForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowReviewForm(false)}>
          <div className="card p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-txt-primary">Write a Review</h2>
              <button onClick={() => setShowReviewForm(false)} className="text-txt-tertiary hover:text-txt-primary">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-txt-secondary mb-2">Rating *</label>
                <StarRating rating={reviewRating} size={28} interactive onRate={setReviewRating} />
              </div>
              <div>
                <label className="block text-sm text-txt-secondary mb-1">Title *</label>
                <input
                  className="input-field w-full py-2 text-sm"
                  value={reviewTitle}
                  onChange={(e) => setReviewTitle(e.target.value)}
                  placeholder="Summarize your experience"
                  maxLength={100}
                />
              </div>
              <div>
                <label className="block text-sm text-txt-secondary mb-1">Review *</label>
                <textarea
                  className="input-field w-full py-2 text-sm min-h-[100px] resize-none"
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="What did you like or dislike about this product?"
                  maxLength={1000}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowReviewForm(false)} className="btn-ghost px-4 py-2 rounded-lg text-sm">
                Cancel
              </button>
              <button
                onClick={handleSubmitReview}
                disabled={submittingReview}
                className="btn-primary px-4 py-2 rounded-lg flex items-center gap-2 text-sm"
              >
                <Send size={16} /> {submittingReview ? 'Posting...' : 'Post Review'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
}
