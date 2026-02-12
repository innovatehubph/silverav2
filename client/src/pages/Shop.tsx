import { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, X, Grid3X3, List, SlidersHorizontal, ChevronDown } from 'lucide-react';
import { productsApi } from '../utils/api';
import type { Product } from '../types';
import ProductCard from '../components/product/ProductCard';

interface Category {
  id: number;
  name: string;
  slug: string;
  image?: string;
  description?: string;
}

export default function Shop() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState('newest');
  const [showFilters, setShowFilters] = useState(false);

  // URL params
  const searchQuery = searchParams.get('search') || '';
  const categoryParam = searchParams.get('category') || 'all';

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [productsRes, categoriesRes] = await Promise.all([
        productsApi.getAll({ limit: 100 }),
        fetch('/api/categories').then(res => res.json())
      ]);
      setProducts(productsRes.data);
      setCategories(categoriesRes);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    let result = [...products];

    // Filter by category
    if (categoryParam && categoryParam !== 'all') {
      result = result.filter(product => {
        const categorySlug = product.category_name?.toLowerCase().replace(/ /g, '-');
        return categorySlug === categoryParam.toLowerCase() || 
               product.category_name?.toLowerCase() === categoryParam.toLowerCase();
      });
    }

    // Filter by search query (search in name, description, category, brand)
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(product => {
        const name = product.name?.toLowerCase() || '';
        const description = product.description?.toLowerCase() || '';
        const category = product.category_name?.toLowerCase() || '';
        // Extract potential brand from product name (first word often is brand)
        const brand = name.split(' ')[0] || '';
        
        return name.includes(query) || 
               description.includes(query) || 
               category.includes(query) ||
               brand.includes(query);
      });
    }

    // Sort products
    switch (sortBy) {
      case 'price-low':
        result.sort((a, b) => (a.sale_price || a.price) - (b.sale_price || b.price));
        break;
      case 'price-high':
        result.sort((a, b) => (b.sale_price || b.price) - (a.sale_price || a.price));
        break;
      case 'name':
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'newest':
      default:
        // Keep original order (newest first from API)
        break;
    }

    return result;
  }, [products, categoryParam, searchQuery, sortBy]);

  // Update URL params
  const updateParams = (key: string, value: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (value && value !== 'all') {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    setSearchParams(newParams);
  };

  const clearSearch = () => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('search');
    setSearchParams(newParams);
  };

  const clearAllFilters = () => {
    setSearchParams({});
  };

  // Get active category for display
  const activeCategory = categoryParam === 'all'
    ? null
    : categories.find(c => c.slug === categoryParam || c.name.toLowerCase() === categoryParam.toLowerCase());
  const activeCategoryName = activeCategory?.name || (categoryParam === 'all' ? 'All Products' : categoryParam);

  return (
    <div className="container-custom py-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-6 mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="section-title mb-1">Shop</h1>
            <p className="text-txt-secondary">
              {filteredProducts.length} {filteredProducts.length === 1 ? 'product' : 'products'}
              {categoryParam !== 'all' && ` in ${activeCategoryName}`}
            </p>
          </div>

          {/* Search Bar */}
          <div className="relative max-w-md w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-txt-tertiary" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => updateParams('search', e.target.value)}
              placeholder="Search products, brands, categories..."
              className="w-full pl-10 pr-10 py-3 bg-bg-tertiary border border-bdr rounded-xl text-txt-primary placeholder:text-txt-tertiary focus:ring-2 focus:ring-gold/40 focus:border-gold/50 outline-none transition-all"
            />
            {searchQuery && (
              <button onClick={clearSearch} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="w-5 h-5 text-txt-tertiary hover:text-txt-primary transition-colors" />
              </button>
            )}
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <button
            onClick={() => updateParams('category', 'all')}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              categoryParam === 'all' || !categoryParam
                ? 'bg-accent-gold text-bg-primary'
                : 'bg-bg-tertiary text-txt-secondary hover:bg-bg-hover hover:text-txt-primary'
            }`}
          >
            All Products
          </button>
          {categories.map(category => (
            <button
              key={category.id}
              onClick={() => updateParams('category', category.slug)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                categoryParam === category.slug
                  ? 'bg-accent-gold text-bg-primary'
                  : 'bg-bg-tertiary text-txt-secondary hover:bg-bg-hover hover:text-txt-primary'
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>

        {/* Filters & Sort Bar */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            {/* Mobile Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="md:hidden flex items-center gap-2 px-4 py-2 bg-bg-tertiary rounded-lg text-txt-secondary hover:text-txt-primary transition-colors"
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filters
            </button>

            {/* Active Filters */}
            {(searchQuery || categoryParam !== 'all') && (
              <div className="flex items-center gap-2 flex-wrap">
                {categoryParam !== 'all' && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-accent-gold/10 text-accent-gold text-sm rounded-full">
                    {activeCategoryName}
                    <button onClick={() => updateParams('category', 'all')}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {searchQuery && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-accent-gold/10 text-accent-gold text-sm rounded-full">
                    "{searchQuery}"
                    <button onClick={clearSearch}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                <button
                  onClick={clearAllFilters}
                  className="text-sm text-txt-tertiary hover:text-txt-primary underline"
                >
                  Clear all
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Sort Dropdown */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="appearance-none bg-bg-tertiary border border-bdr rounded-lg px-4 py-2 pr-8 text-sm text-txt-primary cursor-pointer focus:ring-2 focus:ring-gold/40 focus:border-gold/50 outline-none"
              >
                <option value="newest">Newest</option>
                <option value="name">Name A-Z</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-txt-tertiary pointer-events-none" />
            </div>

            {/* View Mode Toggle */}
            <div className="hidden md:flex items-center gap-1 bg-bg-tertiary rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === 'grid' ? 'bg-bg-hover text-txt-primary' : 'text-txt-tertiary hover:text-txt-primary'
                }`}
              >
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === 'list' ? 'bg-bg-hover text-txt-primary' : 'text-txt-tertiary hover:text-txt-primary'
                }`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Products Grid/List */}
      {isLoading ? (
        <div className={`grid gap-6 ${
          viewMode === 'grid' 
            ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4' 
            : 'grid-cols-1'
        }`}>
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
      ) : filteredProducts.length > 0 ? (
        <>
          {/* Category Header when filtered */}
          {categoryParam !== 'all' && (
            <div className="mb-6 p-6 glass rounded-2xl">
              <h2 className="text-2xl font-serif font-bold text-txt-primary mb-2">
                {activeCategoryName}
              </h2>
              <p className="text-txt-secondary">
                {activeCategory?.description || `Explore our collection of ${activeCategoryName.toLowerCase()} products`}
              </p>
            </div>
          )}

          <div className={`grid gap-6 ${
            viewMode === 'grid' 
              ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4' 
              : 'grid-cols-1'
          }`}>
            {filteredProducts.map((product) => (
              <ProductCard 
                key={product.id} 
                product={product} 
                viewMode={viewMode}
              />
            ))}
          </div>
        </>
      ) : (
        <div className="text-center py-16">
          <div className="w-20 h-20 bg-bg-tertiary rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="w-10 h-10 text-txt-tertiary" />
          </div>
          <h3 className="text-xl font-semibold text-txt-primary mb-2">No products found</h3>
          <p className="text-txt-secondary mb-6">
            {searchQuery 
              ? `No results for "${searchQuery}"${categoryParam !== 'all' ? ` in ${activeCategoryName}` : ''}`
              : `No products available${categoryParam !== 'all' ? ` in ${activeCategoryName}` : ''}`
            }
          </p>
          <button onClick={clearAllFilters} className="btn-primary">
            View All Products
          </button>
        </div>
      )}
    </div>
  );
}
