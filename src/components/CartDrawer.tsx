import React, { useState } from 'react';
import { useCart } from '../context/CartContext';
import { formatZAR, calculateIncludedVAT } from '../utils/calculations';
import { X, Trash2, ShoppingBag, ArrowRight, ShieldCheck, Tag } from 'lucide-react';
import { api } from '../services/api';
import { CouponDiscount } from '../types';

interface CartDrawerProps {
  onProceedToCheckout: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({ onProceedToCheckout }) => {
  const { items, itemCount, subtotalCents, isDrawerOpen, setIsDrawerOpen, updateQuantity, removeItem } = useCart();
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<CouponDiscount | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);

  if (!isDrawerOpen) return null;

  const freeShippingThreshold = 150000; // R1,500.00
  const isFreeShipping = subtotalCents >= freeShippingThreshold;
  const remainingForFreeShipping = Math.max(0, freeShippingThreshold - subtotalCents);
  const progressPercent = Math.min(100, Math.round((subtotalCents / freeShippingThreshold) * 100));

  let discountCents = 0;
  if (appliedCoupon) {
    if (appliedCoupon.type === 'PERCENTAGE') {
      discountCents = Math.round((subtotalCents * appliedCoupon.value) / 100);
    } else {
      discountCents = Math.min(subtotalCents, appliedCoupon.value);
    }
  }

  const vatAmount = calculateIncludedVAT(Math.max(0, subtotalCents - discountCents), 15);

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) return;

    setIsApplyingCoupon(true);
    setCouponError(null);
    try {
      const coupon = await api.validateCoupon(couponCode.trim());
      if (subtotalCents < coupon.minOrderCents) {
        setCouponError(`Requires minimum order of ${formatZAR(coupon.minOrderCents)}`);
      } else {
        setAppliedCoupon(coupon);
        setCouponCode('');
      }
    } catch (err: any) {
      setCouponError(err.message || 'Invalid coupon code');
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-neutral-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="absolute inset-0" onClick={() => setIsDrawerOpen(false)} />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col justify-between border-l border-neutral-200">
          {/* Header */}
          <div className="p-5 border-b border-neutral-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-purple-600" />
              <h2 className="text-base font-bold text-neutral-900">Your Shopping Bag ({itemCount})</h2>
            </div>
            <button
              onClick={() => setIsDrawerOpen(false)}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
              aria-label="Close cart drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Free Shipping Progress Indicator */}
          <div className="px-5 py-3 bg-neutral-50 border-b border-neutral-200 text-xs">
            {isFreeShipping ? (
              <p className="font-semibold text-emerald-700 flex items-center gap-1.5">
                <span>✓</span> You have unlocked <strong>Free Nationwide Door Delivery</strong>!
              </p>
            ) : (
              <div>
                <p className="text-neutral-600 mb-1.5">
                  Add <strong className="text-neutral-900 font-mono">{formatZAR(remainingForFreeShipping)}</strong> more to get <strong>Free Delivery</strong>
                </p>
                <div className="w-full bg-neutral-200 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-purple-600 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Items List */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {items.length === 0 ? (
              <div className="py-16 text-center text-neutral-500">
                <ShoppingBag className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
                <p className="text-sm font-semibold text-neutral-800">Your shopping bag is empty</p>
                <p className="text-xs text-neutral-400 mt-1 max-w-xs mx-auto">
                  Browse our high-performance laptops, curved displays, and gaming accessories.
                </p>
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="mt-5 px-4 py-2 bg-neutral-900 text-white rounded-lg text-xs font-semibold hover:bg-purple-600 transition-colors"
                >
                  Explore Storefront
                </button>
              </div>
            ) : (
              items.map((item) => (
                <div
                  key={item.sku}
                  className="flex gap-3.5 p-3 rounded-xl border border-neutral-200 bg-neutral-50/50 hover:bg-neutral-50 transition-colors"
                >
                  <img
                    src={item.image}
                    alt={item.name}
                    referrerPolicy="no-referrer"
                    className="w-18 h-18 rounded-lg object-cover object-center bg-white border border-neutral-200 shrink-0"
                  />
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">{item.brand}</p>
                          <h4 className="text-xs font-bold text-neutral-900 line-clamp-1">{item.name}</h4>
                          {item.variantTitle && (
                            <p className="text-[11px] text-neutral-500">{item.variantTitle}</p>
                          )}
                        </div>
                        <button
                          onClick={() => removeItem(item.sku)}
                          className="text-neutral-400 hover:text-rose-600 transition-colors p-1"
                          aria-label={`Remove ${item.name}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      {/* Quantity Stepper */}
                      <div className="flex items-center border border-neutral-300 rounded-md bg-white overflow-hidden">
                        <button
                          onClick={() => updateQuantity(item.sku, item.quantity - 1)}
                          className="px-2 py-0.5 text-xs text-neutral-600 hover:bg-neutral-100"
                        >
                          -
                        </button>
                        <span className="px-2 text-xs font-mono font-bold text-neutral-900">{item.quantity}</span>
                        <button
                          disabled={item.quantity >= item.availableStock}
                          onClick={() => updateQuantity(item.sku, item.quantity + 1)}
                          className="px-2 py-0.5 text-xs text-neutral-600 hover:bg-neutral-100 disabled:opacity-30"
                        >
                          +
                        </button>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-bold font-mono text-neutral-900 tabular-nums">
                          {formatZAR(item.priceCents * item.quantity)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer & Checkout Action */}
          {items.length > 0 && (
            <div className="p-5 border-t border-neutral-200 bg-white space-y-4">
              {/* Discount Code Form */}
              <div>
                {appliedCoupon ? (
                  <div className="flex items-center justify-between bg-emerald-50 text-emerald-800 px-3 py-2 rounded-lg text-xs border border-emerald-200">
                    <div className="flex items-center gap-1.5 font-medium">
                      <Tag className="w-3.5 h-3.5" />
                      <span>Code <strong>{appliedCoupon.code}</strong> applied (-{formatZAR(discountCents)})</span>
                    </div>
                    <button
                      onClick={() => setAppliedCoupon(null)}
                      className="text-emerald-700 hover:text-emerald-900 text-xs font-bold underline"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleApplyCoupon} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Promo code (e.g. MEVOSPRING)"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      className="flex-1 px-3 py-2 text-xs border border-neutral-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-600 uppercase"
                    />
                    <button
                      type="submit"
                      disabled={isApplyingCoupon || !couponCode.trim()}
                      className="px-3 py-2 text-xs font-semibold bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-lg transition-colors disabled:opacity-40"
                    >
                      Apply
                    </button>
                  </form>
                )}
                {couponError && <p className="text-[11px] text-rose-600 mt-1">{couponError}</p>}
              </div>

              {/* Order Calculations */}
              <div className="space-y-1.5 text-xs text-neutral-600 pt-2 border-t border-neutral-100">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-mono tabular-nums text-neutral-900">{formatZAR(subtotalCents)}</span>
                </div>
                {discountCents > 0 && (
                  <div className="flex justify-between text-emerald-700 font-medium">
                    <span>Discount</span>
                    <span className="font-mono tabular-nums">-{formatZAR(discountCents)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Courier Delivery</span>
                  <span className="font-mono tabular-nums text-neutral-900">
                    {isFreeShipping ? 'FREE' : formatZAR(15000)}
                  </span>
                </div>
                <div className="flex justify-between text-[11px] text-neutral-400">
                  <span>Includes 15% South African VAT</span>
                  <span className="font-mono tabular-nums">{formatZAR(vatAmount)}</span>
                </div>
                <div className="flex justify-between text-sm font-extrabold text-neutral-900 pt-2 border-t border-neutral-200">
                  <span>Estimated Total</span>
                  <span className="font-mono tabular-nums">
                    {formatZAR(subtotalCents - discountCents + (isFreeShipping ? 0 : 15000))}
                  </span>
                </div>
              </div>

              {/* Checkout Button */}
              <button
                onClick={() => {
                  setIsDrawerOpen(false);
                  onProceedToCheckout();
                }}
                className="w-full py-3.5 px-4 bg-neutral-900 text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-purple-600 transition-colors shadow-lg flex items-center justify-center gap-2 group"
              >
                <span>Proceed to Checkout</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>

              <div className="flex items-center justify-center gap-2 text-[11px] text-neutral-400">
                <ShieldCheck className="w-3.5 h-3.5 text-neutral-500" />
                <span>Encrypted 256-Bit SSL Checkout in South African Rand</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
