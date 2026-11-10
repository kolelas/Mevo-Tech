import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Sparkles,
  Flame,
  Clock,
  Check,
  ArrowRight,
  Gift,
  Copy,
  CheckCircle2,
  Tag,
  Zap,
  ShoppingBag,
  ShoppingCart,
  Eye,
} from 'lucide-react';
import { formatZAR } from '../utils/calculations';
import { Product } from '../types';
import { useCart } from '../context/CartContext';

interface MevoPromoModalProps {
  products: Product[];
  onSelectProduct: (product: Product) => void;
  onExploreDeals: () => void;
  onAddToCart?: (product: Product) => void;
}

const STORAGE_DISMISSED_KEY = 'mevo_promo_modal_dismissed_v1';
const STORAGE_COLLECTED_KEY = 'mevo_promo_vouchers_collected_v1';

export const MevoPromoModal: React.FC<MevoPromoModalProps> = ({
  products,
  onSelectProduct,
  onExploreDeals,
  onAddToCart,
}) => {
  const { addItem, itemCount } = useCart();
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isCollected, setIsCollected] = useState(false);
  const [dontShowToday, setDontShowToday] = useState(false);
  const [activeTab, setActiveTab] = useState<'vouchers' | 'deals'>('vouchers');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<{ [id: string]: boolean }>({});
  const [lastAddedName, setLastAddedName] = useState<string | null>(null);

  // Live Mevo Urgency Countdown (Starts at 09m 59s and ticks down)
  const [secondsRemaining, setSecondsRemaining] = useState(599); // 9 mins 59 secs

  useEffect(() => {
    setMounted(true);
    // Check if previously collected or dismissed today
    const wasCollected = localStorage.getItem(STORAGE_COLLECTED_KEY) === 'true';
    if (wasCollected) {
      setIsCollected(true);
    }

    const dismissedTimestamp = localStorage.getItem(STORAGE_DISMISSED_KEY);
    const isDismissedToday =
      dismissedTimestamp &&
      Date.now() - parseInt(dismissedTimestamp, 10) < 24 * 60 * 60 * 1000;

    // Pop up automatically after 1.2 seconds if not dismissed today
    if (!isDismissedToday) {
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  // Live countdown timer
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setSecondsRemaining((prev) => (prev > 0 ? prev - 1 : 599));
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  // Lock background scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      const orig = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = orig;
      };
    }
  }, [isOpen]);

  const handleClose = () => {
    if (dontShowToday) {
      localStorage.setItem(STORAGE_DISMISSED_KEY, Date.now().toString());
    }
    setIsOpen(false);
  };

  const handleCollectAll = () => {
    setIsCollected(true);
    localStorage.setItem(STORAGE_COLLECTED_KEY, 'true');
    // Copy the best starter voucher automatically
    navigator.clipboard?.writeText('MEVO150');
    setCopiedCode('MEVO150');
    setTimeout(() => setCopiedCode(null), 3000);
  };

  const handleIndividualCopy = (e: React.MouseEvent, code: string) => {
    e.stopPropagation();
    navigator.clipboard?.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const handleAddToCart = (e: React.MouseEvent, product: Product) => {
    e.stopPropagation(); // Critical: Stay inside the modal without triggering parent card click
    if (onAddToCart) {
      onAddToCart(product);
    } else {
      addItem(product);
    }
    setAddedIds((prev) => ({ ...prev, [product.id]: true }));
    setLastAddedName(product.name);

    setTimeout(() => {
      setAddedIds((prev) => ({ ...prev, [product.id]: false }));
    }, 2200);

    setTimeout(() => {
      setLastAddedName((curr) => (curr === product.name ? null : curr));
    }, 3500);
  };

  const handleViewDetails = (e: React.MouseEvent, product: Product) => {
    e.stopPropagation();
    onSelectProduct(product);
    handleClose();
  };

  const handleAddAllDeals = (e: React.MouseEvent) => {
    e.stopPropagation();
    hotDeals.forEach((deal) => {
      if (onAddToCart) {
        onAddToCart(deal);
      } else {
        addItem(deal);
      }
      setAddedIds((prev) => ({ ...prev, [deal.id]: true }));
    });
    setLastAddedName('All 3 Flash Deal Items');

    setTimeout(() => {
      setAddedIds({});
    }, 2200);

    setTimeout(() => {
      setLastAddedName(null);
    }, 3500);
  };

  const formatTimer = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Top 3 hot hardware deals for the flash deal showcase
  const hotDeals = products.slice(0, 3);

  return (
    <>
      {/* 1. PERSISTENT FLOATING MEVO GIFT TRIGGER WIDGET */}
      {!isOpen && (
        <div className="fixed bottom-5 left-5 z-40 animate-bounce duration-1000">
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="group relative flex items-center gap-2 p-2 sm:px-3 sm:py-2.5 bg-gradient-to-r from-red-600 via-orange-600 to-amber-500 hover:from-red-500 hover:to-orange-500 text-white rounded-full shadow-2xl hover:shadow-orange-500/40 border-2 border-amber-300 transition-all duration-300 cursor-pointer"
            title="Open Mevo Welcome Promotion & Vouchers"
          >
            {/* Glowing gift icon */}
            <div className="relative">
              <Gift className="w-5 h-5 sm:w-6 sm:h-6 text-white drop-shadow" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-yellow-300 rounded-full animate-ping" />
            </div>

            <div className="hidden sm:flex flex-col text-left pr-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-200 leading-none">
                Mega Sale
              </span>
              <span className="text-xs font-black text-white leading-tight">
                R650 Vouchers
              </span>
            </div>

            {/* Glowing tag */}
            <span className="bg-yellow-400 text-red-900 text-[10px] font-black px-1.5 py-0.5 rounded-full shadow-xs">
              CLAIM
            </span>
          </button>
        </div>
      )}

      {/* 2. MEVO PROMOTIONAL POP-UP MODAL */}
      {isOpen &&
        mounted &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200"
            onClick={handleClose}
          >
            {/* Modal Dialog Container */}
            <div
              className="relative w-full max-w-lg bg-neutral-950 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(234,88,12,0.4)] border-2 border-orange-500/50 flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Floating Exterior-Style Close Button */}
              <button
                type="button"
                onClick={handleClose}
                className="absolute top-3 right-3 z-30 w-8 h-8 rounded-full bg-black/60 hover:bg-black/90 text-white/80 hover:text-white flex items-center justify-center transition-colors cursor-pointer border border-white/20 shadow-lg"
                aria-label="Close promotion popup"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Mevo Vibrant Festive Header */}
              <div className="relative bg-gradient-to-b from-red-600 via-orange-600 to-orange-700 px-6 pt-7 pb-5 text-center text-white overflow-hidden shrink-0">
                {/* Decorative background radiating rays & coin confetti */}
                <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#ffd700_2px,transparent_2px)] [background-size:16px_16px] pointer-events-none" />
                <div className="absolute -top-10 -left-10 w-32 h-32 bg-yellow-400/30 rounded-full blur-2xl pointer-events-none" />
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-red-400/30 rounded-full blur-2xl pointer-events-none" />

                <div className="relative z-10 space-y-1.5">
                  {/* Top Sale Pill */}
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/30 border border-yellow-300/40 text-yellow-300 text-[11px] font-black uppercase tracking-wider shadow-inner">
                    <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                    <span>Mevo Festive Super Deals</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
                  </div>

                  {/* High-Impact Headline */}
                  <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white drop-shadow-md">
                    COLLECT <span className="text-yellow-300 underline decoration-yellow-400">R650 OFF</span>
                  </h2>

                  <p className="text-xs sm:text-sm font-semibold text-orange-100 max-w-sm mx-auto leading-snug">
                    Exclusive First-Order South African Hardware Voucher Bundle
                  </p>

                  {/* Live Urgency Countdown Pill */}
                  <div className="pt-1.5 flex items-center justify-center gap-2">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/40 text-white text-xs font-mono font-bold border border-white/20 shadow-sm">
                      <Clock className="w-3.5 h-3.5 text-amber-300" />
                      <span>Voucher expires in:</span>
                      <span className="text-yellow-300 font-black text-sm">
                        {formatTimer(secondsRemaining)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Tab Switcher: Vouchers vs Flash Deals */}
                <div className="relative z-10 flex items-center justify-center gap-2 mt-4 pt-1">
                  <button
                    type="button"
                    onClick={() => setActiveTab('vouchers')}
                    className={`px-4 py-1.5 rounded-full text-xs font-black transition-all cursor-pointer ${
                      activeTab === 'vouchers'
                        ? 'bg-yellow-400 text-neutral-950 shadow-md scale-105'
                        : 'bg-black/30 text-white hover:bg-black/40'
                    }`}
                  >
                    🎟️ Coupon Pack (3)
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('deals')}
                    className={`px-4 py-1.5 rounded-full text-xs font-black transition-all cursor-pointer ${
                      activeTab === 'deals'
                        ? 'bg-yellow-400 text-neutral-950 shadow-md scale-105'
                        : 'bg-black/30 text-white hover:bg-black/40'
                    }`}
                  >
                    🔥 Flash Hardware Deals
                  </button>
                </div>
              </div>

              {/* Scrollable Body Section */}
              <div className="p-4 sm:p-5 overflow-y-auto space-y-3.5 bg-neutral-900 text-white flex-1">
                {activeTab === 'vouchers' ? (
                  <>
                    {/* Voucher Ticket 1: R150 OFF */}
                    <div className="relative flex items-center bg-gradient-to-r from-neutral-800 to-neutral-850 rounded-2xl border border-orange-500/30 overflow-hidden shadow-md group hover:border-orange-500 transition-colors">
                      {/* Left Ticket Stub */}
                      <div className="w-28 sm:w-32 bg-gradient-to-br from-red-600 to-orange-600 p-3 text-center flex flex-col justify-center items-center text-white shrink-0 relative">
                        <span className="text-[10px] font-black uppercase tracking-wider text-orange-200">
                          VOUCHER
                        </span>
                        <span className="text-lg sm:text-xl font-black font-mono tracking-tight text-yellow-300">
                          R 150
                        </span>
                        <span className="text-[9px] font-bold text-white/90">OFF</span>

                        {/* Scissor cutout notches */}
                        <div className="absolute -top-2.5 -right-2.5 w-5 h-5 bg-neutral-900 rounded-full" />
                        <div className="absolute -bottom-2.5 -right-2.5 w-5 h-5 bg-neutral-900 rounded-full" />
                      </div>

                      {/* Right Ticket Info */}
                      <div className="flex-1 p-3 pl-4 flex items-center justify-between gap-2 min-w-0">
                        <div className="min-w-0">
                          <p className="font-black text-sm text-white flex items-center gap-1.5">
                            <span>MEVO150</span>
                            {copiedCode === 'MEVO150' && (
                              <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/80 px-1.5 py-0.5 rounded">
                                Copied!
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-neutral-300 font-medium">
                            Orders R1,500+ across entire store
                          </p>
                          <p className="text-[10px] text-neutral-400 mt-0.5">
                            Valid on all laptops, phones &amp; accessories
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => handleIndividualCopy(e, 'MEVO150')}
                          className="px-3 py-1.5 rounded-xl bg-orange-600/30 hover:bg-orange-600 text-orange-300 hover:text-white border border-orange-500/50 text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1"
                        >
                          {copiedCode === 'MEVO150' ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Done</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Voucher Ticket 2: R500 OFF */}
                    <div className="relative flex items-center bg-gradient-to-r from-neutral-800 to-neutral-850 rounded-2xl border border-amber-500/30 overflow-hidden shadow-md group hover:border-amber-500 transition-colors">
                      {/* Left Ticket Stub */}
                      <div className="w-28 sm:w-32 bg-gradient-to-br from-amber-600 to-orange-600 p-3 text-center flex flex-col justify-center items-center text-white shrink-0 relative">
                        <span className="text-[10px] font-black uppercase tracking-wider text-amber-200">
                          MEGA CODE
                        </span>
                        <span className="text-lg sm:text-xl font-black font-mono tracking-tight text-yellow-300">
                          R 500
                        </span>
                        <span className="text-[9px] font-bold text-white/90">OFF</span>

                        {/* Scissor cutout notches */}
                        <div className="absolute -top-2.5 -right-2.5 w-5 h-5 bg-neutral-900 rounded-full" />
                        <div className="absolute -bottom-2.5 -right-2.5 w-5 h-5 bg-neutral-900 rounded-full" />
                      </div>

                      {/* Right Ticket Info */}
                      <div className="flex-1 p-3 pl-4 flex items-center justify-between gap-2 min-w-0">
                        <div className="min-w-0">
                          <p className="font-black text-sm text-white flex items-center gap-1.5">
                            <span>MEVOSPRING</span>
                            {copiedCode === 'MEVOSPRING' && (
                              <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/80 px-1.5 py-0.5 rounded">
                                Copied!
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-neutral-300 font-medium">
                            Orders R5,000+ workstation &amp; rigs
                          </p>
                          <p className="text-[10px] text-neutral-400 mt-0.5">
                            Instant checkout deduction at payment
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => handleIndividualCopy(e, 'MEVOSPRING')}
                          className="px-3 py-1.5 rounded-xl bg-amber-600/30 hover:bg-amber-600 text-amber-300 hover:text-white border border-amber-500/50 text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1"
                        >
                          {copiedCode === 'MEVOSPRING' ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Done</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Voucher Ticket 3: Free Courier Delivery */}
                    <div className="relative flex items-center bg-gradient-to-r from-neutral-800 to-neutral-850 rounded-2xl border border-emerald-500/30 overflow-hidden shadow-md group hover:border-emerald-500 transition-colors">
                      {/* Left Ticket Stub */}
                      <div className="w-28 sm:w-32 bg-gradient-to-br from-emerald-600 to-teal-700 p-3 text-center flex flex-col justify-center items-center text-white shrink-0 relative">
                        <span className="text-[10px] font-black uppercase tracking-wider text-emerald-200">
                          SHIPPING
                        </span>
                        <span className="text-sm sm:text-base font-black font-mono tracking-tight text-white">
                          FREE
                        </span>
                        <span className="text-[9px] font-bold text-emerald-100">COURIER</span>

                        {/* Scissor cutout notches */}
                        <div className="absolute -top-2.5 -right-2.5 w-5 h-5 bg-neutral-900 rounded-full" />
                        <div className="absolute -bottom-2.5 -right-2.5 w-5 h-5 bg-neutral-900 rounded-full" />
                      </div>

                      {/* Right Ticket Info */}
                      <div className="flex-1 p-3 pl-4 flex items-center justify-between gap-2 min-w-0">
                        <div className="min-w-0">
                          <p className="font-black text-sm text-white flex items-center gap-1.5">
                            <span>AUTO APPLIED</span>
                            <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/80 px-1.5 py-0.5 rounded">
                              Active
                            </span>
                          </p>
                          <p className="text-xs text-neutral-300 font-medium">
                            All orders R1,500+ nationwide
                          </p>
                          <p className="text-[10px] text-neutral-400 mt-0.5">
                            Door delivery via The Courier Guy with live tracking
                          </p>
                        </div>

                        <span className="px-3 py-1.5 rounded-xl bg-emerald-900/40 text-emerald-300 border border-emerald-500/30 text-xs font-bold shrink-0 flex items-center gap-1">
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Active</span>
                        </span>
                      </div>
                    </div>
                  </>
                ) : (
                  /* TAB 2: FLASH HARDWARE DEALS */
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between px-1">
                      <span className="text-xs font-bold text-neutral-300 flex items-center gap-1.5">
                        <Flame className="w-4 h-4 text-orange-500" />
                        Today's Mevo Top Hardware Picks
                      </span>
                      <span className="text-[11px] font-mono text-amber-400 font-bold">
                        Limited Time Only
                      </span>
                    </div>

                    {/* Instant Feedback Banner when user adds an item */}
                    {lastAddedName && (
                      <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs animate-in fade-in slide-in-from-top-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span className="truncate font-semibold">
                            Added <span className="text-white font-bold">{lastAddedName}</span> to cart!
                          </span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-900 text-emerald-300 font-mono text-[10px] font-bold shrink-0">
                          {itemCount} {itemCount === 1 ? 'item' : 'items'} in cart
                        </span>
                      </div>
                    )}

                    {hotDeals.map((deal) => (
                      <div
                        key={deal.id}
                        className="p-2.5 rounded-2xl bg-neutral-800/90 hover:bg-neutral-800 border border-neutral-700/80 hover:border-orange-500/70 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 group"
                      >
                        {/* Product Thumbnail & Basic Info */}
                        <div
                          className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                          onClick={(e) => handleViewDetails(e, deal)}
                          title={`Click to view full specifications for ${deal.name}`}
                        >
                          <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-neutral-900 shrink-0 border border-neutral-700">
                            <img
                              src={deal.primaryImage}
                              alt={deal.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                            <span className="absolute top-0 right-0 bg-red-600 text-white text-[9px] font-black px-1 rounded-bl">
                              -20%
                            </span>
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-white truncate group-hover:text-orange-400 transition-colors">
                              {deal.name}
                            </p>
                            <div className="flex items-baseline gap-2 mt-0.5">
                              <span className="text-xs font-black font-mono text-yellow-300">
                                {formatZAR(deal.priceCents)}
                              </span>
                              <span className="text-[10px] font-mono line-through text-neutral-500">
                                {formatZAR(Math.round(deal.priceCents * 1.2))}
                              </span>
                            </div>
                            <span className="inline-block text-[9px] font-bold text-orange-400 bg-orange-500/10 px-1.5 py-0.2 rounded mt-1">
                              🔥 Almost sold out
                            </span>
                          </div>
                        </div>

                        {/* Action Buttons: View Details & Add to Cart */}
                        <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                          {/* View Details Button */}
                          <button
                            type="button"
                            onClick={(e) => handleViewDetails(e, deal)}
                            className="px-2.5 py-1.5 rounded-xl font-bold text-xs text-neutral-300 hover:text-white bg-neutral-700/80 hover:bg-neutral-700 border border-neutral-600/80 hover:border-neutral-500 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                            title={`Read full specifications for ${deal.name}`}
                          >
                            <Eye className="w-3.5 h-3.5 text-orange-400" />
                            <span>View Details</span>
                          </button>

                          {/* Direct Add to Cart Button */}
                          <button
                            type="button"
                            onClick={(e) => handleAddToCart(e, deal)}
                            className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-md cursor-pointer ${
                              addedIds[deal.id]
                                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/40 ring-2 ring-emerald-400 scale-102'
                                : 'bg-gradient-to-r from-orange-600 via-amber-600 to-orange-500 hover:from-orange-500 hover:to-amber-500 text-white shadow-orange-600/30 hover:scale-102 active:scale-95'
                            }`}
                            title={`Add ${deal.name} directly to cart`}
                          >
                            {addedIds[deal.id] ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-white animate-in zoom-in" />
                                <span>Added!</span>
                              </>
                            ) : (
                              <>
                                <ShoppingCart className="w-3.5 h-3.5 text-white" />
                                <span>Add to Cart</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    ))}

                    {/* Quick Bundle Add All */}
                    {hotDeals.length > 1 && (
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={handleAddAllDeals}
                          className="w-full py-2.5 px-3 rounded-xl bg-orange-600/20 hover:bg-orange-600/30 border border-orange-500/40 text-orange-200 hover:text-white text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm group"
                        >
                          <Zap className="w-4 h-4 text-yellow-400 group-hover:scale-110 transition-transform" />
                          <span>Add All 3 Flash Hardware Deals to Cart</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Mevo Main Bottom Action Button */}
              <div className="p-4 bg-neutral-950 border-t border-neutral-800 shrink-0 space-y-2">
                {isCollected ? (
                  <button
                    type="button"
                    onClick={() => {
                      onExploreDeals();
                      handleClose();
                    }}
                    className="w-full py-3 px-4 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-white rounded-2xl text-sm font-black uppercase tracking-wider transition-all shadow-lg hover:shadow-emerald-500/30 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Vouchers Collected · Shop Deals Now</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleCollectAll}
                    className="w-full py-3.5 px-4 bg-gradient-to-r from-red-600 via-orange-500 to-amber-500 hover:from-red-500 hover:to-amber-400 text-white rounded-2xl text-sm font-black uppercase tracking-wider transition-all shadow-xl hover:shadow-orange-500/40 flex items-center justify-center gap-2 cursor-pointer group"
                  >
                    <Sparkles className="w-5 h-5 text-yellow-300 group-hover:scale-110 transition-transform" />
                    <span>COLLECT ALL R650 VOUCHERS NOW</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                )}

                {/* Footer Controls: Don't show again checkbox */}
                <div className="flex items-center justify-between text-[11px] text-neutral-400 pt-1 px-1">
                  <label className="flex items-center gap-1.5 cursor-pointer hover:text-neutral-300">
                    <input
                      type="checkbox"
                      checked={dontShowToday}
                      onChange={(e) => setDontShowToday(e.target.checked)}
                      className="rounded border-neutral-700 text-orange-600 focus:ring-orange-500 w-3.5 h-3.5"
                    />
                    <span>Don't show this again today</span>
                  </label>

                  <button
                    type="button"
                    onClick={handleClose}
                    className="text-neutral-400 hover:text-white underline cursor-pointer"
                  >
                    Dismiss &amp; Browse Store
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};
