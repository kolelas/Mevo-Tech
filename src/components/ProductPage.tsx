import React, { useState, useEffect } from 'react';
import { Product, ProductReview, ProductVariant } from '../types';
import { formatZAR, calculatePayflexInstalments } from '../utils/calculations';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useComparison } from '../context/ComparisonContext';
import { api } from '../services/api';
import { ReviewModal } from './ReviewModal';
import { ShareModal } from './ShareModal';
import { PriceDropAlertModal } from './PriceDropAlertModal';
import { SponsoredAdCard } from './SponsoredAdCard';
import {
  ShieldCheck,
  Truck,
  RotateCcw,
  Check,
  ShoppingBag,
  Heart,
  ChevronRight,
  Star,
  Lock,
  ArrowRight,
  Info,
  Clock,
  Sparkles,
  Zap,
  Store,
  CheckCircle2,
  Phone,
  HelpCircle,
  PackageCheck,
  Share2,
  MessageSquarePlus,
  ThumbsUp,
  Scale,
  Bell,
  TrendingDown,
} from 'lucide-react';

interface ProductPageProps {
  product: Product;
  allProducts: Product[];
  onSelectProduct: (product: Product) => void;
  onBackToStore: () => void;
  onProceedToCheckout: () => void;
}

export const ProductPage: React.FC<ProductPageProps> = ({
  product,
  allProducts,
  onSelectProduct,
  onBackToStore,
  onProceedToCheckout,
}) => {
  const {
    items,
    itemCount,
    subtotalCents,
    setIsDrawerOpen,
    addItem,
    isInWishlist,
    toggleWishlist,
  } = useCart();

  const {
    isInCompare,
    toggleCompare,
    addToCompare,
    setIsComparisonModalOpen,
  } = useComparison();

  const isCompared = isInCompare(product.id);

  const { customer, isCustomerLoggedIn, openAuthModal } = useAuth();

  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | undefined>(() =>
    product.variants && product.variants.length > 0 ? product.variants[0] : undefined
  );
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [addedAnimation, setAddedAnimation] = useState(false);
  const [bundleChecked, setBundleChecked] = useState<Record<string, boolean>>({});

  // Dynamic reviews & share modals
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [averageRating, setAverageRating] = useState<number>(5.0);
  const [reviewsCount, setReviewsCount] = useState<number>(0);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isPriceAlertModalOpen, setIsPriceAlertModalOpen] = useState(false);
  const [shareProduct, setShareProduct] = useState<Product | null>(null);

  // Load reviews on product mount
  useEffect(() => {
    let isMounted = true;
    const fetchReviews = async () => {
      try {
        const data = await api.getProductReviews(product.id);
        if (isMounted) {
          setReviews(data.reviews);
          setAverageRating(data.averageRating);
          setReviewsCount(data.count);
        }
      } catch (err) {
        console.warn('Could not load reviews', err);
      }
    };

    fetchReviews();
    return () => {
      isMounted = false;
    };
  }, [product.id]);

  const currentPrice = selectedVariant
    ? selectedVariant.promotionalPriceCents || selectedVariant.priceCents
    : product.promotionalPriceCents || product.priceCents;

  const originalPrice = selectedVariant
    ? selectedVariant.priceCents
    : product.priceCents;

  const hasDiscount = Boolean(
    (selectedVariant?.promotionalPriceCents && selectedVariant.promotionalPriceCents < originalPrice) ||
    (product.promotionalPriceCents && product.promotionalPriceCents < product.priceCents)
  );

  const discountPercent = hasDiscount
    ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100)
    : 0;

  const availableStock = selectedVariant
    ? selectedVariant.onHandQuantity - selectedVariant.reservedQuantity
    : product.onHandQuantity - product.reservedQuantity;

  const isOutOfStock = availableStock <= 0;
  const payflex = calculatePayflexInstalments(currentPrice);

  const images = product.images && product.images.length > 0 ? product.images : [product.primaryImage];

  // Frequently bought together / bundle items (from same or related category)
  const bundleCandidates = allProducts
    .filter((p) => p.id !== product.id)
    .slice(0, 3);

  // Recommendations: products from same department or other in-stock hardware
  const sameCategoryProducts = allProducts.filter(
    (p) => p.id !== product.id && p.category.toLowerCase() === product.category.toLowerCase()
  );
  const otherRecommendations = allProducts.filter(
    (p) => p.id !== product.id && p.category.toLowerCase() !== product.category.toLowerCase()
  );
  const recommendedProducts = [...sameCategoryProducts, ...otherRecommendations];

  const handleAddToCart = () => {
    if (isOutOfStock) return;
    addItem(product, selectedVariant, quantity);
    setAddedAnimation(true);
    setTimeout(() => setAddedAnimation(false), 1500);
  };

  const handleAddBundleToCart = (candidate: Product) => {
    addItem(candidate, undefined, 1);
    setBundleChecked((prev) => ({ ...prev, [candidate.id]: true }));
    setTimeout(() => {
      setBundleChecked((prev) => ({ ...prev, [candidate.id]: false }));
    }, 2000);
  };

  const handleReviewSubmitted = (newReview: ProductReview) => {
    setReviews((prev) => [newReview, ...prev]);
    setReviewsCount((prev) => prev + 1);
  };

  const handleOpenReviewModal = () => {
    if (!isCustomerLoggedIn) {
      openAuthModal('login');
      return;
    }
    setIsReviewModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-neutral-100/60 pb-24 animate-in fade-in">
      {/* 1. Top Value Proposition Bar (Matches Image 1: Free shipping Incredible | Direct Sandton Depot) */}
      <div className="bg-neutral-900 text-white text-xs border-b border-neutral-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 font-bold text-emerald-400">
              <Truck className="w-4 h-4" />
              <span>Free shipping &gt; Incredible</span>
            </span>
            <span className="text-neutral-600">|</span>
            <span className="text-neutral-300">
              Direct Sandton Depot Dispatch · 100% Local South African Inventory
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-4 text-neutral-300 text-[11px]">
            <span className="flex items-center gap-1 text-orange-300">
              <PackageCheck className="w-3.5 h-3.5" />
              <span>No import-related duties · 15% VAT included</span>
            </span>
            <span className="text-neutral-600">·</span>
            <span className="flex items-center gap-1 text-neutral-400">
              <Phone className="w-3 h-3" />
              <span>Sandton Desk: 011 884 9200</span>
            </span>
          </div>
        </div>
      </div>

      {/* 2. Trust Seals Strip (Matches Image 1: Safe payments | Secure logistics | Secure privacy | Purchase protection) */}
      <div className="bg-white border-b border-neutral-200 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5">
          <div className="flex items-center justify-between gap-4 text-xs font-semibold text-neutral-700 overflow-x-auto whitespace-nowrap">
            <div className="flex items-center gap-6 sm:gap-8">
              <span className="flex items-center gap-1.5 text-neutral-800">
                <Check className="w-4 h-4 text-emerald-600 rounded-full bg-emerald-50 p-0.5 shrink-0" />
                <span>Safe payments</span>
              </span>
              <span className="flex items-center gap-1.5 text-neutral-800">
                <Truck className="w-4 h-4 text-orange-600 shrink-0" />
                <span>Secure logistics</span>
              </span>
              <span className="flex items-center gap-1.5 text-neutral-800">
                <Lock className="w-4 h-4 text-orange-600 shrink-0" />
                <span>Secure privacy</span>
              </span>
              <span className="flex items-center gap-1.5 text-neutral-800">
                <ShieldCheck className="w-4 h-4 text-orange-600 shrink-0" />
                <span>Purchase protection</span>
              </span>
            </div>

            <div className="text-orange-600 hover:text-orange-700 font-bold cursor-pointer hidden md:flex items-center gap-1">
              <span>Mevo Tech keeps you safe</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>
      </div>

      {/* Breadcrumb Navigation Trail */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
        <nav className="flex items-center gap-2 text-xs text-neutral-500 font-medium overflow-x-auto whitespace-nowrap">
          <button
            onClick={onBackToStore}
            className="hover:text-orange-600 transition-colors flex items-center gap-1 cursor-pointer"
          >
            <span>Storefront</span>
          </button>
          <ChevronRight className="w-3 h-3 text-neutral-400 shrink-0" />
          <span className="hover:text-orange-600 transition-colors cursor-pointer">{product.category}</span>
          <ChevronRight className="w-3 h-3 text-neutral-400 shrink-0" />
          <span className="text-neutral-900 font-semibold truncate max-w-md">{product.name}</span>
        </nav>

        {/* Top Actions: Compare, Price Alert & Share */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => setIsPriceAlertModalOpen(true)}
            className="text-xs font-bold text-neutral-700 hover:text-orange-600 bg-neutral-100 hover:bg-neutral-200 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
            title="Get notified when price drops"
          >
            <Bell className="w-3.5 h-3.5 text-orange-600" />
            <span className="hidden sm:inline">Price Alert</span>
          </button>

          <button
            type="button"
            onClick={() => toggleCompare(product)}
            className={`text-xs font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
              isCompared
                ? 'bg-orange-600 text-white shadow-xs'
                : 'text-neutral-700 hover:text-orange-600 bg-neutral-100 hover:bg-neutral-200'
            }`}
            title={isCompared ? 'Remove from Comparison' : 'Add to Comparison (up to 3 models)'}
          >
            <Scale className="w-3.5 h-3.5" />
            <span>{isCompared ? 'In Comparison' : 'Compare Model'}</span>
          </button>

          <button
            onClick={() => setIsShareModalOpen(true)}
            className="text-xs font-bold text-neutral-600 hover:text-orange-600 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Share</span>
          </button>
        </div>
      </div>

      {/* 3. Main Product Stage (Matches Reference: Gallery Left + Details & Bundles Center + Sticky Subtotal Right) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* MAIN PRODUCT HERO CARD (Columns 1 to 9) */}
          <div className="lg:col-span-9 bg-white rounded-2xl border border-neutral-200 shadow-sm p-6 sm:p-8 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">

              {/* Column A: Gallery Showcase (Left side of product card) */}
              <div className="md:col-span-5 space-y-4">
                <div className="relative aspect-square rounded-2xl overflow-hidden bg-neutral-50 border border-neutral-200 flex items-center justify-center group shadow-xs">
                  <img
                    src={images[activeImageIndex] || product.primaryImage}
                    alt={product.name}
                    className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                  />
                  {hasDiscount && (
                    <span className="absolute top-3 left-3 bg-orange-600 text-white font-bold text-xs px-2.5 py-1 rounded-lg uppercase tracking-wider shadow-sm">
                      -{discountPercent}% OFF
                    </span>
                  )}
                  <div className="absolute top-3 right-3 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsShareModalOpen(true)}
                      className="p-2 rounded-full bg-white/90 hover:bg-white text-neutral-600 hover:text-orange-600 shadow-md transition-all cursor-pointer"
                      title="Share product"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleWishlist(product.id)}
                      className="p-2 rounded-full bg-white/90 hover:bg-white text-neutral-600 hover:text-rose-600 shadow-md transition-all cursor-pointer"
                      aria-label="Save to wishlist"
                      title={isInWishlist(product.id) ? 'Remove from wishlist' : 'Save to wishlist'}
                    >
                      <Heart
                        className={`w-4 h-4 ${
                          isInWishlist(product.id) ? 'fill-rose-500 text-rose-500' : ''
                        }`}
                      />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        addToCompare(product);
                        setIsComparisonModalOpen(true);
                      }}
                      className="w-full py-2.5 px-4 rounded-xl text-xs font-bold border border-neutral-300 hover:border-orange-500 hover:bg-orange-50/50 text-neutral-800 hover:text-orange-700 transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Scale className="w-4 h-4 text-orange-600" />
                      <span>Compare Specs Side-by-Side (Up to 3 Products)</span>
                    </button>
                  </div>
                </div>

                {/* Thumbnails list */}
                {images.length > 1 && (
                  <div className="flex gap-2.5 overflow-x-auto pb-1">
                    {images.map((img, idx) => (
                      <button
                        key={idx}
                        onClick={() => setActiveImageIndex(idx)}
                        className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition-all shrink-0 cursor-pointer ${
                          activeImageIndex === idx
                            ? 'border-orange-600 ring-2 ring-orange-100 shadow-sm'
                            : 'border-neutral-200 opacity-70 hover:opacity-100'
                        }`}
                      >
                        <img src={img} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}

                {/* Dispatch guarantee badge */}
                <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200/80 text-xs text-neutral-600 space-y-2">
                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-orange-600 shrink-0" />
                    <span>In stock at Sandton depot · Dispatched in 24h</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{product.warrantyPeriodMonths}-Month Official South African Warranty</span>
                  </div>
                </div>
              </div>

              {/* Column B: Product Details, Pricing, & Add to Cart Module */}
              <div className="md:col-span-7 flex flex-col justify-between space-y-5">
                <div>
                  {/* Brand & Sold statistics (Matches Reference: (8k+ sold), by ZEEMING...) */}
                  <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500 mb-1.5">
                    <span className="font-bold text-neutral-700">(1,250+ sold),</span>
                    <span className="flex items-center gap-1 font-semibold text-neutral-800 hover:text-orange-600 transition-colors cursor-pointer">
                      <Store className="w-3.5 h-3.5 text-orange-600" />
                      <span>{product.brand.toUpperCase()} DIRECT SANDTON (200K+ sold)</span>
                      <ChevronRight className="w-3 h-3 text-neutral-400" />
                    </span>
                  </div>

                  {/* Product Title */}
                  <h1 className="text-xl sm:text-2xl font-black text-neutral-900 tracking-tight leading-snug">
                    {product.name}
                  </h1>

                  {/* Subtitle / Tagline */}
                  <p className="text-xs sm:text-sm text-neutral-600 mt-1.5 leading-relaxed">
                    {product.tagline}
                  </p>

                  {/* Price Block (Matches Reference: Big R180, RRP R567, -68%) */}
                  <div className="mt-4 p-4 rounded-2xl bg-neutral-50 border border-neutral-200/90 space-y-2">
                    <div className="flex items-baseline gap-3">
                      <span className="text-3xl font-black text-neutral-900 font-mono tracking-tight">
                        {formatZAR(currentPrice)}
                      </span>
                      {hasDiscount && (
                        <>
                          <span className="text-sm font-semibold text-neutral-400 line-through font-mono flex items-center gap-1">
                            <span>RRP {formatZAR(originalPrice)}</span>
                            <Info className="w-3.5 h-3.5 text-neutral-400 cursor-pointer" />
                          </span>
                          <span className="text-xs font-bold bg-orange-100 text-orange-700 px-2 py-0.5 rounded-md">
                            -{discountPercent}%
                          </span>
                        </>
                      )}
                    </div>
                    <p className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 shrink-0" />
                      <span>Direct South African Warehouse Dispatch · No import duty, 15% VAT included.</span>
                    </p>

                    {/* Payflex BNPL Breakdown */}
                    <div className="pt-2 border-t border-neutral-200/60 flex items-center justify-between text-xs text-neutral-600">
                      <span>Or 4 payments of <strong>{formatZAR(payflex.instalmentCents)}</strong> with</span>
                      <span className="font-bold text-orange-700 bg-orange-100/70 px-2 py-0.5 rounded">
                        Payflex (0% Interest)
                      </span>
                    </div>

                    {/* Price Drop Alert Trigger */}
                    <div className="pt-2 border-t border-neutral-200/50 flex items-center justify-between text-xs">
                      <span className="text-[11px] text-neutral-500">Waiting for a discount?</span>
                      <button
                        type="button"
                        onClick={() => setIsPriceAlertModalOpen(true)}
                        className="font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1 cursor-pointer hover:underline"
                      >
                        <Bell className="w-3.5 h-3.5" />
                        <span>Notify me when price drops</span>
                      </button>
                    </div>
                  </div>

                  {/* Customer Review Snippets & Add Review Trigger */}
                  <div className="mt-4 space-y-2">
                    {reviews.slice(0, 2).map((q) => (
                      <div
                        key={q.id}
                        className="p-2.5 bg-amber-50/80 border border-amber-200/70 rounded-xl text-xs text-amber-950 flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-bold shrink-0">{q.authorName}</span>
                          <div className="flex text-amber-500 shrink-0">
                            {[...Array(q.rating)].map((_, i) => (
                              <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
                            ))}
                          </div>
                          <p className="truncate text-amber-900">
                            "{q.comment}"
                          </p>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                      </div>
                    ))}

                    <div className="flex items-center justify-between pt-1 text-xs">
                      <div className="flex items-center gap-1.5 text-neutral-600">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <span className="font-bold text-neutral-900">{averageRating.toFixed(1)} / 5</span>
                        <span>({reviewsCount} customer {reviewsCount === 1 ? 'review' : 'reviews'})</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleOpenReviewModal}
                        className="font-bold text-orange-600 hover:text-orange-700 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <MessageSquarePlus className="w-3.5 h-3.5" />
                        <span>Post Your Review</span>
                      </button>
                    </div>
                  </div>

                  {/* Quantity and Large Add-to-Cart Button (Matches Reference: Big Add to Cart Button) */}
                  <div className="mt-6 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center border border-neutral-300 rounded-xl bg-white overflow-hidden shadow-xs shrink-0">
                        <button
                          disabled={quantity <= 1 || isOutOfStock}
                          onClick={() => setQuantity(Math.max(1, quantity - 1))}
                          className="px-3.5 py-2.5 text-sm font-bold text-neutral-600 hover:bg-neutral-100 disabled:opacity-30 cursor-pointer"
                        >
                          -
                        </button>
                        <span className="px-4 py-2.5 text-xs font-bold font-mono text-neutral-900">
                          {quantity}
                        </span>
                        <button
                          disabled={quantity >= availableStock || isOutOfStock}
                          onClick={() => setQuantity(Math.min(availableStock, quantity + 1))}
                          className="px-3.5 py-2.5 text-sm font-bold text-neutral-600 hover:bg-neutral-100 disabled:opacity-30 cursor-pointer"
                        >
                          +
                        </button>
                      </div>

                      <span className="text-xs text-neutral-500">
                        {availableStock > 0 ? (
                          <span className="text-emerald-700 font-semibold">
                            {availableStock <= 5 ? (
                              <span className="text-orange-600 font-bold">{availableStock} almost sold out · Sandton stock</span>
                            ) : (
                              <span>{availableStock} units ready for immediate dispatch</span>
                            )}
                          </span>
                        ) : (
                          <span className="text-rose-600 font-bold">Currently Backordered</span>
                        )}
                      </span>
                    </div>

                    <button
                      disabled={isOutOfStock}
                      onClick={handleAddToCart}
                      className={`w-full py-4 px-6 rounded-2xl text-sm font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md hover:shadow-lg ${
                        isOutOfStock
                          ? 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
                          : addedAnimation
                          ? 'bg-emerald-600 text-white'
                          : 'bg-orange-600 hover:bg-orange-700 text-white hover:shadow-[0_0_25px_rgba(234, 88, 12,0.45)]'
                      }`}
                    >
                      {addedAnimation ? (
                        <>
                          <Check className="w-5 h-5" />
                          <span>Added to Shopping Bag!</span>
                        </>
                      ) : isOutOfStock ? (
                        <span>Out of Stock at Sandton Depot</span>
                      ) : (
                        <>
                          <ShoppingBag className="w-5 h-5" />
                          <span>Add to Cart — {formatZAR(currentPrice * quantity)}</span>
                        </>
                      )}
                    </button>

                    {/* Notify me when price drops button */}
                    <button
                      type="button"
                      onClick={() => setIsPriceAlertModalOpen(true)}
                      className="w-full py-3 px-5 rounded-2xl border border-neutral-300 hover:border-orange-500 bg-white hover:bg-orange-50/60 text-neutral-800 hover:text-orange-700 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs group"
                    >
                      <Bell className="w-4 h-4 text-orange-600 transition-transform group-hover:scale-110" />
                      <span>Notify Me When Price Drops</span>
                    </button>
                  </div>
                </div>

                {/* Frequently Bought Together Module (Matches Reference: 3 products side by side with cart button) */}
                {bundleCandidates.length > 0 && (
                  <div className="pt-6 border-t border-neutral-200/80">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-bold text-neutral-900">Frequently bought together</h3>
                      <span className="text-[11px] text-orange-600 font-semibold">Compatible Accessories</span>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      {bundleCandidates.map((candidate) => {
                        const price = candidate.promotionalPriceCents || candidate.priceCents;
                        const origPrice = candidate.priceCents;
                        const isAdded = bundleChecked[candidate.id];
                        return (
                          <div
                            key={candidate.id}
                            className="p-2.5 rounded-xl border border-neutral-200 hover:border-orange-400 bg-neutral-50/50 flex flex-col justify-between group transition-all"
                          >
                            <div
                              onClick={() => {
                                onSelectProduct(candidate);
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                              }}
                              className="relative aspect-square rounded-lg overflow-hidden bg-white mb-2 cursor-pointer"
                            >
                              <img
                                src={candidate.primaryImage}
                                alt={candidate.name}
                                className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform"
                              />
                            </div>
                            <p
                              onClick={() => {
                                onSelectProduct(candidate);
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                              }}
                              className="text-[11px] font-bold text-neutral-900 line-clamp-1 cursor-pointer hover:text-orange-600 transition-colors"
                            >
                              {candidate.name}
                            </p>
                            <div className="flex items-center justify-between mt-2">
                              <div className="flex flex-col">
                                <span className="text-xs font-mono font-bold text-neutral-900">
                                  {formatZAR(price)}
                                </span>
                                {candidate.promotionalPriceCents && (
                                  <span className="text-[10px] text-neutral-400 line-through font-mono">
                                    {formatZAR(origPrice)}
                                  </span>
                                )}
                              </div>
                              <button
                                onClick={() => handleAddBundleToCart(candidate)}
                                title="Add accessory to cart"
                                className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                                  isAdded
                                    ? 'bg-emerald-600 text-white border-emerald-600'
                                    : 'bg-white hover:bg-orange-600 hover:text-white text-neutral-700 border-neutral-300'
                                }`}
                              >
                                {isAdded ? <Check className="w-3.5 h-3.5" /> : <ShoppingBag className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Second Reference Image: Visual Variant / Hardware Choice Thumbnails */}
            {product.variants && product.variants.length > 0 && (
              <div className="pt-6 border-t border-neutral-200">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold text-neutral-800 uppercase tracking-wider">
                    Select Specification &amp; Configuration:
                  </h3>
                  <span className="text-xs text-orange-600 font-semibold">
                    {selectedVariant?.title || 'Default'}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
                  {product.variants.map((v, i) => {
                    const isSelected = selectedVariant?.id === v.id;
                    const variantImg = images[i % images.length] || product.primaryImage;
                    return (
                      <button
                        key={v.id}
                        onClick={() => setSelectedVariant(v)}
                        className={`p-2 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'border-orange-600 bg-orange-50/60 ring-2 ring-orange-500 shadow-xs'
                            : 'border-neutral-200 bg-white hover:border-orange-300'
                        }`}
                      >
                        <div className="aspect-square w-full rounded-lg overflow-hidden bg-neutral-100 mb-2">
                          <img src={variantImg} alt={v.title} className="w-full h-full object-cover" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-neutral-900 line-clamp-1">{v.title}</p>
                          <p className="text-[11px] font-mono font-bold text-orange-700 mt-0.5">
                            {formatZAR(v.promotionalPriceCents || v.priceCents)}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Hardware Specifications Table */}
            {product.specifications && product.specifications.length > 0 && (
              <div className="pt-8 border-t border-neutral-200">
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                  <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-orange-600" />
                    <span>Verified Depot Hardware Specifications</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      addToCompare(product);
                      setIsComparisonModalOpen(true);
                    }}
                    className="text-xs font-bold text-orange-600 hover:text-orange-700 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Scale className="w-3.5 h-3.5" />
                    <span>Side-by-Side Comparison</span>
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {product.specifications.map((spec, i) => (
                    <div
                      key={i}
                      className="p-3 bg-neutral-50 rounded-xl border border-neutral-200/80 flex flex-col justify-between"
                    >
                      <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wide">
                        {spec.name}
                      </span>
                      <span className="text-xs font-bold text-neutral-900 mt-1">
                        {spec.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Full Product Reviews & Verified Ratings Section */}
            <div className="pt-8 border-t border-neutral-200 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-neutral-900">Customer Reviews &amp; Depot Benchmarks</h3>
                    <span className="bg-amber-100 text-amber-900 font-bold text-xs px-2 py-0.5 rounded flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                      <span>{averageRating.toFixed(1)}</span>
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Verified reviews from real South African purchasers and hardware technicians
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIsShareModalOpen(true)}
                    className="px-3.5 py-2 border border-neutral-300 rounded-xl hover:bg-neutral-50 text-neutral-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Share2 className="w-3.5 h-3.5 text-orange-600" />
                    <span>Share</span>
                  </button>
                  <button
                    onClick={handleOpenReviewModal}
                    className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
                  >
                    <MessageSquarePlus className="w-4 h-4" />
                    <span>Write a Review</span>
                  </button>
                </div>
              </div>

              {reviews.length === 0 ? (
                <div className="p-8 bg-neutral-50 rounded-2xl border border-neutral-200 text-center">
                  <p className="text-xs text-neutral-500 mb-2">Be the first to review this verified hardware SKU!</p>
                  <button
                    onClick={handleOpenReviewModal}
                    className="text-xs font-bold text-orange-600 hover:underline cursor-pointer"
                  >
                    Submit the first customer review
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {reviews.map((rev) => (
                    <div
                      key={rev.id}
                      className="p-4 bg-neutral-50/80 rounded-2xl border border-neutral-200/90 space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-neutral-900">{rev.authorName}</span>
                          {rev.isVerifiedPurchase && (
                            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3 text-emerald-600" />
                              <span>Verified Buyer</span>
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-neutral-400">
                          {new Date(rev.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex text-amber-500">
                          {[...Array(rev.rating)].map((_, i) => (
                            <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          ))}
                        </div>
                        <span className="font-bold text-neutral-800">{rev.title}</span>
                      </div>

                      <p className="text-neutral-600 leading-relaxed">{rev.comment}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT SIDE STICKY CHECKOUT & CART MODULE (Matches Reference Right Sidebar in Image 1 & 2) */}
          <div className="lg:col-span-3 sticky top-24 space-y-4">
            {/* Red/Purple Subtotal Card */}
            <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden shadow-sm">
              <div className="bg-orange-600 text-white px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <ShoppingBag className="w-4 h-4" />
                  <span>Subtotal ({itemCount})</span>
                </div>
                <span className="text-[11px] bg-white/20 px-2 py-0.5 rounded-full font-mono font-bold">
                  {itemCount > 0 ? `${itemCount} in Bag` : 'Ready'}
                </span>
              </div>

              <div className="p-4 space-y-4">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs font-semibold text-neutral-500 uppercase">Cart Subtotal</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-neutral-900 font-mono">
                      {formatZAR(subtotalCents)}
                    </span>
                    {subtotalCents > 150000 && (
                      <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">
                        -R150
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-2 text-xs text-neutral-600 pt-2 border-t border-neutral-100">
                  <div className="flex items-center gap-2 text-emerald-700 font-medium">
                    <Check className="w-4 h-4 shrink-0 text-emerald-600" />
                    <span>Free shipping (Sandton Depot direct)</span>
                  </div>
                  <div className="flex items-center gap-2 text-neutral-600">
                    <Check className="w-4 h-4 shrink-0 text-orange-600" />
                    <span>Eligible to use Payflex 0% interest</span>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <button
                    onClick={onProceedToCheckout}
                    className="w-full py-3.5 px-4 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md hover:shadow-[0_0_20px_rgba(234, 88, 12,0.35)] transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>{itemCount > 0 ? `${itemCount} almost sold out · Checkout` : 'Proceed to Checkout'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => setIsDrawerOpen(true)}
                    className="w-full py-2.5 px-4 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    Go to cart ({itemCount})
                  </button>
                </div>

                {/* Free shipping checkmark indicator */}
                <div className="pt-3 border-t border-neutral-100 text-[11px] text-neutral-600 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-emerald-700 font-medium">
                    <Check className="w-3.5 h-3.5" />
                    <span>Free shipping from Mevo Tech</span>
                  </div>
                  <p className="text-neutral-400 text-[10px]">✔ 256-bit SSL encrypted South African checkout</p>
                </div>

                {/* Live Cart Preview List (Matches image 1 & 2 right rail product thumbnail with checkmark) */}
                {items.length > 0 && (
                  <div className="pt-3 border-t border-neutral-100 space-y-2">
                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                      Active In Your Bag
                    </span>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {items.slice(0, 3).map((cartItem) => (
                        <div
                          key={cartItem.sku}
                          className="flex items-center gap-2.5 p-2 rounded-xl bg-neutral-50 border border-neutral-200/80 text-xs"
                        >
                          <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-white shrink-0 border border-neutral-200">
                            <img src={cartItem.image} alt={cartItem.name} className="w-full h-full object-cover" />
                            <div className="absolute top-0.5 right-0.5 bg-neutral-900 text-white rounded-full p-0.5">
                              <Check className="w-2.5 h-2.5" />
                            </div>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[11px] font-bold text-neutral-900 truncate">{cartItem.name}</p>
                            <p className="text-[10px] text-neutral-500 font-mono">{formatZAR(cartItem.priceCents)}</p>
                          </div>
                          <span className="text-[9px] font-bold text-orange-700 bg-orange-100 px-1.5 py-0.5 rounded shrink-0">
                            Almost sold out
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Support and Sandton Depot Assist Card */}
            <div className="bg-white rounded-2xl border border-neutral-200 p-4 shadow-sm text-xs text-neutral-600 space-y-2">
              <div className="flex items-center gap-2 text-orange-700 font-bold">
                <Clock className="w-4 h-4 text-orange-600" />
                <span>Need expert advice?</span>
              </div>
              <p className="text-[11px] leading-relaxed text-neutral-500">
                Call our Sandton hardware team on <strong>+27 11 884 9200</strong> or email <strong>support@mevotech.co.za</strong>.
              </p>
            </div>

            {/* Reserved Premium Sponsored Ad Space (Matches Image 1 Reference Space) */}
            <SponsoredAdCard placement="product_sidebar" />
          </div>

        </div>

        {/* 4. Second Reference Image Continuation: Related & Populating Products Grid */}
        <div className="mt-14 pt-8 border-t border-neutral-300">
          <div className="flex flex-col sm:flex-row items-baseline justify-between gap-2 mb-6">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-orange-600 mb-1">
                <Zap className="w-4 h-4" />
                <span>You May Also Like</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-neutral-900 tracking-tight">
                Recommended Hardware Populating This Department
              </h2>
            </div>
            <p className="text-xs text-neutral-500">
              Dispatched directly from Mevo Tech Sandton, Johannesburg
            </p>
          </div>

          {/* Populating Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {recommendedProducts.slice(0, 10).map((item) => {
              const itemPrice = item.promotionalPriceCents || item.priceCents;
              const hasItemDiscount = Boolean(item.promotionalPriceCents && item.promotionalPriceCents < item.priceCents);
              const discount = hasItemDiscount
                ? Math.round(((item.priceCents - item.promotionalPriceCents!) / item.priceCents) * 100)
                : 0;

              return (
                <div
                  key={item.id}
                  onClick={() => {
                    onSelectProduct(item);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="group bg-white rounded-2xl border border-neutral-200 hover:border-orange-500 overflow-hidden shadow-xs hover:shadow-[0_4px_20px_rgba(234, 88, 12,0.25)] transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div className="relative aspect-square bg-neutral-100 overflow-hidden">
                    <img
                      src={item.primaryImage}
                      alt={item.name}
                      className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                    />
                    {hasItemDiscount && (
                      <span className="absolute top-2 left-2 bg-orange-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                        -{discount}%
                      </span>
                    )}
                  </div>

                  <div className="p-3.5 flex flex-col justify-between flex-1">
                    <div>
                      <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-0.5">
                        {item.brand}
                      </span>
                      <h4 className="text-xs font-bold text-neutral-900 line-clamp-2 group-hover:text-orange-600 transition-colors">
                        {item.name}
                      </h4>
                    </div>

                    <div className="mt-3 pt-2 border-t border-neutral-100 flex items-center justify-between">
                      <span className="text-sm font-black font-mono text-neutral-900">
                        {formatZAR(itemPrice)}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShareProduct(item);
                          }}
                          className="p-1.5 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-600 transition-colors cursor-pointer"
                          title="Share"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            addItem(item, undefined, 1);
                          }}
                          className="p-1.5 rounded-lg bg-neutral-100 group-hover:bg-orange-600 group-hover:text-white text-neutral-700 transition-colors cursor-pointer"
                          title="Add to shopping bag"
                        >
                          <ShoppingBag className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Review Modal */}
      <ReviewModal
        product={product}
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        onReviewSubmitted={handleReviewSubmitted}
        isVerifiedBuyer={Boolean(customer)}
      />

      {/* Share Modal */}
      <ShareModal
        product={shareProduct || product}
        isOpen={isShareModalOpen || Boolean(shareProduct)}
        onClose={() => {
          setIsShareModalOpen(false);
          setShareProduct(null);
        }}
      />

      {/* Price Drop Alert Subscription Modal */}
      <PriceDropAlertModal
        product={product}
        isOpen={isPriceAlertModalOpen}
        onClose={() => setIsPriceAlertModalOpen(false)}
      />
    </div>
  );
};
