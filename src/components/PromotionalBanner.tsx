import React, { useEffect, useState } from 'react';
import { PromotionalBanner as BannerType, Product } from '../types';
import { api } from '../services/api';
import {
  Clock,
  Check,
  ChevronRight,
  Truck,
  Sparkles,
  ChevronLeft,
  X,
  Tag,
  ArrowRight,
  Flame,
} from 'lucide-react';
import { formatZAR } from '../utils/calculations';

interface PromotionalBannerProps {
  onSelectCategory: (category: string) => void;
  onApplyVoucher?: (code: string) => void;
  products?: Product[];
  onSelectProduct?: (product: Product) => void;
}

export const PromotionalBanner: React.FC<PromotionalBannerProps> = ({
  onSelectCategory,
  onApplyVoucher,
  products = [],
  onSelectProduct,
}) => {
  const [banners, setBanners] = useState<BannerType[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDismissed, setIsDismissed] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<string>('2d 23h remaining');

  useEffect(() => {
    let mounted = true;
    api
      .getActivePromotions()
      .then((data) => {
        if (mounted && Array.isArray(data) && data.length > 0) {
          setBanners(data);
        }
      })
      .catch((err) => {
        console.warn('Could not load real-time promotional banner:', err);
      });

    return () => {
      mounted = false;
    };
  }, []);

  // Update remaining time calculation
  useEffect(() => {
    const activeBanner = banners[currentIndex];
    const endsAt = activeBanner?.endsAt || new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();

    const calculateRemaining = () => {
      const diff = new Date(endsAt).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft('Ending soon');
        return;
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);

      if (days > 0) {
        setTimeLeft(`${days}d ${hours}h remaining`);
      } else {
        setTimeLeft(`${hours}h ${minutes}m remaining`);
      }
    };

    calculateRemaining();
    const interval = setInterval(calculateRemaining, 60000);
    return () => clearInterval(interval);
  }, [banners, currentIndex]);

  if (isDismissed) {
    return null;
  }

  const currentBanner = banners[currentIndex];

  const handleCopyCode = (e: React.MouseEvent, code: string) => {
    e.stopPropagation();
    navigator.clipboard?.writeText(code);
    setCopiedCode(code);
    if (onApplyVoucher) {
      onApplyVoucher(code);
    }
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const handleBannerCta = () => {
    if (currentBanner?.targetCategory) {
      onSelectCategory(currentBanner.targetCategory);
    }
    const el = document.getElementById('catalogue-anchor');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Find top live deals from inventory
  const topDealProduct =
    products.find((p) => p.promotionalPriceCents && p.category.includes('Laptops')) ||
    products[0] || {
      id: 'prod_studiobook_16',
      name: 'Mevo StudioBook Pro 16',
      priceCents: 3899900,
      promotionalPriceCents: 3499900,
      primaryImage: '/src/assets/images/product_laptop_pro_1793053698062.jpg',
    };

  const secondaryDealProduct =
    products.find((p) => p.category.includes('Monitors') || p.category.includes('Audio')) ||
    products[1] || {
      id: 'prod_lumina_34_oled',
      name: 'Lumina 34" Curved QD-OLED',
      priceCents: 2199900,
      promotionalPriceCents: 1899900,
      primaryImage: '/src/assets/images/product_monitor_ultrawide_1793053698041.jpg',
    };

  return (
    <section
      role="region"
      aria-label="High-impact Sales and Promotions Banner"
      className="relative w-full overflow-hidden transition-all duration-300"
    >
      {/* 1. MAIN VIBRANT RED CAMPAIGN STAGE (Matches Reference Image 1) */}
      <div className="relative bg-[#ff1744] bg-gradient-to-r from-[#ff0033] via-[#ff1744] to-[#ff2b58] text-white py-6 px-4 sm:px-6 lg:px-8 overflow-hidden shadow-inner">
        
        {/* Festive Confetti Streamers & Ribbons Background Overlay */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-90">
          {/* Cyan streamer curve */}
          <svg className="absolute -bottom-8 right-24 sm:right-64 w-64 h-32" viewBox="0 0 200 100" fill="none">
            <path
              d="M 10 90 Q 60 10, 120 70 T 200 20"
              stroke="#00d2ff"
              strokeWidth="10"
              strokeLinecap="round"
              fill="none"
              opacity="0.95"
            />
          </svg>
          {/* Magenta streamer ribbon */}
          <svg className="absolute -top-4 right-12 sm:right-48 w-48 h-32" viewBox="0 0 150 100" fill="none">
            <path
              d="M 10 10 Q 70 80, 140 20"
              stroke="#ff00cc"
              strokeWidth="9"
              strokeLinecap="round"
              fill="none"
              opacity="0.9"
            />
          </svg>
          {/* Yellow streamer ribbon */}
          <svg className="absolute top-8 -right-4 w-44 h-28" viewBox="0 0 120 80" fill="none">
            <path
              d="M 10 70 Q 50 10, 110 50"
              stroke="#ffeb3b"
              strokeWidth="8"
              strokeLinecap="round"
              fill="none"
              opacity="0.9"
            />
          </svg>
          {/* Green streamer */}
          <svg className="absolute -bottom-4 right-8 w-32 h-24" viewBox="0 0 100 60" fill="none">
            <path
              d="M 5 40 Q 50 5, 95 35"
              stroke="#00e676"
              strokeWidth="8"
              strokeLinecap="round"
              fill="none"
              opacity="0.85"
            />
          </svg>
        </div>

        {/* Content Container */}
        <div className="max-w-7xl mx-auto relative z-10 flex flex-col lg:flex-row items-center justify-between gap-6">
          
          {/* LEFT COLUMN: Campaign Headline & Dynamic Countdown */}
          <div className="space-y-1 text-center lg:text-left shrink-0">
            {/* Sale Ends Countdown */}
            <div className="flex items-center justify-center lg:justify-start gap-1.5 text-xs sm:text-sm font-semibold tracking-wide text-white/95">
              <Clock className="w-4 h-4 text-yellow-300" />
              <span>Sale Ends: Nov 19, 09:59 (GMT+2)</span>
              <span className="text-yellow-300 font-mono font-bold text-xs">· {timeLeft}</span>
            </div>

            {/* UP TO 80% OFF with Circle Chevron Arrow */}
            <div
              onClick={handleBannerCta}
              className="inline-flex items-center gap-2 cursor-pointer group select-none pt-0.5"
            >
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight text-white drop-shadow-sm font-sans">
                UP TO <span className="text-yellow-300 font-black">80% OFF</span>
              </h2>
              <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white text-[#ff1744] flex items-center justify-center shadow-md group-hover:scale-110 group-hover:translate-x-1 transition-all">
                <ChevronRight className="w-5 h-5 stroke-[3]" />
              </span>
            </div>
          </div>

          {/* MIDDLE COLUMN: Three Live Promotional Cards (Coupon Ticket + Top Deals + Pro Gear) */}
          <div className="flex flex-wrap sm:flex-nowrap items-center justify-center gap-3 sm:gap-3.5 w-full lg:w-auto">
            
            {/* CARD 1: Perforated Coupon Ticket Card (Matches Reference Image 1) */}
            <div className="relative bg-white rounded-xl shadow-lg p-2.5 sm:p-3 text-neutral-900 flex items-stretch border border-white/60 min-w-[240px] sm:min-w-[270px]">
              {/* Left Coupon Slot */}
              <div className="flex-1 pr-3 text-center sm:text-left flex flex-col justify-between">
                <div>
                  <span className="text-sm sm:text-base font-black text-[#e01438] block leading-tight font-sans">
                    R150 OFF
                  </span>
                  <span className="text-[10px] text-neutral-400 font-medium block mt-0.5">
                    orders R1,500+
                  </span>
                </div>
                <button
                  type="button"
                  onClick={(e) => handleCopyCode(e, 'MEVO150')}
                  className="mt-2 text-[11px] font-black text-[#e01438] hover:text-[#b30e2b] flex items-center gap-0.5 justify-center sm:justify-start cursor-pointer hover:underline"
                  title="Copy coupon code"
                >
                  <Tag className="w-3 h-3" />
                  <span>Code:MEVO150</span>
                  {copiedCode === 'MEVO150' && (
                    <Check className="w-3 h-3 text-emerald-600 shrink-0 ml-0.5" />
                  )}
                </button>
              </div>

              {/* Vertical Dashed Perforation with Top & Bottom Cutout Notches */}
              <div className="relative flex flex-col items-center justify-center px-1">
                <div className="absolute -top-3.5 w-3 h-3 bg-[#ff1744] rounded-full" />
                <div className="h-full border-r-2 border-dashed border-neutral-300" />
                <div className="absolute -bottom-3.5 w-3 h-3 bg-[#ff1744] rounded-full" />
              </div>

              {/* Right Coupon Slot */}
              <div className="flex-1 pl-3 text-center sm:text-left flex flex-col justify-between">
                <div>
                  <span className="text-sm sm:text-base font-black text-[#e01438] block leading-tight font-sans">
                    R500 OFF
                  </span>
                  <span className="text-[10px] text-neutral-400 font-medium block mt-0.5">
                    orders R5,000+
                  </span>
                </div>
                <button
                  type="button"
                  onClick={(e) => handleCopyCode(e, 'MEVOSPRING')}
                  className="mt-2 text-[11px] font-black text-[#e01438] hover:text-[#b30e2b] flex items-center gap-0.5 justify-center sm:justify-start cursor-pointer hover:underline"
                  title="Copy coupon code"
                >
                  <Tag className="w-3 h-3" />
                  <span>Code:MEVOSPRING</span>
                  {copiedCode === 'MEVOSPRING' && (
                    <Check className="w-3 h-3 text-emerald-600 shrink-0 ml-0.5" />
                  )}
                </button>
              </div>
            </div>

            {/* CARD 2: "Top deals" Live Product Special (Matches Blue Card in Reference Image 1) */}
            <div
              onClick={() => {
                if (topDealProduct && onSelectProduct) {
                  onSelectProduct(topDealProduct as Product);
                } else {
                  handleBannerCta();
                }
              }}
              className="bg-white rounded-xl shadow-lg overflow-hidden flex items-stretch border border-white/60 cursor-pointer group hover:scale-[1.02] transition-transform w-[190px] sm:w-[210px] h-[84px] sm:h-[92px]"
              title={`View ${topDealProduct.name}`}
            >
              {/* Product Photo */}
              <div className="w-[85px] sm:w-[95px] h-full bg-neutral-100 overflow-hidden relative shrink-0">
                <img
                  src={topDealProduct.primaryImage}
                  alt={topDealProduct.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>

              {/* Light Blue Right Info Panel */}
              <div className="flex-1 bg-[#d7ebfc] p-2 sm:p-2.5 flex flex-col justify-between text-left">
                <span className="text-xs sm:text-sm font-black text-[#0052cc] leading-tight font-sans">
                  Top deals
                </span>
                <div className="bg-[#262626] text-white px-2 py-0.5 rounded text-[11px] sm:text-xs font-black font-mono tracking-tight self-start shadow-xs">
                  {formatZAR(topDealProduct.promotionalPriceCents || topDealProduct.priceCents)}
                </div>
              </div>
            </div>

            {/* CARD 3: "Sports club" / "Pro Gear" Live Product Special (Matches Peach Card in Reference Image 1) */}
            <div
              onClick={() => {
                if (secondaryDealProduct && onSelectProduct) {
                  onSelectProduct(secondaryDealProduct as Product);
                } else {
                  handleBannerCta();
                }
              }}
              className="bg-white rounded-xl shadow-lg overflow-hidden flex items-stretch border border-white/60 cursor-pointer group hover:scale-[1.02] transition-transform w-[190px] sm:w-[210px] h-[84px] sm:h-[92px]"
              title={`View ${secondaryDealProduct.name}`}
            >
              {/* Product Photo */}
              <div className="w-[85px] sm:w-[95px] h-full bg-neutral-100 overflow-hidden relative shrink-0">
                <img
                  src={secondaryDealProduct.primaryImage}
                  alt={secondaryDealProduct.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>

              {/* Warm Peach Right Info Panel */}
              <div className="flex-1 bg-[#fdedd8] p-2 sm:p-2.5 flex flex-col justify-between text-left">
                <span className="text-xs sm:text-sm font-black text-[#874d00] leading-tight font-sans">
                  Pro Gear
                </span>
                <div className="bg-[#262626] text-white px-2 py-0.5 rounded text-[11px] sm:text-xs font-black font-mono tracking-tight self-start shadow-xs">
                  {formatZAR(secondaryDealProduct.promotionalPriceCents || secondaryDealProduct.priceCents)}
                </div>
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN: Festive "11.11 SALE" Lettering Banner (Matches Reference Image 1 Right Side) */}
          <div className="hidden xl:flex flex-col items-center justify-center shrink-0 pl-2">
            <div className="relative text-center select-none">
              <span className="block text-4xl lg:text-5xl font-black italic tracking-tighter text-yellow-300 drop-shadow-[0_4px_8px_rgba(0,0,0,0.3)] font-sans">
                11.11
              </span>
              <div className="flex items-center justify-center gap-1">
                <span className="block text-3xl lg:text-4xl font-black italic tracking-wide text-white drop-shadow-[0_3px_6px_rgba(0,0,0,0.3)]">
                  SALE
                </span>
                <span className="inline-block w-4 h-4 text-yellow-300 font-bold">✓</span>
              </div>
            </div>
          </div>

          {/* Dismiss button */}
          <button
            onClick={() => setIsDismissed(true)}
            aria-label="Dismiss promotional banner"
            className="absolute top-2 right-2 text-white/60 hover:text-white p-1 rounded-full hover:bg-black/20 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. BOTTOM DELIVERY BADGE STRIP (Matches Reference Image 1 Bottom Strip) */}
      <div className="bg-white border-b border-neutral-200/90 py-2 px-4 shadow-2xs">
        <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 text-xs font-semibold text-neutral-800">
          <div className="w-5 h-4.5 rounded bg-neutral-900 text-white flex items-center justify-center text-[10px] shrink-0 font-bold">
            <Truck className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-bold text-neutral-900">Free shipping</span>
          <span className="text-neutral-500 font-medium">
            On all Choice items &amp; orders over R 1,500 via The Courier Guy
          </span>
        </div>
      </div>
    </section>
  );
};
