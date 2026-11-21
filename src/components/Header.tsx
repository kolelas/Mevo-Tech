import React, { useState, useRef } from 'react';
import {
  ShoppingBag,
  Search,
  ShieldCheck,
  User as UserIcon,
  Truck,
  ChevronDown,
  Clock,
  Menu,
  X,
  Laptop,
  Monitor,
  Cpu,
  Headphones,
  HardDrive,
  Wifi,
  Sparkles,
  ArrowRight,
  Lock,
  LogOut,
  Heart,
  Camera,
  QrCode,
  Flame,
  CheckCircle2,
  MapPin,
  Check,
  Trash2,
  ExternalLink,
  Scale,
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useComparison } from '../context/ComparisonContext';
import { Product } from '../types';
import { CATEGORIES_DATA } from '../data/categories';
import { formatZAR } from '../utils/calculations';

interface HeaderProps {
  currentView: string;
  setCurrentView: (view: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onNavigateCategory: (slug: string) => void;
  products?: Product[];
  onSelectProduct?: (product: Product) => void;
  onProceedToCheckout?: () => void;
}

const ICON_MAP = {
  Laptop,
  Monitor,
  Cpu,
  Headphones,
  HardDrive,
  Wifi,
};

export const Header: React.FC<HeaderProps> = ({
  currentView,
  setCurrentView,
  searchQuery,
  setSearchQuery,
  onNavigateCategory,
  products = [],
  onSelectProduct,
  onProceedToCheckout,
}) => {
  const {
    items,
    itemCount,
    subtotalCents,
    setIsDrawerOpen,
    wishlist,
    wishlistCount,
    setIsWishlistOpen,
    removeItem,
    updateQuantity,
    abandonedCarts,
  } = useCart();

  const {
    customer,
    isCustomerLoggedIn,
    customerLogout,
    openAuthModal,
  } = useAuth();

  const {
    comparedProducts,
    setIsComparisonModalOpen,
  } = useComparison();

  // Hover Pop-Under State
  const [activeHoverTab, setActiveHoverTab] = useState<'region' | 'customer' | 'wishlist' | 'cart' | 'qr' | null>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cart click state: only opens on hover or when clicked, never automatically simply because user logged in
  const [isCartClickedOpen, setIsCartClickedOpen] = useState<boolean>(false);
  const [selectedCartItems, setSelectedCartItems] = useState<Record<string, boolean>>({});

  const [showCategoriesMenu, setShowCategoriesMenu] = useState(false);
  const [isCategoriesPinned, setIsCategoriesPinned] = useState(false);
  const categoriesTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showVisualSearchModal, setShowVisualSearchModal] = useState(false);

  const activeCategorySlug = currentView.startsWith('category_')
    ? currentView.replace('category_', '')
    : null;

  // Robust Categories hover handlers with grace window so cursor can move into dropdown without closing
  const handleCategoriesEnter = () => {
    if (categoriesTimeoutRef.current) {
      clearTimeout(categoriesTimeoutRef.current);
      categoriesTimeoutRef.current = null;
    }
    setShowCategoriesMenu(true);
  };

  const handleCategoriesLeave = () => {
    if (categoriesTimeoutRef.current) {
      clearTimeout(categoriesTimeoutRef.current);
    }
    categoriesTimeoutRef.current = setTimeout(() => {
      if (!isCategoriesPinned) {
        setShowCategoriesMenu(false);
      }
    }, 280);
  };

  // Safe hover handlers that allow seamless cursor movement between trigger and pop-under
  const handleMouseEnter = (tab: 'region' | 'customer' | 'wishlist' | 'cart' | 'qr') => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setActiveHoverTab(tab);
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    hoverTimeoutRef.current = setTimeout(() => {
      setActiveHoverTab(null);
    }, 180);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentView !== 'storefront' && !currentView.startsWith('category_')) {
      setCurrentView('storefront');
    }
    const el = document.getElementById('catalogue-anchor');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Favourited products lookup from products catalogue
  const favouritedProducts = (products || []).filter((p) => wishlist.includes(p.id));

  return (
    <>
      {/* 1. TOP ANNOUNCEMENT BAR (Black strip with orange accent) */}
      <div className="bg-neutral-900 text-neutral-300 text-xs py-2 px-3 sm:px-4 border-b border-neutral-800 w-full overflow-hidden">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-xs font-medium gap-3">
          <div className="flex items-center gap-2 min-w-0 truncate">
            <span className="inline-block w-2 h-2 rounded-full bg-orange-500 shrink-0 animate-pulse"></span>
            <span className="truncate">
              Free Door Courier on Orders Over R 1,500 · 100% Local South African Inventory · Sandton Depot
            </span>
          </div>
          <div className="hidden lg:flex items-center gap-4 text-neutral-400 shrink-0">
            <span className="flex items-center gap-1.5 text-neutral-300">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Verified 2-3 Year Local Warranty</span>
            </span>
            <span aria-hidden="true" className="text-neutral-700">|</span>
            <span className="flex items-center gap-1.5 text-orange-300">
              <Truck className="w-3.5 h-3.5 text-orange-400" />
              <span>The Courier Guy Dispatch</span>
            </span>
          </div>
        </div>
      </div>

      {/* 2. MAIN HEADER BAR (Logo + Expanded Capsule Search + Icon Action Suite) */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-neutral-200 w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-3.5 flex items-center justify-between gap-3 sm:gap-6 lg:gap-8">
          
          {/* LEFT: Mobile Menu Button & Brand Wordmark */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="md:hidden p-2 rounded-lg text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 transition-colors"
              aria-label="Toggle navigation menu"
            >
              {showMobileMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <button
              onClick={() => {
                setCurrentView('storefront');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="flex items-center gap-2 sm:gap-2.5 text-left shrink-0 group focus:outline-none cursor-pointer"
              aria-label="MEVO TECH Home"
            >
              <div className="relative overflow-hidden rounded-xl bg-neutral-950 p-1 shadow-sm border border-neutral-800 shrink-0 group-hover:border-orange-500 transition-colors">
                <img
                  src="/assets/aistudio/Generated_Image_October_29__2026_-_8_40PM_f8f1a10b.png"
                  alt="MEVO TECH Emblem"
                  className="h-8 sm:h-9 w-auto max-w-[65px] sm:max-w-[80px] object-cover rounded-lg transition-transform group-hover:scale-105"
                />
              </div>
              <div className="flex flex-col items-center justify-center">
                <img
                  src="/assets/aistudio/mevo_wordmark_light.png"
                  alt="MEVO TECH — ONLINE TECH AND COMPUTER STORE"
                  className="h-8 sm:h-10 w-auto object-contain transition-transform group-hover:scale-[1.02]"
                />
              </div>
            </button>
          </div>

          {/* CENTER: Capsule Search Bar (Elongated, Pill with Camera & Dark Search Button) */}
          <div className="hidden sm:flex flex-1 max-w-2xl mx-auto items-center min-w-0">
            <form
              onSubmit={handleSearchSubmit}
              className="relative flex items-center w-full rounded-full border-2 border-neutral-900 bg-white hover:border-orange-600 focus-within:border-orange-600 focus-within:ring-4 focus-within:ring-orange-100/70 transition-all shadow-2xs"
            >
              <input
                type="text"
                placeholder="Search laptops, monitors, RTX GPUs, audio gear..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs sm:text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none bg-transparent pl-4 sm:pl-5 pr-2 py-2"
              />

              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="p-1 text-neutral-400 hover:text-neutral-700 text-xs mr-1 rounded-full cursor-pointer"
                  title="Clear search"
                >
                  ✕
                </button>
              )}

              {/* Visual Hardware SKU Search / Camera Icon */}
              <button
                type="button"
                onClick={() => setShowVisualSearchModal(true)}
                title="Search by image or hardware photo"
                className="p-1.5 text-neutral-500 hover:text-orange-600 transition-colors mr-1 cursor-pointer shrink-0"
              >
                <Camera className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              </button>

              {/* Search Pill Button (Dark rounded button with magnifying glass) */}
              <button
                type="submit"
                aria-label="Submit Search"
                className="flex items-center justify-center w-10 sm:w-12 h-8 sm:h-8.5 rounded-full bg-neutral-950 hover:bg-orange-600 text-white transition-all cursor-pointer shrink-0 mr-1 shadow-sm group"
              >
                <Search className="w-4 h-4 stroke-[2.5] group-hover:scale-110 transition-transform" />
              </button>
            </form>
          </div>

          {/* RIGHT: Action Icons Suite with Hover-Driven Pop-Unders */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 lg:gap-3 shrink-0">
            
            {/* 1. QR Code / App Download Icon with Hover Pop-Under */}
            <div
              className="relative"
              onMouseEnter={() => handleMouseEnter('qr')}
              onMouseLeave={handleMouseLeave}
            >
              <button
                type="button"
                onClick={() => setActiveHoverTab(activeHoverTab === 'qr' ? null : 'qr')}
                title="Mevo Tech Mobile App & Instant Dispatch"
                className="p-2 rounded-xl text-neutral-700 hover:text-orange-600 hover:bg-orange-50 transition-colors cursor-pointer flex items-center justify-center"
              >
                <QrCode className="w-5 h-5 sm:w-5.5 sm:h-5.5" />
              </button>

              {/* QR Pop-Under */}
              {activeHoverTab === 'qr' && (
                <div
                  onMouseEnter={() => handleMouseEnter('qr')}
                  onMouseLeave={handleMouseLeave}
                  className="absolute right-0 top-full pt-1.5 z-50 animate-in fade-in slide-in-from-top-1 duration-150"
                >
                  <div className="w-72 bg-white rounded-2xl shadow-2xl border border-neutral-200/90 p-4">
                    <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
                      <span className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
                        Mevo Tech Mobile App
                      </span>
                      <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
                        Live Sync
                      </span>
                    </div>
                    <div className="py-3 flex flex-col items-center text-center space-y-2.5">
                      <div className="p-3 bg-neutral-900 rounded-xl text-white shadow-inner flex flex-col items-center">
                        <QrCode className="w-24 h-24 text-white stroke-[1.5]" />
                        <span className="text-[10px] text-orange-300 font-mono mt-1 font-bold">MEVO-SANDTON-LIVE</span>
                      </div>
                      <p className="text-xs font-semibold text-neutral-800">
                        Scan to track live Sandton depot dispatch &amp; mobile discounts
                      </p>
                      <p className="text-[11px] text-neutral-500">
                        Compatible with iOS &amp; Android. Instant delivery alerts via The Courier Guy.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 2. South African Flag & Currency Tab 🇿🇦 with Hover Pop-Under */}
            <div
              className="relative"
              onMouseEnter={() => handleMouseEnter('region')}
              onMouseLeave={handleMouseLeave}
            >
              <button
                type="button"
                onClick={() => setActiveHoverTab(activeHoverTab === 'region' ? null : 'region')}
                title="South Africa · ZAR Currency · 15% VAT Included"
                className={`flex items-center gap-1.5 p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border transition-colors cursor-pointer shadow-2xs ${
                  activeHoverTab === 'region'
                    ? 'border-orange-500 bg-orange-50/70 text-orange-900'
                    : 'border-neutral-200 hover:border-orange-400 hover:bg-orange-50/60 text-neutral-800'
                }`}
              >
                {/* Clean South African Flag SVG */}
                <div className="w-5 h-3.5 sm:w-6 sm:h-4 overflow-hidden rounded-xs border border-neutral-300 shadow-2xs flex items-center justify-center shrink-0">
                  <svg viewBox="0 0 900 600" className="w-full h-full object-cover">
                    <rect width="900" height="300" fill="#E03C31" />
                    <rect y="300" width="900" height="300" fill="#001489" />
                    <polygon points="0,0 450,300 0,600" fill="#000000" />
                    <polygon points="0,0 350,300 0,600" fill="#FFB81C" />
                    <polygon points="0,60 300,300 0,540" fill="#000000" />
                    <polygon points="0,120 250,300 0,480" fill="#007749" />
                    <path d="M 0,160 L 250,300 L 900,300 L 900,240 L 330,240 L 100,80 L 0,80 Z" fill="#FFFFFF" />
                    <path d="M 0,440 L 250,300 L 900,300 L 900,360 L 330,360 L 100,520 L 0,520 Z" fill="#FFFFFF" />
                    <path d="M 0,200 L 200,300 L 900,300 L 900,260 L 280,260 L 60,120 L 0,120 Z" fill="#007749" />
                    <path d="M 0,400 L 200,300 L 900,300 L 900,340 L 280,340 L 60,480 L 0,480 Z" fill="#007749" />
                  </svg>
                </div>
                <span className="hidden sm:inline text-xs font-bold">ZA / ZAR</span>
                <ChevronDown className="w-3 h-3 text-neutral-400 group-hover:text-orange-600 hidden sm:inline" />
              </button>

              {/* Currency & Language Hover Pop-Under */}
              {activeHoverTab === 'region' && (
                <div
                  onMouseEnter={() => handleMouseEnter('region')}
                  onMouseLeave={handleMouseLeave}
                  className="absolute right-0 top-full pt-1.5 z-50 animate-in fade-in slide-in-from-top-1 duration-150"
                >
                  <div className="w-72 bg-white rounded-2xl shadow-2xl border border-neutral-200/90 p-4 text-xs space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
                      <div className="flex items-center gap-2">
                        <span className="text-base">🇿🇦</span>
                        <span className="font-bold text-neutral-900 uppercase tracking-wider text-[11px]">
                          Regional &amp; Settlement Settings
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-2 rounded-xl bg-orange-50/60 border border-orange-200/70">
                        <span className="text-neutral-600 font-medium">Country / Market:</span>
                        <span className="font-bold text-neutral-900 flex items-center gap-1.5">
                          <span>South Africa (ZA)</span>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        </span>
                      </div>

                      <div className="flex items-center justify-between p-2 rounded-xl bg-neutral-50 border border-neutral-200">
                        <span className="text-neutral-600 font-medium">Currency:</span>
                        <span className="font-bold text-orange-700">South African Rand (R / ZAR)</span>
                      </div>

                      <div className="flex items-center justify-between p-2 rounded-xl bg-neutral-50 border border-neutral-200">
                        <span className="text-neutral-600 font-medium">Language:</span>
                        <span className="font-bold text-neutral-800">English (South Africa)</span>
                      </div>

                      <div className="flex items-center justify-between p-2 rounded-xl bg-emerald-50/60 border border-emerald-200/70">
                        <span className="text-emerald-800 font-medium">SARS Invoicing:</span>
                        <span className="font-bold text-emerald-700">15% VAT Included</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-neutral-100 flex items-center gap-2 text-[11px] text-neutral-500">
                      <MapPin className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                      <span>Physical Stock Depot: Sandton City, Johannesburg</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 3. Customer Account Tab with Hover Pop-Under */}
            <div
              className="relative"
              onMouseEnter={() => handleMouseEnter('customer')}
              onMouseLeave={handleMouseLeave}
            >
              {isCustomerLoggedIn && customer ? (
                <button
                  type="button"
                  onClick={() => setActiveHoverTab(activeHoverTab === 'customer' ? null : 'customer')}
                  className={`flex items-center gap-1.5 p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl text-xs font-bold transition-colors shadow-2xs cursor-pointer ${
                    activeHoverTab === 'customer'
                      ? 'bg-orange-100 border border-orange-300 text-orange-950'
                      : 'bg-orange-50 border border-orange-200 text-orange-900 hover:bg-orange-100'
                  }`}
                  title="My Customer Account"
                >
                  <div className="w-6 h-6 rounded-full bg-orange-600 text-white flex items-center justify-center text-xs font-black shrink-0 shadow-2xs">
                    {customer.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="hidden sm:inline font-bold">{customer.name.split(' ')[0]}</span>
                  <ChevronDown className="w-3 h-3 text-orange-600" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => openAuthModal('login')}
                  className="flex items-center gap-1.5 p-2 rounded-xl text-neutral-700 hover:text-orange-600 hover:bg-orange-50 transition-colors cursor-pointer group"
                  title="Customer Sign In / Register"
                >
                  <UserIcon className="w-5 h-5 sm:w-5.5 sm:h-5.5 text-neutral-800 group-hover:text-orange-600 transition-colors" />
                  <span className="hidden sm:inline text-xs font-semibold text-neutral-800 group-hover:text-orange-600">
                    Sign In
                  </span>
                </button>
              )}

              {/* Customer Account Hover Pop-Under */}
              {activeHoverTab === 'customer' && (
                <div
                  onMouseEnter={() => handleMouseEnter('customer')}
                  onMouseLeave={handleMouseLeave}
                  className="absolute right-0 top-full pt-1.5 z-50 animate-in fade-in slide-in-from-top-1 duration-150"
                >
                  {isCustomerLoggedIn && customer ? (
                    <div className="w-72 bg-white rounded-2xl shadow-2xl border border-neutral-200/90 p-2.5 text-xs">
                      {/* Customer Profile Header */}
                      <div className="px-3 py-2.5 bg-gradient-to-r from-orange-50 to-neutral-50 rounded-xl border border-orange-100 mb-1.5">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span>Active Account</span>
                          </span>
                          <span className="text-[10px] text-neutral-400 font-mono">Member ID</span>
                        </div>
                        <p className="text-xs font-black text-neutral-900 truncate">{customer.name}</p>
                        <p className="text-[11px] text-neutral-500 truncate">{customer.email}</p>
                      </div>

                      {/* Customer Navigation Links */}
                      <div className="p-1 space-y-0.5">
                        <button
                          onClick={() => {
                            setCurrentView('account');
                            setActiveHoverTab(null);
                          }}
                          className="w-full text-left px-3 py-2 rounded-xl text-neutral-800 hover:bg-orange-50 hover:text-orange-700 font-semibold flex items-center gap-2.5 transition-colors cursor-pointer group"
                        >
                          <UserIcon className="w-4 h-4 text-orange-600 group-hover:scale-110 transition-transform" />
                          <span>Account Dashboard</span>
                        </button>

                        <button
                          onClick={() => {
                            setCurrentView('account_orders');
                            setActiveHoverTab(null);
                          }}
                          className="w-full text-left px-3 py-2 rounded-xl text-neutral-800 hover:bg-orange-50 hover:text-orange-700 font-semibold flex items-center justify-between transition-colors cursor-pointer group"
                        >
                          <div className="flex items-center gap-2.5">
                            <Truck className="w-4 h-4 text-orange-600 group-hover:scale-110 transition-transform" />
                            <span>Orders &amp; Tracking</span>
                          </div>
                          <span className="text-[10px] text-neutral-400">Live Courier</span>
                        </button>

                        <button
                          onClick={() => {
                            setCurrentView('account_bought');
                            setActiveHoverTab(null);
                          }}
                          className="w-full text-left px-3 py-2 rounded-xl text-neutral-800 hover:bg-orange-50 hover:text-orange-700 font-semibold flex items-center gap-2.5 transition-colors cursor-pointer group"
                        >
                          <ShieldCheck className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform" />
                          <span>Bought Hardware &amp; Reviews</span>
                        </button>

                        <button
                          onClick={() => {
                            setIsWishlistOpen(true);
                            setActiveHoverTab(null);
                          }}
                          className="w-full text-left px-3 py-2 rounded-xl text-neutral-800 hover:bg-orange-50 hover:text-orange-700 font-semibold flex items-center justify-between transition-colors cursor-pointer group"
                        >
                          <div className="flex items-center gap-2.5">
                            <Heart className="w-4 h-4 text-rose-500 group-hover:scale-110 transition-transform" />
                            <span>Saved Favourites</span>
                          </div>
                          <span className="text-[10px] font-bold bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full">
                            {wishlistCount}
                          </span>
                        </button>

                        <button
                          onClick={() => {
                            setCurrentView('account_saved_carts');
                            setActiveHoverTab(null);
                          }}
                          className="w-full text-left px-3 py-2 rounded-xl text-neutral-800 hover:bg-orange-50 hover:text-orange-700 font-semibold flex items-center justify-between transition-colors cursor-pointer group"
                        >
                          <div className="flex items-center gap-2.5">
                            <Clock className="w-4 h-4 text-amber-600 group-hover:scale-110 transition-transform" />
                            <span>Saved / Abandoned Carts</span>
                          </div>
                          {abandonedCarts.length > 0 && (
                            <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                              {abandonedCarts.length}
                            </span>
                          )}
                        </button>

                        <div className="pt-1.5 mt-1 border-t border-neutral-100">
                          <button
                            onClick={() => {
                              customerLogout();
                              setActiveHoverTab(null);
                            }}
                            className="w-full text-left px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 font-bold flex items-center gap-2.5 transition-colors cursor-pointer group"
                          >
                            <LogOut className="w-4 h-4 text-rose-500 group-hover:translate-x-0.5 transition-transform" />
                            <span>Sign Out of Mevo Tech</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="w-68 bg-white rounded-2xl shadow-2xl border border-neutral-200/90 p-4 text-xs space-y-3">
                      <div>
                        <h4 className="font-bold text-neutral-900 text-sm">Welcome to Mevo Tech</h4>
                        <p className="text-[11px] text-neutral-500 mt-0.5">
                          Sign in to manage orders, track Sandton courier dispatch, and view warranty certificates.
                        </p>
                      </div>

                      <div className="space-y-1.5">
                        <button
                          onClick={() => {
                            openAuthModal('login');
                            setActiveHoverTab(null);
                          }}
                          className="w-full py-2.5 px-3 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl text-center transition-colors shadow-sm cursor-pointer"
                        >
                          Sign In
                        </button>
                        <button
                          onClick={() => {
                            openAuthModal('register');
                            setActiveHoverTab(null);
                          }}
                          className="w-full py-2 px-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-semibold rounded-xl text-center transition-colors cursor-pointer"
                        >
                          Create Free Account
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Product Comparison Action Button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsComparisonModalOpen(true)}
                aria-label={`Product Comparison with ${comparedProducts.length} items`}
                title={
                  comparedProducts.length > 0
                    ? `Compare ${comparedProducts.length} model${comparedProducts.length === 1 ? '' : 's'} side-by-side`
                    : 'Product Comparison (select up to 3 products)'
                }
                className={`relative p-2 rounded-xl transition-colors cursor-pointer flex items-center justify-center ${
                  comparedProducts.length > 0
                    ? 'text-orange-600 bg-orange-50 hover:bg-orange-100'
                    : 'text-neutral-700 hover:text-orange-600 hover:bg-orange-50'
                }`}
              >
                <Scale className="w-5 h-5 sm:w-5.5 sm:h-5.5 transition-colors" />
                {comparedProducts.length > 0 && (
                  <span className="absolute -top-1 -right-1 px-1.5 py-0.5 text-[10px] font-bold bg-orange-600 text-white rounded-full leading-none shadow-xs">
                    {comparedProducts.length}
                  </span>
                )}
              </button>
            </div>

            {/* 4. Liked / Favourites Tab (Wishlist) with Hover Pop-Under */}
            <div
              className="relative"
              onMouseEnter={() => handleMouseEnter('wishlist')}
              onMouseLeave={handleMouseLeave}
            >
              <button
                type="button"
                onClick={() => setIsWishlistOpen(true)}
                aria-label={`View saved wishlist with ${wishlistCount} items`}
                title="Saved Wishlist"
                className={`relative p-2 rounded-xl transition-colors cursor-pointer flex items-center justify-center ${
                  activeHoverTab === 'wishlist'
                    ? 'text-rose-600 bg-rose-50'
                    : 'text-neutral-700 hover:text-rose-600 hover:bg-rose-50'
                }`}
              >
                <Heart
                  className={`w-5 h-5 sm:w-5.5 sm:h-5.5 transition-colors ${
                    wishlistCount > 0 ? 'text-rose-500 fill-rose-500' : 'text-neutral-800'
                  }`}
                />
                {wishlistCount > 0 && (
                  <span className="absolute -top-1 -right-1 px-1.5 py-0.5 text-[10px] font-bold bg-rose-500 text-white rounded-full leading-none shadow-xs">
                    {wishlistCount}
                  </span>
                )}
              </button>

              {/* Favourites Hover Pop-Under */}
              {activeHoverTab === 'wishlist' && (
                <div
                  onMouseEnter={() => handleMouseEnter('wishlist')}
                  onMouseLeave={handleMouseLeave}
                  className="absolute right-0 top-full pt-1.5 z-50 animate-in fade-in slide-in-from-top-1 duration-150"
                >
                  <div className="w-80 bg-white rounded-2xl shadow-2xl border border-neutral-200/90 p-4 text-xs space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
                      <div className="flex items-center gap-1.5 font-bold text-neutral-900">
                        <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
                        <span>Saved Favourites ({wishlistCount})</span>
                      </div>
                      <button
                        onClick={() => {
                          setIsWishlistOpen(true);
                          setActiveHoverTab(null);
                        }}
                        className="text-[11px] font-bold text-orange-600 hover:text-orange-700 hover:underline cursor-pointer"
                      >
                        Open Drawer
                      </button>
                    </div>

                    {favouritedProducts.length === 0 ? (
                      <div className="py-6 text-center space-y-2">
                        <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-400 flex items-center justify-center mx-auto">
                          <Heart className="w-5 h-5" />
                        </div>
                        <p className="font-semibold text-neutral-800 text-xs">No favourites saved yet</p>
                        <p className="text-[11px] text-neutral-400 max-w-[200px] mx-auto">
                          Click the heart on any hardware item to keep it saved for later.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                        {favouritedProducts.slice(0, 4).map((item) => (
                          <div
                            key={item.id}
                            onClick={() => {
                              if (onSelectProduct) {
                                onSelectProduct(item);
                                setActiveHoverTab(null);
                              }
                            }}
                            className="flex items-center gap-3 p-2 rounded-xl hover:bg-neutral-50 transition-colors border border-transparent hover:border-neutral-200 cursor-pointer group"
                          >
                            <img
                              src={item.primaryImage}
                              alt={item.name}
                              className="w-12 h-12 object-cover rounded-lg bg-neutral-100 shrink-0 border border-neutral-200"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-neutral-900 group-hover:text-orange-600 transition-colors truncate">
                                {item.name}
                              </p>
                              <p className="text-[10px] text-neutral-400 truncate">{item.category}</p>
                              <div className="flex items-center justify-between mt-0.5">
                                <span className="font-mono font-bold text-orange-700">
                                  {formatZAR(item.promotionalPriceCents || item.priceCents)}
                                </span>
                                <span className="text-[9px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                                  In Stock
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="pt-2 border-t border-neutral-100">
                      <button
                        onClick={() => {
                          setIsWishlistOpen(true);
                          setActiveHoverTab(null);
                        }}
                        className="w-full py-2 px-3 bg-neutral-900 hover:bg-orange-600 text-white font-bold rounded-xl text-center text-xs transition-colors cursor-pointer shadow-xs"
                      >
                        {wishlistCount > 0 ? `View All ${wishlistCount} Favourites` : 'Explore Storefront'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 5. Shopping Cart Tab with Docked Underneath Section (No Floating) */}
            <div
              className="relative"
              onMouseEnter={() => handleMouseEnter('cart')}
              onMouseLeave={() => {
                if (!isCartClickedOpen) {
                  handleMouseLeave();
                }
              }}
            >
              <button
                type="button"
                onClick={() => {
                  const nextState = !isCartClickedOpen;
                  setIsCartClickedOpen(nextState);
                  if (!nextState) {
                    setActiveHoverTab(null);
                  }
                }}
                aria-label={`View shopping cart with ${itemCount} items`}
                title="Shopping Cart"
                className={`relative p-2 rounded-xl transition-colors cursor-pointer flex items-center justify-center group ${
                  isCartClickedOpen || activeHoverTab === 'cart'
                    ? 'text-orange-600 bg-orange-50 ring-2 ring-orange-300'
                    : 'text-neutral-800 hover:text-orange-600 hover:bg-orange-50'
                }`}
              >
                <ShoppingBag className="w-5 h-5 sm:w-6 sm:h-6 text-neutral-800 group-hover:text-orange-600 transition-colors" />
                <span
                  className={`absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full text-[10px] font-black flex items-center justify-center text-white shadow-xs transition-colors ${
                    itemCount > 0 ? 'bg-orange-500' : 'bg-neutral-800'
                  }`}
                >
                  {itemCount}
                </span>
              </button>

              {/* Shopping Cart Section: appears on hover and click; disappears on mouse move away (if hovered) or on X click */}
              {(isCartClickedOpen || activeHoverTab === 'cart') && (
                <div
                  onMouseEnter={() => handleMouseEnter('cart')}
                  onMouseLeave={() => {
                    if (!isCartClickedOpen) {
                      handleMouseLeave();
                    }
                  }}
                  className="absolute right-0 top-full pt-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150"
                >
                  <div className="w-80 sm:w-96 max-h-[82vh] overflow-hidden flex flex-col bg-white rounded-2xl shadow-2xl border border-neutral-200/90 text-xs">
                    {/* Temu-style Fiery Orange/Red Top Subtotal Banner */}
                    <div className="bg-gradient-to-r from-orange-600 via-orange-500 to-amber-500 p-3 text-white flex items-center justify-between shadow-xs shrink-0">
                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <ShoppingBag className="w-5 h-5 text-white" />
                          <span className="absolute -top-1.5 -right-2 bg-white text-orange-600 text-[10px] font-black px-1 rounded-full leading-none">
                            {itemCount}
                          </span>
                        </div>
                        <span className="font-extrabold text-sm tracking-wide">Subtotal</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsCartClickedOpen(false);
                            setActiveHoverTab(null);
                          }}
                          title="Close Cart Section"
                          aria-label="Close cart popup"
                          className="text-white/80 hover:text-white p-1 rounded-full hover:bg-black/15 transition-colors cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Subtotal Display Figure */}
                    <div className="text-center py-2.5 bg-neutral-50/70 border-b border-neutral-100 shrink-0">
                      <span className="text-2xl font-black text-neutral-900 font-mono tracking-tight">
                        {formatZAR(subtotalCents)}
                      </span>
                    </div>

                    {/* Free Shipping Guaranteed Delivery Box */}
                    <div className="mx-3 my-2 p-2.5 rounded-xl bg-amber-50/90 border border-amber-200/80 text-[11px] text-amber-950 flex items-center gap-2 shrink-0">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0 stroke-[3]" />
                      <span className="leading-tight font-medium">
                        {subtotalCents >= 150000 ? (
                          <strong className="text-emerald-800">Free door courier unlocked!</strong>
                        ) : (
                          <>
                            Free shipping on orders over R1,500 (<strong className="text-amber-900">Add {formatZAR(150000 - subtotalCents)}</strong>)
                          </>
                        )}
                      </span>
                    </div>

                    {/* Dual Action CTA Buttons (Temu Orange Checkout + Go to cart) */}
                    <div className="px-3 space-y-2 mb-2 shrink-0">
                      <button
                        onClick={() => {
                          setIsCartClickedOpen(false);
                          setActiveHoverTab(null);
                          if (onProceedToCheckout) {
                            onProceedToCheckout();
                          } else {
                            setIsDrawerOpen(true);
                          }
                        }}
                        disabled={items.length === 0}
                        className="w-full py-2.5 px-4 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 disabled:opacity-50 text-white font-black text-xs sm:text-sm tracking-wide shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <span>
                          {items.length > 0
                            ? `${Math.min(itemCount, 4)} almost sold out · Checkout (${itemCount})`
                            : 'Checkout (0)'}
                        </span>
                      </button>

                      <button
                        onClick={() => setIsDrawerOpen(true)}
                        className="w-full py-2 px-4 rounded-full border border-neutral-300 hover:border-neutral-400 bg-white hover:bg-neutral-50 text-neutral-800 font-bold text-xs transition-colors cursor-pointer text-center"
                      >
                        Go to cart drawer
                      </button>
                    </div>

                    {/* Selection Row & Sandton Guarantee */}
                    <div className="px-3 py-1.5 border-t border-neutral-100 flex items-center justify-between text-[11px] text-neutral-600 shrink-0 bg-neutral-50/50">
                      <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-neutral-800">
                        <input
                          type="checkbox"
                          checked={items.length > 0 && items.every((i) => selectedCartItems[i.sku] !== false)}
                          onChange={(e) => {
                            const val = e.target.checked;
                            const next: Record<string, boolean> = {};
                            items.forEach((i) => {
                              next[i.sku] = val;
                            });
                            setSelectedCartItems(next);
                          }}
                          className="rounded text-orange-600 focus:ring-orange-500 w-3.5 h-3.5 cursor-pointer"
                        />
                        <span>Select all ({itemCount})</span>
                      </label>
                      <div className="flex items-center gap-1 text-emerald-700 font-medium">
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>Sandton Depot Stock</span>
                      </div>
                    </div>

                    {/* Scrollable Cart Items List */}
                    <div className="flex-1 overflow-y-auto px-3 py-1.5 divide-y divide-neutral-100">
                      {items.length === 0 ? (
                        <div className="py-8 text-center space-y-2">
                          <div className="w-10 h-10 rounded-full bg-neutral-100 text-neutral-400 flex items-center justify-center mx-auto">
                            <ShoppingBag className="w-5 h-5" />
                          </div>
                          <p className="font-semibold text-neutral-800 text-xs">Your cart is empty</p>
                          <p className="text-[11px] text-neutral-400 max-w-[200px] mx-auto">
                            Browse Sandton hardware specials below to add to your order.
                          </p>
                        </div>
                      ) : (
                        items.map((item) => (
                          <div key={item.sku} className="py-2.5 flex items-start gap-2.5 group">
                            <input
                              type="checkbox"
                              checked={selectedCartItems[item.sku] !== false}
                              onChange={() => {
                                setSelectedCartItems((prev) => ({
                                  ...prev,
                                  [item.sku]: prev[item.sku] === false ? true : false,
                                }));
                              }}
                              className="mt-2 rounded text-orange-600 focus:ring-orange-500 w-3.5 h-3.5 cursor-pointer shrink-0"
                            />
                            <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-neutral-100 border border-neutral-200 shrink-0">
                              <img
                                src={item.image}
                                alt={item.name}
                                className="w-full h-full object-cover"
                              />
                              <span className="absolute bottom-0 inset-x-0 bg-neutral-900/80 text-[8px] font-bold text-amber-300 text-center py-0.5 leading-none">
                                Almost sold out
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-neutral-900 text-xs truncate group-hover:text-orange-600 transition-colors">
                                {item.name}
                              </p>
                              {item.variantTitle && (
                                <p className="text-[10px] text-neutral-400 truncate">
                                  {item.variantTitle}
                                </p>
                              )}
                              <p className="text-xs font-bold text-neutral-900 mt-0.5">
                                Estimated <span className="font-mono text-orange-700">{formatZAR(item.priceCents)}</span>
                              </p>
                              <div className="flex items-center justify-between mt-1.5">
                                <select
                                  value={item.quantity}
                                  onChange={(e) => updateQuantity(item.sku, Number(e.target.value))}
                                  className="text-[11px] font-semibold bg-neutral-100 border border-neutral-200 rounded-lg px-2 py-0.5 text-neutral-800 cursor-pointer focus:outline-none focus:border-orange-500"
                                >
                                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                                    <option key={n} value={n}>
                                      {n}
                                    </option>
                                  ))}
                                </select>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeItem(item.sku);
                                  }}
                                  title="Remove item"
                                  className="p-1 text-neutral-400 hover:text-rose-600 transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* MOBILE EXPANDED SEARCH BAR (Shown on small screens below logo row) */}
        <div className="sm:hidden px-4 pb-2.5">
          <form
            onSubmit={handleSearchSubmit}
            className="relative flex items-center w-full rounded-full border border-neutral-800 bg-white"
          >
            <input
              type="text"
              placeholder="Search laptops, monitors, GPUs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs text-neutral-900 placeholder:text-neutral-400 focus:outline-none bg-transparent pl-4 pr-2 py-1.5"
            />
            <button
              type="submit"
              className="flex items-center justify-center w-8 h-7 rounded-full bg-neutral-900 text-white mr-1"
            >
              <Search className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>

        {/* 3. SUB-HEADER NAVIGATION STRIP (Storefront, Categories, and Customer Care moved below the new header section) */}
        <div className="bg-neutral-50/90 border-t border-neutral-200 px-4 sm:px-6 lg:px-8 py-2">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 text-xs">
            {/* Main Tabs that moved below: Storefront, Categories dropdown, Customer Care */}
            <nav className="flex items-center gap-6 sm:gap-8 font-medium text-neutral-700">
              
              {/* STOREFRONT TAB */}
              <button
                onClick={() => {
                  setCurrentView('storefront');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 py-1 ${
                  currentView === 'storefront'
                    ? 'text-orange-600 font-bold drop-shadow-[0_0_8px_rgba(234, 88, 12,0.5)] border-b-2 border-orange-600'
                    : 'text-neutral-700 hover:text-orange-600 hover:drop-shadow-[0_0_8px_rgba(234, 88, 12,0.55)]'
                }`}
              >
                <span>Storefront</span>
              </button>

              {/* CATEGORIES TAB WITH INTERACTIVE DROPDOWN */}
              <div
                className="relative"
                onMouseEnter={handleCategoriesEnter}
                onMouseLeave={handleCategoriesLeave}
              >
                <button
                  type="button"
                  onClick={() => {
                    const next = !isCategoriesPinned;
                    setIsCategoriesPinned(next);
                    setShowCategoriesMenu(next);
                  }}
                  className={`flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer py-1 px-2 rounded-lg ${
                    currentView.startsWith('category_') || currentView === 'categories_hub' || showCategoriesMenu
                      ? 'text-orange-600 font-bold drop-shadow-[0_0_8px_rgba(234, 88, 12,0.5)] border-b-2 border-orange-600'
                      : 'text-neutral-700 hover:text-orange-600 hover:drop-shadow-[0_0_8px_rgba(234, 88, 12,0.55)]'
                  }`}
                  aria-expanded={showCategoriesMenu}
                  aria-haspopup="true"
                >
                  <span className={showCategoriesMenu ? 'text-orange-600 font-bold' : ''}>Categories</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showCategoriesMenu ? 'rotate-180 text-orange-600' : 'opacity-70'}`} />
                </button>

                {showCategoriesMenu && (
                  <div
                    onMouseEnter={handleCategoriesEnter}
                    onMouseLeave={handleCategoriesLeave}
                    className="absolute left-0 top-full pt-1.5 w-[460px] sm:w-[520px] max-w-[95vw] z-50 animate-in fade-in slide-in-from-top-1 duration-150"
                  >
                    <div className="bg-white rounded-2xl shadow-2xl border border-orange-200/90 p-3 shadow-orange-500/10 grid grid-cols-1 sm:grid-cols-12 gap-3">
                      {/* Left: Department List */}
                      <div className="sm:col-span-7 flex flex-col justify-between">
                        <div>
                          <div className="px-2 pb-2 border-b border-neutral-100 flex items-center justify-between">
                            <span className="text-[11px] font-bold text-neutral-900 uppercase tracking-wider">
                              Hardware Departments
                            </span>
                            <button
                              onClick={() => {
                                setCurrentView('categories_hub');
                                setShowCategoriesMenu(false);
                                setIsCategoriesPinned(false);
                              }}
                              className="text-[10px] text-orange-600 hover:text-orange-700 hover:underline font-bold cursor-pointer"
                            >
                              View All
                            </button>
                          </div>

                          <div className="py-1 space-y-0.5">
                            {CATEGORIES_DATA.map((cat) => {
                              const Icon = ICON_MAP[cat.iconName] || Sparkles;
                              const isActive = activeCategorySlug === cat.slug;
                              return (
                                <button
                                  key={cat.slug}
                                  onClick={() => {
                                    onNavigateCategory(cat.slug);
                                    setShowCategoriesMenu(false);
                                    setIsCategoriesPinned(false);
                                  }}
                                  className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs transition-all flex items-center justify-between group cursor-pointer ${
                                    isActive
                                      ? 'bg-orange-50 text-orange-700 font-semibold border border-orange-200'
                                      : 'text-neutral-700 hover:bg-orange-50/70 hover:border hover:border-orange-200'
                                  }`}
                                >
                                  <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-lg bg-neutral-100 group-hover:bg-orange-100 text-neutral-600 group-hover:text-orange-700 flex items-center justify-center transition-colors shrink-0">
                                      <Icon className="w-3 h-3" />
                                    </div>
                                    <div className="min-w-0">
                                      <p className="font-semibold text-neutral-900 group-hover:text-orange-600 transition-colors truncate text-xs">
                                        {cat.shortName}
                                      </p>
                                    </div>
                                  </div>
                                  <ArrowRight className="w-3 h-3 text-neutral-400 group-hover:text-orange-600 group-hover:translate-x-0.5 transition-all shrink-0" />
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div className="pt-2 border-t border-neutral-100">
                          <button
                            onClick={() => {
                              setCurrentView('categories_hub');
                              setShowCategoriesMenu(false);
                              setIsCategoriesPinned(false);
                            }}
                            className="w-full py-1.5 px-3 bg-orange-50 hover:bg-orange-100 text-orange-800 rounded-xl text-[11px] font-bold text-center transition-all block border border-orange-200/80 cursor-pointer"
                          >
                            Browse Full Department Hub
                          </button>
                        </div>
                      </div>

                      {/* Right: Affiliate Partner Offer Spotlight (MaxBounty / Top Tech Affiliate) */}
                      <div className="sm:col-span-5 bg-gradient-to-br from-neutral-950 via-orange-950 to-neutral-900 rounded-xl p-3 text-white flex flex-col justify-between border border-orange-500/30 relative overflow-hidden">
                        <div className="relative z-10 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-mono font-bold uppercase tracking-wider bg-orange-500/30 text-orange-300 px-1.5 py-0.5 rounded border border-orange-400/30">
                              Affiliate Partner
                            </span>
                            <span className="text-[9px] text-neutral-400">
                              MaxBounty / Verified
                            </span>
                          </div>
                          <h4 className="text-xs font-black text-white leading-tight">
                            NordVPN Threat Protection Pro
                          </h4>
                          <p className="text-[10px] text-neutral-300 leading-snug">
                            Protect your gigabit fiber connection &amp; unlock global streaming catalogs. 74% off special partner deal.
                          </p>
                        </div>

                        <div className="relative z-10 pt-3">
                          <a
                            href="https://www.nordvpn.com/?aff_id=mevotech&subid=megamenu"
                            target="_blank"
                            rel="noopener noreferrer sponsored"
                            onClick={() => {
                              setShowCategoriesMenu(false);
                              setIsCategoriesPinned(false);
                            }}
                            className="w-full py-1.5 px-2 bg-white hover:bg-neutral-100 text-neutral-950 rounded-lg text-[11px] font-bold transition-all shadow flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <span>Claim 74% Off Partner Deal</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* CUSTOMER CARE TAB */}
              <button
                onClick={() => setCurrentView('info_shipping')}
                className={`transition-all whitespace-nowrap cursor-pointer py-1 ${
                  currentView.startsWith('info_')
                    ? 'text-orange-600 font-bold drop-shadow-[0_0_8px_rgba(234, 88, 12,0.5)] border-b-2 border-orange-600'
                    : 'text-neutral-700 hover:text-orange-600 hover:drop-shadow-[0_0_8px_rgba(234, 88, 12,0.55)]'
                }`}
              >
                <span>Customer Care</span>
              </button>
            </nav>

            {/* Right Sub-Header Badges: Quick Track, Fast Dispatch, Local Stock info */}
            <div className="hidden md:flex items-center gap-4 text-neutral-500 text-xs">
              <button
                onClick={() => {
                  const el = document.getElementById('catalogue-anchor');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className="hover:text-orange-600 transition-colors flex items-center gap-1 cursor-pointer font-medium"
              >
                <Flame className="w-3.5 h-3.5 text-amber-500" />
                <span>Today's Top Deals</span>
              </button>

              <span aria-hidden="true" className="text-neutral-300">·</span>

              <button
                onClick={() => setCurrentView('track')}
                className="hover:text-orange-600 transition-colors flex items-center gap-1 cursor-pointer font-medium"
              >
                <Truck className="w-3.5 h-3.5 text-orange-500" />
                <span>Track Courier</span>
              </button>

              <span aria-hidden="true" className="text-neutral-300">·</span>

              <span className="flex items-center gap-1 text-neutral-600">
                <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                <span>Sandton Warehouse Depot</span>
              </span>
            </div>
          </div>
        </div>

        {/* MOBILE NAVIGATION DRAWER */}
        {showMobileMenu && (
          <div className="md:hidden border-t border-neutral-200 bg-white px-4 py-4 space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-neutral-100">
              <div className="rounded-lg bg-neutral-950 p-1 shadow-sm border border-neutral-800 shrink-0">
                <img
                  src="/assets/aistudio/Generated_Image_October_29__2026_-_8_40PM_f8f1a10b.png"
                  alt="MEVO TECH"
                  className="h-8 w-auto max-w-[65px] object-cover rounded"
                />
              </div>
              <div className="flex flex-col items-center justify-center">
                <img
                  src="/assets/aistudio/mevo_wordmark_light.png"
                  alt="MEVO TECH — ONLINE TECH AND COMPUTER STORE"
                  className="h-8 w-auto object-contain"
                />
              </div>
            </div>

            <div className="space-y-1">
              <button
                onClick={() => {
                  setCurrentView('storefront');
                  setShowMobileMenu(false);
                }}
                className="w-full text-left px-3 py-2 rounded-lg text-sm font-semibold text-neutral-900 hover:bg-neutral-100"
              >
                Storefront Home
              </button>
              <button
                onClick={() => {
                  setCurrentView('categories_hub');
                  setShowMobileMenu(false);
                }}
                className="w-full text-left px-3 py-2 rounded-lg text-sm font-semibold text-orange-600 hover:bg-orange-50 flex items-center justify-between"
              >
                <span>All Categories Directory</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div className="border-t border-neutral-100 pt-3">
              <p className="px-3 text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">
                Hardware Departments
              </p>
              <div className="space-y-1">
                {CATEGORIES_DATA.map((cat) => {
                  const Icon = ICON_MAP[cat.iconName] || Sparkles;
                  return (
                    <button
                      key={cat.slug}
                      onClick={() => {
                        onNavigateCategory(cat.slug);
                        setShowMobileMenu(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-neutral-700 hover:bg-neutral-100 flex items-center gap-2.5"
                    >
                      <Icon className="w-4 h-4 text-orange-600" />
                      <span>{cat.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="border-t border-neutral-100 pt-3 space-y-1 text-xs">
              <button
                onClick={() => {
                  setIsComparisonModalOpen(true);
                  setShowMobileMenu(false);
                }}
                className="w-full text-left px-3 py-2 rounded-lg font-medium text-neutral-700 hover:bg-orange-50 flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <Scale className={`w-4 h-4 ${comparedProducts.length > 0 ? 'text-orange-600' : 'text-neutral-500'}`} />
                  <span>Product Comparison</span>
                </div>
                {comparedProducts.length > 0 && (
                  <span className="px-2 py-0.5 text-[10px] font-bold bg-orange-100 text-orange-700 rounded-full">
                    {comparedProducts.length} selected
                  </span>
                )}
              </button>
              <button
                onClick={() => {
                  setIsWishlistOpen(true);
                  setShowMobileMenu(false);
                }}
                className="w-full text-left px-3 py-2 rounded-lg font-medium text-neutral-700 hover:bg-rose-50 flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <Heart className={`w-4 h-4 ${wishlistCount > 0 ? 'text-rose-500 fill-rose-500' : 'text-neutral-500'}`} />
                  <span>Saved Wishlist</span>
                </div>
                {wishlistCount > 0 && (
                  <span className="px-2 py-0.5 text-[10px] font-bold bg-rose-100 text-rose-700 rounded-full">
                    {wishlistCount} items
                  </span>
                )}
              </button>
              <button
                onClick={() => {
                  setCurrentView('info_shipping');
                  setShowMobileMenu(false);
                }}
                className="w-full text-left px-3 py-2 rounded-lg font-medium text-neutral-700 hover:bg-neutral-100 flex items-center gap-2"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>Warranties, Shipping &amp; Care</span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* VISUAL SEARCH MODAL (Triggered by Camera Icon) */}
      {showVisualSearchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-neutral-200 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-orange-50 text-orange-600">
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-900">Visual Hardware Search</h3>
                  <p className="text-[11px] text-neutral-500">Scan or upload component photos</p>
                </div>
              </div>
              <button
                onClick={() => setShowVisualSearchModal(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 border-2 border-dashed border-neutral-300 hover:border-orange-500 rounded-2xl text-center space-y-3 bg-neutral-50/60 transition-colors">
              <Camera className="w-10 h-10 text-neutral-400 mx-auto" />
              <div>
                <p className="text-xs font-bold text-neutral-800">
                  Drag and drop a product image here
                </p>
                <p className="text-[11px] text-neutral-500 mt-1">
                  Upload photos of laptops, GPUs, monitors, or ports for SKU identification
                </p>
              </div>
              <div className="pt-2">
                <button
                  onClick={() => {
                    setSearchQuery('GeForce RTX');
                    setShowVisualSearchModal(false);
                    const el = document.getElementById('catalogue-anchor');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                >
                  Try Demo: Search RTX Hardware
                </button>
              </div>
            </div>

            <p className="text-[10px] text-center text-neutral-400">
              Matches physical inventory held at the Sandton Warehouse Depot
            </p>
          </div>
        </div>
      )}
    </>
  );
};
