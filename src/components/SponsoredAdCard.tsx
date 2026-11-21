import React, { useState, useEffect } from 'react';
import {
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Zap,
  Tag,
  ArrowRight,
  Settings,
  Plus,
  Trash2,
  Check,
  Lock,
  Globe,
  DollarSign,
  Info,
} from 'lucide-react';

export interface AffiliateOffer {
  id: string;
  network: string; // e.g., 'MaxBounty', 'ClickBank', 'CJ Affiliate', 'Impact', 'Custom Affiliate'
  brandName: string;
  tagline: string;
  headline: string;
  description: string;
  ctaText: string;
  targetUrl: string; // The affiliate tracking URL
  badgeText: string;
  accentGradient: string;
  accentBorder: string;
  categoryTag: string;
  commissionNote?: string;
  imageUrl?: string;
  isActive: boolean;
}

// Built-in high-converting affiliate campaigns tailored for MaxBounty and tech audiences
const DEFAULT_AFFILIATE_OFFERS: AffiliateOffer[] = [
  {
    id: 'aff_maxbounty_vpn',
    network: 'MaxBounty',
    brandName: 'NordVPN Threat Protection Pro',
    tagline: 'High-Converting MaxBounty CPA Campaign',
    headline: 'Secure Gigabit Fiber & Bypass Streaming Geo-Blocks',
    description: 'Next-gen AES-256 encryption engineered for high-throughput South African fiber connections. 30-day risk-free trial.',
    ctaText: 'Claim 74% Off Deal',
    targetUrl: 'https://www.nordvpn.com/?aff_id=mevotech&subid1=product_sidebar&subid2=sa_traffic',
    badgeText: 'MaxBounty Exclusive Offer',
    accentGradient: 'from-blue-950 via-neutral-900 to-black',
    accentBorder: 'border-blue-500/30',
    categoryTag: 'Cybersecurity & Privacy',
    commissionNote: 'Top CPA Payout · Verified Affiliate',
    isActive: true,
  },
  {
    id: 'aff_backblaze_backup',
    network: 'Affiliate Partner',
    brandName: 'Backblaze Unlimited Cloud Backup',
    tagline: 'Disaster Recovery for Creators & Rigs',
    headline: 'Unlimited Workstation & 4K Render Cloud Backup',
    description: 'Never lose raw project files or Unreal Engine assets to drive failure. Silent automatic background backup with instant recovery.',
    ctaText: 'Start 15-Day Free Trial',
    targetUrl: 'https://www.backblaze.com/cloud-backup.html?aff=mevotech_rigs&subid=creators_backup',
    badgeText: 'Creator Essential',
    accentGradient: 'from-rose-950 via-neutral-900 to-black',
    accentBorder: 'border-rose-500/30',
    categoryTag: 'Data Protection & Cloud',
    commissionNote: 'Recurring SaaS Affiliate',
    isActive: true,
  },
  {
    id: 'aff_cleaner_optimizer',
    network: 'MaxBounty',
    brandName: 'CleanMyPC & System Booster',
    tagline: 'Windows 11 Hardware Optimization',
    headline: 'Unleash Peak Gaming FPS & Recover 60GB NVMe Space',
    description: 'Clear shader cache bloat, optimize background process priorities, and benchmark your gaming rig for maximum thermal efficiency.',
    ctaText: 'Free System Benchmark',
    targetUrl: 'https://macpaw.com/cleanmypc?aff_id=mevotech&subid=rtx_optimization',
    badgeText: 'Hardware Utility',
    accentGradient: 'from-amber-950 via-neutral-900 to-black',
    accentBorder: 'border-amber-500/30',
    categoryTag: 'PC Performance',
    commissionNote: 'Instant Conversion CPA',
    isActive: true,
  },
];

const LOCAL_STORAGE_KEY = 'mevo_affiliate_offers_v1';

interface SponsoredAdCardProps {
  placement?: string;
  className?: string;
}

export const SponsoredAdCard: React.FC<SponsoredAdCardProps> = ({
  placement = 'product_sidebar',
  className = '',
}) => {
  const [offers, setOffers] = useState<AffiliateOffer[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // fallback
    }
    return DEFAULT_AFFILIATE_OFFERS;
  });

  const [activeOfferIndex, setActiveOfferIndex] = useState(0);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [editingOffer, setEditingOffer] = useState<AffiliateOffer | null>(null);
  const [isSuccessSaved, setIsSuccessSaved] = useState(false);

  // Filter active offers
  const activeOffers = offers.filter((o) => o.isActive);
  const currentOffer = activeOffers[activeOfferIndex % activeOffers.length] || DEFAULT_AFFILIATE_OFFERS[0];

  // Auto rotate offers every 10 seconds if multiple exist
  useEffect(() => {
    if (activeOffers.length <= 1) return;
    const interval = setInterval(() => {
      setActiveOfferIndex((prev) => (prev + 1) % activeOffers.length);
    }, 10000);
    return () => clearInterval(interval);
  }, [activeOffers.length]);

  const saveOffersToStorage = (updated: AffiliateOffer[]) => {
    setOffers(updated);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // Ignore
    }
    setIsSuccessSaved(true);
    setTimeout(() => setIsSuccessSaved(false), 2000);
  };

  const handleUpdateCurrentOfferUrl = (newUrl: string) => {
    const updated = offers.map((o) => (o.id === currentOffer.id ? { ...o, targetUrl: newUrl } : o));
    saveOffersToStorage(updated);
  };

  return (
    <>
      <div
        className={`bg-white rounded-2xl border border-neutral-200 overflow-hidden shadow-sm flex flex-col ${className}`}
      >
        {/* Top Header: Affiliate Label & Optional Link Configuration Trigger */}
        <div className="px-3.5 py-2 bg-neutral-900 text-white flex items-center justify-between text-[11px] border-b border-neutral-800">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="font-extrabold uppercase tracking-wider text-[9px] bg-orange-600 text-white px-1.5 py-0.5 rounded font-mono shrink-0">
              {currentOffer.network}
            </span>
            <span className="font-semibold text-neutral-300 truncate text-[10px]">
              {currentOffer.badgeText}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Quick Affiliate Link Config button */}
            <button
              type="button"
              onClick={() => {
                setEditingOffer({ ...currentOffer });
                setShowConfigModal(true);
              }}
              className="text-[10px] text-orange-300 hover:text-white flex items-center gap-1 px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 transition-colors cursor-pointer"
              title="Change affiliate link or banner details (MaxBounty / ClickBank / etc.)"
            >
              <Settings className="w-3 h-3 text-orange-300" />
              <span>Affiliate Link</span>
            </button>
          </div>
        </div>

        {/* Visual Affiliate Creative Banner */}
        <div className={`p-4 bg-gradient-to-br ${currentOffer.accentGradient} text-white flex flex-col justify-between relative overflow-hidden`}>
          {/* Subtle grid texture */}
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:12px_12px] pointer-events-none" />

          <div className="relative z-10 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-orange-300 bg-orange-950/80 px-2 py-0.5 rounded border border-orange-500/40">
                {currentOffer.brandName}
              </span>
              <span className="text-[10px] text-neutral-400 font-mono">
                {currentOffer.categoryTag}
              </span>
            </div>

            <h4 className="text-sm font-black text-white leading-snug tracking-tight">
              {currentOffer.headline}
            </h4>

            <p className="text-[11px] text-neutral-300 leading-relaxed">
              {currentOffer.description}
            </p>
          </div>

          {/* Direct Affiliate Click-Through Link */}
          <div className="relative z-10 pt-4 mt-2">
            <a
              href={currentOffer.targetUrl}
              target="_blank"
              rel="noopener noreferrer sponsored"
              className="w-full py-2.5 px-3 bg-white hover:bg-neutral-100 text-neutral-950 rounded-xl text-xs font-bold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-1.5 group cursor-pointer"
              title={`Open ${currentOffer.brandName} (${currentOffer.network} partner deal)`}
            >
              <span>{currentOffer.ctaText}</span>
              <ExternalLink className="w-3.5 h-3.5 text-neutral-900 group-hover:translate-x-0.5 transition-transform" />
            </a>
          </div>
        </div>

        {/* Bottom Affiliate Disclosure & Multi-Banner Switcher */}
        <div className="p-2.5 bg-neutral-50/90 border-t border-neutral-200/80 flex items-center justify-between text-[10px] text-neutral-500">
          <div className="flex items-center gap-1 text-neutral-500 truncate mr-2" title="We may earn a commission when you purchase through our affiliate links">
            <Tag className="w-3 h-3 text-orange-600 shrink-0" />
            <span className="truncate">Affiliate partner offer</span>
          </div>

          {/* Banner switcher dots */}
          {activeOffers.length > 1 && (
            <div className="flex items-center gap-1.5 shrink-0">
              {activeOffers.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActiveOfferIndex(i)}
                  className={`w-2 h-2 rounded-full transition-all cursor-pointer ${
                    i === activeOfferIndex ? 'bg-orange-600 w-4' : 'bg-neutral-300 hover:bg-neutral-400'
                  }`}
                  aria-label={`Show affiliate banner ${i + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* AFFILIATE LINK & BANNER SETTINGS MODAL */}
      {showConfigModal && editingOffer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="bg-white rounded-2xl shadow-2xl border border-neutral-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-5 py-3.5 bg-neutral-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-orange-400" />
                <h3 className="font-bold text-sm text-white">Affiliate Banner &amp; Link Settings</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              <div className="p-3 bg-orange-50 rounded-xl border border-orange-200 text-orange-950 flex items-start gap-2">
                <Info className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed">
                  Paste your active affiliate tracking link from <strong>MaxBounty</strong>, <strong>ClickBank</strong>, <strong>CJ</strong>, or any partner network. Clicking the banner will route shoppers directly to your tracking link with affiliate parameters.
                </p>
              </div>

              {/* Affiliate Offer Selector Tabs */}
              <div>
                <label className="block font-bold text-neutral-800 mb-1.5 uppercase text-[10px] tracking-wider">
                  Select Banner Offer to Edit:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {offers.map((offer, idx) => (
                    <button
                      key={offer.id}
                      type="button"
                      onClick={() => setEditingOffer({ ...offer })}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer border ${
                        editingOffer.id === offer.id
                          ? 'bg-neutral-900 text-white border-neutral-900'
                          : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 border-neutral-200'
                      }`}
                    >
                      {offer.brandName.split(' ')[0]} ({offer.network})
                    </button>
                  ))}
                </div>
              </div>

              {/* Form Fields */}
              <div className="space-y-3">
                <div>
                  <label className="block font-bold text-neutral-700 mb-1">
                    Affiliate Network Name
                  </label>
                  <input
                    type="text"
                    value={editingOffer.network}
                    onChange={(e) => setEditingOffer({ ...editingOffer, network: e.target.value })}
                    placeholder="e.g. MaxBounty, ClickBank, CJ Affiliate"
                    className="w-full px-3 py-1.5 border border-neutral-300 rounded-lg text-neutral-900 focus:outline-none focus:ring-1 focus:ring-orange-600 font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-neutral-700 mb-1 flex items-center justify-between">
                    <span>Affiliate Tracking Link (MaxBounty / Target URL)</span>
                    <span className="text-[10px] text-neutral-400 font-normal">Must start with http:// or https://</span>
                  </label>
                  <input
                    type="url"
                    value={editingOffer.targetUrl}
                    onChange={(e) => setEditingOffer({ ...editingOffer, targetUrl: e.target.value })}
                    placeholder="https://mb101.com/track?offer_id=...&aff_id=..."
                    className="w-full px-3 py-2 border-2 border-orange-300 rounded-lg text-neutral-900 focus:outline-none focus:ring-2 focus:ring-orange-600 font-mono text-[11px] bg-orange-50/20"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-neutral-700 mb-1">
                      Brand / Product Name
                    </label>
                    <input
                      type="text"
                      value={editingOffer.brandName}
                      onChange={(e) => setEditingOffer({ ...editingOffer, brandName: e.target.value })}
                      placeholder="e.g. NordVPN, Backblaze"
                      className="w-full px-3 py-1.5 border border-neutral-300 rounded-lg text-neutral-900 focus:outline-none focus:ring-1 focus:ring-orange-600"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-neutral-700 mb-1">
                      Button CTA Text
                    </label>
                    <input
                      type="text"
                      value={editingOffer.ctaText}
                      onChange={(e) => setEditingOffer({ ...editingOffer, ctaText: e.target.value })}
                      placeholder="e.g. Claim 74% Off Deal"
                      className="w-full px-3 py-1.5 border border-neutral-300 rounded-lg text-neutral-900 focus:outline-none focus:ring-1 focus:ring-orange-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-neutral-700 mb-1">
                    Banner Headline
                  </label>
                  <input
                    type="text"
                    value={editingOffer.headline}
                    onChange={(e) => setEditingOffer({ ...editingOffer, headline: e.target.value })}
                    placeholder="e.g. Secure Gigabit Fiber & Bypass Streaming Geo-Blocks"
                    className="w-full px-3 py-1.5 border border-neutral-300 rounded-lg text-neutral-900 focus:outline-none focus:ring-1 focus:ring-orange-600"
                  />
                </div>

                <div>
                  <label className="block font-bold text-neutral-700 mb-1">
                    Banner Description
                  </label>
                  <textarea
                    rows={2}
                    value={editingOffer.description}
                    onChange={(e) => setEditingOffer({ ...editingOffer, description: e.target.value })}
                    placeholder="e.g. Next-gen AES-256 encryption engineered for high-throughput South African fiber connections."
                    className="w-full px-3 py-1.5 border border-neutral-300 rounded-lg text-neutral-900 focus:outline-none focus:ring-1 focus:ring-orange-600 resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 bg-neutral-50 border-t border-neutral-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setOffers(DEFAULT_AFFILIATE_OFFERS);
                  try {
                    localStorage.removeItem(LOCAL_STORAGE_KEY);
                  } catch {}
                  setShowConfigModal(false);
                }}
                className="text-neutral-500 hover:text-rose-600 text-[11px] font-semibold cursor-pointer"
              >
                Reset to Defaults
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="px-3.5 py-1.5 rounded-xl border border-neutral-300 text-neutral-700 font-bold text-xs hover:bg-neutral-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const updated = offers.map((o) => (o.id === editingOffer.id ? editingOffer : o));
                    saveOffersToStorage(updated);
                    setShowConfigModal(false);
                  }}
                  className="px-4 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Save Affiliate Link</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
