import React, { useEffect, useState } from 'react';
import { PromotionalBanner as BannerType } from '../types';
import { api } from '../services/api';
import { Sparkles, ArrowRight, Clock, Tag, X, ChevronLeft, ChevronRight, Check } from 'lucide-react';

interface PromotionalBannerProps {
  onSelectCategory: (category: string) => void;
  onApplyVoucher?: (code: string) => void;
}

export const PromotionalBanner: React.FC<PromotionalBannerProps> = ({
  onSelectCategory,
  onApplyVoucher,
}) => {
  const [banners, setBanners] = useState<BannerType[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDismissed, setIsDismissed] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<string>('');

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

  // Update remaining time calculation for active flash deal
  useEffect(() => {
    const activeBanner = banners[currentIndex];
    if (!activeBanner || !activeBanner.endsAt) {
      setTimeLeft('');
      return;
    }

    const calculateRemaining = () => {
      const diff = new Date(activeBanner.endsAt).getTime() - Date.now();
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

  if (isDismissed || banners.length === 0) {
    return null;
  }

  const currentBanner = banners[currentIndex];

  const handleCtaClick = () => {
    if (currentBanner.targetCategory) {
      onSelectCategory(currentBanner.targetCategory);
      // Smoothly scroll to catalogue grid
      const el = document.getElementById('catalogue-anchor');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const handleCopyCode = (e: React.MouseEvent, code: string) => {
    e.stopPropagation();
    navigator.clipboard?.writeText(code);
    setCopiedCode(code);
    if (onApplyVoucher) {
      onApplyVoucher(code);
    }
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % banners.length);
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length);
  };

  return (
    <div
      role="region"
      aria-label="Seasonal Promotions and Flash Deals"
      className="relative bg-gradient-to-r from-neutral-900 via-neutral-950 to-neutral-900 text-white border-b border-neutral-800 transition-all duration-300"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 sm:py-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 sm:gap-4">
          {/* Left / Center Content */}
          <div className="flex items-center gap-3 text-center md:text-left flex-1 min-w-0">
            <div className="hidden sm:flex p-2 rounded-lg bg-purple-600/20 text-purple-400 border border-purple-500/30 shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>

            <div className="space-y-0.5">
              {/* Kicker metadata with clean unboxed typographic separators */}
              <div className="flex items-center justify-center md:justify-start gap-2 text-[11px] font-semibold tracking-wider text-purple-400 uppercase">
                <span>{currentBanner.kicker}</span>
                {timeLeft && (
                  <>
                    <span aria-hidden="true" className="text-neutral-600">·</span>
                    <span className="flex items-center gap-1 text-neutral-300 font-normal normal-case font-mono">
                      <Clock className="w-3 h-3 text-amber-400" />
                      <span>{timeLeft}</span>
                    </span>
                  </>
                )}
              </div>

              {/* Title & Description */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-2 gap-y-1">
                <h3 className="text-sm font-bold text-white tracking-tight">
                  {currentBanner.title}
                </h3>
                <span className="hidden lg:inline text-neutral-400 text-xs">
                  — {currentBanner.subtitle}
                </span>
              </div>
            </div>
          </div>

          {/* Right Action Controls: Voucher Code + Primary CTA + Carousel Arrows + Dismiss */}
          <div className="flex items-center gap-2.5 shrink-0">
            {/* Voucher Code Capsule if available */}
            {currentBanner.discountCode && (
              <button
                onClick={(e) => handleCopyCode(e, currentBanner.discountCode!)}
                title="Click to copy voucher code"
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 rounded-lg text-xs font-mono transition-colors group cursor-pointer"
              >
                <Tag className="w-3 h-3 text-purple-400" />
                <span className="font-bold text-white tracking-wide">{currentBanner.discountCode}</span>
                {copiedCode === currentBanner.discountCode ? (
                  <span className="flex items-center gap-0.5 text-[10px] text-emerald-400 font-sans font-medium">
                    <Check className="w-3 h-3" /> Copied!
                  </span>
                ) : (
                  <span className="text-[10px] text-neutral-400 font-sans font-normal group-hover:text-neutral-200">
                    Copy Code
                  </span>
                )}
              </button>
            )}

            {/* Primary Action Button */}
            <button
              onClick={handleCtaClick}
              className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-colors flex items-center gap-1.5 shadow-sm whitespace-nowrap shrink-0 group"
            >
              <span>{currentBanner.ctaText}</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </button>

            {/* Carousel navigation controls if multiple deals exist */}
            {banners.length > 1 && (
              <div className="hidden sm:flex items-center gap-1 pl-1 border-l border-neutral-800">
                <button
                  onClick={handlePrev}
                  aria-label="Previous promotional deal"
                  className="p-1 rounded text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-[11px] text-neutral-500 font-mono">
                  {currentIndex + 1}/{banners.length}
                </span>
                <button
                  onClick={handleNext}
                  aria-label="Next promotional deal"
                  className="p-1 rounded text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Dismiss banner button */}
            <button
              onClick={() => setIsDismissed(true)}
              aria-label="Dismiss promotional banner"
              className="p-1 text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800/80 rounded-md transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
