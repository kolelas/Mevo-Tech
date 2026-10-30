import React, { useState } from 'react';
import { Product } from '../types';
import { formatZAR } from '../utils/calculations';
import { X, Copy, Check, Share2, MessageCircle, Twitter, Facebook, Mail } from 'lucide-react';

interface ShareModalProps {
  product?: Product;
  url?: string;
  isOpen: boolean;
  onClose: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  product,
  url,
  isOpen,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const currentUrl = url || (product ? `${window.location.origin}/#product=${product.id}` : window.location.href);
  const title = product ? `${product.name} — Mevo Tech South Africa` : 'Mevo Tech — South Africa’s Premier Online Tech Store';
  const shareText = product
    ? `Check out the ${product.name} at Mevo Tech: ${formatZAR(product.promotionalPriceCents || product.priceCents)} with direct Sandton dispatch!`
    : 'Discover genuine high-performance tech with fast delivery across South Africa at Mevo Tech.';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: shareText,
          url: currentUrl,
        });
      } catch {
        // user cancelled
      }
    }
  };

  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(`${shareText} ${currentUrl}`)}`;
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(currentUrl)}`;
  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(currentUrl)}`;
  const mailUrl = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`${shareText}\n\nView here: ${currentUrl}`)}`;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-neutral-900/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-in fade-in">
      <div className="relative bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-neutral-200">
        {/* Header */}
        <div className="p-5 border-b border-neutral-200 flex items-center justify-between bg-neutral-50">
          <div className="flex items-center gap-2">
            <Share2 className="w-4 h-4 text-purple-600" />
            <h3 className="text-base font-bold text-neutral-900">Share Hardware Item</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-neutral-200 text-neutral-500 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Product Card Preview (if sharing a product) */}
        {product && (
          <div className="p-4 bg-purple-50/50 border-b border-purple-100 flex items-center gap-3">
            <div className="w-14 h-14 rounded-xl overflow-hidden bg-white border border-neutral-200 shrink-0">
              <img src={product.primaryImage} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider block">
                {product.brand}
              </span>
              <p className="text-xs font-bold text-neutral-900 truncate">{product.name}</p>
              <p className="text-xs font-mono font-bold text-neutral-900 mt-0.5">
                {formatZAR(product.promotionalPriceCents || product.priceCents)}
              </p>
            </div>
          </div>
        )}

        <div className="p-6 space-y-5 text-xs">
          {/* Quick Copy Link Bar */}
          <div>
            <label className="block font-bold text-neutral-700 mb-1.5">Direct Share Link</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={currentUrl}
                className="flex-1 px-3 py-2.5 bg-neutral-50 border border-neutral-300 rounded-xl font-mono text-[11px] text-neutral-700 select-all"
              />
              <button
                type="button"
                onClick={handleCopy}
                className={`px-4 py-2.5 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                  copied
                    ? 'bg-emerald-600 text-white'
                    : 'bg-purple-600 hover:bg-purple-700 text-white shadow-sm'
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Social Channels Grid */}
          <div>
            <label className="block font-bold text-neutral-700 mb-2">Share Directly Via</label>
            <div className="grid grid-cols-2 gap-2.5">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100/80 text-emerald-950 font-bold flex items-center gap-2 transition-colors cursor-pointer"
              >
                <MessageCircle className="w-4 h-4 text-emerald-600" />
                <span>WhatsApp</span>
              </a>

              <a
                href={twitterUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 rounded-xl border border-neutral-200 bg-neutral-50 hover:bg-neutral-100 text-neutral-900 font-bold flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Twitter className="w-4 h-4 text-sky-500" />
                <span>X / Twitter</span>
              </a>

              <a
                href={facebookUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 rounded-xl border border-blue-200 bg-blue-50/60 hover:bg-blue-100/80 text-blue-950 font-bold flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Facebook className="w-4 h-4 text-blue-600" />
                <span>Facebook</span>
              </a>

              <a
                href={mailUrl}
                className="p-3 rounded-xl border border-neutral-200 bg-neutral-50 hover:bg-neutral-100 text-neutral-900 font-bold flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Mail className="w-4 h-4 text-purple-600" />
                <span>Email Friend</span>
              </a>
            </div>
          </div>

          {typeof navigator !== 'undefined' && 'share' in navigator && (
            <button
              type="button"
              onClick={handleNativeShare}
              className="w-full py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Share2 className="w-4 h-4" />
              <span>More Mobile Share Options...</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
