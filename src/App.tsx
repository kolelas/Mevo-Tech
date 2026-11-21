import React, { useEffect, useState, useCallback } from 'react';
import { AdminControlCentre } from './components/AdminControlCentre';
import { AuthProvider } from './context/AuthContext';
import { CartProvider, useCart } from './context/CartContext';
import { ComparisonProvider, useComparison } from './context/ComparisonContext';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { ProductCard } from './components/ProductCard';
import { ProductPage } from './components/ProductPage';
import { CustomerDashboard } from './components/CustomerDashboard';
import { AuthModal } from './components/AuthModal';
import { CartDrawer } from './components/CartDrawer';
import { WishlistDrawer } from './components/WishlistDrawer';
import { CheckoutModal } from './components/CheckoutModal';
import { OrderTrackingView } from './components/OrderTrackingView';
import { InfoPages } from './components/InfoPages';
import { PromotionalBanner } from './components/PromotionalBanner';
import { CategoryPage } from './components/CategoryPage';
import { CategoriesHub } from './components/CategoriesHub';
import { MevoPromoModal } from './components/MevoPromoModal';
import { ProductComparisonModal } from './components/ProductComparisonModal';
import { ProductComparisonDock } from './components/ProductComparisonDock';
import { ComparisonToastNotification } from './components/ComparisonToastNotification';
import { useAuth } from './context/AuthContext';
import { CATEGORIES_DATA, getCategoryBySlug, getCategoryByDbName } from './data/categories';
import { api } from './services/api';
import { Order, Product } from './types';
import {
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Filter,
  Laptop,
  Monitor,
  Cpu,
  Headphones,
  HardDrive,
  Wifi,
  Package,
  Flame,
  Clock,
  TrendingUp,
  Zap,
  Tag,
} from 'lucide-react';

const ICON_MAP = {
  Laptop,
  Monitor,
  Cpu,
  Headphones,
  HardDrive,
  Wifi,
};

export function MainStore() {
  const { isCustomerLoggedIn, openAuthModal } = useAuth();
  const { addItem, restoreAbandonedCart } = useCart();
  const { isComparisonModalOpen, setIsComparisonModalOpen } = useComparison();
  const [currentView, setCurrentView] = useState<string>('storefront');
  const [recoveryBanner, setRecoveryBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'relevance' | 'price_asc' | 'price_desc' | 'newest'>('relevance');

  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const [isCheckoutOpen, setIsCheckoutOpen] = useState<boolean>(false);
  const [trackedOrder, setTrackedOrder] = useState<Order | null>(null);

  // Strict logged-out checkout prevention: Route logged-out users to Registration
  const handleProceedToCheckout = useCallback(() => {
    if (!isCustomerLoggedIn) {
      openAuthModal('register', true);
    } else {
      setIsCheckoutOpen(true);
    }
  }, [isCustomerLoggedIn, openAuthModal]);

  // Handle abandoned cart recovery links (?recover_cart=<token> or #recover=<token>)
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const queryToken = searchParams.get('recover_cart');
    const hash = window.location.hash.replace('#', '');
    const hashToken = hash.startsWith('recover=') ? hash.slice('recover='.length) : null;
    const token = queryToken || hashToken;
    if (!token) return;

    restoreAbandonedCart(token).then((res) => {
      if (res.success) {
        setRecoveryBanner({
          type: 'success',
          message: `Welcome back! Restored ${res.itemCount || ''} item(s) from your saved cart${
            res.suggestedCouponCode ? ` with bonus code ${res.suggestedCouponCode}` : ''
          }.`,
        });
      } else {
        setRecoveryBanner({
          type: 'error',
          message: res.error || 'Could not restore saved cart link.',
        });
      }
      if (queryToken) {
        searchParams.delete('recover_cart');
        const nextSearch = searchParams.toString();
        const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ''}${window.location.hash}`;
        window.history.replaceState({}, '', nextUrl);
      }
      if (hashToken) {
        window.location.hash = 'storefront';
      }
    });
  }, [restoreAbandonedCart]);

  // Parse URL pathname and hash on mount and update view
  useEffect(() => {
    const handleLocationChange = () => {
      const hash = window.location.hash.replace('#', '');
  const path = window.location.pathname.replace(/\/+$/, '') || '/';

      if (
        hash === 'storefront' ||
        path === 'storefront' ||
        hash === 'shop' ||
        (hash === '' && path === '')
      ) {
        setCurrentView('storefront');
        return;
      }
      if (hash.startsWith('category=')) {
        const slug = hash.split('=')[1];
        if (getCategoryBySlug(slug)) {
          setCurrentView(`category_${slug}`);
          return;
        }
      }
      if (hash.startsWith('product=')) {
        const id = hash.split('=')[1];
        const found = products.find((p) => p.id === id || p.slug === id);
        if (found) {
          setSelectedProduct(found);
          setCurrentView('product');
          return;
        }
      }
      if (hash === 'categories' || path === 'categories') {
        setCurrentView('categories_hub');
        return;
      }
      if (hash === 'track' || path === 'track') {
        setCurrentView('track');
        return;
      }
      if (hash === 'account' || hash.startsWith('account_') || path === 'account') {
        setCurrentView(hash || 'account');
        return;
      }
      if (hash.startsWith('info_')) {
        setCurrentView(hash);
        return;
      }
      setCurrentView('storefront');
    };

    handleLocationChange();
    window.addEventListener('hashchange', handleLocationChange);
    window.addEventListener('popstate', handleLocationChange);
    return () => {
      window.removeEventListener('hashchange', handleLocationChange);
      window.removeEventListener('popstate', handleLocationChange);
    };
  }, [products]);

  // Update hash when currentView changes
  const navigateToView = useCallback((view: string) => {
    setCurrentView(view);
    if (view.startsWith('category_')) {
      const slug = view.replace('category_', '');
      window.location.hash = `category=${slug}`;
    } else if (view === 'categories_hub') {
      window.location.hash = 'categories';
    } else if (view === 'track') {
      window.location.hash = 'track';
    } else if (view.startsWith('account')) {
      window.location.hash = view;
    } else if (view.startsWith('info_')) {
      window.location.hash = view;
    } else if (view === 'product' && selectedProduct) {
      window.location.hash = `product=${selectedProduct.id}`;
    } else {
      window.location.hash = 'storefront';
    }
  }, [selectedProduct]);

  const handleSelectProduct = useCallback((product: Product) => {
    setSelectedProduct(product);
    setCurrentView('product');
    window.location.hash = `product=${product.id}`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const navigateToCategory = useCallback((slug: string) => {
    navigateToView(`category_${slug}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [navigateToView]);

  const loadProducts = async () => {
    setIsLoading(true);
    try {
      const data = await api.getProducts({
        search: searchQuery,
        sort: sortBy === 'relevance' ? undefined : sortBy,
      });
      setProducts(data);
    } catch (e) {
      console.error('Failed to load products', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, [searchQuery, sortBy]);

  const handleOrderCompleted = (order: Order) => {
    setTrackedOrder(order);
    navigateToView('track');
  };

  // Check if current view is a dedicated Category page
  const isCategoryView = currentView.startsWith('category_');
  const currentCategorySlug = isCategoryView ? currentView.replace('category_', '') : null;
  const currentCategoryConfig = currentCategorySlug ? getCategoryBySlug(currentCategorySlug) : undefined;

  // Products for the current dedicated category page
  const categoryProducts = currentCategoryConfig
    ? products.filter(
        (p) => p.category.toLowerCase() === currentCategoryConfig.dbCategory.toLowerCase()
      )
    : [];

  // Dynamic Storefront Merchandising Zones
  const heroSpotlightProduct = products.find((p) => p.placementSlot === 'hero_spotlight') || products[0];
  const dealsOfDayProducts = products
    .filter((p) => p.placementSlot === 'deals_of_the_day')
    .sort((a, b) => (b.placementPriority || 0) - (a.placementPriority || 0));
  const trendingProducts = products
    .filter((p) => p.placementSlot === 'trending_now')
    .sort((a, b) => (b.placementPriority || 0) - (a.placementPriority || 0));

  // Pinned products and high-priority items lead the catalogue when sorting by relevance
  const sortedCatalogueProducts = [...products].sort((a, b) => {
    if (sortBy === 'relevance') {
      if (a.isPinnedToTop && !b.isPinnedToTop) return -1;
      if (!a.isPinnedToTop && b.isPinnedToTop) return 1;
      return (b.placementPriority || 0) - (a.placementPriority || 0);
    }
    return 0;
  });

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden flex flex-col bg-neutral-50 text-neutral-900 font-sans">
      {/* Universal Storefront Header with 3-Zone Contract */}
      <Header
        currentView={currentView}
        setCurrentView={navigateToView}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onNavigateCategory={navigateToCategory}
        products={products}
        onSelectProduct={handleSelectProduct}
        onProceedToCheckout={handleProceedToCheckout}
      />

      {recoveryBanner && (
        <div
          className={`px-4 py-2.5 text-xs border-b flex items-center justify-between gap-3 ${
            recoveryBanner.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="max-w-7xl mx-auto flex-1 flex items-center justify-between gap-3">
            <span className="font-semibold">{recoveryBanner.message}</span>
            <button
              type="button"
              onClick={() => setRecoveryBanner(null)}
              className="text-xs font-bold underline cursor-pointer shrink-0"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1">
        {/* VIEW: DEDICATED CATEGORY PAGE */}
        {isCategoryView && currentCategoryConfig && (
          <CategoryPage
            category={currentCategoryConfig}
            products={categoryProducts}
            isLoading={isLoading}
            onSelectProduct={(p) => handleSelectProduct(p)}
            onNavigateCategory={navigateToCategory}
            onBackToHome={() => navigateToView('storefront')}
          />
        )}

        {/* VIEW: ALL CATEGORIES DIRECTORY HUB */}
        {currentView === 'categories_hub' && (
          <CategoriesHub
            products={products}
            onSelectCategory={navigateToCategory}
            onBackToHome={() => navigateToView('storefront')}
          />
        )}

        {/* VIEW: STOREFRONT HOME */}
        {currentView === 'storefront' && (
          <div>
            {/* Real-time Seasonal Sales & Flash Deals Banner with direct category page routing */}
            <PromotionalBanner
              onSelectCategory={(catName) => {
                const config = getCategoryByDbName(catName) || getCategoryBySlug(catName);
                if (config) {
                  navigateToCategory(config.slug);
                }
              }}
              products={products}
              onSelectProduct={handleSelectProduct}
            />

            {/* Storefront Hero Section */}
            <section className="relative bg-neutral-900 text-white overflow-hidden border-b border-neutral-800">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-20 grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
                {/* Text Content */}
                <div className="space-y-6 z-10">
                  <div className="flex items-center gap-2 text-xs font-semibold text-orange-400 uppercase tracking-widest">
                    <span>Sandton Warehouse Depot</span>
                    <span aria-hidden="true">·</span>
                    <span>100% Own Local Stock</span>
                  </div>

                  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight text-balance">
                    Precision Technology Engineered for South Africa
                  </h1>

                  <p className="text-sm sm:text-base text-neutral-400 max-w-lg leading-relaxed">
                    Flagship workstations, QD-OLED curved displays, and audiophile gear. Dedicated category pages with deep technical specifications, verified local warranties, secure rand payment gateways, and free nationwide courier delivery.
                  </p>

                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <button
                      onClick={() => navigateToView('categories_hub')}
                      className="px-6 py-3.5 bg-orange-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-orange-700 transition-colors shadow-lg flex items-center gap-2 group"
                    >
                      <span>Explore Category Pages</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </button>

                    <button
                      onClick={() => navigateToCategory('laptops-notebooks')}
                      className="px-6 py-3.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors border border-neutral-700"
                    >
                      Laptops Page
                    </button>

                    <button
                      onClick={() => navigateToCategory('monitors-displays')}
                      className="px-6 py-3.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors border border-neutral-700"
                    >
                      Displays Page
                    </button>
                  </div>

                  {/* Trust markers */}
                  <div className="pt-4 flex flex-wrap items-center gap-6 text-xs text-neutral-400">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <span>Official 2-3 Year Local Warranty</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-orange-400 font-bold">15% VAT</span>
                      <span>Compliant Invoicing Included</span>
                    </div>
                  </div>
                </div>

                {/* Hero Showcase Photography & Spotlight */}
                <div
                  onClick={() => heroSpotlightProduct && handleSelectProduct(heroSpotlightProduct)}
                  className="relative aspect-16/10 rounded-2xl overflow-hidden shadow-2xl border border-neutral-800 bg-neutral-950 flex items-center justify-center cursor-pointer group"
                >
                  <img
                    src={heroSpotlightProduct?.primaryImage || "/src/assets/images/hero_tech_showcase_1793053698167.jpg"}
                    alt={heroSpotlightProduct?.name || "Mevo Tech flagship computing setup"}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/90 via-neutral-950/20 to-transparent pointer-events-none" />

                  <div className="absolute top-4 left-4 flex items-center gap-2">
                    <span className="bg-orange-600/90 text-white text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md backdrop-blur-md flex items-center gap-1.5 shadow-md">
                      <Sparkles className="w-3.5 h-3.5 text-orange-200" />
                      Hero Spotlight
                    </span>
                  </div>

                  <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-xs text-neutral-300 backdrop-blur-md bg-neutral-900/80 p-3.5 rounded-xl border border-neutral-700/80 group-hover:border-orange-500 transition-colors">
                    <div>
                      <p className="font-bold text-white group-hover:text-orange-300 transition-colors text-sm">
                        {heroSpotlightProduct?.name || 'Mevo StudioBook Pro 16 & Lumina OLED'}
                      </p>
                      <p className="text-[11px] text-neutral-400">
                        {heroSpotlightProduct?.tagline || 'Tested and bench-verified in Johannesburg'}
                      </p>
                    </div>
                    <div className="text-right pl-3 shrink-0">
                      <span className="font-mono font-bold text-orange-400 text-sm block">
                        {heroSpotlightProduct
                          ? (heroSpotlightProduct.promotionalPriceCents
                              ? `R ${(heroSpotlightProduct.promotionalPriceCents / 100).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`
                              : `R ${(heroSpotlightProduct.priceCents / 100).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`)
                          : 'From R 21,999.00'}
                      </span>
                      <span className="text-[10px] text-neutral-400 flex items-center justify-end gap-1 group-hover:text-orange-300">
                        View item <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* DEDICATED CATEGORY SHOWCASE SECTION */}
            <section className="bg-white border-b border-neutral-200 py-12">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col sm:flex-row items-baseline justify-between mb-8">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-bold text-orange-600 uppercase tracking-widest mb-1">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Independent Category Pages</span>
                    </div>
                    <h2 className="text-2xl font-extrabold text-neutral-900 tracking-tight">
                      Browse by Official Department
                    </h2>
                  </div>
                  <button
                    onClick={() => navigateToView('categories_hub')}
                    className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1 mt-2 sm:mt-0"
                  >
                    <span>View all departments</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* 6 Category Tiles Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {CATEGORIES_DATA.map((cat) => {
                    const Icon = ICON_MAP[cat.iconName] || Package;
                    const catCount = products.filter(
                      (p) => p.category.toLowerCase() === cat.dbCategory.toLowerCase()
                    ).length;

                    return (
                      <button
                        key={cat.slug}
                        onClick={() => navigateToCategory(cat.slug)}
                        className="group text-left bg-neutral-50 hover:bg-white border border-neutral-200 hover:border-orange-500 rounded-2xl overflow-hidden shadow-xs hover:shadow-[0_0_25px_rgba(234, 88, 12,0.35)] transition-all duration-300 flex flex-col justify-between"
                      >
                        <div className="relative aspect-16/9 w-full bg-neutral-900 overflow-hidden">
                          <img
                            src={cat.heroImage}
                            alt={cat.name}
                            className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500 opacity-90"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/30 to-transparent" />
                          <div className="absolute top-3 left-3 bg-neutral-900/80 backdrop-blur-md px-2.5 py-1 rounded-lg text-xs font-semibold text-white flex items-center gap-1.5 border border-neutral-800">
                            <Icon className="w-3.5 h-3.5 text-orange-400" />
                            <span>{catCount} SKUs In Stock</span>
                          </div>
                        </div>

                        <div className="p-5 w-full flex-1 flex flex-col justify-between space-y-3">
                          <div>
                            <h3 className="text-base font-bold text-neutral-900 group-hover:text-orange-600 transition-colors">
                              {cat.name}
                            </h3>
                            <p className="text-xs text-neutral-500 mt-1 line-clamp-2">
                              {cat.tagline}
                            </p>
                          </div>

                          <div className="flex items-center justify-between text-xs pt-2 border-t border-neutral-200">
                            <span className="font-medium text-neutral-600">
                              {cat.highlights[0]?.value}
                            </span>
                            <span className="font-bold text-orange-600 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                              <span>Enter Page</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* MERCHANDISING ZONE 1: DEALS OF THE DAY */}
            {dealsOfDayProducts.length > 0 && (
              <section className="bg-neutral-900 text-white py-12 border-b border-neutral-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                    <div>
                      <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold uppercase tracking-wider mb-2">
                        <Flame className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                        <span>Curated Merchandising · Deals of the Day</span>
                      </div>
                      <h2 className="text-2xl font-black text-white tracking-tight">
                        Exclusive Limited-Allocation Deals
                      </h2>
                      <p className="text-xs text-neutral-400 mt-1">
                        Hand-picked daily hardware discounts direct from Sandton stock. Guaranteed dispatch today.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 bg-neutral-800/80 border border-neutral-700 px-3 py-1.5 rounded-xl text-xs text-neutral-300">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      <span>Refreshes Daily 00:00 SAST</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {dealsOfDayProducts.map((product) => (
                      <ProductCard
                        key={`deal-${product.id}`}
                        product={product}
                        onSelect={(p) => handleSelectProduct(p)}
                      />
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* MERCHANDISING ZONE 2: TRENDING NOW */}
            {trendingProducts.length > 0 && (
              <section className="bg-orange-950/20 border-b border-orange-900/30 py-12">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                    <div>
                      <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-orange-500/20 border border-orange-500/40 text-orange-300 text-xs font-bold uppercase tracking-wider mb-2">
                        <TrendingUp className="w-3.5 h-3.5 text-orange-400" />
                        <span>Storefront Trending Ribbon</span>
                      </div>
                      <h2 className="text-2xl font-black text-neutral-900 tracking-tight">
                        Trending Hardware Across Mevo Tech
                      </h2>
                      <p className="text-xs text-neutral-500 mt-1">
                        Most purchased, reviewed, and requested workstation gear this week in South Africa.
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        const anchor = document.getElementById('catalogue-anchor');
                        anchor?.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1 self-start sm:self-auto"
                    >
                      <span>Explore all inventory</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {trendingProducts.map((product) => (
                      <ProductCard
                        key={`trend-${product.id}`}
                        product={product}
                        onSelect={(p) => handleSelectProduct(p)}
                      />
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* Quick In-Stock Catalogue Grid */}
            <section id="catalogue-anchor" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
              <div className="flex flex-col sm:flex-row items-baseline justify-between mb-8 gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-neutral-900 tracking-tight">
                    All Physical Inventory Ready for Dispatch
                  </h2>
                  <p className="text-xs text-neutral-500 mt-1">
                    {products.length} verified products available immediately at Sandton depot
                  </p>
                </div>

                {/* Sort dropdown */}
                <div className="flex items-center gap-2 self-start sm:self-auto text-xs text-neutral-500">
                  <Filter className="w-3.5 h-3.5" />
                  <span>Sort:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="bg-white border border-neutral-200 rounded-lg px-2.5 py-1 text-xs text-neutral-800 focus:outline-none"
                  >
                    <option value="relevance">Featured & Relevant</option>
                    <option value="price_asc">Price: Low to High</option>
                    <option value="price_desc">Price: High to Low</option>
                    <option value="newest">Newest Arrivals</option>
                  </select>
                </div>
              </div>

              {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                    <div key={i} className="bg-white rounded-xl border border-neutral-200 h-80 animate-pulse p-4 flex flex-col justify-between">
                      <div className="bg-neutral-100 aspect-4/3 rounded-lg mb-3" />
                      <div className="space-y-2">
                        <div className="bg-neutral-100 h-4 rounded w-3/4" />
                        <div className="bg-neutral-100 h-3 rounded w-1/2" />
                      </div>
                      <div className="bg-neutral-100 h-8 rounded" />
                    </div>
                  ))}
                </div>
              ) : products.length === 0 ? (
                <div className="bg-white rounded-2xl border border-neutral-200 p-12 text-center max-w-md mx-auto my-12">
                  <p className="text-sm font-bold text-neutral-900 mb-1">No products match your criteria</p>
                  <p className="text-xs text-neutral-500 mb-4">Try clearing your search query.</p>
                  <button
                    onClick={() => setSearchQuery('')}
                    className="px-4 py-2 bg-neutral-900 text-white rounded-lg text-xs font-semibold hover:bg-orange-600 transition-colors"
                  >
                    Clear Search
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {sortedCatalogueProducts.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onSelect={(p) => handleSelectProduct(p)}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {/* VIEW: DEDICATED PRODUCT INFORMATION PAGE (Matches Reference) */}
        {currentView === 'product' && selectedProduct && (
          <ProductPage
            product={selectedProduct}
            allProducts={products}
            onSelectProduct={(p) => handleSelectProduct(p)}
            onBackToStore={() => navigateToView('storefront')}
            onProceedToCheckout={handleProceedToCheckout}
          />
        )}

        {/* VIEW: CUSTOMER ACCOUNT, DELIVERIES, BOUGHT TECH, & WISHLIST */}
        {currentView.startsWith('account') && (
          <CustomerDashboard
            allProducts={products}
            initialTab={
              currentView === 'account_orders'
                ? 'orders'
                : currentView === 'account_bought'
                ? 'bought'
                : currentView === 'account_favourites'
                ? 'favourites'
                : currentView === 'account_profile'
                ? 'profile'
                : currentView === 'account_saved_carts'
                ? 'saved_carts'
                : 'overview'
            }
            onSelectProduct={(p) => handleSelectProduct(p)}
            onBackToStore={() => navigateToView('storefront')}
            onProceedToPayOrder={(order) => {
              setTrackedOrder(order);
              handleProceedToCheckout();
            }}
          />
        )}

        {/* VIEW: TRACK ORDER */}
        {currentView === 'track' && (
          <OrderTrackingView
            initialOrder={trackedOrder}
            onBackToShopping={() => navigateToView('storefront')}
          />
        )}

        {/* VIEW: INFORMATIONAL & LEGAL PAGES */}
        {currentView.startsWith('info_') && (
          <InfoPages
            page={currentView}
            onBackToStore={() => navigateToView('storefront')}
          />
        )}
      </main>

      {/* Cart Drawer */}
      <CartDrawer
        onProceedToCheckout={handleProceedToCheckout}
      />

      {/* Wishlist Drawer */}
      <WishlistDrawer
        products={products}
        onSelectProduct={(p) => handleSelectProduct(p)}
        onExploreProducts={() => navigateToView('categories_hub')}
      />

      {/* Checkout Modal */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        onOrderComplete={handleOrderCompleted}
      />

      {/* Customer Authentication Modal with Checkout Continuation Flow */}
      <AuthModal onAuthSuccess={() => setIsCheckoutOpen(true)} />

      {/* Mevo Promotions & Vouchers Pop-Up Modal */}
      <MevoPromoModal
        products={products}
        onSelectProduct={(p) => handleSelectProduct(p)}
        onExploreDeals={() => navigateToView('categories_hub')}
        onAddToCart={(p) => addItem(p)}
      />

      {/* Product Comparison Modal (Up to 3 products side-by-side) */}
      <ProductComparisonModal
        isOpen={isComparisonModalOpen}
        onClose={() => setIsComparisonModalOpen(false)}
        allProducts={products}
        onSelectProduct={(p) => handleSelectProduct(p)}
      />

      {/* Product Comparison Persistent Floating Dock */}
      <ProductComparisonDock />

      {/* Product Comparison Toast Notification */}
      <ComparisonToastNotification />

      {/* Universal Footer */}
      <Footer onNavigate={(view) => {
        if (view.startsWith('category_')) {
          const slug = view.replace('category_', '');
          navigateToCategory(slug);
        } else {
          navigateToView(view);
        }
      }} />
    </div>
  );
}

function isAdminLocation() {
  const path = window.location.pathname.replace(/\\/+$/, '') || '/';
  const hash = window.location.hash.replace(/^#/, '');
  return path === '/admin' || path.startsWith('/admin/') || hash === 'admin';
}

export function App() {
  const [isAdminRoute, setIsAdminRoute] = useState(isAdminLocation);

  useEffect(() => {
    const syncRoute = () => setIsAdminRoute(isAdminLocation());
    window.addEventListener('hashchange', syncRoute);
    window.addEventListener('popstate', syncRoute);
    return () => {
      window.removeEventListener('hashchange', syncRoute);
      window.removeEventListener('popstate', syncRoute);
    };
  }, []);

  if (isAdminRoute) return <AdminControlCentre />;

  return (
    <AuthProvider>
      <CartProvider>
        <ComparisonProvider>
          <MainStore />
        </ComparisonProvider>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;
