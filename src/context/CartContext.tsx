import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { AbandonedCart, CartItem, Product, ProductVariant, CouponDiscount } from '../types';
import { api } from '../services/api';
import { useAuth } from './AuthContext';

interface RestoreCartResult {
  success: boolean;
  hasStockChanges: boolean;
  suggestedCouponCode?: string;
  itemCount?: number;
  error?: string;
}

interface SaveCartResult {
  success: boolean;
  cart?: AbandonedCart;
  recoveryUrl?: string;
  message?: string;
  error?: string;
}

interface CartContextType {
  cartSessionId: string;
  items: CartItem[];
  itemCount: number;
  subtotalCents: number;
  isDrawerOpen: boolean;
  setIsDrawerOpen: (open: boolean) => void;
  addItem: (product: Product, variant?: ProductVariant, quantity?: number) => void;
  updateQuantity: (sku: string, quantity: number) => void;
  removeItem: (sku: string) => void;
  clearCart: (options?: { ordered?: boolean }) => void;
  // Abandoned Cart state and recovery actions
  abandonedCarts: AbandonedCart[];
  isLoadingAbandonedCarts: boolean;
  refreshAbandonedCarts: () => Promise<void>;
  restoreAbandonedCart: (token: string) => Promise<RestoreCartResult>;
  saveCartForLater: (overrideEmail?: string) => Promise<SaveCartResult>;
  emailAbandonedCartReminder: (cartId: string, overrideEmail?: string) => Promise<SaveCartResult>;
  dismissAbandonedCart: (cartId: string) => Promise<void>;
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
const CART_SESSION_ID_KEY = 'mevo_cart_session_id';

function getOrCreateCartSessionId(): string {
  try {
    const existing = localStorage.getItem(CART_SESSION_ID_KEY);
    if (existing && existing.trim() !== '') {
      return existing;
    }
    const generated =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? `mevo_sess_${crypto.randomUUID()}`
        : `mevo_sess_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    localStorage.setItem(CART_SESSION_ID_KEY, generated);
    return generated;
  } catch {
    return `mevo_sess_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
  }
}

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { customer } = useAuth();
  const [cartSessionId] = useState<string>(() => getOrCreateCartSessionId());

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

  // Abandoned Cart State
  const [abandonedCarts, setAbandonedCarts] = useState<AbandonedCart[]>([]);
  const [isLoadingAbandonedCarts, setIsLoadingAbandonedCarts] = useState(false);

  // Track sync lifecycle so completing an order doesn't overwrite RECOVERED status with empty cart sync
  const hasSyncedItemsRef = useRef<boolean>(items.length > 0);
  const skipNextEmptySyncRef = useRef<boolean>(false);

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

  const refreshAbandonedCarts = useCallback(async () => {
    setIsLoadingAbandonedCarts(true);
    try {
      const carts = await api.getAbandonedCarts({
        sessionId: cartSessionId,
        customerId: customer?.id,
        email: customer?.email,
      });
      setAbandonedCarts(carts);
    } catch (err) {
      console.warn('Could not load saved/abandoned carts', err);
    } finally {
      setIsLoadingAbandonedCarts(false);
    }
  }, [cartSessionId, customer?.id, customer?.email]);

  useEffect(() => {
    refreshAbandonedCarts();
  }, [refreshAbandonedCarts]);

  // Debounced server cart sync for abandoned cart detection & server-authoritative pricing
  useEffect(() => {
    if (items.length === 0) {
      if (skipNextEmptySyncRef.current) {
        skipNextEmptySyncRef.current = false;
        hasSyncedItemsRef.current = false;
        return;
      }
      if (!hasSyncedItemsRef.current) {
        return;
      }
    }

    const timer = setTimeout(() => {
      if (items.length > 0) {
        hasSyncedItemsRef.current = true;
      } else {
        hasSyncedItemsRef.current = false;
      }

      api
        .syncCart({
          sessionId: cartSessionId,
          items: items.map((i) => ({
            productId: i.productId,
            variantId: i.variantId,
            quantity: i.quantity,
          })),
          discountCode: appliedCoupon?.code,
          customerId: customer?.id,
          customerEmail: customer?.email,
          customerName: customer?.name,
          customerPhone: customer?.phone,
        })
        .catch((err) => {
          console.warn('Background cart sync failed:', err);
        });
    }, 500);

    return () => clearTimeout(timer);
  }, [items, appliedCoupon?.code, cartSessionId, customer?.id, customer?.email, customer?.name, customer?.phone]);

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

  const clearCart = (options?: { ordered?: boolean }) => {
    if (options?.ordered) {
      skipNextEmptySyncRef.current = true;
    }
    setItems([]);
    setAppliedCoupon(null);
    setCouponError(null);
    if (options?.ordered) {
      refreshAbandonedCarts();
    }
  };

  const restoreAbandonedCart = useCallback(async (token: string): Promise<RestoreCartResult> => {
    try {
      const recovered = await api.recoverAbandonedCart(token);
      setItems(recovered.items);
      if (recovered.suggestedCoupon) {
        setAppliedCoupon(recovered.suggestedCoupon);
        setCouponError(null);
      }
      setIsDrawerOpen(true);
      await refreshAbandonedCarts();
      return {
        success: true,
        hasStockChanges: recovered.hasStockChanges,
        suggestedCouponCode: recovered.suggestedCoupon?.code,
        itemCount: recovered.items.reduce((s, i) => s + i.quantity, 0),
      };
    } catch (err: any) {
      return {
        success: false,
        hasStockChanges: false,
        error: err.message || 'Could not restore saved cart link',
      };
    }
  }, [refreshAbandonedCarts]);

  const saveCartForLater = useCallback(async (overrideEmail?: string): Promise<SaveCartResult> => {
    if (items.length === 0) {
      return { success: false, error: 'Your shopping bag is currently empty.' };
    }

    try {
      const targetEmail = overrideEmail?.trim().toLowerCase() || customer?.email;
      const synced = await api.syncCart({
        sessionId: cartSessionId,
        items: items.map((i) => ({
          productId: i.productId,
          variantId: i.variantId,
          quantity: i.quantity,
        })),
        discountCode: appliedCoupon?.code,
        customerId: customer?.id,
        customerEmail: targetEmail,
        customerName: customer?.name,
        customerPhone: customer?.phone,
      });

      const abandoned = await api.markCartAbandoned({
        sessionId: cartSessionId,
        customerId: customer?.id,
        customerEmail: targetEmail,
        reason: 'Customer saved cart from shopping bag',
      });

      const savedCart = abandoned.cart || synced.cart;
      if (!savedCart) {
        return { success: false, error: 'Unable to save cart at this time.' };
      }

      if (targetEmail && targetEmail.includes('@')) {
        const remind = await api.sendAbandonedCartReminder(savedCart.id, {
          sessionId: cartSessionId,
          customerId: customer?.id,
          email: customer?.email,
          overrideEmail: targetEmail,
        });
        await refreshAbandonedCarts();
        return {
          success: true,
          cart: remind.cart,
          recoveryUrl: remind.recoveryUrl,
          message: remind.message,
        };
      }

      await refreshAbandonedCarts();
      return {
        success: true,
        cart: savedCart,
        recoveryUrl: `/?recover_cart=${savedCart.recoveryToken}`,
        message: 'Cart saved to your account. Use the recovery link anytime to resume.',
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Failed to save cart for later',
      };
    }
  }, [items, cartSessionId, appliedCoupon?.code, customer?.id, customer?.email, customer?.name, customer?.phone, refreshAbandonedCarts]);

  const emailAbandonedCartReminder = useCallback(async (cartId: string, overrideEmail?: string): Promise<SaveCartResult> => {
    try {
      const res = await api.sendAbandonedCartReminder(cartId, {
        sessionId: cartSessionId,
        customerId: customer?.id,
        email: customer?.email,
        overrideEmail,
      });
      await refreshAbandonedCarts();
      return {
        success: true,
        cart: res.cart,
        recoveryUrl: res.recoveryUrl,
        message: res.message,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Failed to send recovery email',
      };
    }
  }, [cartSessionId, customer?.id, customer?.email, refreshAbandonedCarts]);

  const dismissAbandonedCart = useCallback(async (cartId: string) => {
    await api.dismissAbandonedCart(cartId, {
      sessionId: cartSessionId,
      customerId: customer?.id,
      email: customer?.email,
    });
    await refreshAbandonedCarts();
  }, [cartSessionId, customer?.id, customer?.email, refreshAbandonedCarts]);

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
        cartSessionId,
        items,
        itemCount,
        subtotalCents,
        isDrawerOpen,
        setIsDrawerOpen,
        addItem,
        updateQuantity,
        removeItem,
        clearCart,
        abandonedCarts,
        isLoadingAbandonedCarts,
        refreshAbandonedCarts,
        restoreAbandonedCart,
        saveCartForLater,
        emailAbandonedCartReminder,
        dismissAbandonedCart,
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
