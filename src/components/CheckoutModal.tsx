import React, { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Order, PaymentProvider, ShippingAddress } from '../types';
import { formatZAR, calculatePayflexInstalments } from '../utils/calculations';
import { ShieldCheck, Truck, CreditCard, Lock, CheckCircle2, ArrowRight, X, AlertCircle, User } from 'lucide-react';

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
  const { items, subtotalCents, clearCart } = useCart();
  const { customer, isCustomerLoggedIn, openAuthModal } = useAuth();

  const [shippingAddress, setShippingAddress] = useState<ShippingAddress>(() => ({
    fullName: customer?.defaultAddress?.fullName || customer?.name || 'Blacque Beat',
    email: customer?.defaultAddress?.email || customer?.email || 'blacquebeat@gmail.com',
    phone: customer?.defaultAddress?.phone || customer?.phone || '+27 83 456 7890',
    streetAddress: customer?.defaultAddress?.streetAddress || '14 Rivonia Road',
    suburb: customer?.defaultAddress?.suburb || 'Sandhurst',
    city: customer?.defaultAddress?.city || 'Johannesburg',
    province: customer?.defaultAddress?.province || 'Gauteng',
    postalCode: customer?.defaultAddress?.postalCode || '2196',
    deliveryNotes: customer?.defaultAddress?.deliveryNotes || 'Depot courier dispatch',
  }));

  useEffect(() => {
    if (customer) {
      setShippingAddress({
        fullName: customer.defaultAddress?.fullName || customer.name,
        email: customer.defaultAddress?.email || customer.email,
        phone: customer.defaultAddress?.phone || customer.phone,
        streetAddress: customer.defaultAddress?.streetAddress || '14 Rivonia Road',
        suburb: customer.defaultAddress?.suburb || 'Sandhurst',
        city: customer.defaultAddress?.city || 'Johannesburg',
        province: customer.defaultAddress?.province || 'Gauteng',
        postalCode: customer.defaultAddress?.postalCode || '2196',
        deliveryNotes: customer.defaultAddress?.deliveryNotes || '',
      });
    }
  }, [customer]);

  const [shippingMethodId, setShippingMethodId] = useState('standard');
  const [paymentMethod, setPaymentMethod] = useState<PaymentProvider>('payfast');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Active simulated payment flow state
  const [pendingOrder, setPendingOrder] = useState<Order | null>(null);
  const [isSimulatingPayment, setIsSimulatingPayment] = useState(false);

  if (!isOpen) return null;

  const isFreeStandard = subtotalCents >= 150000;
  const shippingCost = shippingMethodId === 'express' ? 28000 : isFreeStandard ? 0 : 15000;
  const totalCents = subtotalCents + shippingCost;
  const payflex = calculatePayflexInstalments(totalCents);

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

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-neutral-900/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-in fade-in">
      <div className="relative bg-white rounded-2xl max-w-3xl w-full shadow-2xl overflow-hidden border border-neutral-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-neutral-950 p-1 border border-neutral-800 shadow-xs shrink-0">
              <img
                src="/assets/aistudio/Generated_Image_October_29__2026_-_8_40PM_f8f1a10b.png"
                alt="MEVO TECH"
                className="w-12 h-8 object-cover rounded"
              />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <img
                  src="/assets/aistudio/mevo_wordmark_light.png"
                  alt="MEVO TECH"
                  className="h-6 w-auto object-contain"
                />
                <span className="text-neutral-300">|</span>
                <span className="text-xs font-bold text-neutral-800 flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5 text-emerald-600" />
                  Secure Checkout
                </span>
              </div>
              <p className="font-['Rajdhani',sans-serif] text-[10px] font-bold text-neutral-500 uppercase tracking-widest mt-0.5">
                Encrypted ZAR Gateway · Sandton Warehouse
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        {pendingOrder ? (
          /* Payment Gateway Sandbox / Verification Screen */
          <div className="p-6 md:p-8 space-y-6">
            <div className="text-center max-w-md mx-auto">
              <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <CreditCard className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-neutral-900">
                Payment Required for {pendingOrder.reference}
              </h3>
              <p className="text-xs text-neutral-600 mt-1">
                Total Amount: <strong className="font-mono text-neutral-900">{formatZAR(pendingOrder.totalCents)}</strong> via{' '}
                <strong className="capitalize text-purple-600">{pendingOrder.paymentMethod}</strong>
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-left text-xs text-amber-800 mt-4">
                <p className="font-semibold flex items-center gap-1.5 mb-1">
                  <span>ℹ</span> Authoritative Stock Reservation Active
                </p>
                <p className="text-[11px] leading-relaxed">
                  Your items are temporarily reserved for 15 minutes. Stock will be permanently decremented once the payment webhook verifies receipt in South African Rand.
                </p>
              </div>
            </div>

            {/* Current Order Status */}
            <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4 text-xs space-y-2">
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
            <div className="border-t border-neutral-200 pt-5 space-y-3">
              <p className="text-xs font-bold text-neutral-700 uppercase tracking-wider text-center">
                Sandbox Gateway Verification Options:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <button
                  disabled={isSimulatingPayment}
                  onClick={() => handleSimulatePaymentOutcome('SUCCESS')}
                  className="py-3 px-4 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Approve Payment (200 OK)</span>
                </button>

                <button
                  disabled={isSimulatingPayment}
                  onClick={() => handleSimulatePaymentOutcome('FAIL')}
                  className="py-3 px-4 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <AlertCircle className="w-4 h-4" />
                  <span>Simulate Failure</span>
                </button>

                <button
                  disabled={isSimulatingPayment}
                  onClick={() => handleSimulatePaymentOutcome('CANCEL')}
                  className="py-3 px-4 bg-neutral-200 text-neutral-700 rounded-xl text-xs font-bold hover:bg-neutral-300 transition-colors flex items-center justify-center gap-1.5"
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
          /* Multi-step Checkout Form */
          <form onSubmit={handlePlaceOrder} className="p-6 md:p-8 space-y-6">
            {errorMessage && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Section 1: Customer & Delivery Details */}
            <div>
              <h3 className="text-xs font-bold text-neutral-800 uppercase tracking-wider mb-3 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-neutral-900 text-white text-[11px] flex items-center justify-center">1</span>
                <span>Delivery Destination (South Africa)</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-neutral-600 font-medium mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={shippingAddress.fullName}
                    onChange={(e) => setShippingAddress({ ...shippingAddress, fullName: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-600"
                  />
                </div>

                <div>
                  <label className="block text-neutral-600 font-medium mb-1">Mobile Phone (For Courier SMS Updates)</label>
                  <input
                    type="tel"
                    required
                    placeholder="+27 82 123 4567"
                    value={shippingAddress.phone}
                    onChange={(e) => setShippingAddress({ ...shippingAddress, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-600 font-mono"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-neutral-600 font-medium mb-1">Email Address (For Invoicing & Tracking)</label>
                  <input
                    type="email"
                    required
                    value={shippingAddress.email}
                    onChange={(e) => setShippingAddress({ ...shippingAddress, email: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-600"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-neutral-600 font-medium mb-1">Street Address</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 14 Rivonia Road, Morningside"
                    value={shippingAddress.streetAddress}
                    onChange={(e) => setShippingAddress({ ...shippingAddress, streetAddress: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-600"
                  />
                </div>

                <div>
                  <label className="block text-neutral-600 font-medium mb-1">Suburb / District</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sandton"
                    value={shippingAddress.suburb}
                    onChange={(e) => setShippingAddress({ ...shippingAddress, suburb: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-600"
                  />
                </div>

                <div>
                  <label className="block text-neutral-600 font-medium mb-1">City</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Johannesburg"
                    value={shippingAddress.city}
                    onChange={(e) => setShippingAddress({ ...shippingAddress, city: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-600"
                  />
                </div>

                <div>
                  <label className="block text-neutral-600 font-medium mb-1">Province</label>
                  <select
                    value={shippingAddress.province}
                    onChange={(e) => setShippingAddress({ ...shippingAddress, province: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-600 bg-white"
                  >
                    {SA_PROVINCES.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-neutral-600 font-medium mb-1">Postal Code</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 2196"
                    value={shippingAddress.postalCode}
                    onChange={(e) => setShippingAddress({ ...shippingAddress, postalCode: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-600 font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Courier Method */}
            <div className="border-t border-neutral-200 pt-5">
              <h3 className="text-xs font-bold text-neutral-800 uppercase tracking-wider mb-3 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-neutral-900 text-white text-[11px] flex items-center justify-center">2</span>
                <span>Select Courier Service</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <label
                  className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                    shippingMethodId === 'standard'
                      ? 'border-purple-600 bg-purple-50/60 ring-1 ring-purple-600'
                      : 'border-neutral-200 hover:border-neutral-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="shipping"
                    value="standard"
                    checked={shippingMethodId === 'standard'}
                    onChange={() => setShippingMethodId('standard')}
                    className="mt-0.5 text-purple-600"
                  />
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-neutral-900">Standard Door Courier</span>
                      <span className="font-mono font-bold text-neutral-900">
                        {isFreeStandard ? 'FREE' : formatZAR(15000)}
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-500 mt-0.5">
                      The Courier Guy (2-4 business days nationwide). {isFreeStandard && 'Unlocked free over R1,500.'}
                    </p>
                  </div>
                </label>

                <label
                  className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                    shippingMethodId === 'express'
                      ? 'border-purple-600 bg-purple-50/60 ring-1 ring-purple-600'
                      : 'border-neutral-200 hover:border-neutral-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="shipping"
                    value="express"
                    checked={shippingMethodId === 'express'}
                    onChange={() => setShippingMethodId('express')}
                    className="mt-0.5 text-purple-600"
                  />
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-neutral-900">Express Priority Air</span>
                      <span className="font-mono font-bold text-neutral-900">{formatZAR(28000)}</span>
                    </div>
                    <p className="text-[11px] text-neutral-500 mt-0.5">
                      Next business day priority air freight to Johannesburg, Pretoria, Cape Town, and Durban.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Section 3: Payment Method Selector */}
            <div className="border-t border-neutral-200 pt-5">
              <h3 className="text-xs font-bold text-neutral-800 uppercase tracking-wider mb-3 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-neutral-900 text-white text-[11px] flex items-center justify-center">3</span>
                <span>South African Payment Gateway</span>
              </h3>

              <div className="space-y-2 text-xs">
                {/* PayFast */}
                <label
                  className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                    paymentMethod === 'payfast'
                      ? 'border-purple-600 bg-purple-50/50 ring-1 ring-purple-600'
                      : 'border-neutral-200 hover:border-neutral-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="payment"
                    value="payfast"
                    checked={paymentMethod === 'payfast'}
                    onChange={() => setPaymentMethod('payfast')}
                    className="mt-0.5 text-purple-600"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-neutral-900">PayFast Gateway</span>
                      <span className="text-[11px] text-neutral-400">Cards · Instant EFT · Masterpass</span>
                    </div>
                    <p className="text-[11px] text-neutral-500 mt-0.5">
                      Official South African checkout portal with secure 3D-Secure 2.0 authorization.
                    </p>
                  </div>
                </label>

                {/* Payflex BNPL */}
                <label
                  className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                    paymentMethod === 'payflex'
                      ? 'border-purple-600 bg-purple-50/50 ring-1 ring-purple-600'
                      : 'border-neutral-200 hover:border-neutral-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="payment"
                    value="payflex"
                    checked={paymentMethod === 'payflex'}
                    onChange={() => setPaymentMethod('payflex')}
                    className="mt-0.5 text-purple-600"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-neutral-900">Payflex 4x Interest-Free</span>
                      <span className="font-mono font-bold text-purple-600">{formatZAR(payflex.instalmentCents)} / fortnight</span>
                    </div>
                    <p className="text-[11px] text-neutral-500 mt-0.5">
                      Pay 25% today, remainder split across 3 equal fortnightly instalments. Zero interest or fees.
                    </p>
                  </div>
                </label>

                {/* Ozow Instant EFT */}
                <label
                  className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                    paymentMethod === 'ozow'
                      ? 'border-purple-600 bg-purple-50/50 ring-1 ring-purple-600'
                      : 'border-neutral-200 hover:border-neutral-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="payment"
                    value="ozow"
                    checked={paymentMethod === 'ozow'}
                    onChange={() => setPaymentMethod('ozow')}
                    className="mt-0.5 text-purple-600"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-neutral-900">Ozow Instant EFT</span>
                      <span className="text-[11px] text-neutral-400">All Major SA Banks</span>
                    </div>
                    <p className="text-[11px] text-neutral-500 mt-0.5">
                      Direct automated bank transfer with ABSA, Capitec, FNB, Nedbank, Standard Bank, Investec, TymeBank.
                    </p>
                  </div>
                </label>

                {/* Paystack */}
                <label
                  className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                    paymentMethod === 'paystack'
                      ? 'border-purple-600 bg-purple-50/50 ring-1 ring-purple-600'
                      : 'border-neutral-200 hover:border-neutral-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="payment"
                    value="paystack"
                    checked={paymentMethod === 'paystack'}
                    onChange={() => setPaymentMethod('paystack')}
                    className="mt-0.5 text-purple-600"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-neutral-900">Paystack (Visa / Mastercard / Apple Pay)</span>
                      <span className="text-[11px] text-neutral-400">Direct ZAR Settlement</span>
                    </div>
                    <p className="text-[11px] text-neutral-500 mt-0.5">
                      Instant card payment processing backed by Stripe security infrastructure.
                    </p>
                  </div>
                </label>

                {/* Cryptocurrency */}
                <label
                  className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                    paymentMethod === 'crypto'
                      ? 'border-purple-600 bg-purple-50/50 ring-1 ring-purple-600'
                      : 'border-neutral-200 hover:border-neutral-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="payment"
                    value="crypto"
                    checked={paymentMethod === 'crypto'}
                    onChange={() => setPaymentMethod('crypto')}
                    className="mt-0.5 text-purple-600"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-neutral-900">Cryptocurrency (USDT / BTC)</span>
                      <span className="text-[11px] text-neutral-400">Polygon / Bitcoin Network</span>
                    </div>
                    <p className="text-[11px] text-neutral-500 mt-0.5">
                      Locked exchange rate for 30 minutes. Safe on-chain invoice with multi-confirmation tracking.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Order Review & Submit */}
            <div className="border-t border-neutral-200 pt-5 space-y-4">
              <div className="bg-neutral-50 rounded-xl p-4 border border-neutral-200 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-neutral-600">Subtotal ({items.length} items)</span>
                  <span className="font-mono tabular-nums text-neutral-900">{formatZAR(subtotalCents)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-600">Courier Shipping</span>
                  <span className="font-mono tabular-nums text-neutral-900">
                    {shippingCost === 0 ? 'FREE' : formatZAR(shippingCost)}
                  </span>
                </div>
                <div className="flex justify-between text-sm font-extrabold text-neutral-900 pt-2 border-t border-neutral-200">
                  <span>Grand Total (ZAR)</span>
                  <span className="font-mono tabular-nums">{formatZAR(totalCents)}</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || items.length === 0}
                className="w-full py-3.5 px-4 bg-neutral-900 text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-purple-600 transition-colors shadow-lg flex items-center justify-center gap-2 disabled:opacity-40"
              >
                {isSubmitting ? (
                  <span>Reserving Stock & Connecting Gateway...</span>
                ) : (
                  <>
                    <span>Confirm Order & Proceed to Payment</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
