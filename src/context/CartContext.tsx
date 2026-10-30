import React, { createContext, useContext, useEffect, useState } from 'react';
import { CartItem, Product, ProductVariant } from '../types';

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
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'mevo_tech_cart_v1';
const WISHLIST_STORAGE_KEY = 'mevo_tech_wishlist_v1';

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

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const wishlistCount = wishlist.length;

  const subtotalCents = items.reduce(
    (sum, item) => sum + item.priceCents * item.quantity,
    0
  );

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

