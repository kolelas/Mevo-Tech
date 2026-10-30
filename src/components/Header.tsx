import React, { useState } from 'react';
import {
  ShoppingBag,
  Search,
  ShieldCheck,
  User as UserIcon,
  LayoutDashboard,
  Truck,
  ChevronDown,
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
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import { CATEGORIES_DATA } from '../data/categories';

interface HeaderProps {
  currentView: string;
  setCurrentView: (view: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onNavigateCategory: (slug: string) => void;
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
}) => {
  const { itemCount, setIsDrawerOpen, wishlistCount, setIsWishlistOpen } = useCart();
  const {
    currentUser,
    switchRole,
    isAdmin,
    adminUser,
    isAdminLoggedIn,
    adminLogout,
    customer,
    isCustomerLoggedIn,
    customerLogout,
    openAuthModal,
  } = useAuth();

  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showCustomerMenu, setShowCustomerMenu] = useState(false);
  const [showCategoriesMenu, setShowCategoriesMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showSearchInput, setShowSearchInput] = useState(false);

  const activeCategorySlug = currentView.startsWith('category_')
    ? currentView.replace('category_', '')
    : null;

  return (
    <>
      {/* Top Notification Bar */}
      <div className="bg-neutral-900 text-neutral-300 text-xs py-2 px-4 border-b border-neutral-800">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-xs font-medium">
          <div className="flex items-center gap-2">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-purple-500"></span>
            <span>Free Door Courier on Orders Over R 1,500 · 100% Local South African Inventory · Sandton Depot</span>
          </div>
          <div className="hidden md:flex items-center gap-4 text-neutral-400">
            <button
              onClick={() => setCurrentView('track')}
              className="hover:text-white transition-colors flex items-center gap-1.5"
            >
              <Truck className="w-3.5 h-3.5 text-purple-400" />
              <span>Track Order</span>
            </button>
            <span aria-hidden="true">·</span>
            <span className="flex items-center gap-1 text-neutral-300">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Verified Local Warranty</span>
            </span>
          </div>
        </div>
      </div>

      {/* Main Top Bar - strictly follows 3-zone contract */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4 lg:gap-8">
          {/* Zone 1: Mobile Menu Button & Brand Wordmark */}
          <div className="flex items-center gap-3 shrink-0">
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
              className="flex items-center gap-3 text-left shrink-0 group focus:outline-none"
              aria-label="MEVO TECH Home"
            >
              <div className="relative overflow-hidden rounded-xl bg-neutral-950 p-1 shadow-md border border-neutral-800 shrink-0 group-hover:border-purple-500 transition-colors">
                <img
                  src="/assets/aistudio/Generated_Image_October_29__2026_-_8_40PM_f8f1a10b.png"
                  alt="MEVO TECH 3D Emblem"
                  className="h-10 sm:h-11 w-auto max-w-[85px] sm:max-w-[100px] object-cover rounded-lg transition-transform group-hover:scale-105"
                />
              </div>
              <div className="flex flex-col items-center justify-center">
                <img
                  src="/assets/aistudio/mevo_wordmark_light.png"
                  alt="MEVO TECH — ONLINE TECH AND COMPUTER STORE"
                  className="h-10 sm:h-12 w-auto object-contain transition-transform group-hover:scale-[1.02]"
                />
              </div>
            </button>
          </div>

          {/* Zone 2: Navigation Links (single line, no wrapping) */}
          <nav className="hidden md:flex items-center gap-5 lg:gap-6 text-sm font-medium text-neutral-700">
            <button
              onClick={() => {
                setCurrentView('storefront');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`hover:text-purple-600 hover:drop-shadow-[0_0_8px_rgba(168,85,247,0.55)] transition-all whitespace-nowrap shrink-0 ${
                currentView === 'storefront' ? 'text-purple-600 font-semibold drop-shadow-[0_0_6px_rgba(168,85,247,0.4)]' : ''
              }`}
            >
              Storefront
            </button>

            {/* All Categories Dropdown Menu */}
            <div className="relative">
              <button
                onClick={() => setShowCategoriesMenu(!showCategoriesMenu)}
                onMouseEnter={() => setShowCategoriesMenu(true)}
                className={`flex items-center gap-1 hover:text-purple-600 hover:drop-shadow-[0_0_8px_rgba(168,85,247,0.55)] transition-all whitespace-nowrap shrink-0 ${
                  currentView.startsWith('category_') || currentView === 'categories_hub'
                    ? 'text-purple-600 font-semibold drop-shadow-[0_0_6px_rgba(168,85,247,0.4)]'
                    : ''
                }`}
              >
                <span>Categories</span>
                <ChevronDown className="w-3.5 h-3.5 opacity-70" />
              </button>

              {showCategoriesMenu && (
                <div
                  onMouseLeave={() => setShowCategoriesMenu(false)}
                  className="absolute left-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-purple-200/60 p-2.5 z-50 animate-in fade-in slide-in-from-top-2 shadow-purple-500/10"
                >
                  <div className="px-3 py-2 border-b border-neutral-100 flex items-center justify-between">
                    <span className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
                      Hardware Departments
                    </span>
                    <button
                      onClick={() => {
                        setCurrentView('categories_hub');
                        setShowCategoriesMenu(false);
                      }}
                      className="text-[11px] text-purple-600 hover:text-purple-700 hover:underline font-semibold"
                    >
                      View All
                    </button>
                  </div>

                  <div className="py-1.5 space-y-0.5">
                    {CATEGORIES_DATA.map((cat) => {
                      const Icon = ICON_MAP[cat.iconName] || Sparkles;
                      const isActive = activeCategorySlug === cat.slug;
                      return (
                        <button
                          key={cat.slug}
                          onClick={() => {
                            onNavigateCategory(cat.slug);
                            setShowCategoriesMenu(false);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-all flex items-center justify-between group hover:shadow-[0_0_12px_rgba(168,85,247,0.25)] hover:border hover:border-purple-300 ${
                            isActive
                              ? 'bg-purple-50 text-purple-700 font-semibold border border-purple-200'
                              : 'text-neutral-700 hover:bg-purple-50/60'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-neutral-100 group-hover:bg-purple-100 text-neutral-600 group-hover:text-purple-700 flex items-center justify-center transition-colors">
                              <Icon className="w-3.5 h-3.5" />
                            </div>
                            <div>
                              <p className="font-semibold text-neutral-900 group-hover:text-purple-600 transition-colors">
                                {cat.shortName}
                              </p>
                              <p className="text-[10px] text-neutral-400">
                                {cat.highlights[0]?.value || 'Sandton Depot'}
                              </p>
                            </div>
                          </div>
                          <ArrowRight className="w-3 h-3 text-neutral-400 group-hover:text-purple-600 group-hover:translate-x-0.5 transition-all" />
                        </button>
                      );
                    })}
                  </div>

                  <div className="border-t border-neutral-100 pt-2 px-1">
                    <button
                      onClick={() => {
                        setCurrentView('categories_hub');
                        setShowCategoriesMenu(false);
                      }}
                      className="w-full py-2 px-3 bg-purple-50 hover:bg-purple-100 text-purple-800 rounded-xl text-xs font-bold text-center transition-all block border border-purple-200/80 hover:shadow-[0_0_12px_rgba(168,85,247,0.3)]"
                    >
                      Browse Full Department Hub
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Direct Quick Category Links */}
            <button
              onClick={() => onNavigateCategory('laptops-notebooks')}
              className={`hover:text-purple-600 hover:drop-shadow-[0_0_8px_rgba(168,85,247,0.55)] transition-all whitespace-nowrap shrink-0 ${
                activeCategorySlug === 'laptops-notebooks' ? 'text-purple-600 font-semibold drop-shadow-[0_0_6px_rgba(168,85,247,0.4)]' : ''
              }`}
            >
              Laptops & PCs
            </button>

            <button
              onClick={() => onNavigateCategory('monitors-displays')}
              className={`hover:text-purple-600 hover:drop-shadow-[0_0_8px_rgba(168,85,247,0.55)] transition-all whitespace-nowrap shrink-0 ${
                activeCategorySlug === 'monitors-displays' ? 'text-purple-600 font-semibold drop-shadow-[0_0_6px_rgba(168,85,247,0.4)]' : ''
              }`}
            >
              Displays
            </button>

            <button
              onClick={() => onNavigateCategory('desktops-workstations')}
              className={`hover:text-purple-600 hover:drop-shadow-[0_0_8px_rgba(168,85,247,0.55)] transition-all whitespace-nowrap shrink-0 hidden lg:inline-block ${
                activeCategorySlug === 'desktops-workstations' ? 'text-purple-600 font-semibold drop-shadow-[0_0_6px_rgba(168,85,247,0.4)]' : ''
              }`}
            >
              Custom Desktops
            </button>

            <button
              onClick={() => onNavigateCategory('audio-peripherals')}
              className={`hover:text-purple-600 hover:drop-shadow-[0_0_8px_rgba(168,85,247,0.55)] transition-all whitespace-nowrap shrink-0 ${
                activeCategorySlug === 'audio-peripherals' ? 'text-purple-600 font-semibold drop-shadow-[0_0_6px_rgba(168,85,247,0.4)]' : ''
              }`}
            >
              Audio & Gear
            </button>

            <button
              onClick={() => setCurrentView('track')}
              className={`hover:text-purple-600 hover:drop-shadow-[0_0_8px_rgba(168,85,247,0.55)] transition-all whitespace-nowrap shrink-0 ${
                currentView === 'track' ? 'text-purple-600 font-semibold drop-shadow-[0_0_6px_rgba(168,85,247,0.4)]' : ''
              }`}
            >
              Track Order
            </button>

            <button
              onClick={() => setCurrentView('info_shipping')}
              className={`hover:text-purple-600 hover:drop-shadow-[0_0_8px_rgba(168,85,247,0.55)] transition-all whitespace-nowrap shrink-0 ${
                currentView.startsWith('info_') ? 'text-purple-600 font-semibold drop-shadow-[0_0_6px_rgba(168,85,247,0.4)]' : ''
              }`}
            >
              Customer Care
            </button>
          </nav>

          {/* Zone 3: Actions & Shopping Bag */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            {/* Search Input / Toggle */}
            <div className="relative">
              {showSearchInput ? (
                <div className="flex items-center bg-neutral-100 rounded-lg px-2.5 py-1.5 border border-neutral-300">
                  <Search className="w-4 h-4 text-neutral-400 mr-2 shrink-0" />
                  <input
                    type="text"
                    placeholder="Search laptops, monitors, SSDs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoFocus
                    className="bg-transparent text-xs text-neutral-900 focus:outline-none w-36 sm:w-56"
                  />
                  <button
                    onClick={() => {
                      setShowSearchInput(false);
                      setSearchQuery('');
                    }}
                    className="text-neutral-400 hover:text-neutral-700 text-xs ml-1"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowSearchInput(true)}
                  aria-label="Search tech products"
                  className="p-2 rounded-lg text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 transition-colors"
                >
                  <Search className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Admin Portal Gateway Button & Active Session Dropdown */}
            {isAdminLoggedIn ? (
              <div className="relative">
                <button
                  onClick={() => setShowRoleMenu(!showRoleMenu)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-purple-50 border border-purple-200 text-purple-700 hover:bg-purple-100 transition-colors shadow-xs"
                  title="Admin session active"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                  <span className="hidden sm:inline">Admin: {adminUser?.name?.split(' ')[0]}</span>
                </button>

                {showRoleMenu && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-neutral-200 p-2 z-50 animate-in fade-in slide-in-from-top-2">
                    <div className="px-3 py-2 border-b border-neutral-100">
                      <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 uppercase tracking-wider">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span>Authenticated Session</span>
                      </div>
                      <p className="text-xs font-bold text-neutral-900 mt-1">{adminUser?.name}</p>
                      <p className="text-[11px] text-neutral-500 truncate">{adminUser?.email}</p>
                    </div>

                    <div className="p-1 space-y-0.5">
                      <button
                        onClick={() => {
                          setCurrentView('admin');
                          setShowRoleMenu(false);
                        }}
                        className="w-full text-left px-3 py-2 text-xs rounded-lg text-neutral-800 hover:bg-neutral-100 font-semibold flex items-center gap-2"
                      >
                        <LayoutDashboard className="w-3.5 h-3.5 text-purple-600" />
                        <span>Open Admin Console</span>
                      </button>

                      <button
                        onClick={() => {
                          adminLogout();
                          setShowRoleMenu(false);
                        }}
                        className="w-full text-left px-3 py-2 text-xs rounded-lg text-rose-600 hover:bg-rose-50 font-semibold flex items-center gap-2"
                      >
                        <LogOut className="w-3.5 h-3.5 text-rose-500" />
                        <span>Sign Out Admin</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => setCurrentView('admin')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                  currentView === 'admin'
                    ? 'bg-neutral-900 text-white border-neutral-900'
                    : 'bg-neutral-50 hover:bg-neutral-100 text-neutral-700 border-neutral-200'
                }`}
                title="Open Secured Admin Portal"
              >
                <Lock className="w-3.5 h-3.5 text-neutral-500" />
                <span className="hidden sm:inline">Admin</span>
              </button>
            )}

            {/* Customer Account Button & Dropdown */}
            {isCustomerLoggedIn && customer ? (
              <div className="relative">
                <button
                  onClick={() => setShowCustomerMenu(!showCustomerMenu)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-purple-50 border border-purple-200 text-purple-900 hover:bg-purple-100 transition-colors shadow-2xs cursor-pointer"
                  title="My Customer Account"
                >
                  <div className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-[10px] font-black shrink-0">
                    {customer.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="hidden sm:inline">{customer.name.split(' ')[0]}</span>
                  <ChevronDown className="w-3 h-3 text-purple-600" />
                </button>

                {showCustomerMenu && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-neutral-200 p-2 z-50 animate-in fade-in slide-in-from-top-2">
                    <div className="px-3 py-2.5 border-b border-neutral-100">
                      <p className="text-xs font-bold text-neutral-900">{customer.name}</p>
                      <p className="text-[11px] text-neutral-500 truncate">{customer.email}</p>
                    </div>

                    <div className="p-1 space-y-0.5 text-xs">
                      <button
                        onClick={() => {
                          setCurrentView('account');
                          setShowCustomerMenu(false);
                        }}
                        className="w-full text-left px-3 py-2 rounded-lg text-neutral-800 hover:bg-purple-50 hover:text-purple-700 font-semibold flex items-center gap-2 cursor-pointer"
                      >
                        <UserIcon className="w-4 h-4 text-purple-600" />
                        <span>Account Dashboard</span>
                      </button>

                      <button
                        onClick={() => {
                          setCurrentView('account_orders');
                          setShowCustomerMenu(false);
                        }}
                        className="w-full text-left px-3 py-2 rounded-lg text-neutral-800 hover:bg-purple-50 hover:text-purple-700 font-semibold flex items-center gap-2 cursor-pointer"
                      >
                        <Truck className="w-4 h-4 text-purple-600" />
                        <span>Orders &amp; Tracking</span>
                      </button>

                      <button
                        onClick={() => {
                          setCurrentView('account_bought');
                          setShowCustomerMenu(false);
                        }}
                        className="w-full text-left px-3 py-2 rounded-lg text-neutral-800 hover:bg-purple-50 hover:text-purple-700 font-semibold flex items-center gap-2 cursor-pointer"
                      >
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        <span>Bought Hardware &amp; Reviews</span>
                      </button>

                      <button
                        onClick={() => {
                          setIsWishlistOpen(true);
                          setShowCustomerMenu(false);
                        }}
                        className="w-full text-left px-3 py-2 rounded-lg text-neutral-800 hover:bg-purple-50 hover:text-purple-700 font-semibold flex items-center gap-2 cursor-pointer"
                      >
                        <Heart className="w-4 h-4 text-rose-500" />
                        <span>Saved Favourites ({wishlistCount})</span>
                      </button>

                      <div className="pt-1 border-t border-neutral-100">
                        <button
                          onClick={() => {
                            customerLogout();
                            setShowCustomerMenu(false);
                          }}
                          className="w-full text-left px-3 py-2 rounded-lg text-rose-600 hover:bg-rose-50 font-semibold flex items-center gap-2 cursor-pointer"
                        >
                          <LogOut className="w-4 h-4 text-rose-500" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => openAuthModal('login')}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-neutral-50 hover:bg-purple-50 hover:text-purple-700 text-neutral-700 border border-neutral-200 transition-colors shadow-2xs cursor-pointer"
                title="Customer Sign In / Register"
              >
                <UserIcon className="w-3.5 h-3.5 text-neutral-500" />
                <span className="hidden sm:inline">Sign In</span>
              </button>
            )}

            {/* Wishlist Button */}
            <button
              onClick={() => setIsWishlistOpen(true)}
              aria-label={`View saved wishlist with ${wishlistCount} items`}
              title="Saved Wishlist"
              className="relative p-2.5 rounded-lg border border-neutral-200 bg-white text-neutral-700 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50/40 transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Heart className={`w-4 h-4 transition-colors ${wishlistCount > 0 ? 'text-rose-500 fill-rose-500' : 'text-neutral-600'}`} />
              <span className="hidden sm:inline text-xs font-semibold">Wishlist</span>
              {wishlistCount > 0 && (
                <span className="px-1.5 py-0.5 text-[11px] font-bold bg-rose-500 text-white rounded-full leading-none">
                  {wishlistCount}
                </span>
              )}
            </button>

            {/* Shopping Cart Button */}
            <button
              onClick={() => setIsDrawerOpen(true)}
              aria-label={`View shopping cart with ${itemCount} items`}
              className="relative p-2.5 rounded-lg bg-neutral-900 text-white hover:bg-neutral-800 transition-colors flex items-center gap-2 shadow-sm cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4" />
              <span className="hidden sm:inline text-xs font-semibold">Cart</span>
              {itemCount > 0 && (
                <span className="px-1.5 py-0.5 text-[11px] font-bold bg-purple-500 text-white rounded-full leading-none">
                  {itemCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {showMobileMenu && (
          <div className="md:hidden border-t border-neutral-200 bg-white px-4 py-4 space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-neutral-100">
              <div className="rounded-lg bg-neutral-950 p-1 shadow-sm border border-neutral-800 shrink-0">
                <img
                  src="/assets/aistudio/Generated_Image_October_29__2026_-_8_40PM_f8f1a10b.png"
                  alt="MEVO TECH"
                  className="h-9 w-auto max-w-[65px] object-cover rounded"
                />
              </div>
              <div className="flex flex-col items-center justify-center">
                <img
                  src="/assets/aistudio/mevo_wordmark_light.png"
                  alt="MEVO TECH — ONLINE TECH AND COMPUTER STORE"
                  className="h-9 sm:h-10 w-auto object-contain"
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
                className="w-full text-left px-3 py-2 rounded-lg text-sm font-semibold text-purple-600 hover:bg-purple-50 flex items-center justify-between"
              >
                <span>All Categories Directory</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div className="border-t border-neutral-100 pt-3">
              <p className="px-3 text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">
                Category Pages
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
                      <Icon className="w-4 h-4 text-purple-600" />
                      <span>{cat.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="border-t border-neutral-100 pt-3 space-y-1 text-xs">
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
                  setCurrentView('track');
                  setShowMobileMenu(false);
                }}
                className="w-full text-left px-3 py-2 rounded-lg font-medium text-neutral-700 hover:bg-neutral-100 flex items-center gap-2"
              >
                <Truck className="w-4 h-4 text-purple-500" />
                <span>Track Your Order</span>
              </button>
              <button
                onClick={() => {
                  setCurrentView('info_shipping');
                  setShowMobileMenu(false);
                }}
                className="w-full text-left px-3 py-2 rounded-lg font-medium text-neutral-700 hover:bg-neutral-100 flex items-center gap-2"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>Warranties & Shipping</span>
              </button>
              <button
                onClick={() => {
                  setCurrentView('admin');
                  setShowMobileMenu(false);
                }}
                className="w-full text-left px-3 py-2 rounded-lg font-semibold text-purple-600 hover:bg-purple-50 flex items-center gap-2"
              >
                <Lock className="w-4 h-4 text-purple-500" />
                <span>{isAdminLoggedIn ? 'Admin Console (Signed In)' : 'Admin Portal (Secured Login)'}</span>
              </button>
            </div>
          </div>
        )}
      </header>
    </>
  );
};
