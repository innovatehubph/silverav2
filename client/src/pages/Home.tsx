import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ShoppingBag, Truck, Shield, Star } from 'lucide-react';
import { productsApi } from '../utils/api';
import type { Product } from '../types';
import ProductCard from '../components/product/ProductCard';

export default function Home() {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [trendingProducts, setTrendingProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setIsLoading(true);
      const response = await productsApi.getAll({ limit: 50 });
      const products = response.data;
      
      // Filter featured and trending
      setFeaturedProducts(products.filter((p: Product) => p.featured).slice(0, 4));
      setTrendingProducts(products.slice(0, 8));
    } catch (error) {
      console.error('Failed to load products:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="animate-fade-in">
      {/* Hero Section */}
      <section className="relative bg-gradient-luxury text-white py-20 md:py-32 overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1920')] bg-cover bg-center" />
        </div>
        
        <div className="container-custom relative z-10">
          <div className="max-w-2xl animate-slide-up">
            <p className="text-gold-400 font-medium mb-4 tracking-wide">PREMIUM SHOPPING</p>
            <h1 className="text-4xl md:text-6xl font-serif font-bold mb-6 leading-tight">
              Elevate Your
              <br />
              <span className="text-gradient">Lifestyle</span>
            </h1>
            <p className="text-lg md:text-xl text-gray-300 mb-8">
              Discover premium products curated for the modern Filipino. Quality meets elegance at Silvera.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/shop" className="btn-secondary inline-flex items-center justify-center gap-2">
                Shop Now
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link to="/shop?category=featured" className="btn-outline text-white border-white hover:bg-white hover:text-navy-900">
                View Featured
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 bg-white">
        <div className="container-custom">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { icon: Truck, title: 'Free Shipping', desc: 'On orders over ₱1,000' },
              { icon: Shield, title: 'Secure Payment', desc: '100% secure checkout' },
              { icon: Star, title: 'Quality Products', desc: 'Premium selection' },
              { icon: ShoppingBag, title: 'Easy Returns', desc: '30-day return policy' },
            ].map((feature, idx) => (
              <div key={idx} className="flex items-center gap-4 p-4 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                  <feature.icon className="w-6 h-6 text-primary-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{feature.title}</h3>
                  <p className="text-sm text-gray-600">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-16">
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

      {/* Banner Section */}
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

      {/* Trending Products */}
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
