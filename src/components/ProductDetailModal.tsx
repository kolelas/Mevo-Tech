import React, { useState } from 'react';
import { Product, ProductVariant } from '../types';
import { formatZAR, calculatePayflexInstalments } from '../utils/calculations';
import { useCart } from '../context/CartContext';
import { ShieldCheck, Truck, RotateCcw, Check, ShoppingBag, X, Heart, Bell } from 'lucide-react';
import { PriceDropAlertModal } from './PriceDropAlertModal';

interface ProductDetailModalProps {
  product: Product | null;
  onClose: () => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({ product, onClose }) => {
  const { addItem, isInWishlist, toggleWishlist } = useCart();
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | undefined>(() =>
    product?.variants && product.variants.length > 0 ? product.variants[0] : undefined
  );
  const [quantity, setQuantity] = useState(1);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [addedAnimation, setAddedAnimation] = useState(false);
  const [isPriceAlertOpen, setIsPriceAlertOpen] = useState(false);

  if (!product) return null;

  const currentPrice = selectedVariant
    ? selectedVariant.promotionalPriceCents || selectedVariant.priceCents
    : product.promotionalPriceCents || product.priceCents;

  const availableStock = selectedVariant
    ? selectedVariant.onHandQuantity - selectedVariant.reservedQuantity
    : product.onHandQuantity - product.reservedQuantity;

  const isOutOfStock = availableStock <= 0;
  const payflex = calculatePayflexInstalments(currentPrice);

  const handleAddToCart = () => {
    if (isOutOfStock) return;
    addItem(product, selectedVariant, quantity);
    setAddedAnimation(true);
    setTimeout(() => setAddedAnimation(false), 1500);
  };

  const images = product.images && product.images.length > 0 ? product.images : [product.primaryImage];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-neutral-900/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-in fade-in">
      <div className="relative bg-white rounded-2xl max-w-4xl w-full shadow-2xl overflow-hidden border border-neutral-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 rounded-full bg-white/80 hover:bg-neutral-100 text-neutral-600 transition-colors shadow-sm"
          aria-label="Close details"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* Left Column: Image Showcase */}
          <div className="p-6 bg-neutral-50 flex flex-col justify-between border-b md:border-b-0 md:border-r border-neutral-200">
            <div className="relative aspect-4/3 rounded-xl overflow-hidden bg-white border border-neutral-200 flex items-center justify-center">
              <img
                src={images[activeImageIndex] || product.primaryImage}
                alt={product.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover object-center"
              />
            </div>

            {images.length > 1 && (
              <div className="flex gap-2 mt-4 overflow-x-auto pb-1">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImageIndex(idx)}
                    className={`w-16 h-12 rounded-lg overflow-hidden border-2 transition-all shrink-0 ${
                      activeImageIndex === idx ? 'border-orange-600 ring-2 ring-orange-100' : 'border-neutral-200 opacity-70'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Quick Guarantees Strip */}
            <div className="mt-6 pt-4 border-t border-neutral-200 text-xs text-neutral-600 space-y-2">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-orange-600 shrink-0" />
                <span>Next-day dispatch from Sandton, Johannesburg depot</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{product.warrantyPeriodMonths}-Month official South African warranty</span>
              </div>
              <div className="flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-orange-600 shrink-0" />
                <span>14-Day Consumer Protection Act exchange policy</span>
              </div>
            </div>
          </div>

          {/* Right Column: Contiguous Purchase Module */}
          <div className="p-6 md:p-8 flex flex-col justify-between">
            <div>
              {/* Brand and SKU */}
              <div className="flex items-center justify-between text-xs text-neutral-500 mb-1.5">
                <span className="font-bold text-orange-600 uppercase tracking-wide">{product.brand}</span>
                <span className="font-mono text-neutral-400">SKU: {selectedVariant ? selectedVariant.sku : product.sku}</span>
              </div>

              {/* Title & Tagline */}
              <h1 className="text-xl font-extrabold text-neutral-900 tracking-tight leading-snug mb-2">
                {product.name}
              </h1>
              <p className="text-xs text-neutral-600 mb-4">{product.tagline}</p>

              {/* Price Block */}
              <div className="bg-neutral-50 rounded-xl p-4 border border-neutral-200 mb-5">
                <div className="flex items-baseline gap-3">
                  <span className="text-2xl font-extrabold text-neutral-900 font-mono tabular-nums">
                    {formatZAR(currentPrice)}
                  </span>
                  {product.promotionalPriceCents && (
                    <span className="text-sm text-neutral-400 line-through font-mono tabular-nums">
                      {formatZAR(product.priceCents)}
                    </span>
                  )}
                  <span className="text-[11px] font-medium text-neutral-500">VAT Included</span>
                </div>

                {/* Payflex BNPL calculation */}
                <div className="mt-2.5 pt-2 border-t border-neutral-200/60 flex items-center justify-between text-xs text-neutral-600">
                  <span>Or 4 equal interest-free payments of</span>
                  <span className="font-bold text-neutral-900 font-mono tabular-nums">
                    {formatZAR(payflex.instalmentCents)} with <strong className="text-orange-600">Payflex</strong>
                  </span>
                </div>
              </div>

              {/* Variant Selector (if applicable) */}
              {product.variants && product.variants.length > 0 && (
                <div className="mb-5">
                  <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">
                    Select Configuration:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {product.variants.map((v) => (
                      <button
                        key={v.id}
                        onClick={() => setSelectedVariant(v)}
                        className={`p-2.5 rounded-lg text-left text-xs border transition-all ${
                          selectedVariant?.id === v.id
                            ? 'border-orange-600 bg-orange-50 text-orange-900 font-semibold ring-1 ring-orange-600'
                            : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300'
                        }`}
                      >
                        <p>{v.title}</p>
                        <p className="font-mono text-neutral-500 mt-0.5">{formatZAR(v.priceCents)}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Description */}
              <p className="text-xs text-neutral-600 leading-relaxed mb-5">
                {product.description}
              </p>

              {/* Key Specs Breakdown */}
              {product.specifications && product.specifications.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-xs font-bold text-neutral-800 uppercase tracking-wider mb-2">
                    Verified Hardware Specifications
                  </h4>
                  <div className="bg-neutral-50 rounded-lg p-3 border border-neutral-200 text-xs space-y-1.5 max-h-40 overflow-y-auto">
                    {product.specifications.map((spec, i) => (
                      <div key={i} className="flex justify-between py-0.5 border-b border-neutral-200/50 last:border-0">
                        <span className="text-neutral-500">{spec.name}:</span>
                        <span className="font-medium text-neutral-800 text-right">{spec.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sticky Actions Bar */}
            <div className="pt-4 border-t border-neutral-200 flex items-center gap-3">
              {/* Quantity Stepper */}
              <div className="flex items-center border border-neutral-300 rounded-lg bg-white overflow-hidden shrink-0">
                <button
                  disabled={quantity <= 1 || isOutOfStock}
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="px-3 py-2 text-sm text-neutral-600 hover:bg-neutral-100 disabled:opacity-40"
                >
                  -
                </button>
                <span className="px-3 py-2 text-xs font-bold font-mono text-neutral-900">
                  {quantity}
                </span>
                <button
                  disabled={quantity >= availableStock || isOutOfStock}
                  onClick={() => setQuantity(Math.min(availableStock, quantity + 1))}
                  className="px-3 py-2 text-sm text-neutral-600 hover:bg-neutral-100 disabled:opacity-40"
                >
                  +
                </button>
              </div>

              {/* Add to Cart CTA */}
              <button
                disabled={isOutOfStock}
                onClick={handleAddToCart}
                className={`flex-1 py-3 px-5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                  isOutOfStock
                    ? 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
                    : addedAnimation
                    ? 'bg-emerald-600 text-white'
                    : 'bg-neutral-900 text-white hover:bg-orange-600 shadow-md'
                }`}
              >
                {addedAnimation ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Added to Cart!</span>
                  </>
                ) : isOutOfStock ? (
                  <span>Out of Stock</span>
                ) : (
                  <>
                    <ShoppingBag className="w-4 h-4" />
                    <span>Add to Cart ({formatZAR(currentPrice * quantity)})</span>
                  </>
                )}
              </button>

              {/* Wishlist Toggle Button */}
              <button
                type="button"
                onClick={() => toggleWishlist(product.id)}
                aria-label={isInWishlist(product.id) ? 'Remove from wishlist' : 'Save to wishlist'}
                title={isInWishlist(product.id) ? 'Remove from Wishlist' : 'Save to Wishlist'}
                className={`p-3 rounded-lg border transition-all flex items-center justify-center cursor-pointer ${
                  isInWishlist(product.id)
                    ? 'bg-rose-50 border-rose-200 text-rose-600 shadow-xs'
                    : 'bg-white border-neutral-300 text-neutral-600 hover:text-rose-600 hover:border-neutral-400'
                }`}
              >
                <Heart
                  className={`w-5 h-5 ${
                    isInWishlist(product.id) ? 'fill-rose-500 text-rose-500' : ''
                  }`}
                />
              </button>

              {/* Price Drop Alert Button */}
              <button
                type="button"
                onClick={() => setIsPriceAlertOpen(true)}
                aria-label="Notify when price drops"
                title="Notify me when price drops"
                className="p-3 rounded-lg border border-neutral-300 bg-white text-neutral-600 hover:text-orange-600 hover:border-orange-500 transition-all flex items-center justify-center cursor-pointer shadow-xs"
              >
                <Bell className="w-5 h-5 text-orange-600" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Price Drop Alert Subscription Modal */}
      <PriceDropAlertModal
        product={product}
        isOpen={isPriceAlertOpen}
        onClose={() => setIsPriceAlertOpen(false)}
      />
    </div>
  );
};
