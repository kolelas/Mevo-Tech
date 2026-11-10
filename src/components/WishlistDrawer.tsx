import React from 'react';
import { useCart } from '../context/CartContext';
import { Product } from '../types';
import { formatZAR } from '../utils/calculations';
import { X, Heart, ShoppingBag, Trash2, ArrowRight, CheckCircle2, AlertTriangle } from 'lucide-react';

interface WishlistDrawerProps {
  products: Product[];
  onSelectProduct?: (product: Product) => void;
  onExploreProducts?: () => void;
}

export const WishlistDrawer: React.FC<WishlistDrawerProps> = ({
  products,
  onSelectProduct,
  onExploreProducts,
}) => {
  const {
    wishlist,
    wishlistCount,
    isWishlistOpen,
    setIsWishlistOpen,
    toggleWishlist,
    clearWishlist,
    addItem,
  } = useCart();

  if (!isWishlistOpen) return null;

  // Find the full product objects for the IDs in the wishlist
  const savedProducts = wishlist
    .map((id) => products.find((p) => p.id === id))
    .filter((p): p is Product => p !== undefined);

  const handleMoveToCart = (product: Product) => {
    addItem(product);
    toggleWishlist(product.id);
  };

  const handleMoveAllToCart = () => {
    savedProducts.forEach((product) => {
      const stock = product.onHandQuantity - product.reservedQuantity;
      if (stock > 0) {
        addItem(product);
      }
    });
    clearWishlist();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-neutral-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="absolute inset-0" onClick={() => setIsWishlistOpen(false)} />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col justify-between border-l border-neutral-200">
          {/* Header */}
          <div className="p-5 border-b border-neutral-200 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center">
                <Heart className="w-4 h-4 fill-rose-500 text-rose-500" />
              </div>
              <div>
                <h2 className="text-base font-bold text-neutral-900">Saved Wishlist</h2>
                <p className="text-xs text-neutral-500">{wishlistCount} {wishlistCount === 1 ? 'item' : 'items'} saved for later</p>
              </div>
            </div>
            <button
              onClick={() => setIsWishlistOpen(false)}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
              aria-label="Close wishlist drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-5">
            {savedProducts.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-12">
                <div className="w-16 h-16 rounded-full bg-rose-50 flex items-center justify-center mb-4">
                  <Heart className="w-8 h-8 text-rose-300 stroke-[1.5]" />
                </div>
                <h3 className="text-base font-bold text-neutral-900 mb-1">Your wishlist is empty</h3>
                <p className="text-xs text-neutral-500 max-w-xs mb-6">
                  Tap the heart icon on any product to save it to your wishlist and monitor stock or flash price cuts.
                </p>
                <button
                  onClick={() => {
                    setIsWishlistOpen(false);
                    if (onExploreProducts) onExploreProducts();
                  }}
                  className="py-2.5 px-5 bg-neutral-900 text-white rounded-xl text-xs font-bold hover:bg-orange-600 transition-colors shadow-sm"
                >
                  Explore Hardware Catalog
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs pb-1 border-b border-neutral-100">
                  <span className="text-neutral-500">Items ready to move to cart</span>
                  <button
                    onClick={clearWishlist}
                    className="text-neutral-400 hover:text-rose-600 transition-colors font-medium flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Clear All</span>
                  </button>
                </div>

                <div className="divide-y divide-neutral-100">
                  {savedProducts.map((product) => {
                    const price = product.promotionalPriceCents || product.priceCents;
                    const availableStock = product.onHandQuantity - product.reservedQuantity;
                    const isOutOfStock = availableStock <= 0;
                    const isLowStock = availableStock > 0 && availableStock <= product.lowStockThreshold;

                    return (
                      <div key={product.id} className="py-4 flex gap-3.5 group">
                        <div
                          onClick={() => {
                            if (onSelectProduct) {
                              onSelectProduct(product);
                              setIsWishlistOpen(false);
                            }
                          }}
                          className="w-20 h-20 bg-neutral-100 rounded-xl overflow-hidden shrink-0 border border-neutral-200 cursor-pointer flex items-center justify-center"
                        >
                          <img
                            src={product.primaryImage}
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          />
                        </div>

                        <div className="flex-1 flex flex-col justify-between min-w-0">
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                                {product.brand} · {product.category}
                              </span>
                              <button
                                onClick={() => toggleWishlist(product.id)}
                                aria-label="Remove from wishlist"
                                className="text-neutral-300 hover:text-rose-600 transition-colors p-0.5"
                                title="Remove item"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>

                            <h4
                              onClick={() => {
                                if (onSelectProduct) {
                                  onSelectProduct(product);
                                  setIsWishlistOpen(false);
                                }
                              }}
                              className="text-xs font-bold text-neutral-900 truncate hover:text-orange-600 transition-colors cursor-pointer mt-0.5"
                            >
                              {product.name}
                            </h4>

                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-sm font-extrabold text-neutral-900 font-mono">
                                {formatZAR(price)}
                              </span>
                              {product.promotionalPriceCents && product.promotionalPriceCents < product.priceCents && (
                                <span className="text-[11px] text-neutral-400 line-through font-mono">
                                  {formatZAR(product.priceCents)}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-2">
                            {/* Stock Indicator */}
                            <div className="text-[11px]">
                              {isOutOfStock ? (
                                <span className="text-rose-600 flex items-center gap-1 font-medium">
                                  <AlertTriangle className="w-3 h-3" />
                                  <span>Out of Stock</span>
                                </span>
                              ) : isLowStock ? (
                                <span className="text-amber-600 flex items-center gap-1 font-medium">
                                  <span>{availableStock} left in depot</span>
                                </span>
                              ) : (
                                <span className="text-emerald-700 flex items-center gap-1 font-medium">
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>In Stock</span>
                                </span>
                              )}
                            </div>

                            {/* Move to Cart CTA */}
                            <button
                              disabled={isOutOfStock}
                              onClick={() => handleMoveToCart(product)}
                              className={`py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                                isOutOfStock
                                  ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed'
                                  : 'bg-neutral-900 hover:bg-orange-600 text-white shadow-xs'
                              }`}
                            >
                              <ShoppingBag className="w-3.5 h-3.5" />
                              <span>Add to Cart</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          {savedProducts.length > 0 && (
            <div className="p-5 border-t border-neutral-200 bg-neutral-50 space-y-2.5">
              <button
                onClick={handleMoveAllToCart}
                className="w-full py-3 px-4 bg-neutral-900 hover:bg-orange-600 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Move In-Stock Items to Cart</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => setIsWishlistOpen(false)}
                className="w-full py-2 px-4 bg-white border border-neutral-200 text-neutral-700 text-xs font-semibold rounded-xl hover:bg-neutral-100 transition-colors text-center"
              >
                Continue Browsing
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
