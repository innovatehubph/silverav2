import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { productsApi } from '../utils/api';
import type { Product } from '../types';
import ProductCard from '../components/product/ProductCard';

export default function Shop() {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const searchQuery = searchParams.get('search') || '';

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    if (searchQuery) {
      const filtered = products.filter(product =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.category_name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredProducts(filtered);
    } else {
      setFilteredProducts(products);
    }
  }, [searchQuery, products]);

  const loadProducts = async () => {
    try {
      setIsLoading(true);
      const response = await productsApi.getAll({ limit: 50 });
      setProducts(response.data);
      setFilteredProducts(response.data);
    } catch (error) {
      console.error('Failed to load products:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const clearSearch = () => {
    setSearchParams({});
  };

  return (
    <div className="container-custom py-8 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <h1 className="section-title mb-0">Shop</h1>

        {/* Search Bar */}
        <div className="relative max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-txt-tertiary" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              if (e.target.value) {
                setSearchParams({ search: e.target.value });
              } else {
                setSearchParams({});
              }
            }}
            placeholder="Search products..."
            className="w-full pl-10 pr-10 py-2 bg-bg-tertiary border border-bdr rounded-xl text-txt-primary placeholder:text-txt-tertiary focus:ring-2 focus:ring-gold/40 focus:border-gold/50 outline-none transition-all"
          />
          {searchQuery && (
            <button
              onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="w-5 h-5 text-txt-tertiary hover:text-txt-primary transition-colors" />
            </button>
          )}
        </div>
      </div>

      {/* Search Results Info */}
      {searchQuery && (
        <div className="mb-6 flex items-center gap-2">
          <span className="text-txt-secondary">
            Search results for <span className="font-semibold text-gold">"{searchQuery}"</span>
          </span>
          <span className="text-txt-tertiary">({filteredProducts.length} items)</span>
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="card">
              <div className="skeleton h-64" />
              <div className="p-4 space-y-2">
                <div className="skeleton h-4 w-3/4" />
                <div className="skeleton h-4 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-16">
          <Search className="w-16 h-16 mx-auto text-txt-tertiary mb-4" />
          <h2 className="text-xl font-semibold text-txt-primary mb-2">No products found</h2>
          <p className="text-txt-secondary mb-4">Try adjusting your search terms</p>
          <button onClick={clearSearch} className="btn-primary">
            Clear Search
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
