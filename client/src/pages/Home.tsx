import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';
import { productsApi } from '../utils/api';
import type { Product } from '../types';
import ProductCard from '../components/product/ProductCard';
import HeroSection from '../sections/HeroSection';
import CategorySection from '../sections/CategorySection';
import HowItWorksSection from '../sections/HowItWorksSection';
import { SEO, generateOrganizationStructuredData } from '../components/SEO';

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

      if (featured.length > 0) setHeroProduct(featured[0]);

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
    <>
      <SEO
        title="Home"
        description="Shop premium branded products online in the Philippines. Discover luxury watches, designer bags, electronics and more. Fast delivery, secure payment, 30-day money-back guarantee."
        keywords="luxury shopping philippines, premium brands, designer products, online shopping, branded goods, luxury watches, designer bags, electronics"
        structuredData={generateOrganizationStructuredData()}
      />
      <div className="animate-fade-in">
        {/* Hero Section */}
        <HeroSection product={heroProduct} />

        {/* Category Sections */}
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

        {/* How It Works */}
        <HowItWorksSection />

        {/* Featured Products */}
        <section className="py-20 bg-bg-primary border-t border-bdr-subtle">
          <div className="container-custom">
            <div className="flex items-end justify-between mb-10">
              <div>
                <h2 className="text-display-lg font-serif font-bold text-txt-primary mb-2">
                  Featured <span className="text-gradient-gold">Products</span>
                </h2>
                <p className="text-txt-secondary text-lg">Handpicked premium items for you</p>
              </div>
              <Link to="/shop" className="hidden md:flex items-center gap-2 text-gold hover:text-gold-300 font-medium transition-colors group">
                View All
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
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

        {/* Special Offer Banner */}
        <section className="py-16 bg-bg-secondary">
          <div className="container-custom">
            <div className="relative overflow-hidden rounded-3xl border border-bdr-subtle">
              {/* Gold gradient background */}
              <div className="absolute inset-0 bg-gradient-to-br from-gold/10 via-bg-secondary to-violet/10" />
              <div
                className="absolute inset-0 opacity-[0.03] pointer-events-none"
                style={{
                  backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
                  backgroundSize: '40px 40px',
                }}
              />

              <div className="relative p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="max-w-lg">
                  <span className="inline-flex items-center gap-2 bg-gold/10 text-gold text-sm font-semibold px-4 py-2 rounded-full mb-4 border border-gold/20">
                    <Sparkles className="w-4 h-4" />
                    SPECIAL OFFER
                  </span>
                  <h2 className="text-3xl md:text-4xl font-serif font-bold text-txt-primary mb-4">
                    Get 20% Off Your{' '}
                    <span className="text-gradient-gold">First Order</span>
                  </h2>
                  <p className="text-txt-secondary mb-6">
                    Sign up for our newsletter and receive exclusive discounts on premium products.
                  </p>
                  <Link to="/register" className="cta-button inline-flex">
                    Sign Up Now
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </div>

                <div className="text-center md:text-right">
                  <div className="text-6xl md:text-8xl font-bold text-gradient-gold">20%</div>
                  <p className="text-lg text-txt-secondary font-medium">OFF</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Trending Products */}
        <section className="py-20 bg-bg-primary">
          <div className="container-custom">
            <div className="text-center mb-12">
              <h2 className="text-display-lg font-serif font-bold text-txt-primary mb-2">
                Trending <span className="text-gradient-gold">Now</span>
              </h2>
              <p className="text-txt-secondary text-lg">Most popular products this week</p>
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
    </>
  );
}
