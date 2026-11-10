import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Product, ProductVariant } from '../types';
import { formatZAR } from '../utils/calculations';
import { useCart } from '../context/CartContext';
import {
  X,
  Check,
  ShieldCheck,
  Clock,
  Truck,
  ShoppingBag,
  Info,
  ChevronRight,
  Plus,
  Minus,
} from 'lucide-react';

interface ProductOptionsModalProps {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
  onSelectProductDetails?: (product: Product) => void;
  onProceedToCheckout?: () => void;
}

export const ProductOptionsModal: React.FC<ProductOptionsModalProps> = ({
  product,
  isOpen,
  onClose,
  onSelectProductDetails,
}) => {
  const { addItem } = useCart();
  const [mounted, setMounted] = useState(false);

  // Selected variant state: default to first variant or fallback
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | undefined>(() =>
    product.variants && product.variants.length > 0 ? product.variants[0] : undefined
  );

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Synchronize variant & image index whenever modal opens or product changes
  useEffect(() => {
    if (isOpen) {
      if (product.variants && product.variants.length > 0) {
        setSelectedVariant(product.variants[0]);
      } else {
        setSelectedVariant(undefined);
      }
      setActiveImageIndex(0);
      setQuantity(1);
    }
  }, [isOpen, product]);

  // Prevent background scrolling while modal is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  // Synthesize default variations if none exist in product record
  const availableVariants: ProductVariant[] =
    product.variants && product.variants.length > 0
      ? product.variants
      : [
          {
            id: `var_${product.id}_std`,
            sku: product.sku,
            title: 'Standard Workstation Edition',
            attributeName: 'Edition',
            attributeValue: 'Standard',
            priceCents: product.priceCents,
            promotionalPriceCents: product.promotionalPriceCents,
            onHandQuantity: product.onHandQuantity,
            reservedQuantity: product.reservedQuantity,
          },
          {
            id: `var_${product.id}_pro`,
            sku: `${product.sku}-PRO`,
            title: 'Creator Pro Bundle (+ 3Yr MevoCare)',
            attributeName: 'Edition',
            attributeValue: 'Pro Bundle',
            priceCents: Math.round(product.priceCents * 1.12),
            promotionalPriceCents: product.promotionalPriceCents
              ? Math.round(product.promotionalPriceCents * 1.12)
              : undefined,
            onHandQuantity: Math.max(1, product.onHandQuantity - 2),
            reservedQuantity: 0,
          },
        ];

  const currentVariant = selectedVariant || availableVariants[0];

  const currentPrice = currentVariant
    ? currentVariant.promotionalPriceCents || currentVariant.priceCents
    : product.promotionalPriceCents || product.priceCents;

  const originalPrice = currentVariant
    ? currentVariant.priceCents
    : product.priceCents;

  const hasDiscount = Boolean(originalPrice > currentPrice);
  const discountPercent = hasDiscount
    ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100)
    : 0;

  const availableStock = currentVariant
    ? currentVariant.onHandQuantity - currentVariant.reservedQuantity
    : product.onHandQuantity - product.reservedQuantity;

  const isOutOfStock = availableStock <= 0;

  const galleryImages =
    product.images && product.images.length > 0
      ? product.images
      : [product.primaryImage];

  const currentDisplayImage = galleryImages[activeImageIndex] || product.primaryImage;

  // Add to cart and immediately close modal without flickering
  const handleAddToCart = () => {
    if (isOutOfStock) return;
    addItem(product, currentVariant, quantity);
    onClose();
  };

  // Render via portal directly into document.body to prevent parent hover/transform re-render flickering
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="options-popup-title"
      className="fixed inset-0 z-[9999] bg-black/65 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative bg-white rounded-2xl sm:rounded-3xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5)] border border-neutral-200/90 max-w-4xl w-full overflow-hidden flex flex-col md:flex-row my-auto pointer-events-auto select-text"
      >
        {/* Top-Right Cancel / Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close options popup"
          className="absolute top-3 right-3 sm:top-4 sm:right-4 z-30 w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-600 hover:text-neutral-900 flex items-center justify-center transition-colors cursor-pointer shadow-xs"
        >
          <X className="w-4 h-4 stroke-[2.5]" />
        </button>

        {/* LEFT COLUMN: Visual Preview & Angle Gallery (Matching Image 2 left showcase) */}
        <div className="md:w-1/2 bg-gradient-to-br from-neutral-50 via-orange-50/15 to-neutral-100/80 p-5 sm:p-7 flex flex-col justify-between border-b md:border-b-0 md:border-r border-neutral-200/80">
          <div>
            {/* Top Cyan/Blue Feature Capsule (Matching Temu "Helmet baffle" Pill) */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-600/10 border border-cyan-500/30 text-cyan-800 text-[11px] font-bold mb-2">
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-600" />
              <span>Physical Sandton Stock · 100% Local Inventory</span>
            </div>

            {/* Feature Subtitle */}
            <p className="text-xs sm:text-sm font-semibold text-neutral-700 mb-3">
              Precision tested hardware with guaranteed instant courier dispatch
            </p>

            {/* Main Stage Image Preview */}
            <div className="relative aspect-4/3 sm:aspect-square bg-white rounded-2xl overflow-hidden border border-neutral-200 shadow-inner flex items-center justify-center p-3">
              <img
                src={currentDisplayImage}
                alt={product.name}
                className="w-full h-full object-cover rounded-xl"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />

              {/* Status pill on image */}
              <div className="absolute top-2.5 left-2.5">
                <span className="bg-neutral-950/80 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 border border-neutral-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>{availableStock} Units Available</span>
                </span>
              </div>
            </div>

            {/* Thumbnail Selection Strip */}
            {galleryImages.length > 1 && (
              <div className="flex items-center gap-2 mt-3 overflow-x-auto pb-1">
                {galleryImages.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveImageIndex(idx)}
                    className={`relative w-12 h-12 rounded-xl overflow-hidden border-2 transition-all cursor-pointer shrink-0 ${
                      activeImageIndex === idx
                        ? 'border-orange-500 ring-2 ring-orange-200'
                        : 'border-neutral-200 hover:border-neutral-400 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* South African Guarantee Ribbon */}
          <div className="mt-4 pt-3 border-t border-neutral-200/70 flex items-center justify-between text-[11px] text-neutral-500">
            <span className="flex items-center gap-1">
              <Truck className="w-3.5 h-3.5 text-orange-600" />
              <span>Door courier nationwide</span>
            </span>
            <span className="font-semibold text-neutral-700">Sandton City Depot</span>
          </div>
        </div>

        {/* RIGHT COLUMN: Options, Pricing, Variations & CTA (Matching Image 2 right column) */}
        <div className="md:w-1/2 p-5 sm:p-7 flex flex-col justify-between space-y-4">
          <div className="space-y-3.5">
            {/* Header: Title & Social Proof (Matching Image 2) */}
            <div>
              <h2
                id="options-popup-title"
                className="text-base sm:text-lg font-bold text-neutral-900 leading-snug line-clamp-2"
              >
                {product.name}
              </h2>

              <div className="flex items-center gap-2 mt-1 text-xs text-neutral-500 flex-wrap">
                <span className="font-semibold text-neutral-700">1,240 sold</span>
                <span>·</span>
                <span className="text-neutral-600">Sold by <strong className="text-orange-700">Mevo Tech 🇿🇦</strong></span>
                <span>·</span>
                <span className="text-amber-600 font-bold flex items-center gap-0.5">
                  ★ 4.9 <span className="text-neutral-400 font-normal">(184 reviews)</span>
                </span>
              </div>
            </div>

            {/* Pricing Block (Exact layout from Image 2: RRP R381 Estimated R173 [54% OFF]) */}
            <div className="p-3 bg-neutral-50 rounded-2xl border border-neutral-200/80 space-y-1">
              <div className="flex items-baseline gap-2.5 flex-wrap">
                {hasDiscount && (
                  <span className="text-xs text-neutral-400 line-through font-mono tabular-nums flex items-center gap-0.5">
                    <span>RRP {formatZAR(originalPrice)}</span>
                    <Info className="w-3 h-3 text-neutral-400" />
                  </span>
                )}
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xs font-semibold text-neutral-600">Estimated</span>
                  <span className="text-2xl sm:text-3xl font-black text-neutral-900 font-mono tabular-nums">
                    {formatZAR(currentPrice)}
                  </span>
                </div>
                {hasDiscount && (
                  <span className="px-2 py-0.5 rounded-full bg-orange-100 border border-orange-300 text-orange-700 text-xs font-black uppercase tracking-wider">
                    {discountPercent}% OFF
                  </span>
                )}
              </div>

              {/* Promo note & Countdown */}
              <div className="flex items-center justify-between text-[11px] text-neutral-500 pt-1">
                <span className="text-neutral-600">
                  After applying instant hardware promos
                </span>
                <span className="inline-flex items-center gap-1 font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
                  <Clock className="w-3 h-3 text-orange-500" />
                  <span>Ends 23:59 SAST</span>
                </span>
              </div>
              <p className="text-[10px] text-neutral-400">
                15% South African VAT included · Official tax invoice provided with order
              </p>
            </div>

            {/* Variations / Option Selector (Matching Image 2: "Color: [Option 1] [Option 2]") */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-neutral-800">
                  {currentVariant?.attributeName || 'Specification / Variation'}:{' '}
                  <span className="font-normal text-orange-700 font-semibold">
                    {currentVariant?.attributeValue || currentVariant?.title}
                  </span>
                </label>
                <span className="text-[11px] text-neutral-400">
                  {availableVariants.length} {availableVariants.length === 1 ? 'option' : 'options'}
                </span>
              </div>

              {/* Variation Cards Grid (Image 2 style with thumbnails) */}
              <div className="grid grid-cols-2 gap-2.5">
                {availableVariants.map((variant) => {
                  const isSelected = (currentVariant?.id === variant.id) || (currentVariant?.sku === variant.sku);
                  const varPrice = variant.promotionalPriceCents || variant.priceCents;

                  return (
                    <button
                      key={variant.id || variant.sku}
                      type="button"
                      onClick={() => setSelectedVariant(variant)}
                      className={`relative p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                        isSelected
                          ? 'border-2 border-orange-500 bg-orange-50/30 shadow-xs'
                          : 'border-neutral-200 hover:border-neutral-300 bg-white hover:bg-neutral-50/60'
                      }`}
                    >
                      {/* Variant Mini Thumbnail */}
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-neutral-100 border border-neutral-200 shrink-0">
                        <img
                          src={product.primaryImage}
                          alt={variant.title}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-bold truncate ${isSelected ? 'text-orange-950' : 'text-neutral-800'}`}>
                          {variant.attributeValue || variant.title}
                        </p>
                        <p className="text-[11px] font-mono font-semibold text-neutral-600 mt-0.5">
                          {formatZAR(varPrice)}
                        </p>
                      </div>

                      {/* Checkmark indicator */}
                      {isSelected && (
                        <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-orange-500 text-white flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quantity Selector */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs font-bold text-neutral-800">Quantity</span>
              <div className="flex items-center gap-3 bg-neutral-100 rounded-xl p-1 border border-neutral-200">
                <button
                  type="button"
                  disabled={quantity <= 1}
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="w-7 h-7 rounded-lg bg-white disabled:opacity-40 text-neutral-700 hover:text-orange-600 flex items-center justify-center font-bold text-xs shadow-2xs cursor-pointer"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="w-8 text-center text-xs font-black font-mono text-neutral-900">
                  {quantity}
                </span>
                <button
                  type="button"
                  disabled={quantity >= availableStock}
                  onClick={() => setQuantity((q) => Math.min(availableStock, q + 1))}
                  className="w-7 h-7 rounded-lg bg-white disabled:opacity-40 text-neutral-700 hover:text-orange-600 flex items-center justify-center font-bold text-xs shadow-2xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Actions Suite: Cancel button & Orange High-Converting Add to Cart CTA */}
          <div className="space-y-2.5 pt-3 border-t border-neutral-200">
            <div className="flex items-center gap-3">
              {/* Cancel Button */}
              <button
                type="button"
                onClick={onClose}
                className="py-3 px-5 rounded-full border border-neutral-300 hover:border-neutral-400 bg-white hover:bg-neutral-100 text-neutral-700 font-bold text-xs sm:text-sm transition-colors cursor-pointer text-center"
              >
                Cancel
              </button>

              {/* Add to Cart Button (disappears modal immediately when clicked) */}
              <button
                type="button"
                disabled={isOutOfStock}
                onClick={handleAddToCart}
                className="flex-1 py-3 px-6 rounded-full bg-gradient-to-r from-orange-500 via-orange-600 to-amber-500 hover:from-orange-600 hover:to-amber-600 disabled:opacity-50 text-white font-black text-xs sm:text-sm tracking-wide shadow-lg hover:shadow-orange-500/25 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>
                  {isOutOfStock
                    ? 'Out of Stock'
                    : `Add to Cart · ${formatZAR(currentPrice * quantity)}`}
                </span>
              </button>
            </div>

            <div className="flex items-center justify-between text-xs text-neutral-500 px-1">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (onSelectProductDetails) {
                    onSelectProductDetails(product);
                  }
                }}
                className="hover:text-orange-600 font-semibold transition-colors flex items-center gap-1 cursor-pointer"
              >
                <span>View full product details &amp; benchmarks</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <span className="text-[11px] text-emerald-700 font-medium flex items-center gap-1">
                <Check className="w-3 h-3 stroke-[2.5]" />
                <span>In Sandton Stock</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
