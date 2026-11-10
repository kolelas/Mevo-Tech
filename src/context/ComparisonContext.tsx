import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Product } from '../types';
import { MAX_COMPARE_PRODUCTS, canAddToCompare } from '../utils/comparison';

interface ComparisonToast {
  message: string;
  type: 'info' | 'warning' | 'success';
}

interface ComparisonContextType {
  comparedProducts: Product[];
  comparedProductIds: string[];
  isComparisonModalOpen: boolean;
  setIsComparisonModalOpen: (open: boolean) => void;
  toast: ComparisonToast | null;
  clearToast: () => void;
  addToCompare: (product: Product) => boolean;
  removeFromCompare: (productId: string) => void;
  toggleCompare: (product: Product) => void;
  clearCompare: () => void;
  isInCompare: (productId: string) => boolean;
  replaceCompareSlot: (index: number, newProduct: Product) => void;
  maxItems: number;
}

const ComparisonContext = createContext<ComparisonContextType | undefined>(undefined);

const COMPARE_STORAGE_KEY = 'mevo_tech_compare_v1';

export const ComparisonProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [comparedProducts, setComparedProducts] = useState<Product[]>(() => {
    try {
      const stored = localStorage.getItem(COMPARE_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [isComparisonModalOpen, setIsComparisonModalOpen] = useState(false);
  const [toast, setToast] = useState<ComparisonToast | null>(null);

  // Sync with localStorage
  useEffect(() => {
    try {
      localStorage.setItem(COMPARE_STORAGE_KEY, JSON.stringify(comparedProducts));
    } catch (err) {
      console.warn('Failed to save comparison to localStorage', err);
    }
  }, [comparedProducts]);

  // Auto-clear toast
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      setToast(null);
    }, 3800);
    return () => clearTimeout(timer);
  }, [toast]);

  const clearToast = useCallback(() => {
    setToast(null);
  }, []);

  const isInCompare = useCallback(
    (productId: string) => {
      return comparedProducts.some((p) => p.id === productId);
    },
    [comparedProducts]
  );

  const addToCompare = useCallback(
    (product: Product): boolean => {
      const check = canAddToCompare(comparedProducts, product, MAX_COMPARE_PRODUCTS);
      if (!check.allowed) {
        if (check.reason === 'ALREADY_EXISTS') {
          setToast({
            message: `"${product.name}" is already in your comparison list.`,
            type: 'info',
          });
        } else if (check.reason === 'MAX_LIMIT_REACHED') {
          setToast({
            message: `Comparison limit reached (Max 3 products). Remove an item to add "${product.name}".`,
            type: 'warning',
          });
        }
        return false;
      }

      setComparedProducts((prev) => [...prev, product]);
      setToast({
        message: `Added "${product.name}" to comparison (${comparedProducts.length + 1} of ${MAX_COMPARE_PRODUCTS}).`,
        type: 'success',
      });
      return true;
    },
    [comparedProducts]
  );

  const removeFromCompare = useCallback((productId: string) => {
    setComparedProducts((prev) => {
      const removed = prev.find((p) => p.id === productId);
      const next = prev.filter((p) => p.id !== productId);
      if (removed) {
        setToast({
          message: `Removed "${removed.name}" from comparison.`,
          type: 'info',
        });
      }
      return next;
    });
  }, []);

  const toggleCompare = useCallback(
    (product: Product) => {
      if (isInCompare(product.id)) {
        removeFromCompare(product.id);
      } else {
        addToCompare(product);
      }
    },
    [isInCompare, removeFromCompare, addToCompare]
  );

  const clearCompare = useCallback(() => {
    setComparedProducts([]);
    setToast({
      message: 'Cleared all items from comparison.',
      type: 'info',
    });
  }, []);

  const replaceCompareSlot = useCallback((index: number, newProduct: Product) => {
    setComparedProducts((prev) => {
      // Remove any existing occurrence of newProduct
      const filtered = prev.filter((p) => p.id !== newProduct.id);
      if (index >= 0 && index < filtered.length) {
        const updated = [...filtered];
        updated[index] = newProduct;
        return updated;
      }
      if (filtered.length < MAX_COMPARE_PRODUCTS) {
        return [...filtered, newProduct];
      }
      return filtered;
    });
  }, []);

  return (
    <ComparisonContext.Provider
      value={{
        comparedProducts,
        comparedProductIds: comparedProducts.map((p) => p.id),
        isComparisonModalOpen,
        setIsComparisonModalOpen,
        toast,
        clearToast,
        addToCompare,
        removeFromCompare,
        toggleCompare,
        clearCompare,
        isInCompare,
        replaceCompareSlot,
        maxItems: MAX_COMPARE_PRODUCTS,
      }}
    >
      {children}
    </ComparisonContext.Provider>
  );
};

const defaultComparisonContext: ComparisonContextType = {
  comparedProducts: [],
  comparedProductIds: [],
  isComparisonModalOpen: false,
  setIsComparisonModalOpen: () => {},
  toast: null,
  clearToast: () => {},
  addToCompare: () => false,
  removeFromCompare: () => {},
  toggleCompare: () => {},
  clearCompare: () => {},
  isInCompare: () => false,
  replaceCompareSlot: () => {},
  maxItems: MAX_COMPARE_PRODUCTS,
};

export const useComparison = (): ComparisonContextType => {
  const context = useContext(ComparisonContext);
  return context || defaultComparisonContext;
};

