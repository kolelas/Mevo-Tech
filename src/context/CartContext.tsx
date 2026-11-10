import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { CartItem, Product, ProductVariant, CouponDiscount } from '../types';
import { api } from '../services/api';

interface CartContextType {
  items: CartItem[];
  itemCount: number;
  subtotalCents: number;
  isDrawerOpen: boolean;
  setIsDrawerOpen: (open: boolean) => void;
  addItem: (product: Product, variant?: ProductVariant, quantity?: number) => void;
  updateQuantity: (sku: string, quantity: number) => void;
  removeItem: (sku: string) => void;
  clearCart: () => void;
  // Wishlist state and actions
  wishlist: string[];
  wishlistCount: number;
  isWishlistOpen: boolean;
  setIsWishlistOpen: (open: boolean) => void;
  toggleWishlist: (productId: string) => void;
  isInWishlist: (productId: string) => boolean;
  clearWishlist: () => void;
  // Coupon & Promotional Campaign State
  appliedCoupon: CouponDiscount | null;
  discountCents: number;
  couponError: string | null;
  isApplyingCoupon: boolean;
  applyCoupon: (code: string) => Promise<boolean>;
  removeCoupon: () => void;
  activeCampaigns: CouponDiscount[];
  loadActiveCampaigns: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'mevo_tech_cart_v1';
const WISHLIST_STORAGE_KEY = 'mevo_tech_wishlist_v1';
const COUPON_STORAGE_KEY = 'mevo_tech_coupon_v1';

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [wishlist, setWishlist] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(WISHLIST_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isWishlistOpen, setIsWishlistOpen] = useState(false);

  // Coupon & Promotional Campaign State
  const [appliedCoupon, setAppliedCoupon] = useState<CouponDiscount | null>(() => {
    try {
      const stored = localStorage.getItem(COUPON_STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [couponError, setCouponError] = useState<string | null>(null);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [activeCampaigns, setActiveCampaigns] = useState<CouponDiscount[]>([]);

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.error('Failed to save cart to localStorage', e);
    }
  }, [items]);

  useEffect(() => {
    try {
      localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(wishlist));
    } catch (e) {
      console.error('Failed to save wishlist to localStorage', e);
    }
  }, [wishlist]);

  useEffect(() => {
    try {
      if (appliedCoupon) {
        localStorage.setItem(COUPON_STORAGE_KEY, JSON.stringify(appliedCoupon));
      } else {
        localStorage.removeItem(COUPON_STORAGE_KEY);
      }
    } catch (e) {
      console.error('Failed to save coupon to localStorage', e);
    }
  }, [appliedCoupon]);

  const loadActiveCampaigns = useCallback(async () => {
    try {
      const campaigns = await api.getActiveCoupons();
      setActiveCampaigns(campaigns);
    } catch (e) {
      console.error('Failed to load active campaigns', e);
    }
  }, []);

  useEffect(() => {
    loadActiveCampaigns();
  }, [loadActiveCampaigns]);

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const wishlistCount = wishlist.length;

  const subtotalCents = items.reduce(
    (sum, item) => sum + item.priceCents * item.quantity,
    0
  );

  // Dynamic discount calculation
  let discountCents = 0;
  if (appliedCoupon && appliedCoupon.isActive) {
    if (subtotalCents >= appliedCoupon.minOrderCents) {
      if (appliedCoupon.type === 'PERCENTAGE') {
        discountCents = Math.round((subtotalCents * appliedCoupon.value) / 100);
      } else {
        discountCents = Math.min(subtotalCents, appliedCoupon.value);
      }
    }
  }

  const applyCoupon = async (code: string): Promise<boolean> => {
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) {
      setCouponError('Please enter a promo code');
      return false;
    }

    setIsApplyingCoupon(true);
    setCouponError(null);

    try {
      const coupon = await api.validateCoupon(cleanCode);
      if (subtotalCents < coupon.minOrderCents) {
        const minZar = (coupon.minOrderCents / 100).toLocaleString('en-ZA', { style: 'currency', currency: 'ZAR' });
        setCouponError(`Requires minimum order of ${minZar} (code saved)`);
        setAppliedCoupon(coupon);
        return false;
      }
      setAppliedCoupon(coupon);
      setCouponError(null);
      return true;
    } catch (err: any) {
      setCouponError(err.message || 'Invalid or expired coupon code');
      return false;
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponError(null);
  };

  const addItem = (product: Product, variant?: ProductVariant, quantity: number = 1) => {
    const sku = variant ? variant.sku : product.sku;
    const priceCents = variant
      ? variant.promotionalPriceCents || variant.priceCents
      : product.promotionalPriceCents || product.priceCents;
    const availableStock = variant
      ? variant.onHandQuantity - variant.reservedQuantity
      : product.onHandQuantity - product.reservedQuantity;

    setItems((prev) => {
      const existing = prev.find((i) => i.sku === sku);
      if (existing) {
        const newQty = Math.min(existing.quantity + quantity, availableStock);
        return prev.map((i) => (i.sku === sku ? { ...i, quantity: newQty, availableStock } : i));
      }
      return [
        ...prev,
        {
          productId: product.id,
          variantId: variant?.id,
          sku,
          name: product.name,
          brand: product.brand,
          variantTitle: variant?.title,
          image: product.primaryImage,
          priceCents,
          quantity: Math.min(quantity, Math.max(1, availableStock)),
          availableStock,
        },
      ];
    });

    setIsDrawerOpen(true);
  };

  const updateQuantity = (sku: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(sku);
      return;
    }
    setItems((prev) =>
      prev.map((item) => {
        if (item.sku === sku) {
          return { ...item, quantity: Math.min(quantity, item.availableStock) };
        }
        return item;
      })
    );
  };

  const removeItem = (sku: string) => {
    setItems((prev) => prev.filter((i) => i.sku !== sku));
  };

  const clearCart = () => {
    setItems([]);
    setAppliedCoupon(null);
    setCouponError(null);
  };

  const toggleWishlist = (productId: string) => {
    setWishlist((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
    );
  };

  const isInWishlist = (productId: string) => {
    return wishlist.includes(productId);
  };

  const clearWishlist = () => {
    setWishlist([]);
  };

  return (
    <CartContext.Provider
      value={{
        items,
        itemCount,
        subtotalCents,
        isDrawerOpen,
        setIsDrawerOpen,
        addItem,
        updateQuantity,
        removeItem,
        clearCart,
        wishlist,
        wishlistCount,
        isWishlistOpen,
        setIsWishlistOpen,
        toggleWishlist,
        isInWishlist,
        clearWishlist,
        appliedCoupon,
        discountCents,
        couponError,
        isApplyingCoupon,
        applyCoupon,
        removeCoupon,
        activeCampaigns,
        loadActiveCampaigns,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within CartProvider');
  return context;
};

