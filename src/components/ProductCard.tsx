import React, { useState } from 'react';
import { Product } from '../types';
import { formatZAR } from '../utils/calculations';
import { useCart } from '../context/CartContext';
import { ShoppingBag, Eye, CheckCircle2, AlertTriangle, Heart, Share2 } from 'lucide-react';
import { ShareModal } from './ShareModal';

interface ProductCardProps {
  product: Product;
  onSelect: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onSelect }) => {
  const { addItem, isInWishlist, toggleWishlist } = useCart();
  const [isShareOpen, setIsShareOpen] = useState(false);
  const availableStock = product.onHandQuantity - product.reservedQuantity;
  const isOutOfStock = availableStock <= 0;
  const isLowStock = availableStock > 0 && availableStock <= product.lowStockThreshold;

  const currentPrice = product.promotionalPriceCents || product.priceCents;
  const hasDiscount = Boolean(product.promotionalPriceCents && product.promotionalPriceCents < product.priceCents);
  const isSaved = isInWishlist(product.id);

  return (
    <div className="group relative bg-white rounded-xl border border-neutral-200 hover:border-purple-400 overflow-hidden flex flex-col transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_4px_20px_rgba(168,85,247,0.2)]">
      {/* Product Image Area */}
      <div
        onClick={() => onSelect(product)}
        className="relative aspect-4/3 bg-neutral-100 overflow-hidden cursor-pointer flex items-center justify-center"
      >
        <img
          src={product.primaryImage}
          alt={product.name}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
          onError={(e) => {
            // High-fidelity fallback container
            (e.target as HTMLElement).style.display = 'none';
          }}
        />

        {/* Status indicators */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10 pointer-events-none">
          {product.isNewArrival && (
            <span className="text-[11px] font-bold text-purple-700 bg-purple-50/90 backdrop-blur-sm px-2 py-0.5 rounded border border-purple-200">
              NEW
            </span>
          )}
          {hasDiscount && (
            <span className="text-[11px] font-bold text-amber-700 bg-amber-50/90 backdrop-blur-sm px-2 py-0.5 rounded border border-amber-200">
              SPECIAL
            </span>
          )}
        </div>

        {/* Top-Right Card Actions: Share & Heart Wishlist */}
        <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsShareOpen(true);
            }}
            aria-label={`Share ${product.name}`}
            title="Share item"
            className="p-2 rounded-full transition-all duration-200 shadow-sm cursor-pointer bg-white/85 hover:bg-white text-neutral-500 hover:text-purple-600 backdrop-blur-xs"
          >
            <Share2 className="w-4 h-4" />
          </button>

          {/* Heart Wishlist Toggle Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleWishlist(product.id);
            }}
            aria-label={isSaved ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`}
            title={isSaved ? 'Remove from Wishlist' : 'Save to Wishlist'}
            className={`p-2 rounded-full transition-all duration-200 shadow-sm cursor-pointer ${
              isSaved
                ? 'bg-white text-rose-600 ring-2 ring-rose-300 shadow-md'
                : 'bg-white/85 hover:bg-white text-neutral-500 hover:text-rose-600 backdrop-blur-xs'
            }`}
          >
            <Heart
              className={`w-4 h-4 transition-transform duration-200 ${
                isSaved ? 'fill-rose-500 text-rose-500 scale-110' : 'hover:scale-115'
              }`}
            />
          </button>
        </div>

        {/* Hover Quick View Trigger */}
        <div className="absolute inset-0 bg-neutral-900/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
          <span className="bg-white/95 text-neutral-900 text-xs font-semibold px-3 py-1.5 rounded-lg shadow-sm flex items-center gap-1.5 backdrop-blur-sm">
            <Eye className="w-3.5 h-3.5" />
            <span>View Specifications</span>
          </span>
        </div>
      </div>

      {/* Product Info */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          {/* Metadata: Category & Brand */}
          <div className="flex items-center gap-1.5 text-xs text-neutral-500 mb-1">
            <span className="font-semibold text-neutral-700">{product.brand}</span>
            <span aria-hidden="true">·</span>
            <span className="truncate">{product.category}</span>
          </div>

          {/* Product Title */}
          <h3
            onClick={() => onSelect(product)}
            className="text-sm font-bold text-neutral-900 line-clamp-2 hover:text-purple-600 transition-colors cursor-pointer mb-1.5"
            title={product.name}
          >
            {product.name}
          </h3>

          {/* Tagline */}
          <p className="text-xs text-neutral-500 line-clamp-1 mb-3">
            {product.tagline}
          </p>
        </div>

        <div>
          {/* Price & Stock Baseline */}
          <div className="pt-2 border-t border-neutral-100 flex items-baseline justify-between mb-3">
            <div>
              <span className="text-base font-extrabold text-neutral-900 font-mono tabular-nums">
                {formatZAR(currentPrice)}
              </span>
              {hasDiscount && (
                <span className="ml-2 text-xs text-neutral-400 line-through font-mono tabular-nums">
                  {formatZAR(product.priceCents)}
                </span>
              )}
            </div>

            {/* Stock State */}
            <div className="text-[11px] font-medium flex items-center gap-1">
              {isOutOfStock ? (
                <span className="text-rose-600">Out of Stock</span>
              ) : isLowStock ? (
                <span className="text-amber-600 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  <span>{availableStock} left</span>
                </span>
              ) : (
                <span className="text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>In Stock</span>
                </span>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => onSelect(product)}
              className="flex-1 py-2 px-3 text-xs font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors text-center"
            >
              Specs
            </button>
            <button
              disabled={isOutOfStock}
              onClick={() => addItem(product)}
              aria-label={`Add ${product.name} to cart`}
              className={`py-2 px-3 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors ${
                isOutOfStock
                  ? 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
                  : 'bg-neutral-900 text-white hover:bg-purple-600 shadow-sm'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </div>
        </div>
      </div>

      {/* Share Modal */}
      <ShareModal
        product={product}
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
      />
    </div>
  );
};
