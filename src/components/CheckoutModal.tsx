import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Order, PaymentProvider, ShippingAddress } from '../types';
import { formatZAR, calculatePayflexInstalments } from '../utils/calculations';
import { ShieldCheck, Truck, CreditCard, Lock, CheckCircle2, ArrowRight, X, AlertCircle, Tag, Sparkles } from 'lucide-react';
import { PaymentGatewaysRow } from './PaymentAndSocialBadges';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderComplete: (order: Order) => void;
}

const SA_PROVINCES = [
  'Gauteng',
  'Western Cape',
  'KwaZulu-Natal',
  'Eastern Cape',
  'Free State',
  'Limpopo',
  'Mpumalanga',
  'North West',
  'Northern Cape',
];

export const CheckoutModal: React.FC<CheckoutModalProps> = ({ isOpen, onClose, onOrderComplete }) => {
  const {
    items,
    subtotalCents,
    clearCart,
    appliedCoupon,
    discountCents,
    couponError,
    isApplyingCoupon,
    applyCoupon,
    removeCoupon,
    activeCampaigns,
  } = useCart();
  const { customer, isCustomerLoggedIn, openAuthModal } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [checkoutCouponCode, setCheckoutCouponCode] = useState('');

  // Strict logged-out checkout prevention: auto-close modal & route to register if not authenticated
  useEffect(() => {
    if (isOpen && !isCustomerLoggedIn) {
      onClose();
      openAuthModal('register', true);
    }
  }, [isOpen, isCustomerLoggedIn, onClose, openAuthModal]);

  const [shippingAddress, setShippingAddress] = useState<ShippingAddress>(() => ({
    fullName: customer?.defaultAddress?.fullName || customer?.name || '',
    email: customer?.defaultAddress?.email || customer?.email || '',
    phone: customer?.defaultAddress?.phone || customer?.phone || '+27 ',
    streetAddress: customer?.defaultAddress?.streetAddress || '',
    suburb: customer?.defaultAddress?.suburb || '',
    city: customer?.defaultAddress?.city || 'Johannesburg',
    province: customer?.defaultAddress?.province || 'Gauteng',
    postalCode: customer?.defaultAddress?.postalCode || '2196',
    deliveryNotes: customer?.defaultAddress?.deliveryNotes || '',
  }));

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (customer) {
      setShippingAddress({
        fullName: customer.defaultAddress?.fullName || customer.name,
        email: customer.defaultAddress?.email || customer.email,
        phone: customer.defaultAddress?.phone || customer.phone,
        streetAddress: customer.defaultAddress?.streetAddress || '',
        suburb: customer.defaultAddress?.suburb || '',
        city: customer.defaultAddress?.city || 'Johannesburg',
        province: customer.defaultAddress?.province || 'Gauteng',
        postalCode: customer.defaultAddress?.postalCode || '2196',
        deliveryNotes: customer.defaultAddress?.deliveryNotes || '',
      });
    }
  }, [customer]);

  // Lock background scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      const origOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = origOverflow;
      };
    }
  }, [isOpen]);

  const [shippingMethodId, setShippingMethodId] = useState('standard');
  const [paymentMethod, setPaymentMethod] = useState<PaymentProvider>('payfast');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Active simulated payment flow state
  const [pendingOrder, setPendingOrder] = useState<Order | null>(null);
  const [isSimulatingPayment, setIsSimulatingPayment] = useState(false);

  if (!isOpen || !mounted || !customer) return null;

  const isFreeStandard = subtotalCents >= 150000;
  const shippingCost = shippingMethodId === 'express' ? 28000 : isFreeStandard ? 0 : 15000;
  const totalCents = Math.max(0, subtotalCents - discountCents) + shippingCost;
  const payflex = calculatePayflexInstalments(totalCents);

  const handleApplyCheckoutCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkoutCouponCode.trim()) return;
    const ok = await applyCoupon(checkoutCouponCode.trim());
    if (ok) {
      setCheckoutCouponCode('');
    }
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const order = await api.createOrder({
        items: items.map((i) => ({
          productId: i.productId,
          variantId: i.variantId,
          quantity: i.quantity,
        })),
        shippingAddress,
        shippingMethodId,
        paymentMethod,
        discountCode: appliedCoupon?.code,
        sessionId: `session_${Date.now()}`,
        customerId: customer?.id,
      });

      // Initiate payment attempt with backend
      await api.initiatePayment(order.reference, paymentMethod);

      // Present payment simulation / sandbox gateway to user
      setPendingOrder(order);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to place order. Please check stock or details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSimulatePaymentOutcome = async (outcome: 'SUCCESS' | 'FAIL' | 'CANCEL') => {
    if (!pendingOrder) return;
    setIsSimulatingPayment(true);

    try {
      const updatedOrder = await api.simulatePaymentWebhook(
        pendingOrder.reference,
        outcome,
        paymentMethod
      );

      if (outcome === 'SUCCESS') {
        clearCart();
        onClose();
        onOrderComplete(updatedOrder);
      } else {
        setPendingOrder(updatedOrder);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Payment simulation error');
    } finally {
      setIsSimulatingPayment(false);
    }
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="checkout-dialog-title"
      className="fixed inset-0 z-[9999] bg-neutral-950/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-hidden"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative bg-white rounded-2xl sm:rounded-3xl max-w-xl md:max-w-2xl w-full max-h-[88vh] shadow-2xl border border-neutral-200/90 flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
      >
        {/* Pinned Sticky Header - ALWAYS VISIBLE with High-Contrast X Button */}
        <div className="sticky top-0 z-30 px-5 sm:px-6 py-3.5 border-b border-neutral-200 flex items-center justify-between bg-white shrink-0 shadow-xs">
          <div className="flex items-center gap-3 min-w-0">
            <div className="rounded-lg bg-neutral-950 p-1 border border-neutral-800 shadow-xs shrink-0">
              <img
                src="/assets/aistudio/Generated_Image_October_29__2026_-_8_40PM_f8f1a10b.png"
                alt="MEVO TECH"
                className="w-7 h-7 object-cover rounded"
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-black text-sm text-neutral-900 tracking-tight">MEVO TECH</span>
                <span className="text-neutral-300">|</span>
                <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <Lock className="w-3 h-3 text-emerald-600" />
                  <span>Secure Checkout</span>
                </span>
              </div>
              <p className="text-[10px] text-neutral-500 font-medium truncate">
                Encrypted ZAR Gateway · Sandton Central Dispatch
              </p>
            </div>
          </div>

          {/* Prominent High-Contrast Close Button */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Exit checkout"
            title="Close checkout dialog"
            className="w-9 h-9 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-700 hover:text-neutral-950 flex items-center justify-center transition-colors cursor-pointer shadow-xs shrink-0 ml-2"
          >
            <X className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        {/* Modal Scrollable Content */}
        {pendingOrder ? (
          /* Payment Gateway Sandbox / Verification Screen */
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
            <div className="text-center max-w-md mx-auto pt-2">
              <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-2.5">
                <CreditCard className="w-6 h-6" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-neutral-900">
                Payment Verification for {pendingOrder.reference}
              </h3>
              <p className="text-xs text-neutral-600 mt-1">
                Total Amount: <strong className="font-mono text-neutral-900">{formatZAR(pendingOrder.totalCents)}</strong> via{' '}
                <strong className="capitalize text-orange-600">{pendingOrder.paymentMethod}</strong>
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-left text-xs text-amber-800 mt-3">
                <p className="font-semibold flex items-center gap-1.5 mb-1">
                  <span>ℹ</span> Authoritative Stock Reservation Active
                </p>
                <p className="text-[11px] leading-relaxed">
                  Your hardware is reserved for 15 minutes. Stock will be permanently decremented once the payment webhook verifies receipt in South African Rand.
                </p>
              </div>
            </div>

            {/* Current Order Status */}
            <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-3.5 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-neutral-500">Gateway Status:</span>
                <span className="font-bold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded">
                  {pendingOrder.status}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Customer:</span>
                <span className="font-medium text-neutral-800">{pendingOrder.customerName} ({pendingOrder.customerEmail})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Destination:</span>
                <span className="font-medium text-neutral-800">
                  {pendingOrder.shippingAddress.suburb}, {pendingOrder.shippingAddress.province}
                </span>
              </div>
            </div>

            {/* Sandbox Simulation Triggers */}
            <div className="border-t border-neutral-200 pt-4 space-y-2.5">
              <p className="text-xs font-bold text-neutral-700 uppercase tracking-wider text-center">
                Sandbox Gateway Verification:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  disabled={isSimulatingPayment}
                  onClick={() => handleSimulatePaymentOutcome('SUCCESS')}
                  className="py-2.5 px-3 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Approve Payment</span>
                </button>

                <button
                  type="button"
                  disabled={isSimulatingPayment}
                  onClick={() => handleSimulatePaymentOutcome('FAIL')}
                  className="py-2.5 px-3 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 transition-colors flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <AlertCircle className="w-4 h-4" />
                  <span>Simulate Failure</span>
                </button>

                <button
                  type="button"
                  disabled={isSimulatingPayment}
                  onClick={() => handleSimulatePaymentOutcome('CANCEL')}
                  className="py-2.5 px-3 bg-neutral-200 text-neutral-700 rounded-xl text-xs font-bold hover:bg-neutral-300 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>Cancel Payment</span>
                </button>
              </div>

              {pendingOrder.status === 'PAYMENT_FAILED' && (
                <p className="text-xs text-rose-600 text-center font-medium">
                  Payment attempt failed. You can re-try approval or choose another method.
                </p>
              )}
            </div>
          </div>
        ) : (
          /* Multi-step Checkout Form Inside Scrollable Body */
          <form id="checkout-form" onSubmit={handlePlaceOrder} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Section 1: Customer & Delivery Details */}
            <div>
              <h3 className="text-xs font-bold text-neutral-800 uppercase tracking-wider mb-2.5 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-neutral-900 text-white text-[10px] font-black flex items-center justify-center">1</span>
                <span>Delivery Destination (South Africa)</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                <div>
                  <label className="block text-neutral-600 font-semibold mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={shippingAddress.fullName}
                    onChange={(e) => setShippingAddress({ ...shippingAddress, fullName: e.target.value })}
                    className="w-full px-3 py-1.5 border border-neutral-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-orange-600 text-neutral-900"
                  />
                </div>

                <div>
                  <label className="block text-neutral-600 font-semibold mb-1">Mobile Phone (For Courier SMS)</label>
                  <input
                    type="tel"
                    required
                    placeholder="+27 82 123 4567"
                    value={shippingAddress.phone}
                    onChange={(e) => setShippingAddress({ ...shippingAddress, phone: e.target.value })}
                    className="w-full px-3 py-1.5 border border-neutral-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-orange-600 font-mono text-neutral-900"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-neutral-600 font-semibold mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={shippingAddress.email}
                    onChange={(e) => setShippingAddress({ ...shippingAddress, email: e.target.value })}
                    className="w-full px-3 py-1.5 border border-neutral-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-orange-600 text-neutral-900"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-neutral-600 font-semibold mb-1">Street Address</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 14 Rivonia Road, Sandhurst"
                    value={shippingAddress.streetAddress}
                    onChange={(e) => setShippingAddress({ ...shippingAddress, streetAddress: e.target.value })}
                    className="w-full px-3 py-1.5 border border-neutral-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-orange-600 text-neutral-900"
                  />
                </div>

                <div>
                  <label className="block text-neutral-600 font-semibold mb-1">Suburb / District</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sandton"
                    value={shippingAddress.suburb}
                    onChange={(e) => setShippingAddress({ ...shippingAddress, suburb: e.target.value })}
                    className="w-full px-3 py-1.5 border border-neutral-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-orange-600 text-neutral-900"
                  />
                </div>

                <div>
                  <label className="block text-neutral-600 font-semibold mb-1">City</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Johannesburg"
                    value={shippingAddress.city}
                    onChange={(e) => setShippingAddress({ ...shippingAddress, city: e.target.value })}
                    className="w-full px-3 py-1.5 border border-neutral-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-orange-600 text-neutral-900"
                  />
                </div>

                <div>
                  <label className="block text-neutral-600 font-semibold mb-1">Province</label>
                  <select
                    value={shippingAddress.province}
                    onChange={(e) => setShippingAddress({ ...shippingAddress, province: e.target.value })}
                    className="w-full px-3 py-1.5 border border-neutral-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-orange-600 bg-white text-neutral-900 text-xs"
                  >
                    {SA_PROVINCES.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-neutral-600 font-semibold mb-1">Postal Code</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 2196"
                    value={shippingAddress.postalCode}
                    onChange={(e) => setShippingAddress({ ...shippingAddress, postalCode: e.target.value })}
                    className="w-full px-3 py-1.5 border border-neutral-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-orange-600 font-mono text-neutral-900"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Courier Method */}
            <div className="border-t border-neutral-200 pt-4">
              <h3 className="text-xs font-bold text-neutral-800 uppercase tracking-wider mb-2.5 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-neutral-900 text-white text-[10px] font-black flex items-center justify-center">2</span>
                <span>Select Courier Service</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                <label
                  className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-2.5 ${
                    shippingMethodId === 'standard'
                      ? 'border-orange-600 bg-orange-50/60 ring-1 ring-orange-600'
                      : 'border-neutral-200 hover:border-neutral-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="shipping"
                    value="standard"
                    checked={shippingMethodId === 'standard'}
                    onChange={() => setShippingMethodId('standard')}
                    className="mt-0.5 text-orange-600"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-neutral-900">Standard Door Courier</span>
                      <span className="font-mono font-bold text-neutral-900 ml-1">
                        {isFreeStandard ? 'FREE' : formatZAR(15000)}
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-500 mt-0.5">
                      The Courier Guy (2-4 business days). {isFreeStandard && 'Unlocked free over R1,500.'}
                    </p>
                  </div>
                </label>

                <label
                  className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-2.5 ${
                    shippingMethodId === 'express'
                      ? 'border-orange-600 bg-orange-50/60 ring-1 ring-orange-600'
                      : 'border-neutral-200 hover:border-neutral-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="shipping"
                    value="express"
                    checked={shippingMethodId === 'express'}
                    onChange={() => setShippingMethodId('express')}
                    className="mt-0.5 text-orange-600"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-neutral-900">Express Priority Air</span>
                      <span className="font-mono font-bold text-neutral-900 ml-1">{formatZAR(28000)}</span>
                    </div>
                    <p className="text-[11px] text-neutral-500 mt-0.5">
                      Next business day priority air freight across South Africa.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Section 3: Payment Method Selector */}
            <div className="border-t border-neutral-200 pt-4">
              <h3 className="text-xs font-bold text-neutral-800 uppercase tracking-wider mb-2.5 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-neutral-900 text-white text-[10px] font-black flex items-center justify-center">3</span>
                <span>South African Payment Gateway</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {/* PayFast */}
                <label
                  className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-start gap-2.5 ${
                    paymentMethod === 'payfast'
                      ? 'border-orange-600 bg-orange-50/50 ring-1 ring-orange-600'
                      : 'border-neutral-200 hover:border-neutral-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="payment"
                    value="payfast"
                    checked={paymentMethod === 'payfast'}
                    onChange={() => setPaymentMethod('payfast')}
                    className="mt-0.5 text-orange-600"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-neutral-900">PayFast</span>
                      <span className="text-[10px] text-orange-700 bg-orange-100 px-1.5 py-0.5 rounded font-medium">Cards &amp; EFT</span>
                    </div>
                    <p className="text-[10px] text-neutral-500 mt-0.5">
                      Cards, Instant EFT, Masterpass with 3D-Secure.
                    </p>
                  </div>
                </label>

                {/* Paystack */}
                <label
                  className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-start gap-2.5 ${
                    paymentMethod === 'paystack'
                      ? 'border-orange-600 bg-orange-50/50 ring-1 ring-orange-600'
                      : 'border-neutral-200 hover:border-neutral-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="payment"
                    value="paystack"
                    checked={paymentMethod === 'paystack'}
                    onChange={() => setPaymentMethod('paystack')}
                    className="mt-0.5 text-orange-600"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-neutral-900">Paystack</span>
                      <span className="text-[10px] text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded font-medium">Fast Card</span>
                    </div>
                    <p className="text-[10px] text-neutral-500 mt-0.5">
                      Visa, Mastercard &amp; Apple Pay in South African Rand.
                    </p>
                  </div>
                </label>

                {/* Payflex BNPL */}
                <label
                  className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-start gap-2.5 ${
                    paymentMethod === 'payflex'
                      ? 'border-orange-600 bg-orange-50/50 ring-1 ring-orange-600'
                      : 'border-neutral-200 hover:border-neutral-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="payment"
                    value="payflex"
                    checked={paymentMethod === 'payflex'}
                    onChange={() => setPaymentMethod('payflex')}
                    className="mt-0.5 text-orange-600"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-neutral-900">Payflex 4x</span>
                      <span className="text-[10px] font-mono font-bold text-orange-700">
                        {formatZAR(payflex.instalmentCents)} / 2w
                      </span>
                    </div>
                    <p className="text-[10px] text-neutral-500 mt-0.5">
                      Pay 25% today, 3 equal fortnightly instalments. 0% interest.
                    </p>
                  </div>
                </label>

                {/* Ozow Instant EFT */}
                <label
                  className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-start gap-2.5 ${
                    paymentMethod === 'ozow'
                      ? 'border-orange-600 bg-orange-50/50 ring-1 ring-orange-600'
                      : 'border-neutral-200 hover:border-neutral-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="payment"
                    value="ozow"
                    checked={paymentMethod === 'ozow'}
                    onChange={() => setPaymentMethod('ozow')}
                    className="mt-0.5 text-orange-600"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-neutral-900">Ozow Instant EFT</span>
                      <span className="text-[10px] text-neutral-500">All SA Banks</span>
                    </div>
                    <p className="text-[10px] text-neutral-500 mt-0.5">
                      Direct secure bank transfer with ABSA, Capitec, FNB, etc.
                    </p>
                  </div>
                </label>

                {/* Cryptocurrency */}
                <label
                  className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-start gap-2.5 sm:col-span-2 ${
                    paymentMethod === 'crypto'
                      ? 'border-orange-600 bg-orange-50/50 ring-1 ring-orange-600'
                      : 'border-neutral-200 hover:border-neutral-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="payment"
                    value="crypto"
                    checked={paymentMethod === 'crypto'}
                    onChange={() => setPaymentMethod('crypto')}
                    className="mt-0.5 text-orange-600"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-neutral-900">Cryptocurrency (USDT / BTC)</span>
                      <span className="text-[10px] text-neutral-400">Polygon / Bitcoin</span>
                    </div>
                    <p className="text-[10px] text-neutral-500 mt-0.5">
                      Locked exchange rate for 30 minutes with multi-confirmation tracking.
                    </p>
                  </div>
                </label>
              </div>

              {/* Accepted Gateway Badges from reference image */}
              <div className="mt-3 pt-3 border-t border-neutral-100">
                <PaymentGatewaysRow showTitle={true} titleClassName="text-[11px] font-bold text-neutral-700 uppercase tracking-wider mb-2 block" />
              </div>
            </div>

            {/* 4. Promotional Coupon / Discount Code Box */}
            <div className="bg-neutral-50 rounded-xl p-3 sm:p-4 border border-neutral-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-neutral-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Tag className="w-4 h-4 text-orange-600" />
                  <span>Promo Code or Coupon</span>
                </span>
                {appliedCoupon && (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
                    Active Discount
                  </span>
                )}
              </div>

              {appliedCoupon ? (
                <div className="flex items-center justify-between bg-emerald-50 text-emerald-850 p-2.5 rounded-lg border border-emerald-200 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div className="min-w-0 truncate">
                      <span className="font-mono font-bold text-emerald-900">{appliedCoupon.code}</span>
                      <span className="text-[11px] text-emerald-700 block truncate">
                        {appliedCoupon.description}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 shrink-0 ml-2">
                    <span className="font-mono font-black text-emerald-800">
                      -{formatZAR(discountCents)}
                    </span>
                    <button
                      type="button"
                      onClick={removeCoupon}
                      className="text-emerald-700 hover:text-rose-600 font-bold underline cursor-pointer text-xs"
                      title="Remove applied coupon"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter coupon code (e.g. MEVO150)"
                    value={checkoutCouponCode}
                    onChange={(e) => setCheckoutCouponCode(e.target.value.toUpperCase())}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleApplyCheckoutCoupon(e);
                      }
                    }}
                    className="flex-1 px-3 py-2 text-xs border border-neutral-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-orange-600 uppercase font-mono tracking-wider bg-white"
                  />
                  <button
                    type="button"
                    onClick={handleApplyCheckoutCoupon}
                    disabled={isApplyingCoupon || !checkoutCouponCode.trim()}
                    className="px-4 py-2 text-xs font-bold bg-neutral-900 hover:bg-orange-600 text-white rounded-lg transition-colors disabled:opacity-40 cursor-pointer shrink-0"
                  >
                    {isApplyingCoupon ? 'Applying...' : 'Apply Code'}
                  </button>
                </div>
              )}

              {couponError && (
                <p className="text-[11px] text-rose-600 mt-2 font-medium flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{couponError}</span>
                </p>
              )}

              {/* Active Promotional Campaigns Pill Shortcuts */}
              {activeCampaigns.length > 0 && (
                <div className="mt-2.5 pt-2 border-t border-neutral-200/80">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
                      Active Promotional Campaigns:
                    </span>
                    <span className="text-[10px] text-orange-600 font-medium">Click to apply</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {activeCampaigns.map((camp) => {
                      const isSelected = appliedCoupon?.code === camp.code;
                      return (
                        <button
                          key={camp.code}
                          type="button"
                          onClick={() => {
                            setCheckoutCouponCode(camp.code);
                            applyCoupon(camp.code);
                          }}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer border flex items-center gap-1 ${
                            isSelected
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                              : 'bg-white text-orange-700 border-orange-200 hover:bg-orange-50 hover:border-orange-300'
                          }`}
                          title={camp.description}
                        >
                          <span className="font-mono">{camp.code}</span>
                          <span className={`text-[10px] ${isSelected ? 'text-emerald-100' : 'text-neutral-500 font-normal'}`}>
                            ({camp.type === 'PERCENTAGE' ? `${camp.value}% OFF` : `-${formatZAR(camp.value)}`})
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Order Summary Snapshot */}
            <div className="bg-neutral-50 rounded-xl p-3 border border-neutral-200 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-neutral-500">Subtotal ({items.length} items)</span>
                <span className="font-mono font-semibold text-neutral-900">{formatZAR(subtotalCents)}</span>
              </div>
              {discountCents > 0 && (
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span className="flex items-center gap-1">
                    <Tag className="w-3 h-3" />
                    <span>Promotional Discount ({appliedCoupon?.code})</span>
                  </span>
                  <span className="font-mono tabular-nums">-{formatZAR(discountCents)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-neutral-500">Courier Shipping</span>
                <span className="font-mono font-semibold text-neutral-900">
                  {shippingCost === 0 ? 'FREE' : formatZAR(shippingCost)}
                </span>
              </div>
              <div className="flex justify-between text-[11px] text-neutral-400">
                <span>Includes 15% South African VAT</span>
                <span className="font-mono">{formatZAR(Math.round((Math.max(0, subtotalCents - discountCents) * 15) / 115))}</span>
              </div>
              <div className="flex justify-between text-xs font-bold text-neutral-900 pt-1 border-t border-neutral-200">
                <span>Grand Total</span>
                <span className="font-mono text-orange-700">{formatZAR(totalCents)}</span>
              </div>
            </div>
          </form>
        )}

        {/* Pinned Sticky Footer - ALWAYS VISIBLE with Cancel & Pay buttons */}
        {!pendingOrder && (
          <div className="sticky bottom-0 z-30 px-5 sm:px-6 py-3 bg-neutral-50/95 backdrop-blur-sm border-t border-neutral-200 flex items-center justify-between gap-3 shrink-0">
            <div>
              <span className="text-[10px] text-neutral-500 block uppercase font-bold tracking-wider">Total (ZAR)</span>
              <span className="text-base sm:text-lg font-black font-mono text-neutral-900">
                {formatZAR(totalCents)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="py-2.5 px-4 rounded-xl border border-neutral-300 hover:bg-neutral-100 text-neutral-700 text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel &amp; Exit
              </button>

              <button
                type="submit"
                form="checkout-form"
                disabled={isSubmitting || items.length === 0}
                className="py-2.5 px-5 rounded-xl bg-neutral-950 hover:bg-orange-600 disabled:opacity-50 text-white text-xs font-bold uppercase tracking-wider transition-all shadow-md cursor-pointer flex items-center gap-1.5"
              >
                {isSubmitting ? (
                  <span>Processing...</span>
                ) : (
                  <>
                    <span>Confirm &amp; Pay</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
