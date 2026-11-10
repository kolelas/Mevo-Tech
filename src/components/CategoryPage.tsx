import React, { useState, useMemo } from 'react';
import {
  ArrowLeft,
  ChevronRight,
  Filter,
  CheckCircle2,
  Sparkles,
  HelpCircle,
  Truck,
  ShieldCheck,
  Laptop,
  Monitor,
  Cpu,
  Headphones,
  HardDrive,
  Wifi,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { CategoryConfig, CATEGORIES_DATA } from '../data/categories';
import { Product } from '../types';
import { ProductCard } from './ProductCard';
import { formatZAR } from '../utils/calculations';

interface CategoryPageProps {
  category: CategoryConfig;
  products: Product[];
  isLoading: boolean;
  onSelectProduct: (product: Product) => void;
  onNavigateCategory: (slug: string) => void;
  onBackToHome: () => void;
}

const ICON_MAP = {
  Laptop,
  Monitor,
  Cpu,
  Headphones,
  HardDrive,
  Wifi,
};

export const CategoryPage: React.FC<CategoryPageProps> = ({
  category,
  products,
  isLoading,
  onSelectProduct,
  onNavigateCategory,
  onBackToHome,
}) => {
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'relevance' | 'price_asc' | 'price_desc' | 'newest'>('relevance');
  const [inStockOnly, setInStockOnly] = useState<boolean>(false);
  const [selectedPriceRange, setSelectedPriceRange] = useState<'all' | 'under10k' | '10k-30k' | 'over30k'>('all');
  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const [showFiltersMobile, setShowFiltersMobile] = useState<boolean>(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  // Automatically reset filters when navigating between category pages
  React.useEffect(() => {
    setSelectedSubCategory('All');
    setInStockOnly(false);
    setSelectedBrand('all');
    setSelectedPriceRange('all');
    setSortBy('relevance');
    setOpenFaqIndex(0);
  }, [category.slug]);

  // Available brands in this category
  const availableBrands = useMemo(() => {
    const brands = new Set<string>();
    products.forEach((p) => {
      if (p.brand) brands.add(p.brand);
    });
    return Array.from(brands);
  }, [products]);

  // Filtered & sorted products
  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        // Sub-category filter
        if (selectedSubCategory !== 'All' && !selectedSubCategory.startsWith('All')) {
          if (p.subCategory !== selectedSubCategory) return false;
        }

        // In-stock filter
        if (inStockOnly && p.onHandQuantity <= 0) {
          return false;
        }

        // Brand filter
        if (selectedBrand !== 'all' && p.brand !== selectedBrand) {
          return false;
        }

        // Price range filter
        const price = p.promotionalPriceCents || p.priceCents;
        if (selectedPriceRange === 'under10k' && price >= 1000000) return false;
        if (selectedPriceRange === '10k-30k' && (price < 1000000 || price > 3000000)) return false;
        if (selectedPriceRange === 'over30k' && price <= 3000000) return false;

        return true;
      })
      .sort((a, b) => {
        const priceA = a.promotionalPriceCents || a.priceCents;
        const priceB = b.promotionalPriceCents || b.priceCents;
        if (sortBy === 'price_asc') return priceA - priceB;
        if (sortBy === 'price_desc') return priceB - priceA;
        if (sortBy === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        return (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0);
      });
  }, [products, selectedSubCategory, inStockOnly, selectedBrand, selectedPriceRange, sortBy]);

  const CategoryIcon = ICON_MAP[category.iconName] || Sparkles;

  const otherCategories = CATEGORIES_DATA.filter((c) => c.slug !== category.slug);

  const clearAllFilters = () => {
    setSelectedSubCategory('All');
    setInStockOnly(false);
    setSelectedBrand('all');
    setSelectedPriceRange('all');
    setSortBy('relevance');
  };

  const hasActiveFilters =
    (selectedSubCategory !== 'All' && !selectedSubCategory.startsWith('All')) ||
    inStockOnly ||
    selectedBrand !== 'all' ||
    selectedPriceRange !== 'all';

  return (
    <div className="bg-neutral-50 min-h-screen">
      {/* 1. Category Breadcrumb & Sticky Navigation Bar */}
      <div className="bg-white border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between text-xs text-neutral-500">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1">
            <button
              onClick={onBackToHome}
              className="hover:text-orange-600 transition-colors flex items-center gap-1 font-medium shrink-0"
            >
              <span>Home</span>
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
            <button
              onClick={onBackToHome}
              className="hover:text-orange-600 transition-colors font-medium shrink-0"
            >
              Categories
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
            <span className="text-neutral-900 font-semibold truncate shrink-0">{category.name}</span>
          </nav>

          <button
            onClick={onBackToHome}
            className="hidden sm:flex items-center gap-1 text-xs font-semibold text-neutral-600 hover:text-orange-600 transition-colors shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to All Hardware</span>
          </button>
        </div>
      </div>

      {/* 2. Dedicated Category Hero Banner */}
      <section className="relative bg-neutral-950 text-white overflow-hidden border-b border-neutral-800">
        <div className="absolute inset-0 opacity-20 bg-cover bg-center pointer-events-none mix-blend-luminosity" style={{ backgroundImage: `url(${category.heroImage})` }} />
        <div className="absolute inset-0 bg-gradient-to-r from-neutral-950 via-neutral-950/90 to-neutral-950/60 pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Category Meta & Title */}
            <div className="lg:col-span-8 space-y-4">
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-orange-400 uppercase tracking-widest">
                <span className="flex items-center gap-1.5 bg-orange-500/10 text-orange-400 px-2.5 py-1 rounded-md border border-orange-500/20">
                  <CategoryIcon className="w-3.5 h-3.5" />
                  <span>Mevo Official Category</span>
                </span>
                <span aria-hidden="true">·</span>
                <span>Sandton Hub Inventory</span>
                <span aria-hidden="true">·</span>
                <span>15% VAT Included</span>
              </div>

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white leading-tight">
                {category.name}
              </h1>

              <p className="text-sm sm:text-base font-medium text-neutral-300">
                {category.tagline}
              </p>

              <p className="text-xs sm:text-sm text-neutral-400 max-w-2xl leading-relaxed">
                {category.description}
              </p>

              {/* Category Quick Badges */}
              <div className="pt-2 flex flex-wrap items-center gap-4 text-xs text-neutral-400">
                <div className="flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-orange-400" />
                  <span>Free Courier Over R 1,500</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Verified South African Warranty</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-neutral-400" />
                  <span>Payflex 4x Interest-Free Available</span>
                </div>
              </div>
            </div>

            {/* Category Feature Highlights Card */}
            <div className="lg:col-span-4 bg-neutral-900/80 backdrop-blur-md rounded-2xl p-5 border border-neutral-800 shadow-xl space-y-3.5">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-2.5">
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Hardware Specifications
                </span>
                <span className="text-[11px] text-orange-400 font-mono font-semibold">
                  Sandton Verified
                </span>
              </div>

              <div className="space-y-2.5">
                {category.highlights.map((h, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="text-neutral-400">{h.label}</span>
                    <span className="font-semibold text-neutral-200 text-right">{h.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Sub-Category Tabs & Filter Toolbar */}
      <div className="sticky top-18 z-30 bg-white border-b border-neutral-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Subcategory Segmented Controls */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
            {category.subCategories.map((sub) => {
              const isActive = selectedSubCategory === sub || (sub.startsWith('All') && selectedSubCategory === 'All');
              return (
                <button
                  key={sub}
                  onClick={() => setSelectedSubCategory(sub)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors shrink-0 ${
                    isActive
                      ? 'bg-neutral-900 text-white shadow-xs'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 hover:text-neutral-900'
                  }`}
                >
                  {sub}
                </button>
              );
            })}
          </div>

          {/* Quick Filters & Sorting */}
          <div className="flex items-center justify-between md:justify-end gap-3 w-full md:w-auto text-xs">
            <button
              onClick={() => setShowFiltersMobile(!showFiltersMobile)}
              className="md:hidden flex items-center gap-1.5 px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-lg font-medium"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Filters {hasActiveFilters ? '(Active)' : ''}</span>
            </button>

            <div className="hidden md:flex items-center gap-2">
              <label className="flex items-center gap-1.5 text-neutral-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={inStockOnly}
                  onChange={(e) => setInStockOnly(e.target.checked)}
                  className="rounded border-neutral-300 text-orange-600 focus:ring-orange-500 w-3.5 h-3.5"
                />
                <span>In Stock Only</span>
              </label>

              {availableBrands.length > 1 && (
                <select
                  value={selectedBrand}
                  onChange={(e) => setSelectedBrand(e.target.value)}
                  className="bg-neutral-100 border border-neutral-200 rounded-lg px-2.5 py-1 text-xs text-neutral-800 focus:outline-none"
                >
                  <option value="all">All Brands</option>
                  {availableBrands.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              )}

              <select
                value={selectedPriceRange}
                onChange={(e) => setSelectedPriceRange(e.target.value as any)}
                className="bg-neutral-100 border border-neutral-200 rounded-lg px-2.5 py-1 text-xs text-neutral-800 focus:outline-none"
              >
                <option value="all">All Prices</option>
                <option value="under10k">Under R 10,000</option>
                <option value="10k-30k">R 10,000 – R 30,000</option>
                <option value="over30k">Over R 30,000</option>
              </select>
            </div>

            {/* Sort Control */}
            <div className="flex items-center gap-1.5 text-neutral-600">
              <Filter className="w-3.5 h-3.5 text-neutral-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-neutral-100 border border-neutral-200 rounded-lg px-2.5 py-1 text-xs text-neutral-800 focus:outline-none font-medium"
              >
                <option value="relevance">Featured & Relevant</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="newest">Newest Arrivals</option>
              </select>
            </div>
          </div>
        </div>

        {/* Mobile Filter Panel */}
        {showFiltersMobile && (
          <div className="md:hidden border-t border-neutral-200 p-4 bg-neutral-50 space-y-3">
            <div className="flex items-center justify-between pb-1">
              <span className="text-xs font-bold text-neutral-900 uppercase tracking-wider">Refine By</span>
              <button
                onClick={() => setShowFiltersMobile(false)}
                className="text-neutral-500 hover:text-neutral-900"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-neutral-600 mb-1">Brand</label>
                <select
                  value={selectedBrand}
                  onChange={(e) => setSelectedBrand(e.target.value)}
                  className="w-full bg-white border border-neutral-200 rounded-lg p-1.5 text-xs text-neutral-800"
                >
                  <option value="all">All Brands</option>
                  {availableBrands.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-neutral-600 mb-1">Price Range</label>
                <select
                  value={selectedPriceRange}
                  onChange={(e) => setSelectedPriceRange(e.target.value as any)}
                  className="w-full bg-white border border-neutral-200 rounded-lg p-1.5 text-xs text-neutral-800"
                >
                  <option value="all">All Prices</option>
                  <option value="under10k">Under R 10,000</option>
                  <option value="10k-30k">R 10,000 – R 30,000</option>
                  <option value="over30k">Over R 30,000</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-neutral-200">
              <label className="flex items-center gap-2 text-xs text-neutral-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={inStockOnly}
                  onChange={(e) => setInStockOnly(e.target.checked)}
                  className="rounded border-neutral-300 text-orange-600 focus:ring-orange-500"
                />
                <span>In Stock at Sandton Only</span>
              </label>

              {hasActiveFilters && (
                <button
                  onClick={clearAllFilters}
                  className="text-xs text-orange-600 font-semibold hover:underline"
                >
                  Clear All
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 4. Product Grid & Count Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Active Filters Badges & Result Summary */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-3 border-b border-neutral-200 text-xs">
          <div className="flex items-center gap-2 text-neutral-600">
            <span className="font-semibold text-neutral-900">
              {filteredProducts.length} {filteredProducts.length === 1 ? 'Product' : 'Products'} Found
            </span>
            <span>in</span>
            <span className="font-medium text-neutral-800">{category.name}</span>
            {selectedSubCategory !== 'All' && !selectedSubCategory.startsWith('All') && (
              <span className="bg-neutral-200 text-neutral-800 px-2 py-0.5 rounded font-medium text-[11px]">
                {selectedSubCategory}
              </span>
            )}
          </div>

          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="text-orange-600 hover:text-orange-700 font-medium hover:underline flex items-center gap-1"
            >
              <span>Reset all filters</span>
            </button>
          )}
        </div>

        {/* Product Cards Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-xl border border-neutral-200 h-96 animate-pulse p-4 flex flex-col justify-between">
                <div className="bg-neutral-100 aspect-4/3 rounded-lg mb-3" />
                <div className="space-y-2">
                  <div className="bg-neutral-100 h-4 rounded w-3/4" />
                  <div className="bg-neutral-100 h-3 rounded w-1/2" />
                </div>
                <div className="bg-neutral-100 h-9 rounded" />
              </div>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="bg-white rounded-2xl border border-neutral-200 p-12 text-center max-w-md mx-auto my-8 shadow-xs">
            <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center mx-auto mb-3 text-neutral-400">
              <CategoryIcon className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-neutral-900 mb-1">No products match your active filters</p>
            <p className="text-xs text-neutral-500 mb-4">
              Try adjusting your sub-category, price range, or clearing your brand filters.
            </p>
            <button
              onClick={clearAllFilters}
              className="px-4 py-2 bg-neutral-900 text-white rounded-lg text-xs font-semibold hover:bg-orange-600 transition-colors"
            >
              Reset Category Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onSelect={(p) => onSelectProduct(p)}
              />
            ))}
          </div>
        )}

        {/* 5. Category-Specific South African Buying Guide & FAQ Accordion */}
        <section className="mt-16 bg-white rounded-2xl border border-neutral-200 p-6 sm:p-10 shadow-xs">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 text-xs font-bold text-orange-600 uppercase tracking-widest mb-2">
              <HelpCircle className="w-4 h-4" />
              <span>South African Hardware Advisory</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-neutral-900 tracking-tight mb-2">
              {category.name} Buyer's Guide & Technical FAQs
            </h2>
            <p className="text-xs sm:text-sm text-neutral-500 mb-6">
              Essential technical considerations, power management advice, and local warranty coverage for Johannesburg, Cape Town, and Durban buyers.
            </p>

            <div className="space-y-3">
              {category.buyingAdvice.map((item, index) => {
                const isOpen = openFaqIndex === index;
                return (
                  <div
                    key={index}
                    className="border border-neutral-200 rounded-xl overflow-hidden transition-colors"
                  >
                    <button
                      onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                      className="w-full text-left px-5 py-4 flex items-center justify-between gap-4 bg-neutral-50 hover:bg-neutral-100 transition-colors"
                    >
                      <span className="text-xs sm:text-sm font-bold text-neutral-900">
                        {item.question}
                      </span>
                      <span className="text-neutral-400 font-mono text-sm shrink-0">
                        {isOpen ? '−' : '+'}
                      </span>
                    </button>
                    {isOpen && (
                      <div className="px-5 py-4 bg-white text-xs text-neutral-600 leading-relaxed border-t border-neutral-200">
                        {item.answer}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* 6. Explore Other Hardware Categories Grid */}
        <section className="mt-14 pt-10 border-t border-neutral-200">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-neutral-900 tracking-tight">
                Explore Other Hardware Categories
              </h3>
              <p className="text-xs text-neutral-500">
                Browse our full inventory of official hardware lines dispatched nationwide
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {otherCategories.map((other) => {
              const OtherIcon = ICON_MAP[other.iconName] || Sparkles;
              return (
                <button
                  key={other.slug}
                  onClick={() => {
                    onNavigateCategory(other.slug);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="group bg-white hover:bg-neutral-50 border border-neutral-200 rounded-xl p-4 text-left transition-all hover:border-orange-500 hover:shadow-sm flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-8 h-8 rounded-lg bg-neutral-100 group-hover:bg-orange-50 text-neutral-700 group-hover:text-orange-600 flex items-center justify-center transition-colors">
                      <OtherIcon className="w-4 h-4" />
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-neutral-400 group-hover:text-orange-600 group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-neutral-900 group-hover:text-orange-600 transition-colors line-clamp-1">
                      {other.name}
                    </h4>
                    <p className="text-[11px] text-neutral-500 mt-0.5 line-clamp-1">
                      {other.highlights[0]?.value || 'Sandton Stock'}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
};
