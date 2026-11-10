import React, { useState, useEffect } from 'react';
import {
  Bell,
  CheckCircle,
  AlertCircle,
  X,
  TrendingDown,
  Sparkles,
  ShieldCheck,
  Mail,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { Product, PriceAlertTargetType } from '../types';
import { formatZAR } from '../utils/calculations';
import {
  calculateTargetPriceCents,
  validatePriceAlertEmail,
  calculatePriceDropMetrics,
} from '../utils/priceAlerts';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface PriceDropAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product;
}

export const PriceDropAlertModal: React.FC<PriceDropAlertModalProps> = ({
  isOpen,
  onClose,
  product,
}) => {
  const { customer, currentUser } = useAuth();
  const currentPriceCents = product.promotionalPriceCents ?? product.priceCents;

  const [email, setEmail] = useState('');
  const [targetType, setTargetType] = useState<PriceAlertTargetType>('any');
  const [customPriceInput, setCustomPriceInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState<string | null>(null);

  // Initialize or reset email on open
  useEffect(() => {
    if (isOpen) {
      const defaultEmail = customer?.email || (currentUser?.email !== 'guest' ? currentUser?.email : '') || '';
      setEmail(defaultEmail);
      setError(null);
      setSuccessMessage(null);
      setSimulationResult(null);
      setTargetType('any');
      // Set reasonable default custom price (approx 15% off)
      const defaultCustomZar = Math.round((currentPriceCents * 0.85) / 100);
      setCustomPriceInput(defaultCustomZar.toString());
    }
  }, [isOpen, customer, currentUser, currentPriceCents]);

  if (!isOpen) return null;

  // Convert custom input into cents safely
  const customPriceCents = Math.round((parseFloat(customPriceInput) || 0) * 100);

  // Compute calculated target price
  const computedTargetPriceCents = calculateTargetPriceCents(
    currentPriceCents,
    targetType,
    customPriceCents
  );

  const metrics = calculatePriceDropMetrics(currentPriceCents, computedTargetPriceCents);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();
    if (!validatePriceAlertEmail(trimmedEmail)) {
      setError('Please enter a valid email address (e.g. name@example.com)');
      return;
    }

    if (targetType === 'custom') {
      if (customPriceCents <= 0) {
        setError('Please enter a custom target price greater than R 0.00');
        return;
      }
      if (customPriceCents >= currentPriceCents) {
        setError(`Custom target must be lower than current price (${formatZAR(currentPriceCents)})`);
        return;
      }
    }

    setIsLoading(true);

    try {
      const res = await api.createPriceAlert({
        productId: product.id,
        email: trimmedEmail,
        targetType,
        customTargetPriceCents: targetType === 'custom' ? customPriceCents : undefined,
        customerId: customer?.id,
      });

      setSuccessMessage(res.message || 'Price drop alert created successfully!');
    } catch (err: any) {
      setError(err.message || 'Failed to set up price drop alert. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSimulateDrop = async () => {
    setIsSimulating(true);
    setSimulationResult(null);
    try {
      // Simulate drop to 5% below the target price to guarantee trigger
      const simulatedDropPrice = Math.round(computedTargetPriceCents * 0.95);
      const res = await api.simulatePriceDrop(product.id, simulatedDropPrice);
      setSimulationResult(
        `Simulation success: Price lowered to ${formatZAR(simulatedDropPrice)}. ${res.triggeredAlerts.length} alert(s) automatically triggered and dispatched to ${email.trim()}!`
      );
    } catch (err: any) {
      setSimulationResult(`Simulation note: ${err.message}`);
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-neutral-100 overflow-hidden flex flex-col max-h-[90vh]"
        role="dialog"
        aria-labelledby="price-drop-modal-title"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-600 via-orange-500 to-amber-500 px-6 py-5 text-white flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center border border-white/30 shrink-0 shadow-inner">
              <TrendingDown className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-white/20 text-white border border-white/30">
                  Instant Tracker
                </span>
              </div>
              <h3 id="price-drop-modal-title" className="text-lg font-bold text-white mt-1 leading-tight">
                Notify Me When Price Drops
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/20 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Product Snapshot */}
          <div className="flex items-center gap-3.5 p-3 rounded-xl bg-neutral-50 border border-neutral-200/80">
            <img
              src={product.images[0] || 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=150'}
              alt={product.name}
              className="w-16 h-16 rounded-lg object-cover border border-neutral-200 shrink-0 bg-white"
            />
            <div className="min-w-0 flex-1">
              <span className="text-[11px] font-semibold text-orange-600 uppercase tracking-wider">
                {product.brand}
              </span>
              <h4 className="text-sm font-bold text-neutral-900 truncate">{product.name}</h4>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-sm font-bold font-mono text-neutral-900">
                  {formatZAR(currentPriceCents)}
                </span>
                {product.promotionalPriceCents && product.promotionalPriceCents < product.priceCents && (
                  <span className="text-xs text-neutral-400 line-through font-mono">
                    {formatZAR(product.priceCents)}
                  </span>
                )}
                <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-medium border border-emerald-200">
                  Current Price
                </span>
              </div>
            </div>
          </div>

          {/* Success View */}
          {successMessage ? (
            <div className="space-y-4 py-2">
              <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-emerald-950">Price Drop Alert Active!</h4>
                  <p className="text-sm text-emerald-800 mt-1 max-w-sm mx-auto">
                    We will automatically email <strong className="font-semibold">{email}</strong> the second{' '}
                    <strong className="font-semibold">{product.name}</strong> drops to{' '}
                    <strong className="font-mono">{formatZAR(computedTargetPriceCents)}</strong> or lower.
                  </p>
                </div>
                <div className="pt-2 text-xs text-emerald-700 font-mono bg-white/70 py-2 px-3 rounded-lg border border-emerald-200">
                  Trigger threshold: {formatZAR(computedTargetPriceCents)} (Saves at least{' '}
                  {formatZAR(metrics.dropCents || 100)})
                </div>
              </div>

              {/* Simulation Sandbox Box */}
              <div className="p-4 rounded-xl bg-neutral-50 border border-dashed border-neutral-300 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-700">
                    <Sparkles className="w-4 h-4 text-orange-600" />
                    <span>Instant Alert Verification</span>
                  </div>
                  <span className="text-[10px] bg-neutral-200 text-neutral-700 px-1.5 py-0.5 rounded font-mono">
                    Test Mode
                  </span>
                </div>
                <p className="text-xs text-neutral-500">
                  Want to verify automated alert dispatching immediately? Simulate an instant price drop for this product.
                </p>
                <button
                  type="button"
                  onClick={handleSimulateDrop}
                  disabled={isSimulating}
                  className="w-full mt-1 inline-flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold text-neutral-700 bg-white border border-neutral-300 hover:border-orange-500 hover:text-orange-600 rounded-lg shadow-2xs transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSimulating ? 'animate-spin text-orange-600' : ''}`} />
                  {isSimulating ? 'Simulating drop...' : 'Simulate Price Drop & Trigger Email'}
                </button>
                {simulationResult && (
                  <p className="text-xs text-neutral-700 font-mono bg-white p-2 rounded border border-neutral-200">
                    {simulationResult}
                  </p>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setSuccessMessage(null);
                    setSimulationResult(null);
                  }}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-neutral-300 text-neutral-700 font-semibold text-sm hover:bg-neutral-50 transition-colors"
                >
                  Edit Alert Settings
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-orange-600 text-white font-semibold text-sm hover:bg-orange-700 shadow-sm transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Error Message */}
              {error && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2 animate-shake">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Email Address Input */}
              <div className="space-y-1.5">
                <label htmlFor="price-alert-email" className="block text-xs font-bold uppercase tracking-wider text-neutral-700">
                  Your Email Address <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id="price-alert-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email (e.g. name@mevo.co.za)"
                    required
                    className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-neutral-50 border border-neutral-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors text-neutral-900 font-medium placeholder:text-neutral-400"
                  />
                </div>
                <p className="text-[11px] text-neutral-500 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Zero spam. Strictly used for price drop notification on this item.
                </p>
              </div>

              {/* Alert Threshold Options */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700">
                  Notify Me When:
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {/* Any Drop */}
                  <label
                    className={`cursor-pointer flex flex-col p-3 rounded-xl border text-left transition-all ${
                      targetType === 'any'
                        ? 'border-orange-600 bg-orange-50/60 ring-2 ring-orange-500/20'
                        : 'border-neutral-200 hover:border-neutral-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-neutral-900">Any Price Decrease</span>
                      <input
                        type="radio"
                        name="targetType"
                        value="any"
                        checked={targetType === 'any'}
                        onChange={() => setTargetType('any')}
                        className="text-orange-600 focus:ring-orange-500"
                      />
                    </div>
                    <span className="text-[11px] text-neutral-500 mt-1">
                      Alert immediately on any drop
                    </span>
                    <span className="text-xs font-mono font-semibold text-orange-600 mt-2">
                      ≤ {formatZAR(currentPriceCents - 100)}
                    </span>
                  </label>

                  {/* 10% Drop */}
                  <label
                    className={`cursor-pointer flex flex-col p-3 rounded-xl border text-left transition-all ${
                      targetType === '10_percent'
                        ? 'border-orange-600 bg-orange-50/60 ring-2 ring-orange-500/20'
                        : 'border-neutral-200 hover:border-neutral-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-neutral-900">10% Drop or More</span>
                      <input
                        type="radio"
                        name="targetType"
                        value="10_percent"
                        checked={targetType === '10_percent'}
                        onChange={() => setTargetType('10_percent')}
                        className="text-orange-600 focus:ring-orange-500"
                      />
                    </div>
                    <span className="text-[11px] text-neutral-500 mt-1">
                      Save {formatZAR(Math.round(currentPriceCents * 0.1))}
                    </span>
                    <span className="text-xs font-mono font-semibold text-orange-600 mt-2">
                      ≤ {formatZAR(Math.round(currentPriceCents * 0.9))}
                    </span>
                  </label>

                  {/* 20% Drop */}
                  <label
                    className={`cursor-pointer flex flex-col p-3 rounded-xl border text-left transition-all ${
                      targetType === '20_percent'
                        ? 'border-orange-600 bg-orange-50/60 ring-2 ring-orange-500/20'
                        : 'border-neutral-200 hover:border-neutral-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-neutral-900">20% Super Drop</span>
                      <input
                        type="radio"
                        name="targetType"
                        value="20_percent"
                        checked={targetType === '20_percent'}
                        onChange={() => setTargetType('20_percent')}
                        className="text-orange-600 focus:ring-orange-500"
                      />
                    </div>
                    <span className="text-[11px] text-neutral-500 mt-1">
                      Save {formatZAR(Math.round(currentPriceCents * 0.2))}
                    </span>
                    <span className="text-xs font-mono font-semibold text-orange-600 mt-2">
                      ≤ {formatZAR(Math.round(currentPriceCents * 0.8))}
                    </span>
                  </label>

                  {/* Custom Target Price */}
                  <label
                    className={`cursor-pointer flex flex-col p-3 rounded-xl border text-left transition-all ${
                      targetType === 'custom'
                        ? 'border-orange-600 bg-orange-50/60 ring-2 ring-orange-500/20'
                        : 'border-neutral-200 hover:border-neutral-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-neutral-900">Custom Target (ZAR)</span>
                      <input
                        type="radio"
                        name="targetType"
                        value="custom"
                        checked={targetType === 'custom'}
                        onChange={() => setTargetType('custom')}
                        className="text-orange-600 focus:ring-orange-500"
                      />
                    </div>
                    <span className="text-[11px] text-neutral-500 mt-1">
                      Set your exact desired price
                    </span>
                    <span className="text-xs font-mono font-semibold text-orange-600 mt-2">
                      {customPriceCents > 0 ? `≤ ${formatZAR(customPriceCents)}` : 'Enter amount below'}
                    </span>
                  </label>
                </div>

                {/* Custom Price Input if selected */}
                {targetType === 'custom' && (
                  <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 space-y-1.5 animate-in fade-in duration-150">
                    <label htmlFor="custom-price-field" className="text-xs font-medium text-neutral-700 flex items-center justify-between">
                      <span>Target Price (Rand):</span>
                      <span className="text-[11px] text-neutral-400">
                        Current: {formatZAR(currentPriceCents)}
                      </span>
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-sm font-bold text-neutral-500 font-mono">
                        R
                      </span>
                      <input
                        id="custom-price-field"
                        type="number"
                        min="1"
                        step="1"
                        value={customPriceInput}
                        onChange={(e) => setCustomPriceInput(e.target.value)}
                        placeholder="e.g. 19999"
                        className="w-full pl-8 pr-3 py-2 text-sm font-mono font-bold bg-white border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-neutral-900"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Live Target Summary Card */}
              <div className="p-3.5 rounded-xl bg-orange-50/60 border border-orange-200/80 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-neutral-600 block">Alert Threshold:</span>
                  <span className="text-base font-bold font-mono text-orange-700">
                    {formatZAR(computedTargetPriceCents)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-neutral-600 block">Potential Savings:</span>
                  <span className="text-sm font-bold font-mono text-emerald-600">
                    {metrics.dropCents > 0 ? formatZAR(metrics.dropCents) : 'On any reduction'}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-neutral-300 text-neutral-700 font-semibold text-sm hover:bg-neutral-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 text-white font-semibold text-sm hover:from-orange-700 hover:to-amber-700 shadow-md shadow-orange-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Activating...</span>
                    </>
                  ) : (
                    <>
                      <Bell className="w-4 h-4" />
                      <span>Notify Me</span>
                      <ArrowRight className="w-4 h-4 ml-0.5" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
