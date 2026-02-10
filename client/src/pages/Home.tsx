import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { productsApi } from '../utils/api';
import type { Product } from '../types';
import ProductCard from '../components/product/ProductCard';
import HeroSection from '../sections/HeroSection';
import CategorySection from '../sections/CategorySection';
import HowItWorksSection from '../sections/HowItWorksSection';

// Fallback category display images (used when no matching product found from API)
const categoryFallbackImages: Record<string, string> = {
  apparel: '/images/shirt_apparel.jpg',
  footwear: '/images/shoe_footwear.jpg',
  accessories: '/images/wallet_smallleather.jpg',
  dresses: '/images/dress_apparel.jpg',
};

export default function Home() {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [trendingProducts, setTrendingProducts] = useState<Product[]>([]);
  const [categoryProducts, setCategoryProducts] = useState<(Product | null)[]>([null, null, null, null]);
  const [heroProduct, setHeroProduct] = useState<Product | undefined>();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setIsLoading(true);
      const response = await productsApi.getAll({ limit: 50 });
      const products: Product[] = response.data;

      const featured = products.filter((p) => p.featured);
      setFeaturedProducts(featured.slice(0, 4));
      setTrendingProducts(products.slice(0, 8));

      // Use the first featured product for the hero section
      if (featured.length > 0) setHeroProduct(featured[0]);

      // Pick one product per category for the category sections
      const categories = ['Apparel', 'Footwear', 'Accessories', 'Dresses'];
      const picked = categories.map(cat =>
        products.find(p => p.category_name?.toLowerCase() === cat.toLowerCase()) || null
      );
      setCategoryProducts(picked);
    } catch (error) {
      console.error('Failed to load products:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="animate-fade-in">
      {/* New Hero Section with GSAP */}
      <HeroSection product={heroProduct} />

      {/* Category Sections with GSAP scroll animations */}
      <CategorySection
        id="apparel"
        headline="APPAREL"
        subheadline="Crisp shirts, premium denim, and elevated basics shipped from the U.S. to your door."
        cta="Shop Apparel"
        image={categoryFallbackImages.apparel}
        imagePosition="right"
        zIndex={20}
        product={categoryProducts[0] ?? undefined}
      />

      <CategorySection
        id="footwear"
        headline="FOOTWEAR"
        subheadline="Box-fresh sneakers, loafers, and boots — authentic and sourced direct."
        cta="Shop Footwear"
        image={categoryFallbackImages.footwear}
        imagePosition="left"
        zIndex={30}
        product={categoryProducts[1] ?? undefined}
      />

      <CategorySection
        id="accessories"
        headline="ACCESSORIES"
        subheadline="Wallets, belts, and small leather goods that complete the look."
        cta="Shop Accessories"
        image={categoryFallbackImages.accessories}
        imagePosition="right"
        zIndex={40}
        product={categoryProducts[2] ?? undefined}
      />

      <CategorySection
        id="dresses"
        headline="DRESSES"
        subheadline="Day-to-evening dresses for every occasion — shipped direct to Manila."
        cta="Shop Dresses"
        image={categoryFallbackImages.dresses}
        imagePosition="left"
        isDark={true}
        zIndex={50}
        product={categoryProducts[3] ?? undefined}
      />

      {/* How It Works Section */}
      <HowItWorksSection />

      {/* Original Featured Products Section */}
      <section className="py-16 bg-white">
        <div className="container-custom">
          <div className="flex items-end justify-between mb-8">
            <div>
              <h2 className="section-title">Featured Products</h2>
              <p className="section-subtitle">Handpicked premium items for you</p>
            </div>
            <Link to="/shop" className="hidden md:flex items-center gap-2 text-primary-600 hover:text-primary-700 font-medium">
              View All
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="card">
                  <div className="skeleton h-64" />
                  <div className="p-4 space-y-2">
                    <div className="skeleton h-4 w-3/4" />
                    <div className="skeleton h-4 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Original Banner Section */}
      <section className="py-16 bg-primary-50">
        <div className="container-custom">
          <div className="bg-gradient-to-r from-primary-600 to-primary-800 rounded-2xl p-8 md:p-12 text-white flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="max-w-lg">
              <span className="inline-block bg-gold-400 text-navy-900 text-sm font-semibold px-4 py-1 rounded-full mb-4">
                SPECIAL OFFER
              </span>
              <h2 className="text-3xl md:text-4xl font-serif font-bold mb-4">
                Get 20% Off Your First Order
              </h2>
              <p className="text-gray-200 mb-6">
                Sign up for our newsletter and receive exclusive discounts on premium products.
              </p>
              <Link to="/register" className="btn-secondary inline-block">
                Sign Up Now
              </Link>
            </div>
            
            <div className="text-center md:text-right">
              <div className="text-5xl md:text-7xl font-bold text-gold-400">20%</div>
              <p className="text-lg">OFF</p>
            </div>
          </div>
        </div>
      </section>

      {/* Original Trending Products */}
      <section className="py-16">
        <div className="container-custom">
          <div className="text-center mb-12">
            <h2 className="section-title">Trending Now</h2>
            <p className="section-subtitle">Most popular products this week</p>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div key={i} className="card">
                  <div className="skeleton h-48 md:h-64" />
                  <div className="p-4 space-y-2">
                    <div className="skeleton h-4 w-3/4" />
                    <div className="skeleton h-4 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {trendingProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
