import React, { useState } from 'react';
import { Order, OrderStatus } from '../types';
import { formatZAR } from '../utils/calculations';
import { api } from '../services/api';
import { Search, Truck, CheckCircle2, Clock, AlertCircle, Package, ExternalLink } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface OrderTrackingViewProps {
  initialOrder?: Order | null;
  onBackToShopping: () => void;
}

const LIFECYCLE_STEPS: OrderStatus[] = ['PENDING_PAYMENT', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'];

export const OrderTrackingView: React.FC<OrderTrackingViewProps> = ({ initialOrder, onBackToShopping }) => {
  const { isFulfilment } = useAuth();
  const [order, setOrder] = useState<Order | null>(initialOrder || null);
  const [referenceInput, setReferenceInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!referenceInput.trim() || !emailInput.trim()) return;

    setIsLoading(true);
    setError(null);
    try {
      const result = await api.lookupOrder(referenceInput.trim(), emailInput.trim());
      setOrder(result);
    } catch (err: any) {
      setError(err.message || 'Order not found. Please verify reference and email.');
      setOrder(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickStatusUpdate = async (nextStatus: OrderStatus) => {
    if (!order) return;
    try {
      const updated = await api.updateOrderStatus(order.reference, nextStatus, `Updated via tracking portal preview`);
      setOrder(updated);
    } catch (e: any) {
      setError(e.message);
    }
  };

  const currentStepIndex = order ? LIFECYCLE_STEPS.indexOf(order.status) : -1;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 animate-in fade-in">
      {/* Page Title */}
      <div className="text-center max-w-xl mx-auto mb-8">
        <div className="inline-flex items-center justify-center p-1.5 rounded-2xl bg-neutral-950 shadow-md border border-neutral-800 mb-3">
          <img
            src="/assets/aistudio/Generated_Image_October_29__2026_-_8_40PM_f8f1a10b.png"
            alt="MEVO TECH"
            className="w-24 h-auto max-h-12 object-cover rounded-xl"
          />
        </div>
        <div className="flex flex-col items-center justify-center">
          <img
            src="/assets/aistudio/mevo_wordmark_light.png"
            alt="MEVO TECH — ONLINE TECH AND COMPUTER STORE"
            className="h-12 sm:h-13 w-auto object-contain mx-auto"
          />
        </div>
        <h1 className="text-xl font-extrabold text-neutral-900 tracking-tight mt-3">Order Tracking & Waybill Status</h1>
        <p className="text-xs text-neutral-500 mt-1">
          Track door-to-door courier dispatches from our Sandton warehouse across all 9 South African provinces.
        </p>
      </div>

      {/* Lookup Form */}
      <div className="bg-white rounded-xl border border-neutral-200 p-6 shadow-sm mb-8">
        <form onSubmit={handleLookup} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">Order Reference</label>
            <input
              type="text"
              placeholder="e.g. MEV-2026-94812"
              value={referenceInput}
              onChange={(e) => setReferenceInput(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-orange-600 font-mono uppercase"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">Customer Email</label>
            <input
              type="email"
              placeholder="e.g. customer@example.co.za"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-orange-600"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={isLoading || !referenceInput.trim() || !emailInput.trim()}
              className="w-full py-2.5 px-4 bg-neutral-900 text-white rounded-lg text-xs font-bold hover:bg-orange-600 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-40"
            >
              <Search className="w-4 h-4" />
              <span>{isLoading ? 'Searching...' : 'Track Order'}</span>
            </button>
          </div>
        </form>

        {error && (
          <div className="mt-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Order Details Display */}
      {order && (
        <div className="space-y-6">
          {/* Order Header Summary */}
          <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-neutral-100">
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-xl font-mono font-extrabold text-neutral-900">{order.reference}</h2>
                  <span
                    className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                      order.status === 'PAID'
                        ? 'bg-emerald-100 text-emerald-800'
                        : order.status === 'SHIPPED'
                        ? 'bg-orange-100 text-orange-800'
                        : order.status === 'DELIVERED'
                        ? 'bg-orange-100 text-orange-800'
                        : order.status === 'PENDING_PAYMENT'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-neutral-100 text-neutral-800'
                    }`}
                  >
                    {order.status.replace('_', ' ')}
                  </span>
                </div>
                <p className="text-xs text-neutral-500 mt-1">
                  Placed on {new Date(order.createdAt).toLocaleDateString('en-ZA', { dateStyle: 'long' })} · Paid via {order.paymentMethod.toUpperCase()}
                </p>
              </div>

              <div className="text-right">
                <span className="text-xs text-neutral-500">Total Charged:</span>
                <p className="text-xl font-mono font-extrabold text-neutral-900">{formatZAR(order.totalCents)}</p>
                <span className="text-[11px] text-neutral-400">Includes 15% VAT ({formatZAR(order.taxCents)})</span>
              </div>
            </div>

            {/* Lifecycle Progress Bar */}
            <div className="py-6 border-b border-neutral-100">
              <div className="grid grid-cols-5 text-center text-xs font-semibold gap-1 mb-2">
                {LIFECYCLE_STEPS.map((step, idx) => {
                  const isCompleted = currentStepIndex >= idx;
                  const isCurrent = currentStepIndex === idx;
                  return (
                    <div
                      key={step}
                      className={`${
                        isCurrent
                          ? 'text-orange-600 font-bold'
                          : isCompleted
                          ? 'text-neutral-800'
                          : 'text-neutral-400'
                      }`}
                    >
                      {step.replace('_', ' ')}
                    </div>
                  );
                })}
              </div>

              <div className="w-full bg-neutral-100 h-2 rounded-full overflow-hidden flex">
                <div
                  className="bg-orange-600 h-2 rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.max(10, ((currentStepIndex + 1) / LIFECYCLE_STEPS.length) * 100)}%`,
                  }}
                />
              </div>
            </div>

            {/* Tracking / Courier Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 text-xs">
              <div>
                <h4 className="font-bold text-neutral-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-orange-600" />
                  <span>Courier & Dispatch</span>
                </h4>
                {order.trackingNumber ? (
                  <div className="bg-neutral-50 rounded-xl p-3 border border-neutral-200 space-y-1.5">
                    <p><strong className="text-neutral-700">Courier:</strong> {order.courierName || 'The Courier Guy'}</p>
                    <p><strong className="text-neutral-700">Waybill No:</strong> <span className="font-mono font-bold text-orange-700">{order.trackingNumber}</span></p>
                    {order.trackingUrl && (
                      <a
                        href={order.trackingUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-orange-600 font-semibold hover:underline mt-1"
                      >
                        <span>View Live Courier Tracking</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                ) : (
                  <div className="bg-neutral-50 rounded-xl p-3 border border-neutral-200 text-neutral-500">
                    <p>Order is currently in warehouse staging at Sandton depot.</p>
                    <p className="text-[11px] text-neutral-400 mt-0.5">Tracking number will be assigned upon parcel dispatch.</p>
                  </div>
                )}
              </div>

              <div>
                <h4 className="font-bold text-neutral-800 uppercase tracking-wider mb-2">Delivery Address</h4>
                <div className="bg-neutral-50 rounded-xl p-3 border border-neutral-200 text-neutral-700 space-y-0.5">
                  <p className="font-bold text-neutral-900">{order.shippingAddress.fullName}</p>
                  <p>{order.shippingAddress.streetAddress}</p>
                  <p>{order.shippingAddress.suburb}, {order.shippingAddress.city}</p>
                  <p>{order.shippingAddress.province}, {order.shippingAddress.postalCode}</p>
                  <p className="text-neutral-500 font-mono mt-1">{order.shippingAddress.phone}</p>
                </div>
              </div>
            </div>

            {/* Warehouse Manager Sandbox simulation buttons */}
            {isFulfilment && (
              <div className="mt-6 pt-4 border-t border-neutral-200/60 bg-orange-50/50 -mx-6 -mb-6 p-4 rounded-b-2xl">
                <p className="text-xs font-bold text-orange-900 mb-2">Warehouse Sandbox Controls:</p>
                <div className="flex flex-wrap gap-2 text-xs">
                  <button
                    onClick={() => handleQuickStatusUpdate('PROCESSING')}
                    className="px-3 py-1.5 bg-white border border-orange-200 text-orange-700 rounded-md font-semibold hover:bg-orange-100"
                  >
                    Mark Processing
                  </button>
                  <button
                    onClick={async () => {
                      await api.updateOrderTracking(order.reference, 'The Courier Guy', `TCG-${Date.now().toString().slice(-6)}`);
                      const refreshed = await api.getOrderByReference(order.reference);
                      setOrder(refreshed);
                    }}
                    className="px-3 py-1.5 bg-orange-600 text-white rounded-md font-semibold hover:bg-orange-700"
                  >
                    Assign Waybill & Mark Shipped
                  </button>
                  <button
                    onClick={() => handleQuickStatusUpdate('DELIVERED')}
                    className="px-3 py-1.5 bg-emerald-600 text-white rounded-md font-semibold hover:bg-emerald-700"
                  >
                    Mark Delivered
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Itemized Order Line Items */}
          <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-sm">
            <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wider mb-4">Itemized Tax Invoice Snapshot</h3>
            <div className="divide-y divide-neutral-100 text-xs">
              {order.items.map((item, idx) => (
                <div key={idx} className="py-3 flex justify-between items-center">
                  <div>
                    <span className="font-bold text-neutral-900">{item.name}</span>
                    {item.variantTitle && <span className="text-neutral-500 ml-2">({item.variantTitle})</span>}
                    <div className="text-[11px] text-neutral-400 font-mono">
                      SKU: {item.sku} · Qty: {item.quantity} × {formatZAR(item.unitPriceCents)}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-neutral-900">{formatZAR(item.totalCents)}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-neutral-200 space-y-1.5 text-xs text-neutral-600">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="font-mono tabular-nums">{formatZAR(order.subtotalCents)}</span>
              </div>
              {order.discountCents > 0 && (
                <div className="flex justify-between text-emerald-700 font-medium">
                  <span>Discount Applied:</span>
                  <span className="font-mono tabular-nums">-{formatZAR(order.discountCents)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Courier Service ({order.shippingMethod.name}):</span>
                <span className="font-mono tabular-nums">
                  {order.shippingCents === 0 ? 'FREE' : formatZAR(order.shippingCents)}
                </span>
              </div>
              <div className="flex justify-between text-sm font-extrabold text-neutral-900 pt-2 border-t border-neutral-200">
                <span>Total (ZAR):</span>
                <span className="font-mono tabular-nums">{formatZAR(order.totalCents)}</span>
              </div>
            </div>
          </div>

          <div className="text-center pt-2">
            <button
              onClick={onBackToShopping}
              className="text-xs font-semibold text-orange-600 hover:text-orange-800 underline"
            >
              Continue Shopping
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
